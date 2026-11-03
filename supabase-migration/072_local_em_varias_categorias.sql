-- 072 — Um local pode estar em mais de uma categoria (e, em cada uma, em uma subcategoria).
-- A categoria/subcategoria PRINCIPAL continua em public.locais (nada do que já funciona muda).
-- As categorias EXTRAS ficam aqui, uma linha por categoria extra. O app junta as duas listas na página da categoria.
-- Quem edita: o admin (/admin > Locais > Posição no app). Seguro rodar mais de uma vez.
-- Rode DEPOIS das migrations que criaram os valores do enum (026, 033, 053, 069, 070), em arquivo separado.
begin;

create table if not exists public.local_categorias_extra (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  categoria public.categoria_tipo not null,
  subcategoria text,
  atualizado_em timestamptz not null default now(),
  constraint local_categorias_extra_unico unique (local_id, categoria)
);
create index if not exists local_categorias_extra_cat_idx on public.local_categorias_extra (categoria);

alter table public.local_categorias_extra enable row level security;
drop policy if exists "local_cat_extra_select" on public.local_categorias_extra;
create policy "local_cat_extra_select" on public.local_categorias_extra for select to anon, authenticated using (true);
drop policy if exists "local_cat_extra_admin" on public.local_categorias_extra;
create policy "local_cat_extra_admin" on public.local_categorias_extra for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.local_categorias_extra to anon, authenticated;
grant insert, update, delete on public.local_categorias_extra to authenticated;

commit;
