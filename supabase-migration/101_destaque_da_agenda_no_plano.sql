-- 101 — Regra nova (Andrea, 13/11/2026): os 4 destaques por mês do Premium/Fundador valem também para a
-- AGENDA DA SEMANA, não só para festas. Um bar sem festa própria usa os mesmos 4 para destacar a programação.
--
-- Como fica:
--   * É UMA cota só: 4 por mês somando festas do plano + destaques da agenda (mês da data destacada, Brasília).
--   * Dia da agenda (tipo 'dia'): destaca UMA data (se a linha repete toda semana, escolhe qual data).
--     Aparece no topo de Eventos da ativação até o fim daquele dia.
--   * Cartaz da semana (tipo 'semana'): destaca a semana inteira (segunda a domingo) e conta como 1.
--   * Só o dono liga/desliga (igual à festa do plano); a equipe Dicas também, pelo /admin (sem limite).
--   * Com foto, o cartão mostra só a foto (igual às festas); sem foto, ícone + nome.
-- Seguro rodar mais de uma vez. Rode depois da 093 e da 100.

create table if not exists public.destaques_agenda (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null references public.agenda_semanal(id) on delete cascade,
  local_id uuid not null references public.locais(id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  criado_por uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (agenda_id, data_inicio),
  check (data_fim >= data_inicio and data_fim - data_inicio <= 6)
);
create index if not exists idx_destaques_agenda_periodo on public.destaques_agenda (data_fim, data_inicio);
alter table public.destaques_agenda enable row level security;

-- Público lê só os que ainda estão no ar (o app monta a faixa "Em destaque" de Eventos).
drop policy if exists destaques_agenda_select on public.destaques_agenda;
create policy destaques_agenda_select on public.destaques_agenda
  for select using (data_fim >= (now() at time zone 'America/Sao_Paulo')::date or public.is_admin()
                    or exists (select 1 from public.locais l where l.id = destaques_agenda.local_id and l.owner_id = auth.uid()));
-- Escrita só pela função abaixo (security definer). Sem policy de insert/update/delete.

-- Cota única: festas do plano + destaques da agenda no mês. (Mantém o nome usado pelo portal e pela 093,
-- assim o "Usadas X de 4" do portal e o limite de destacar_festa_do_plano passam a contar os dois.)
create or replace function public.festas_do_plano_no_mes(p_local uuid, p_data timestamptz)
returns integer
language sql stable security definer set search_path = public
as $$
  select (
    select count(*) from public.eventos e
     where e.local_id = p_local
       and 'plano_festa' = any(e.destaque_secoes)
       and e.status <> 'cancelado'
       and date_trunc('month', e.data_inicio at time zone 'America/Sao_Paulo')
         = date_trunc('month', p_data at time zone 'America/Sao_Paulo')
  )::int + (
    select count(*) from public.destaques_agenda d
     where d.local_id = p_local
       and date_trunc('month', d.data_inicio::timestamp) = date_trunc('month', p_data at time zone 'America/Sao_Paulo')
  )::int;
$$;
grant execute on function public.festas_do_plano_no_mes(uuid, timestamptz) to authenticated;

-- Liga/desliga o destaque de um item da agenda.
--   p_data: para 'dia', a data a destacar (obrigatória se a linha repete toda semana); para 'semana', ignorada.
drop function if exists public.destacar_agenda_do_plano(uuid, date, boolean);
create function public.destacar_agenda_do_plano(p_agenda uuid, p_data date, p_ligar boolean)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  a record;
  v_ini date;
  v_fim date;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  usadas int;
  limite constant int := 4;
begin
  select ag.id, ag.local_id, ag.tipo, ag.data, ag.dia_semana, ag.ativo into a
    from public.agenda_semanal ag where ag.id = p_agenda;
  if a.id is null then raise exception 'Item da agenda não encontrado.'; end if;
  if not public.is_admin() and not exists (select 1 from public.locais l where l.id = a.local_id and l.owner_id = auth.uid()) then
    raise exception 'Só o dono do local pode destacar a agenda.' using errcode = '42501';
  end if;

  if a.tipo = 'semana' then
    v_ini := coalesce(a.data, p_data);
    if v_ini is null then raise exception 'Escolha a semana do cartaz.'; end if;
    v_ini := v_ini - ((extract(isodow from v_ini)::int) - 1);  -- segunda-feira
    v_fim := v_ini + 6;
  else
    v_ini := coalesce(a.data, p_data);
    if v_ini is null then raise exception 'Escolha a data que quer destacar.'; end if;
    if a.data is null and extract(dow from v_ini)::int <> a.dia_semana then
      raise exception 'Essa data não cai no dia desta programação.';
    end if;
    v_fim := v_ini;
  end if;

  if not p_ligar then
    delete from public.destaques_agenda where agenda_id = p_agenda and data_inicio = v_ini;
    return json_build_object('ok', true, 'usadas', public.festas_do_plano_no_mes(a.local_id, v_ini::timestamp at time zone 'America/Sao_Paulo'), 'limite', limite);
  end if;

  if a.ativo is false then raise exception 'Este item da agenda está desligado.'; end if;
  if v_fim < v_hoje then raise exception 'Essa data já passou.'; end if;
  if not public.marca_tem_festa_do_plano(a.local_id) then
    raise exception 'Destaque do plano é para Fundador ou Premium.';
  end if;
  if exists (select 1 from public.destaques_agenda where agenda_id = p_agenda and data_inicio = v_ini) then
    return json_build_object('ok', true, 'usadas', public.festas_do_plano_no_mes(a.local_id, v_ini::timestamp at time zone 'America/Sao_Paulo'), 'limite', limite);
  end if;
  usadas := public.festas_do_plano_no_mes(a.local_id, v_ini::timestamp at time zone 'America/Sao_Paulo');
  if usadas >= limite and not public.is_admin() then
    raise exception 'Seu plano já usou os % destaques deste mês.', limite;
  end if;

  insert into public.destaques_agenda (agenda_id, local_id, data_inicio, data_fim) values (p_agenda, a.local_id, v_ini, v_fim);
  return json_build_object('ok', true, 'usadas', usadas + 1, 'limite', limite);
end;
$$;
revoke all on function public.destacar_agenda_do_plano(uuid, date, boolean) from public, anon;
grant execute on function public.destacar_agenda_do_plano(uuid, date, boolean) to authenticated;
