-- 079: Check-in por localizacao (GPS) com confirmacao automatica, sem dar trabalho ao bar.
-- Regras:
--  1) Cliente faz check-in no app. Se o celular esta a ate 150 m do local (app_config 'checkin_raio_m'),
--     o check-in ja nasce CONFIRMADO (metodo 'gps'), libera o cupom e conta visita na fidelidade.
--  2) Se o GPS nao estiver disponivel, vale o fluxo antigo: codigo de 6 letras que a casa digita no portal
--     (o codigo agora dura 3 horas, nao 5 minutos, para nao atrapalhar em noite cheia).
--  3) Check-in pendente que a casa nao confirmar e confirmado automaticamente as 6h da manha seguinte
--     (metodo 'automatico'), exceto se o celular estava muito longe do local (mais de 3x o raio).
--  4) A casa pode CANCELAR um check-in indevido (exceção, nao rotina): o cupom e a visita voltam atras.
-- Seguro rodar mais de uma vez.

alter table public.checkins add column if not exists distancia_m integer;

-- aceita os novos metodos de validacao
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.checkins'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%metodo_validacao%'
  loop
    execute format('alter table public.checkins drop constraint %I', r.conname);
  end loop;
  alter table public.checkins add constraint checkins_metodo_validacao_check
    check (metodo_validacao in ('codigo', 'qr', 'gps', 'automatico'));
end $$;

insert into public.app_config (chave, valor, atualizado_em) values ('checkin_raio_m', '150', now())
on conflict (chave) do nothing;

