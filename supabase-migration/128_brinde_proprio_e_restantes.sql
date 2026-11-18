-- 128 — Ação de marca com brinde próprio, "primeiros que chegarem" e quantos ainda restam (15/11/2026).
-- Rode depois da 127. Seguro rodar mais de uma vez.
-- * A ação não precisa mais "pegar emprestado" um cupom da casa: ela tem o PRÓPRIO brinde (ex.: "Sorvete Kibon").
--   Quem ganha: quem confirma presença ("Estou aqui") na casa da ação — 1 vez por pessoa por ação.
-- * Onde: a casa que criou a ação (local_id) OU uma festa específica (evento_id: só vale no horário da festa).
--   Cupons e festas ligados do jeito antigo (acao_marca_id) continuam valendo.
-- * limite_total: "para os primeiros N". O público vê SÓ quantos ainda restam ("Restam 37"), nunca o total.
--   Sem limite, o público vê quantos já ganharam.
-- * Festa que já passou ou que é de antes do início da ação não aparece mais na página da ação.
-- * regra: observação curta (ex.: "Das 18h às 21h", "Mostre a tela no balcão").

alter table public.acoes_marca add column if not exists brinde text check (brinde is null or char_length(brinde) <= 80);
alter table public.acoes_marca add column if not exists limite_total integer check (limite_total is null or limite_total between 1 and 100000);
alter table public.acoes_marca add column if not exists regra text check (regra is null or char_length(regra) <= 120);
alter table public.acoes_marca add column if not exists evento_id uuid references public.eventos(id) on delete set null;
alter table public.acoes_marca_presencas add column if not exists opcao text;

