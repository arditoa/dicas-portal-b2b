-- 093 — Rodada 138: "festa do plano" (Fundador e Premium) na faixa "Festas em destaque".
--
-- Regra decidida pela Andrea (11/11/2026):
--   * Festa avulsa paga (R$89, destaque_secoes 'patrocinado'): aparece 1 dia antes e no dia, na tela inicial de
--     Festas e na tela da subcategoria (tipo) da festa.
--   * Marca com plano Fundador ou Premium: tem direito a 4 festas por mês (mês da data da festa), que aparecem
--     TODOS OS DIAS, da ativação até o fim da festa, nos mesmos lugares. Valor novo: destaque_secoes 'plano_festa'.
--   * O parceiro liga/desliga pelo portal (Minhas festas); a equipe também, pelo /admin.
--
-- O parceiro não pode mexer em destaque_secoes direto (gatilho protect_admin_fields_eventos). Por isso a função
-- destacar_festa_do_plano() confere dono, plano e limite, e só então grava, com uma marca de sessão que o gatilho
-- respeita. Rode uma vez, inteira, no SQL Editor.

-- 1) Valor novo permitido
alter table public.eventos drop constraint if exists eventos_destaque_secoes_validas;
alter table public.eventos add constraint eventos_destaque_secoes_validas
  check (destaque_secoes <@ array['evento_destaque', 'destaque', 'hoje', 'patrocinado', 'plano_festa']::text[]);

-- 2) Quem tem direito: plano Fundador/Premium ativo OU selo Membro Fundador ativo
create or replace function public.marca_tem_festa_do_plano(p_local uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.locais l
     where l.id = p_local
       and l.plano_comercial in ('fundador', 'premium')
       and coalesce(l.plano_comercial_status, 'ativo') = 'ativo'
  ) or exists (
    select 1 from public.local_badges b
     where b.local_id = p_local and b.ativo and b.rotulo ilike '%fundador%'
  );
$$;

-- 3) Quantas festas do plano a marca já usou no mês de uma data (horário de Brasília)
create or replace function public.festas_do_plano_no_mes(p_local uuid, p_data timestamptz)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int from public.eventos e
   where e.local_id = p_local
     and 'plano_festa' = any(e.destaque_secoes)
     and e.status <> 'cancelado'
     and date_trunc('month', e.data_inicio at time zone 'America/Sao_Paulo')
       = date_trunc('month', p_data at time zone 'America/Sao_Paulo');
$$;

-- 4) Gatilho de proteção: respeita a marca de sessão usada só pela função abaixo
create or replace function public.protect_admin_fields_eventos()
returns trigger
language plpgsql security definer set search_path to 'public'
as $function$
declare
  campos_sensiveis_mudaram boolean;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;
  -- Rodada 138: liga/desliga da festa do plano, já conferido em destacar_festa_do_plano().
  if current_setting('dicas.festa_do_plano', true) = 'on' then
    return new;
  end if;
  new.plano_destaque := old.plano_destaque;
  new.criado_por := old.criado_por;
  new.destaque_ate := old.destaque_ate;
  new.destaque_secao_fixada := old.destaque_secao_fixada;
  new.destaque_secoes := old.destaque_secoes;
  if new.status = 'cancelado' then
    return new;
  end if;
  if old.status = 'cancelado' or new.status = 'aprovado' then
    new.status := old.status;
  end if;
  if old.status = 'aprovado' and new.status <> 'cancelado' then
    campos_sensiveis_mudaram := (
      new.data_inicio is distinct from old.data_inicio
      or new.data_fim is distinct from old.data_fim
      or new.local_id is distinct from old.local_id
      or new.titulo is distinct from old.titulo
    );
    if campos_sensiveis_mudaram then
      new.status := 'pendente';
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$function$;

-- 5) Liga/desliga (parceiro dono da marca ou equipe)
create or replace function public.destacar_festa_do_plano(p_evento uuid, p_ligar boolean)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  ev record;
  usadas int;
  limite constant int := 4;
begin
  select e.id, e.local_id, e.status, e.data_inicio, e.data_fim, e.destaque_secoes
    into ev from public.eventos e where e.id = p_evento;
  if ev.id is null then raise exception 'Festa não encontrada.'; end if;
  if ev.local_id is null then raise exception 'A festa precisa estar ligada a uma marca com plano.'; end if;
  if not public.is_admin() and not exists (
    select 1 from public.locais l where l.id = ev.local_id and l.owner_id = auth.uid()
  ) then
    raise exception 'Só o dono da marca pode destacar esta festa.';
  end if;

  if p_ligar then
    if ev.status <> 'aprovado' then raise exception 'A festa precisa estar aprovada.'; end if;
    if coalesce(ev.data_fim, ev.data_inicio) < now() then raise exception 'Esta festa já aconteceu.'; end if;
    if not public.marca_tem_festa_do_plano(ev.local_id) then
      raise exception 'Destaque de festa do plano é para marcas Fundador ou Premium.';
    end if;
    if 'plano_festa' = any(coalesce(ev.destaque_secoes, '{}')) then
      return json_build_object('ok', true, 'usadas', public.festas_do_plano_no_mes(ev.local_id, ev.data_inicio), 'limite', limite);
    end if;
    usadas := public.festas_do_plano_no_mes(ev.local_id, ev.data_inicio);
    if usadas >= limite and not public.is_admin() then
      raise exception 'Seu plano já usou as % festas deste mês.', limite;
    end if;
  end if;

  perform set_config('dicas.festa_do_plano', 'on', true);
  update public.eventos
     set destaque_secoes = case
       when p_ligar then array(select distinct x from unnest(coalesce(destaque_secoes, '{}') || array['plano_festa']) x)
       else array(select x from unnest(coalesce(destaque_secoes, '{}')) x where x <> 'plano_festa')
     end
   where id = p_evento;
  perform set_config('dicas.festa_do_plano', 'off', true);

  return json_build_object('ok', true, 'usadas', public.festas_do_plano_no_mes(ev.local_id, ev.data_inicio), 'limite', limite);
end;
$$;

revoke all on function public.destacar_festa_do_plano(uuid, boolean) from public, anon;
grant execute on function public.destacar_festa_do_plano(uuid, boolean) to authenticated;
grant execute on function public.marca_tem_festa_do_plano(uuid) to authenticated;
grant execute on function public.festas_do_plano_no_mes(uuid, timestamptz) to authenticated;

-- Conferência: deve listar 'plano_festa' entre os valores permitidos.
select pg_get_constraintdef(oid) from pg_constraint where conname = 'eventos_destaque_secoes_validas';
