-- 071 — Vagas dos banners por categoria (a "ordem manual" do admin).
-- Cada categoria do app tem: 1 Patrocínio Master (categoria_patrocinio), 12 vagas de Banner Premium (4 por hora)
-- e 24 vagas Intermediárias (6 por vez, troca a cada 6 horas). Esta tabela diz QUEM ocupa cada vaga.
-- Vaga sem linha = automática (o app preenche pelo plano do local). Admin edita em /admin > Categorias e no cartão
-- "Posição no app" de cada local. O app só lê. Seguro rodar mais de uma vez.
begin;

create table if not exists public.vitrine_vaga (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,                                  -- slug do app (bares, artistas, destino-sao-paulo, destaques...)
  tipo text not null check (tipo in ('premium', 'intermediario')),
  posicao integer not null check (posicao between 1 and 24),
  local_id uuid not null references public.locais(id) on delete cascade,
  atualizado_em timestamptz not null default now(),
  constraint vitrine_vaga_limite_premium check (tipo <> 'premium' or posicao <= 12),
  constraint vitrine_vaga_posicao_unica unique (categoria, tipo, posicao),
  constraint vitrine_vaga_local_unico unique (categoria, tipo, local_id)   -- um local não ocupa duas vagas do mesmo tipo
);
create index if not exists vitrine_vaga_local_idx on public.vitrine_vaga (local_id);

alter table public.vitrine_vaga enable row level security;
drop policy if exists "vitrine_vaga_select" on public.vitrine_vaga;
create policy "vitrine_vaga_select" on public.vitrine_vaga for select to anon, authenticated using (true);
drop policy if exists "vitrine_vaga_admin" on public.vitrine_vaga;
create policy "vitrine_vaga_admin" on public.vitrine_vaga for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.vitrine_vaga to anon, authenticated;
grant insert, update, delete on public.vitrine_vaga to authenticated;

commit;
