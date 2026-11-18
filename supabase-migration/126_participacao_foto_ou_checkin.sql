-- 126 — A marca escolhe como o público participa: foto com a moldura, check-in ou os dois (15/11/2026).
-- Rode depois da 125. Seguro rodar mais de uma vez.
-- * participacao: 'foto' (só foto), 'checkin' (só check-in) ou 'ambos' (a pessoa faz um OU outro, ou os dois).
-- * Check-in da ação: só conta presença (sem foto; a marca vê só números). Confere se o celular está perto da casa
--   (raio do check-in normal, app_config 'checkin_raio_m', padrão 150 m, com folga de 2x).
-- * O resultado da ação passa a mostrar check-ins junto com as fotos.

alter table public.acoes_marca add column if not exists participacao text not null default 'ambos';
do $$ begin
  alter table public.acoes_marca add constraint acoes_marca_participacao_ok check (participacao in ('foto', 'checkin', 'ambos'));
exception when duplicate_object then null; end $$;

create table if not exists public.acoes_marca_presencas (
  id bigint generated always as identity primary key,
  acao_id uuid not null references public.acoes_marca(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  local_id uuid references public.locais(id) on delete set null,
  dia date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  created_at timestamptz not null default now(),
  unique (acao_id, user_id, dia)
);
alter table public.acoes_marca_presencas enable row level security;
-- Ninguém lê nem grava direto: só pelas funções abaixo.

-- Resposta: 'ok' | 'ja' (já fez hoje) | 'sem_local' (sem localização) | 'longe' (longe da casa)
create or replace function public.registrar_presenca_marca(p_acao uuid, p_local uuid, p_lat double precision default null, p_lng double precision default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_lat double precision; v_lng double precision; v_raio integer;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para fazer check-in.' using errcode = '42501'; end if;
  if not exists (select 1 from public.acoes_marca where id = p_acao and ativa and participacao in ('checkin', 'ambos')
                   and (now() at time zone 'America/Sao_Paulo')::date between inicio and fim) then
    raise exception 'Esta ação não está no ar.';
  end if;
  if not exists (select 1 from public.cupons where acao_marca_id = p_acao and local_id = p_local and ativo)
     and not exists (select 1 from public.eventos where acao_marca_id = p_acao and local_id = p_local and status = 'aprovado') then
    raise exception 'Esta casa não faz parte da ação.';
  end if;
  select lat, lng into v_lat, v_lng from public.locais where id = p_local;
  if v_lat is not null and v_lng is not null then
    if p_lat is null or p_lng is null then return 'sem_local'; end if;
    select coalesce(nullif(valor, '')::integer, 150) into v_raio from public.app_config where chave = 'checkin_raio_m';
    if public.distancia_metros(p_lat, p_lng, v_lat, v_lng) > coalesce(v_raio, 150) * 2 then return 'longe'; end if;
  end if;
  insert into public.acoes_marca_presencas (acao_id, user_id, local_id) values (p_acao, auth.uid(), p_local)
  on conflict (acao_id, user_id, dia) do nothing;
  if not found then return 'ja'; end if;
  return 'ok';
end;
$$;
revoke execute on function public.registrar_presenca_marca(uuid, uuid, double precision, double precision) from public, anon;
grant execute on function public.registrar_presenca_marca(uuid, uuid, double precision, double precision) to authenticated;

-- Já fiz check-in hoje nesta ação? (o app mostra "Check-in feito")
create or replace function public.minha_presenca_marca(p_acao uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acoes_marca_presencas where acao_id = p_acao and user_id = auth.uid()
                   and dia = (now() at time zone 'America/Sao_Paulo')::date);
$$;
revoke execute on function public.minha_presenca_marca(uuid) from public, anon;
grant execute on function public.minha_presenca_marca(uuid) to authenticated;

-- Resultado: fotos + check-ins
create or replace function public.fotos_da_acao(p_acao uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_local uuid;
begin
  select local_id into v_local from public.acoes_marca where id = p_acao;
  if not found then raise exception 'Ação não encontrada.'; end if;
  if not public.is_admin() and (v_local is null or not public.pode_no_local(v_local, 'resultados')) then
    raise exception 'Sem acesso ao resultado desta ação.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'fotos',         (select count(*) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'foto'),
    'compartilhadas',(select count(*) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'compartilhou'),
    'salvas',        (select count(*) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'salvou'),
    'pessoas',       public.rel_n((select count(distinct user_id) from public.acoes_marca_fotos where acao_id = p_acao and tipo = 'foto')),
    'checkins',      (select count(*) from public.acoes_marca_presencas where acao_id = p_acao),
    'pessoas_checkin', public.rel_n((select count(distinct user_id) from public.acoes_marca_presencas where acao_id = p_acao))
  );
end;
$$;

drop function if exists public.acoes_marca_vitrine();
create or replace function public.acoes_marca_vitrine()
returns table (id uuid, marca text, nome text, chamada text, cor text, logo_url text, inicio date, fim date, cupom_ids uuid[], festa_ids uuid[],
               moldura_url text, moldura_texto text, brinde_pergunta text, brinde_opcoes text[], participacao text)
language sql stable security definer set search_path = public as $$
  -- cupom_ids / festa_ids: o app põe o selo "Apoio: <marca>" nesses cupons e festas sem mudar as consultas dele.
  select a.id, a.marca, a.nome, a.chamada, a.cor, a.logo_url, a.inicio, a.fim,
         coalesce((select array_agg(c.id) from public.cupons c where c.acao_marca_id = a.id and c.ativo and (c.valido_ate is null or c.valido_ate >= now())), '{}'),
         coalesce((select array_agg(e.id) from public.eventos e where e.acao_marca_id = a.id and e.status = 'aprovado' and coalesce(e.data_fim, e.data_inicio) >= now()), '{}'),
         a.moldura_url, a.moldura_texto, a.brinde_pergunta, a.brinde_opcoes, a.participacao
    from public.acoes_marca a
   where a.ativa and a.mostrar_no_app
     and (now() at time zone 'America/Sao_Paulo')::date between a.inicio and a.fim
   order by a.fim;
$$;
revoke execute on function public.acoes_marca_vitrine() from public;
grant execute on function public.acoes_marca_vitrine() to anon, authenticated;

-- Página da ação: dados públicos + cupons ativos (com a casa) + festas que ainda vão acontecer.
create or replace function public.acao_marca_publica(p_acao uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', a.id, 'marca', a.marca, 'nome', a.nome, 'chamada', a.chamada, 'cor', a.cor, 'logo_url', a.logo_url,
    'inicio', a.inicio, 'fim', a.fim,
    'moldura_url', a.moldura_url, 'moldura_texto', a.moldura_texto, 'brinde_pergunta', a.brinde_pergunta, 'brinde_opcoes', a.brinde_opcoes, 'participacao', a.participacao,
    'cupons', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'titulo', c.titulo, 'descricao', c.descricao,
                          'local_id', l.id, 'local', l.nome, 'bairro', coalesce(l.bairro_exibicao, l.bairro), 'cidade', l.cidade,
                          'foto', coalesce(l.foto_capa_url, l.galeria_fotos[1])) order by l.nome)
                         from public.cupons c join public.locais l on l.id = c.local_id
                        where c.acao_marca_id = a.id and c.ativo and (c.valido_ate is null or c.valido_ate >= now()) and l.status = 'aprovado'), '[]'::jsonb),
    'festas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'data_inicio', e.data_inicio,
                          'foto', e.foto_capa_url, 'local', l.nome, 'bairro', coalesce(l.bairro_exibicao, l.bairro)) order by e.data_inicio)
                         from public.eventos e left join public.locais l on l.id = e.local_id
                        where e.acao_marca_id = a.id and e.status = 'aprovado' and coalesce(e.data_fim, e.data_inicio) >= now()), '[]'::jsonb)
  )
  from public.acoes_marca a
  where a.id = p_acao and a.ativa and a.mostrar_no_app;
