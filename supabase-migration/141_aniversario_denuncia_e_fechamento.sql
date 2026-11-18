-- 141 — Aniversariantes, denúncia ligada ao selo e fechamento da noite (16/11/2026). Rode depois da 140.
-- Seguro rodar mais de uma vez. Usa enviar_push_expo (135) e o selo (136).
--
-- 1) ANIVERSÁRIO NA CASA: a casa liga uma vez ("drink grátis no seu aniversário"). Quem já esteve na casa (90 dias)
--    e faz aniversário vê o presente no app (Conta/Home) por alguns dias e pega na casa mostrando o vale.
--    No dia do aniversário, às 11h, a pessoa recebe UMA notificação (só se ligou avisos de cupons/ofertas).
--    A casa vê só números (aniversariantes do mês, presentes pegos). Nunca a lista de nomes ou datas.
-- 2) DENÚNCIA → SELO: a equipe Dicas vincula a denúncia (ocorrência) a uma casa e marca "LGBTfobia confirmada".
--    Com denúncia confirmada nos últimos 12 meses e não resolvida, a casa perde o selo Lugar seguro.
--    Quando a casa mostra o que fez (treinou a equipe, afastou o funcionário etc.), a equipe marca "resolvida" e o selo volta.
--    Quem denunciou nunca é identificado para a casa.
-- 3) FECHAMENTO DA NOITE: às 6h, notificação para quem cuida da casa com o resumo da noite anterior
--    (pessoas, ingressos, check-ins, pico de chegada, nota de segurança, pedidos de ajuda). Tela no Modo parceiro.

-- 1) Aniversário ------------------------------------------------------------------------------------------
create table if not exists public.aniversario_casa (
  local_id uuid primary key references public.locais(id) on delete cascade,
  ativo boolean not null default true,
  presente text not null check (char_length(presente) between 2 and 60),
  regra text check (regra is null or char_length(regra) <= 120),
  dias integer not null default 7 check (dias between 0 and 30),  -- vale do aniversário até N dias depois
  atualizado_em timestamptz not null default now()
);
alter table public.aniversario_casa enable row level security;
drop policy if exists aniversario_casa_le on public.aniversario_casa;
create policy aniversario_casa_le on public.aniversario_casa for select using (true);
drop policy if exists aniversario_casa_gerencia on public.aniversario_casa;
create policy aniversario_casa_gerencia on public.aniversario_casa for all
  using (public.is_admin() or public.pode_no_local(local_id, 'cupons'))
  with check (public.is_admin() or public.pode_no_local(local_id, 'cupons'));

