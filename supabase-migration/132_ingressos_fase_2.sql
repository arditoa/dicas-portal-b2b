-- 132 — Ingressos, fase 2 (16/11/2026). Rode depois da 131. Seguro rodar mais de uma vez.
-- * Virada de lote: por data (inicio_venda/fim_venda) e "virada automática" (mostra só o lote da vez;
--   quando esgota ou acaba o prazo, abre o próximo).
-- * Cupom de desconto por festa (% ou R$, com limite de usos).
-- * Cortesias: a casa emite ingressos grátis com o nome da pessoa e manda o link; quem abre o link
--   guarda o ingresso na própria conta ("resgatar").
-- * Reembolso: pedido pelo comprador (até 7 dias depois da compra e até 48h antes da festa) ou pela casa
--   (qualquer hora). Feito pelo servidor no Mercado Pago; aqui só registra.
-- * Lista de compradores da festa para a casa (nomes dos ingressos, sem contato).

-- 1) Campos novos -----------------------------------------------------------------------------------------
alter table public.eventos add column if not exists ingresso_virada_automatica boolean not null default false;
alter table public.ingresso_lotes add column if not exists cortesia boolean not null default false;
alter table public.ingressos add column if not exists cortesia boolean not null default false;
alter table public.ingressos add column if not exists cortesia_resgatar boolean not null default false;
alter table public.ingresso_pedidos add column if not exists cupom_id uuid;
alter table public.ingresso_pedidos add column if not exists desconto_centavos integer not null default 0;
alter table public.ingresso_pedidos add column if not exists reembolso_por text check (reembolso_por is null or reembolso_por in ('comprador', 'casa', 'mercado_pago'));
alter table public.ingresso_pedidos add column if not exists reembolsado_em timestamptz;

-- 2) Cupons ------------------------------------------------------------------------------------------------
create table if not exists public.ingresso_cupons (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  codigo text not null check (codigo ~ '^[A-Z0-9]{3,20}$'),
  tipo text not null check (tipo in ('pct', 'valor')),
  valor integer not null check (valor > 0),   -- pct: 1–100 · valor: centavos
  limite_usos integer check (limite_usos is null or limite_usos > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (evento_id, codigo),
  constraint ingresso_cupons_pct_ok check (tipo <> 'pct' or valor <= 100)
);
alter table public.ingresso_cupons enable row level security;
drop policy if exists ingresso_cupons_gerir on public.ingresso_cupons;
create policy ingresso_cupons_gerir on public.ingresso_cupons for all using (public.pode_vender_no_evento(evento_id))
  with check (public.pode_vender_no_evento(evento_id));
do $$ begin
  alter table public.ingresso_pedidos add constraint ingresso_pedidos_cupom_fk foreign key (cupom_id) references public.ingresso_cupons(id) on delete set null;
exception when duplicate_object then null; end $$;

create or replace function public.usos_do_cupom(p_cupom uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.ingresso_pedidos
   where cupom_id = p_cupom and (status = 'pago' or (status = 'pendente' and expira_em > now()));
$$;

-- Conferir um cupom antes de pagar (público logado). Não revela a lista de cupons.
create or replace function public.conferir_cupom_ingresso(p_evento uuid, p_codigo text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('ok', true, 'tipo', c.tipo, 'valor', c.valor)
      from public.ingresso_cupons c
     where c.evento_id = p_evento and c.codigo = upper(btrim(p_codigo)) and c.ativo
       and (c.limite_usos is null or public.usos_do_cupom(c.id) < c.limite_usos)), jsonb_build_object('ok', false));
$$;
revoke execute on function public.conferir_cupom_ingresso(uuid, text) from public, anon;
grant execute on function public.conferir_cupom_ingresso(uuid, text) to authenticated;

-- 3) Lote da vez (virada) -------------------------------------------------------------------------------
create or replace function public.lote_a_venda(l public.ingresso_lotes)
returns boolean language sql stable security definer set search_path = public as $$
  select l.ativo and not l.cortesia
     and (l.inicio_venda is null or l.inicio_venda <= now())
     and (l.fim_venda is null or l.fim_venda >= now())
     and public.lote_disponivel(l.id) > 0;
$$;

