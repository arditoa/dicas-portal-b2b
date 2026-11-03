-- 065 — Liga/desliga das subcategorias (ícones redondos abaixo das ofertas nas páginas de categoria).
-- Sem linha = ligada. O /admin (Vitrine das categorias > Subcategorias) grava aqui. Seguro rodar mais de uma vez.
create table if not exists public.subcategoria_config (
  categoria text not null,            -- categoria REAL do banco (ex.: 'lugares' = Bares & Vida Noturna)
  chave text not null,                -- chave da subcategoria (ex.: 'baladas e clubes')
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now(),
  primary key (categoria, chave)
);
alter table public.subcategoria_config enable row level security;
drop policy if exists "subcat_cfg_select" on public.subcategoria_config;
create policy "subcat_cfg_select" on public.subcategoria_config for select to anon, authenticated using (true);
drop policy if exists "subcat_cfg_admin" on public.subcategoria_config;
create policy "subcat_cfg_admin" on public.subcategoria_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.subcategoria_config to anon, authenticated;
grant insert, update, delete on public.subcategoria_config to authenticated;
