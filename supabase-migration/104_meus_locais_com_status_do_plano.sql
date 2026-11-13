-- 104 — Etapa 0 do Modo parceiro (13/11/2026): plano efetivo no app, equipe criando Lista VIP e
--       Gratuito sem cupom (decisão da Andrea).
--
-- 1) meus_locais_parceiro passa a devolver plano_comercial_status. O app aplica a mesma regra do
--    planoEfetivo do portal: plano pago só vale com status 'ativo'; em interesse, aguardando pagamento
--    ou cancelado, vale como Gratuito (cadeados, nome do plano e cotas). Status vazio = 'ativo', igual ao
--    coalesce de local_tem_plano_pago e marca_tem_festa_do_plano.
-- 2) Lista VIP: quem tem a permissão 'lista_vip' no local pode CRIAR a lista da festa (editar já podia,
--    pela 099: listas_vip_write_equipe). Antes, criar era só do dono/criador da festa (008).
-- 3) Cupons: a 099 já deixa quem tem 'cupons' criar e editar (cupons_write_equipe). Recriada aqui igual,
--    para esta migração ficar completa. Os limites por plano continuam nos gatilhos (075/078) para todos.
--    uso_ofertas_periodo (o "libera em dd/mm") passa a responder também para a equipe com 'cupons'
--    (antes dava "Sem permissão." para quem não era o dono).
-- 4) Decisão da Andrea (13/11/2026): plano Gratuito NÃO cria cupom. Inserir cupom exige plano pago
--    efetivo (intermediário, premium ou fundador com status ativo; status vazio = ativo, igual ao 075).
--    O admin pode sempre. Cupons que já existem no Gratuito NÃO são apagados nem desligados aqui.
-- Mesmo padrão da 103 (pode_no_local da 099, que já inclui dono e admin). Seguro rodar mais de uma vez.
-- Rode depois da 099 (e da 103).

-- 1) Locais do parceiro com o status do plano (mudou o formato da resposta: precisa apagar e recriar)
drop function if exists public.meus_locais_parceiro();
create function public.meus_locais_parceiro()
returns table (
  local_id uuid, nome text, categoria text, subcategoria text, plano_comercial text, plano_comercial_status text,
  papel text, permissoes text[], expira_em timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select l.id, l.nome, l.categoria::text, l.subcategoria, l.plano_comercial::text, l.plano_comercial_status::text,
         'dono', array['porta', 'checkins', 'lista_vip', 'festa', 'banner', 'cupons', 'resultados'], null::timestamptz
    from public.locais l
   where l.owner_id = auth.uid() and auth.uid() is not null
  union all
  select l.id, l.nome, l.categoria::text, l.subcategoria, l.plano_comercial::text, l.plano_comercial_status::text,
         q.modelo, q.permissoes, q.expira_em
    from public.local_equipe q
    join public.locais l on l.id = q.local_id
    left join public.porta_acesso pa on pa.local_id = q.local_id
   where q.user_id = auth.uid()
     and (q.expira_em is null or q.expira_em > now())
     and (q.modelo <> 'porta_pin' or q.pin_versao = pa.versao)
     and l.owner_id is distinct from auth.uid();
$$;
revoke execute on function public.meus_locais_parceiro() from public, anon;
grant execute on function public.meus_locais_parceiro() to authenticated;

-- 2) Equipe com 'lista_vip' cria a Lista VIP de uma festa do local
drop policy if exists "listas_vip_insert_equipe" on public.listas_vip;
create policy "listas_vip_insert_equipe" on public.listas_vip for insert to authenticated
  with check (exists (
    select 1 from public.eventos e
     where e.id = evento_id and e.local_id is not null
       and public.pode_no_local(e.local_id, 'lista_vip')
  ));
-- (editar: listas_vip_write_equipe da 099, com pode_na_lista_vip(id, 'lista_vip'))

-- 3) Equipe com 'cupons' cria e edita cupons (igual à 099)
drop policy if exists "cupons_write_equipe" on public.cupons;
create policy "cupons_write_equipe" on public.cupons for all to authenticated
  using (public.pode_no_local(local_id, 'cupons')) with check (public.pode_no_local(local_id, 'cupons'));

