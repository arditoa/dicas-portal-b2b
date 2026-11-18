-- 136 — Segurança do público LGBT+ (16/11/2026). Rode depois da 135 (usa enviar_push_expo e o pg_cron).
-- Seguro rodar mais de uma vez.
--
-- 1) Contatos de confiança (até 3 por pessoa).
-- 2) "Cheguei bem": a pessoa avisa que está voltando, manda o link para os amigos e confirma quando chega.
--    Se não confirmar até 10 min depois do horário, quem acompanha pelo app recebe alerta e o link mostra "ainda não confirmou".
-- 3) "Me ajuda aqui": pedido de ajuda silencioso para a equipe da casa onde a pessoa está (só quem esteve na casa nas últimas 12h).
-- 4) Selo "Lugar seguro": 3 perguntas depois da visita (acolhimento, saída, equipe). Selo com 10+ respostas em 12 meses,
--    média geral 4,3+ e nenhuma das três abaixo de 4,0.
-- 5) Termômetro da noite: "Estou aqui agora" (sem benefício, conferido pela localização) + lotação, fila e clima.
--    Mostra só contagens e médias, nunca quem está.
-- Emergência (190 e Disque 100) é só no app: não existe API para avisar a polícia; quem liga é a pessoa.

-- Sinais do Termômetro da noite (criada antes porque as regras de visita usam)
create table if not exists public.termometro_sinais (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  local_id uuid not null references public.locais(id) on delete cascade,
  criado_em timestamptz not null default now(),
  lotacao smallint check (lotacao between 1 and 3),   -- 1 tranquilo · 2 bom · 3 lotado
  fila smallint check (fila between 1 and 3),         -- 1 sem fila · 2 fila curta · 3 fila grande
  clima smallint check (clima between 1 and 3)        -- 1 morno · 2 animado · 3 bombando
);
create index if not exists termometro_sinais_local_idx on public.termometro_sinais(local_id, criado_em desc);
create index if not exists termometro_sinais_user_idx on public.termometro_sinais(user_id, criado_em desc);
alter table public.termometro_sinais enable row level security;
drop policy if exists termometro_sinais_dono_le on public.termometro_sinais;
create policy termometro_sinais_dono_le on public.termometro_sinais for select using (user_id = auth.uid());


-- Nome curto para mostrar a amigos e à equipe da casa (primeiro nome do nome social ou do nome)
create or replace function public.primeiro_nome(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(split_part(trim(coalesce(nullif(p.social_name, ''), p.full_name)), ' ', 1), ''), 'Alguém')
    from public.profiles p where p.id = p_user;
$$;
revoke all on function public.primeiro_nome(uuid) from public, anon, authenticated;

-- Distância em metros
create or replace function public.distancia_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

-- Tokens dos aparelhos de quem trabalha na casa (dono + equipe com acesso válido, porta incluída)
create or replace function public.tokens_da_casa(p_local uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select array_agg(distinct d.token) from public.push_dispositivos d
   where d.ativo and (d.user_id = (select owner_id from public.locais where id = p_local)
      or d.user_id in (select q.user_id from public.local_equipe q where q.local_id = p_local and (q.expira_em is null or q.expira_em > now())));
$$;
revoke all on function public.tokens_da_casa(uuid) from public, anon, authenticated;

create or replace function public.tokens_do_usuario(p_user uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select array_agg(distinct token) from public.push_dispositivos where ativo and user_id = p_user;
$$;
revoke all on function public.tokens_do_usuario(uuid) from public, anon, authenticated;

-- 1) Contatos de confiança --------------------------------------------------------------------------------
create table if not exists public.seguranca_contatos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 40),
  telefone text not null check (telefone ~ '^[0-9]{10,13}$'),
  created_at timestamptz not null default now()
);
create index if not exists seguranca_contatos_user_idx on public.seguranca_contatos(user_id);
alter table public.seguranca_contatos enable row level security;
drop policy if exists seguranca_contatos_dono on public.seguranca_contatos;
create policy seguranca_contatos_dono on public.seguranca_contatos for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.limite_contatos_seguranca() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.seguranca_contatos where user_id = new.user_id) >= 3 then
    raise exception 'Você pode ter até 3 contatos de confiança.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
drop trigger if exists seguranca_contatos_limite on public.seguranca_contatos;
create trigger seguranca_contatos_limite before insert on public.seguranca_contatos for each row execute function public.limite_contatos_seguranca();

