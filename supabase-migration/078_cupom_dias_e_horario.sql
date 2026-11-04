-- 078: Cupom com dia da semana e horario (ex.: "Ter a Qui, ate 21h") para facilitar o check-in.
-- dias_semana: 0 = domingo ... 6 = sabado (null/vazio = todos os dias). Horario de Brasilia.
-- O app mostra a regra e o banco recusa o check-in fora da janela.
alter table public.cupons add column if not exists dias_semana smallint[];
alter table public.cupons add column if not exists hora_inicio time;
alter table public.cupons add column if not exists hora_fim time;

alter table public.cupons drop constraint if exists cupons_dias_semana_valido;
alter table public.cupons add constraint cupons_dias_semana_valido
  check (dias_semana is null or dias_semana <@ array[0,1,2,3,4,5,6]::smallint[]);

create or replace function public.cupom_vale_agora(p_dias smallint[], p_ini time, p_fim time, p_agora timestamptz default now())
returns boolean language sql stable as $$
  with t as (select (p_agora at time zone 'America/Sao_Paulo') as ts)
  select
    (p_dias is null or coalesce(array_length(p_dias, 1), 0) = 0 or extract(dow from t.ts)::smallint = any(p_dias))
    and case
      when p_ini is null and p_fim is null then true
      when p_ini is null then t.ts::time <= p_fim
      when p_fim is null then t.ts::time >= p_ini
      when p_ini <= p_fim then t.ts::time between p_ini and p_fim
      else (t.ts::time >= p_ini or t.ts::time <= p_fim)
    end
  from t;
$$;

-- Mesma funcao da 074, agora recusando cupom fora do dia/horario.
create or replace function public.enforce_checkin_seguro_insert()
returns trigger as $$
declare
  v_cupom public.cupons%rowtype;
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
  new.expira_em := now() + interval '5 minutes';
  new.validado_em := null;
  new.validado_por := null;
  new.cancelado_em := null;
  new.cancelado_por := null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
