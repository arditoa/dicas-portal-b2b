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