-- 2) Cheguei bem ------------------------------------------------------------------------------------------
create table if not exists public.voltas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(9), 'hex'),
  local_id uuid references public.locais(id) on delete set null,
  previsao timestamptz not null,
  status text not null default 'a_caminho' check (status in ('a_caminho', 'atrasada', 'chegou', 'cancelada')),
  lat double precision, lng double precision, loc_em timestamptz,
  criada_em timestamptz not null default now(),
  chegou_em timestamptz,
  alertada_em timestamptz
);
create index if not exists voltas_ativas_idx on public.voltas(previsao) where status in ('a_caminho', 'atrasada');
create index if not exists voltas_user_idx on public.voltas(user_id, criada_em desc);
alter table public.voltas enable row level security;
drop policy if exists voltas_dono_le on public.voltas;
create policy voltas_dono_le on public.voltas for select using (user_id = auth.uid());

create table if not exists public.voltas_acompanhantes (
  volta_id uuid not null references public.voltas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (volta_id, user_id)
);
alter table public.voltas_acompanhantes enable row level security;  -- só funções

create or replace function public.iniciar_volta(p_minutos integer, p_local uuid default null, p_lat double precision default null, p_lng double precision default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.voltas;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if p_minutos is null or p_minutos < 10 or p_minutos > 240 then raise exception 'Escolha entre 10 minutos e 4 horas.' using errcode = '22023'; end if;
  update public.voltas set status = 'cancelada' where user_id = auth.uid() and status in ('a_caminho', 'atrasada');
  insert into public.voltas (user_id, local_id, previsao, lat, lng, loc_em)
  values (auth.uid(), p_local, now() + make_interval(mins => p_minutos), p_lat, p_lng, case when p_lat is not null then now() end)
  returning * into v;
  return jsonb_build_object('id', v.id, 'token', v.token, 'previsao', v.previsao);
end; $$;

create or replace function public.minha_volta_ativa()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(x) from (select v.id, v.token, v.previsao, v.status, v.local_id, l.nome as local_nome
    from public.voltas v left join public.locais l on l.id = v.local_id
   where v.user_id = auth.uid() and v.status in ('a_caminho', 'atrasada') and v.previsao > now() - interval '12 hours'
   order by v.criada_em desc limit 1) x;
$$;

create or replace function public.atualizar_local_volta(p_lat double precision, p_lng double precision)
returns void language sql security definer set search_path = public as $$
  update public.voltas set lat = p_lat, lng = p_lng, loc_em = now()
   where user_id = auth.uid() and status in ('a_caminho', 'atrasada');
$$;

create or replace function public.estender_volta(p_minutos integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.voltas;
begin
  if p_minutos is null or p_minutos < 5 or p_minutos > 120 then raise exception 'Escolha entre 5 minutos e 2 horas.' using errcode = '22023'; end if;
  update public.voltas set previsao = greatest(previsao, now()) + make_interval(mins => p_minutos), status = 'a_caminho', alertada_em = null
   where user_id = auth.uid() and status in ('a_caminho', 'atrasada') returning * into v;
  if v.id is null then raise exception 'Nenhuma volta ativa.' using errcode = 'P0002'; end if;
  return jsonb_build_object('id', v.id, 'token', v.token, 'previsao', v.previsao);
end; $$;

create or replace function public.cheguei_bem()
returns boolean language plpgsql security definer set search_path = public as $$
declare v public.voltas; tokens text[];
begin
  update public.voltas set status = 'chegou', chegou_em = now(), lat = null, lng = null
   where user_id = auth.uid() and status in ('a_caminho', 'atrasada') returning * into v;
  if v.id is null then return false; end if;
  select array_agg(distinct d.token) into tokens from public.push_dispositivos d join public.voltas_acompanhantes a on a.user_id = d.user_id
   where a.volta_id = v.id and d.ativo;
  if tokens is not null then
    perform public.enviar_push_expo(tokens, public.primeiro_nome(v.user_id) || ' chegou bem 💚', 'Pode ficar tranquilo(a).', '/volta/' || v.token, 'seguranca');
  end if;
  return true;
end; $$;

create or replace function public.cancelar_volta()
returns void language sql security definer set search_path = public as $$
  update public.voltas set status = 'cancelada', lat = null, lng = null where user_id = auth.uid() and status in ('a_caminho', 'atrasada');
$$;

-- O que o amigo vê pelo link (sem conta). Some 12h depois do horário previsto. Localização só enquanto não chegou.
create or replace function public.volta_publica(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', public.primeiro_nome(v.user_id), 'status', v.status, 'previsao', v.previsao, 'chegou_em', v.chegou_em,
    'saiu_de', l.nome,
    'lat', case when v.status in ('a_caminho', 'atrasada') then v.lat end,
    'lng', case when v.status in ('a_caminho', 'atrasada') then v.lng end,
    'loc_em', case when v.status in ('a_caminho', 'atrasada') then v.loc_em end)
    from public.voltas v left join public.locais l on l.id = v.local_id
   where v.token = p_token and v.previsao > now() - interval '12 hours';
$$;

-- Amigo com o app: recebe notificação se a pessoa atrasar ou quando chegar
create or replace function public.acompanhar_volta(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v public.voltas;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  select * into v from public.voltas where token = p_token and previsao > now() - interval '12 hours';
  if v.id is null or v.user_id = auth.uid() then return false; end if;
  insert into public.voltas_acompanhantes (volta_id, user_id) values (v.id, auth.uid()) on conflict do nothing;
  return true;
end; $$;

-- Roda a cada 5 min (pg_cron): quem passou 10 min do horário sem confirmar vira "atrasada" e dispara os avisos
create or replace function public.verificar_voltas_atrasadas()
returns integer language plpgsql security definer set search_path = public as $$
declare v record; tokens text[]; n integer := 0;
begin
  for v in update public.voltas set status = 'atrasada', alertada_em = now()
            where status = 'a_caminho' and previsao + interval '10 minutes' < now() and previsao > now() - interval '12 hours'
            returning * loop
    n := n + 1;
    tokens := public.tokens_do_usuario(v.user_id);
    if tokens is not null then
      perform public.enviar_push_expo(tokens, 'Você chegou bem?', 'Toque para avisar seus amigos. Se precisar de mais tempo, é só estender.', '/seguranca', 'seguranca');
    end if;
    select array_agg(distinct d.token) into tokens from public.push_dispositivos d join public.voltas_acompanhantes a on a.user_id = d.user_id
     where a.volta_id = v.id and d.ativo;
    if tokens is not null then
      perform public.enviar_push_expo(tokens, public.primeiro_nome(v.user_id) || ' ainda não confirmou que chegou',
        'Já passou do horário combinado. Tente falar com ela(e).', '/volta/' || v.token, 'seguranca');
    end if;
  end loop;
  -- limpeza: localização some 12h depois
  update public.voltas set lat = null, lng = null where lat is not null and previsao < now() - interval '12 hours';
  return n;
end; $$;
revoke all on function public.verificar_voltas_atrasadas() from public, anon, authenticated;

-- 3) Me ajuda aqui ----------------------------------------------------------------------------------------
create or replace function public.esteve_na_casa_hoje(p_user uuid, p_local uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.checkins c where c.user_id = p_user and c.local_id = p_local and c.cancelado_em is null and c.created_at > now() - interval '12 hours')
      or exists (select 1 from public.acoes_marca_presencas p where p.user_id = p_user and p.local_id = p_local and p.created_at > now() - interval '12 hours')
      or exists (select 1 from public.ingressos i join public.eventos e on e.id = i.evento_id
                  where i.user_id = p_user and e.local_id = p_local and i.status = 'usado' and i.usado_em > now() - interval '12 hours')
      or exists (select 1 from public.termometro_sinais t where t.user_id = p_user and t.local_id = p_local and t.criado_em > now() - interval '12 hours');
$$;
revoke all on function public.esteve_na_casa_hoje(uuid, uuid) from public, anon, authenticated;

create table if not exists public.alertas_ajuda (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  local_id uuid not null references public.locais(id) on delete cascade,
  mensagem text check (mensagem is null or char_length(mensagem) <= 140),
  status text not null default 'aberto' check (status in ('aberto', 'indo', 'resolvido')),
  criado_em timestamptz not null default now(),
  atendido_por uuid references public.profiles(id) on delete set null,
  atendido_em timestamptz
);
create index if not exists alertas_ajuda_local_idx on public.alertas_ajuda(local_id, criado_em desc);
alter table public.alertas_ajuda enable row level security;
drop policy if exists alertas_ajuda_dono_le on public.alertas_ajuda;
create policy alertas_ajuda_dono_le on public.alertas_ajuda for select using (user_id = auth.uid());

-- Casas onde a pessoa pode pedir ajuda agora (esteve nas últimas 12h e a casa tem equipe no app)
create or replace function public.casas_para_pedir_ajuda()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.nome)), '[]'::jsonb)
    from public.locais l
   where l.owner_id is not null and l.status = 'aprovado' and public.esteve_na_casa_hoje(auth.uid(), l.id);
