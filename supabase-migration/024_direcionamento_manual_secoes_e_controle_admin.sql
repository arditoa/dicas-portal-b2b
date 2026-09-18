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
alter table public.locais
  drop constraint if exists locais_destaque_secoes_validas;
alter table public.locais
  add constraint locais_destaque_secoes_validas
  check (
    destaque_secoes <@ array[
      'em_alta', 'dicas_trip', 'bares', 'gastronomia', 'cultura', 'turismo', 'destaque'
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

alter table public.eventos
  drop constraint if exists eventos_destaque_secoes_validas;
alter table public.eventos
  add constraint eventos_destaque_secoes_validas
  check (
    destaque_secoes <@ array['evento_destaque', 'destaque']::text[]
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
