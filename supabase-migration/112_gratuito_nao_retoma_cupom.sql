-- 112 — Revisão geral (Etapa 10, 13/11/2026): plano Gratuito não religa cupom pausado.
--
-- A 104 trava o INSERT de cupom sem plano pago efetivo. Faltava o UPDATE: um local que caiu para o Gratuito (ou está
-- com o plano em interesse/aguardando pagamento/cancelado) conseguia "Retomar" um cupom antigo e ele voltava à página
-- da casa. Agora, religar (ativo false → true) também exige plano pago efetivo. Pausar continua livre. O admin pode.
-- Seguro rodar mais de uma vez. Rode depois da 104.

create or replace function public.exigir_plano_pago_ao_retomar_cupom()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  if new.ativo and not coalesce(old.ativo, false) and not exists (
    select 1 from public.locais l
     where l.id = new.local_id
       and l.plano_comercial::text in ('intermediario', 'premium', 'fundador')
       and coalesce(l.plano_comercial_status::text, 'ativo') = 'ativo'
  ) then
    raise exception 'Os cupons aparecem na página da casa e na busca e estão incluídos nos planos pagos.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists before_update_cupons_plano_pago on public.cupons;
create trigger before_update_cupons_plano_pago before update on public.cupons
  for each row execute function public.exigir_plano_pago_ao_retomar_cupom();

-- Conferência:
select tgname from pg_trigger where tgrelid = 'public.cupons'::regclass and not tgisinternal order by 1;
