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

alter table if exists public.businesses rename to _legacy_businesses;
alter table if exists public.professionals rename to _legacy_professionals;
alter table if exists public.checkins rename to _legacy_checkins;
alter table if exists public.points_ledger rename to _legacy_points_ledger;
alter table if exists public.rewards rename to _legacy_rewards;
alter table if exists public.coupons rename to _legacy_coupons;
alter table if exists public.current_promo rename to _legacy_current_promo;
alter table if exists public.events rename to _legacy_events;
alter table if exists public.itineraries rename to _legacy_itineraries;
alter table if exists public.pin_code rename to _legacy_pin_code;
alter table if exists public.vip_lists rename to _legacy_vip_lists;
alter table if exists public.whatsapp_sessions rename to _legacy_whatsapp_sessions;
-- Os modelos Prisma "User"/"UserConsent" mapeiam (via @@map) pras tabelas
-- reais "users" e "user_consents" (minúsculas, não "User"/"UserConsent"
-- literalmente) — corrigido aqui depois de checar o schema.prisma com
-- atenção. Não têm relação (FK) com nenhuma outra tabela nem com
-- auth.users — por isso não têm como ser migradas com segurança (não tem
-- como saber a qual conta de login cada linha pertenceria). Ficam
-- guardadas com o prefixo, sem uso, até você decidir se quer apagar de vez.
alter table if exists public.users rename to _legacy_user;
alter table if exists public.user_consents rename to _legacy_user_consent;

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