create table if not exists public.aniversario_resgates (
  local_id uuid not null references public.locais(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ano integer not null,
  pego_em timestamptz not null default now(),
  primary key (local_id, user_id, ano)
);
alter table public.aniversario_resgates enable row level security;
drop policy if exists aniversario_resgates_dono on public.aniversario_resgates;
create policy aniversario_resgates_dono on public.aniversario_resgates for select using (user_id = auth.uid());

-- Aniversário deste ano (29/02 vira 28/02 em ano não bissexto)
create or replace function public.aniversario_no_ano(p_nasc date, p_ano integer)
returns date language sql immutable as $$
  select make_date(p_ano, extract(month from p_nasc)::int,
    least(extract(day from p_nasc)::int, extract(day from (make_date(p_ano, extract(month from p_nasc)::int, 1) + interval '1 month - 1 day'))::int));
$$;

-- Presentes que a pessoa pode pegar agora (do aniversário até N dias depois)
create or replace function public.meus_presentes_aniversario()
returns jsonb language sql stable security definer set search_path = public as $$
  with eu as (
    select p.id, p.birth_date, (now() at time zone 'America/Sao_Paulo')::date as hoje from public.profiles p where p.id = auth.uid() and p.birth_date is not null
  ), niver as (
    select eu.*, public.aniversario_no_ano(eu.birth_date, extract(year from eu.hoje)::int) as dia from eu
  )
  select coalesce(jsonb_agg(jsonb_build_object('local_id', a.local_id, 'casa', l.nome, 'presente', a.presente, 'regra', a.regra,
           'ate', n.dia + a.dias, 'pego_em', r.pego_em) order by l.nome), '[]'::jsonb)
    from niver n
    join public.aniversario_casa a on a.ativo
    join public.locais l on l.id = a.local_id and l.status = 'aprovado'
    left join public.aniversario_resgates r on r.local_id = a.local_id and r.user_id = n.id and r.ano = extract(year from n.dia)::int
   where n.hoje between n.dia and n.dia + a.dias
     and public.esteve_na_casa(n.id, a.local_id);
$$;
revoke execute on function public.meus_presentes_aniversario() from public, anon;
grant execute on function public.meus_presentes_aniversario() to authenticated;

-- Pegar o presente (gera o vale que a pessoa mostra na casa)
create or replace function public.pegar_presente_aniversario(p_local uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ok boolean; v_ano int := extract(year from (now() at time zone 'America/Sao_Paulo'))::int; r public.aniversario_resgates;
begin
  select exists (select 1 from jsonb_array_elements(public.meus_presentes_aniversario()) x where (x->>'local_id')::uuid = p_local) into v_ok;
  if not v_ok then raise exception 'Este presente não está disponível para você agora.' using errcode = '42501'; end if;
  insert into public.aniversario_resgates (local_id, user_id, ano) values (p_local, auth.uid(), v_ano) on conflict do nothing;
  select * into r from public.aniversario_resgates where local_id = p_local and user_id = auth.uid() and ano = v_ano;
  return jsonb_build_object('pego_em', r.pego_em, 'nome', public.primeiro_nome(auth.uid()));
end; $$;
revoke execute on function public.pegar_presente_aniversario(uuid) from public, anon;
grant execute on function public.pegar_presente_aniversario(uuid) to authenticated;

-- Para a casa: só números do mês
create or replace function public.aniversarios_da_casa(p_local uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_mes int := extract(month from (now() at time zone 'America/Sao_Paulo'))::int; v_ano int := extract(year from (now() at time zone 'America/Sao_Paulo'))::int;
begin
  if not (public.is_admin() or public.pode_no_local(p_local, 'cupons') or public.pode_no_local(p_local, 'resultados')) then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'clientes_aniversariantes_mes', public.rel_n((select count(*) from public.profiles p
        where p.birth_date is not null and extract(month from p.birth_date) = v_mes and public.esteve_na_casa(p.id, p_local))),
    'presentes_pegos_mes', (select count(*) from public.aniversario_resgates r
        where r.local_id = p_local and r.ano = v_ano and extract(month from r.pego_em at time zone 'America/Sao_Paulo') = v_mes),
    'presentes_pegos_ano', (select count(*) from public.aniversario_resgates r where r.local_id = p_local and r.ano = v_ano));
end; $$;
revoke execute on function public.aniversarios_da_casa(uuid) from public, anon;
grant execute on function public.aniversarios_da_casa(uuid) to authenticated;

-- Aviso no dia (11h): só para quem tem presente e ligou avisos de cupons/ofertas
create or replace function public.avisar_aniversariantes()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; tokens text[]; n int := 0; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  for r in
    select p.id, count(*) as casas, min(l.nome) as uma
      from public.profiles p
      join public.aniversario_casa a on a.ativo
      join public.locais l on l.id = a.local_id and l.status = 'aprovado'
     where p.birth_date is not null and public.aniversario_no_ano(p.birth_date, extract(year from hoje)::int) = hoje
       and public.esteve_na_casa(p.id, a.local_id)
     group by p.id
  loop
    if exists (select 1 from public.lembretes_enviados where chave = 'niver:' || r.id || ':' || hoje) then continue; end if;
    select array_agg(distinct d.token) into tokens from public.push_dispositivos d join public.push_preferencias pp on pp.user_id = d.user_id
     where d.user_id = r.id and d.ativo and pp.cupons;
    if tokens is not null then
      perform public.enviar_push_expo(tokens, 'Feliz aniversário! 🎂',
        case when r.casas = 1 then 'O ' || r.uma || ' tem um presente para você. Toque para ver.' else r.casas || ' casas têm presente para você. Toque para ver.' end,
        '/(tabs)/profile', 'cupons');
      n := n + 1;
    end if;
    insert into public.lembretes_enviados (chave) values ('niver:' || r.id || ':' || hoje) on conflict do nothing;
  end loop;
  return n;
end; $$;
revoke all on function public.avisar_aniversariantes() from public, anon, authenticated;

-- 2) Denúncia ligada ao selo ------------------------------------------------------------------------------
alter table public.ocorrencias add column if not exists local_id uuid references public.locais(id) on delete set null;
alter table public.ocorrencias add column if not exists lgbtfobia_confirmada boolean not null default false;
alter table public.ocorrencias add column if not exists resolvida_pela_casa_em timestamptz;
alter table public.ocorrencias add column if not exists resolucao_casa text check (resolucao_casa is null or char_length(resolucao_casa) <= 500);
create index if not exists ocorrencias_local_idx on public.ocorrencias(local_id) where local_id is not null;

create or replace function public.selo_suspenso(p_local uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ocorrencias o where o.local_id = p_local and o.lgbtfobia_confirmada
                    and o.resolvida_pela_casa_em is null and o.created_at > now() - interval '12 months');
$$;
grant execute on function public.selo_suspenso(uuid) to anon, authenticated;

create or replace function public.selo_lugar_seguro(p_local uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'respostas', count(*),
    'suspenso', public.selo_suspenso(p_local),
    'tem_selo', not public.selo_suspenso(p_local) and count(*) >= 10 and avg((acolhimento + saida + equipe) / 3.0) >= 4.3 and least(avg(acolhimento), avg(saida), avg(equipe)) >= 4.0,
    'media', case when count(*) >= 5 then round(avg((acolhimento + saida + equipe) / 3.0), 1) end,
    'acolhimento', case when count(*) >= 5 then round(avg(acolhimento), 1) end,
    'saida', case when count(*) >= 5 then round(avg(saida), 1) end,
    'equipe', case when count(*) >= 5 then round(avg(equipe), 1) end)
    from public.avaliacoes_seguranca where local_id = p_local and not pulada and created_at > now() - interval '12 months';
$$;
grant execute on function public.selo_lugar_seguro(uuid) to anon, authenticated;

create or replace function public.locais_com_selo()
returns setof uuid language sql stable security definer set search_path = public as $$
  select local_id from public.avaliacoes_seguranca where not pulada and created_at > now() - interval '12 months'
   group by local_id
  having count(*) >= 10 and avg((acolhimento + saida + equipe) / 3.0) >= 4.3 and least(avg(acolhimento), avg(saida), avg(equipe)) >= 4.0
     and not public.selo_suspenso(local_id);
$$;
grant execute on function public.locais_com_selo() to anon, authenticated;

-- A equipe vincula a denúncia à casa e confirma; avisa a casa SEM identificar quem denunciou
create or replace function public.admin_ocorrencia_casa(p_ocorrencia uuid, p_local uuid, p_confirmada boolean)
returns void language plpgsql security definer set search_path = public as $$
declare o public.ocorrencias; tokens text[];
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  select * into o from public.ocorrencias where id = p_ocorrencia;
  update public.ocorrencias set local_id = p_local, lgbtfobia_confirmada = coalesce(p_confirmada, false) where id = p_ocorrencia;
  insert into public.ocorrencia_historico (ocorrencia_id, autor_id, autor_papel, acao, texto, visivel_usuario)
  values (p_ocorrencia, auth.uid(), 'equipe', 'nota_interna',
          case when p_local is null then 'Casa desvinculada.' when p_confirmada then 'LGBTfobia confirmada e vinculada à casa: o selo Lugar seguro fica suspenso até a casa resolver.' else 'Vinculada à casa (sem confirmação).' end, false);
  if p_confirmada and p_local is not null and not coalesce(o.lgbtfobia_confirmada, false) then
    tokens := public.tokens_da_casa(p_local);
    if tokens is not null then
      perform public.enviar_push_expo(tokens, 'Selo Lugar seguro suspenso',
        'A equipe Dicas confirmou uma denúncia de LGBTfobia na casa. Fale com a gente para entender e recuperar o selo.', '/parceiro', 'lembretes');
    end if;
  end if;
end; $$;
revoke execute on function public.admin_ocorrencia_casa(uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_ocorrencia_casa(uuid, uuid, boolean) to authenticated;

create or replace function public.admin_ocorrencia_resolvida_casa(p_ocorrencia uuid, p_resolucao text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Só a equipe Dicas.' using errcode = '42501'; end if;
  update public.ocorrencias set resolvida_pela_casa_em = now(), resolucao_casa = left(nullif(trim(p_resolucao), ''), 500) where id = p_ocorrencia;
  insert into public.ocorrencia_historico (ocorrencia_id, autor_id, autor_papel, acao, texto, visivel_usuario)
  values (p_ocorrencia, auth.uid(), 'equipe', 'nota_interna', 'A casa resolveu: ' || coalesce(nullif(trim(p_resolucao), ''), '(sem detalhe)'), false);
end; $$;
revoke execute on function public.admin_ocorrencia_resolvida_casa(uuid, text) from public, anon;
grant execute on function public.admin_ocorrencia_resolvida_casa(uuid, text) to authenticated;

-- A casa vê se o selo está suspenso (sem detalhe da denúncia)
create or replace function public.situacao_selo_da_casa(p_local uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.pode_no_local(p_local, 'resultados') or exists (select 1 from public.locais where id = p_local and owner_id = auth.uid())) then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;
  return public.selo_lugar_seguro(p_local);
end; $$;
revoke execute on function public.situacao_selo_da_casa(uuid) from public, anon;
grant execute on function public.situacao_selo_da_casa(uuid) to authenticated;

-- 3) Fechamento da noite ----------------------------------------------------------------------------------
-- A "noite" de um dia vai das 14h desse dia às 10h do dia seguinte (horário de Brasília).
create or replace function public.fechamento_da_noite(p_local uuid, p_dia date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_dia date := coalesce(p_dia, (now() at time zone 'America/Sao_Paulo')::date - 1);
  v_ini timestamptz := (v_dia::timestamp + interval '14 hours') at time zone 'America/Sao_Paulo';
  v_fim timestamptz := (v_dia::timestamp + interval '34 hours') at time zone 'America/Sao_Paulo';
  v_pico jsonb;
begin
  if not (public.is_admin() or public.pode_no_local(p_local, 'resultados') or public.pode_no_local(p_local, 'porta')
          or exists (select 1 from public.locais where id = p_local and owner_id = auth.uid())) then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;
  select jsonb_build_object('hora', h, 'n', n) into v_pico from (
    select extract(hour from q at time zone 'America/Sao_Paulo')::int as h, count(*) as n from (
      select validado_em as q from public.checkins where local_id = p_local and validado_em >= v_ini and validado_em < v_fim and cancelado_em is null
      union all select i.usado_em from public.ingressos i join public.eventos e on e.id = i.evento_id where e.local_id = p_local and i.usado_em >= v_ini and i.usado_em < v_fim
      union all select criado_em from public.termometro_sinais where local_id = p_local and criado_em >= v_ini and criado_em < v_fim
    ) x group by 1 order by 2 desc limit 1) t;
  return jsonb_build_object(
    'dia', v_dia,
    'pessoas', (select count(distinct u) from (
        select user_id u from public.checkins where local_id = p_local and coalesce(validado_em, created_at) >= v_ini and coalesce(validado_em, created_at) < v_fim and cancelado_em is null
        union select i.user_id from public.ingressos i join public.eventos e on e.id = i.evento_id where e.local_id = p_local and i.usado_em >= v_ini and i.usado_em < v_fim
        union select user_id from public.termometro_sinais where local_id = p_local and criado_em >= v_ini and criado_em < v_fim
        union select user_id from public.acoes_marca_presencas where local_id = p_local and created_at >= v_ini and created_at < v_fim) z),
    'checkins', (select count(*) from public.checkins where local_id = p_local and validado_em >= v_ini and validado_em < v_fim and cancelado_em is null),
    'ingressos_entraram', (select count(*) from public.ingressos i join public.eventos e on e.id = i.evento_id where e.local_id = p_local and i.usado_em >= v_ini and i.usado_em < v_fim),
    'ingressos_vendidos_hoje', (select count(*) from public.ingressos i join public.ingresso_pedidos p on p.id = i.pedido_id
        where p.local_id = p_local and p.status = 'pago' and p.pago_em >= v_ini and p.pago_em < v_fim and not i.cortesia),
    'vendas_centavos', (select coalesce(sum(subtotal_centavos), 0) from public.ingresso_pedidos where local_id = p_local and status = 'pago' and pago_em >= v_ini and pago_em < v_fim),
    'cupons_usados', (select count(*) from public.cupons_resgatados r join public.cupons c on c.id = r.cupom_id where c.local_id = p_local and r.resgatado_em >= v_ini and r.resgatado_em < v_fim),
    'estou_aqui', (select count(distinct user_id) from public.termometro_sinais where local_id = p_local and criado_em >= v_ini and criado_em < v_fim),
    'pedidos_de_ajuda', (select count(*) from public.alertas_ajuda where local_id = p_local and criado_em >= v_ini and criado_em < v_fim),
    'ajuda_atendida', (select count(*) from public.alertas_ajuda where local_id = p_local and criado_em >= v_ini and criado_em < v_fim and status <> 'aberto'),
    'presentes_aniversario', (select count(*) from public.aniversario_resgates where local_id = p_local and pego_em >= v_ini and pego_em < v_fim),
    'pico', v_pico,
    'selo', public.selo_lugar_seguro(p_local));
end; $$;
revoke execute on function public.fechamento_da_noite(uuid, date) from public, anon;
grant execute on function public.fechamento_da_noite(uuid, date) to authenticated;

-- Às 6h: notificação com o resumo para as casas que tiveram movimento (uma vez por noite)
create or replace function public.enviar_fechamentos_da_noite()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; tokens text[]; n int := 0; v_dia date := (now() at time zone 'America/Sao_Paulo')::date - 1;
  v_ini timestamptz := (v_dia::timestamp + interval '14 hours') at time zone 'America/Sao_Paulo'; v_fim timestamptz := v_ini + interval '20 hours';
  v_p int; v_ing int; v_pico int;
begin
  for r in
    select l.id, l.nome from public.locais l where l.owner_id is not null and l.status = 'aprovado' and (
      exists (select 1 from public.checkins c where c.local_id = l.id and c.validado_em >= v_ini and c.validado_em < v_fim)
      or exists (select 1 from public.ingressos i join public.eventos e on e.id = i.evento_id where e.local_id = l.id and i.usado_em >= v_ini and i.usado_em < v_fim)
      or exists (select 1 from public.termometro_sinais t where t.local_id = l.id and t.criado_em >= v_ini and t.criado_em < v_fim))
  loop
    if exists (select 1 from public.lembretes_enviados where chave = 'fechamento:' || r.id || ':' || v_dia) then continue; end if;
    select count(distinct u) into v_p from (
      select user_id u from public.checkins where local_id = r.id and validado_em >= v_ini and validado_em < v_fim
      union select i.user_id from public.ingressos i join public.eventos e on e.id = i.evento_id where e.local_id = r.id and i.usado_em >= v_ini and i.usado_em < v_fim
      union select user_id from public.termometro_sinais where local_id = r.id and criado_em >= v_ini and criado_em < v_fim) z;
    select count(*) into v_ing from public.ingressos i join public.eventos e on e.id = i.evento_id where e.local_id = r.id and i.usado_em >= v_ini and i.usado_em < v_fim;
    tokens := public.tokens_da_casa(r.id);
    if tokens is not null then
      perform public.enviar_push_expo(tokens, 'Fechamento da noite · ' || r.nome,
        v_p || ' pessoa(s) registradas pelo app' || case when v_ing > 0 then ', ' || v_ing || ' entraram com ingresso' else '' end || '. Toque para ver tudo.',
        '/parceiro/fechamento', 'lembretes');
      n := n + 1;
    end if;
    insert into public.lembretes_enviados (chave, local_id) values ('fechamento:' || r.id || ':' || v_dia, r.id) on conflict do nothing;
  end loop;
  return n;
end; $$;
revoke all on function public.enviar_fechamentos_da_noite() from public, anon, authenticated;

-- Agendamentos: fechamento 6h (09:00 UTC) e aniversários 11h (14:00 UTC)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('fechamento-da-noite-6h', 'aniversariantes-11h');
    perform cron.schedule('fechamento-da-noite-6h', '0 9 * * *', 'select public.enviar_fechamentos_da_noite()');
    perform cron.schedule('aniversariantes-11h', '0 14 * * *', 'select public.avisar_aniversariantes()');
    raise notice 'Agendado: fechamento da noite 6h e aniversariantes 11h.';
  else
    raise notice 'pg_cron desligado: ligue em Database › Extensions e rode esta migração de novo.';
  end if;
end $$;