-- distancia em metros entre dois pontos (haversine)
create or replace function public.distancia_metros(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;

-- Check-in: valida cupom (inclusive dia/horario da 078), antifraude de 12h e, com localizacao, confirma sozinho.
create or replace function public.enforce_checkin_seguro_insert()
returns trigger as $$
declare
  v_cupom public.cupons%rowtype;
  v_local public.locais%rowtype;
  v_raio integer;
  v_dist double precision;
begin
  new.user_id := auth.uid();
  if new.user_id is null then
    raise exception 'Check-in exige um usuário autenticado.';
  end if;

  if new.cupom_id is not null then
    select * into v_cupom from public.cupons c
    where c.id = new.cupom_id and c.local_id = new.local_id and c.ativo;
    if not found then
      raise exception 'Este cupom não existe ou não pertence a este local.';
    end if;
    if not public.cupom_vale_agora(v_cupom.dias_semana, v_cupom.hora_inicio, v_cupom.hora_fim) then
      raise exception 'Este cupom só vale em outros dias ou horários. Veja as regras no cupom.';
    end if;
  end if;

  if exists (
    select 1 from public.checkins c
    where c.local_id = new.local_id
      and c.user_id = new.user_id
      and c.created_at > now() - interval '12 hours'
      and c.cancelado_em is null
      and (c.validado_em is not null or c.expira_em > now())
  ) then
    raise exception 'Você já fez check-in nesse local nas últimas 12 horas.';
  end if;

  new.codigo := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  new.expira_em := now() + interval '3 hours';
  new.validado_em := null;
  new.validado_por := null;
  new.cancelado_em := null;
  new.cancelado_por := null;
  new.metodo_validacao := 'codigo';
  new.distancia_m := null;

  if new.lat is not null and new.lng is not null then
    new.localizacao_consentida := true;
    select * into v_local from public.locais where id = new.local_id;
    if v_local.lat is not null and v_local.lng is not null then
      v_dist := public.distancia_metros(new.lat, new.lng, v_local.lat, v_local.lng);
      new.distancia_m := round(v_dist)::integer;
      select coalesce(nullif(valor, '')::integer, 150) into v_raio from public.app_config where chave = 'checkin_raio_m';
      v_raio := coalesce(v_raio, 150);
      if v_dist <= v_raio then
        new.validado_em := now();
        new.metodo_validacao := 'gps';
        if new.cupom_id is not null then
          insert into public.cupons_resgatados (cupom_id, user_id) values (new.cupom_id, new.user_id)
          on conflict (cupom_id, user_id) do nothing;
        end if;
      else
        raise exception 'Você está a % m do local. Chegue mais perto para fazer o check-in.', round(v_dist)::integer;
      end if;
    end if;
  else
    new.lat := null;
    new.lng := null;
    new.localizacao_consentida := false;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Confirmacao automatica de fim de noite: pendentes de uma noite viram confirmados as 6h da manha seguinte.
-- Chamada pelo app e pelo portal ao abrir as telas (nao precisa de agendador); idempotente.
create or replace function public.confirmar_checkins_pendentes()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n integer := 0;
  v_raio integer;
begin
  select coalesce(nullif(valor, '')::integer, 150) into v_raio from public.app_config where chave = 'checkin_raio_m';
  v_raio := coalesce(v_raio, 150);
  for r in
    select c.id, c.cupom_id, c.user_id, c.created_at
    from public.checkins c
    where c.validado_em is null and c.cancelado_em is null
      and now() >= ((((c.created_at at time zone 'America/Sao_Paulo') - interval '6 hours')::date + 1) + time '06:00') at time zone 'America/Sao_Paulo'
      and (c.distancia_m is null or c.distancia_m <= v_raio * 3)
    limit 500
  loop
    begin
      update public.checkins set validado_em = r.created_at, metodo_validacao = 'automatico'
      where id = r.id and validado_em is null and cancelado_em is null;
      if r.cupom_id is not null then
        insert into public.cupons_resgatados (cupom_id, user_id) values (r.cupom_id, r.user_id)
        on conflict (cupom_id, user_id) do nothing;
      end if;
      n := n + 1;
    exception when others then
      null;
    end;
  end loop;
  return n;
end;
$$;
grant execute on function public.confirmar_checkins_pendentes() to authenticated;

-- A casa (ou admin) cancela um check-in indevido: a visita e o cupom resgatado voltam atras.
create or replace function public.cancelar_checkin_local(p_checkin_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.checkins;
begin
  select * into v from public.checkins where id = p_checkin_id;
  if v.id is null then
    raise exception 'Check-in não encontrado.';
  end if;
  if not (
    exists (select 1 from public.locais l where l.id = v.local_id and l.owner_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Sem permissão para cancelar check-in deste local.';
  end if;
  update public.checkins set cancelado_em = now(), cancelado_por = auth.uid()
  where id = p_checkin_id and cancelado_em is null;
  if v.cupom_id is not null then
    delete from public.cupons_resgatados where cupom_id = v.cupom_id and user_id = v.user_id;
  end if;
end;
$$;
grant execute on function public.cancelar_checkin_local(uuid) to authenticated;

-- Lista de check-ins do local para a casa (tela "Check-ins" do portal).
create or replace function public.checkins_do_local(p_local_id uuid, p_dias integer default 2)
returns table (
  checkin_id uuid,
  criado_em timestamptz,
  cliente text,
  cupom text,
  metodo text,
  situacao text,
  distancia integer,
  codigo_checkin text
) language plpgsql security definer set search_path = public as $$
begin
  if not (
    exists (select 1 from public.locais l where l.id = p_local_id and l.owner_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Sem permissão para ver os check-ins deste local.';
  end if;
  perform public.confirmar_checkins_pendentes();
  return query
  select c.id, c.created_at, coalesce(pp.display_name, 'Cliente'), cu.titulo, c.metodo_validacao,
         case when c.cancelado_em is not null then 'cancelado'
              when c.validado_em is not null then 'confirmado'
              else 'pendente' end,
         c.distancia_m, c.codigo
  from public.checkins c
  left join public.perfis_publicos pp on pp.id = c.user_id
  left join public.cupons cu on cu.id = c.cupom_id
  where c.local_id = p_local_id
    and c.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_dias, 2), 31)))
  order by c.created_at desc
  limit 300;
end;
$$;
grant execute on function public.checkins_do_local(uuid, integer) to authenticated;

-- OPCIONAL (recomendado depois do lancamento): agendar a confirmacao automatica a cada 30 min.
-- Ative a extensao pg_cron em Database > Extensions e rode:
--   select cron.schedule('confirmar-checkins', '*/30 * * * *', $$select public.confirmar_checkins_pendentes()$$);
