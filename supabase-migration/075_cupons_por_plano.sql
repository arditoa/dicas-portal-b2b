-- 075 — Cupons por plano: Fundador e Premium 1 a cada 7 dias; Intermediário 1 a cada 14 dias.
-- Regra de negócio (Andrea): a faixa de cupons de cada categoria tem 24 posições —
--   10 Premium + 2 Fundador (12 posições) e 12 Intermediário (os 24 Intermediários se alternam, 12 por hora).
-- Esta migration cuida só do LIMITE de publicação (a composição da faixa é feita pelo app).
-- A contagem agora é por janela móvel de N dias (antes: semana de calendário). Seguro rodar mais de uma vez.
begin;

alter table public.planos_limite_ofertas
  add column if not exists periodo_dias integer check (periodo_dias is null or periodo_dias > 0);

comment on column public.planos_limite_ofertas.limite_semana is
  'Quantos cupons o plano pode publicar a cada `periodo_dias` dias (padrão 7). O nome é antigo; vale para qualquer janela.';
comment on column public.planos_limite_ofertas.periodo_dias is
  'Tamanho da janela, em dias, do limite acima. Null = 7 dias.';

update public.planos_limite_ofertas
   set limite_semana = 1, limite_mes = null, periodo_dias = 7,
       nota = '1 cupom a cada 7 dias (entra na faixa de cupons da categoria)', atualizado_em = now()
 where plano in ('premium', 'fundador');

update public.planos_limite_ofertas
   set limite_semana = 1, limite_mes = null, periodo_dias = 14,
       nota = '1 cupom a cada 14 dias (entra na faixa de cupons da categoria)', atualizado_em = now()
 where plano = 'intermediario';

-- Uso do período: quantos cupons já saíram na janela e quando libera o próximo.
drop function if exists public.uso_ofertas_periodo(uuid);
create or replace function public.uso_ofertas_periodo(p_local_id uuid)
returns table (plano text, periodo text, limite integer, usadas integer, dias integer, libera_em timestamptz)
language plpgsql security definer stable set search_path = public as $$
declare
  v_plano text;
  v_status text;
  v_sem integer;
  v_mes integer;
  v_dias integer;
  v_usadas integer;
  v_libera timestamptz;
begin
  if not (public.is_admin() or exists (select 1 from public.locais l where l.id = p_local_id and l.owner_id = auth.uid())) then
    raise exception 'Sem permissão.';
  end if;
  select l.plano_comercial::text, l.plano_comercial_status::text into v_plano, v_status from public.locais l where l.id = p_local_id;
  if v_plano is null or (v_status is not null and v_status <> 'ativo') then v_plano := 'freemium'; end if;
  select p.limite_semana, p.limite_mes, coalesce(p.periodo_dias, 7) into v_sem, v_mes, v_dias
    from public.planos_limite_ofertas p where p.plano = v_plano;

  if v_sem is not null then
    select count(*)::integer into v_usadas from public.cupons c
      where c.local_id = p_local_id and c.created_at >= now() - make_interval(days => v_dias);
    if v_usadas >= v_sem then
      select min(x.created_at) + make_interval(days => v_dias) into v_libera
      from (select c.created_at from public.cupons c
             where c.local_id = p_local_id and c.created_at >= now() - make_interval(days => v_dias)
             order by c.created_at desc limit greatest(v_sem, 1)) x;
    end if;
    return query select v_plano, 'dias'::text, v_sem, v_usadas, v_dias, v_libera;
  else
    return query select v_plano, 'mes'::text, v_mes,
      (select count(*)::integer from public.cupons c where c.local_id = p_local_id and c.created_at >= date_trunc('month', now())),
      30, null::timestamptz;
  end if;
end;
$$;
grant execute on function public.uso_ofertas_periodo(uuid) to authenticated;

-- Trava no banco (admin e equipe continuam sem limite).
create or replace function public.enforce_limite_ofertas_mes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plano text;
  v_status text;
  v_sem integer;
  v_mes integer;
  v_dias integer;
  v_usadas integer;
  v_libera timestamptz;
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  select l.plano_comercial::text, l.plano_comercial_status::text into v_plano, v_status from public.locais l where l.id = new.local_id;
  if v_plano is null or (v_status is not null and v_status <> 'ativo') then v_plano := 'freemium'; end if;
  select p.limite_semana, p.limite_mes, coalesce(p.periodo_dias, 7) into v_sem, v_mes, v_dias
    from public.planos_limite_ofertas p where p.plano = v_plano;

  if v_sem is not null then
    select count(*) into v_usadas from public.cupons c
      where c.local_id = new.local_id and c.created_at >= now() - make_interval(days => v_dias);
    if v_usadas >= v_sem then
      select min(x.created_at) + make_interval(days => v_dias) into v_libera
      from (select c.created_at from public.cupons c
             where c.local_id = new.local_id and c.created_at >= now() - make_interval(days => v_dias)
             order by c.created_at desc limit greatest(v_sem, 1)) x;
      raise exception 'Seu plano permite % cupom(ns) a cada % dias e você já publicou %. Você poderá publicar outro em %.',
        v_sem, v_dias, v_usadas, to_char(v_libera at time zone 'America/Sao_Paulo', 'DD/MM');
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
