-- 140 — Nova taxa dos ingressos (16/11/2026). Rode depois da 139. Seguro rodar mais de uma vez.
--
-- Decisão da Andrea: "taxa do Dicas 5%, igual o Sympla, e embutir no cliente para a casa receber cheio".
-- * Taxa do Dicas: 5% por ingresso pago (mínimo R$ 1,00), em TODOS os planos. Vai para o Dicas (marketplace_fee / application_fee).
-- * Tarifa do Mercado Pago embutida na taxa de serviço do comprador, para a casa receber o preço do ingresso inteiro.
--   Como o Mercado Pago cobra % sobre o TOTAL pago, a conta é: total = (ingressos + taxa Dicas) / (1 − tarifa MP).
--   Ex.: ingresso R$ 50 → Pix: total R$ 53,03 (taxa de serviço R$ 3,03) · cartão: total R$ 55,25 (R$ 5,25, ~10,5%).
--   A casa recebe R$ 50 nos dois casos; o Dicas recebe R$ 2,50.
-- * Se a casa escolher pagar a taxa ("taxa paga pela casa"), o comprador paga só o ingresso e a casa arca com Dicas + Mercado Pago.
-- * Percentuais em ingresso_config (só o admin muda): taxa do Dicas, mínimo e tarifas do Mercado Pago (Pix e cartão),
--   porque o Mercado Pago muda a tabela de tempos em tempos. Valores iniciais pela tabela pública de nov/2026:
--   Pix 0,99% e cartão 4,98% (receber na hora). Conferir no painel do Mercado Pago da conta.
-- * O pedido nasce como Pix; ao escolher cartão, a rota /api/ingressos/checkout chama definir_forma_pedido e o total sobe.

create table if not exists public.ingresso_config (
  id integer primary key default 1 check (id = 1),
  taxa_dicas_pct numeric(5,2) not null default 5 check (taxa_dicas_pct between 0 and 30),
  taxa_min_centavos integer not null default 100 check (taxa_min_centavos between 0 and 2000),
  mp_pix_pct numeric(5,2) not null default 0.99 check (mp_pix_pct between 0 and 15),
  mp_cartao_pct numeric(5,2) not null default 4.98 check (mp_cartao_pct between 0 and 15),
  atualizado_em timestamptz not null default now()
);
insert into public.ingresso_config (id) values (1) on conflict (id) do nothing;
alter table public.ingresso_config enable row level security;
drop policy if exists ingresso_config_le on public.ingresso_config;
create policy ingresso_config_le on public.ingresso_config for select using (true);
drop policy if exists ingresso_config_admin on public.ingresso_config;
create policy ingresso_config_admin on public.ingresso_config for update using (public.is_admin()) with check (public.is_admin());

alter table public.ingresso_pedidos add column if not exists forma text not null default 'pix' check (forma in ('pix', 'cartao'));
alter table public.ingresso_pedidos add column if not exists custo_pagamento_centavos integer not null default 0;  -- tarifa do MP embutida
comment on column public.ingresso_pedidos.taxa_centavos is 'Taxa do Dicas (marketplace_fee). A tarifa do Mercado Pago embutida fica em custo_pagamento_centavos.';

-- Quanto somar para cobrir a tarifa do Mercado Pago (só quando o comprador paga a taxa)
create or replace function public.custo_pagamento(p_sub integer, p_taxa integer, p_forma text, p_paga_por text)
returns integer language sql stable security definer set search_path = public as $$
  select case when p_paga_por <> 'comprador' or p_sub <= 0 then 0 else
    (ceil((p_sub + p_taxa) / (1 - (case when p_forma = 'cartao' then c.mp_cartao_pct else c.mp_pix_pct end) / 100.0)))::integer - p_sub - p_taxa end
    from public.ingresso_config c where c.id = 1;
$$;

-- A rota de pagamento define Pix ou cartão e o total é recalculado (pedido ainda pendente)
create or replace function public.definir_forma_pedido(p_pedido uuid, p_forma text)
returns integer language plpgsql security definer set search_path = public as $$
declare p public.ingresso_pedidos; v_custo integer;
begin
  if p_forma not in ('pix', 'cartao') then raise exception 'Forma inválida.' using errcode = '22023'; end if;
  select * into p from public.ingresso_pedidos where id = p_pedido for update;
  if p.id is null or p.status <> 'pendente' then raise exception 'Pedido não está pendente.'; end if;
  v_custo := public.custo_pagamento(p.subtotal_centavos, p.taxa_centavos, p_forma, p.taxa_paga_por);
  update public.ingresso_pedidos set forma = p_forma, custo_pagamento_centavos = v_custo,
         total_centavos = p.subtotal_centavos + case when p.taxa_paga_por = 'comprador' then p.taxa_centavos + v_custo else 0 end
   where id = p_pedido returning total_centavos into v_custo;
  return v_custo;
end; $$;
revoke all on function public.definir_forma_pedido(uuid, text) from public, anon, authenticated;
grant execute on function public.definir_forma_pedido(uuid, text) to service_role;

