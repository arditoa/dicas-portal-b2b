-- 108 — Fidelidade: o "nível VIP" de Clientes VIP usa o MESMO cartão que o portal e o app editam (13/11/2026).
--
-- O portal (dashboard/fidelidade) e a tela Cartão fidelidade do app editam o programa MAIS ANTIGO do local
-- (order by created_at asc limit 1). A função clientes_vip_do_local (100) pegava o MAIS NOVO. Com mais de um
-- cartão no mesmo local, a meta VIP mostrada em Clientes VIP podia ser de outro cartão. Agora as três usam o mesmo.
-- Só muda a ordem (desc → asc). Seguro rodar mais de uma vez. Rode depois da 100.

create or replace function public.clientes_vip_do_local(p_local uuid, p_dias integer default 90)
returns table (
  user_id uuid,
  nome text,
  avatar_url text,
  visitas_total integer,
  visitas_periodo integer,
  ultima_visita timestamptz,
  vip boolean,
  meta_vip integer,
  aniversario text,          -- 'DD/MM' ou null (não autorizou / não informou)
  dias_para_aniversario integer
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_meta integer;
  v_inicio timestamptz := now() - make_interval(days => greatest(coalesce(p_dias, 90), 1));
begin
  if not (public.pode_no_local(p_local, 'resultados') or public.is_admin()) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  select pf.visitas_vip into v_meta
  from public.programas_fidelidade pf
  where pf.local_id = p_local and pf.ativo and pf.visitas_vip is not null
  order by pf.created_at asc
  limit 1;
  v_meta := coalesce(v_meta, 3);

  return query
  with visitas as (
    select c.user_id, c.validado_em as quando
    from public.checkins c
    where c.local_id = p_local and c.validado_em is not null and c.cancelado_em is null
    union all
    select s.user_id, s.check_in_em
    from public.listas_vip_solicitacoes s
    join public.listas_vip lv on lv.id = s.lista_vip_id
    join public.eventos e on e.id = lv.evento_id
    where e.local_id = p_local and s.check_in_em is not null
  ),
  agg as (
    select v.user_id,
           count(*)::integer as total,
           (count(*) filter (where v.quando >= v_inicio))::integer as periodo,
           max(v.quando) as ultima
    from visitas v
    group by v.user_id
  )
  select
    a.user_id,
    coalesce(nullif(pp.display_name, ''), 'Cliente'),
    pp.avatar_url,
    a.total,
    a.periodo,
    a.ultima,
    a.periodo >= v_meta,
    v_meta,
    case when pr.aniversario_para_casas and pr.birth_date is not null then to_char(pr.birth_date, 'DD/MM') end,
    case
      when not coalesce(pr.aniversario_para_casas, false) or pr.birth_date is null then null
      when to_char(pr.birth_date, 'MMDD') = to_char(current_date, 'MMDD') then 0
      else ((pr.birth_date + make_interval(years => extract(year from age(current_date, pr.birth_date))::integer + 1))::date - current_date)
    end
  from agg a
  left join public.perfis_publicos pp on pp.id = a.user_id
  left join public.profiles pr on pr.id = a.user_id
  order by (a.periodo >= v_meta) desc, a.periodo desc, a.total desc, a.ultima desc;
end;
$$;
grant execute on function public.clientes_vip_do_local(uuid, integer) to authenticated;
