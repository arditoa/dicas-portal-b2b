-- 131 — Ingressos no app (tipo Sympla), com Mercado Pago marketplace (16/11/2026). Rode depois da 130.
-- * A casa cria LOTES numa festa (preço, quantidade, período de venda, meia-entrada).
-- * O público reserva (segura por 15 min), paga no Mercado Pago (Pix/cartão, Checkout Pro) e recebe o
--   ingresso NOMINAL com QR em "Meus ingressos". A porta lê o QR no modo porta.
-- * O dinheiro cai direto na conta Mercado Pago da casa (conectada por OAuth). O app recebe só a taxa
--   (marketplace_fee): 8% (planos pagos) ou 10% (Gratuito), mínimo R$ 2 por ingresso pago.
--   A taxa é paga pelo comprador (padrão) ou absorvida pela casa (eventos.ingresso_taxa_paga_por = 'casa').
-- * Ingresso grátis (lote R$ 0): sai na hora, sem pagamento.
-- * Tokens do Mercado Pago ficam numa tabela que SÓ o servidor (service_role) lê. Nunca no app.
-- Seguro rodar mais de uma vez.

-- 1) Configuração na festa -------------------------------------------------------------------------------
alter table public.eventos add column if not exists ingressos_ativos boolean not null default false;
alter table public.eventos add column if not exists ingresso_taxa_paga_por text not null default 'comprador';
do $$ begin
  alter table public.eventos add constraint eventos_ingresso_taxa_ok check (ingresso_taxa_paga_por in ('comprador', 'casa'));
exception when duplicate_object then null; end $$;

-- 2) Conta Mercado Pago da casa (só o servidor lê) -----------------------------------------------------------
create table if not exists public.mp_contas (
  local_id uuid primary key references public.locais(id) on delete cascade,
  mp_user_id bigint not null unique,
  access_token text not null,
  refresh_token text,
  public_key text,
  expira_em timestamptz,
  conectado_por uuid references public.profiles(id) on delete set null,
  conectado_em timestamptz not null default now()
);
alter table public.mp_contas enable row level security;  -- sem políticas: só service_role

create table if not exists public.mp_oauth_estados (
  estado text primary key,
  local_id uuid not null references public.locais(id) on delete cascade,
  user_id uuid not null,
  criado_em timestamptz not null default now()
);
alter table public.mp_oauth_estados enable row level security;  -- só service_role

-- A casa pede para conectar: gera um "estado" de uso único (10 min) que o portal troca pelo login no Mercado Pago.
create or replace function public.mp_iniciar_conexao(p_local uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_estado text := encode(extensions.gen_random_bytes(18), 'hex');
begin
  if not (public.is_admin() or exists (select 1 from public.locais where id = p_local and owner_id = auth.uid())) then
    raise exception 'Só o dono da casa conecta a conta Mercado Pago.' using errcode = '42501';
  end if;
  delete from public.mp_oauth_estados where criado_em < now() - interval '1 day';
  insert into public.mp_oauth_estados (estado, local_id, user_id) values (v_estado, p_local, auth.uid());
  return v_estado;
end;
$$;
revoke execute on function public.mp_iniciar_conexao(uuid) from public, anon;
grant execute on function public.mp_iniciar_conexao(uuid) to authenticated;

-- A casa vê só SE está conectada (nunca o token)
create or replace function public.mp_status_da_casa(p_local uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_admin() or public.pode_no_local(p_local, 'festa') or public.pode_no_local(p_local, 'resultados')
              or exists (select 1 from public.locais where id = p_local and owner_id = auth.uid())
    then jsonb_build_object('conectado', exists (select 1 from public.mp_contas where local_id = p_local),
                            'desde', (select conectado_em from public.mp_contas where local_id = p_local))
    else null end;
$$;
revoke execute on function public.mp_status_da_casa(uuid) from public, anon;
grant execute on function public.mp_status_da_casa(uuid) to authenticated;

-- 3) Lotes -------------------------------------------------------------------------------------------------
create table if not exists public.ingresso_lotes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 40),
  preco_centavos integer not null check (preco_centavos >= 0 and preco_centavos <= 10000000),
  quantidade integer not null check (quantidade between 1 and 100000),
  permite_meia boolean not null default true,
  inicio_venda timestamptz,
  fim_venda timestamptz,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ingresso_lotes_evento_idx on public.ingresso_lotes(evento_id, ordem);
alter table public.ingresso_lotes enable row level security;

