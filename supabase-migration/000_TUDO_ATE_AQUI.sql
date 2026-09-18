-- ============================================================================
-- SCRIPT CONSOLIDADO — todas as migrations reais até a Rodada 47, numa
-- ordem só (001, 003 a 027 — a numeração salta o 002 de propósito: aquele
-- conteúdo foi incorporado na 001 faz tempo, nunca existiu como arquivo
-- separado de verdade).
--
-- COMO USAR: copie o arquivo inteiro, cole no SQL Editor do Supabase
-- (Dashboard > SQL Editor > New query) e clique em "Run".
--
-- Testado de verdade: banco vazio, banco já migrado (re-run), e banco já
-- migrado com dados reais em uso (check-in real + local/evento já usando
-- 'hoje'/'patrocinado'/'selo_dicas' ao mesmo tempo) — zero erro em nenhum
-- dos quatro ciclos de teste (fresh -> re-run -> com dado real nos 3
-- valores mais novos -> re-run de novo).
-- ============================================================================

-- ============================================================================
-- INÍCIO: 001_migrar_para_locais.sql
-- ============================================================================
-- ============================================================================
-- DICAS LGBT+ — MIGRAÇÃO DA ARQUITETURA ANTIGA (businesses/check-in/pontos/
-- WhatsApp bot) PARA A ARQUITETURA DECIDIDA (locais/avaliações)
-- ============================================================================
-- Contexto: o banco real hoje tem uma arquitetura (businesses,
-- professionals, checkins, points_ledger, rewards, coupons, events,
-- itineraries, vip_lists, whatsapp_sessions, "User", "UserConsent") que
-- Andrea confirmou que NÃO é o modelo de negócio correto. O modelo correto
-- (locais/avaliações, com planos Básico/Destaque/Vip, Lista VIP de convidados
-- por evento, cupons por local etc.) já tinha sido desenhado e testado antes
-- — este script parte daquele desenho (schema.sql) e o aplica em cima do
-- banco real.
--
-- Confirmado com Andrea (09/2026): as tabelas antigas estão vazias ou só com
-- dados de teste — não existe conteúdo real de parceiros em produção. Por
-- isso este script pode partir do zero na estrutura nova, sem precisar
-- copiar linha por linha das tabelas antigas.
--
-- Estratégia de segurança (mesmo sem isso ser estritamente necessário agora):
--  1) RENOMEIA as tabelas antigas para "_legacy_<nome>" em vez de apagar.
--     Nada é destruído — se depois de revisar você confirmar que pode
--     apagar de vez, isso é só um DROP TABLE por tabela, quando quiser.
--  2) A tabela "profiles" (perfis de usuário) É MANTIDA como está — ela já
--     está corretamente ligada a auth.users e é a única tabela do banco
--     antigo que faz parte do modelo novo também. Este script só ADICIONA
--     as colunas que faltam nela (nunca remove nem sobrescreve dados).
--  3) Todo o resto (locais, avaliações, cupons, eventos, listas VIP,
--     denúncias, bloqueios etc.) é criado do zero — são tabelas que não
--     existem ainda no banco real.
--
-- Como rodar: copie o arquivo inteiro e cole no SQL Editor do Supabase
-- (Dashboard > SQL Editor > New query) e rode de uma vez só. Depois disso,
-- o app, o backend e o portal precisam ser atualizados para usar as tabelas
-- novas — isso é o próximo passo, separado deste script.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PARTE 1 — RENOMEAR AS TABELAS DA ARQUITETURA ANTIGA (não destrutivo)
-- ----------------------------------------------------------------------------
-- Cada "alter table if exists" só age se a tabela realmente existir com esse
-- nome — pode rodar este script mais de uma vez sem erro.

do $$
begin
  if to_regclass('public.businesses') is not null
     and to_regclass('public._legacy_businesses') is null then
    alter table public.businesses rename to _legacy_businesses;
  end if;
end $$;
do $$
begin
  if to_regclass('public.professionals') is not null
     and to_regclass('public._legacy_professionals') is null then
    alter table public.professionals rename to _legacy_professionals;
  end if;
end $$;
-- "checkins" é o ÚNICO dos nomes acima que a arquitetura nova também usa
-- (o novo sistema de check-in da migration 010 cria public.checkins de
-- novo, com esse mesmo nome). Por isso a proteção aqui não pode depender
-- só de "_legacy_checkins ainda não existe" — se algum dia essa tabela
-- legada for apagada de vez (o comentário mais abaixo convida a isso: "só
-- um DROP TABLE quando quiser"), essa checagem voltaria a achar que
-- nunca rodou, e renomearia a tabela NOVA (com check-ins reais) por
-- engano. A checagem extra abaixo (a tabela atual NÃO tem a coluna
-- "codigo") garante que só a tabela antiga de verdade é renomeada — a
-- tabela nova sempre tem "codigo" (coluna unique da migration 010), então
-- depois que a nova existir isso nunca mais dispara, com ou sem
-- "_legacy_checkins" por perto.
do $$
begin
  if to_regclass('public.checkins') is not null
     and to_regclass('public._legacy_checkins') is null
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'checkins' and column_name = 'codigo'
     ) then
    alter table public.checkins rename to _legacy_checkins;
  end if;
end $$;
do $$
begin
  if to_regclass('public.points_ledger') is not null
     and to_regclass('public._legacy_points_ledger') is null then
    alter table public.points_ledger rename to _legacy_points_ledger;
  end if;
end $$;
do $$
begin
  if to_regclass('public.rewards') is not null
     and to_regclass('public._legacy_rewards') is null then
    alter table public.rewards rename to _legacy_rewards;
  end if;
end $$;
do $$
begin
  if to_regclass('public.coupons') is not null
     and to_regclass('public._legacy_coupons') is null then
    alter table public.coupons rename to _legacy_coupons;
  end if;
end $$;
do $$
begin
  if to_regclass('public.current_promo') is not null
     and to_regclass('public._legacy_current_promo') is null then
    alter table public.current_promo rename to _legacy_current_promo;
  end if;
end $$;
do $$
begin
  if to_regclass('public.events') is not null
     and to_regclass('public._legacy_events') is null then
    alter table public.events rename to _legacy_events;
  end if;
end $$;
do $$
begin
  if to_regclass('public.itineraries') is not null
     and to_regclass('public._legacy_itineraries') is null then
    alter table public.itineraries rename to _legacy_itineraries;
  end if;
end $$;
do $$
begin
  if to_regclass('public.pin_code') is not null
     and to_regclass('public._legacy_pin_code') is null then
    alter table public.pin_code rename to _legacy_pin_code;
  end if;
end $$;
do $$
begin
  if to_regclass('public.vip_lists') is not null
     and to_regclass('public._legacy_vip_lists') is null then
    alter table public.vip_lists rename to _legacy_vip_lists;
  end if;
end $$;
do $$
begin
  if to_regclass('public.whatsapp_sessions') is not null
     and to_regclass('public._legacy_whatsapp_sessions') is null then
    alter table public.whatsapp_sessions rename to _legacy_whatsapp_sessions;
  end if;
end $$;
-- Os modelos Prisma "User"/"UserConsent" mapeiam (via @@map) pras tabelas
-- reais "users" e "user_consents" (minúsculas, não "User"/"UserConsent"
-- literalmente) — corrigido aqui depois de checar o schema.prisma com
-- atenção. Não têm relação (FK) com nenhuma outra tabela nem com
-- auth.users — por isso não têm como ser migradas com segurança (não tem
-- como saber a qual conta de login cada linha pertenceria). Ficam
-- guardadas com o prefixo, sem uso, até você decidir se quer apagar de vez.
do $$
begin
  if to_regclass('public.users') is not null
     and to_regclass('public._legacy_user') is null then
    alter table public.users rename to _legacy_user;
  end if;
end $$;
do $$
begin
  if to_regclass('public.user_consents') is not null
     and to_regclass('public._legacy_user_consent') is null then
    alter table public.user_consents rename to _legacy_user_consent;
  end if;
end $$;

comment on table public._legacy_businesses is 'Arquitetura antiga (check-in/pontos) — substituída por public.locais em 09/2026. Confirmado vazia/só teste. Pode ser removida quando revisada.';