$$;
revoke execute on function public.acao_marca_publica(uuid) from public;
grant execute on function public.acao_marca_publica(uuid) to anon, authenticated;

-- Quem participou da ação também passa a contar quem confirmou presença ("Estou aqui") e quem tirou a foto
-- com a moldura. Isso libera o questionário para essas pessoas (2 horas depois, na aba Conta).
create or replace function public.presentes_da_acao(p_acao uuid)
returns table (user_id uuid, quando timestamptz, origem text)
language sql stable security definer set search_path = public as $$
  with a as (
    select id, (inicio::timestamp at time zone 'America/Sao_Paulo') as ini,
           ((fim + 1)::timestamp at time zone 'America/Sao_Paulo') as fim
      from public.acoes_marca where id = p_acao
  )
  select r.user_id, r.resgatado_em, 'cupom'
    from public.cupons_resgatados r join public.cupons c on c.id = r.cupom_id, a
   where c.acao_marca_id = a.id and r.resgatado_em >= a.ini and r.resgatado_em < a.fim
  union all
  select ck.user_id, ck.validado_em, 'checkin'
    from public.checkins ck join public.cupons c on c.id = ck.cupom_id, a
   where c.acao_marca_id = a.id and ck.validado_em is not null and ck.cancelado_em is null
     and ck.validado_em >= a.ini and ck.validado_em < a.fim
  union all
  select s.user_id, coalesce(s.check_in_em, e.data_inicio), 'lista'
    from public.listas_vip_solicitacoes s
    join public.listas_vip l on l.id = s.lista_vip_id
    join public.eventos e on e.id = l.evento_id, a
   where e.acao_marca_id = a.id and s.status::text = 'check_in'
  union all
  select p.user_id, p.created_at, 'presenca'
    from public.acoes_marca_presencas p, a
   where p.acao_id = a.id
  union all
  select f.user_id, f.created_at, 'foto'
    from public.acoes_marca_fotos f, a
   where f.acao_id = a.id and f.tipo = 'foto' and f.user_id is not null
     and f.created_at >= a.ini and f.created_at < a.fim;
$$;
revoke execute on function public.presentes_da_acao(uuid) from public, anon, authenticated;

-- Conferência
select participacao, count(*) from public.acoes_marca group by 1;
