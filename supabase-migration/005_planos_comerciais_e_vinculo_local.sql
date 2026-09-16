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

create policy solicitacoes_vinculo_insert_propria
  on public.solicitacoes_vinculo_local for insert
  with check (auth.uid() = user_id);

create policy solicitacoes_vinculo_select_propria_ou_admin
  on public.solicitacoes_vinculo_local for select
  using (auth.uid() = user_id or public.is_admin());

create policy solicitacoes_vinculo_update_admin
  on public.solicitacoes_vinculo_local for update
  using (public.is_admin());

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
