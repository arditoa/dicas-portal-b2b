-- 104 — Etapa 0 do Modo parceiro (13/11/2026): plano efetivo no app + equipe criando Lista VIP.
--
-- 1) meus_locais_parceiro passa a devolver plano_comercial_status. O app aplica a mesma regra do
--    planoEfetivo do portal: plano pago só vale com status 'ativo'; em interesse, aguardando pagamento
--    ou cancelado, vale como Gratuito (cadeados, nome do plano e cotas). Status vazio = 'ativo', igual ao
--    coalesce de local_tem_plano_pago e marca_tem_festa_do_plano.
-- 2) Lista VIP: quem tem a permissão 'lista_vip' no local pode CRIAR a lista da festa (editar já podia,
--    pela 099: listas_vip_write_equipe). Antes, criar era só do dono/criador da festa (008).
-- 3) Cupons: a 099 já deixa quem tem 'cupons' criar e editar (cupons_write_equipe). Recriada aqui igual,
--    para esta migração ficar completa. Os limites por plano continuam nos gatilhos (075/078) para todos.
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

-- Conferência: a função tem que listar plano_comercial_status, e as duas políticas têm que aparecer.
select pg_get_function_result('public.meus_locais_parceiro()'::regprocedure) as formato;
select tablename, policyname from pg_policies
 where policyname in ('listas_vip_insert_equipe', 'cupons_write_equipe', 'listas_vip_write_equipe')
 order by 1, 2;