create or replace function public.pode_vender_no_evento(p_evento uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.pode_gerenciar_evento(p_evento)
      or exists (select 1 from public.eventos e where e.id = p_evento and e.local_id is not null and public.pode_no_local(e.local_id, 'festa'));
$$;

drop policy if exists ingresso_lotes_ver on public.ingresso_lotes;
create policy ingresso_lotes_ver on public.ingresso_lotes for select using (
  public.pode_vender_no_evento(evento_id)
  or (ativo and exists (select 1 from public.eventos e where e.id = evento_id and e.status = 'aprovado' and e.ingressos_ativos)));
drop policy if exists ingresso_lotes_gerir on public.ingresso_lotes;
create policy ingresso_lotes_gerir on public.ingresso_lotes for all using (public.pode_vender_no_evento(evento_id))
  with check (public.pode_vender_no_evento(evento_id));

-- 4) Pedidos e ingressos ---------------------------------------------------------------------------------
create table if not exists public.ingresso_pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  evento_id uuid not null references public.eventos(id) on delete cascade,
  local_id uuid references public.locais(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'expirado', 'cancelado', 'reembolsado')),
  subtotal_centavos integer not null,
  taxa_centavos integer not null,          -- comissão do app (marketplace_fee)
  total_centavos integer not null,         -- o que o comprador paga
  taxa_paga_por text not null,
  mp_preference_id text,
  mp_payment_id text,
  expira_em timestamptz not null default (now() + interval '15 minutes'),
  pago_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ingresso_pedidos_user_idx on public.ingresso_pedidos(user_id, created_at desc);
alter table public.ingresso_pedidos enable row level security;
drop policy if exists ingresso_pedidos_dono on public.ingresso_pedidos;
create policy ingresso_pedidos_dono on public.ingresso_pedidos for select using (auth.uid() = user_id or public.pode_vender_no_evento(evento_id));

create table if not exists public.ingressos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.ingresso_pedidos(id) on delete cascade,
  lote_id uuid not null references public.ingresso_lotes(id) on delete restrict,
  evento_id uuid not null references public.eventos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  titular text not null check (char_length(titular) between 2 and 80),
  meia boolean not null default false,
  preco_centavos integer not null,
  codigo text not null unique default upper(encode(extensions.gen_random_bytes(6), 'hex')),
  status text not null default 'reservado' check (status in ('reservado', 'valido', 'usado', 'cancelado')),
  usado_em timestamptz,
  usado_por uuid,
  created_at timestamptz not null default now()
);
create index if not exists ingressos_lote_idx on public.ingressos(lote_id, status);
create index if not exists ingressos_user_idx on public.ingressos(user_id, created_at desc);
alter table public.ingressos enable row level security;
drop policy if exists ingressos_dono on public.ingressos;
create policy ingressos_dono on public.ingressos for select using (auth.uid() = user_id or public.pode_vender_no_evento(evento_id));
-- Gravar só pelas funções abaixo.

-- Quantos ainda há num lote (reservas vencidas não contam)
create or replace function public.lote_disponivel(p_lote uuid)
returns integer language sql stable security definer set search_path = public as $$
  select greatest(l.quantidade - (
    select count(*) from public.ingressos i join public.ingresso_pedidos p on p.id = i.pedido_id
     where i.lote_id = l.id and (i.status in ('valido', 'usado') or (i.status = 'reservado' and p.status = 'pendente' and p.expira_em > now()))
  ), 0)::integer
  from public.ingresso_lotes l where l.id = p_lote;
$$;
grant execute on function public.lote_disponivel(uuid) to anon, authenticated;

-- Lotes à venda numa festa (público). Mostra "Últimos ingressos" sem revelar o total.
create or replace function public.ingressos_da_festa(p_evento uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ativos', e.ingressos_ativos,
    'casa_conectada', exists (select 1 from public.mp_contas m where m.local_id = e.local_id),
    'taxa_paga_por', e.ingresso_taxa_paga_por,
    'taxa_pct', case when public.local_tem_plano_pago(e.local_id) then 8 else 10 end,
    'lotes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'nome', l.nome, 'preco_centavos', l.preco_centavos, 'permite_meia', l.permite_meia,
        'disponivel', public.lote_disponivel(l.id) > 0,
        'ultimos', public.lote_disponivel(l.id) between 1 and greatest(5, l.quantidade / 10),
        'em_breve', l.inicio_venda is not null and l.inicio_venda > now(),
        'encerrado', l.fim_venda is not null and l.fim_venda < now()) order by l.ordem, l.preco_centavos)
      from public.ingresso_lotes l where l.evento_id = e.id and l.ativo), '[]'::jsonb))
  from public.eventos e
  where e.id = p_evento and e.status = 'aprovado';
$$;
revoke execute on function public.ingressos_da_festa(uuid) from public;
grant execute on function public.ingressos_da_festa(uuid) to anon, authenticated;