$$;

create or replace function public.pedir_ajuda_na_casa(p_local uuid, p_mensagem text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.alertas_ajuda; tokens text[]; v_nome text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not public.esteve_na_casa_hoje(auth.uid(), p_local) then
    raise exception 'Faça "Estou aqui agora" na casa primeiro, para a equipe saber onde você está.' using errcode = '42501';
  end if;
  select * into a from public.alertas_ajuda where user_id = auth.uid() and local_id = p_local and status <> 'resolvido' and criado_em > now() - interval '10 minutes';
  if a.id is not null then return jsonb_build_object('id', a.id, 'repetido', true); end if;
  insert into public.alertas_ajuda (user_id, local_id, mensagem) values (auth.uid(), p_local, nullif(trim(p_mensagem), '')) returning * into a;
  tokens := public.tokens_da_casa(p_local);
  v_nome := public.primeiro_nome(auth.uid());
  if tokens is not null then
    perform public.enviar_push_expo(tokens, '🚨 Pedido de ajuda na casa', v_nome || ' pediu ajuda' || coalesce(': "' || a.mensagem || '"', '. Vá até a pessoa e veja o que precisa.'), '/parceiro', 'seguranca');
  end if;
  return jsonb_build_object('id', a.id, 'repetido', false, 'avisados', coalesce(array_length(tokens, 1), 0));
end; $$;

create or replace function public.meu_pedido_de_ajuda()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(x) from (select a.id, a.status, a.criado_em, l.nome as casa from public.alertas_ajuda a join public.locais l on l.id = a.local_id
   where a.user_id = auth.uid() and a.criado_em > now() - interval '3 hours' and a.status <> 'resolvido' order by a.criado_em desc limit 1) x;
$$;

create or replace function public.alertas_da_casa(p_local uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_no_local(p_local, 'porta') and not public.pode_no_local(p_local, 'checkins') then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'nome', public.primeiro_nome(a.user_id), 'mensagem', a.mensagem,
                     'status', a.status, 'criado_em', a.criado_em, 'atendido_por', public.primeiro_nome(a.atendido_por)) order by a.criado_em desc)
                   from public.alertas_ajuda a where a.local_id = p_local and (a.status <> 'resolvido' or a.atendido_em > now() - interval '30 minutes')
                     and a.criado_em > now() - interval '8 hours'), '[]'::jsonb);
