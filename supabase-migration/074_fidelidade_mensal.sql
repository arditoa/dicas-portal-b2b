-- ============================================================================
-- 074 — Plano de FIDELIDADE da casa ("a cada 7 visitas no mês, ganhe um brinde")
-- ============================================================================
-- Pedido da Andrea: a casa define a regra (visitas + o que ganha) no portal B2B,
-- a contagem é por visitas dentro do mês, e a casa escolhe se aparece ou não no app.
--
-- Aproveita o que já existia (migration 010): checkins validados = visitas,
-- programas_fidelidade = regra, fidelidade_resgates = brinde entregue.
-- Tudo aditivo; nenhuma linha existente é apagada. Pode rodar inteira de uma vez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1 — colunas novas na regra
-- ----------------------------------------------------------------------------
alter table public.programas_fidelidade
  add column if not exists janela text not null default 'mes';
alter table public.programas_fidelidade
  add column if not exists exibir_no_app boolean not null default true;

do $$ begin
  alter table public.programas_fidelidade
    add constraint programas_fidelidade_janela_valida check (janela in ('mes', 'sempre'));
exception when duplicate_object then null;
end $$;

comment on column public.programas_fidelidade.janela is
  'mes = as visitas contam dentro de cada mês (reinicia todo dia 1º, horário de Brasília, e o cliente ganha no máximo 1 brinde por mês); sempre = acumula sem prazo e reinicia só depois de cada brinde.';
comment on column public.programas_fidelidade.exibir_no_app is
  'A casa decide se o cartão fidelidade aparece no perfil do local no app. Desligado = a regra existe e a casa continua contando visitas, mas o cliente não vê o cartão.';