create or replace function public.ingressos_da_festa(p_evento uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ativos', e.ingressos_ativos,
    'casa_conectada', exists (select 1 from public.mp_contas m where m.local_id = e.local_id),
    'taxa_paga_por', e.ingresso_taxa_paga_por,
    'taxa_pct', (select taxa_dicas_pct from public.ingresso_config where id = 1),
    'taxa_min_centavos', (select taxa_min_centavos from public.ingresso_config where id = 1),
    'custo_pix_pct', (select mp_pix_pct from public.ingresso_config where id = 1),
    'custo_cartao_pct', (select mp_cartao_pct from public.ingresso_config where id = 1),
    'tem_cupom', exists (select 1 from public.ingresso_cupons c where c.evento_id = e.id and c.ativo),
    'virada', e.ingresso_virada_automatica,
    'lotes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'nome', l.nome, 'preco_centavos', l.preco_centavos, 'permite_meia', l.permite_meia,
        'disponivel', public.lote_disponivel(l.id) > 0,
        'ultimos', public.lote_disponivel(l.id) between 1 and greatest(5, l.quantidade / 10),
        'em_breve', l.inicio_venda is not null and l.inicio_venda > now(),
        'abre_em', l.inicio_venda,
        'encerrado', l.fim_venda is not null and l.fim_venda < now(),
        -- virada automática: só o lote da vez fica comprável; os de antes aparecem como esgotado/encerrado e os de depois como "em breve"
        'bloqueado_virada', e.ingresso_virada_automatica and l.id is distinct from public.lote_da_vez(e.id) and public.lote_a_venda(l))
        order by l.ordem, l.preco_centavos)
      from public.ingresso_lotes l where l.evento_id = e.id and l.ativo and not l.cortesia), '[]'::jsonb))
  from public.eventos e
  where e.id = p_evento and e.status = 'aprovado';
$$;
revoke execute on function public.ingressos_da_festa(uuid) from public;
grant execute on function public.ingressos_da_festa(uuid) to anon, authenticated;