end; $$;

create or replace function public.atender_alerta(p_alerta uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare a public.alertas_ajuda; tokens text[];
begin
  if p_status not in ('indo', 'resolvido') then raise exception 'Status inválido.' using errcode = '22023'; end if;
  select * into a from public.alertas_ajuda where id = p_alerta;
  if a.id is null or (not public.pode_no_local(a.local_id, 'porta') and not public.pode_no_local(a.local_id, 'checkins')) then
    raise exception 'Sem acesso.' using errcode = '42501';
  end if;
  update public.alertas_ajuda set status = p_status, atendido_por = auth.uid(), atendido_em = now() where id = p_alerta;
  if p_status = 'indo' then
    tokens := public.tokens_do_usuario(a.user_id);
    if tokens is not null then
      perform public.enviar_push_expo(tokens, 'A equipe está indo até você', 'Fique onde está. Se for urgente, ligue 190.', '/seguranca', 'seguranca');
    end if;
  end if;
end; $$;

-- 4) Selo Lugar seguro ------------------------------------------------------------------------------------
create table if not exists public.avaliacoes_seguranca (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  local_id uuid not null references public.locais(id) on delete cascade,
  visita date not null,
  acolhimento smallint check (acolhimento between 1 and 5),
  saida smallint check (saida between 1 and 5),
  equipe smallint check (equipe between 1 and 5),
  comentario text check (comentario is null or char_length(comentario) <= 280),  -- só a equipe Dicas lê
  pulada boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, local_id, visita)
);
create index if not exists avaliacoes_seguranca_local_idx on public.avaliacoes_seguranca(local_id, created_at desc);
alter table public.avaliacoes_seguranca enable row level security;
drop policy if exists avaliacoes_seguranca_dono_le on public.avaliacoes_seguranca;
create policy avaliacoes_seguranca_dono_le on public.avaliacoes_seguranca for select using (user_id = auth.uid());
drop policy if exists avaliacoes_seguranca_admin on public.avaliacoes_seguranca;
create policy avaliacoes_seguranca_admin on public.avaliacoes_seguranca for select using (public.is_admin());

