-- Rodada 69 — Experiências e roteiros (Dicas Trip).
-- Rodar DEPOIS da 036 e 038.
--
--   1) roteiros — roteiros completos e experiências avulsas (passeio, tour,
--      workshop…). Tags por grupo em `tags` (jsonb, taxonomia oficial em
--      src/lib/taxonomia.ts → GRUPOS_ROTEIRO) e no máximo 8 tags principais
--      visíveis nos cards (`tags_principais`).
--   2) roteiro_paradas — linha do tempo do roteiro (horário, título,
--      descrição, foto, local do app opcional, coordenadas para o mapa).
--   3) roteiros_salvos — botão "Salvar roteiro" do usuário.
--   4) Exemplo publicado: "São Paulo LGBT+ em 1 dia" (4 paradas).
--
-- Quem cria: a equipe (admin) e, depois, parceiros de turismo donos do
-- local vinculado (`local_id`). Identificações comerciais (Destaque,
-- Curadoria Dicas, Verificado…) só a equipe marca — trigger abaixo.

begin;

create table if not exists public.roteiros (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titulo text not null,
  subtitulo text,
  descricao text,
  cidade text not null,
  uf text,
  destino_slug text,
  foto_url text,
  foto_credito text,
  formato text not null default 'roteiro_completo',
  duracao text,
  duracao_texto text,
  preco_texto text,
  link_reserva text,
  tags jsonb not null default '{}'::jsonb,
  tags_principais text[] not null default '{}' check (cardinality(tags_principais) <= 8),
  local_id uuid references public.locais(id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  destaque boolean not null default false,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists roteiros_cidade_idx on public.roteiros(cidade);

create table if not exists public.roteiro_paradas (
  id uuid primary key default gen_random_uuid(),
  roteiro_id uuid not null references public.roteiros(id) on delete cascade,
  ordem integer not null default 0,
  horario text,
  titulo text not null,
  descricao text,
  foto_url text,
  local_id uuid references public.locais(id) on delete set null,
  endereco text,
  lat double precision,
  lng double precision
);
create index if not exists roteiro_paradas_roteiro_idx on public.roteiro_paradas(roteiro_id);

create table if not exists public.roteiros_salvos (
  user_id uuid not null references auth.users(id) on delete cascade,
  roteiro_id uuid not null references public.roteiros(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, roteiro_id)
);

alter table public.roteiros enable row level security;
alter table public.roteiro_paradas enable row level security;
alter table public.roteiros_salvos enable row level security;

-- Leitura: publicados para todos; rascunhos só para admin e dono do local.
drop policy if exists "roteiros_select" on public.roteiros;
create policy "roteiros_select" on public.roteiros for select using (
  status = 'publicado' or public.is_admin()
  or exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid())
);
drop policy if exists "roteiros_write" on public.roteiros;
create policy "roteiros_write" on public.roteiros for all using (
  public.is_admin() or exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid())
) with check (
  public.is_admin() or exists (select 1 from public.locais l where l.id = local_id and l.owner_id = auth.uid())
);

drop policy if exists "roteiro_paradas_select" on public.roteiro_paradas;
create policy "roteiro_paradas_select" on public.roteiro_paradas for select using (
  exists (select 1 from public.roteiros r where r.id = roteiro_id and (
    r.status = 'publicado' or public.is_admin()
    or exists (select 1 from public.locais l where l.id = r.local_id and l.owner_id = auth.uid())
  ))
);
drop policy if exists "roteiro_paradas_write" on public.roteiro_paradas;
create policy "roteiro_paradas_write" on public.roteiro_paradas for all using (
  exists (select 1 from public.roteiros r where r.id = roteiro_id and (
    public.is_admin() or exists (select 1 from public.locais l where l.id = r.local_id and l.owner_id = auth.uid())
  ))
) with check (
  exists (select 1 from public.roteiros r where r.id = roteiro_id and (
    public.is_admin() or exists (select 1 from public.locais l where l.id = r.local_id and l.owner_id = auth.uid())
  ))
);