create or replace function public.lote_da_vez(p_evento uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select l.id from public.ingresso_lotes l
   where l.evento_id = p_evento and public.lote_a_venda(l)
   order by l.ordem, l.preco_centavos limit 1;
$$;

-- 4) Lotes à venda (público): + virada automática, cortesia escondida, se aceita cupom ---------------------
create or replace function public.ingressos_da_festa(p_evento uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ativos', e.ingressos_ativos,
    'casa_conectada', exists (select 1 from public.mp_contas m where m.local_id = e.local_id),
    'taxa_paga_por', e.ingresso_taxa_paga_por,
    'taxa_pct', case when public.local_tem_plano_pago(e.local_id) then 8 else 10 end,
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

-- 5) Reservar (+ cupom, + virada) — troca a função da 131 -------------------------------------------------
drop function if exists public.reservar_ingressos(uuid, jsonb);
create or replace function public.reservar_ingressos(p_evento uuid, p_itens jsonb, p_cupom text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e public.eventos;
  it jsonb; l public.ingresso_lotes; c public.ingresso_cupons;
  v_pedido uuid; v_bruto integer := 0; v_sub integer := 0; v_taxa integer := 0; v_desc integer := 0; v_preco integer; v_pct numeric;
  v_da_vez uuid; r record;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para comprar.' using errcode = '42501'; end if;
  select * into e from public.eventos where id = p_evento and status = 'aprovado' and ingressos_ativos;
  if not found then raise exception 'Os ingressos desta festa não estão à venda.'; end if;
  if coalesce(e.data_fim, e.data_inicio + interval '8 hours') < now() then raise exception 'Esta festa já aconteceu.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) not between 1 and 10 then raise exception 'Escolha de 1 a 10 ingressos.'; end if;
  v_pct := case when public.local_tem_plano_pago(e.local_id) then 0.08 else 0.10 end;

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
  select coalesce(sum(preco_centavos), 0), coalesce(sum(case when preco_centavos > 0 then greatest(round(preco_centavos * v_pct)::integer, 200) else 0 end), 0)
    into v_sub, v_taxa from public.ingressos where pedido_id = v_pedido;

  if v_sub > 0 and not exists (select 1 from public.mp_contas where local_id = e.local_id) then
    raise exception 'Esta casa ainda não conectou a conta para receber.';
  end if;

  update public.ingresso_pedidos
     set subtotal_centavos = v_sub, taxa_centavos = v_taxa, desconto_centavos = v_bruto - v_sub,
         total_centavos = v_sub + case when e.ingresso_taxa_paga_por = 'comprador' then v_taxa else 0 end
   where id = v_pedido;

  if v_sub = 0 then
    update public.ingresso_pedidos set status = 'pago', pago_em = now(), taxa_centavos = 0, total_centavos = 0 where id = v_pedido;
    update public.ingressos set status = 'valido' where pedido_id = v_pedido;
    return jsonb_build_object('pedido_id', v_pedido, 'total_centavos', 0, 'gratis', true);
  end if;
  return jsonb_build_object('pedido_id', v_pedido, 'total_centavos', v_sub + case when e.ingresso_taxa_paga_por = 'comprador' then v_taxa else 0 end,
                            'taxa_centavos', v_taxa, 'desconto_centavos', v_bruto - v_sub, 'gratis', false);
end;
$$;
revoke execute on function public.reservar_ingressos(uuid, jsonb, text) from public, anon;
grant execute on function public.reservar_ingressos(uuid, jsonb, text) to authenticated;

-- 6) Cortesias ---------------------------------------------------------------------------------------------
-- A casa emite (até 50 nomes por vez). Devolve [{titular, codigo}] para mandar o link a cada pessoa.
create or replace function public.emitir_cortesias(p_evento uuid, p_nomes text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_lote uuid; v_pedido uuid; n text; saida jsonb := '[]'::jsonb; v_cod text;
begin
  if not public.pode_vender_no_evento(p_evento) then raise exception 'Sem acesso.' using errcode = '42501'; end if;
  if coalesce(array_length(p_nomes, 1), 0) not between 1 and 50 then raise exception 'De 1 a 50 nomes por vez.'; end if;
  select id into v_lote from public.ingresso_lotes where evento_id = p_evento and cortesia limit 1;
  if v_lote is null then
    insert into public.ingresso_lotes (evento_id, nome, preco_centavos, quantidade, permite_meia, cortesia, ordem)
    values (p_evento, 'Cortesia', 0, 100000, false, true, 999) returning id into v_lote;
  end if;
  insert into public.ingresso_pedidos (user_id, evento_id, local_id, status, subtotal_centavos, taxa_centavos, total_centavos, taxa_paga_por, pago_em)
  select auth.uid(), e.id, e.local_id, 'pago', 0, 0, 0, 'casa', now() from public.eventos e where e.id = p_evento
  returning id into v_pedido;
  foreach n in array p_nomes loop
    continue when char_length(btrim(coalesce(n, ''))) < 2;
    insert into public.ingressos (pedido_id, lote_id, evento_id, user_id, titular, preco_centavos, status, cortesia, cortesia_resgatar)
    values (v_pedido, v_lote, p_evento, auth.uid(), left(btrim(n), 80), 0, 'valido', true, true)
    returning codigo into v_cod;
    saida := saida || jsonb_build_array(jsonb_build_object('titular', left(btrim(n), 80), 'codigo', v_cod));
  end loop;
  return saida;
end;
$$;
revoke execute on function public.emitir_cortesias(uuid, text[]) from public, anon;
grant execute on function public.emitir_cortesias(uuid, text[]) to authenticated;

-- Quem recebeu o link guarda a cortesia na própria conta
create or replace function public.resgatar_cortesia(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare i record;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para guardar o ingresso.' using errcode = '42501'; end if;
  select g.id, g.titular, g.status, g.cortesia_resgatar, g.user_id, e.titulo, e.data_inicio
    into i from public.ingressos g join public.eventos e on e.id = g.evento_id
   where g.codigo = upper(btrim(p_codigo)) and g.cortesia;
  if not found then raise exception 'Cortesia não encontrada.'; end if;
  if i.status <> 'valido' then raise exception 'Esta cortesia não vale mais.'; end if;
  if not i.cortesia_resgatar and i.user_id <> auth.uid() then raise exception 'Esta cortesia já foi guardada por outra pessoa.'; end if;
  update public.ingressos set user_id = auth.uid(), cortesia_resgatar = false where id = i.id;
  return jsonb_build_object('titular', i.titular, 'festa', i.titulo, 'data_inicio', i.data_inicio);
end;
$$;
revoke execute on function public.resgatar_cortesia(text) from public, anon;
grant execute on function public.resgatar_cortesia(text) to authenticated;

-- 7) Reembolso ---------------------------------------------------------------------------------------------
-- O comprador pode pedir? (7 dias depois da compra e até 48h antes da festa)
create or replace function public.pode_pedir_reembolso(p_pedido uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ingresso_pedidos p join public.eventos e on e.id = p.evento_id
    where p.id = p_pedido and p.user_id = auth.uid() and p.status = 'pago' and p.total_centavos > 0
      and p.pago_em > now() - interval '7 days' and e.data_inicio > now() + interval '48 hours'
      and not exists (select 1 from public.ingressos i where i.pedido_id = p.id and i.status = 'usado'));
$$;
revoke execute on function public.pode_pedir_reembolso(uuid) from public, anon;
grant execute on function public.pode_pedir_reembolso(uuid) to authenticated;

create or replace function public.reembolsar_pedido_ingresso(p_pedido uuid, p_por text default 'mercado_pago')
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.ingresso_pedidos set status = 'reembolsado', reembolsado_em = now(), reembolso_por = p_por where id = p_pedido;
  update public.ingressos set status = 'cancelado' where pedido_id = p_pedido and status in ('reservado', 'valido');
end;
$$;
revoke execute on function public.reembolsar_pedido_ingresso(uuid, text) from public, anon, authenticated;
drop function if exists public.reembolsar_pedido_ingresso(uuid);

-- 8) Compradores da festa (para a casa): nomes dos ingressos, sem contato ----------------------------------
create or replace function public.compradores_do_evento(p_evento uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_vender_no_evento(p_evento) then raise exception 'Sem acesso.' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.pago_em desc nulls last) from (
      select p.id as pedido_id, p.status, p.total_centavos, p.desconto_centavos, p.pago_em,
             exists (select 1 from public.ingressos i0 where i0.pedido_id = p.id and i0.cortesia) as cortesia,
             (select jsonb_agg(jsonb_build_object('titular', i.titular, 'lote', l.nome, 'meia', i.meia, 'status', i.status,
                       'resgatar', i.cortesia_resgatar, 'codigo', case when i.cortesia then i.codigo end) order by i.titular)
                from public.ingressos i join public.ingresso_lotes l on l.id = i.lote_id where i.pedido_id = p.id) as ingressos
        from public.ingresso_pedidos p
       where p.evento_id = p_evento and p.status in ('pago', 'reembolsado')) x), '[]'::jsonb);
end;
$$;
revoke execute on function public.compradores_do_evento(uuid) from public, anon;
grant execute on function public.compradores_do_evento(uuid) to authenticated;

-- Conferência
select to_regclass('public.ingresso_cupons') as cupons, to_regprocedure('public.reservar_ingressos(uuid,jsonb,text)') as reservar;
