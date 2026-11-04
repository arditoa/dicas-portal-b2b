-- 081: Cupom e fidelidade andam juntos + contagem de visitas sem teto + nivel VIP.
-- 1) usar_cupom_no_checkin: o cliente faz UM check-in (que ja conta a visita da fidelidade) e escolhe o cupom
--    depois, sem precisar de outro check-in. Cupom primeiro ou fidelidade primeiro: tanto faz.
-- 2) Visitas aparecem de verdade (ex.: 6 visitas no mes, 14 no total), mesmo depois de bater a meta do brinde.
-- 3) Nivel VIP opcional: a casa define "a partir de X visitas = cliente VIP" e o beneficio que oferece.
-- Seguro rodar mais de uma vez.

alter table public.programas_fidelidade add column if not exists visitas_vip integer;
alter table public.programas_fidelidade add column if not exists beneficio_vip text;

do $$ begin
  alter table public.programas_fidelidade
    add constraint programas_fidelidade_vip_valido check (visitas_vip is null or visitas_vip >= 2);
exception when duplicate_object then null;
end $$;

comment on column public.programas_fidelidade.visitas_vip is
  'Opcional: a partir de quantas visitas (na mesma janela do cartao) o cliente e tratado como VIP pela casa.';
comment on column public.programas_fidelidade.beneficio_vip is
  'Opcional: o que a casa oferece ao cliente VIP (texto livre, ex.: mesa reservada e drink de boas-vindas).';

