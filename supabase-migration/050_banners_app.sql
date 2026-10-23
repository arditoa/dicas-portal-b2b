-- 050 — Banners do app (carrossel da Home e da Trip) + medição de exibições e cliques.
-- Rodar no SQL Editor do Supabase. Seguro para rodar mais de uma vez.
-- Privacidade: a medição é anônima (sem usuário, sem aparelho, sem localização).

create table if not exists public.banners_app (
  id uuid primary key default gen_random_uuid(),
  chave text unique,                       -- nome interno: brasil2027, embratur, camara, museu...
  tag text not null,                       -- etiqueta pequena acima do título
  titulo text not null,
  cta text not null default 'Conhecer',
  icone text not null default 'star',      -- nome de ícone Feather (ex.: globe, map, briefcase)
  cor text not null default '#7E57C2',     -- cor da faixa lateral
  logo_url text,                           -- logo opcional (substitui o ícone)
  destino text not null default '',        -- '/rota', 'https://...', 'aviso:brasil2027' ou 'local:<id>'
  telas text[] not null default '{home,trip}',
  parceria text not null default 'institucional' check (parceria in ('patrocinio','institucional','proprio')),
  peso int not null default 1 check (peso between 1 and 10),
  peso_periodo int check (peso_periodo between 1 and 10),   -- peso extra durante o período abaixo
  periodo_inicio date,
  periodo_fim date,
  inicio timestamptz,                      -- só aparece a partir daqui (vazio = já)
  fim timestamptz,                         -- some depois daqui (vazio = sem fim)
  ativo boolean not null default true,
  traducoes jsonb not null default '{}'::jsonb,  -- {"en":{"tag","titulo","cta"},"es":{...}}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.banners_app enable row level security;

drop policy if exists "banners_select_publicos" on public.banners_app;
create policy "banners_select_publicos" on public.banners_app
  for select to anon, authenticated
  using (ativo and (inicio is null or inicio <= now()) and (fim is null or fim >= now()));

drop policy if exists "banners_admin_tudo" on public.banners_app;
create policy "banners_admin_tudo" on public.banners_app
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.banners_eventos (
  id bigint generated always as identity primary key,
  banner_id uuid not null references public.banners_app(id) on delete cascade,
  tipo text not null check (tipo in ('exibicao','clique')),
  tela text not null check (tela in ('home','trip')),
  created_at timestamptz not null default now()
);
create index if not exists banners_eventos_banner_idx on public.banners_eventos (banner_id, created_at desc);

alter table public.banners_eventos enable row level security;

drop policy if exists "banners_eventos_insert" on public.banners_eventos;
create policy "banners_eventos_insert" on public.banners_eventos
  for insert to anon, authenticated with check (true);

drop policy if exists "banners_eventos_select_admin" on public.banners_eventos;
create policy "banners_eventos_select_admin" on public.banners_eventos
  for select to authenticated using (public.is_admin());

-- Resumo para o painel: exibições e cliques por banner nos últimos N dias.
create or replace function public.resumo_banners(p_dias int default 30)
returns table (banner_id uuid, exibicoes bigint, cliques bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'apenas administradores';
  end if;
  return query
    select e.banner_id,
           count(*) filter (where e.tipo = 'exibicao'),
           count(*) filter (where e.tipo = 'clique')
    from public.banners_eventos e
    where e.created_at >= now() - make_interval(days => greatest(p_dias, 1))
    group by e.banner_id;
end $$;
revoke all on function public.resumo_banners(int) from public;
grant execute on function public.resumo_banners(int) to authenticated;

-- Banners que já existiam no código (Copa, Embratur, Câmara LGBT).
insert into public.banners_app (chave, tag, titulo, cta, icone, cor, destino, telas, parceria, peso, peso_periodo, periodo_inicio, periodo_fim, traducoes)
values
 ('brasil2027', 'JUN–JUL 2027 · 8 CIDADES-SEDE', 'Futebol feminino no Brasil: roteiros LGBT+ por cidade-sede', 'Quero ser avisada(o)', 'globe', '#E1306C', 'aviso:brasil2027', '{home,trip}', 'proprio', 2, 3, '2027-05-25', '2027-07-25',
  '{"en":{"tag":"JUN–JUL 2027 · 8 HOST CITIES","titulo":"Women’s football in Brazil: LGBTQ+ itineraries by host city","cta":"Notify me"},"es":{"tag":"JUN–JUL 2027 · 8 SEDES","titulo":"Fútbol femenino en Brasil: rutas LGBT+ por ciudad sede","cta":"Avísame"}}'::jsonb),
 ('embratur', 'TURISMO NO BRASIL', 'Conheça a Embratur e os destinos do Brasil', 'Conhecer', 'map', '#1E8A3F', 'https://embratur.com.br/', '{home,trip}', 'institucional', 1, null, null, null,
  '{"en":{"tag":"TRAVEL IN BRAZIL","titulo":"Discover Embratur and Brazil’s destinations","cta":"Learn more"},"es":{"tag":"TURISMO EN BRASIL","titulo":"Conoce Embratur y los destinos de Brasil","cta":"Conocer"}}'::jsonb),
 ('camara', 'COMÉRCIO E TURISMO LGBT+', 'Conheça a Câmara de Comércio e Turismo LGBT do Brasil', 'Conhecer', 'briefcase', '#7E57C2', 'https://camaralgbt.com.br/', '{home,trip}', 'institucional', 1, null, null, null,
  '{"en":{"tag":"LGBTQ+ BUSINESS & TOURISM","titulo":"Meet Brazil’s LGBT Chamber of Commerce and Tourism","cta":"Learn more"},"es":{"tag":"COMERCIO Y TURISMO LGBT+","titulo":"Conoce la Cámara de Comercio y Turismo LGBT de Brasil","cta":"Conocer"}}'::jsonb)
on conflict (chave) do nothing;
