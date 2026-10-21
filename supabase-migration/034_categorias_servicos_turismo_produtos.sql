-- Rodada 61 (parte "fazer direito") — Andrea aprovou implementar o painel
-- B2B adaptado pra Serviços, Turismo/Agências de turismo e Produtos, com
-- catálogo/pacotes de verdade em vez de só reaproveitar cupom.
--
-- O que essa migration faz:
--   1) Três colunas novas em `locais`, só usadas por categorias novas:
--      - atendimento_tipo: 'presencial' | 'online' | 'ambos' (Serviços)
--      - especialidade: texto livre (Serviços — ex: "Psicologia LGBT+")
--      - link_loja_online: url da loja online (Produtos)
--   2) `produtos_catalogo` — itens que um local de categoria 'produtos'
--      vende, pra aparecer no perfil dele no app (nome/descrição/preço/
--      foto/link de compra).
--   3) `pacotes_turismo` — pacotes/roteiros que um local de categoria
--      'turismo' oferece (nome/descrição/faixa de preço/foto).
--
-- As duas tabelas novas seguem exatamente o mesmo desenho de `cupons`
-- (001_migrar_para_locais.sql, parte 11): dono do local faz CRUD livre no
-- próprio local, leitura pública só quando o local está aprovado (ou pra
-- dono/admin, sempre). Sem tabela de "resgate" aqui — são só vitrines,
-- não têm equivalente ao check-in do cupom.

alter table public.locais add column if not exists atendimento_tipo text;
alter table public.locais add column if not exists especialidade text;
alter table public.locais add column if not exists link_loja_online text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'locais_atendimento_tipo_check'
  ) then
    alter table public.locais
      add constraint locais_atendimento_tipo_check
      check (atendimento_tipo is null or atendimento_tipo in ('presencial', 'online', 'ambos'));
  end if;
end $$;

create table if not exists public.produtos_catalogo (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(10, 2),
  foto_url text,
  link_compra text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pacotes_turismo (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  nome text not null,
  descricao text,
  preco_de numeric(10, 2),
  preco_ate numeric(10, 2),
  foto_url text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.produtos_catalogo enable row level security;
alter table public.pacotes_turismo enable row level security;

drop policy if exists "produtos_catalogo_select_publico" on public.produtos_catalogo;
create policy "produtos_catalogo_select_publico" on public.produtos_catalogo
  for select using (
    ativo = true and exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado')
    or exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "produtos_catalogo_write_dono_ou_admin" on public.produtos_catalogo;
create policy "produtos_catalogo_write_dono_ou_admin" on public.produtos_catalogo
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "pacotes_turismo_select_publico" on public.pacotes_turismo;
create policy "pacotes_turismo_select_publico" on public.pacotes_turismo
  for select using (
    ativo = true and exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado')
    or exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "pacotes_turismo_write_dono_ou_admin" on public.pacotes_turismo;
create policy "pacotes_turismo_write_dono_ou_admin" on public.pacotes_turismo
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

commit;
