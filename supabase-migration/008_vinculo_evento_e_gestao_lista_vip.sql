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

create policy solicitacoes_vinculo_evento_insert_propria
  on public.solicitacoes_vinculo_evento for insert
  with check (auth.uid() = user_id);

create policy solicitacoes_vinculo_evento_select_propria_ou_admin
  on public.solicitacoes_vinculo_evento for select
  using (auth.uid() = user_id or public.is_admin());

create policy solicitacoes_vinculo_evento_update_admin
  on public.solicitacoes_vinculo_evento for update
  using (public.is_admin());

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
