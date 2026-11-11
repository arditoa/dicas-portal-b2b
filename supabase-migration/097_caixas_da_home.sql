-- Rodada 144 — Caixas da Home editáveis no /admin (Mapa do app → Caixas da Home).
-- Renomear, trocar ícone e cores, ordenar, ocultar e criar caixas novas.
-- tipo: 'padrao' (as 6 originais, com a lógica própria do app), 'curadoria' (locais escolhidos pela equipe:
-- locais.destaque_secoes contém 'caixa:<chave>') ou 'link' (abre uma categoria, rota do app ou site).
create table if not exists public.home_caixas (
  chave text primary key,
  titulo text not null,
  subtitulo text,
  icone text not null default 'star',
  cor1 text not null default '#E1306C',
  cor2 text not null default '#6D3FD1',
  ordem int not null default 0,
  ativo boolean not null default true,
  tipo text not null default 'curadoria' check (tipo in ('padrao', 'curadoria', 'link')),
  destino text,
  traducoes jsonb,
  updated_at timestamptz not null default now()
);

alter table public.home_caixas enable row level security;
drop policy if exists "home_caixas leitura" on public.home_caixas;
create policy "home_caixas leitura" on public.home_caixas for select using (true);
drop policy if exists "home_caixas admin" on public.home_caixas;
create policy "home_caixas admin" on public.home_caixas for all using (public.is_admin()) with check (public.is_admin());

insert into public.home_caixas (chave, titulo, icone, cor1, cor2, ordem, tipo) values
  ('em-alta', 'Em Alta', 'trending-up', '#CC7A0A', '#9A4A0A', 1, 'padrao'),
  ('recomendados', 'Recomendados', 'check-circle', '#0DA372', '#0E7490', 2, 'padrao'),
  ('hoje', 'O que fazer hoje', 'zap', '#C026A3', '#6D3FD1', 3, 'padrao'),
  ('semana', 'Top da semana', 'star', '#F2692A', '#C42660', 4, 'padrao'),
  ('experiencia', 'Experiências', 'heart', '#0A8FD0', '#7048B8', 5, 'padrao'),
  ('servicos', 'Serviços', 'briefcase', '#0F9F90', '#5558E3', 6, 'padrao')
on conflict (chave) do nothing;