-- 3b) "Libera em dd/mm" para a equipe com 'cupons' (mesmo miolo da 075; só muda quem pode perguntar)
create or replace function public.uso_ofertas_periodo(p_local_id uuid)
returns table (plano text, periodo text, limite integer, usadas integer, dias integer, libera_em timestamptz)
language plpgsql security definer stable set search_path = public as $$
declare
  v_plano text;
  v_status text;
  v_sem integer;
  v_mes integer;
  v_dias integer;
  v_usadas integer;
  v_libera timestamptz;
begin
  if not public.pode_no_local(p_local_id, 'cupons') then   -- dono, admin ou equipe com 'cupons'
    raise exception 'Sem permissão.';
  end if;
  select l.plano_comercial::text, l.plano_comercial_status::text into v_plano, v_status from public.locais l where l.id = p_local_id;
  if v_plano is null or (v_status is not null and v_status <> 'ativo') then v_plano := 'freemium'; end if;
  select p.limite_semana, p.limite_mes, coalesce(p.periodo_dias, 7) into v_sem, v_mes, v_dias
    from public.planos_limite_ofertas p where p.plano = v_plano;

  if v_sem is not null then
    select count(*)::integer into v_usadas from public.cupons c
      where c.local_id = p_local_id and c.created_at >= now() - make_interval(days => v_dias);
    if v_usadas >= v_sem then
      select min(x.created_at) + make_interval(days => v_dias) into v_libera
      from (select c.created_at from public.cupons c
             where c.local_id = p_local_id and c.created_at >= now() - make_interval(days => v_dias)
             order by c.created_at desc limit greatest(v_sem, 1)) x;
    end if;
    return query select v_plano, 'dias'::text, v_sem, v_usadas, v_dias, v_libera;
  else
    return query select v_plano, 'mes'::text, v_mes,
      (select count(*)::integer from public.cupons c where c.local_id = p_local_id and c.created_at >= date_trunc('month', now())),
      30, null::timestamptz;
  end if;
end;
$$;
grant execute on function public.uso_ofertas_periodo(uuid) to authenticated;

-- 4) Gratuito não cria cupom (trava de verdade; o app e o portal só explicam)
create or replace function public.exigir_plano_pago_no_cupom()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then   -- admin e rotinas do servidor
    return new;
  end if;
  if not exists (
    select 1 from public.locais l
     where l.id = new.local_id
       and l.plano_comercial::text in ('intermediario', 'premium', 'fundador')
       and coalesce(l.plano_comercial_status::text, 'ativo') = 'ativo'
  ) then
    raise exception 'Os cupons aparecem na página da casa e na busca e estão incluídos nos planos pagos.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
-- "a_" no nome: roda antes do gatilho de limite (075), para o Gratuito ver esta mensagem, e não a de limite.
drop trigger if exists before_insert_cupons_a_plano_pago on public.cupons;
create trigger before_insert_cupons_a_plano_pago before insert on public.cupons
  for each row execute function public.exigir_plano_pago_no_cupom();

-- Conferência: a função tem que listar plano_comercial_status, e as duas políticas têm que aparecer.
select pg_get_function_result('public.meus_locais_parceiro()'::regprocedure) as formato;
select tablename, policyname from pg_policies
 where policyname in ('listas_vip_insert_equipe', 'cupons_write_equipe', 'listas_vip_write_equipe')
 order by 1, 2;
-- e o gatilho novo dos cupons:
select tgname from pg_trigger where tgrelid = 'public.cupons'::regclass and not tgisinternal order by 1;
-- Para saber se há cupom ativo de local sem plano pago (ficam como estão; decidir à parte):
select c.local_id, l.nome, count(*) as cupons_ativos
  from public.cupons c join public.locais l on l.id = c.local_id
 where c.ativo
   and not (l.plano_comercial::text in ('intermediario', 'premium', 'fundador') and coalesce(l.plano_comercial_status::text, 'ativo') = 'ativo')
 group by 1, 2 order by 3 desc;