-- Reservar. p_itens = [{"lote_id": "...", "titular": "Nome", "meia": false}, ...] (até 10)
-- Devolve {pedido_id, total_centavos, gratis}. Grátis já sai pago.
create or replace function public.reservar_ingressos(p_evento uuid, p_itens jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e public.eventos;
  it jsonb; l public.ingresso_lotes;
  v_pedido uuid; v_sub integer := 0; v_taxa integer := 0; v_preco integer; v_pct numeric; v_pagos integer := 0;
  v_conta record;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para comprar.' using errcode = '42501'; end if;
  select * into e from public.eventos where id = p_evento and status = 'aprovado' and ingressos_ativos;
  if not found then raise exception 'Os ingressos desta festa não estão à venda.'; end if;
  if coalesce(e.data_fim, e.data_inicio + interval '8 hours') < now() then raise exception 'Esta festa já aconteceu.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) not between 1 and 10 then
    raise exception 'Escolha de 1 a 10 ingressos.';
  end if;
  v_pct := case when public.local_tem_plano_pago(e.local_id) then 0.08 else 0.10 end;

  perform pg_advisory_xact_lock(hashtext('ingressos:' || p_evento::text));
  -- libera reservas vencidas
  update public.ingresso_pedidos set status = 'expirado' where evento_id = p_evento and status = 'pendente' and expira_em <= now();

  insert into public.ingresso_pedidos (user_id, evento_id, local_id, subtotal_centavos, taxa_centavos, total_centavos, taxa_paga_por)
  values (auth.uid(), p_evento, e.local_id, 0, 0, 0, e.ingresso_taxa_paga_por) returning id into v_pedido;

  for it in select * from jsonb_array_elements(p_itens) loop
    select * into l from public.ingresso_lotes where id = (it->>'lote_id')::uuid and evento_id = p_evento and ativo;
    if not found then raise exception 'Lote não encontrado.'; end if;
    if l.inicio_venda is not null and l.inicio_venda > now() then raise exception 'O lote % ainda não começou a vender.', l.nome; end if;
    if l.fim_venda is not null and l.fim_venda < now() then raise exception 'O lote % já encerrou.', l.nome; end if;
    if public.lote_disponivel(l.id) < 1 then raise exception 'O lote % esgotou.', l.nome; end if;
    if char_length(btrim(coalesce(it->>'titular', ''))) < 2 then raise exception 'Coloque o nome de quem vai usar cada ingresso.'; end if;
    v_preco := case when coalesce((it->>'meia')::boolean, false) and l.permite_meia then l.preco_centavos / 2 else l.preco_centavos end;
    insert into public.ingressos (pedido_id, lote_id, evento_id, user_id, titular, meia, preco_centavos)
    values (v_pedido, l.id, p_evento, auth.uid(), left(btrim(it->>'titular'), 80), coalesce((it->>'meia')::boolean, false) and l.permite_meia, v_preco);
    v_sub := v_sub + v_preco;
    if v_preco > 0 then
      v_pagos := v_pagos + 1;
      v_taxa := v_taxa + greatest(round(v_preco * v_pct)::integer, 200);
    end if;
  end loop;

  if v_sub > 0 then
    select 1 into v_conta from public.mp_contas where local_id = e.local_id;
    if not found then raise exception 'Esta casa ainda não conectou a conta para receber.'; end if;
  end if;

  update public.ingresso_pedidos
     set subtotal_centavos = v_sub, taxa_centavos = v_taxa,
         total_centavos = v_sub + case when e.ingresso_taxa_paga_por = 'comprador' then v_taxa else 0 end
   where id = v_pedido;

  if v_sub = 0 then  -- grátis: emite na hora
    update public.ingresso_pedidos set status = 'pago', pago_em = now(), taxa_centavos = 0, total_centavos = 0 where id = v_pedido;
    update public.ingressos set status = 'valido' where pedido_id = v_pedido;
    return jsonb_build_object('pedido_id', v_pedido, 'total_centavos', 0, 'gratis', true);
  end if;
  return jsonb_build_object('pedido_id', v_pedido, 'total_centavos', v_sub + case when e.ingresso_taxa_paga_por = 'comprador' then v_taxa else 0 end,
                            'taxa_centavos', v_taxa, 'gratis', false);
end;
$$;
revoke execute on function public.reservar_ingressos(uuid, jsonb) from public, anon;
grant execute on function public.reservar_ingressos(uuid, jsonb) to authenticated;

-- Pagamento aprovado (chamado SÓ pelo servidor, com service_role, a partir do aviso do Mercado Pago)
create or replace function public.confirmar_pedido_ingresso(p_pedido uuid, p_payment_id text, p_valor_centavos integer)
returns text language plpgsql security definer set search_path = public as $$
declare p public.ingresso_pedidos;
begin
  select * into p from public.ingresso_pedidos where id = p_pedido for update;
  if not found then return 'nao_encontrado'; end if;
  if p.status = 'pago' then return 'ja_pago'; end if;
  if p_valor_centavos < p.total_centavos then return 'valor_menor'; end if;
  -- Pago mesmo depois de vencer a reserva: emite assim mesmo (a pessoa pagou). Pode passar 1–2 do lote.
  update public.ingresso_pedidos set status = 'pago', pago_em = now(), mp_payment_id = p_payment_id where id = p_pedido;
  update public.ingressos set status = 'valido' where pedido_id = p_pedido and status = 'reservado';
  return 'ok';
end;
$$;
revoke execute on function public.confirmar_pedido_ingresso(uuid, text, integer) from public, anon, authenticated;

create or replace function public.reembolsar_pedido_ingresso(p_pedido uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.ingresso_pedidos set status = 'reembolsado' where id = p_pedido;
  update public.ingressos set status = 'cancelado' where pedido_id = p_pedido and status in ('reservado', 'valido');
end;
$$;
revoke execute on function public.reembolsar_pedido_ingresso(uuid) from public, anon, authenticated;

-- 5) Porta: ler o QR do ingresso ------------------------------------------------------------------------------
-- QR = "dicasingresso:<codigo>". Resposta: status 'ok' | 'ja_usado' | 'invalido' | 'outra_casa' | 'cancelado'
create or replace function public.validar_ingresso_porta(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare i record;
begin
  select g.*, e.local_id, e.titulo as festa, l.nome as lote
    into i
    from public.ingressos g join public.eventos e on e.id = g.evento_id join public.ingresso_lotes l on l.id = g.lote_id
   where g.codigo = upper(btrim(p_codigo));
  if not found then return jsonb_build_object('status', 'invalido'); end if;
  if not (public.is_admin() or public.pode_no_local(i.local_id, 'porta') or public.pode_vender_no_evento(i.evento_id)) then
    return jsonb_build_object('status', 'outra_casa');
  end if;
  if i.status in ('cancelado', 'reservado') then return jsonb_build_object('status', 'cancelado', 'titular', i.titular); end if;
  if i.status = 'usado' then
    return jsonb_build_object('status', 'ja_usado', 'titular', i.titular, 'lote', i.lote, 'meia', i.meia, 'usado_em', i.usado_em, 'festa', i.festa);
  end if;
  update public.ingressos set status = 'usado', usado_em = now(), usado_por = auth.uid() where id = i.id and status = 'valido';
  return jsonb_build_object('status', 'ok', 'titular', i.titular, 'lote', i.lote, 'meia', i.meia, 'festa', i.festa);
end;
$$;
revoke execute on function public.validar_ingresso_porta(text) from public, anon;
grant execute on function public.validar_ingresso_porta(text) to authenticated;

-- 6) Vendas para a casa ------------------------------------------------------------------------------------
create or replace function public.vendas_do_evento(p_evento uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_vender_no_evento(p_evento) then raise exception 'Sem acesso.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'vendidos', (select count(*) from public.ingressos where evento_id = p_evento and status in ('valido', 'usado')),
    'entraram', (select count(*) from public.ingressos where evento_id = p_evento and status = 'usado'),
    'meias', (select count(*) from public.ingressos where evento_id = p_evento and status in ('valido', 'usado') and meia),
    'bruto_centavos', (select coalesce(sum(preco_centavos), 0) from public.ingressos where evento_id = p_evento and status in ('valido', 'usado')),
    'taxa_casa_centavos', (select coalesce(sum(taxa_centavos), 0) from public.ingresso_pedidos where evento_id = p_evento and status = 'pago' and taxa_paga_por = 'casa'),
    'lotes', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.nome, 'quantidade', l.quantidade, 'preco_centavos', l.preco_centavos,
                 'vendidos', (select count(*) from public.ingressos i where i.lote_id = l.id and i.status in ('valido', 'usado'))) order by l.ordem), '[]'::jsonb)
              from public.ingresso_lotes l where l.evento_id = p_evento));
end;
$$;
revoke execute on function public.vendas_do_evento(uuid) from public, anon;
grant execute on function public.vendas_do_evento(uuid) to authenticated;

-- Conferência
select to_regclass('public.ingresso_lotes') as lotes, to_regclass('public.ingressos') as ingressos, to_regclass('public.mp_contas') as mp;
