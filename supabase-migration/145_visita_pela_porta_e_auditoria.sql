-- 145 — Fidelidade: a entrada pela porta conta como visita + auditoria de check-ins (16/11/2026). Rode depois da 144.
-- Seguro rodar mais de uma vez.
--
-- 1) VISITA = NOITE NA CASA. Conta uma visita por noite (das 6h às 6h), venha ela de:
--      • check-in confirmado (GPS, código no caixa ou confirmação automática);
--      • Lista VIP lida na porta (check_in_em);
--      • ingresso lido na porta (usado_em).
--    Assim, quem entra pela porta numa balada já ganha a visita sem fazer nada, e ninguém soma 2 visitas na mesma
--    noite (Lista VIP + check-in, por exemplo).
-- 2) AUDITORIA (só a equipe Dicas): lista quem tem check-ins estranhos e permite anular.
--      • 4 ou mais casas diferentes na mesma noite;
--      • "viagem impossível": duas casas a mais de 120 km/h de distância entre um check-in e outro;
--      • 3+ check-ins confirmados automaticamente com o celular longe da casa;
--      • mais de 20 check-ins no período.

-- ── 1) Visitas por noite ─────────────────────────────────────────────────────────────────────────────────
create or replace function public.noite_de(ts timestamptz)
returns date language sql immutable as $$
  select ((ts at time zone 'America/Sao_Paulo') - interval '6 hours')::date;
$$;

create or replace function public.visitas_na_casa(p_local uuid, p_user uuid, p_desde timestamptz)
returns integer language sql stable security definer set search_path = public as $$
  select count(distinct public.noite_de(v.quando))::integer from (
    select c.validado_em as quando from public.checkins c
     where c.local_id = p_local and c.user_id = p_user and c.validado_em is not null and c.cancelado_em is null
    union all
    select s.check_in_em from public.listas_vip_solicitacoes s
      join public.listas_vip lv on lv.id = s.lista_vip_id
      join public.eventos e on e.id = lv.evento_id
     where e.local_id = p_local and s.user_id = p_user and s.check_in_em is not null
    union all
    select i.usado_em from public.ingressos i
      join public.eventos e on e.id = i.evento_id
     where e.local_id = p_local and i.user_id = p_user and i.status = 'usado' and i.usado_em is not null
  ) v
  where v.quando > p_desde;
$$;
revoke all on function public.visitas_na_casa(uuid, uuid, timestamptz) from public, anon, authenticated;