-- Início do período de contagem (mês corrente em Brasília, ou criação do programa).
create or replace function public.fid_inicio_periodo(p_janela text, p_criado timestamptz)
returns timestamptz language sql stable as $$
  select case when p_janela = 'mes'
    then (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
    else p_criado end;
$$;

-- ----------------------------------------------------------------------------
-- PARTE 2 — contagem de visitas (agora respeita a janela mensal)
-- ----------------------------------------------------------------------------
create or replace function public.contar_visitas_fidelidade(p_programa_id uuid, p_user_id uuid)
returns integer as $$
  select count(*)::integer
  from public.checkins c
  join public.programas_fidelidade p on p.id = p_programa_id
  where c.local_id = p.local_id
    and c.user_id = p_user_id
    and c.validado_em is not null
    and c.cancelado_em is null
    and c.validado_em > greatest(
      public.fid_inicio_periodo(p.janela, p.created_at),
      coalesce(
        (select max(fr.resgatado_em) from public.fidelidade_resgates fr
          where fr.programa_id = p.id and fr.user_id = p_user_id),
        '-infinity'::timestamptz
      )
    );
$$ language sql stable security definer set search_path = public;

grant execute on function public.contar_visitas_fidelidade(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- PARTE 3 — entrega do brinde (mês: no máximo 1 por cliente por mês)
-- ----------------------------------------------------------------------------
create or replace function public.resgatar_fidelidade(p_programa_id uuid, p_user_id uuid)
returns public.fidelidade_resgates as $$
declare
  v_programa public.programas_fidelidade;
  v_visitas integer;
  v_resgates_existentes integer;
  v_resgate public.fidelidade_resgates;
begin
  select * into v_programa from public.programas_fidelidade where id = p_programa_id;
  if v_programa is null then
    raise exception 'Programa de fidelidade não encontrado.';
  end if;

  if not (
    exists (select 1 from public.locais l where l.id = v_programa.local_id and l.owner_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Sem permissão para resgatar fidelidade deste local.';
  end if;

  if not v_programa.ativo then
    raise exception 'Este programa de fidelidade não está mais ativo.';
  end if;
  if v_programa.valido_de is not null and current_date < v_programa.valido_de then
    raise exception 'Este programa de fidelidade ainda não começou.';
  end if;
  if v_programa.valido_ate is not null and current_date > v_programa.valido_ate then
    raise exception 'Este programa de fidelidade já encerrou.';
  end if;

  if v_programa.limite_por_usuario is not null then
    select count(*) into v_resgates_existentes
    from public.fidelidade_resgates where programa_id = p_programa_id and user_id = p_user_id;
    if v_resgates_existentes >= v_programa.limite_por_usuario then
      raise exception 'Este cliente já atingiu o limite de brindes deste programa.';
    end if;
  end if;

  if v_programa.janela = 'mes' and exists (
    select 1 from public.fidelidade_resgates fr
    where fr.programa_id = p_programa_id and fr.user_id = p_user_id
      and fr.resgatado_em >= public.fid_inicio_periodo('mes', v_programa.created_at)
  ) then
    raise exception 'Este cliente já ganhou o brinde deste mês. A contagem recomeça no dia 1º.';
  end if;

  v_visitas := public.contar_visitas_fidelidade(p_programa_id, p_user_id);
  if v_visitas < v_programa.visitas_necessarias then
    raise exception 'Ainda faltam % visita(s) pra liberar esse brinde.', (v_programa.visitas_necessarias - v_visitas);
  end if;

  insert into public.fidelidade_resgates (programa_id, user_id, checkins_contados, validado_por)
  values (p_programa_id, p_user_id, v_visitas, auth.uid())
  returning * into v_resgate;

  return v_resgate;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.resgatar_fidelidade(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- PARTE 4 — progresso do cliente no app (funciona logado ou não)
-- ----------------------------------------------------------------------------
create or replace function public.progresso_fidelidade_local(p_local_id uuid)
returns table (
  programa_id uuid,
  nome text,
  descricao text,
  visitas_necessarias integer,
  recompensa text,
  janela text,
  visitas integer,
  ja_ganhou boolean
) as $$
  select
    p.id, p.nome, p.descricao, p.visitas_necessarias, p.recompensa, p.janela,
    case when auth.uid() is null then 0 else public.contar_visitas_fidelidade(p.id, auth.uid()) end,
    case when auth.uid() is null then false else exists (
      select 1 from public.fidelidade_resgates fr
      where fr.programa_id = p.id and fr.user_id = auth.uid()
        and fr.resgatado_em >= public.fid_inicio_periodo(p.janela, p.created_at)
    ) end
  from public.programas_fidelidade p
  join public.locais l on l.id = p.local_id
  where p.local_id = p_local_id
    and p.ativo and p.exibir_no_app
    and l.status = 'aprovado'
    and (p.valido_de is null or current_date >= p.valido_de)
    and (p.valido_ate is null or current_date <= p.valido_ate);
$$ language sql stable security definer set search_path = public;

grant execute on function public.progresso_fidelidade_local(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- PARTE 5 — painel da casa: clientes e visitas do período
-- ----------------------------------------------------------------------------
create or replace function public.fidelidade_clientes(p_programa_id uuid)
returns table (
  user_id uuid,
  nome text,
  visitas integer,
  ultima_visita timestamptz,
  ja_ganhou boolean
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
    )
  from (
    select c.user_id, max(c.validado_em) as ultima
    from public.checkins c
    where c.local_id = v_programa.local_id
      and c.validado_em is not null and c.cancelado_em is null
      and c.validado_em >= public.fid_inicio_periodo(v_programa.janela, v_programa.created_at)
    group by c.user_id
  ) u
  left join public.perfis_publicos pp on pp.id = u.user_id
  order by 3 desc, u.ultima desc;
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.fidelidade_clientes(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- PARTE 6 — correção do check-in: código vencido não trava mais o cliente por 12h
-- ----------------------------------------------------------------------------
-- Antes: qualquer check-in nas últimas 12h bloqueava um novo, inclusive o que
-- expirou sem ser validado. Agora só bloqueia se já foi validado (visita feita)
-- ou se ainda há um código válido em aberto.
create or replace function public.enforce_checkin_seguro_insert()
returns trigger as $$
begin
  new.user_id := auth.uid();
  if new.user_id is null then
    raise exception 'Check-in exige um usuário autenticado.';
  end if;

  if new.cupom_id is not null and not exists (
    select 1 from public.cupons c
    where c.id = new.cupom_id and c.local_id = new.local_id and c.ativo
  ) then
    raise exception 'Este cupom não existe ou não pertence a este local.';
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
