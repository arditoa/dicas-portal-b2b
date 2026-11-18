-- 123 — Questionário de feedback do produto na ação de marca (15/11/2026). Rode depois da 122.
-- Antes: 1 pergunta de múltipla escolha. Agora: até 5 perguntas montadas com a marca, de 3 tipos:
--   'escolha' (opções), 'nota' (0 a 10) e 'aberta' (texto curto).
-- Só responde quem FOI (presença comprovada), uma vez, até 14 dias depois. Respostas sempre somadas;
-- textos abertos só para a equipe Dicas (podem conter algo que identifique a pessoa) e nunca com nome.
-- A pergunta única antiga continua funcionando. Seguro rodar mais de uma vez.

alter table public.acoes_marca add column if not exists pesquisa_perguntas jsonb;
do $$ begin
  alter table public.acoes_marca add constraint acoes_marca_perguntas_ok check (
    pesquisa_perguntas is null or (jsonb_typeof(pesquisa_perguntas) = 'array' and jsonb_array_length(pesquisa_perguntas) between 1 and 5));
exception when duplicate_object then null; end $$;
alter table public.acoes_marca_respostas add column if not exists respostas jsonb;   -- {"<id da pergunta>": valor}

-- Pesquisa pendente: agora devolve também as perguntas (formato novo)
drop function if exists public.pesquisa_marca_pendente();
create or replace function public.pesquisa_marca_pendente()
returns table (acao_id uuid, marca text, pergunta text, opcoes text[], perguntas jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  return query
    select am.id, am.marca, am.pesquisa_pergunta, am.pesquisa_opcoes, am.pesquisa_perguntas
      from public.acoes_marca am
     where (am.pesquisa_perguntas is not null or (am.pesquisa_pergunta is not null and am.pesquisa_opcoes is not null))
       and current_date <= am.fim + 14
       and not exists (select 1 from public.acoes_marca_respostas r where r.acao_id = am.id and r.user_id = v_uid)
       and exists (select 1 from public.presentes_da_acao(am.id) p where p.user_id = v_uid
                    and p.quando > now() - interval '14 days' and p.quando < now() - interval '2 hours')
     order by am.fim desc limit 1;
end;
$$;
revoke execute on function public.pesquisa_marca_pendente() from public, anon;
grant execute on function public.pesquisa_marca_pendente() to authenticated;

-- Responder o questionário (formato novo). p_respostas = {"<id>": "opção" | número 0–10 | "texto"}; null = pulou tudo.
create or replace function public.responder_questionario_marca(p_acao uuid, p_respostas jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_perg jsonb;
  q jsonb;
  v jsonb;
  limpo jsonb := '{}'::jsonb;
begin
  if v_uid is null then raise exception 'Entre na sua conta.'; end if;
  select pesquisa_perguntas into v_perg from public.acoes_marca where id = p_acao;
  if v_perg is null then raise exception 'Questionário não encontrado.'; end if;
  if not exists (select 1 from public.presentes_da_acao(p_acao) p where p.user_id = v_uid) then
    raise exception 'Este questionário é só para quem participou.';
  end if;
  if p_respostas is not null then
    for q in select * from jsonb_array_elements(v_perg) loop
      v := p_respostas -> (q->>'id');
      continue when v is null or v = 'null'::jsonb;
      if q->>'tipo' = 'escolha' and jsonb_typeof(v) = 'string' and (q->'opcoes') ? (v #>> '{}') then
        limpo := limpo || jsonb_build_object(q->>'id', v);
      elsif q->>'tipo' = 'nota' and jsonb_typeof(v) = 'number' and (v::text)::numeric between 0 and 10 then
        limpo := limpo || jsonb_build_object(q->>'id', round((v::text)::numeric));
      elsif q->>'tipo' = 'aberta' and jsonb_typeof(v) = 'string' and length(trim(v #>> '{}')) > 0 then
        limpo := limpo || jsonb_build_object(q->>'id', left(trim(v #>> '{}'), 280));
      end if;
    end loop;
  end if;
  insert into public.acoes_marca_respostas (acao_id, user_id, resposta, respostas)
  values (p_acao, v_uid, null, case when limpo = '{}'::jsonb then null else limpo end)
  on conflict (acao_id, user_id) do nothing;
end;
$$;
revoke execute on function public.responder_questionario_marca(uuid, jsonb) from public, anon;
grant execute on function public.responder_questionario_marca(uuid, jsonb) to authenticated;

-- Resultado do questionário (admin ou a casa dona da ação). Textos abertos só para o admin.
create or replace function public.questionario_da_acao(p_acao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_a public.acoes_marca;
  q jsonb;
  saida jsonb := '[]'::jsonb;
  item jsonb;
begin
  select * into v_a from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
  if not public.is_admin() and (v_a.local_id is null or not public.pode_no_local(v_a.local_id, 'resultados')) then
    raise exception 'Sem acesso ao resultado desta ação.' using errcode = '42501';
  end if;
  if v_a.pesquisa_perguntas is null then return null; end if;
  for q in select * from jsonb_array_elements(v_a.pesquisa_perguntas) loop
    if q->>'tipo' = 'escolha' then
      item := jsonb_build_object('id', q->>'id', 'texto', q->>'texto', 'tipo', 'escolha',
        'responderam', public.rel_n((select count(*) from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id'))),
        'opcoes', (select coalesce(jsonb_agg(jsonb_build_object('valor', o, 'n', public.rel_n((select count(*) from public.acoes_marca_respostas r
                      where r.acao_id = p_acao and r.respostas->>(q->>'id') = o))) order by ord), '[]'::jsonb)
                   from jsonb_array_elements_text(q->'opcoes') with ordinality t(o, ord)));
    elsif q->>'tipo' = 'nota' then
      item := jsonb_build_object('id', q->>'id', 'texto', q->>'texto', 'tipo', 'nota',
        'responderam', public.rel_n((select count(*) from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id'))),
        'media', (select case when count(*) >= 10 then round(avg((r.respostas->>(q->>'id'))::numeric), 1) end
                    from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id')),
        'promotores', (select case when count(*) >= 10 then round(100.0 * count(*) filter (where (r.respostas->>(q->>'id'))::numeric >= 9) / count(*)) end
                    from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id')),
        'detratores', (select case when count(*) >= 10 then round(100.0 * count(*) filter (where (r.respostas->>(q->>'id'))::numeric <= 6) / count(*)) end
                    from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id')));
    else
      item := jsonb_build_object('id', q->>'id', 'texto', q->>'texto', 'tipo', 'aberta',
        'responderam', public.rel_n((select count(*) from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas ? (q->>'id'))),
        'textos', case when public.is_admin() then
                    (select coalesce(jsonb_agg(r.respostas->>(q->>'id') order by r.created_at desc), '[]'::jsonb)
                       from (select * from public.acoes_marca_respostas r0 where r0.acao_id = p_acao and r0.respostas ? (q->>'id') order by r0.created_at desc limit 200) r)
                  else null end);
    end if;
    saida := saida || jsonb_build_array(item);
  end loop;
  return jsonb_build_object('perguntas', saida,
    'responderam', public.rel_n((select count(*) from public.acoes_marca_respostas r where r.acao_id = p_acao and r.respostas is not null)));
end;
$$;
revoke execute on function public.questionario_da_acao(uuid) from public, anon;
grant execute on function public.questionario_da_acao(uuid) to authenticated;

-- Conferência
select column_name from information_schema.columns where table_name = 'acoes_marca' and column_name = 'pesquisa_perguntas';
