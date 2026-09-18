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
