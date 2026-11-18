-- 120 — Plano Gratuito: só festa com Lista VIP (e o "Eu vou"). Check-in e cartão fidelidade ficam nos planos pagos
-- (decisão da Andrea, 15/11/2026; cupom já era pago desde a 104/112).
-- * checkins: a casa sem plano pago ativo não recebe check-in novo pelo app.
-- * programas_fidelidade: a casa sem plano pago ativo não liga (nem cria ligado) um cartão fidelidade.
-- * A equipe Dicas (admin) continua podendo tudo. Usa local_tem_plano_pago (102): Intermediário, Premium ou
--   Fundador com status ativo (ou selo de Fundador).
-- Não mexe em nada que já existe (em 15/11 nenhuma casa Gratuita tinha cartão ligado nem check-in no mês).
-- Seguro rodar mais de uma vez.

create or replace function public.trava_checkin_plano()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and not public.local_tem_plano_pago(new.local_id) then
    raise exception 'O check-in pelo app está incluído nos planos pagos desta casa.'
      using errcode = 'P0001', hint = 'CHECKIN_PLANO';
  end if;
  return new;
end;
$$;
drop trigger if exists trava_checkin_plano on public.checkins;
create trigger trava_checkin_plano before insert on public.checkins
  for each row execute function public.trava_checkin_plano();

create or replace function public.trava_fidelidade_plano()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ativo and not public.is_admin() and not public.local_tem_plano_pago(new.local_id)
     and (tg_op = 'INSERT' or not coalesce(old.ativo, false)) then
    raise exception 'O cartão fidelidade está incluído nos planos pagos.'
      using errcode = 'P0001', hint = 'FIDELIDADE_PLANO';
  end if;
  return new;
end;
$$;
drop trigger if exists trava_fidelidade_plano on public.programas_fidelidade;
create trigger trava_fidelidade_plano before insert or update on public.programas_fidelidade
  for each row execute function public.trava_fidelidade_plano();

-- Conferência: as duas travas têm que aparecer
select tgname from pg_trigger where tgname in ('trava_checkin_plano', 'trava_fidelidade_plano');