-- Visitas da pessoa nos últimos 3 dias (já passadas 2h), por casa e dia
create or replace function public.minhas_visitas_recentes()
returns table (local_id uuid, visita date) language sql stable security definer set search_path = public as $$
  select x.local_id, (x.quando at time zone 'America/Sao_Paulo' - interval '6 hours')::date as visita  -- noite que vira o dia conta como a mesma
    from (
      select c.local_id, coalesce(c.validado_em, c.created_at) as quando from public.checkins c
       where c.user_id = auth.uid() and c.cancelado_em is null and c.validado_em is not null
      union all select p.local_id, p.created_at from public.acoes_marca_presencas p where p.user_id = auth.uid() and p.local_id is not null
      union all select e.local_id, i.usado_em from public.ingressos i join public.eventos e on e.id = i.evento_id where i.user_id = auth.uid() and i.status = 'usado'
      union all select t.local_id, t.criado_em from public.termometro_sinais t where t.user_id = auth.uid()
    ) x
   where x.quando between now() - interval '3 days' and now() - interval '2 hours' and x.local_id is not null
   group by 1, 2;
$$;
revoke all on function public.minhas_visitas_recentes() from public, anon;

create or replace function public.avaliacao_seguranca_pendente()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(x) from (
    select v.local_id, v.visita, l.nome as casa from public.minhas_visitas_recentes() v join public.locais l on l.id = v.local_id
     where not exists (select 1 from public.avaliacoes_seguranca a where a.user_id = auth.uid() and a.local_id = v.local_id and a.visita = v.visita)
     order by v.visita desc limit 1) x;
$$;

create or replace function public.avaliar_seguranca(p_local uuid, p_visita date, p_acolhimento int, p_saida int, p_equipe int, p_comentario text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.minhas_visitas_recentes() v where v.local_id = p_local and v.visita = p_visita) then
    raise exception 'Só dá para avaliar uma visita dos últimos 3 dias.' using errcode = '42501';
  end if;
  insert into public.avaliacoes_seguranca (user_id, local_id, visita, acolhimento, saida, equipe, comentario, pulada)
  values (auth.uid(), p_local, p_visita, p_acolhimento, p_saida, p_equipe, nullif(trim(p_comentario), ''), p_acolhimento is null)
  on conflict (user_id, local_id, visita) do update set acolhimento = excluded.acolhimento, saida = excluded.saida, equipe = excluded.equipe,
    comentario = excluded.comentario, pulada = excluded.pulada;
end; $$;

