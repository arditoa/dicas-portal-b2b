-- 143 — Comparação com a cidade e Equipe treinada (16/11/2026). Rode depois da 142. Seguro rodar mais de uma vez.
--
-- 1) COMPARAÇÃO COM A CIDADE (no "Seu público", Premium e Fundador): a casa vê o perfil do SEU público ao lado da
--    média das casas da mesma cidade (faixa de idade em %, horário de pico, nota de segurança).
--    Proteções: a média da cidade só aparece com 3 casas ou mais E 100 pessoas ou mais no período (assim ninguém
--    descobre o público de um concorrente); a da casa segue o mínimo de 30 pessoas. Só percentuais e médias.
-- 2) EQUIPE TREINADA: curso curto de acolhimento LGBT+ no app (5 lições + 5 perguntas). Quem acerta 4 de 5 ganha o
--    certificado. A casa ganha o selo "Equipe treinada" com 3 pessoas certificadas (dono ou equipe) nos últimos 12 meses.
--    As respostas certas ficam só no banco (o app não sabe a resposta antes de enviar).

-- 1) Comparação -------------------------------------------------------------------------------------------
create or replace function public.perfil_presenca(p_locais uuid[], p_ini timestamptz, p_fim timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with u as (
    select user_id, local_id, quando from (
      select user_id, local_id, validado_em as quando from public.checkins where cancelado_em is null and validado_em >= p_ini and validado_em < p_fim and local_id = any(p_locais)
      union all select i.user_id, e.local_id, i.usado_em from public.ingressos i join public.eventos e on e.id = i.evento_id where i.usado_em >= p_ini and i.usado_em < p_fim and e.local_id = any(p_locais)
      union all select user_id, local_id, criado_em from public.termometro_sinais where criado_em >= p_ini and criado_em < p_fim and local_id = any(p_locais)
    ) x
  ), pessoas as (
    select distinct u.user_id, extract(year from age(now(), p.birth_date))::int as idade from u left join public.profiles p on p.id = u.user_id
  ), tot as (select count(*)::numeric as n, count(*) filter (where idade >= 18)::numeric as com_idade from pessoas)
  select jsonb_build_object(
    'pessoas', (select n from tot),
    'casas', (select count(distinct local_id) from u),
    'idade_pct', jsonb_build_object(
      '18–24', round(100 * (select count(*) from pessoas where idade between 18 and 24) / nullif((select com_idade from tot), 0)),
      '25–34', round(100 * (select count(*) from pessoas where idade between 25 and 34) / nullif((select com_idade from tot), 0)),
      '35–44', round(100 * (select count(*) from pessoas where idade between 35 and 44) / nullif((select com_idade from tot), 0)),
      '45+',   round(100 * (select count(*) from pessoas where idade >= 45) / nullif((select com_idade from tot), 0))),
    'pico_hora', (select extract(hour from quando at time zone 'America/Sao_Paulo')::int from u group by 1 order by count(*) desc limit 1),
    'nota_seguranca', (select round(avg((acolhimento + saida + equipe) / 3.0), 1) from public.avaliacoes_seguranca
                        where not pulada and local_id = any(p_locais) and created_at > now() - interval '12 months'));
$$;
revoke all on function public.perfil_presenca(uuid[], timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.comparacao_com_cidade(p_local uuid, p_de date, p_ate date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_cidade text; v_ini timestamptz; v_fim timestamptz; v_outras uuid[]; v_pcasa jsonb; v_pcid jsonb;
begin
  if not public.is_admin() then
    if not public.pode_no_local(p_local, 'resultados') then raise exception 'Seu acesso não inclui os resultados desta casa.' using errcode = '42501'; end if;
    if not exists (select 1 from public.locais l where l.id = p_local and l.plano_comercial::text in ('premium', 'fundador') and coalesce(l.plano_comercial_status::text, 'ativo') = 'ativo') then
      raise exception 'A comparação está incluída nos planos Premium e Fundador.' using errcode = '42501';
    end if;
  end if;
  if p_ate < p_de or p_ate - p_de > 366 then raise exception 'Período inválido (até 12 meses).'; end if;
  v_ini := p_de::timestamp at time zone 'America/Sao_Paulo';
  v_fim := (p_ate + 1)::timestamp at time zone 'America/Sao_Paulo';
  select l.cidade into v_cidade from public.locais l where l.id = p_local;
  select array_agg(l.id) into v_outras from public.locais l where l.status = 'aprovado' and lower(l.cidade) = lower(v_cidade) and l.id <> p_local;

  v_pcasa := public.perfil_presenca(array[p_local], v_ini, v_fim);
  v_pcid := case when v_outras is null then null else public.perfil_presenca(v_outras, v_ini, v_fim) end;

  return jsonb_build_object(
    'cidade_nome', v_cidade,
    'casa', case when (v_pcasa->>'pessoas')::int >= 30 then v_pcasa - 'casas' else null end,
    'cidade', case when v_pcid is not null and (v_pcid->>'casas')::int >= 3 and (v_pcid->>'pessoas')::int >= 100 then v_pcid - 'casas' else null end,
    'regras', jsonb_build_object('minimo_casa', 30, 'minimo_cidade_casas', 3, 'minimo_cidade_pessoas', 100));
end; $$;
revoke execute on function public.comparacao_com_cidade(uuid, date, date) from public, anon;
grant execute on function public.comparacao_com_cidade(uuid, date, date) to authenticated;

-- 2) Equipe treinada --------------------------------------------------------------------------------------
create table if not exists public.treinamentos_concluidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  local_id uuid not null references public.locais(id) on delete cascade,
  curso text not null default 'acolhimento_v1',
  acertos integer not null,
  concluido_em timestamptz not null default now(),
  unique (user_id, local_id, curso)
);
alter table public.treinamentos_concluidos enable row level security;
drop policy if exists treinamentos_le on public.treinamentos_concluidos;
create policy treinamentos_le on public.treinamentos_concluidos for select
  using (user_id = auth.uid() or public.is_admin() or public.pode_no_local(local_id, 'resultados')
         or exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid()));