-- Visitas confirmadas no periodo (mes corrente ou desde a criacao do programa), SEM zerar a cada brinde entregue.
create or replace function public.contar_visitas_periodo(p_programa_id uuid, p_user_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer
  from public.checkins c
  join public.programas_fidelidade p on p.id = p_programa_id
  where c.local_id = p.local_id
    and c.user_id = p_user_id
    and c.validado_em is not null
    and c.cancelado_em is null
    and c.validado_em >= public.fid_inicio_periodo(p.janela, p.created_at);
$$;
grant execute on function public.contar_visitas_periodo(uuid, uuid) to authenticated;

-- Progresso do cliente no app (agora com visitas do periodo, total na casa e nivel VIP).
drop function if exists public.progresso_fidelidade_local(uuid);
create function public.progresso_fidelidade_local(p_local_id uuid)
returns table (
  programa_id uuid,
  nome text,
  descricao text,
  visitas_necessarias integer,
  recompensa text,
  janela text,
  visitas integer,
  ja_ganhou boolean,
  visitas_periodo integer,
  visitas_total integer,
  visitas_vip integer,
  beneficio_vip text
) as $$
  select
    p.id, p.nome, p.descricao, p.visitas_necessarias, p.recompensa, p.janela,
    case when auth.uid() is null then 0 else public.contar_visitas_fidelidade(p.id, auth.uid()) end,
    case when auth.uid() is null then false else exists (
      select 1 from public.fidelidade_resgates fr
      where fr.programa_id = p.id and fr.user_id = auth.uid()
        and fr.resgatado_em >= public.fid_inicio_periodo(p.janela, p.created_at)
    ) end,
    case when auth.uid() is null then 0 else public.contar_visitas_periodo(p.id, auth.uid()) end,
    case when auth.uid() is null then 0 else (
      select count(*)::integer from public.checkins c
      where c.local_id = p.local_id and c.user_id = auth.uid()
        and c.validado_em is not null and c.cancelado_em is null
    ) end,
    p.visitas_vip,
    p.beneficio_vip
  from public.programas_fidelidade p
  join public.locais l on l.id = p.local_id
  where p.local_id = p_local_id
    and p.ativo and p.exibir_no_app
    and l.status = 'aprovado'
    and (p.valido_de is null or current_date >= p.valido_de)
    and (p.valido_ate is null or current_date <= p.valido_ate);
$$ language sql stable security definer set search_path = public;
grant execute on function public.progresso_fidelidade_local(uuid) to anon, authenticated;

-- Painel da casa: todos os clientes do periodo com visitas do periodo, total na casa e marca VIP.
drop function if exists public.fidelidade_clientes(uuid);
create function public.fidelidade_clientes(p_programa_id uuid)
returns table (
  user_id uuid,
  nome text,
  visitas integer,
  ultima_visita timestamptz,
  ja_ganhou boolean,
  visitas_periodo integer,
  visitas_total integer,
  vip boolean
) as $$
declare
  v_programa public.programas_fidelidade;
begin
  select * into v_programa from public.programas_fidelidade where id = p_programa_id;
  if v_programa is null then
    raise exception 'Programa de fidelidade não encontrado.';
  end if;
  if not (
    exists (select 1 from public.locais l where l.id = v_programa.local_id and l.owner_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Sem permissão.';
  end if;

  return query
  select
    u.user_id,
    coalesce(pp.display_name, 'Cliente'),
    public.contar_visitas_fidelidade(p_programa_id, u.user_id),
    u.ultima,
    exists (
      select 1 from public.fidelidade_resgates fr
      where fr.programa_id = p_programa_id and fr.user_id = u.user_id
        and fr.resgatado_em >= public.fid_inicio_periodo(v_programa.janela, v_programa.created_at)
    ),
    u.no_periodo,
    u.total,
    (v_programa.visitas_vip is not null and u.no_periodo >= v_programa.visitas_vip)
  from (
    select c.user_id,
           max(c.validado_em) as ultima,
           count(*) filter (where c.validado_em >= public.fid_inicio_periodo(v_programa.janela, v_programa.created_at))::integer as no_periodo,
           count(*)::integer as total
    from public.checkins c
    where c.local_id = v_programa.local_id
      and c.validado_em is not null and c.cancelado_em is null
    group by c.user_id
    having max(c.validado_em) >= public.fid_inicio_periodo(v_programa.janela, v_programa.created_at)
  ) u
  left join public.perfis_publicos pp on pp.id = u.user_id
  order by u.no_periodo desc, u.total desc, u.ultima desc;
end;
$$ language plpgsql stable security definer set search_path = public;
grant execute on function public.fidelidade_clientes(uuid) to authenticated;

-- Cupom no check-in que o cliente JA fez (confirmado ou ainda com codigo valido), sem novo check-in.
create or replace function public.usar_cupom_no_checkin(p_cupom_id uuid)
returns public.checkins language plpgsql security definer set search_path = public as $$
declare
  v_cupom public.cupons%rowtype;
  v_ck public.checkins;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para usar o cupom.';
  end if;

  select * into v_cupom from public.cupons c
  where c.id = p_cupom_id and c.ativo
    and (c.valido_de is null or c.valido_de <= now())
    and (c.valido_ate is null or c.valido_ate >= now());
  if not found then
    raise exception 'Este cupom não existe ou não está mais disponível.';
  end if;
  if not public.cupom_vale_agora(v_cupom.dias_semana, v_cupom.hora_inicio, v_cupom.hora_fim) then
    raise exception 'Este cupom só vale em outros dias ou horários. Veja as regras no cupom.';
  end if;

  select * into v_ck from public.checkins c
  where c.local_id = v_cupom.local_id
    and c.user_id = auth.uid()
    and c.created_at > now() - interval '12 hours'
    and c.cancelado_em is null
  order by c.created_at desc
  limit 1
  for update;
  if not found then
    raise exception 'Faça o check-in neste local primeiro.';
  end if;
  if v_ck.cupom_id is not null then
    raise exception 'Seu check-in de hoje já está ligado a um cupom.';
  end if;
  if v_ck.validado_em is null and v_ck.expira_em < now() then
    raise exception 'O código do seu check-in expirou. Faça um novo check-in.';
  end if;

  update public.checkins set cupom_id = p_cupom_id where id = v_ck.id returning * into v_ck;

  -- Confirmado (pela localizacao, pela casa ou no fim da noite): o cupom ja e liberado agora.
  -- Pendente: o cupom e liberado quando o check-in for confirmado (mesmo caminho do cupom escolhido no check-in).
  if v_ck.validado_em is not null then
    insert into public.cupons_resgatados (cupom_id, user_id) values (p_cupom_id, v_ck.user_id)
    on conflict (cupom_id, user_id) do nothing;
  end if;
  return v_ck;
end;
$$;
grant execute on function public.usar_cupom_no_checkin(uuid) to authenticated;