create or replace function public.reservar_ingressos(p_evento uuid, p_itens jsonb, p_cupom text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e public.eventos;
  it jsonb; l public.ingresso_lotes; c public.ingresso_cupons;
  v_pedido uuid; v_bruto integer := 0; v_sub integer := 0; v_taxa integer := 0; v_desc integer := 0; v_preco integer; v_pct numeric;
  v_da_vez uuid; r record; cfg public.ingresso_config; v_min integer; v_custo integer := 0;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para comprar.' using errcode = '42501'; end if;
  select * into e from public.eventos where id = p_evento and status = 'aprovado' and ingressos_ativos;
  if not found then raise exception 'Os ingressos desta festa não estão à venda.'; end if;
  if coalesce(e.data_fim, e.data_inicio + interval '8 hours') < now() then raise exception 'Esta festa já aconteceu.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) not between 1 and 10 then raise exception 'Escolha de 1 a 10 ingressos.'; end if;
  select * into cfg from public.ingresso_config where id = 1;
  v_pct := cfg.taxa_dicas_pct / 100.0;
  v_min := cfg.taxa_min_centavos;

  perform pg_advisory_xact_lock(hashtext('ingressos:' || p_evento::text));
  update public.ingresso_pedidos set status = 'expirado' where evento_id = p_evento and status = 'pendente' and expira_em <= now();

  if p_cupom is not null and btrim(p_cupom) <> '' then
    select * into c from public.ingresso_cupons where evento_id = p_evento and codigo = upper(btrim(p_cupom)) and ativo;
    if not found or (c.limite_usos is not null and public.usos_do_cupom(c.id) >= c.limite_usos) then
      raise exception 'Cupom inválido ou esgotado.';
    end if;
  end if;
  v_da_vez := case when e.ingresso_virada_automatica then public.lote_da_vez(p_evento) else null end;

  insert into public.ingresso_pedidos (user_id, evento_id, local_id, subtotal_centavos, taxa_centavos, total_centavos, taxa_paga_por, cupom_id)
  values (auth.uid(), p_evento, e.local_id, 0, 0, 0, e.ingresso_taxa_paga_por, c.id) returning id into v_pedido;

  for it in select * from jsonb_array_elements(p_itens) loop
    select * into l from public.ingresso_lotes where id = (it->>'lote_id')::uuid and evento_id = p_evento and ativo and not cortesia;
    if not found then raise exception 'Lote não encontrado.'; end if;
    if l.inicio_venda is not null and l.inicio_venda > now() then raise exception 'O lote % ainda não começou a vender.', l.nome; end if;
    if l.fim_venda is not null and l.fim_venda < now() then raise exception 'O lote % já encerrou.', l.nome; end if;
    if v_da_vez is not null and l.id <> v_da_vez then raise exception 'O lote % ainda não abriu. Agora está à venda o lote da vez.', l.nome; end if;
    if public.lote_disponivel(l.id) < 1 then raise exception 'O lote % esgotou.', l.nome; end if;
    if char_length(btrim(coalesce(it->>'titular', ''))) < 2 then raise exception 'Coloque o nome de quem vai usar cada ingresso.'; end if;
    v_preco := case when coalesce((it->>'meia')::boolean, false) and l.permite_meia then l.preco_centavos / 2 else l.preco_centavos end;
    insert into public.ingressos (pedido_id, lote_id, evento_id, user_id, titular, meia, preco_centavos)
    values (v_pedido, l.id, p_evento, auth.uid(), left(btrim(it->>'titular'), 80), coalesce((it->>'meia')::boolean, false) and l.permite_meia, v_preco);
    v_bruto := v_bruto + v_preco;
  end loop;

  -- Desconto do cupom, distribuído entre os ingressos (o ingresso guarda o preço já com desconto)
  if c.id is not null and v_bruto > 0 then
    v_desc := least(v_bruto, case when c.tipo = 'pct' then round(v_bruto * c.valor / 100.0)::integer else c.valor end);
    for r in select id, preco_centavos from public.ingressos where pedido_id = v_pedido and preco_centavos > 0 loop
      update public.ingressos set preco_centavos = greatest(r.preco_centavos - round(v_desc::numeric * r.preco_centavos / v_bruto)::integer, 0) where id = r.id;
    end loop;
  end if;
  select coalesce(sum(preco_centavos), 0), coalesce(sum(case when preco_centavos > 0 then greatest(round(preco_centavos * v_pct)::integer, v_min) else 0 end), 0)
    into v_sub, v_taxa from public.ingressos where pedido_id = v_pedido;

  if v_sub > 0 and not exists (select 1 from public.mp_contas where local_id = e.local_id) then
    raise exception 'Esta casa ainda não conectou a conta para receber.';
  end if;

  -- 140: começa como Pix; a rota de pagamento recalcula se a pessoa escolher cartão (definir_forma_pedido)
  v_custo := public.custo_pagamento(v_sub, v_taxa, 'pix', e.ingresso_taxa_paga_por);
  update public.ingresso_pedidos
     set subtotal_centavos = v_sub, taxa_centavos = v_taxa, desconto_centavos = v_bruto - v_sub, forma = 'pix', custo_pagamento_centavos = v_custo,
         total_centavos = v_sub + case when e.ingresso_taxa_paga_por = 'comprador' then v_taxa + v_custo else 0 end
   where id = v_pedido;

  if v_sub = 0 then
    update public.ingresso_pedidos set status = 'pago', pago_em = now(), taxa_centavos = 0, total_centavos = 0 where id = v_pedido;
    update public.ingressos set status = 'valido' where pedido_id = v_pedido;
    return jsonb_build_object('pedido_id', v_pedido, 'total_centavos', 0, 'gratis', true);
  end if;
  return jsonb_build_object('pedido_id', v_pedido, 'total_centavos', v_sub + case when e.ingresso_taxa_paga_por = 'comprador' then v_taxa + v_custo else 0 end,
                            'taxa_centavos', v_taxa, 'custo_pagamento_centavos', v_custo, 'desconto_centavos', v_bruto - v_sub, 'gratis', false);
end;
$$;
revoke execute on function public.reservar_ingressos(uuid, jsonb, text) from public, anon;
grant execute on function public.reservar_ingressos(uuid, jsonb, text) to authenticated;

-- Confirmação do pagamento: a pessoa pode gerar o Pix e depois trocar para cartão (o total sobe). Se ela pagar o Pix
-- antigo, o valor é o do Pix: aceita qualquer valor a partir do total no Pix (o menor possível) e grava a forma usada.
create or replace function public.confirmar_pedido_ingresso(p_pedido uuid, p_payment_id text, p_valor_centavos integer)
returns text language plpgsql security definer set search_path = public as $$
declare p public.ingresso_pedidos; v_min integer;
begin
  select * into p from public.ingresso_pedidos where id = p_pedido for update;
  if not found then return 'nao_encontrado'; end if;
  if p.status = 'pago' then return 'ja_pago'; end if;
  v_min := p.subtotal_centavos + case when p.taxa_paga_por = 'comprador'
             then p.taxa_centavos + public.custo_pagamento(p.subtotal_centavos, p.taxa_centavos, 'pix', p.taxa_paga_por) else 0 end;
  if p_valor_centavos < least(p.total_centavos, v_min) then return 'valor_menor'; end if;
  -- Pago mesmo depois de vencer a reserva: emite assim mesmo (a pessoa pagou). Pode passar 1–2 do lote.
  update public.ingresso_pedidos set status = 'pago', pago_em = now(), mp_payment_id = p_payment_id, total_centavos = p_valor_centavos,
         forma = case when p_valor_centavos <= v_min then 'pix' else p.forma end
   where id = p_pedido;
  update public.ingressos set status = 'valido' where pedido_id = p_pedido and status = 'reservado';
  return 'ok';
end;
$$;
revoke all on function public.confirmar_pedido_ingresso(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirmar_pedido_ingresso(uuid, text, integer) to service_role;

-- Conferência
select taxa_dicas_pct, taxa_min_centavos, mp_pix_pct, mp_cartao_pct from public.ingresso_config;