-- Selo de uma casa (público). Médias só aparecem com 5+ respostas.
create or replace function public.selo_lugar_seguro(p_local uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'respostas', count(*),
    'tem_selo', count(*) >= 10 and avg((acolhimento + saida + equipe) / 3.0) >= 4.3 and least(avg(acolhimento), avg(saida), avg(equipe)) >= 4.0,
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
  having count(*) >= 10 and avg((acolhimento + saida + equipe) / 3.0) >= 4.3 and least(avg(acolhimento), avg(saida), avg(equipe)) >= 4.0;
$$;
grant execute on function public.locais_com_selo() to anon, authenticated;

-- 5) Termômetro da noite ----------------------------------------------------------------------------------
-- "Estou aqui agora": confere que a pessoa está a até 300 m da casa. Repetir em 30 min só atualiza.
create or replace function public.estou_aqui_agora(p_local uuid, p_lat double precision, p_lng double precision,
  p_lotacao int default null, p_fila int default null, p_clima int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.locais; v_id bigint; d double precision;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  select * into l from public.locais where id = p_local and status = 'aprovado';
  if l.id is null then raise exception 'Casa não encontrada.' using errcode = 'P0002'; end if;
  if l.lat is null or l.lng is null then raise exception 'Esta casa ainda não tem endereço no mapa.' using errcode = 'P0001'; end if;
  if p_lat is null or p_lng is null then raise exception 'Precisamos da sua localização para confirmar.' using errcode = '22023'; end if;
  d := public.distancia_m(p_lat, p_lng, l.lat, l.lng);
  if d > 300 then return jsonb_build_object('status', 'longe', 'metros', round(d)); end if;
  select id into v_id from public.termometro_sinais where user_id = auth.uid() and local_id = p_local and criado_em > now() - interval '30 minutes' order by criado_em desc limit 1;
  if v_id is not null then
    update public.termometro_sinais set lotacao = coalesce(p_lotacao, lotacao), fila = coalesce(p_fila, fila), clima = coalesce(p_clima, clima), criado_em = now() where id = v_id;
  else
    insert into public.termometro_sinais (user_id, local_id, lotacao, fila, clima) values (auth.uid(), p_local, p_lotacao, p_fila, p_clima);
  end if;
  return jsonb_build_object('status', 'ok');
end; $$;

-- O termômetro: casas com movimento nas últimas 2h ou com festa acontecendo agora. Só contagens e médias.
create or replace function public.termometro_da_noite(p_cidade text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  with presentes as (
    select local_id, user_id from public.termometro_sinais where criado_em > now() - interval '2 hours'
    union select local_id, user_id from public.checkins where cancelado_em is null and created_at > now() - interval '2 hours'
    union select local_id, user_id from public.acoes_marca_presencas where local_id is not null and created_at > now() - interval '2 hours'
    union select e.local_id, i.user_id from public.ingressos i join public.eventos e on e.id = i.evento_id where i.status = 'usado' and i.usado_em > now() - interval '2 hours'
  ), contagem as (
    select local_id, count(distinct user_id) as pessoas from presentes where local_id is not null group by local_id
  ), sinais as (
    select local_id, round(avg(lotacao))::int as lotacao, round(avg(fila))::int as fila, round(avg(clima))::int as clima, max(criado_em) as atualizado
      from public.termometro_sinais where criado_em > now() - interval '90 minutes' group by local_id
  ), festas as (
    select distinct on (e.local_id) e.local_id, e.id as evento_id, e.titulo from public.eventos e
     where e.status = 'aprovado' and e.local_id is not null and e.data_inicio <= now() + interval '1 hour'
       and coalesce(e.data_fim, e.data_inicio + interval '6 hours') >= now() and coalesce(e.data_fim, e.data_inicio + interval '6 hours') <= e.data_inicio + interval '24 hours'
     order by e.local_id, e.data_inicio desc
  ), selo as (select public.locais_com_selo() as local_id)
  select coalesce(jsonb_agg(x order by x.pessoas desc, x.nome), '[]'::jsonb) from (
    select l.id, l.nome, l.bairro, l.cidade, l.lat, l.lng, l.foto_capa_url,
           coalesce(c.pessoas, 0) as pessoas, s.lotacao, s.fila, s.clima, s.atualizado,
           f.evento_id, f.titulo as festa, exists (select 1 from selo where selo.local_id = l.id) as selo
      from public.locais l
      left join contagem c on c.local_id = l.id left join sinais s on s.local_id = l.id left join festas f on f.local_id = l.id
     where l.status = 'aprovado' and (c.pessoas > 0 or f.evento_id is not null)
       and (p_cidade is null or l.cidade ilike p_cidade)
  ) x;
$$;
grant execute on function public.termometro_da_noite(text) to anon, authenticated;

-- Permissões das RPCs de usuário
do $$ declare f text; begin
  foreach f in array array['iniciar_volta(integer, uuid, double precision, double precision)', 'minha_volta_ativa()', 'atualizar_local_volta(double precision, double precision)',
    'estender_volta(integer)', 'cheguei_bem()', 'cancelar_volta()', 'acompanhar_volta(text)', 'casas_para_pedir_ajuda()', 'pedir_ajuda_na_casa(uuid, text)',
    'meu_pedido_de_ajuda()', 'alertas_da_casa(uuid)', 'atender_alerta(uuid, text)', 'avaliacao_seguranca_pendente()',
    'avaliar_seguranca(uuid, date, integer, integer, integer, text)', 'estou_aqui_agora(uuid, double precision, double precision, integer, integer, integer)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
grant execute on function public.volta_publica(text) to anon, authenticated;

-- Agendamento: confere voltas atrasadas a cada 5 minutos
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'voltas-atrasadas';
    perform cron.schedule('voltas-atrasadas', '*/5 * * * *', 'select public.verificar_voltas_atrasadas()');
    raise notice 'Agendado: conferência do "Cheguei bem" a cada 5 minutos.';
  else
    raise notice 'pg_cron desligado: ligue em Database › Extensions e rode esta migração de novo.';
  end if;
end $$;