-- Mesmas assinaturas de antes (074 e 081): o app e o portal não mudam.
create or replace function public.contar_visitas_fidelidade(p_programa_id uuid, p_user_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select public.visitas_na_casa(p.local_id, p_user_id, greatest(
           public.fid_inicio_periodo(p.janela, p.created_at),
           coalesce((select max(fr.resgatado_em) from public.fidelidade_resgates fr
                      where fr.programa_id = p.id and fr.user_id = p_user_id), '-infinity'::timestamptz)))
    from public.programas_fidelidade p where p.id = p_programa_id;
$$;
grant execute on function public.contar_visitas_fidelidade(uuid, uuid) to authenticated;

create or replace function public.contar_visitas_periodo(p_programa_id uuid, p_user_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select public.visitas_na_casa(p.local_id, p_user_id, public.fid_inicio_periodo(p.janela, p.created_at) - interval '1 microsecond')
    from public.programas_fidelidade p where p.id = p_programa_id;
$$;
revoke execute on function public.contar_visitas_periodo(uuid, uuid) from public, anon;
grant execute on function public.contar_visitas_periodo(uuid, uuid) to authenticated;

-- ── 2) Auditoria de check-ins ───────────────────────────────────────────────────────────────────────────
create or replace function public.admin_auditoria_checkins(p_dias integer default 14)
returns table (user_id uuid, nome text, email text, checkins integer, casas integer, ultimo timestamptz, motivos text[])
language plpgsql stable security definer set search_path = public, auth as $$
declare v_desde timestamptz := now() - make_interval(days => greatest(1, least(p_dias, 90)));
        v_raio integer;
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  select coalesce(nullif(valor, '')::integer, 150) into v_raio from public.app_config where chave = 'checkin_raio_m';
  v_raio := coalesce(v_raio, 150);
  return query
  with c as (
    select k.id, k.user_id as uid, k.local_id, k.validado_em as quando, k.metodo_validacao, k.distancia_m, l.lat, l.lng
      from public.checkins k join public.locais l on l.id = k.local_id
     where k.validado_em >= v_desde and k.cancelado_em is null
  ),
  muitas_casas as (
    select c.uid from c group by c.uid, public.noite_de(c.quando) having count(distinct c.local_id) >= 4
  ),
  pares as (
    select c.uid, c.local_id, c.quando, c.lat, c.lng,
           lag(c.local_id) over w as local_ant, lag(c.quando) over w as quando_ant, lag(c.lat) over w as lat_ant, lag(c.lng) over w as lng_ant
      from c window w as (partition by c.uid order by c.quando)
  ),
  viagem as (
    select p.uid from pares p
     where p.local_ant is not null and p.local_ant <> p.local_id and p.lat is not null and p.lat_ant is not null
       and public.distancia_metros(p.lat, p.lng, p.lat_ant, p.lng_ant) > 3000
       and public.distancia_metros(p.lat, p.lng, p.lat_ant, p.lng_ant)
           / greatest(extract(epoch from (p.quando - p.quando_ant)), 60) * 3.6 > 120
  ),
  longe as (
    select c.uid from c where c.metodo_validacao = 'automatico' and coalesce(c.distancia_m, 0) > v_raio
     group by c.uid having count(*) >= 3
  ),
  resumo as (
    select c.uid, count(*)::integer as n, count(distinct c.local_id)::integer as k, max(c.quando) as ult from c group by c.uid
  )
  select r.uid, coalesce(nullif(trim(pr.social_name), ''), pr.full_name), u.email, r.n, r.k, r.ult,
         array_remove(array[
           case when r.uid in (select muitas_casas.uid from muitas_casas) then '4+ casas na mesma noite' end,
           case when r.uid in (select viagem.uid from viagem) then 'Viagem impossível entre casas' end,
           case when r.uid in (select longe.uid from longe) then 'Confirmado longe da casa (3+ vezes)' end,
           case when r.n > 20 then 'Mais de 20 check-ins no período' end
         ], null)
    from resumo r
    left join public.profiles pr on pr.id = r.uid
    left join auth.users u on u.id = r.uid
   where r.uid in (select muitas_casas.uid from muitas_casas) or r.uid in (select viagem.uid from viagem)
      or r.uid in (select longe.uid from longe) or r.n > 20
   order by r.ult desc;
end;
$$;
revoke all on function public.admin_auditoria_checkins(integer) from public, anon;
grant execute on function public.admin_auditoria_checkins(integer) to authenticated;

create or replace function public.admin_checkins_do_usuario(p_user uuid, p_dias integer default 14)
returns table (id uuid, casa text, quando timestamptz, metodo text, distancia_m integer, anulado boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  return query
  select k.id, l.nome, k.validado_em, k.metodo_validacao, k.distancia_m, k.cancelado_em is not null
    from public.checkins k join public.locais l on l.id = k.local_id
   where k.user_id = p_user and k.validado_em >= now() - make_interval(days => greatest(1, least(p_dias, 90)))
   order by k.validado_em desc limit 200;
end;
$$;
revoke all on function public.admin_checkins_do_usuario(uuid, integer) from public, anon;
grant execute on function public.admin_checkins_do_usuario(uuid, integer) to authenticated;

-- Anular = o check-in deixa de contar (visita, cupom e relatórios). Não apaga: fica registrado quem anulou.
create or replace function public.admin_anular_checkins(p_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  update public.checkins set cancelado_em = now(), cancelado_por = auth.uid()
   where id = any(p_ids) and cancelado_em is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.admin_anular_checkins(uuid[]) from public, anon;
grant execute on function public.admin_anular_checkins(uuid[]) to authenticated;