-- Casas onde a ação vale
create or replace function public.locais_da_acao(p_acao uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select a.local_id from public.acoes_marca a where a.id = p_acao and a.local_id is not null and a.evento_id is null
  union
  select e.local_id from public.acoes_marca a join public.eventos e on e.id = a.evento_id where a.id = p_acao and e.local_id is not null
  union
  select c.local_id from public.cupons c where c.acao_marca_id = p_acao and c.ativo and (c.valido_ate is null or c.valido_ate >= now())
  union
  select e.local_id from public.eventos e join public.acoes_marca a on a.id = p_acao
   where e.acao_marca_id = p_acao and e.status = 'aprovado' and e.local_id is not null
     and coalesce(e.data_fim, e.data_inicio) >= now() and e.data_inicio >= (a.inicio::timestamp at time zone 'America/Sao_Paulo');
$$;
revoke execute on function public.locais_da_acao(uuid) from public, anon, authenticated;

-- Quantos já ganharam / quantos restam (público: só a ação no ar)
create or replace function public.contagem_acao(p_acao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'feitos', (select count(*) from public.acoes_marca_presencas p where p.acao_id = a.id),
    'restam', case when a.limite_total is null then null
                   else greatest(a.limite_total - (select count(*) from public.acoes_marca_presencas p where p.acao_id = a.id), 0) end)
  from public.acoes_marca a
  where a.id = p_acao and a.ativa and (a.mostrar_no_app or public.is_admin() or (a.local_id is not null and public.pode_no_local(a.local_id, 'resultados')));
$$;
revoke execute on function public.contagem_acao(uuid) from public;
grant execute on function public.contagem_acao(uuid) to anon, authenticated;

-- Confirmar presença = ganhar o brinde. Resposta (jsonb):
--   status: 'ok' | 'ja' | 'esgotado' | 'escolha' (falta escolher a opção) | 'fora_do_horario' | 'sem_local' | 'longe'
--   numero: ordem de chegada; opcao: o que escolheu; restam: quanto ainda resta (se tiver limite)
drop function if exists public.registrar_presenca_marca(uuid, uuid, double precision, double precision);
create or replace function public.registrar_presenca_marca(p_acao uuid, p_local uuid, p_lat double precision default null, p_lng double precision default null, p_opcao text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v public.acoes_marca;
  v_ev record;
  v_lat double precision; v_lng double precision; v_raio integer;
  v_n integer; v_meu record;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para confirmar presença.' using errcode = '42501'; end if;
  select * into v from public.acoes_marca where id = p_acao and ativa and participacao in ('checkin', 'ambos')
     and (now() at time zone 'America/Sao_Paulo')::date between inicio and fim;
  if not found then raise exception 'Esta ação não está no ar.'; end if;
  if not exists (select 1 from public.locais_da_acao(p_acao) x where x = p_local) then
    raise exception 'Esta casa não faz parte da ação.';
  end if;

  -- Já ganhou? (1 por pessoa por ação)
  select id, opcao, (select count(*) from public.acoes_marca_presencas q where q.acao_id = p_acao and q.id <= p.id) as numero
    into v_meu from public.acoes_marca_presencas p where p.acao_id = p_acao and p.user_id = auth.uid() order by id limit 1;
  if found then
    return jsonb_build_object('status', 'ja', 'numero', v_meu.numero, 'opcao', v_meu.opcao);
  end if;

  -- Festa específica: só no horário da festa (2h antes até o fim; sem fim, 8h depois do início)
  if v.evento_id is not null then
    select data_inicio, data_fim into v_ev from public.eventos where id = v.evento_id;
    if now() < v_ev.data_inicio - interval '2 hours' or now() > coalesce(v_ev.data_fim, v_ev.data_inicio + interval '8 hours') then
      return jsonb_build_object('status', 'fora_do_horario');
    end if;
  end if;

  -- Perto da casa
  select lat, lng into v_lat, v_lng from public.locais where id = p_local;
  if v_lat is not null and v_lng is not null then
    if p_lat is null or p_lng is null then return jsonb_build_object('status', 'sem_local'); end if;
    select coalesce(nullif(valor, '')::integer, 150) into v_raio from public.app_config where chave = 'checkin_raio_m';
    if public.distancia_metros(p_lat, p_lng, v_lat, v_lng) > coalesce(v_raio, 150) * 2 then return jsonb_build_object('status', 'longe'); end if;
  end if;

  -- Escolha do brinde (sabor etc.)
  if v.brinde_opcoes is not null and (p_opcao is null or not (p_opcao = any(v.brinde_opcoes))) then
    return jsonb_build_object('status', 'escolha');
  end if;

  -- Fila: um de cada vez, para não passar do limite
  perform pg_advisory_xact_lock(hashtext('acao_marca:' || p_acao::text));
  select count(*) into v_n from public.acoes_marca_presencas where acao_id = p_acao;
  if v.limite_total is not null and v_n >= v.limite_total then
    return jsonb_build_object('status', 'esgotado', 'restam', 0);
  end if;
  insert into public.acoes_marca_presencas (acao_id, user_id, local_id, opcao) values (p_acao, auth.uid(), p_local, p_opcao)
  on conflict (acao_id, user_id, dia) do nothing;
  if p_opcao is not null then
    insert into public.acoes_marca_escolhas (acao_id, user_id, cupom_id, opcao) values (p_acao, auth.uid(), null, p_opcao);
  end if;
  return jsonb_build_object('status', 'ok', 'numero', v_n + 1, 'opcao', p_opcao,
                            'restam', case when v.limite_total is null then null else greatest(v.limite_total - v_n - 1, 0) end);
end;
$$;
revoke execute on function public.registrar_presenca_marca(uuid, uuid, double precision, double precision, text) from public, anon;
grant execute on function public.registrar_presenca_marca(uuid, uuid, double precision, double precision, text) to authenticated;

-- Já ganhei nesta ação? (o app mostra "Mostre esta tela no balcão")
drop function if exists public.minha_presenca_marca(uuid);
create or replace function public.minha_presenca_marca(p_acao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('numero', (select count(*) from public.acoes_marca_presencas q where q.acao_id = p_acao and q.id <= p.id),
                            'opcao', p.opcao, 'quando', p.created_at)
    from public.acoes_marca_presencas p where p.acao_id = p_acao and p.user_id = auth.uid() order by p.id limit 1;
$$;
revoke execute on function public.minha_presenca_marca(uuid) from public, anon;
grant execute on function public.minha_presenca_marca(uuid) to authenticated;

-- Vitrine: + brinde, regra, restam/feitos, casas e festa da ação
drop function if exists public.acoes_marca_vitrine();
create or replace function public.acoes_marca_vitrine()
returns table (id uuid, marca text, nome text, chamada text, cor text, logo_url text, inicio date, fim date, cupom_ids uuid[], festa_ids uuid[],
               moldura_url text, moldura_texto text, brinde_pergunta text, brinde_opcoes text[], participacao text,
               brinde text, regra text, evento_id uuid, local_ids uuid[], feitos integer, restam integer)
language sql stable security definer set search_path = public as $$
  select a.id, a.marca, a.nome, a.chamada, a.cor, a.logo_url, a.inicio, a.fim,
         coalesce((select array_agg(c.id) from public.cupons c where c.acao_marca_id = a.id and c.ativo and (c.valido_ate is null or c.valido_ate >= now())), '{}'),
         coalesce((select array_agg(e.id) from public.eventos e where (e.acao_marca_id = a.id or e.id = a.evento_id) and e.status = 'aprovado'
                     and coalesce(e.data_fim, e.data_inicio) >= now() and e.data_inicio >= (a.inicio::timestamp at time zone 'America/Sao_Paulo')), '{}'),
         a.moldura_url, a.moldura_texto, a.brinde_pergunta, a.brinde_opcoes, a.participacao,
         a.brinde, a.regra, a.evento_id,
         coalesce((select array_agg(x) from public.locais_da_acao(a.id) x), '{}'),
         (select count(*)::integer from public.acoes_marca_presencas p where p.acao_id = a.id),
         case when a.limite_total is null then null
              else greatest(a.limite_total - (select count(*)::integer from public.acoes_marca_presencas p where p.acao_id = a.id), 0) end
    from public.acoes_marca a
   where a.ativa and a.mostrar_no_app
     and (now() at time zone 'America/Sao_Paulo')::date between a.inicio and a.fim
   order by a.fim;
$$;
revoke execute on function public.acoes_marca_vitrine() from public;
grant execute on function public.acoes_marca_vitrine() to anon, authenticated;

-- Página da ação: + brinde, regra, restam/feitos, casas onde vale e a festa da ação
create or replace function public.acao_marca_publica(p_acao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', a.id, 'marca', a.marca, 'nome', a.nome, 'chamada', a.chamada, 'cor', a.cor, 'logo_url', a.logo_url,
    'inicio', a.inicio, 'fim', a.fim,
    'moldura_url', a.moldura_url, 'moldura_texto', a.moldura_texto, 'brinde_pergunta', a.brinde_pergunta, 'brinde_opcoes', a.brinde_opcoes, 'participacao', a.participacao,
    'brinde', a.brinde, 'regra', a.regra, 'evento_id', a.evento_id,
    'feitos', (select count(*) from public.acoes_marca_presencas p where p.acao_id = a.id),
    'restam', case when a.limite_total is null then null
                   else greatest(a.limite_total - (select count(*) from public.acoes_marca_presencas p where p.acao_id = a.id), 0) end,
    'casas', coalesce((select jsonb_agg(jsonb_build_object('local_id', l.id, 'local', l.nome, 'bairro', coalesce(l.bairro_exibicao, l.bairro), 'cidade', l.cidade,
                          'foto', coalesce(l.foto_capa_url, l.galeria_fotos[1])) order by l.nome)
                         from public.locais l where l.id in (select public.locais_da_acao(a.id)) and l.status = 'aprovado'), '[]'::jsonb),
    'cupons', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'titulo', c.titulo, 'descricao', c.descricao,
                          'local_id', l.id, 'local', l.nome, 'bairro', coalesce(l.bairro_exibicao, l.bairro), 'cidade', l.cidade,
                          'foto', coalesce(l.foto_capa_url, l.galeria_fotos[1])) order by l.nome)
                         from public.cupons c join public.locais l on l.id = c.local_id
                        where c.acao_marca_id = a.id and c.ativo and (c.valido_ate is null or c.valido_ate >= now()) and l.status = 'aprovado'), '[]'::jsonb),
    'festas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'data_inicio', e.data_inicio,
                          'foto', e.foto_capa_url, 'local', l.nome, 'bairro', coalesce(l.bairro_exibicao, l.bairro)) order by e.data_inicio)
                         from public.eventos e left join public.locais l on l.id = e.local_id
                        where (e.acao_marca_id = a.id or e.id = a.evento_id) and e.status = 'aprovado'
                          and coalesce(e.data_fim, e.data_inicio) >= now() and e.data_inicio >= (a.inicio::timestamp at time zone 'America/Sao_Paulo')
                          and e.data_inicio < ((a.fim + 1)::timestamp at time zone 'America/Sao_Paulo')), '[]'::jsonb)
  )
  from public.acoes_marca a
  where a.id = p_acao and a.ativa and a.mostrar_no_app;
$$;
revoke execute on function public.acao_marca_publica(uuid) from public;
grant execute on function public.acao_marca_publica(uuid) to anon, authenticated;

-- Conferência
select id, marca, brinde, limite_total, evento_id, public.contagem_acao(id) from public.acoes_marca where ativa;
