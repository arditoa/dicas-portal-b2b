-- 110 — Reservas, fase 2: lista do dia na Porta (13/11/2026).
--
-- Antes (102): só quem tem 'lista_vip' (e o dono/admin) via e respondia as reservas.
-- Agora: quem tem 'porta' (porteiro convidado e o aparelho da porta por PIN) vê as reservas DE HOJE da casa
-- (horário de Brasília) e marca só "compareceu" ou "não veio". Confirmar, recusar e cancelar continuam com 'lista_vip'.
-- O aviso por push ao cliente é a Edge Function "avisar-reserva" (supabase-functions/avisar-reserva), que confere
-- a permissão pela própria RLS desta tabela. Seguro rodar mais de uma vez. Rode depois da 102.

drop policy if exists reservas_select on public.reservas;
create policy reservas_select on public.reservas for select
  using (
    user_id = auth.uid()
    or public.pode_no_local(local_id, 'lista_vip')
    or public.is_admin()
    or (public.pode_no_local(local_id, 'porta') and data = (now() at time zone 'America/Sao_Paulo')::date)
  );

create or replace function public.responder_reserva(p_reserva uuid, p_status text, p_resposta text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  r public.reservas;
begin
  select * into r from public.reservas where id = p_reserva;
  if r.id is null then raise exception 'Reserva não encontrada.'; end if;

  if p_status = 'cancelada' and r.user_id = auth.uid() then
    if r.status not in ('aguardando', 'confirmada') then raise exception 'Esta reserva não pode mais ser cancelada.'; end if;
  elsif public.pode_no_local(r.local_id, 'lista_vip') or public.is_admin() then
    if p_status not in ('confirmada', 'recusada', 'compareceu', 'nao_veio', 'cancelada') then raise exception 'Situação inválida.'; end if;
  elsif public.pode_no_local(r.local_id, 'porta') then
    -- Porta: só a lista do dia, só chegada.
    if r.data <> (now() at time zone 'America/Sao_Paulo')::date then raise exception 'Na porta, só as reservas de hoje.' using errcode = '42501'; end if;
    if p_status not in ('compareceu', 'nao_veio') then raise exception 'Na porta, marque só se a pessoa veio ou não.' using errcode = '42501'; end if;
    if r.status not in ('confirmada', 'compareceu', 'nao_veio') then raise exception 'Esta reserva ainda não foi confirmada pela casa.'; end if;
  else
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  update public.reservas
     set status = p_status,
         resposta = coalesce(nullif(trim(coalesce(p_resposta, '')), ''), resposta),
         respondido_por = auth.uid(),
         respondido_em = now()
   where id = p_reserva;
end;
$$;
revoke all on function public.responder_reserva(uuid, text, text) from public, anon;
grant execute on function public.responder_reserva(uuid, text, text) to authenticated;

-- Conferência: a política e a função atualizadas.
select policyname from pg_policies where tablename = 'reservas' order by 1;
