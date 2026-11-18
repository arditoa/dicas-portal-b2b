-- Rodada 148 — Lista VIP: o nome entra direto e o QR já fica pronto (sem esperar o bar aprovar).
-- O bar só precisa ler o QR na porta. Quem quiser conferir cada nome antes liga "aprovacao_manual" na lista.
-- Seguro rodar mais de uma vez.

alter table public.listas_vip add column if not exists aprovacao_manual boolean not null default false;

create or replace function public.enforce_solicitacao_vip_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_manual boolean;
  v_limite integer;
  v_ocupadas integer;
begin
  new.status := 'solicitada';
  new.user_id := auth.uid();
  if new.acompanhantes is null or new.acompanhantes < 0 then
    new.acompanhantes := 0;
  end if;

  select lv.aprovacao_manual, lv.vagas_limite, lv.vagas_ocupadas
    into v_manual, v_limite, v_ocupadas
    from public.listas_vip lv
   where lv.id = new.lista_vip_id and lv.ativa;
  if not found then
    raise exception 'Esta lista VIP não está mais aceitando solicitações.';
  end if;

  if exists (
    select 1 from public.listas_vip lv join public.eventos e on e.id = lv.evento_id
     where lv.id = new.lista_vip_id and e.exigir_foto
  ) and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.foto_conferencia_path is not null
  ) then
    raise exception 'Esta lista pede uma foto para conferência na portaria. Cadastre a sua foto e tente de novo.'
      using errcode = 'P0001', hint = 'FOTO_CONFERENCIA';
  end if;

  -- Entra direto (QR pronto) quando a lista não pede aprovação manual.
  if not coalesce(v_manual, false) then
    if v_limite is not null and coalesce(v_ocupadas, 0) >= v_limite then
      raise exception 'A lista VIP já está cheia.' using errcode = 'P0001', hint = 'LISTA_CHEIA';
    end if;
    new.status := 'aprovada';
  end if;

  return new;
end;
$function$;
