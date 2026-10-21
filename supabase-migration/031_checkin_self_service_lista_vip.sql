-- ============================================================================
-- 031 — Check-in self-service da Lista VIP (pra liberar a avaliação) e
-- criação automática da Lista VIP ao aprovar o evento
-- ============================================================================
-- Contexto (Rodada 59, parte 7 — pedido da Andrea depois de revisar o app
-- final: "faltou apenas o usuario do app dar checkin para resgatar o
-- convite e fazer a avaliacao"). Duas decisões confirmadas por ela:
--
-- 1) O CHECK-IN da Lista VIP passa a ser self-service: o próprio usuário
--    aprovado na lista confirma que chegou (botão "Cheguei" no app), sem
--    depender da portaria digitar nada no portal. Isso é uma escolha
--    consciente de simplicidade sobre segurança (diferente do check-in de
--    cupom da migration 010, que continua exigindo confirmação do
--    estabelecimento) — ela decidiu explicitamente por essa opção quando
--    perguntada. O botão do parceiro pra marcar check-in manualmente
--    (dashboard/eventos) continua funcionando igual, pra quem chegar sem
--    ter usado o app.
--
-- 2) O cadastro de evento (/cadastro/evento) ganha um checkbox "quero
--    abrir Lista VIP" — ao ser aprovado, se marcado, a Lista VIP já nasce
--    criada automaticamente (sem precisar abrir depois pelo dashboard).
--
-- Nada aqui remove ou reduz o que já existia — é aditivo: mais um caminho
-- permitido na trigger de status, mais uma coluna opcional em eventos, e
-- um novo trigger que só age quando o organizador pediu.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1 — Check-in self-service (auto-confirmação do próprio usuário)
-- ----------------------------------------------------------------------------

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
    elsif auth.uid() = old.user_id and old.status = 'aprovada' and new.status = 'check_in' then
      -- NOVO (Rodada 59/7) — o próprio convidado aprovado confirma que
      -- chegou. É o único gatilho que libera a tela de avaliação do
      -- local no app (o app decide isso olhando esse status, não tem
      -- nada de RLS extra pra avaliação em si).
      null;
    else
      new.status := old.status;
      new.acompanhantes := old.acompanhantes;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- (trigger before_update_listas_vip_solicitacoes já existe e já usa esta
-- função — não precisa recriar o trigger, só a função foi trocada.)

-- ----------------------------------------------------------------------------
-- PARTE 2 — Checkbox "quero abrir Lista VIP" no cadastro de evento
-- ----------------------------------------------------------------------------

alter table public.eventos
  add column if not exists quer_lista_vip boolean not null default false;

comment on column public.eventos.quer_lista_vip is
  'Marcado pelo organizador em /cadastro/evento quando já sabe que quer oferecer Lista VIP nesse evento. Ao ser aprovado (status vira aprovado), dispara a criação automática de uma listas_vip padrão — ver trigger criar_lista_vip_ao_aprovar_evento. Não afeta eventos que não marcaram: continuam podendo abrir a lista manualmente pelo dashboard, como sempre.';

create or replace function public.criar_lista_vip_ao_aprovar_evento()
returns trigger as $$
begin
  if new.status = 'aprovado' and old.status is distinct from 'aprovado' and new.quer_lista_vip then
    insert into public.listas_vip (evento_id, titulo, ativa)
    select new.id, 'Lista VIP', true
    where not exists (select 1 from public.listas_vip lv where lv.evento_id = new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

comment on function public.criar_lista_vip_ao_aprovar_evento() is
  'Ao aprovar um evento que marcou quer_lista_vip, cria a Lista VIP padrão automaticamente (só se ainda não existir nenhuma pra esse evento — não duplica se o organizador já tinha aberto uma manualmente antes da aprovação).';

drop trigger if exists criar_lista_vip_ao_aprovar_evento on public.eventos;
create trigger criar_lista_vip_ao_aprovar_evento after update on public.eventos
  for each row execute function public.criar_lista_vip_ao_aprovar_evento();