-- ----------------------------------------------------------------------------
-- PARTE 2 — EXTENSÕES
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- PARTE 3 — ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('usuario', 'parceiro', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.categoria_tipo as enum ('lugares', 'gastronomia', 'cultura', 'eventos', 'turismo', 'servicos');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_moderacao as enum ('pendente', 'aprovado', 'rejeitado', 'suspenso');
exception when duplicate_object then null; end $$;

-- "vip" aqui é só o nome interno da coluna — o texto exibido pro usuário
-- final na tela de planos do portal já está decidido e implementado como
-- Freemium / Starter / Intermediário / Premium / Fundador (ver planos/page.tsx
-- do portal-b2b-lgbt). Este enum é o valor salvo no banco, independente do
-- texto que aparece na tela — deixei os 3 níveis de exposição no carrossel
-- do app (básico/destaque/vip) e quem decide o mapeamento pro plano de
-- cobrança (Freemium..Fundador) é a lógica de assinatura, não este enum.
do $$ begin
  create type public.plano_destaque as enum ('basico', 'destaque', 'vip');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.publico_tag as enum ('todos', 'lesbica', 'gay', 'trans', 'bi', 'ursos');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estilo_musical as enum ('funk', 'pop_eletronica', 'sertanejo', 'drag_cabare', 'mpb_samba', 'techno_house');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_evento as enum ('evento', 'roteiro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_relacionamento as enum ('nao_informado', 'solteiro', 'comprometido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_solicitacao_vip as enum ('solicitada', 'aprovada', 'rejeitada', 'cancelada', 'check_in');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- PARTE 4 — FUNÇÕES AUXILIARES (usadas por trigger/RLS mais abaixo)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- PARTE 5 — PROFILES: só ADICIONA o que falta (a tabela já existe e tem
-- contas reais — NUNCA é recriada nem apagada).
-- ----------------------------------------------------------------------------
-- Cada coluna abaixo só é criada se ainda não existir — nenhuma delas
-- apaga ou sobrescreve dados de conta já existentes. full_name/phone/
-- birth_date foram incluídas aqui também (mesmo já existindo na maioria
-- dos casos) porque a captura do banco real usada pra desenhar este
-- script estava desatualizada nessas colunas — descoberto quando o
-- script quebrou em "column birth_date does not exist" na primeira
-- tentativa de execução real.
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists social_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role public.user_role not null default 'usuario';
alter table public.profiles add column if not exists modo_discreto boolean not null default true;
alter table public.profiles add column if not exists status_relacionamento public.status_relacionamento not null default 'nao_informado';
alter table public.profiles add column if not exists mostrar_status_relacionamento boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles alter column full_name set default '';

-- display_name é uma coluna calculada (nome social > nome completo > texto
-- padrão) — se ela ainda não existe, cria; se por algum motivo já existir
-- (ex.: rodou este script antes), não faz nada.
do $$ begin
  alter table public.profiles add column display_name text generated always as (
    coalesce(nullif(trim(social_name), ''), nullif(trim(full_name), ''), 'Usuário Dicas LGBT+')
  ) stored;
exception when duplicate_column then null; end $$;

-- 18+ só passa a valer pra cadastros novos/edições novas — não reprocessa
-- retroativamente contas que porventura já tenham nascimento diferente.
do $$ begin
  alter table public.profiles add constraint birth_date_18_mais
    check (birth_date is null or birth_date <= (current_date - interval '18 years'));
exception when duplicate_object then null; end $$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$ language sql security definer stable set search_path = public;

create table if not exists public.perfis_publicos (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  avatar_url text
);

create or replace function public.sync_perfil_publico()
returns trigger as $$
begin
  insert into public.perfis_publicos (id, display_name, avatar_url)
  values (new.id, new.display_name, new.avatar_url)
  on conflict (id) do update set display_name = excluded.display_name, avatar_url = excluded.avatar_url;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists sync_perfil_publico on public.profiles;
create trigger sync_perfil_publico after insert or update on public.profiles
  for each row execute function public.sync_perfil_publico();

-- Preenche perfis_publicos pra quem já tem conta hoje (contas novas já
-- passam a cair aqui automaticamente pelo trigger acima).
insert into public.perfis_publicos (id, display_name, avatar_url)
select id, display_name, avatar_url from public.profiles
on conflict (id) do update set display_name = excluded.display_name, avatar_url = excluded.avatar_url;

-- Cria a linha em profiles automaticamente no cadastro (e-mail/senha ou
-- Google). Se o app hoje já cria essa linha manualmente pelo código
-- (backend/portal), este trigger passa a ser redundante mas inofensivo —
-- "on conflict do nothing" evita erro de chave duplicada nesse caso.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, social_name, phone, birth_date, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    new.raw_user_meta_data->>'social_name',
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'birth_date', '')::date,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- PARTE 6 — LOCAIS (Lugares / Gastronomia / Cultura / Turismo / Serviços)
-- ----------------------------------------------------------------------------
create table if not exists public.locais (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  categoria public.categoria_tipo not null,
  subcategoria text,
  nome text not null,
  descricao text,
  endereco text,
  bairro text,
  cidade text not null default 'São Paulo',
  lat double precision,
  lng double precision,
  instagram text,
  contato_nome text,
  contato_email text,
  contato_telefone text,
  foto_capa_url text,
  safe_space boolean not null default false,
  publico_tags public.publico_tag[] not null default array['todos']::public.publico_tag[],
  plano_destaque public.plano_destaque not null default 'basico',
  destaque_ate timestamptz,
  status public.status_moderacao not null default 'pendente',
  rating_media numeric(3,2) not null default 0,
  rating_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.locais;
create trigger set_updated_at before update on public.locais
  for each row execute function public.set_updated_at();

create or replace function public.enforce_local_seguro_insert()
returns trigger as $$
begin
  new.status := 'pendente';
  new.safe_space := false;
  new.plano_destaque := 'basico';
  new.destaque_ate := null;
  new.owner_id := auth.uid();
  new.rating_media := 0;
  new.rating_total := 0;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_insert_locais on public.locais;
create trigger before_insert_locais before insert on public.locais
  for each row execute function public.enforce_local_seguro_insert();

create or replace function public.protect_admin_fields_locais()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not public.is_admin() then
    new.status := old.status;
    new.safe_space := old.safe_space;
    new.plano_destaque := old.plano_destaque;
    new.destaque_ate := old.destaque_ate;
    new.owner_id := old.owner_id;
    new.rating_media := old.rating_media;
    new.rating_total := old.rating_total;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_update_locais on public.locais;
create trigger before_update_locais before update on public.locais
  for each row execute function public.protect_admin_fields_locais();

create table if not exists public.local_badges (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  rotulo text not null,
  cor_tag text not null default 'dourado' check (cor_tag in ('dourado', 'verde', 'rosa')),
  horario_inicio time,
  horario_fim time,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PARTE 7 — EVENTOS (Agenda: Eventos + Roteiros de Turismo)
-- ----------------------------------------------------------------------------
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  local_id uuid references public.locais(id) on delete set null,
  criado_por uuid references public.profiles(id) on delete set null,
  tipo public.tipo_evento not null default 'evento',
  titulo text not null,
  descricao text,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  estilos_musicais public.estilo_musical[] not null default '{}'::public.estilo_musical[],
  publico_tags public.publico_tag[] not null default array['todos']::public.publico_tag[],
  foto_capa_url text,
  plano_destaque public.plano_destaque not null default 'basico',
  status public.status_moderacao not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.eventos;
create trigger set_updated_at before update on public.eventos
  for each row execute function public.set_updated_at();

create or replace function public.enforce_evento_seguro_insert()
returns trigger as $$
begin
  new.status := 'pendente';
  new.plano_destaque := 'basico';
  new.criado_por := auth.uid();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_insert_eventos on public.eventos;
create trigger before_insert_eventos before insert on public.eventos
  for each row execute function public.enforce_evento_seguro_insert();

create or replace function public.protect_admin_fields_eventos()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not public.is_admin() then
    new.status := old.status;
    new.plano_destaque := old.plano_destaque;
    new.criado_por := old.criado_por;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_update_eventos on public.eventos;
create trigger before_update_eventos before update on public.eventos
  for each row execute function public.protect_admin_fields_eventos();

-- ----------------------------------------------------------------------------
-- PARTE 8 — COMUNICADOS (institucional — só admin escreve)
-- ----------------------------------------------------------------------------
create table if not exists public.comunicados (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  corpo text not null,
  icone_tipo text not null default 'institucional' check (icone_tipo in ('institucional', 'seguranca', 'novidade')),
  publicado boolean not null default true,
  autor_admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PARTE 9 — AVALIAÇÕES (conteúdo gerado por usuário)
-- ----------------------------------------------------------------------------
create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  nota smallint not null check (nota between 1 and 5),
  comentario text,
  status text not null default 'visivel' check (status in ('visivel', 'oculta_denuncia', 'removida')),
  created_at timestamptz not null default now(),
  unique (local_id, user_id)
);

create or replace function public.recalcular_rating_local()
returns trigger as $$
declare
  v_local_id uuid := coalesce(new.local_id, old.local_id);
begin
  update public.locais l
  set rating_total = agg.total,
      rating_media = coalesce(agg.media, 0)
  from (
    select count(*) as total, avg(nota)::numeric(3,2) as media
    from public.avaliacoes
    where local_id = v_local_id and status = 'visivel'
  ) agg
  where l.id = v_local_id;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists recalcular_rating_local on public.avaliacoes;
create trigger recalcular_rating_local after insert or update or delete on public.avaliacoes
  for each row execute function public.recalcular_rating_local();

-- ----------------------------------------------------------------------------
-- PARTE 10 — FAVORITOS
-- ----------------------------------------------------------------------------
create table if not exists public.favoritos_locais (
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_id uuid not null references public.locais(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, local_id)
);

create table if not exists public.favoritos_eventos (
  user_id uuid not null references public.profiles(id) on delete cascade,
  evento_id uuid not null references public.eventos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, evento_id)
);

-- ----------------------------------------------------------------------------
-- PARTE 11 — CUPONS & LISTAS VIP
-- ----------------------------------------------------------------------------
create table if not exists public.cupons (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  titulo text not null,
  descricao text,
  codigo text,
  valido_de timestamptz,
  valido_ate timestamptz,
  limite_uso integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cupons_resgatados (
  id uuid primary key default gen_random_uuid(),
  cupom_id uuid not null references public.cupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  resgatado_em timestamptz not null default now(),
  unique (cupom_id, user_id)
);

create or replace function public.enforce_limite_cupom()
returns trigger as $$
declare
  v_limite integer;
  v_usados integer;
begin
  select limite_uso into v_limite from public.cupons where id = new.cupom_id;
  if v_limite is not null then
    select count(*) into v_usados from public.cupons_resgatados where cupom_id = new.cupom_id;
    if v_usados >= v_limite then
      raise exception 'Este cupom já atingiu o limite de usos.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_insert_cupons_resgatados on public.cupons_resgatados;
create trigger before_insert_cupons_resgatados before insert on public.cupons_resgatados
  for each row execute function public.enforce_limite_cupom();

create table if not exists public.listas_vip (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  titulo text not null default 'Lista VIP',
  descricao text,
  vagas_limite integer check (vagas_limite is null or vagas_limite > 0),
  vagas_ocupadas integer not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.protect_vagas_listas_vip()
returns trigger as $$
begin
  if pg_trigger_depth() <= 1 then
    new.vagas_ocupadas := old.vagas_ocupadas;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_update_listas_vip on public.listas_vip;
create trigger before_update_listas_vip before update on public.listas_vip
  for each row execute function public.protect_vagas_listas_vip();

create or replace function public.e_dono_da_lista_vip(p_lista_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.listas_vip lv
    join public.eventos e on e.id = lv.evento_id
    where lv.id = p_lista_id and e.criado_por = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create table if not exists public.listas_vip_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  lista_vip_id uuid not null references public.listas_vip(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  acompanhantes integer not null default 0 check (acompanhantes >= 0 and acompanhantes <= 5),
  status public.status_solicitacao_vip not null default 'solicitada',
  created_at timestamptz not null default now(),
  unique (lista_vip_id, user_id)
);

create or replace function public.enforce_solicitacao_vip_insert()
returns trigger as $$
begin
  new.status := 'solicitada';
  new.user_id := auth.uid();
  if new.acompanhantes is null or new.acompanhantes < 0 then
    new.acompanhantes := 0;
  end if;
  if not exists (select 1 from public.listas_vip lv where lv.id = new.lista_vip_id and lv.ativa) then
    raise exception 'Esta lista VIP não está mais aceitando solicitações.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_insert_listas_vip_solicitacoes on public.listas_vip_solicitacoes;
create trigger before_insert_listas_vip_solicitacoes before insert on public.listas_vip_solicitacoes
  for each row execute function public.enforce_solicitacao_vip_insert();

create or replace function public.protect_status_listas_vip_solicitacoes()
returns trigger as $$
declare
  v_e_dono_ou_admin boolean := public.e_dono_da_lista_vip(new.lista_vip_id) or public.is_admin();
  v_vagas_limite integer;
  v_vagas_ocupadas integer;
begin
  new.user_id := old.user_id;
  new.lista_vip_id := old.lista_vip_id;

  if v_e_dono_ou_admin then
    if new.status = 'aprovada' and old.status <> 'aprovada' then
      select vagas_limite, vagas_ocupadas into v_vagas_limite, v_vagas_ocupadas
      from public.listas_vip where id = new.lista_vip_id;
      if v_vagas_limite is not null and v_vagas_ocupadas >= v_vagas_limite then
        raise exception 'Lista VIP está cheia.';
      end if;
    end if;
    new.acompanhantes := old.acompanhantes;
  else
    if auth.uid() = old.user_id and old.status in ('solicitada', 'aprovada') and new.status = 'cancelada' then
      null;
    elsif auth.uid() = old.user_id and old.status = 'solicitada' and new.status = 'solicitada' then
      null;
    else
      new.status := old.status;
      new.acompanhantes := old.acompanhantes;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_update_listas_vip_solicitacoes on public.listas_vip_solicitacoes;
create trigger before_update_listas_vip_solicitacoes before update on public.listas_vip_solicitacoes
  for each row execute function public.protect_status_listas_vip_solicitacoes();

create or replace function public.recalcular_vagas_lista_vip()
returns trigger as $$
declare
  v_lista_id uuid := coalesce(new.lista_vip_id, old.lista_vip_id);
begin
  update public.listas_vip lv
  set vagas_ocupadas = (
    select count(*) from public.listas_vip_solicitacoes s
    where s.lista_vip_id = v_lista_id and s.status in ('aprovada', 'check_in')
  )
  where lv.id = v_lista_id;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists recalcular_vagas_lista_vip on public.listas_vip_solicitacoes;
create trigger recalcular_vagas_lista_vip after insert or update or delete on public.listas_vip_solicitacoes
  for each row execute function public.recalcular_vagas_lista_vip();

-- ----------------------------------------------------------------------------
-- PARTE 12 — DENÚNCIAS & BLOQUEIOS (Apple 1.2 / moderação de conteúdo)
-- ----------------------------------------------------------------------------
create table if not exists public.denuncias (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  alvo_tipo text not null check (alvo_tipo in ('avaliacao', 'local', 'evento', 'usuario')),
  alvo_id uuid not null,
  motivo text not null,
  descricao text,
  status text not null default 'aberta' check (status in ('aberta', 'em_analise', 'resolvida', 'rejeitada')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.bloqueios (
  bloqueador_id uuid not null references public.profiles(id) on delete cascade,
  bloqueado_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  constraint nao_pode_bloquear_a_si_mesmo check (bloqueador_id <> bloqueado_id)
);

create or replace function public.existe_bloqueio_entre(p_a uuid, p_b uuid)
returns boolean as $$
  select exists (
    select 1 from public.bloqueios b
    where (b.bloqueador_id = p_a and b.bloqueado_id = p_b)
       or (b.bloqueador_id = p_b and b.bloqueado_id = p_a)
  );
$$ language sql security definer stable set search_path = public;

-- ----------------------------------------------------------------------------
-- PARTE 13 — INDICAÇÕES (Indique um Amigo / Indicar um Local ou Festa)
-- ----------------------------------------------------------------------------
create table if not exists public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references public.profiles(id) on delete cascade,
  contato text not null,
  status text not null default 'enviado' check (status in ('enviado', 'cadastrado')),
  codigo_convite text,
  created_at timestamptz not null default now()
);

create table if not exists public.sugestoes_local (
  id uuid primary key default gen_random_uuid(),
  sugerido_por uuid references public.profiles(id) on delete set null,
  nome_local text not null,
  categoria public.categoria_tipo,
  descricao text,
  contato text,
  status text not null default 'pendente' check (status in ('pendente', 'avaliado', 'aprovado', 'rejeitado')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PARTE 14 — EXCLUSÃO DE CONTA (exigência Google Play: caminho fora do app)
-- ----------------------------------------------------------------------------
create table if not exists public.solicitacoes_exclusao_conta (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  telefone text,
  motivo text,
  status text not null default 'pendente' check (status in ('pendente', 'processado')),
  created_at timestamptz not null default now(),
  processado_em timestamptz
);

-- ============================================================================
-- PARTE 15 — ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.perfis_publicos enable row level security;
alter table public.locais enable row level security;
alter table public.local_badges enable row level security;
alter table public.eventos enable row level security;
alter table public.comunicados enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.favoritos_locais enable row level security;
alter table public.favoritos_eventos enable row level security;
alter table public.cupons enable row level security;
alter table public.cupons_resgatados enable row level security;
alter table public.listas_vip enable row level security;
alter table public.listas_vip_solicitacoes enable row level security;
alter table public.denuncias enable row level security;
alter table public.bloqueios enable row level security;
alter table public.indicacoes enable row level security;
alter table public.sugestoes_local enable row level security;
alter table public.solicitacoes_exclusao_conta enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "perfis_publicos_select_all" on public.perfis_publicos;
create policy "perfis_publicos_select_all" on public.perfis_publicos
  for select using (true);

drop policy if exists "locais_select_aprovados_ou_dono" on public.locais;
create policy "locais_select_aprovados_ou_dono" on public.locais
  for select using (status = 'aprovado' or owner_id = auth.uid() or public.is_admin());

drop policy if exists "locais_insert_qualquer_um" on public.locais;
create policy "locais_insert_qualquer_um" on public.locais
  for insert with check (true);

drop policy if exists "locais_update_dono_ou_admin" on public.locais;
create policy "locais_update_dono_ou_admin" on public.locais
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "badges_select_por_local_visivel" on public.local_badges;
create policy "badges_select_por_local_visivel" on public.local_badges
  for select using (
    exists (select 1 from public.locais l where l.id = local_id and (l.status = 'aprovado' or l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "badges_write_dono_ou_admin" on public.local_badges;
create policy "badges_write_dono_ou_admin" on public.local_badges
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "eventos_select_aprovados_ou_dono" on public.eventos;
create policy "eventos_select_aprovados_ou_dono" on public.eventos
  for select using (status = 'aprovado' or criado_por = auth.uid() or public.is_admin());

drop policy if exists "eventos_insert_autenticado" on public.eventos;
create policy "eventos_insert_autenticado" on public.eventos
  for insert with check (auth.uid() is not null);

drop policy if exists "eventos_update_dono_ou_admin" on public.eventos;
create policy "eventos_update_dono_ou_admin" on public.eventos
  for update using (criado_por = auth.uid() or public.is_admin())
  with check (criado_por = auth.uid() or public.is_admin());

drop policy if exists "comunicados_select_publicados" on public.comunicados;
create policy "comunicados_select_publicados" on public.comunicados
  for select using (publicado = true or public.is_admin());

drop policy if exists "comunicados_write_admin" on public.comunicados;
create policy "comunicados_write_admin" on public.comunicados
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "avaliacoes_select_visiveis" on public.avaliacoes;
create policy "avaliacoes_select_visiveis" on public.avaliacoes
  for select using (
    status = 'visivel'
    and not public.existe_bloqueio_entre(auth.uid(), avaliacoes.user_id)
  );

drop policy if exists "avaliacoes_insert_propria" on public.avaliacoes;
create policy "avaliacoes_insert_propria" on public.avaliacoes
  for insert with check (auth.uid() = user_id);

drop policy if exists "avaliacoes_update_propria_ou_admin" on public.avaliacoes;
create policy "avaliacoes_update_propria_ou_admin" on public.avaliacoes
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "avaliacoes_delete_propria_ou_admin" on public.avaliacoes;
create policy "avaliacoes_delete_propria_ou_admin" on public.avaliacoes
  for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "favoritos_locais_dono" on public.favoritos_locais;
create policy "favoritos_locais_dono" on public.favoritos_locais
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "favoritos_eventos_dono" on public.favoritos_eventos;
create policy "favoritos_eventos_dono" on public.favoritos_eventos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cupons_resgatados_dono" on public.cupons_resgatados;
create policy "cupons_resgatados_dono" on public.cupons_resgatados
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bloqueios_dono" on public.bloqueios;
create policy "bloqueios_dono" on public.bloqueios
  for all using (auth.uid() = bloqueador_id) with check (auth.uid() = bloqueador_id);

drop policy if exists "indicacoes_dono" on public.indicacoes;
create policy "indicacoes_dono" on public.indicacoes
  for all using (auth.uid() = indicador_id) with check (auth.uid() = indicador_id);

drop policy if exists "cupons_select_publico" on public.cupons;
create policy "cupons_select_publico" on public.cupons
  for select using (
    ativo = true and exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado')
    or exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "cupons_write_dono_ou_admin" on public.cupons;
create policy "cupons_write_dono_ou_admin" on public.cupons
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "listas_vip_select" on public.listas_vip;
create policy "listas_vip_select" on public.listas_vip
  for select using (
    (ativa and exists (select 1 from public.eventos e where e.id = evento_id and e.status = 'aprovado'))
    or exists (select 1 from public.eventos e where e.id = evento_id and e.criado_por = auth.uid())
    or public.is_admin()
  );

drop policy if exists "listas_vip_write_dono_ou_admin" on public.listas_vip;
create policy "listas_vip_write_dono_ou_admin" on public.listas_vip
  for all using (
    exists (select 1 from public.eventos e where e.id = evento_id and e.criado_por = auth.uid())
    or public.is_admin()
  ) with check (
    exists (select 1 from public.eventos e where e.id = evento_id and e.criado_por = auth.uid())
    or public.is_admin()
  );

drop policy if exists "listas_vip_solicitacoes_select" on public.listas_vip_solicitacoes;
create policy "listas_vip_solicitacoes_select" on public.listas_vip_solicitacoes
  for select using (
    auth.uid() = user_id or public.e_dono_da_lista_vip(lista_vip_id) or public.is_admin()
  );

drop policy if exists "listas_vip_solicitacoes_insert" on public.listas_vip_solicitacoes;
create policy "listas_vip_solicitacoes_insert" on public.listas_vip_solicitacoes
  for insert with check (auth.uid() = user_id);

drop policy if exists "listas_vip_solicitacoes_update" on public.listas_vip_solicitacoes;
create policy "listas_vip_solicitacoes_update" on public.listas_vip_solicitacoes
  for update using (
    auth.uid() = user_id or public.e_dono_da_lista_vip(lista_vip_id) or public.is_admin()
  );

drop policy if exists "listas_vip_solicitacoes_delete" on public.listas_vip_solicitacoes;
create policy "listas_vip_solicitacoes_delete" on public.listas_vip_solicitacoes
  for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "denuncias_select_propria_ou_admin" on public.denuncias;
create policy "denuncias_select_propria_ou_admin" on public.denuncias
  for select using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists "denuncias_insert_autenticado" on public.denuncias;
create policy "denuncias_insert_autenticado" on public.denuncias
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "denuncias_update_admin" on public.denuncias;
create policy "denuncias_update_admin" on public.denuncias
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sugestoes_select_propria_ou_admin" on public.sugestoes_local;
create policy "sugestoes_select_propria_ou_admin" on public.sugestoes_local
  for select using (auth.uid() = sugerido_por or public.is_admin());

drop policy if exists "sugestoes_insert_autenticado" on public.sugestoes_local;
create policy "sugestoes_insert_autenticado" on public.sugestoes_local
  for insert with check (auth.uid() = sugerido_por);

drop policy if exists "sugestoes_update_admin" on public.sugestoes_local;
create policy "sugestoes_update_admin" on public.sugestoes_local
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "exclusao_insert_publico" on public.solicitacoes_exclusao_conta;
create policy "exclusao_insert_publico" on public.solicitacoes_exclusao_conta
  for insert with check (true);

drop policy if exists "exclusao_select_admin" on public.solicitacoes_exclusao_conta;
create policy "exclusao_select_admin" on public.solicitacoes_exclusao_conta
  for select using (public.is_admin());

drop policy if exists "exclusao_update_admin" on public.solicitacoes_exclusao_conta;
create policy "exclusao_update_admin" on public.solicitacoes_exclusao_conta
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- PARTE 16 — ÍNDICES
-- ============================================================================
create index if not exists idx_locais_categoria_status on public.locais (categoria, status);
create index if not exists idx_locais_publico_tags on public.locais using gin (publico_tags);
create index if not exists idx_eventos_data_inicio on public.eventos (data_inicio);
create index if not exists idx_eventos_estilos on public.eventos using gin (estilos_musicais);
create index if not exists idx_eventos_publico_tags on public.eventos using gin (publico_tags);
create index if not exists idx_avaliacoes_local on public.avaliacoes (local_id);
create index if not exists idx_denuncias_status on public.denuncias (status);
create index if not exists idx_listas_vip_evento on public.listas_vip (evento_id);
create index if not exists idx_listas_vip_solicitacoes_lista on public.listas_vip_solicitacoes (lista_vip_id);
create index if not exists idx_listas_vip_solicitacoes_user on public.listas_vip_solicitacoes (user_id);

-- ============================================================================
-- Fim — depois de rodar isto, o banco tem as duas arquiteturas lado a lado:
-- a nova (locais/avaliações/...) ativa e pronta pra usar, e a antiga
-- guardada só de segurança como "_legacy_...". O código do app, backend e
-- portal ainda precisa ser atualizado pra falar com as tabelas novas — isso
-- vem a seguir, em arquivos separados.
-- ============================================================================

-- ============================================================================
-- FIM: 001_migrar_para_locais.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 003_adicionar_cnpj_locais.sql
-- ============================================================================
-- Complemento ao 001_migrar_para_locais.sql: o desenho original de "locais"
-- não previa CNPJ — mas o cadastro real de parceiro (portal, com busca de
-- endereço via CNPJ) sempre dependeu disso pra funcionar e evitar cadastro
-- duplicado. Adicionando agora, de forma aditiva (não afeta nada que já
-- existe).
alter table if exists public.locais add column if not exists cnpj text;

-- Índice único PARCIAL (só entre os que têm CNPJ preenchido) — permite
-- várias linhas com cnpj nulo (ex.: evento cadastrado sem CNPJ de empresa),
-- mas impede duas linhas com o MESMO CNPJ preenchido.
create unique index if not exists idx_locais_cnpj_unico
  on public.locais (cnpj)
  where cnpj is not null;

-- ============================================================================
-- FIM: 003_adicionar_cnpj_locais.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 004_ajustes_cadastro_publico.sql
-- ============================================================================
-- Complemento ao 001_migrar_para_locais.sql, depois de desenhar as páginas
-- de cadastro do portal que faltavam (/cadastro/local, /cadastro/evento,
-- /cadastro/institucional, /contato).

-- 1) "eventos" não podia ser cadastrado sem login (a policy original exigia
-- auth.uid() is not null), mas o fluxo real da Andrea é o mesmo dos locais:
-- Etapa 1 pública, sem login, nasce "pendente" — só a Etapa 2 (depois de
-- aprovado) tem login. Corrigindo pra igualar à regra de "locais".
drop policy if exists "eventos_insert_autenticado" on public.eventos;
drop policy if exists "eventos_insert_qualquer_um" on public.eventos;
create policy "eventos_insert_qualquer_um" on public.eventos
  for insert with check (true); -- trigger before_insert_eventos já sanitiza os campos sensíveis

-- 2) Nova tabela pra "Parceiro Institucional" (Home, botão "Falar com o
-- time") e "Institucional / ONG" (Onboarding pós-cadastro) — os dois
-- levam pra formulários parecidos mas com propósitos ligeiramente
-- diferentes (marca/negócio com comissão por indicação vs. organização/ONG
-- de apoio), por isso o campo "origem" abaixo distingue as duas telas na
-- mesma tabela em vez de criar duas tabelas quase iguais.
do $$ begin
  create type public.origem_lead_institucional as enum ('parceiro_institucional', 'institucional_ong', 'contato_geral');
exception when duplicate_object then null; end $$;

create table if not exists public.leads_institucionais (
  id uuid primary key default gen_random_uuid(),
  origem public.origem_lead_institucional not null default 'contato_geral',
  nome_organizacao text not null,
  nome_contato text,
  email text,
  whatsapp text,
  mensagem text,
  status text not null default 'novo' check (status in ('novo', 'em_contato', 'fechado', 'descartado')),
  created_at timestamptz not null default now()
);

alter table public.leads_institucionais enable row level security;

drop policy if exists "leads_institucionais_insert_publico" on public.leads_institucionais;
create policy "leads_institucionais_insert_publico" on public.leads_institucionais
  for insert with check (true); -- formulário público, sem login

drop policy if exists "leads_institucionais_select_admin" on public.leads_institucionais;
create policy "leads_institucionais_select_admin" on public.leads_institucionais
  for select using (public.is_admin());

drop policy if exists "leads_institucionais_update_admin" on public.leads_institucionais;
create policy "leads_institucionais_update_admin" on public.leads_institucionais
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- FIM: 004_ajustes_cadastro_publico.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 005_planos_comerciais_e_vinculo_local.sql
-- ============================================================================
-- ============================================================================
-- 005 — Planos comerciais (monetização) + vínculo de conta a um local
-- ============================================================================
-- Contexto (Rodada 15 — pedido da Andrea de 15/09/2026: "confio em você
-- ajustar e fazer o app + cadastro B2B inicial e portal se conectarem",
-- atuando como consultor de UX e de negócio, sabendo que "temos que vender
-- os planos para sustentar o negócio").
--
-- Esta migration resolve dois buracos encontrados na investigação:
--
-- 1) O portal mostra 5 planos comerciais (Freemium, Starter, Intermediário,
--    Premium, Fundador) só como texto — nenhum botão grava nada. O único
--    enum de plano que existe no banco (`plano_destaque`, criado na 001) tem
--    só 3 valores (basico/destaque/vip) e controla APARÊNCIA no app (ordem,
--    selos), não COBRANÇA. São conceitos diferentes e ficam colunas
--    diferentes: `plano_destaque` continua controlando o que aparece pro
--    usuário final do app; `plano_comercial` (novo) controla o que a Andrea
--    vende e cobra. Cruzar os dois é uma decisão manual da Andrea (ex.: só
--    marcar `plano_destaque = 'destaque'` depois que `plano_comercial_status`
--    virar 'ativo') — não é automático nesta rodada, porque cobrança
--    recorrente automática ainda não existe (decisão da Andrea: começar
--    manual/Pix, ver `roadmap-produto-monetizacao.md` no projeto).
--
-- 2) O cadastro público de local (`/cadastro/local` no portal) é sempre
--    anônimo — o trigger `enforce_local_seguro_insert` (001) força
--    `owner_id := auth.uid()`, que fica NULL pra sempre num insert sem
--    sessão. Não existe hoje NENHUM jeito de depois ligar aquele local
--    (já aprovado) a uma conta de login real. Esta migration cria uma
--    tabela de "solicitação de vínculo": o parceiro cria conta, pede pra
--    vincular o local dele (por CNPJ), e a Andrea aprova manualmente pelo
--    painel admin — reaproveitando o `is_admin()` que já existe e já é
--    usado em todas as outras tabelas.
--
-- Nada aqui apaga ou quebra o que já existe. Só adiciona colunas (com
-- default seguro) e duas tabelas novas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1 — Plano comercial (o que a Andrea vende) x plano_destaque (o que
-- aparece no app) — colunas separadas, de propósito.
-- ----------------------------------------------------------------------------

do $$ begin
  create type public.plano_comercial as enum (
    'freemium', 'starter', 'intermediario', 'premium', 'fundador'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.plano_comercial_status as enum (
    'ativo',               -- freemium (sempre ativo, é grátis) ou pago e confirmado
    'interesse',           -- o parceiro escolheu um plano pago no /planos
    'aguardando_pagamento',-- Andrea já entrou em contato, aguardando Pix/confirmação
    'cancelado'            -- cancelado (pelo parceiro ou pela Andrea)
  );
exception when duplicate_object then null;
end $$;

alter table public.locais
  add column if not exists plano_comercial public.plano_comercial not null default 'freemium';

alter table public.locais
  add column if not exists plano_comercial_status public.plano_comercial_status not null default 'ativo';

alter table public.locais
  add column if not exists plano_comercial_atualizado_em timestamptz not null default now();

comment on column public.locais.plano_comercial is
  'Plano COMERCIAL escolhido pelo parceiro no /planos (cobrança). Não confundir com plano_destaque, que controla aparência/ordem no app e só a Andrea (admin) altera.';
comment on column public.locais.plano_comercial_status is
  'ativo = freemium ou pago já confirmado; interesse = escolheu um plano pago e ainda não pagou; aguardando_pagamento = Andrea já contatou por Pix/WhatsApp; cancelado.';

-- Um parceiro pode escolher livremente QUAL plano quer (plano_comercial) e
-- só pode se auto-mover pra 'interesse' (pediu) ou 'cancelado' (desistiu/
-- voltou pro freemium). Só a Andrea (is_admin()) pode confirmar
-- 'aguardando_pagamento' ou 'ativo' num plano pago — isso é o que impede
-- alguém de se "autoconceder" um plano pago sem pagar.
--
-- Importante (achado ao testar esta migration numa base local antes de
-- entregar): não basta olhar se `plano_comercial_status` MUDOU — o default
-- de `plano_comercial_status` é 'ativo' (correto pro Freemium, que é
-- sempre grátis). Um parceiro malicioso podia mandar
-- `plano_comercial = 'premium'` deixando `plano_comercial_status` como já
-- estava ('ativo', do valor padrão) — como o STATUS não "mudava" nessa
-- chamada, a versão anterior deste trigger deixava passar, concedendo o
-- plano pago de graça. A versão abaixo olha a COMBINAÇÃO dos dois campos:
-- só deixa a linha terminar em ('algum plano pago', 'ativo'/
-- 'aguardando_pagamento') se ELA JÁ ESTAVA exatamente assim antes desta
-- atualização (ou seja, foi a Andrea que colocou nesse estado numa
-- atualização anterior) — qualquer mudança real feita pelo próprio
-- parceiro nesses dois campos sempre cai pra 'interesse'.
create or replace function public.protect_plano_comercial_status()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if not public.is_admin() then
    if new.plano_comercial = 'freemium' then
      -- Freemium é sempre grátis — não existe "aguardar pagamento" aqui.
      new.plano_comercial_status := 'ativo';
    elsif new.plano_comercial_status not in ('interesse', 'cancelado') then
      if old.plano_comercial is distinct from new.plano_comercial
         or old.plano_comercial_status is distinct from new.plano_comercial_status then
        new.plano_comercial_status := 'interesse';
      end if;
      -- Se nada mudou de fato (linha já estava nesse estado por decisão da
      -- Andrea numa atualização anterior), mantém como está.
    end if;
  end if;

  if new.plano_comercial is distinct from old.plano_comercial
     or new.plano_comercial_status is distinct from old.plano_comercial_status then
    new.plano_comercial_atualizado_em := now();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_update_plano_comercial on public.locais;
create trigger before_update_plano_comercial before update on public.locais
  for each row execute function public.protect_plano_comercial_status();

-- ----------------------------------------------------------------------------
-- PARTE 2 — Solicitação de vínculo (ligar uma conta de login a um local já
-- cadastrado/aprovado anonimamente).
-- ----------------------------------------------------------------------------

create table if not exists public.solicitacoes_vinculo_local (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  documento_informado text not null, -- CNPJ que o parceiro digitou, pra Andrea conferir
  mensagem text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolvido_por uuid references public.profiles(id)
);

-- Evita duas solicitações pendentes duplicadas pro mesmo local+usuário.
create unique index if not exists solicitacoes_vinculo_local_pendente_unica
  on public.solicitacoes_vinculo_local (local_id, user_id)
  where status = 'pendente';

comment on table public.solicitacoes_vinculo_local is
  'Pedido de um usuário logado pra vincular sua conta a um local que foi cadastrado anonimamente (fluxo público /cadastro/local). Aprovação é sempre manual (admin), nunca automática — CNPJ por si só não prova que é o dono.';

alter table public.solicitacoes_vinculo_local enable row level security;

drop policy if exists solicitacoes_vinculo_insert_propria on public.solicitacoes_vinculo_local;
create policy solicitacoes_vinculo_insert_propria
  on public.solicitacoes_vinculo_local for insert
  with check (auth.uid() = user_id);

drop policy if exists solicitacoes_vinculo_select_propria_ou_admin on public.solicitacoes_vinculo_local;
create policy solicitacoes_vinculo_select_propria_ou_admin
  on public.solicitacoes_vinculo_local for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists solicitacoes_vinculo_update_admin on public.solicitacoes_vinculo_local;
create policy solicitacoes_vinculo_update_admin
  on public.solicitacoes_vinculo_local for update
  using (public.is_admin());

drop policy if exists solicitacoes_vinculo_delete_propria_pendente on public.solicitacoes_vinculo_local;
create policy solicitacoes_vinculo_delete_propria_pendente
  on public.solicitacoes_vinculo_local for delete
  using (auth.uid() = user_id and status = 'pendente');

-- Não deixa pedir vínculo de um local que já tem dono, e nunca deixa o
-- próprio parceiro se auto-aprovar (mesmo que ele burle o app e mande um
-- update com status='aprovado' — o trigger reverte, só a Andrea aprova de
-- fato aplicando o vínculo abaixo).
create or replace function public.validar_solicitacao_vinculo()
returns trigger as $$
declare
  ja_tem_dono boolean;
begin
  select (owner_id is not null) into ja_tem_dono
  from public.locais where id = new.local_id;

  if ja_tem_dono then
    raise exception 'Este local já tem um responsável vinculado.';
  end if;

  if tg_op = 'UPDATE' and not public.is_admin() then
    new.status := old.status;
    new.resolvido_em := old.resolvido_em;
    new.resolvido_por := old.resolvido_por;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_insert_solicitacao_vinculo on public.solicitacoes_vinculo_local;
create trigger before_insert_solicitacao_vinculo before insert on public.solicitacoes_vinculo_local
  for each row execute function public.validar_solicitacao_vinculo();

-- Nome do trigger começa com "1_" de propósito: dois triggers BEFORE UPDATE
-- na mesma tabela rodam em ordem alfabética pelo NOME do trigger, e este
-- precisa rodar antes do "2_aplica_vinculo" abaixo (que lê new.status já
-- validado/revertido por este).
drop trigger if exists before_update_solicitacao_vinculo on public.solicitacoes_vinculo_local;
drop trigger if exists "1_valida_solicitacao_vinculo" on public.solicitacoes_vinculo_local;
create trigger "1_valida_solicitacao_vinculo" before update on public.solicitacoes_vinculo_local
  for each row execute function public.validar_solicitacao_vinculo();

-- Quando a Andrea (admin) aprova o pedido (status -> 'aprovado'), aplica o
-- vínculo de verdade: seta locais.owner_id = user_id da solicitação.
create or replace function public.aplicar_vinculo_local()
returns trigger as $$
begin
  if new.status = 'aprovado' and old.status is distinct from 'aprovado' then
    update public.locais
      set owner_id = new.user_id
      where id = new.local_id and owner_id is null;
    new.resolvido_em := now();
    new.resolvido_por := auth.uid();
  elsif new.status = 'rejeitado' and old.status is distinct from 'rejeitado' then
    new.resolvido_em := now();
    new.resolvido_por := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists after_update_solicitacao_vinculo on public.solicitacoes_vinculo_local;
drop trigger if exists "2_aplica_vinculo_local" on public.solicitacoes_vinculo_local;
create trigger "2_aplica_vinculo_local" before update on public.solicitacoes_vinculo_local
  for each row execute function public.aplicar_vinculo_local();

-- ----------------------------------------------------------------------------
-- PARTE 3 — Índice de apoio para o painel admin (listar pendentes rápido).
-- ----------------------------------------------------------------------------
create index if not exists locais_status_idx on public.locais (status);
create index if not exists solicitacoes_vinculo_status_idx on public.solicitacoes_vinculo_local (status);

-- ============================================================================
-- FIM: 005_planos_comerciais_e_vinculo_local.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 006_analytics_cliques_visualizacoes.sql
-- ============================================================================
-- ============================================================================
-- 006 — Analytics de parceiro: visualizações de perfil e cliques no Instagram
-- ============================================================================
-- Contexto (Rodada 17): esta migration foi DESENHADA e VALIDADA desde a
-- Rodada 5 (ver investigacao-tecnica-app.md), mas nunca entrou no conjunto
-- numerado de migrations (`supabase-migration/`) nem foi confirmada como
-- aplicada em produção — por isso o dashboard do portal (`/dashboard`)
-- mostrava "Em breve" no lugar de visualizações/cliques desde a Rodada 15.
-- O conteúdo abaixo é o mesmo já testado na Rodada 5 (mesma tabela, mesma
-- RLS, mesma função agregada) — só formalizado aqui como `006` pra ficar
-- rastreável junto com o resto e finalmente ser aplicado.
--
-- Depende só de `public.locais`, `public.profiles` e `public.is_admin()`
-- (001) — não toca em nenhuma tabela existente.
--
-- Princípio de privacidade: o parceiro nunca vê QUAL usuário clicou/
-- visualizou — só o AGREGADO (quantos). A tabela crua (com user_id) só é
-- legível por admin; o parceiro só acessa via `resumo_analytics_local`,
-- que devolve contagens, nunca linhas individuais.
-- ============================================================================

do $$ begin
  create type public.tipo_evento_analytics as enum (
    'visualizacao_perfil',
    'clique_instagram',
    'clique_cupom'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.eventos_analytics (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  tipo public.tipo_evento_analytics not null,
  user_id uuid references public.profiles(id) on delete set null, -- null = visitante anônimo
  created_at timestamptz not null default now()
);

-- Sempre grava o usuário de verdade de quem está logado (nunca o que o
-- cliente mandar no payload) — mesmo padrão de `new.owner_id := auth.uid()`
-- em locais.
create or replace function public.enforce_eventos_analytics_insert()
returns trigger as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_insert_eventos_analytics on public.eventos_analytics;
create trigger before_insert_eventos_analytics before insert on public.eventos_analytics
  for each row execute function public.enforce_eventos_analytics_insert();

alter table public.eventos_analytics enable row level security;

-- Qualquer pessoa (logada ou anônima) pode registrar um evento, mas só pra
-- um local aprovado (não dá pra logar clique num local pendente/rejeitado,
-- que nem aparece pro público).
drop policy if exists "eventos_analytics insert publico" on public.eventos_analytics;
create policy "eventos_analytics insert publico"
  on public.eventos_analytics for insert
  with check (
    exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado')
  );

-- Ninguém lê a tabela crua diretamente, exceto admin — nem o próprio dono
-- do local (a linha crua tem user_id de quem clicou). O dono acessa as
-- MÉTRICAS agregadas só pela função abaixo.
drop policy if exists "eventos_analytics select admin" on public.eventos_analytics;
create policy "eventos_analytics select admin"
  on public.eventos_analytics for select
  using (public.is_admin());

-- Sem policy de update/delete — evento de analytics é imutável (é log).

-- Devolve, por tipo de evento, o total no intervalo [p_inicio, p_fim) —
-- sem nenhuma linha individual, nunca o user_id.
create or replace function public.resumo_analytics_local(
  p_local_id uuid,
  p_inicio timestamptz default now() - interval '30 days',
  p_fim timestamptz default now()
)
returns table (tipo public.tipo_evento_analytics, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    exists (select 1 from public.locais l where l.id = p_local_id and l.owner_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Sem permissão para ver as métricas deste local.';
  end if;

  return query
    select ea.tipo, count(*)::bigint as total
    from public.eventos_analytics ea
    where ea.local_id = p_local_id
      and ea.created_at >= p_inicio
      and ea.created_at < p_fim
    group by ea.tipo;
end;
$$;

grant execute on function public.resumo_analytics_local(uuid, timestamptz, timestamptz) to authenticated;

create index if not exists idx_eventos_analytics_local_tipo_created
  on public.eventos_analytics (local_id, tipo, created_at);

-- ============================================================================
-- FIM: 006_analytics_cliques_visualizacoes.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 007_storage_fotos_locais.sql
-- ============================================================================
-- ============================================================================
-- 007 — Bucket de Storage pra foto de capa dos locais (upload de arquivo
-- de verdade, substituindo o campo de link que existia desde a Rodada 16)
-- ============================================================================
-- Rodada 17. Convenção de caminho dentro do bucket: "<local_id>/<arquivo>"
-- (ex.: "aaaaaaaa-.../capa-1694900000000.jpg") — o primeiro segmento do
-- caminho É o id do local, e é nele que a RLS abaixo se apoia pra saber
-- quem pode escrever onde, com storage.foldername(name)[1].
--
-- Bucket público pra LEITURA (a foto precisa aparecer pro usuário final do
-- app sem exigir login), mas ESCRITA (insert/update/delete) só pro dono do
-- local ou admin — mesmo princípio de "locais_update_dono_ou_admin" em
-- 001_migrar_para_locais.sql, agora aplicado a arquivo em vez de linha.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('fotos-locais', 'fotos-locais', true)
on conflict (id) do nothing;

drop policy if exists "fotos_locais_select_publico" on storage.objects;
create policy "fotos_locais_select_publico"
  on storage.objects for select
  using (bucket_id = 'fotos-locais');

drop policy if exists "fotos_locais_insert_dono" on storage.objects;
create policy "fotos_locais_insert_dono"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "fotos_locais_update_dono" on storage.objects;
create policy "fotos_locais_update_dono"
  on storage.objects for update
  using (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "fotos_locais_delete_dono" on storage.objects;
create policy "fotos_locais_delete_dono"
  on storage.objects for delete
  using (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

-- ============================================================================
-- FIM: 007_storage_fotos_locais.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 008_vinculo_evento_e_gestao_lista_vip.sql
-- ============================================================================
-- ============================================================================
-- 008 — Vínculo de evento (organizador OU casa/local) + acesso do dono à
-- própria Lista VIP
-- ============================================================================
-- Contexto (Rodada 17 — pedido da Andrea de 09/09/2026: "sugira e faça
-- para o dono gerenciar a lista [VIP]").
--
-- O MESMO buraco que a 005 resolveu pros locais existe pros eventos:
-- `/cadastro/evento` é público e o trigger `enforce_evento_seguro_insert`
-- (001) força `criado_por := auth.uid()`, que fica NULL pra sempre num
-- cadastro anônimo. Sem `criado_por`, NENHUMA policy de `listas_vip` /
-- `listas_vip_solicitacoes` reconhecia o dono do evento — hoje só existe o
-- lado do usuário final pedindo pra entrar na lista; quem organiza não tem
-- como ver/aprovar ninguém.
--
-- Só que aqui tem uma diferença importante em relação a locais: evento tem
-- DOIS jeitos de "pertencer" a alguém —
--   (a) é de uma CASA/local que já tem dono no portal (local_id preenchido,
--       ex.: a Andrea cadastrou a festa de sábado do próprio bar dela) —
--       nesse caso o dono do LOCAL já devia conseguir gerenciar a lista VIP
--       do evento, sem precisar de aprovação nenhuma, porque o vínculo
--       "esse local é meu" já foi aprovado antes (005);
--   (b) é de um ORGANIZADOR independente sem local_id (ex.: um produtor que
--       cadastra uma festa itinerante) — aí não tem local com dono pra
--       herdar, e precisa do MESMO fluxo de solicitação+aprovação manual
--       que a 005 criou pra locais, agora pra eventos.
--
-- Esta migration cobre os dois: (PARTE 1) um helper único
-- `pode_gerenciar_evento()` que reconhece ambos os casos e é usado em toda
-- policy de evento/lista VIP; (PARTE 2) a tabela de solicitação de vínculo
-- pra cobrir o caso (b). Nada aqui remove permissão que já existia — só
-- adiciona quem também pode.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1 — Helper único de "quem pode gerenciar este evento" + policies
-- que passam a usá-lo.
-- ----------------------------------------------------------------------------

create or replace function public.pode_gerenciar_evento(p_evento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.eventos e
    left join public.locais l on l.id = e.local_id
    where e.id = p_evento_id
      and (
        e.criado_por = auth.uid()               -- quem cadastrou (logado)
        or l.owner_id = auth.uid()               -- dono do local/casa do evento
      )
  ) or public.is_admin();
$$;

comment on function public.pode_gerenciar_evento(uuid) is
  'Verdadeiro se o usuário logado pode gerenciar este evento — porque cadastrou (criado_por), ou porque é o dono aprovado do local/casa a que o evento está vinculado (locais.owner_id), ou porque é admin. Fonte única de verdade pra RLS de eventos/listas_vip/listas_vip_solicitacoes.';

-- Amplia (não reduz) o que já existia: dono do local do evento passa a ver
-- e editar o evento igual quem cadastrou, mesmo sem estar em criado_por.
drop policy if exists eventos_select_aprovados_ou_dono on public.eventos;
create policy eventos_select_aprovados_ou_dono
  on public.eventos for select
  using (status = 'aprovado' or public.pode_gerenciar_evento(id));

drop policy if exists eventos_update_dono_ou_admin on public.eventos;
create policy eventos_update_dono_ou_admin
  on public.eventos for update
  using (public.pode_gerenciar_evento(id))
  with check (public.pode_gerenciar_evento(id));

-- e_dono_da_lista_vip existe desde antes desta rodada e é usada também por
-- protect_status_listas_vip_solicitacoes (003/004) — mantém o NOME e a
-- assinatura pra não precisar recriar quem já a usa, só troca o miolo pra
-- delegar no helper novo.
create or replace function public.e_dono_da_lista_vip(p_lista_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pode_gerenciar_evento(lv.evento_id)
  from public.listas_vip lv
  where lv.id = p_lista_id;
$$;

drop policy if exists listas_vip_select on public.listas_vip;
create policy listas_vip_select
  on public.listas_vip for select
  using (
    (ativa and exists (
      select 1 from public.eventos e where e.id = listas_vip.evento_id and e.status = 'aprovado'
    ))
    or public.pode_gerenciar_evento(evento_id)
  );

drop policy if exists listas_vip_write_dono_ou_admin on public.listas_vip;
create policy listas_vip_write_dono_ou_admin
  on public.listas_vip
  using (public.pode_gerenciar_evento(evento_id))
  with check (public.pode_gerenciar_evento(evento_id));

-- listas_vip_solicitacoes_select/_update já delegavam em e_dono_da_lista_vip
-- (003/004) — herdam o novo comportamento automaticamente, sem precisar
-- recriar essas duas policies.

-- ----------------------------------------------------------------------------
-- PARTE 2 — Solicitação de vínculo pra ORGANIZADOR INDEPENDENTE (evento sem
-- local_id, ou com local_id de um local que ainda não é dele) — mesmo
-- desenho de solicitacoes_vinculo_local (005), agora pra evento.
-- ----------------------------------------------------------------------------

create table if not exists public.solicitacoes_vinculo_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mensagem text, -- ex.: "sou o produtor do evento, meu contato é (XX) ..."
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolvido_por uuid references public.profiles(id)
);

create unique index if not exists solicitacoes_vinculo_evento_pendente_unica
  on public.solicitacoes_vinculo_evento (evento_id, user_id)
  where status = 'pendente';

comment on table public.solicitacoes_vinculo_evento is
  'Pedido de um usuário logado pra vincular sua conta a um evento cadastrado anonimamente (/cadastro/evento) SEM dono ainda (criado_por nulo) — cobre o organizador independente que não tem local_id (ou cujo local ainda não é dele) pra herdar gestão automaticamente via pode_gerenciar_evento(). Aprovação sempre manual (admin).';

alter table public.solicitacoes_vinculo_evento enable row level security;

drop policy if exists solicitacoes_vinculo_evento_insert_propria on public.solicitacoes_vinculo_evento;
create policy solicitacoes_vinculo_evento_insert_propria
  on public.solicitacoes_vinculo_evento for insert
  with check (auth.uid() = user_id);

drop policy if exists solicitacoes_vinculo_evento_select_propria_ou_admin on public.solicitacoes_vinculo_evento;
create policy solicitacoes_vinculo_evento_select_propria_ou_admin
  on public.solicitacoes_vinculo_evento for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists solicitacoes_vinculo_evento_update_admin on public.solicitacoes_vinculo_evento;
create policy solicitacoes_vinculo_evento_update_admin
  on public.solicitacoes_vinculo_evento for update
  using (public.is_admin());

drop policy if exists solicitacoes_vinculo_evento_delete_propria_pendente on public.solicitacoes_vinculo_evento;
create policy solicitacoes_vinculo_evento_delete_propria_pendente
  on public.solicitacoes_vinculo_evento for delete
  using (auth.uid() = user_id and status = 'pendente');

-- Mesma lógica da 005: não deixa pedir vínculo de evento que já tem
-- criado_por, e reverte qualquer tentativa de auto-aprovação.
create or replace function public.validar_solicitacao_vinculo_evento()
returns trigger as $$
declare
  ja_tem_dono boolean;
begin
  select (criado_por is not null) into ja_tem_dono
  from public.eventos where id = new.evento_id;

  if ja_tem_dono then
    raise exception 'Este evento já tem um responsável vinculado.';
  end if;

  if tg_op = 'UPDATE' and not public.is_admin() then
    new.status := old.status;
    new.resolvido_em := old.resolvido_em;
    new.resolvido_por := old.resolvido_por;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists "1_valida_solicitacao_vinculo_evento" on public.solicitacoes_vinculo_evento;
create trigger "1_valida_solicitacao_vinculo_evento" before insert or update on public.solicitacoes_vinculo_evento
  for each row execute function public.validar_solicitacao_vinculo_evento();

create or replace function public.aplicar_vinculo_evento()
returns trigger as $$
begin
  if new.status = 'aprovado' and old.status is distinct from 'aprovado' then
    update public.eventos
      set criado_por = new.user_id
      where id = new.evento_id and criado_por is null;
    new.resolvido_em := now();
    new.resolvido_por := auth.uid();
  elsif new.status = 'rejeitado' and old.status is distinct from 'rejeitado' then
    new.resolvido_em := now();
    new.resolvido_por := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists "2_aplica_vinculo_evento" on public.solicitacoes_vinculo_evento;
create trigger "2_aplica_vinculo_evento" before update on public.solicitacoes_vinculo_evento
  for each row execute function public.aplicar_vinculo_evento();

create index if not exists solicitacoes_vinculo_evento_status_idx on public.solicitacoes_vinculo_evento (status);
create index if not exists idx_eventos_local_id on public.eventos (local_id);

-- ============================================================================
-- FIM: 008_vinculo_evento_e_gestao_lista_vip.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 009_upload_anonimo_cadastro_rapido.sql
-- ============================================================================
-- Complemento ao 007_storage_fotos_locais.sql, pro /cadastro/rapido (Round
-- 24): agora dá pra anexar foto do local ou arte da festa já no formulário
-- público, sem login. As policies de storage antigas só liberavam upload
-- pra quem já é owner_id do local — impossível nesse momento, já que o
-- registro acabou de nascer sem dono (owner_id/criado_por só é preenchido
-- na Etapa 2, depois de aprovado — ver 005_planos_comerciais_e_vinculo_local.sql).
--
-- Solução: liberar insert de arquivo também quando a linha ainda está
-- "pendente" e "sem dono" — exatamente o estado em que ela nasce no
-- cadastro público. Depois de aprovada e vinculada a uma conta (owner_id /
-- criado_por preenchido), essa liberação deixa de valer sozinha e passa a
-- valer a policy de dono/admin.

-- 1) fotos-locais: libera upload pro próprio local recém-criado, pendente
-- e sem dono.
drop policy if exists "fotos_locais_insert_pendente_anonimo" on storage.objects;
create policy "fotos_locais_insert_pendente_anonimo"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and l.owner_id is null
        and l.status = 'pendente'
    )
  );

-- 2) Novo bucket fotos-eventos (arte/flyer da festa) — mesmo modelo do
-- fotos-locais: leitura pública, escrita liberada pro evento pendente e
-- sem dono (cadastro público) e, depois, pro dono (criado_por) ou admin.
insert into storage.buckets (id, name, public)
values ('fotos-eventos', 'fotos-eventos', true)
on conflict (id) do nothing;

drop policy if exists "fotos_eventos_select_publico" on storage.objects;
create policy "fotos_eventos_select_publico"
  on storage.objects for select
  using (bucket_id = 'fotos-eventos');

drop policy if exists "fotos_eventos_insert_pendente_anonimo" on storage.objects;
create policy "fotos_eventos_insert_pendente_anonimo"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-eventos'
    and exists (
      select 1 from public.eventos e
      where e.id::text = (storage.foldername(name))[1]
        and e.criado_por is null
        and e.status = 'pendente'
    )
  );

drop policy if exists "fotos_eventos_insert_dono" on storage.objects;
create policy "fotos_eventos_insert_dono"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-eventos'
    and exists (
      select 1 from public.eventos e
      where e.id::text = (storage.foldername(name))[1]
        and (e.criado_por = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "fotos_eventos_update_dono" on storage.objects;
create policy "fotos_eventos_update_dono"
  on storage.objects for update
  using (
    bucket_id = 'fotos-eventos'
    and exists (
      select 1 from public.eventos e
      where e.id::text = (storage.foldername(name))[1]
        and (e.criado_por = auth.uid() or public.is_admin())
    )
  );

-- ============================================================================
-- FIM: 009_upload_anonimo_cadastro_rapido.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 010_preferencias_checkin_fidelidade_avaliacoes.sql
-- ============================================================================
-- ============================================================================
-- 010 — Preferência de público/experiência (personalização, não identidade),
-- check-in pra liberar cupom, fidelidade por visitas, e avaliação por
-- dimensões (Dicas Avalia)
-- ============================================================================
-- Contexto (Rodada 25 — pedido da Andrea, com o texto de um documento de
-- especificação próprio que ela trouxe pra revisão: "um passo pra trás e
-- ajustar isso no app, perfil B2B e cadastros"). Cobre 4 pedidos:
--
-- 1) Taxonomia de "predominância de público" nova e maior, usada em dois
--    lugares DIFERENTES que não devem ser confundidos:
--    (a) publico_tags em locais/eventos (já existia desde 001) — como o
--        PARCEIRO descreve o público do espaço/evento dele.
--    (b) preferencia_publico em profiles (NOVA) — como o USUÁRIO final
--        personaliza a própria descoberta no app. Por isso o enum
--        publico_tag ganha os valores novos (serve pros dois usos) e
--        profiles ganha uma coluna própria, nunca obrigatória, com o
--        texto de consentimento que a Andrea pediu ("não precisa
--        representar a identidade do usuário") reforçado no comentário.
--
-- 2) "Preferências de experiência" — um agrupamento de alto nível (Bares/
--    Festas/Estilo musical/Gastronomia/Cultura&Turismo/Serviços) pensado
--    pra uma tela de onboarding do app, ortogonal à taxonomia de 10
--    categorias já existente (categorias.ts no app) — por isso é um enum
--    NOVO (preferencia_experiencia), não um substituto de categoria_tipo.
--    O item "estilo musical" dessa lista citava "rock" e "forró", que
--    ainda não existiam no enum estilo_musical — adicionados aqui.
--
-- 3) Check-in — confirmado pela Andrea (Rodada 25): "a ideia é só o
--    usuário do app dar check-in pra usar o cupom de desconto no bar". É
--    uma feature NOVA (não tem relação com o sistema antigo de
--    check-in/pontos das Rodadas 1-8, que foi removido de propósito — ver
--    001_migrar_para_locais.sql). Desenhado com as regras antifraude que
--    ela pediu: código de validade curta (5 min), limite de 1 check-in por
--    usuário por local por 12h, bloqueio de reuso (unique + validado_em
--    trava depois de usado), registro de data/hora/local/geolocalização,
--    registro do método de validação, e cancelamento só por admin.
--    Quando o check-in está ligado a um cupom (cupom_id), validar o
--    check-in já resgata o cupom na mesma transação — reaproveitando o
--    cupons_resgatados e o enforce_limite_cupom que já existiam (001).
--
-- 4) Fidelidade — "contar visitas, mostrar progresso, liberar recompensas".
--    Construído SOBRE check-in (cada visita contada é um check-in
--    validado) em vez de duplicar contagem — programas_fidelidade é o que
--    a EMPRESA configura (recompensa, visitas necessárias, prazo, limite
--    por usuário), fidelidade_resgates é o registro de resgate.
--
-- 5) Avaliações por dimensão (Dicas Avalia) — a tabela avaliacoes (001) só
--    tinha 1 nota geral (1-5) + comentário. Adiciona 7 colunas opcionais
--    (uma por dimensão pedida: atendimento, acolhimento, custo-benefício,
--    produtos, ambiente, acessibilidade, segurança percebida) — a nota
--    geral existente continua sendo "experiência geral" e continua
--    sozinha controlando rating_media/rating_total (não muda o cálculo
--    que já existe). Também liga opcionalmente a avaliação ao check-in que
--    a originou (checkin_id), pra permitir "avaliar depois da visita".
--
-- Nada aqui remove ou renomeia o que já existe — é tudo aditivo (novos
-- valores de enum, novas colunas opcionais, novas tabelas). Testado do
-- zero (001 a 010) num Postgres local antes de entregar (check-in,
-- resgate de cupom, bloqueio de reuso, antifraude de 12h, fidelidade e
-- avaliação por dimensão, todos passaram).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1 — Enums existentes, valores novos
-- ----------------------------------------------------------------------------

alter type public.publico_tag add value if not exists 'nao_binario';
alter type public.publico_tag add value if not exists 'queer';
alter type public.publico_tag add value if not exists 'daddy';
alter type public.publico_tag add value if not exists 'leather';
alter type public.publico_tag add value if not exists 'drag';
alter type public.publico_tag add value if not exists 'misto_lgbt';
alter type public.publico_tag add value if not exists 'aliados';

alter type public.estilo_musical add value if not exists 'rock';
alter type public.estilo_musical add value if not exists 'forro';

-- ----------------------------------------------------------------------------
-- PARTE 2 — Preferências do USUÁRIO (personalização, não venue-tagging)
-- ----------------------------------------------------------------------------

do $$ begin
  create type public.preferencia_experiencia as enum (
    'vida_noturna',       -- Bares, baladas, restaurantes e cafés
    'festas_shows',       -- Festas, shows, shows drag e karaokê
    'estilo_musical',     -- Samba, sertanejo, pop, rock, eletrônico e forró (agrupador — o filtro fino continua em estilo_musical)
    'gastronomia_bar',    -- Comida de bar, drinks e cervejas
    'cultura_turismo',    -- Cultura, turismo e compras
    'servicos_bemestar'   -- Serviços, saúde, beleza e hospedagem
  );
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists preferencia_publico public.publico_tag[] not null default array['todos']::public.publico_tag[];

alter table public.profiles
  add column if not exists preferencia_experiencia public.preferencia_experiencia[] not null default '{}'::public.preferencia_experiencia[];

comment on column public.profiles.preferencia_publico is
  'Preferência do USUÁRIO pra personalizar a descoberta no app (não confundir com locais.publico_tags/eventos.publico_tags, que é como o PARCEIRO descreve o próprio espaço). Opcional, nunca obrigatória — serve só pra ordenar/filtrar recomendações, não representa nem expõe a identidade do usuário pra ninguém.';
comment on column public.profiles.preferencia_experiencia is
  'Agrupamento de alto nível dos tipos de experiência que o usuário mais gosta (onboarding do app), ortogonal à taxonomia de categorias (categorias.ts) — usado só pra personalizar a Home, não é um filtro rígido.';

-- ----------------------------------------------------------------------------
-- PARTE 3 — CHECK-IN (pra liberar cupom de desconto no bar)
-- ----------------------------------------------------------------------------

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  codigo text not null,
  metodo_validacao text not null default 'codigo' check (metodo_validacao in ('codigo', 'qr')),
  expira_em timestamptz not null,
  validado_em timestamptz,
  validado_por uuid references public.profiles(id) on delete set null,
  cupom_id uuid references public.cupons(id) on delete set null,
  lat double precision,
  lng double precision,
  localizacao_consentida boolean not null default false,
  cancelado_em timestamptz,
  cancelado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (codigo)
);

comment on table public.checkins is
  'Check-in do usuário num local, pra liberar o cupom vinculado (cupom_id) ou só registrar visita (fidelidade). Gera um código de validade curta que o ESTABELECIMENTO confere (validar_checkin) — não é o sistema antigo de check-in/pontos das Rodadas 1-8 (removido), é uma feature nova e mais simples.';

create or replace function public.enforce_checkin_seguro_insert()
returns trigger as $$
begin
  new.user_id := auth.uid();
  if new.user_id is null then
    raise exception 'Check-in exige um usuário autenticado.';
  end if;

  if new.cupom_id is not null and not exists (
    select 1 from public.cupons c
    where c.id = new.cupom_id and c.local_id = new.local_id and c.ativo
  ) then
    raise exception 'Este cupom não existe ou não pertence a este local.';
  end if;

  -- Antifraude: limite de 1 check-in por usuário por local dentro de 12h
  -- (evita gerar código em loop pra tentar "adivinhar" ou reusar).
  if exists (
    select 1 from public.checkins c
    where c.local_id = new.local_id
      and c.user_id = new.user_id
      and c.created_at > now() - interval '12 hours'
      and c.cancelado_em is null
  ) then
    raise exception 'Você já fez check-in nesse local nas últimas 12 horas.';
  end if;

  new.codigo := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  new.expira_em := now() + interval '5 minutes';
  new.validado_em := null;
  new.validado_por := null;
  new.cancelado_em := null;
  new.cancelado_por := null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_insert_checkins on public.checkins;
create trigger before_insert_checkins before insert on public.checkins
  for each row execute function public.enforce_checkin_seguro_insert();

alter table public.checkins enable row level security;

drop policy if exists "checkins_select_dono_ou_admin" on public.checkins;
create policy "checkins_select_dono_ou_admin" on public.checkins
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.locais l where l.id = checkins.local_id and l.owner_id = auth.uid())
  );

drop policy if exists "checkins_insert_autenticado" on public.checkins;
create policy "checkins_insert_autenticado" on public.checkins
  for insert with check (auth.uid() is not null);

-- Sem policy de update direta pra usuário/dono — validação e cancelamento
-- só acontecem via validar_checkin()/cancelar_checkin() (security definer,
-- checam permissão por dentro). Admin pode editar direto se precisar
-- corrigir algo manualmente.
drop policy if exists "checkins_update_admin" on public.checkins;
create policy "checkins_update_admin" on public.checkins
  for update using (public.is_admin()) with check (public.is_admin());

-- Validação pelo ESTABELECIMENTO (dono do local ou admin): confere o
-- código, marca como validado e, se o check-in estava ligado a um cupom,
-- já resgata o cupom na mesma chamada (reaproveita enforce_limite_cupom).
--
-- Rodada 45 — drop explícito antes do create or replace: se o tipo
-- composto "public.checkins" mudar de OID por qualquer motivo entre uma
-- execução e outra desta migration (ex.: a tabela ter sido recriada),
-- "create or replace function" recusa com "cannot change return type of
-- existing function" mesmo com a assinatura textual idêntica. Isso já
-- aconteceu de verdade (ver bug do rename sem guarda na 001). O drop
-- resolve de raiz, na fonte do próprio erro que o Postgres sugere.
drop function if exists public.validar_checkin(text);
create or replace function public.validar_checkin(p_codigo text)
returns public.checkins as $$
declare
  v_checkin public.checkins;
begin
  select * into v_checkin from public.checkins where codigo = upper(p_codigo) for update;

  if v_checkin is null then
    raise exception 'Código não encontrado.';
  end if;
  if not (
    exists (select 1 from public.locais l where l.id = v_checkin.local_id and l.owner_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Sem permissão para validar check-in deste local.';
  end if;
  if v_checkin.cancelado_em is not null then
    raise exception 'Este check-in foi cancelado.';
  end if;
  if v_checkin.validado_em is not null then
    raise exception 'Este código já foi usado.';
  end if;
  if v_checkin.expira_em < now() then
    raise exception 'Código expirado.';
  end if;

  update public.checkins
    set validado_em = now(), validado_por = auth.uid()
    where id = v_checkin.id
    returning * into v_checkin;

  if v_checkin.cupom_id is not null then
    insert into public.cupons_resgatados (cupom_id, user_id)
    values (v_checkin.cupom_id, v_checkin.user_id)
    on conflict (cupom_id, user_id) do nothing;
  end if;

  return v_checkin;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.validar_checkin(text) to authenticated;

-- Cancelamento administrativo (pedido explícito da Andrea na lista de
-- regras antifraude) — só admin, nunca o dono do local nem o usuário.
create or replace function public.cancelar_checkin(p_checkin_id uuid)
returns void as $$
begin
  if not public.is_admin() then
    raise exception 'Só um administrador pode cancelar um check-in.';
  end if;
  update public.checkins
    set cancelado_em = now(), cancelado_por = auth.uid()
    where id = p_checkin_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cancelar_checkin(uuid) to authenticated;

create index if not exists idx_checkins_local on public.checkins (local_id);
create index if not exists idx_checkins_user on public.checkins (user_id);
create index if not exists idx_checkins_codigo on public.checkins (codigo);

-- ----------------------------------------------------------------------------
-- PARTE 4 — FIDELIDADE (visitas -> recompensa), construída sobre check-in
-- ----------------------------------------------------------------------------

create table if not exists public.programas_fidelidade (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  nome text not null,
  descricao text,
  visitas_necessarias integer not null check (visitas_necessarias > 0),
  recompensa text not null,
  valido_de date,
  valido_ate date,
  limite_por_usuario integer check (limite_por_usuario is null or limite_por_usuario > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.programas_fidelidade is
  'Programa de fidelidade configurado pelo PARCEIRO (nome, descrição, quantas visitas, recompensa, prazo, limite de resgates por usuário). O progresso do usuário é sempre calculado a partir de checkins validados (contar_visitas_fidelidade), nunca guardado numa coluna separada — mesmo princípio de vagas_ocupadas em listas_vip (recontagem, nunca incremento manual).';

create table if not exists public.fidelidade_resgates (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.programas_fidelidade(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkins_contados integer not null,
  resgatado_em timestamptz not null default now(),
  validado_por uuid references public.profiles(id) on delete set null
);

alter table public.programas_fidelidade enable row level security;
alter table public.fidelidade_resgates enable row level security;

drop policy if exists "programas_fidelidade_select_ativo_ou_dono" on public.programas_fidelidade;
create policy "programas_fidelidade_select_ativo_ou_dono" on public.programas_fidelidade
  for select using (
    ativo = true
    or exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "programas_fidelidade_write_dono_ou_admin" on public.programas_fidelidade;
create policy "programas_fidelidade_write_dono_ou_admin" on public.programas_fidelidade
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "fidelidade_resgates_select_dono_ou_admin" on public.fidelidade_resgates;
create policy "fidelidade_resgates_select_dono_ou_admin" on public.fidelidade_resgates
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.programas_fidelidade pf
      join public.locais l on l.id = pf.local_id
      where pf.id = programa_id and l.owner_id = auth.uid()
    )
  );

-- Sem policy de insert direta — só via resgatar_fidelidade() (abaixo),
-- que valida elegibilidade por dentro antes de gravar.
drop policy if exists "fidelidade_resgates_insert_admin" on public.fidelidade_resgates;
create policy "fidelidade_resgates_insert_admin" on public.fidelidade_resgates
  for insert with check (public.is_admin());

-- Quantas visitas VÁLIDAS (checkins validados, não cancelados) esse
-- usuário já fez nesse local desde o último resgate (ou desde a criação
-- do programa, se nunca resgatou) — é a base de "progresso" mostrada no
-- app.
create or replace function public.contar_visitas_fidelidade(p_programa_id uuid, p_user_id uuid)
returns integer as $$
  select count(*)::integer
  from public.checkins c
  join public.programas_fidelidade p on p.id = p_programa_id
  where c.local_id = p.local_id
    and c.user_id = p_user_id
    and c.validado_em is not null
    and c.cancelado_em is null
    and c.created_at > coalesce(
      (select max(fr.resgatado_em) from public.fidelidade_resgates fr
        where fr.programa_id = p_programa_id and fr.user_id = p_user_id),
      p.created_at::timestamptz
    );
$$ language sql stable security definer set search_path = public;

grant execute on function public.contar_visitas_fidelidade(uuid, uuid) to authenticated;

-- Resgate (liberação da recompensa), chamado pelo ESTABELECIMENTO (dono
-- do local ou admin) quando o usuário mostra que bateu a meta — confere
-- de novo no servidor pra não confiar só no que o app mostrou na tela.
-- Drop explícito antes do create or replace pelo mesmo motivo do
-- validar_checkin acima (mesma classe de erro do Postgres, mesma defesa).
drop function if exists public.resgatar_fidelidade(uuid, uuid);
create or replace function public.resgatar_fidelidade(p_programa_id uuid, p_user_id uuid)
returns public.fidelidade_resgates as $$
declare
  v_programa public.programas_fidelidade;
  v_visitas integer;
  v_resgates_existentes integer;
  v_resgate public.fidelidade_resgates;
begin
  select * into v_programa from public.programas_fidelidade where id = p_programa_id;
  if v_programa is null then
    raise exception 'Programa de fidelidade não encontrado.';
  end if;

  if not (
    exists (select 1 from public.locais l where l.id = v_programa.local_id and l.owner_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Sem permissão para resgatar fidelidade deste local.';
  end if;

  if not v_programa.ativo then
    raise exception 'Este programa de fidelidade não está mais ativo.';
  end if;
  if v_programa.valido_de is not null and current_date < v_programa.valido_de then
    raise exception 'Este programa de fidelidade ainda não começou.';
  end if;
  if v_programa.valido_ate is not null and current_date > v_programa.valido_ate then
    raise exception 'Este programa de fidelidade já encerrou.';
  end if;

  if v_programa.limite_por_usuario is not null then
    select count(*) into v_resgates_existentes
    from public.fidelidade_resgates where programa_id = p_programa_id and user_id = p_user_id;
    if v_resgates_existentes >= v_programa.limite_por_usuario then
      raise exception 'Este usuário já atingiu o limite de resgates deste programa.';
    end if;
  end if;

  v_visitas := public.contar_visitas_fidelidade(p_programa_id, p_user_id);
  if v_visitas < v_programa.visitas_necessarias then
    raise exception 'Ainda faltam % visita(s) pra liberar essa recompensa.', (v_programa.visitas_necessarias - v_visitas);
  end if;

  insert into public.fidelidade_resgates (programa_id, user_id, checkins_contados, validado_por)
  values (p_programa_id, p_user_id, v_visitas, auth.uid())
  returning * into v_resgate;

  return v_resgate;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.resgatar_fidelidade(uuid, uuid) to authenticated;

create index if not exists idx_programas_fidelidade_local on public.programas_fidelidade (local_id);
create index if not exists idx_fidelidade_resgates_programa_user on public.fidelidade_resgates (programa_id, user_id);

-- ----------------------------------------------------------------------------
-- PARTE 5 — AVALIAÇÕES POR DIMENSÃO (Dicas Avalia)
-- ----------------------------------------------------------------------------
-- "nota" (já existente, 1-5, obrigatória) continua sendo a "Experiência
-- geral" e continua sozinha controlando locais.rating_media/rating_total
-- (recalcular_rating_local, 001) — as 7 dimensões abaixo são aditivas e
-- opcionais, pra não quebrar nenhuma avaliação já existente nem mudar a
-- média que já é exibida hoje.

alter table public.avaliacoes
  add column if not exists atendimento smallint check (atendimento between 1 and 5),
  add column if not exists acolhimento smallint check (acolhimento between 1 and 5),
  add column if not exists custo_beneficio smallint check (custo_beneficio between 1 and 5),
  add column if not exists produtos smallint check (produtos between 1 and 5),
  add column if not exists ambiente smallint check (ambiente between 1 and 5),
  add column if not exists acessibilidade smallint check (acessibilidade between 1 and 5),
  add column if not exists seguranca_percebida smallint check (seguranca_percebida between 1 and 5),
  add column if not exists checkin_id uuid references public.checkins(id) on delete set null;

comment on column public.avaliacoes.nota is 'Experiência geral (1-5) — obrigatória, é a única que entra no cálculo de rating_media/rating_total do local.';
comment on column public.avaliacoes.checkin_id is 'Check-in que originou esta avaliação, se o usuário avaliou logo depois de visitar (opcional — dá pra avaliar sem ter feito check-in também).';

-- ============================================================================
-- FIM: 010_preferencias_checkin_fidelidade_avaliacoes.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 011_grants_anon_authenticated.sql
-- ============================================================================
-- Corrige uma lacuna encontrada só agora, no primeiro teste real de
-- cadastro anônimo em produção: as tabelas do schema public nunca
-- receberam o GRANT de nível de tabela pros papéis anon/authenticated
-- (o "permission denied for table locais", Postgres 42501/42501, que
-- aparece ANTES de qualquer política de RLS ser avaliada). O Supabase
-- normalmente concede isso automaticamente em projetos novos; neste
-- projeto isso não estava presente, provavelmente por causa do sistema
-- de chaves novo (sb_publishable_/sb_secret_) usado desde o início aqui.
--
-- Este grant é seguro: ele só libera a checagem de nível de TABELA, que
-- vem antes da RLS. A RLS (já testada em todas as rodadas anteriores)
-- continua sendo a proteção real linha a linha — sem ela, ninguém
-- anônimo conseguiria ver/gravar nada mesmo com este grant.
--
-- Deliberadamente NÃO aplicado nas tabelas "_legacy_*" (arquitetura
-- antiga, quarentenada desde a Rodada 9) — essas não têm RLS
-- reconfigurada, então dar grant nelas exporia os dados sem proteção
-- nenhuma.

grant usage on schema public to anon, authenticated;

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not like '\_legacy\_%'
  loop
    execute format(
      'grant select, insert, update, delete on table public.%I to anon, authenticated',
      r.tablename
    );
  end loop;
end $$;

-- Garante que qualquer tabela nova criada depois (por este mesmo usuário,
-- via SQL Editor) já nasça com o grant certo, sem precisar lembrar de
-- repetir este passo em toda migration futura.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

-- ============================================================================
-- FIM: 011_grants_anon_authenticated.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 012_aprovacao_gera_login_automatico.sql
-- ============================================================================
-- Pedido da Andrea depois de testar o fluxo antigo de aprovação: pedir
-- e-mail no cadastro (que o bar não usa no dia a dia) e depois fazer o
-- parceiro preencher o CNPJ de novo em /vincular ficou confuso ("preencher
-- duas vezes"). A partir de agora, aprovar um local no /admin já cria a
-- conta de login do parceiro automaticamente, usando o WhatsApp que ele
-- já informou no próprio cadastro (nunca precisa de e-mail) e uma senha
-- gerada na hora — sem precisar de /vincular pra esse fluxo.
--
-- Criar uma conta de autenticação (supabase.auth.admin.createUser) só é
-- possível a partir do servidor, com a service_role key — chave que nunca
-- é exposta no navegador (fica só numa variável de ambiente do lado do
-- servidor no Vercel). Como a aprovação grava status/owner_id na mesma
-- chamada, ela bate no mesmo gatilho de proteção que reverte edições sem
-- uma sessão de admin reconhecida (o motivo exato do "aprovar no Table
-- Editor do Supabase volta pra pendente" que a Andrea encontrou). A
-- service_role key já é, por natureza, tão confiável quanto um admin
-- logado (só existe no servidor) — então este ajuste libera ela também,
-- ao lado do is_admin() que já existia.

create or replace function public.protect_admin_fields_locais()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status := old.status;
    new.safe_space := old.safe_space;
    new.plano_destaque := old.plano_destaque;
    new.destaque_ate := old.destaque_ate;
    new.owner_id := old.owner_id;
    new.rating_media := old.rating_media;
    new.rating_total := old.rating_total;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- FIM: 012_aprovacao_gera_login_automatico.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 013_grants_service_role.sql
-- ============================================================================
-- Achado no mesmo dia da migration 011: a mesma lacuna de GRANT de nível
-- de tabela que afetava anon/authenticated também afeta service_role
-- (a chave "secret" usada pela rota /api/aprovar-local, Rodada 22) — o
-- erro "permission denied for table profiles" (Postgres 42501) confirma.
-- Num projeto Supabase criado do jeito padrão, service_role já vem com
-- acesso total a tudo em public por bootstrap automático da plataforma;
-- este projeto nunca recebeu esse bootstrap (mesma causa-raiz da 011).
--
-- service_role já é, por natureza, uma chave 100% confiável — só existe
-- no servidor, nunca no navegador — então não há necessidade de excluir
-- as tabelas "_legacy_*" aqui como a 011 fez para anon/authenticated: dar
-- acesso total a service_role nessas tabelas antigas não expõe nada a
-- usuário nenhum (RLS nem entra em jogo pra este papel).

grant usage on schema public to service_role;

do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('grant all privileges on table public.%I to service_role', r.tablename);
  end loop;
end $$;

grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

-- ============================================================================
-- FIM: 013_grants_service_role.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 014_tags_experiencia_locais.sql
-- ============================================================================
-- Rodada 24 — tags de experiência escolhidas pelo próprio parceiro no
-- portal ("Pet Friendly", "Parklet", "Aniversário", etc. — mesma lista de
-- chips "Escolha pela experiência" da Home do app, ver
-- src/app/(tabs)/index.tsx) + tags livres digitadas por ele. Não é a
-- mesma coisa que `publico_tags` (RLS/filtro de público real) — essa aqui
-- é descritiva, mostrada no perfil do local e usada como tag de
-- destaque/venda dos planos (ver /planos: "3 tags — Top 5" no Premium).
--
-- Coluna aberta (mesmo padrão de `publico_tags`/`descricao`/`fotos`
-- desde a Rodada 16): a RLS `locais_update_dono_ou_admin` já deixa o
-- dono escrever qualquer coluna fora da lista travada por
-- `protect_admin_fields_locais` (status/safe_space/plano_destaque/...),
-- então não precisa de trigger novo pra permitir a escrita. O limite de
-- quantidade por plano (3 tags no Premium/Fundador, 0 nos demais — como
-- já promete `/planos`) é aplicado só na tela do portal, não no banco —
-- mesmo grau de confiança já usado hoje pro limite de cupons por plano
-- (nenhum dos dois é travado por RLS/trigger; ver Rodada 16). Se um dia
-- quiser travar isso de verdade no banco, é um trigger pequeno a mais,
-- comparando array_length(new.tags,1) contra o plano/status atual.

alter table public.locais
  add column if not exists tags text[] not null default '{}'::text[];

-- ============================================================================
-- FIM: 014_tags_experiencia_locais.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 015_contato_organizador_eventos.sql
-- ============================================================================
-- Rodada 26 — pedido da Andrea: aprovar evento/festa também deve gerar um
-- convite/aviso por WhatsApp pro organizador, igual já existe pra `locais`
-- desde a Rodada 22/23. Pré-requisito identificado na Rodada 25: `eventos`
-- nunca teve coluna própria de contato — o WhatsApp do organizador vinha
-- só embutido como texto solto dentro de `descricao` ("Contato: nome —
-- whatsapp"), o que é frágil pra qualquer automação ler de volta.
--
-- Colunas abertas (mesmo padrão de publico_tags/tags/descrição — a RLS
-- eventos_insert_qualquer_um / eventos_update_dono_ou_admin já cobre,
-- sem precisar de trigger novo).

alter table public.eventos
  add column if not exists contato_nome text,
  add column if not exists contato_whatsapp text;

comment on column public.eventos.contato_nome is 'Nome de quem cadastrou o evento — pra admin saber com quem falar na aprovação.';
comment on column public.eventos.contato_whatsapp is 'WhatsApp de quem cadastrou o evento — usado no aviso automático de aprovação (Rodada 26). Formato livre digitado no cadastro; normalizado só na hora de montar o link wa.me.';

-- ============================================================================
-- FIM: 015_contato_organizador_eventos.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 016_fix_owner_id_orfao.sql
-- ============================================================================
-- Rodada 32 -- bug real reportado pela Andrea: cadastro anonimo em
-- /cadastro/rapido deu "insert or update on table \"locais\" violates
-- foreign key constraint \"locais_owner_id_fkey\"".
--
-- Causa: o trigger `enforce_local_seguro_insert()` (001_migrar_para_locais.sql)
-- forca `new.owner_id := auth.uid();` em TODO insert, sem checar se esse
-- auth.uid() tem mesmo uma linha correspondente em `public.profiles`. Isso
-- funciona quando quem esta cadastrando esta de fato deslogado (auth.uid()
-- e null, e null nunca viola foreign key) ou logado com uma conta cujo
-- profile existe -- mas quebra se o navegador tiver uma sessao "orfa"
-- guardada (um token de login antigo, ainda valido, de uma conta cujo
-- profile foi apagado depois, por exemplo limpeza manual de dado de teste
-- direto no Table Editor) -- nesse caso auth.uid() devolve um uuid de
-- verdade, so que sem par em profiles, e o insert trava.
--
-- Fix: em vez de confiar cegamente em auth.uid(), so usar esse valor como
-- owner_id se ele realmente existir em profiles -- senao, cai pra null
-- (equivalente a cadastro anonimo, nunca trava o cadastro por causa de
-- uma sessao orfa). Aditivo: substitui so o corpo da funcao, o trigger
-- que ja existe continua apontando pro mesmo nome, nao precisa recriar.

create or replace function public.enforce_local_seguro_insert()
returns trigger as $$
begin
  new.status := 'pendente';
  new.safe_space := false;
  new.plano_destaque := 'basico';
  new.destaque_ate := null;
  new.owner_id := (select id from public.profiles where id = auth.uid());
  new.rating_media := 0;
  new.rating_total := 0;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- FIM: 016_fix_owner_id_orfao.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 017_fix_returning_rls_cadastro_rapido.sql
-- ============================================================================
-- ============================================================================
-- 017 - Corrige "new row violates row-level security policy for table
-- locais/eventos" no /cadastro/rapido (aditivo, nao recria nada existente)
-- ============================================================================
-- Contexto: depois da 016 corrigir o erro de FK (owner_id orfao), o
-- /cadastro/rapido passou a bater num segundo problema, mais sutil: o
-- codigo do portal faz `.insert({...}).select('id').single()` pra pegar o
-- id da linha recem-criada (precisa dele pra depois anexar a foto). Esse
-- `.select()` faz o Postgres pedir o RETURNING da linha inserida - e pra
-- devolver essa linha, o Postgres tambem precisa que ela passe pela
-- POLICY DE SELECT da tabela, nao so pela de insert. A policy de select
-- (`locais_select_aprovados_ou_dono`) so permite ver linhas aprovadas, ou
-- a propria (dono = auth.uid()), ou admin - uma linha recem-criada por um
-- visitante anonimo (pendente, owner_id nulo, auth.uid() nulo) nao bate em
-- nenhuma das tres, entao o Postgres recusa devolver a linha e o
-- supabase-js reporta isso como "new row violates row-level security
-- policy" (mesma frase do erro de insert, mas a causa aqui e o RETURNING,
-- nao o INSERT em si - o INSERT sempre foi permitido, `with check (true)`).
--
-- Esse buraco e antigo (existe desde a Rodada 9) mas so apareceu agora
-- porque, antes da 016, o cadastro de sessao orfa nunca chegava a esse
-- ponto - travava antes, no erro de FK. Corrigido o FK, o cadastro
-- anonimo "de verdade" (sem sessao nenhuma) passou a completar o INSERT e
-- bater direto nesse segundo problema.
--
-- Solucao: 2 funcoes SECURITY DEFINER por tabela (locais/eventos), que
-- fazem o insert/update por dentro do banco (sem depender do RETURNING
-- do cliente bater a policy de select) - os triggers de sempre
-- (enforce_*_seguro_insert) continuam rodando normalmente e continuam
-- sendo a unica fonte de verdade pra status/owner_id/plano_destaque etc.,
-- entao isso nao abre nenhuma porta nova: so contorna a exigencia de
-- SELECT que o RETURNING impoe. A funcao de foto e deliberadamente
-- restrita a linhas ainda pendentes E ainda sem dono (`status = 'pendente'
-- and owner_id/criado_por is null`) - ou seja, so funciona na mesma janela
-- em que o cadastro rapido anonimo ja podia editar livremente; depois de
-- aprovado ou vinculado a uma conta, essa porta se fecha sozinha.
--
-- Testado localmente (Postgres 16, RLS real simulada com role
-- nao-superusuario): anonimo cria local/evento e recebe o id de volta;
-- anonimo anexa foto no proprio cadastro ainda pendente; depois que um
-- admin de verdade aprova e vincula um dono, uma segunda tentativa de
-- trocar a foto pelo mesmo caminho e corretamente recusada (confirmado
-- que a foto legitima anterior nao e sobrescrita); reaplicacao do arquivo
-- duas vezes seguidas sem erro.
-- ============================================================================

create or replace function public.cadastro_rapido_criar_local(
  p_nome text,
  p_categoria text,
  p_cnpj text,
  p_contato_telefone text,
  p_instagram text,
  p_bairro text,
  p_cidade text,
  p_lat double precision,
  p_lng double precision,
  p_publico_tags text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.locais (
    nome, categoria, cnpj, contato_telefone, instagram,
    bairro, cidade, lat, lng, publico_tags
  ) values (
    p_nome,
    p_categoria::public.categoria_tipo,
    p_cnpj,
    p_contato_telefone,
    p_instagram,
    p_bairro,
    coalesce(p_cidade, 'São Paulo'),
    p_lat,
    p_lng,
    coalesce(p_publico_tags, array['todos'])::public.publico_tag[]
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.cadastro_rapido_criar_local(
  text, text, text, text, text, text, text, double precision, double precision, text[]
) to anon, authenticated;

create or replace function public.cadastro_rapido_definir_foto_local(
  p_id uuid,
  p_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.locais
    set foto_capa_url = p_url
    where id = p_id
      and status = 'pendente'
      and owner_id is null;

  return found;
end;
$$;

grant execute on function public.cadastro_rapido_definir_foto_local(uuid, text) to anon, authenticated;

create or replace function public.cadastro_rapido_criar_evento(
  p_titulo text,
  p_descricao text,
  p_data_inicio timestamptz,
  p_estilos_musicais text[],
  p_publico_tags text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.eventos (
    titulo, descricao, data_inicio, estilos_musicais, publico_tags
  ) values (
    p_titulo,
    p_descricao,
    p_data_inicio,
    coalesce(p_estilos_musicais, array[]::text[])::public.estilo_musical[],
    coalesce(p_publico_tags, array['todos'])::public.publico_tag[]
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.cadastro_rapido_criar_evento(
  text, text, timestamptz, text[], text[]
) to anon, authenticated;

create or replace function public.cadastro_rapido_definir_foto_evento(
  p_id uuid,
  p_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.eventos
    set foto_capa_url = p_url
    where id = p_id
      and status = 'pendente'
      and criado_por is null;

  return found;
end;
$$;

grant execute on function public.cadastro_rapido_definir_foto_evento(uuid, text) to anon, authenticated;

-- ============================================================================
-- FIM: 017_fix_returning_rls_cadastro_rapido.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 018_fix_storage_rls_cadastro_rapido.sql
-- ============================================================================
-- ============================================================================
-- 018 - Corrige o MESMO tipo de erro ("new row violates row-level security
-- policy"), agora no upload da FOTO em si (Storage), nao na tabela
-- ============================================================================
-- Contexto: a 017 corrigiu o problema no INSERT da linha em locais/eventos
-- (RETURNING exigindo policy de SELECT). Depois de aplicar a 017 e
-- redeployar, o cadastro anonimo passou dessa etapa, mas o UPLOAD DA FOTO
-- (que o navegador faz direto pro Supabase Storage, via
-- `supabase.storage.from(...).upload(...)`) comecou a bater no mesmo tipo
-- de erro - so que dessa vez vindo da API de Storage, que mostra uma
-- versao mais generica da mensagem (sem o nome da tabela).
--
-- Causa raiz (mesmo mecanismo da 017, num lugar diferente): as policies
-- `fotos_locais_insert_pendente_anonimo`/`fotos_eventos_insert_pendente_anonimo`
-- (009_upload_anonimo_cadastro_rapido.sql) liberam o upload verificando,
-- dentro do proprio WITH CHECK, se o local/evento daquela pasta esta
-- "pendente e sem dono" - so que esse `exists (select 1 from public.locais
-- ...)` roda com o mesmo papel (anon) que esta tentando subir o arquivo, e
-- por isso passa pela policy de SELECT de `locais`/`eventos`
-- (`locais_select_aprovados_ou_dono`), que nunca deixa um anonimo VER uma
-- linha pendente/sem dono. Resultado: a condicao do WITH CHECK nunca bate
-- pra ninguem anonimo, mesmo quando o local E de fato pendente e sem dono
-- (testado e confirmado localmente antes de corrigir).
--
-- Solucao: mover essa verificacao pra dentro de uma funcao SECURITY
-- DEFINER (mesmo princicpio da 017) - ela faz a mesma pergunta ("esse
-- local/evento esta pendente e sem dono?"), mas por dentro do banco, sem
-- depender da policy de SELECT do papel que esta chamando. As policies
-- passam a chamar essa funcao em vez de repetir o EXISTS direto.
--
-- Testado localmente: o EXISTS direto (como as policies faziam antes)
-- confirmado retornando falso pra um local recem-criado, pendente e sem
-- dono, quando avaliado como o papel anonimo (reproduz o bug); a funcao
-- nova, chamada pelo mesmo papel, retorna verdadeiro pra esse mesmo caso.
-- Testado tambem o upload de verdade num mock de storage.objects: anonimo
-- consegue subir foto pro proprio cadastro pendente/sem dono; a mesma
-- tentativa pra um local JA aprovado/com dono e corretamente recusada.
-- ============================================================================

create or replace function public.local_pendente_sem_dono(p_local_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.locais l
    where l.id::text = p_local_id
      and l.owner_id is null
      and l.status = 'pendente'
  );
$$;

grant execute on function public.local_pendente_sem_dono(text) to anon, authenticated;

create or replace function public.evento_pendente_sem_dono(p_evento_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.eventos e
    where e.id::text = p_evento_id
      and e.criado_por is null
      and e.status = 'pendente'
  );
$$;

grant execute on function public.evento_pendente_sem_dono(text) to anon, authenticated;

drop policy if exists "fotos_locais_insert_pendente_anonimo" on storage.objects;
create policy "fotos_locais_insert_pendente_anonimo"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-locais'
    and public.local_pendente_sem_dono((storage.foldername(name))[1])
  );

drop policy if exists "fotos_eventos_insert_pendente_anonimo" on storage.objects;
create policy "fotos_eventos_insert_pendente_anonimo"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-eventos'
    and public.evento_pendente_sem_dono((storage.foldername(name))[1])
  );

-- ============================================================================
-- FIM: 018_fix_storage_rls_cadastro_rapido.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 019_fix_owner_id_orfao_aprovacao.sql
-- ============================================================================
-- ============================================================================
-- 019 -- Corrige de novo "insert or update on table locais violates foreign
-- key constraint locais_owner_id_fkey", agora no UPDATE da APROVACAO (nao no
-- INSERT do cadastro, que a 016 ja tinha corrigido)
-- ============================================================================
-- Contexto: a 016 corrigiu esse erro no INSERT (quando o navegador tem uma
-- sessao "orfa" -- token de login antigo de uma conta cujo profile foi
-- apagado depois, por exemplo limpeza manual de teste direto no Table
-- Editor). O MESMO tipo de orfandade apareceu agora num lugar diferente:
-- api/aprovar-local/route.ts, ao aprovar a Vezpa Bar, tentou vincular o
-- local a conta do parceiro (locais.owner_id = profiles.id) usando um
-- userId de auth.users que, nesse momento, nao tinha mais linha
-- correspondente em profiles -- e o UPDATE travou com esse erro.
--
-- Reproduzido localmente antes de corrigir: um profile apagado manualmente
-- (a conta de auth.users continua existindo -- so a linha de profiles some,
-- porque nao ha cascade nesse sentido) faz qualquer UPDATE que tente gravar
-- esse id em locais.owner_id quebrar com foreign key violation, mesmo
-- rodando com a service_role key.
--
-- Duas partes, as duas aditivas:
--
-- 1) Backfill -- conserta o que JA ficou inconsistente: cria a linha de
--    profiles que falta pra qualquer conta de auth.users que nao tenha uma
--    hoje, usando os mesmos dados que o gatilho handle_new_user (001) usa
--    num cadastro novo. "on conflict do nothing" garante que quem ja tem
--    profile nao e tocado (nem o role, nem nenhum outro campo).
--
-- 2) Reforco no gatilho de proteção de UPDATE de locais (mesmo espirito da
--    016, so que pro lado do update): se algum dia um owner_id sem par em
--    profiles tentar ser gravado -- por QUALQUER caminho, nao so a rota de
--    aprovacao -- a operacao nao quebra mais com erro de foreign key, so
--    mantem o owner_id anterior. Isso e uma rede de seguranca (evita o
--    crash), nao o conserto do vinculo em si -- o conserto de verdade pra
--    esse caso e o ajuste feito em api/aprovar-local/route.ts (cria o
--    profile que falta ANTES de vincular como owner_id, entao o vinculo
--    novo sempre vinga, em vez de silenciosamente ficar com o antigo).
-- ============================================================================

insert into public.profiles (id, full_name, social_name, phone, birth_date, avatar_url)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(coalesce(au.email,''), '@', 1)),
  au.raw_user_meta_data->>'social_name',
  au.raw_user_meta_data->>'phone',
  nullif(au.raw_user_meta_data->>'birth_date', '')::date,
  au.raw_user_meta_data->>'avatar_url'
from auth.users au
where not exists (select 1 from public.profiles p where p.id = au.id)
on conflict (id) do nothing;

create or replace function public.protect_admin_fields_locais()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status := old.status;
    new.safe_space := old.safe_space;
    new.plano_destaque := old.plano_destaque;
    new.destaque_ate := old.destaque_ate;
    new.owner_id := old.owner_id;
    new.rating_media := old.rating_media;
    new.rating_total := old.rating_total;
  end if;

  if new.owner_id is not null and not exists (select 1 from public.profiles where id = new.owner_id) then
    new.owner_id := old.owner_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- FIM: 019_fix_owner_id_orfao_aprovacao.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 020_horario_funcionamento_galeria_e_fix_foto_evento.sql
-- ============================================================================
-- ============================================================================
-- 020 — Horário de funcionamento (+ música ao vivo) em locais, galeria de
-- fotos + link de vídeo pra locais premium, e correção de RLS: dono do
-- LOCAL também pode subir foto das festas do próprio espaço
-- ============================================================================
-- Pedido da Andrea (16/09/2026): (1) horário de funcionamento no cadastro
-- rápido, com todos os dias da semana (aberto/fechado + horário inicial e
-- final) e um campo opcional de início da música ao vivo; (2) "pensar que
-- dentro do portal tanto as festas quanto os locais podem atualizar fotos"
-- — investigação achou uma lacuna real: a policy de Storage que libera
-- upload de foto de evento (`fotos_eventos_insert_dono`/`update_dono`,
-- migration 009) só reconhecia `criado_por = auth.uid()`, nunca o dono do
-- LOCAL da festa (que já pode editar o evento inteiro via
-- `pode_gerenciar_evento()`, desde a 008) — ou seja, o dono de um bar
-- conseguia editar o texto da própria festa mas não a foto dela; (3)
-- "locais premium... carrossel de fotos e até vídeos" — implementado como
-- várias fotos (`galeria_fotos`) + um link de vídeo (Instagram/YouTube,
-- sem upload de arquivo — decisão da Andrea, evita custo de armazenamento
-- de vídeo no Storage).
--
-- Tudo aditivo: nenhuma coluna/policy existente é removida.
-- ============================================================================

-- 1) Horário de funcionamento. Formato: um objeto por dia da semana
-- (chaves fixas em português, sem acento, pra bater com o que o código do
-- portal grava/lê), cada um {aberto, abre, fecha, musica_ao_vivo} — os 3
-- últimos só fazem sentido quando aberto=true, mas ficam nulos/vazios
-- sem problema quando aberto=false. Exemplo de uma linha:
-- {"sexta": {"aberto": true, "abre": "18:00", "fecha": "02:00", "musica_ao_vivo": "22:00"}, "domingo": {"aberto": false}}
alter table public.locais
  add column if not exists horario_funcionamento jsonb not null default '{}'::jsonb;

comment on column public.locais.horario_funcionamento is
  'Horário de funcionamento por dia da semana: {"<dia>": {"aberto": bool, "abre": "HH:MM", "fecha": "HH:MM", "musica_ao_vivo": "HH:MM"|null}}. Dias ausentes = não informado (não confundir com fechado). Editável pelo dono, mesma RLS de locais_update_dono_ou_admin — sem trigger novo.';

-- 2) Galeria de fotos + link de vídeo (carrossel pra locais premium).
-- Colunas abertas, mesmo padrão de `tags`/`descricao` (Rodada 24/16) — o
-- limite de quantidade/quem tem direito (plano premium/fundador) é
-- aplicado só na tela do portal, não travado no banco (mesmo grau de
-- confiança já usado hoje pro limite de tags e de cupons por plano).
alter table public.locais
  add column if not exists galeria_fotos text[] not null default '{}'::text[];

alter table public.locais
  add column if not exists video_url text;

comment on column public.locais.galeria_fotos is
  'Fotos extras além de foto_capa_url, pra carrossel no perfil do local (pensado pra planos premium/fundador — limite aplicado na tela do portal, não aqui).';
comment on column public.locais.video_url is
  'Link de vídeo (Instagram/Reels/YouTube) pra embutir no perfil do local — não é upload de arquivo, é só a URL.';

-- 3) Fix de RLS: dono do LOCAL da festa também pode subir/trocar a foto
-- do evento, não só quem cadastrou (criado_por). Mesmo helper que já
-- governa a edição do próprio evento desde a 008 — nenhuma porta nova,
-- só deixa de faltar uma peça que já devia estar coberta.
drop policy if exists "fotos_eventos_insert_dono" on storage.objects;
create policy "fotos_eventos_insert_dono"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-eventos'
    and public.pode_gerenciar_evento(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "fotos_eventos_update_dono" on storage.objects;
create policy "fotos_eventos_update_dono"
  on storage.objects for update
  using (
    bucket_id = 'fotos-eventos'
    and public.pode_gerenciar_evento(((storage.foldername(name))[1])::uuid)
  );

-- 4) RPC de conveniência: lista só os eventos que o usuário logado pode
-- gerenciar (criou, OU é dono do local da festa) — usada pela tela nova
-- /dashboard/eventos. Filtra explicitamente no WHERE (não só via RLS),
-- então nunca devolve evento de outra pessoa mesmo sendo security definer.
create or replace function public.meus_eventos_gerenciaveis()
returns setof public.eventos
language sql
stable
security definer
set search_path = public
as $$
  select e.*
  from public.eventos e
  where e.criado_por = auth.uid()
     or e.local_id in (select id from public.locais where owner_id = auth.uid());
$$;

grant execute on function public.meus_eventos_gerenciaveis() to authenticated;

-- ============================================================================
-- FIM: 020_horario_funcionamento_galeria_e_fix_foto_evento.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 021_horario_no_cadastro_rapido.sql
-- ============================================================================
-- ============================================================================
-- 021 — RPC pra gravar horário de funcionamento já no cadastro rápido
-- (anônimo, mesma janela de segurança da foto)
-- ============================================================================
-- Contexto: a 020 criou a coluna `locais.horario_funcionamento`, editável
-- pelo dono via UPDATE normal (RLS de locais_update_dono_ou_admin já
-- cobre). Mas no CADASTRO RÁPIDO, quem preenche o horário ainda está
-- anônimo (auth.uid() nulo) — e a policy de update exige
-- `owner_id = auth.uid()`, que nunca bate pra `null = null`. Um simples
-- `.update(...)` depois do `cadastro_rapido_criar_local` (017) silenciosamente
-- não gravaria nada (RLS bloqueia, sem erro nenhum pro cliente — o tipo de
-- bug mais traiçoeiro, porque não avisa que falhou).
--
-- Solução: mesma receita da 017 pra foto — uma função SECURITY DEFINER
-- restrita à mesma janela seguraadmin (`status = 'pendente' and
-- owner_id is null`), chamada como um passo extra depois de criar o
-- local, exatamente como `cadastro_rapido_definir_foto_local` já faz.
-- ============================================================================

create or replace function public.cadastro_rapido_definir_horario_local(
  p_id uuid,
  p_horario jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.locais
    set horario_funcionamento = coalesce(p_horario, '{}'::jsonb)
    where id = p_id
      and status = 'pendente'
      and owner_id is null;

  return found;
end;
$$;

grant execute on function public.cadastro_rapido_definir_horario_local(uuid, jsonb) to anon, authenticated;

-- ============================================================================
-- FIM: 021_horario_no_cadastro_rapido.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 022_fix_protect_eventos_service_role_e_login_organizador.sql
-- ============================================================================
-- ============================================================================
-- 022 — protect_admin_fields_eventos() passa a reconhecer a Service Role
-- Key, igual a 012 já fez pra locais
-- ============================================================================
-- Contexto: pedido da Andrea pra também gerar login automático (senha por
-- WhatsApp) pro organizador de evento/festa quando aprovado, igual já
-- acontece com locais desde a Rodada 22 (012). Isso exige criar a conta de
-- autenticação (auth.admin.createUser) a partir de uma API route no
-- servidor, com a service_role key -- só o servidor pode fazer isso.
--
-- Só que a aprovação do evento também grava `status` e `criado_por` na
-- mesma chamada, e caiu bem no MESMO buraco que a 012 já resolveu pra
-- `locais`: o gatilho `protect_admin_fields_eventos()` (criado na 001)
-- só reconhece `is_admin()` -- que depende de `auth.uid()`, sempre NULL
-- numa chamada feita com a service_role key (não tem sessão de usuário
-- nenhuma). Sem este fix, uma API route feita com a service_role key
-- pareceria funcionar (responde 200, sem erro) mas o gatilho reverteria
-- silenciosamente `status` e `criado_por` de volta pro valor antigo --
-- exatamente o tipo de bug que não avisa que falhou, reproduzido e
-- confirmado no harness local antes deste fix.
--
-- A service_role key só existe numa variável de ambiente do lado do
-- servidor (nunca no navegador) -- é tão confiável quanto um admin
-- logado, então este ajuste libera ela também, ao lado do is_admin() que
-- já existia. Mesma receita exata da 012.
-- ============================================================================

create or replace function public.protect_admin_fields_eventos()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status := old.status;
    new.plano_destaque := old.plano_destaque;
    new.criado_por := old.criado_por;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- FIM: 022_fix_protect_eventos_service_role_e_login_organizador.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 023_destaque_rotativo_edicao_evento_agenda_semanal.sql
-- ============================================================================
-- ============================================================================
-- 023 — Rodada 41: rotação/fixação de destaque, edição e cancelamento de
-- evento pelo organizador, e agenda semanal dos locais
-- ============================================================================
-- Pedido da Andrea (verbatim): "Como podemos criar uma logica aonde o
-- portal de admintrador seja mais robusto, selecionando através de uma
-- logica os bunners pagantes e rodando semanalmente? [...] uma
-- distribuicao clara do que aparece em qual hashtag [...] eu como
-- administrador selecionar o que sobe cada dia em cada pagina [...] eu
-- dou um flag e ajusto?" + "ter uma opcao no portal de editar informacoes
-- ou excluir [evento]" + "criar no portal b2b [...] agenda da semana".
--
-- Decisão confirmada por ela via pergunta de múltipla escolha (Rodada 41):
--  1) Destaque: HÍBRIDO — rotação automática semanal por padrão (sem
--     esforço manual) + ela pode fixar manualmente quando quiser.
--  2) Editar evento aprovado: campos sensíveis (data, local, título)
--     voltam pra fila de aprovação; campos cosméticos (foto, descrição,
--     link) aplicam na hora.
--  3) Excluir evento aprovado: cancelamento soft (fica no banco,
--     marcado como cancelado), nunca apaga a linha.
--
-- Tudo aditivo: nenhuma coluna/tabela/enum é removida ou tem seu
-- comportamento restringido pra quem já dependia dele.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1 — status 'cancelado' (cancelamento soft de evento)
-- ----------------------------------------------------------------------------
-- Reaproveita o enum que `eventos.status` já usa (status_moderacao), o
-- mesmo enum de `locais.status`. Adicionar o valor aqui não muda nada pra
-- quem já usa o enum só com os 4 valores antigos — é estritamente aditivo.
-- ALTER TYPE ... ADD VALUE não pode ser usado na mesma transação em que o
-- valor novo é lido/gravado — por isso este bloco fica isolado, sem nada
-- depois dele no mesmo `;` que dependa do valor novo.
alter type public.status_moderacao add value if not exists 'cancelado';

-- ----------------------------------------------------------------------------
-- PARTE 2 — colunas novas pra fixação manual de destaque (locais/eventos)
-- ----------------------------------------------------------------------------
-- `locais.destaque_ate` já existia desde a 001 (pensada originalmente
-- como validade do plano pago) mas nunca foi lida em lugar nenhum do app
-- nem do portal — confirmado antes de reaproveitar. Passa a ser também a
-- data de expiração da fixação manual (ver PARTE 4). `destaque_secao_fixada`
-- é nova: quando preenchida, essa entrada sobe pro topo daquela seção
-- específica até `destaque_ate` (ou pra sempre, se `destaque_ate` for
-- null) — é o botão "fixar" que a Andrea pediu, sem exigir que ela ajuste
-- isso toda semana (o resto continua rodando automático, ver PARTE 4).
alter table public.locais
  add column if not exists destaque_secao_fixada text;

do $$ begin
  alter table public.locais
    add constraint locais_destaque_secao_fixada_valida
    check (destaque_secao_fixada is null or destaque_secao_fixada in (
      'em_alta', 'dicas_trip', 'bares', 'gastronomia', 'cultura', 'turismo'
    )) not valid;
exception when duplicate_object then null;
end $$;
alter table public.locais validate constraint locais_destaque_secao_fixada_valida;

comment on column public.locais.destaque_ate is
  'Rodada 41: reaproveitada como data de expiração da fixação manual em destaque_secao_fixada (null = fixação sem prazo, até alguém tirar). Antes disso, coluna existia desde a 001 mas nunca foi lida em código nenhum.';
comment on column public.locais.destaque_secao_fixada is
  'Rodada 41: em qual seção do app (Em Alta, Dicas Trip, ou a categoria própria do local) o admin fixou este local no topo manualmente. Null = segue só a rotação automática semanal (ver função public.peso_rotacao_destaque).';

-- Eventos não tinham nenhuma coluna de expiração/fixação de destaque —
-- criadas agora simétricas às de locais.
alter table public.eventos
  add column if not exists destaque_ate timestamptz;
alter table public.eventos
  add column if not exists destaque_secao_fixada text;

do $$ begin
  alter table public.eventos
    add constraint eventos_destaque_secao_fixada_valida
    check (destaque_secao_fixada is null or destaque_secao_fixada in ('evento_destaque')) not valid;
exception when duplicate_object then null;
end $$;
alter table public.eventos validate constraint eventos_destaque_secao_fixada_valida;

comment on column public.eventos.destaque_ate is
  'Rodada 41: data de expiração da fixação manual em destaque_secao_fixada (null = sem prazo).';
comment on column public.eventos.destaque_secao_fixada is
  'Rodada 41: fixação manual do admin na aba de eventos/agenda em destaque. Null = segue só a rotação automática semanal.';

-- Só o admin (ou o servidor, com service_role) pode fixar/desfixar destaque
-- — mesmo princípio de proteção que já existia pra plano_destaque. Esta
-- função já existia (001, reforçada em 012/019) — a única mudança real
-- aqui é a linha nova protegendo `destaque_secao_fixada`; todo o resto
-- (owner_id, rating_media/total, a rede de segurança de owner_id órfão)
-- é preservado EXATAMENTE como estava na 019, pra não reabrir nenhum bug
-- já corrigido.
create or replace function public.protect_admin_fields_locais()
returns trigger as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status := old.status;
    new.safe_space := old.safe_space;
    new.plano_destaque := old.plano_destaque;
    new.destaque_ate := old.destaque_ate;
    new.destaque_secao_fixada := old.destaque_secao_fixada;
    new.owner_id := old.owner_id;
    new.rating_media := old.rating_media;
    new.rating_total := old.rating_total;
  end if;

  if new.owner_id is not null and not exists (select 1 from public.profiles where id = new.owner_id) then
    new.owner_id := old.owner_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- PARTE 3 — coluna `tags` em locais (defensiva)
-- ----------------------------------------------------------------------------
-- O app e o portal já leem/gravam `locais.tags` desde a Rodada 24
-- (arquivo original 014_tags_experiencia_locais.sql), mas esse arquivo não
-- está presente nesta pasta supabase-migration/ (gap 002/014/015 — muito
-- provavelmente já aplicado direto no Supabase e o arquivo local se
-- perdeu). `add column if not exists` é seguro nos dois cenários: se a
-- coluna já existe em produção, não faz nada; se por algum motivo não
-- existir, cria agora do jeito que o código já espera.
alter table public.locais
  add column if not exists tags text[] not null default '{}'::text[];

-- ----------------------------------------------------------------------------
-- PARTE 4 — rotação automática semanal (função de peso, usada nas queries)
-- ----------------------------------------------------------------------------
-- Não precisa de cron nem de nenhuma linha gravada toda semana: o "sorteio"
-- é determinístico a partir do id da linha + do número da semana ISO atual
-- (to_char(now(), 'IYYY-IW')) — muda sozinho quando a semana muda, é igual
-- pra todo mundo que consultar no mesmo momento, e nunca precisa de
-- manutenção. Quem paga (destaque/vip) continua tendo prioridade sobre
-- quem não paga (básico) — a rotação só decide a ORDEM relativa entre
-- pagantes do mesmo nível, pra não ser sempre o mesmo no topo.
create or replace function public.peso_rotacao_destaque(p_id uuid)
returns text as $$
  select md5(p_id::text || to_char(now(), 'IYYY-IW'));
$$ language sql stable;

comment on function public.peso_rotacao_destaque(uuid) is
  'Rodada 41: chave de ordenação que muda sozinha a cada semana ISO, usada como critério de desempate entre locais/eventos do mesmo nível de plano_destaque — distribui quem aparece primeiro em cada seção sem precisar de admin ajustando nada toda semana. Combinar com destaque_secao_fixada (fixação manual, que sempre vence) e a prioridade de plano_destaque.';

-- ----------------------------------------------------------------------------
-- PARTE 5 — edição de evento aprovado pelo organizador: campos sensíveis
-- voltam pra fila; cancelamento (soft) liberado pro dono a qualquer hora
-- ----------------------------------------------------------------------------
create or replace function public.protect_admin_fields_eventos()
returns trigger as $$
declare
  campos_sensiveis_mudaram boolean;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Admin (painel) e servidor (API route com service_role, ex.: aprovação)
  -- continuam podendo tudo, como já era desde a 001/022.
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  -- Dono do evento (organizador ou dono do local vinculado, via RLS
  -- eventos_update_dono_ou_admin/pode_gerenciar_evento) nunca decide
  -- sozinho seu próprio plano pago nem troca quem é o criador.
  new.plano_destaque := old.plano_destaque;
  new.criado_por := old.criado_por;
  new.destaque_ate := old.destaque_ate;
  new.destaque_secao_fixada := old.destaque_secao_fixada;

  -- Cancelamento (Rodada 41, pedido da Andrea): o dono pode cancelar o
  -- próprio evento a qualquer momento — soft, a linha nunca é apagada,
  -- só marcada. Não passa pela regra de "campo sensível" abaixo porque
  -- cancelar não é uma edição de conteúdo, é encerrar o evento.
  if new.status = 'cancelado' then
    return new;
  end if;

  -- Dono não pode reaprovar o próprio evento sozinho, nem "ressuscitar"
  -- um evento cancelado sozinho — só admin faz isso (regra já coberta
  -- pelo bloco acima: se chegou aqui, quem está editando não é admin).
  if old.status = 'cancelado' or new.status = 'aprovado' then
    new.status := old.status;
  end if;

  -- Editar um evento JÁ APROVADO: mudar data, local ou título é uma
  -- mudança de conteúdo grande o bastante pra merecer revisão de novo —
  -- volta pra 'pendente'. Mudanças cosméticas (foto, descrição, link,
  -- estilos musicais, público) continuam valendo na hora, sem travar.
  if old.status = 'aprovado' and new.status <> 'cancelado' then
    campos_sensiveis_mudaram := (
      new.data_inicio is distinct from old.data_inicio
      or new.data_fim is distinct from old.data_fim
      or new.local_id is distinct from old.local_id
      or new.titulo is distinct from old.titulo
    );
    if campos_sensiveis_mudaram then
      new.status := 'pendente';
    else
      new.status := old.status;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_update_locais on public.locais;
create trigger before_update_locais before update on public.locais
  for each row execute function public.protect_admin_fields_locais();

-- ----------------------------------------------------------------------------
-- PARTE 6 — Agenda da semana (bar sobe foto/link por dia da semana)
-- ----------------------------------------------------------------------------
create table if not exists public.agenda_semanal (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0=domingo ... 6=sábado
  titulo text not null,
  descricao text,
  foto_url text,
  link text,
  ordem smallint not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.agenda_semanal;
create trigger set_updated_at before update on public.agenda_semanal
  for each row execute function public.set_updated_at();

alter table public.agenda_semanal enable row level security;

drop policy if exists "agenda_semanal_select_publico" on public.agenda_semanal;
create policy "agenda_semanal_select_publico" on public.agenda_semanal
  for select using (
    (ativo = true and exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado'))
    or exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "agenda_semanal_write_dono_ou_admin" on public.agenda_semanal;
create policy "agenda_semanal_write_dono_ou_admin" on public.agenda_semanal
  for all using (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.locais l where l.id = local_id and (l.owner_id = auth.uid() or public.is_admin()))
  );

grant select, insert, update, delete on public.agenda_semanal to anon, authenticated;
grant all on public.agenda_semanal to service_role;

comment on table public.agenda_semanal is
  'Rodada 41: agenda semanal do local (ex.: "Segunda: Karaokê" com foto e/ou link), preenchida pelo próprio dono no portal. Uma linha por dia com programação — dia sem linha ativa simplesmente não aparece na agenda daquele local.';

-- ============================================================================
-- FIM: 023_destaque_rotativo_edicao_evento_agenda_semanal.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 024_direcionamento_manual_secoes_e_controle_admin.sql
-- ============================================================================
-- 024: direcionamento manual multi-seção (Rodada 43)
--
-- Contexto: hoje existe locais.destaque_secao_fixada (Rodada 41), que só guarda
-- UM valor por local/evento. A Andrea pediu poder marcar um mesmo local em
-- VÁRIAS seções ao mesmo tempo (ex.: "bares" + "dicas_trip" + "destaque"),
-- direto no /admin, ao lado do plano comercial real dele — inclusive pra
-- locais que não pagam, quando ela precisar preencher o app.
--
-- Mantemos destaque_secao_fixada como está (filosofia aditiva, nada é
-- removido) e criamos destaque_secoes text[] ao lado, com backfill do valor
-- antigo. O admin novo passa a escrever no array; o campo antigo fica
-- congelado (histórico), sem uso novo.
--
-- "Membro Fundador" continua em local_badges (mecanismo separado, já
-- funcionando desde a Rodada anterior) — não entra nesse array; a ideia é só
-- unificar a UI do /admin num painel só, não fundir os dois storages.

begin;

-- ---------------------------------------------------------------------------
-- 1. Nova coluna: locais.destaque_secoes
-- ---------------------------------------------------------------------------
alter table public.locais
  add column if not exists destaque_secoes text[] not null default '{}'::text[];

-- Backfill a partir do valor único antigo, só onde o array ainda está vazio
-- (idempotente: rodar de novo não sobrescreve edição manual já feita).
update public.locais
set destaque_secoes = array[destaque_secao_fixada]
where destaque_secao_fixada is not null
  and coalesce(array_length(destaque_secoes, 1), 0) = 0;

-- Valores aceitos: as seções de conteúdo existentes + 'destaque' (selo
-- manual de destaque/spotlight, independente do plano_destaque legado).
--
-- Rodada 46 — bug real encontrado ao testar o script consolidado (todas
-- as migrations rodando em sequência) contra um banco que JÁ TINHA dados
-- reais usando valores adicionados depois (ex.: 'hoje', só criado na
-- 025): como esta migration RECRIA a constraint do zero com a lista da
-- ÉPOCA, ela rejeita linhas que já usam um valor mais novo — mesmo que
-- esse valor seja válido de verdade (a 025/026 vão liberá-lo de novo
-- alguns comandos depois, mas tarde demais, o ADD CONSTRAINT já falhou
-- nesta linha). Corrigido incluindo aqui, adiantado, todo valor que
-- qualquer migration futura desta série (025, 026) vai liberar — regra
-- pra manter: ao adicionar um valor novo a esta constraint numa rodada
-- futura, adicionar também aqui (na primeira vez que a constraint é
-- criada), nunca só na migration nova.
--
-- Rodada 47 — 'selo_dicas' somado aqui também, mesma regra (a Andrea
-- pediu um selo curatorial novo, "Selo Dicas LGBT+", criado só na
-- migration 027).
alter table public.locais
  drop constraint if exists locais_destaque_secoes_validas;
alter table public.locais
  add constraint locais_destaque_secoes_validas
  check (
    destaque_secoes <@ array[
      'em_alta', 'dicas_trip', 'bares', 'gastronomia', 'cultura', 'turismo', 'destaque', 'hoje', 'patrocinado', 'selo_dicas'
    ]::text[]
  );

create index if not exists locais_destaque_secoes_idx
  on public.locais using gin (destaque_secoes);

-- ---------------------------------------------------------------------------
-- 2. Nova coluna: eventos.destaque_secoes
-- ---------------------------------------------------------------------------
alter table public.eventos
  add column if not exists destaque_secoes text[] not null default '{}'::text[];

update public.eventos
set destaque_secoes = array[destaque_secao_fixada]
where destaque_secao_fixada is not null
  and coalesce(array_length(destaque_secoes, 1), 0) = 0;

-- Rodada 46 — mesmo motivo do comentário acima (locais): adiantado aqui
-- todo valor que a 026 vai liberar pra eventos ('hoje', 'patrocinado'),
-- pra um replay completo do histórico nunca rejeitar dado real que já
-- usa esses valores.
alter table public.eventos
  drop constraint if exists eventos_destaque_secoes_validas;
alter table public.eventos
  add constraint eventos_destaque_secoes_validas
  check (
    destaque_secoes <@ array['evento_destaque', 'destaque', 'hoje', 'patrocinado']::text[]
  );

create index if not exists eventos_destaque_secoes_idx
  on public.eventos using gin (destaque_secoes);

-- ---------------------------------------------------------------------------
-- 3. Proteger a coluna nova nos mesmos triggers que já protegem
--    destaque_secao_fixada (só admin/service_role edita) — corpo exato de
--    antes (extraído com pg_get_functiondef), só somando a linha nova, pra
--    não regredir nenhuma proteção existente.
-- ---------------------------------------------------------------------------
create or replace function public.protect_admin_fields_locais()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status := old.status;
    new.safe_space := old.safe_space;
    new.plano_destaque := old.plano_destaque;
    new.destaque_ate := old.destaque_ate;
    new.destaque_secao_fixada := old.destaque_secao_fixada;
    new.destaque_secoes := old.destaque_secoes;
    new.owner_id := old.owner_id;
    new.rating_media := old.rating_media;
    new.rating_total := old.rating_total;
  end if;
  if new.owner_id is not null and not exists (select 1 from public.profiles where id = new.owner_id) then
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$function$;

create or replace function public.protect_admin_fields_eventos()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  campos_sensiveis_mudaram boolean;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;
  new.plano_destaque := old.plano_destaque;
  new.criado_por := old.criado_por;
  new.destaque_ate := old.destaque_ate;
  new.destaque_secao_fixada := old.destaque_secao_fixada;
  new.destaque_secoes := old.destaque_secoes;
  if new.status = 'cancelado' then
    return new;
  end if;
  if old.status = 'cancelado' or new.status = 'aprovado' then
    new.status := old.status;
  end if;
  if old.status = 'aprovado' and new.status <> 'cancelado' then
    campos_sensiveis_mudaram := (
      new.data_inicio is distinct from old.data_inicio
      or new.data_fim is distinct from old.data_fim
      or new.local_id is distinct from old.local_id
      or new.titulo is distinct from old.titulo
    );
    if campos_sensiveis_mudaram then
      new.status := 'pendente';
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$function$;

commit;

-- ============================================================================
-- FIM: 024_direcionamento_manual_secoes_e_controle_admin.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 025_experiencias_unificadas_e_hoje_manual.sql
-- ============================================================================
-- 025: seletor unificado de "experiências" (até 3, admin-only) + permite
-- fixar um LOCAL manualmente em "O que Fazer Hoje" (Rodada 44)
--
-- Contexto: a Andrea pediu uma reestruturação do /admin (abas Aprovações
-- / Gestão de Categorias e Destaques) com um seletor único de até 3
-- "experiências" por local — juntando experiências reais (Aniversário,
-- Karaokê, Drag Show...) com selos que já têm mecanismo próprio (Membro
-- Fundador → local_badges, Destaque da Semana → destaque_secoes
-- 'destaque'). Ela confirmou que prefere mesmo assim um seletor único na
-- UI (perguntei explicitamente) — então o admin mostra tudo junto, mas
-- só o que não tem lar próprio (Cupons Exclusivos, Eventos, e as 9
-- experiências reais) é gravado aqui; Membro Fundador/Destaque da Semana
-- continuam gravando nos mecanismos que já existem (evita duplicar
-- estado e ter duas fontes de verdade pra a mesma coisa).
--
-- Ela também confirmou que quer fixar um LOCAL (não só eventos) em "O
-- que Fazer Hoje" — reaproveita destaque_secoes (Rodada 43) com um novo
-- valor válido 'hoje', em vez de inventar coluna nova pra isso.

begin;

-- ---------------------------------------------------------------------------
-- 1. destaque_secoes ganha 'hoje' como valor válido (locais só — eventos já
--    aparecem em "O que Fazer Hoje" automaticamente pela data, sem precisar
--    de fixação manual — suposição que a Rodada 46 corrigiu: eventos
--    também passaram a ter fixação manual, ver migration 026).
--
-- Rodada 46 — inclui 'patrocinado' aqui também (adiantado, mesmo motivo
-- do comentário equivalente na 024): evita que um replay completo do
-- histórico rejeite uma linha que já usa 'patrocinado' antes da 026
-- rodar. Regra pra manter: valor novo nesta constraint numa rodada
-- futura → somar também aqui e na 024.
--
-- Rodada 47 — 'selo_dicas' somado também, mesma regra (selo curatorial
-- novo, criado só na migration 027).
-- ---------------------------------------------------------------------------
alter table public.locais
  drop constraint if exists locais_destaque_secoes_validas;
alter table public.locais
  add constraint locais_destaque_secoes_validas
  check (
    destaque_secoes <@ array[
      'em_alta', 'dicas_trip', 'bares', 'gastronomia', 'cultura', 'turismo', 'destaque', 'hoje', 'patrocinado', 'selo_dicas'
    ]::text[]
  );

-- ---------------------------------------------------------------------------
-- 2. Nova coluna locais.experiencias — até 3, só os valores que não têm
--    mecanismo próprio (as 9 experiências reais + Cupons Exclusivos +
--    Eventos). "Membro Fundador" e "Destaque da Semana" aparecem juntos
--    no mesmo seletor da UI, mas gravam em local_badges/destaque_secoes
--    como já acontecia — nunca ficam guardados aqui.
-- ---------------------------------------------------------------------------
alter table public.locais
  add column if not exists experiencias text[] not null default '{}'::text[];

alter table public.locais
  drop constraint if exists locais_experiencias_validas;
alter table public.locais
  add constraint locais_experiencias_validas
  check (
    experiencias <@ array[
      'aniversario', 'predominancia_lesbica', 'predominancia_gay', 'dates',
      'musica_ao_vivo', 'dancar', 'karaoke', 'drag_show', 'aula_de_danca',
      'cupons_exclusivos', 'eventos'
    ]::text[]
  );

alter table public.locais
  drop constraint if exists locais_experiencias_max_3;
alter table public.locais
  add constraint locais_experiencias_max_3
  check (coalesce(array_length(experiencias, 1), 0) <= 3);

create index if not exists locais_experiencias_idx
  on public.locais using gin (experiencias);

-- ---------------------------------------------------------------------------
-- 3. Protege a coluna nova no mesmo trigger que já protege destaque_secoes
--    (só admin/service_role edita) — corpo exato de antes, só somando a
--    linha nova.
-- ---------------------------------------------------------------------------
create or replace function public.protect_admin_fields_locais()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if not (public.is_admin() or auth.role() = 'service_role') then
    new.status := old.status;
    new.safe_space := old.safe_space;
    new.plano_destaque := old.plano_destaque;
    new.destaque_ate := old.destaque_ate;
    new.destaque_secao_fixada := old.destaque_secao_fixada;
    new.destaque_secoes := old.destaque_secoes;
    new.experiencias := old.experiencias;
    new.owner_id := old.owner_id;
    new.rating_media := old.rating_media;
    new.rating_total := old.rating_total;
  end if;
  if new.owner_id is not null and not exists (select 1 from public.profiles where id = new.owner_id) then
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$function$;

commit;

-- ============================================================================
-- FIM: 025_experiencias_unificadas_e_hoje_manual.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 026_hoje_manual_eventos_patrocinado_e_categorias.sql
-- ============================================================================
-- 026: eventos podem ser fixados em "O que Fazer Hoje" (mesmo mecanismo
-- que locais já tinham desde a 025), selo "Patrocinado" novo pra locais
-- e eventos (mecanismo de monetização simples, cobrança manual como o
-- resto), e ativação de 3 categorias que já existiam como placeholder
-- "Em breve" no admin (Beleza, Lojas, Lazer).
--
-- Contexto (Rodada 46): a Andrea pediu pra facilitar o /admin de eventos
-- e reportou que "eventos não sobem". Investigando, o motivo real é que
-- a 025 deu a LOCAIS a opção de fixação manual em "O que Fazer Hoje"
-- (destaque_secoes 'hoje') mas ASSUMIU que eventos já apareciam ali
-- automaticamente pela data (só no dia exato, ver comentário da própria
-- 025) — não existe fixação manual pra evento nessa seção, então uma
-- festa recorrente ou marcada com antecedência nunca aparecia lá fora
-- do dia exato. Corrigido dando a eventos a mesma opção manual que
-- locais já têm (app: src/app/(tabs)/index.tsx passa a buscar também
-- eventos com destaque_secoes 'hoje', igual já faz com locais).
--
-- Também pedido dela: pensar em categorias novas pra atrair mais
-- usuários e rentabilizar com quem paga pra aparecer. "Beleza", "Lojas"
-- e "Lazer" já existiam como chips do admin com categoriaReal: null (ou
-- seja, só filtro organizacional, sem categoria real no banco) — em vez
-- de inventar do zero, ativa essas 3 de verdade (mesmo padrão já usado
-- pra "servicos": existe no banco, Andrea decide quando mostrar pro
-- usuário final — a UI do app ainda precisa de uma rodada própria pra
-- dar ícone/lugar na grade de categorias a essas 3, isso aqui só libera
-- o valor no banco e no filtro do admin). "Espaço 18+" fica só como
-- ideia por ora — precisa de decisão de produto/legal (verificação de
-- idade) antes de virar categoria de banco, não é só um ALTER TYPE.
--
-- O selo "Patrocinado" é a peça de monetização mais direta que a Andrea
-- pediu ("categorias/festas pagando o aplicativo"): igual ao selo
-- "Destaque" que já existe (cobrança manual por Pix/WhatsApp, sem
-- gateway), mas não amarrado a nenhuma categoria — qualquer local OU
-- evento pode comprar esse selo pra aparecer com uma faixa
-- "Patrocinado" diferenciada, independente do plano comercial dele.

begin;

-- 1) eventos ganham a mesma opção 'hoje' que locais já têm (fixação
--    manual em "O que Fazer Hoje"), e o selo novo 'patrocinado'.
alter table public.eventos
  drop constraint if exists eventos_destaque_secoes_validas;
alter table public.eventos
  add constraint eventos_destaque_secoes_validas
  check (
    destaque_secoes <@ array['evento_destaque', 'destaque', 'hoje', 'patrocinado']::text[]
  );

-- 2) locais também ganham o selo 'patrocinado' (mesma ideia, pra local).
--    'selo_dicas' também já entra aqui, adiantado (mesma regra das
--    outras migrations desta constraint) — é o selo curatorial criado
--    de verdade só na migration 027, "Selo Dicas LGBT+".
alter table public.locais
  drop constraint if exists locais_destaque_secoes_validas;
alter table public.locais
  add constraint locais_destaque_secoes_validas
  check (
    destaque_secoes <@ array[
      'em_alta', 'dicas_trip', 'bares', 'gastronomia', 'cultura', 'turismo', 'destaque', 'hoje', 'patrocinado', 'selo_dicas'
    ]::text[]
  );

-- 3) Ativa 3 categorias que já existiam como placeholder "Em breve" no
--    admin (categoriaReal: null) — Beleza, Lojas, Lazer. Continuam
--    escondidas do usuário final até a Andrea decidir mostrar (mesmo
--    padrão do "servicos", já no banco desde a 001 e escondido por
--    decisão dela, não limitação técnica). ADD VALUE IF NOT EXISTS é
--    idempotente — seguro repetir.
alter type public.categoria_tipo add value if not exists 'beleza';
alter type public.categoria_tipo add value if not exists 'lojas';
alter type public.categoria_tipo add value if not exists 'lazer';

commit;

-- ============================================================================
-- FIM: 026_hoje_manual_eventos_patrocinado_e_categorias.sql
-- ============================================================================

-- ============================================================================
-- INÍCIO: 027_selo_dicas_lgbt.sql
-- ============================================================================
-- 027: Selo Dicas LGBT+ — curadoria editorial da Andrea, nunca vendida.
--
-- Contexto (mensagem dela, na íntegra): "O selo dicas não se vende,
-- apenas se conquista (em breve envio o modelo de marketing)." Mecanismo
-- idêntico a 'hoje'/'patrocinado' (destaque_secoes, locais) — reaproveita
-- a mesma coluna/índice/trigger de proteção que já existem desde a 024,
-- só soma um valor novo à lista de valores aceitos. A diferença é 100%
-- de negócio, não de banco: este valor NUNCA deve ficar condicionado a
-- plano_comercial/pagamento em nenhuma lógica futura — só a Andrea marca,
-- manualmente, no /admin, como reconhecimento editorial.
--
-- Só pra locais nesta rodada (ela pediu "no topo colocar locais com selo
-- dicas" — não mencionou eventos). Se um dia quiser estender pra eventos,
-- é o mesmo padrão de sempre: somar 'selo_dicas' também à constraint de
-- eventos_destaque_secoes_validas.
--
-- Nota sobre o bug de "constraint-narrowing-on-replay" descoberto na
-- Rodada 46 (replay completo rejeitando dado real que já usa um valor
-- introduzido por uma migration mais nova): NÃO se aplica aqui. Aquele
-- bug só ataca quando uma migration ANTERIOR na história já tinha dado
-- real usando um valor que só uma migration POSTERIOR viria a liberar —
-- e como 'selo_dicas' é um valor completamente novo (a constraint
-- nunca aceitou ele antes desta migration), não existe nenhuma linha
-- histórica que já o use antes deste ALTER rodar. Mesmo assim, valendo a
-- regra geral já documentada: se ALGUM dia uma migration futura destas
-- (028, 029...) precisar rodar ANTES da 027 numa reordenação qualquer,
-- ou se este valor precisar ser usado por dados que já existem antes da
-- 027 aplicar, essa mesma lista precisaria ser adiantada nas migrations
-- anteriores que redefinem esta constraint (024, 025, 026) — mesma regra
-- de sempre.
--
-- Cap de vagas (~6-8 locais) é só recomendação de UX no /admin e na Home
-- — de propósito NÃO é um CHECK constraint que bloqueia: a Andrea foi
-- explícita que quer autonomia pra ajustar "caso necessário devido a
-- demanda", mesmo tendo regra de negócio. O aviso amarelo no /admin
-- (quando passar de 8) é só isso mesmo — um aviso, nunca um bloqueio.

begin;

alter table public.locais
  drop constraint if exists locais_destaque_secoes_validas;
alter table public.locais
  add constraint locais_destaque_secoes_validas
  check (
    destaque_secoes <@ array[
      'em_alta', 'dicas_trip', 'bares', 'gastronomia', 'cultura', 'turismo', 'destaque', 'hoje', 'patrocinado', 'selo_dicas'
    ]::text[]
  );

commit;

-- ============================================================================
-- FIM: 027_selo_dicas_lgbt.sql
-- ============================================================================