drop policy if exists "roteiros_salvos_dono" on public.roteiros_salvos;
create policy "roteiros_salvos_dono" on public.roteiros_salvos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Parceiro não publica sozinho nem marca destaque/identificações da equipe.
create or replace function public.roteiros_proteger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  equipe text[] := array['destaque','parceiro_fundador','curadoria_dicas','verificado_pelo_dicas','mais_procurado','novidade'];
begin
  new.updated_at := now();
  -- admin, ou SQL Editor/serviço (sem usuário logado: RLS já barra anônimos)
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'rascunho';
    new.destaque := false;
  else
    new.status := old.status;
    new.destaque := old.destaque;
  end if;
  new.tags := jsonb_set(coalesce(new.tags, '{}'::jsonb), '{comercial}',
    case when tg_op = 'UPDATE' then coalesce(old.tags -> 'comercial', '[]'::jsonb) else '[]'::jsonb end, true);
  new.tags_principais := array(select t from unnest(new.tags_principais) t where t <> all(equipe));
  return new;
end $$;

drop trigger if exists roteiros_proteger on public.roteiros;
create trigger roteiros_proteger before insert or update on public.roteiros
  for each row execute function public.roteiros_proteger();

-- Exemplo inicial ----------------------------------------------------------
insert into public.roteiros (slug, titulo, subtitulo, descricao, cidade, uf, destino_slug, formato, duracao, duracao_texto, preco_texto,
  tags, tags_principais, status, destaque, ordem)
values (
  'sao-paulo-lgbt-em-1-dia',
  'São Paulo LGBT+ em 1 dia',
  'Cultura, história, gastronomia e vida noturna em um roteiro para viver a cidade por inteiro.',
  'Do coração cultural da Paulista aos lugares que contam a história LGBT+ do centro, terminando nos bares e casas mais animados da cidade. Dá para fazer tudo a pé e de metrô.',
  'São Paulo', 'SP', 'sao-paulo', 'roteiro_completo', '1_dia', '1 dia', 'Grátis (consumo à parte)',
  '{"formato":["roteiro_completo","autoguiado"],"duracao":["1_dia"],"tema":["cultura","historia","gastronomia","vida_noturna","turismo_urbano"],"lgbt":["historia_lgbt","locais_historicos_lgbt","vida_noturna_lgbt","bares_lgbt"],"publico":["todos_os_publicos","turistas"],"perfil":["viagem_solo","amigos","casais","primeira_viagem"],"horario":["manha","tarde","noite"],"deslocamento":["a_pe","metro","sem_carro"],"entrada":["gratis"],"comercial":["curadoria_dicas"]}',
  array['1_dia','cultura','historia_lgbt','gastronomia','vida_noturna_lgbt','a_pe','metro','gratis'],
  'publicado', true, 1
) on conflict (slug) do nothing;

insert into public.roteiro_paradas (roteiro_id, ordem, horario, titulo, descricao, endereco, lat, lng)
select r.id, p.ordem, p.horario, p.titulo, p.descricao, p.endereco, p.lat, p.lng
from public.roteiros r
cross join (values
  (1, '10h', 'Avenida Paulista e MASP', 'Arte, diversidade e o coração cultural de São Paulo. Aos domingos a avenida fecha para carros.', 'Av. Paulista, 1578 — Bela Vista', -23.5614, -46.6559),
  (2, '13h', 'Almoço na região da República', 'Gastronomia diversa, bares e cafés em um dos bairros mais autênticos da cidade.', 'Praça da República — República', -23.5432, -46.6425),
  (3, '16h', 'Arouche e Bento Freitas', 'História, resistência e vida LGBT+ em lugares icônicos do centro.', 'Largo do Arouche — República', -23.5413, -46.6455),
  (4, '20h', 'Bar e vida noturna LGBT+', 'Drinks, música e encontros nos bares e casas mais incríveis da cidade.', 'Rua Augusta / Frei Caneca — Consolação', -23.5535, -46.6560)
) as p(ordem, horario, titulo, descricao, endereco, lat, lng)
where r.slug = 'sao-paulo-lgbt-em-1-dia'
  and not exists (select 1 from public.roteiro_paradas x where x.roteiro_id = r.id);

commit;
