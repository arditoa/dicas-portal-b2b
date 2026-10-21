-- Rodada 63 — Hospedagens, destinos do Trip, locais próximos e tags novas.
--
-- O que essa migration faz:
--   1) locais.tipo_hospedagem (Hotel, Pousada…) e locais.atributos (jsonb com
--      as tags por grupo: {"comodidades": ["piscina", ...], "quartos": [...]}).
--   2) hospedagem_espacos — Quartos / Áreas em comum / Lazer, com foto
--      (o "Conheça os quartos" da página do hotel).
--   3) pontos_proximos — pontos de referência que o hotel indica (metrô,
--      Av. Paulista, percurso da Parada…). Entram como 'pendente' e só
--      aparecem no app depois que a equipe valida a localização no /admin.
--      Bares, festas, restaurantes etc. já cadastrados no app NÃO precisam
--      disso: o app calcula a distância sozinho pelas coordenadas.
--   4) eventos.tags — tags novas da aba de festas (tipo, estilo, público,
--      ingresso, estrutura, ambiente, classificação).
--   5) pacotes_turismo.tags — tags de roteiro/passeio.
--   6) destinos — cidades do "Destinos em destaque" do Trip (gerido pela
--      equipe), já com as 6 cidades iniciais.
--
-- Pode rodar mais de uma vez sem quebrar (if not exists / drop policy if exists).

begin;

-- 1) Hospedagem em locais ------------------------------------------------
alter table public.locais add column if not exists tipo_hospedagem text;
alter table public.locais add column if not exists atributos jsonb not null default '{}'::jsonb;

-- 2) Espaços da hospedagem ------------------------------------------------
create table if not exists public.hospedagem_espacos (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  tipo text not null check (tipo in ('quarto', 'area_comum', 'lazer')),
  nome text not null,
  descricao text,
  foto_url text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists hospedagem_espacos_local_idx on public.hospedagem_espacos(local_id);

alter table public.hospedagem_espacos enable row level security;

drop policy if exists "hospedagem_espacos_select_publico" on public.hospedagem_espacos;
create policy "hospedagem_espacos_select_publico" on public.hospedagem_espacos
  for select using (
    ativo = true and exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado')
    or exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "hospedagem_espacos_write_dono_ou_admin" on public.hospedagem_espacos;
create policy "hospedagem_espacos_write_dono_ou_admin" on public.hospedagem_espacos
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

-- 3) Pontos próximos (validados pela equipe) -------------------------------
create table if not exists public.pontos_proximos (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  tipo text not null,
  nome text not null,
  endereco text,
  lat double precision,
  lng double precision,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists pontos_proximos_local_idx on public.pontos_proximos(local_id);

alter table public.pontos_proximos enable row level security;

drop policy if exists "pontos_proximos_select" on public.pontos_proximos;
create policy "pontos_proximos_select" on public.pontos_proximos
  for select using (
    status = 'aprovado' and exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado')
    or exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "pontos_proximos_write_dono_ou_admin" on public.pontos_proximos;
create policy "pontos_proximos_write_dono_ou_admin" on public.pontos_proximos
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

-- Parceiro nunca aprova o próprio ponto: qualquer insert/alteração feita
-- por quem não é admin volta pra 'pendente' (a equipe revalida).
create or replace function public.pontos_proximos_forcar_pendente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.status := 'pendente';
  end if;
  return new;
end $$;

drop trigger if exists pontos_proximos_forcar_pendente on public.pontos_proximos;
create trigger pontos_proximos_forcar_pendente before insert or update on public.pontos_proximos
  for each row execute function public.pontos_proximos_forcar_pendente();

-- 4) e 5) Tags em eventos e pacotes --------------------------------------
alter table public.eventos add column if not exists tags text[] not null default '{}';
alter table public.pacotes_turismo add column if not exists tags text[] not null default '{}';

-- 6) Destinos do Trip ------------------------------------------------------
create table if not exists public.destinos (
  slug text primary key,
  cidade text not null,
  uf text not null,
  vibe text,
  descricao text,
  foto_url text,
  tags text[] not null default '{}',
  melhor_epoca text[] not null default '{}',
  melhor_epoca_texto text,
  roteiro_titulo text,
  roteiro_resumo text,
  roteiro_link text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.destinos enable row level security;

drop policy if exists "destinos_select_publico" on public.destinos;
create policy "destinos_select_publico" on public.destinos
  for select using (ativo = true or public.is_admin());

drop policy if exists "destinos_write_admin" on public.destinos;
create policy "destinos_write_admin" on public.destinos
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.destinos (slug, cidade, uf, vibe, tags, melhor_epoca, ordem) values
  ('sao-paulo', 'São Paulo', 'SP', 'São Paulo com orgulho',
    array['cultura','gastronomia','vida_noturna','compras','destino_lgbt','destino_urbano'],
    array['parada_lgbt','temporada_cultural','temporada_de_festas'], 1),
  ('rio-de-janeiro', 'Rio de Janeiro', 'RJ', 'Verão, praia e muito sol',
    array['praia','cultura','vida_noturna','natureza','destino_lgbt'],
    array['verao','carnaval','reveillon','temporada_de_praias'], 2),
  ('campos-do-jordao', 'Campos do Jordão', 'SP', 'Romântica e afetuosa',
    array['romance','natureza','gastronomia','bem_estar'],
    array['inverno','alta_temporada','festivais'], 3),
  ('santa-rita-do-sapucai', 'Santa Rita do Sapucaí', 'MG', 'Tecnologia e comunidade',
    array['cultura','natureza','amigos'],
    array['eventos_especiais'], 4),
  ('guaruja', 'Guarujá', 'SP', 'Praticidade e descanso',
    array['praia','bem_estar','familia','amigos'],
    array['verao','temporada_de_praias'], 5),
  ('vinhedo', 'Vinhedo', 'SP', 'Vinhos e cultura',
    array['gastronomia','cultura','romance'],
    array['outono','inverno','festivais'], 6)
on conflict (slug) do nothing;

commit;
