-- Medição do site institucional (landing-dicaslgbt): visitas e cliques nos
-- botões, de forma ANÔNIMA — sem cookie, sem IP, sem identificador de
-- pessoa. Guarda só: qual evento (ex.: cadastro_empresa), em que ponto da
-- página (ex.: topo, passos, final, rodape), qual página e de onde veio
-- (utm_source ou domínio de referência, senão "direto").
--
-- Rodar quando quiser começar a medir (o site funciona normalmente antes
-- disso: os envios simplesmente são ignorados até a tabela existir).
-- Visível só para admin (public.is_admin()); o site só consegue INSERIR.

begin;

create table if not exists public.eventos_site (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  evento text not null check (char_length(evento) between 1 and 60),
  onde text check (onde is null or char_length(onde) <= 80),
  pagina text check (pagina is null or char_length(pagina) <= 120),
  origem text check (origem is null or char_length(origem) <= 120)
);

create index if not exists eventos_site_criado_em_idx on public.eventos_site (criado_em desc);
create index if not exists eventos_site_evento_idx on public.eventos_site (evento, onde);

alter table public.eventos_site enable row level security;

drop policy if exists "eventos_site_insert_publico" on public.eventos_site;
create policy "eventos_site_insert_publico" on public.eventos_site
  for insert with check (true); -- visitante anônimo do site, sem login

drop policy if exists "eventos_site_select_admin" on public.eventos_site;
create policy "eventos_site_select_admin" on public.eventos_site
  for select using (public.is_admin());

grant insert on public.eventos_site to anon, authenticated;
grant select on public.eventos_site to authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────
-- Como ler os números (SQL Editor do Supabase):
--
--   -- cliques e visitas dos últimos 30 dias, por evento e ponto da página
--   select evento, onde, count(*) as total
--   from public.eventos_site
--   where criado_em > now() - interval '30 days'
--   group by evento, onde
--   order by total desc;
--
--   -- visitas por dia
--   select date(criado_em) as dia, count(*) as visitas
--   from public.eventos_site
--   where evento = 'visita'
--   group by 1 order by 1 desc;
--
--   -- de onde vêm os cliques em "cadastrar empresa"
--   select origem, count(*) from public.eventos_site
--   where evento = 'cadastro_empresa' group by 1 order by 2 desc;
-- ─────────────────────────────────────────────────────────────────────
