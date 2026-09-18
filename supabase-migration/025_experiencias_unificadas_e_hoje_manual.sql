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
--    de fixação manual).
-- ---------------------------------------------------------------------------
alter table public.locais
  drop constraint if exists locais_destaque_secoes_validas;
alter table public.locais
  add constraint locais_destaque_secoes_validas
  check (
    destaque_secoes <@ array[
      'em_alta', 'dicas_trip', 'bares', 'gastronomia', 'cultura', 'turismo', 'destaque', 'hoje'
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