-- Respostas do curso acolhimento_v1 (q1..q5). O app só envia as escolhas.
create or replace function public.concluir_treinamento(p_local uuid, p_respostas text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gabarito text[] := array['b', 'c', 'a', 'b', 'c']; v_acertos int := 0; i int;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not (exists (select 1 from public.locais where id = p_local and owner_id = auth.uid())
          or exists (select 1 from public.local_equipe q where q.local_id = p_local and q.user_id = auth.uid() and q.modelo <> 'porta_pin')) then
    raise exception 'O curso é para o dono e a equipe da casa.' using errcode = '42501';
  end if;
  if coalesce(array_length(p_respostas, 1), 0) <> 5 then raise exception 'Responda as 5 perguntas.'; end if;
  for i in 1..5 loop if p_respostas[i] = v_gabarito[i] then v_acertos := v_acertos + 1; end if; end loop;
  if v_acertos < 4 then
    return jsonb_build_object('aprovado', false, 'acertos', v_acertos, 'erradas',
      (select coalesce(jsonb_agg(g.n), '[]'::jsonb) from generate_series(1, 5) as g(n) where p_respostas[g.n] is distinct from v_gabarito[g.n]));
  end if;
  insert into public.treinamentos_concluidos (user_id, local_id, acertos) values (auth.uid(), p_local, v_acertos)
  on conflict (user_id, local_id, curso) do update set acertos = excluded.acertos, concluido_em = now();
  return jsonb_build_object('aprovado', true, 'acertos', v_acertos, 'nome', public.primeiro_nome(auth.uid()), 'concluido_em', now());
end; $$;
revoke execute on function public.concluir_treinamento(uuid, text[]) from public, anon;
grant execute on function public.concluir_treinamento(uuid, text[]) to authenticated;

create or replace function public.equipe_treinada(p_local uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('certificados', count(*), 'tem_selo', count(*) >= 3)
    from public.treinamentos_concluidos where local_id = p_local and curso = 'acolhimento_v1' and concluido_em > now() - interval '12 months';
$$;
grant execute on function public.equipe_treinada(uuid) to anon, authenticated;

-- Para a casa: quem da equipe já fez (nomes da PRÓPRIA equipe, para o dono acompanhar)
create or replace function public.treinamento_da_equipe(p_local uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.pode_no_local(p_local, 'resultados') or exists (select 1 from public.locais where id = p_local and owner_id = auth.uid())) then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'selo', public.equipe_treinada(p_local),
    'pessoas', coalesce((select jsonb_agg(jsonb_build_object('nome', public.primeiro_nome(t.user_id), 'em', t.concluido_em) order by t.concluido_em desc)
                          from public.treinamentos_concluidos t where t.local_id = p_local and t.concluido_em > now() - interval '12 months'), '[]'::jsonb));
end; $$;
revoke execute on function public.treinamento_da_equipe(uuid) from public, anon;
grant execute on function public.treinamento_da_equipe(uuid) to authenticated;
