-- 066 — Ofertas: Intermediário publica 1 oferta (cupom) por SEMANA (antes: 5 por mês).
-- Regras de negócio: só o Intermediário roda na faixa de ofertas (a cada 4 horas); na categoria ele
-- fica depois dos Fundadores e Premiums; na tela inicial roda entre as posições 6 e 10.
-- Rode no SQL Editor do Supabase. Seguro para rodar mais de uma vez.
begin;

-- 1) Limite semanal por plano (NULL = sem limite semanal). O limite mensal continua existindo.
alter table public.planos_limite_ofertas add column if not exists limite_semana integer
  check (limite_semana is null or limite_semana >= 0);

update public.planos_limite_ofertas
   set limite_semana = 1, limite_mes = null,
       nota = '1 oferta por semana (roda a cada 4 horas na faixa de ofertas)', atualizado_em = now()
 where plano = 'intermediario';

-- 2) Uso do período (semana ou mês) — a tela de cupons e "Meus destaques" usam esta função.
create or replace function public.uso_ofertas_periodo(p_local_id uuid)
returns table (plano text, periodo text, limite integer, usadas integer)
language plpgsql security definer stable set search_path = public as $$
declare
  v_plano text;
  v_status text;
  v_sem integer;
  v_mes integer;
begin
  if not (public.is_admin() or exists (select 1 from public.locais l where l.id = p_local_id and l.owner_id = auth.uid())) then
    raise exception 'Sem permissão.';
  end if;
  select l.plano_comercial::text, l.plano_comercial_status::text into v_plano, v_status from public.locais l where l.id = p_local_id;
  if v_plano is null or (v_status is not null and v_status <> 'ativo') then v_plano := 'freemium'; end if;
  select p.limite_semana, p.limite_mes into v_sem, v_mes from public.planos_limite_ofertas p where p.plano = v_plano;
  if v_sem is not null then
    return query select v_plano, 'semana'::text, v_sem,
      (select count(*)::integer from public.cupons c where c.local_id = p_local_id and c.created_at >= date_trunc('week', now()));
  else
    return query select v_plano, 'mes'::text, v_mes,
      (select count(*)::integer from public.cupons c where c.local_id = p_local_id and c.created_at >= date_trunc('month', now()));
  end if;
end;
$$;
grant execute on function public.uso_ofertas_periodo(uuid) to authenticated;

-- 3) Trava no banco (admin e equipe continuam sem limite).
create or replace function public.enforce_limite_ofertas_mes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plano text;
  v_status text;
  v_sem integer;
  v_mes integer;
  v_usadas integer;
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  select l.plano_comercial::text, l.plano_comercial_status::text into v_plano, v_status from public.locais l where l.id = new.local_id;
  if v_plano is null or (v_status is not null and v_status <> 'ativo') then v_plano := 'freemium'; end if;
  select p.limite_semana, p.limite_mes into v_sem, v_mes from public.planos_limite_ofertas p where p.plano = v_plano;

  if v_sem is not null then
    select count(*) into v_usadas from public.cupons c
      where c.local_id = new.local_id and c.created_at >= date_trunc('week', now());
    if v_usadas >= v_sem then
      raise exception 'Seu plano permite % oferta(s) por semana e você já publicou %. Na próxima segunda-feira você pode publicar outra.', v_sem, v_usadas;
    end if;
  end if;

  if v_mes is not null then
    select count(*) into v_usadas from public.cupons c
      where c.local_id = new.local_id and c.created_at >= date_trunc('month', now());
    if v_usadas >= v_mes then
      raise exception 'Seu plano permite % oferta(s) por mês e você já usou %. Faça upgrade para publicar mais.', v_mes, v_usadas;
    end if;
  end if;
  return new;
end;
$$;

commit;
