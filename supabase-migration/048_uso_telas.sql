-- 048: uso das telas do app (tempo por tela) — ANÔNIMO.
-- Cada linha = uma passagem por uma tela: qual tela, quantos segundos, de que
-- sessão/aparelho. NÃO guarda user_id, nome, e-mail, telefone nem localização.
-- "dispositivo" é um código aleatório criado no aparelho (não liga a ninguém) e
-- só serve para contar quantos aparelhos distintos usaram cada tela.
-- Leitura: só admin (funções abaixo). Escrita: qualquer instalação do app, com
-- limites (tela conhecida, 1 a 1800 s, códigos de tamanho razoável).
begin;

create table if not exists public.uso_telas (
  id          bigint generated always as identity primary key,
  criado_em   timestamptz not null default now(),
  dispositivo text not null check (char_length(dispositivo) between 8 and 64),
  sessao      text not null check (char_length(sessao) between 8 and 64),
  tela        text not null check (tela in (
    'home','mapa','eventos','trip','conta','categoria','perfil_local','secao',
    'experiencia','evento','busca','roteiro','destino','outras'
  )),
  detalhe     text check (detalhe is null or char_length(detalhe) <= 60),
  local_id    uuid references public.locais(id) on delete cascade,
  segundos    integer not null check (segundos between 1 and 1800),
  plataforma  text check (plataforma is null or plataforma in ('ios','android','web'))
);

create index if not exists uso_telas_criado_idx on public.uso_telas (criado_em desc);
create index if not exists uso_telas_tela_idx   on public.uso_telas (tela, criado_em desc);
create index if not exists uso_telas_local_idx  on public.uso_telas (local_id, criado_em desc) where local_id is not null;

-- O servidor define a hora; o cliente não escolhe.
create or replace function public.uso_telas_before_insert()
returns trigger as $$
begin
  new.criado_em := now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists uso_telas_before_insert on public.uso_telas;
create trigger uso_telas_before_insert before insert on public.uso_telas
  for each row execute function public.uso_telas_before_insert();

alter table public.uso_telas enable row level security;

drop policy if exists "uso_telas_insert" on public.uso_telas;
create policy "uso_telas_insert" on public.uso_telas
  for insert to anon, authenticated
  with check (true);

drop policy if exists "uso_telas_select_admin" on public.uso_telas;
create policy "uso_telas_select_admin" on public.uso_telas
  for select using (public.is_admin());

-- Resumo por tela no período: aparelhos distintos, passagens, tempo médio e total.
create or replace function public.resumo_uso_telas(p_dias integer default 30)
returns table (tela text, aparelhos bigint, passagens bigint, media_seg numeric, total_seg bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  return query
    select u.tela,
           count(distinct u.dispositivo),
           count(*),
           round(avg(u.segundos)::numeric, 1),
           sum(u.segundos)::bigint
    from public.uso_telas u
    where u.criado_em >= now() - make_interval(days => greatest(1, least(p_dias, 365)))
    group by u.tela
    order by sum(u.segundos) desc;
end; $$;

-- Série por dia: aparelhos ativos, sessões, passagens e tempo total.
create or replace function public.uso_diario(p_dias integer default 30)
returns table (dia date, aparelhos bigint, sessoes bigint, passagens bigint, total_seg bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  return query
    select (u.criado_em at time zone 'America/Sao_Paulo')::date,
           count(distinct u.dispositivo),
           count(distinct u.sessao),
           count(*),
           sum(u.segundos)::bigint
    from public.uso_telas u
    where u.criado_em >= now() - make_interval(days => greatest(1, least(p_dias, 365)))
    group by 1
    order by 1;
end; $$;

-- Ranking de locais: visualizações do perfil, cliques e tempo médio na página do local.
create or replace function public.ranking_locais(p_dias integer default 30)
returns table (local_id uuid, nome text, categoria text, cidade text,
               visualizacoes bigint, cliques_instagram bigint, cliques_cupom bigint,
               media_seg numeric, passagens bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  return query
    with ini as (select now() - make_interval(days => greatest(1, least(p_dias, 365))) as t),
    ev as (
      select e.local_id,
             count(*) filter (where e.tipo = 'visualizacao_perfil') as v,
             count(*) filter (where e.tipo = 'clique_instagram')    as i,
             count(*) filter (where e.tipo = 'clique_cupom')        as c
      from public.eventos_analytics e, ini
      where e.created_at >= ini.t
      group by e.local_id
    ),
    us as (
      select u.local_id, round(avg(u.segundos)::numeric, 1) as m, count(*) as p
      from public.uso_telas u, ini
      where u.criado_em >= ini.t and u.local_id is not null and u.tela = 'perfil_local'
      group by u.local_id
    )
    select l.id, l.nome, l.categoria::text, l.cidade,
           coalesce(ev.v, 0), coalesce(ev.i, 0), coalesce(ev.c, 0),
           us.m, coalesce(us.p, 0)
    from public.locais l
    left join ev on ev.local_id = l.id
    left join us on us.local_id = l.id
    where l.status = 'aprovado'
    order by coalesce(ev.v, 0) desc, coalesce(us.p, 0) desc, l.nome
    limit 500;
end; $$;

revoke all on function public.resumo_uso_telas(integer) from public;
revoke all on function public.uso_diario(integer) from public;
revoke all on function public.ranking_locais(integer) from public;
grant execute on function public.resumo_uso_telas(integer) to authenticated;
grant execute on function public.uso_diario(integer) to authenticated;
grant execute on function public.ranking_locais(integer) to authenticated;

commit;
