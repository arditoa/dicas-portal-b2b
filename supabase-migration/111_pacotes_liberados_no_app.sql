-- 111 — Catálogo, pacotes e hospedagem no Modo parceiro (Etapas 12–14, 13/11/2026).
--
-- meus_locais_parceiro passa a devolver também pode_subir_pacotes (052). O app mostra "Pacotes e roteiros"
-- só para quem foi liberado, igual ao portal (sem a coluna, vale categoria turismo).
-- Mesmo corpo da 104, mais uma coluna no fim. Seguro rodar mais de uma vez. Rode depois da 104.

drop function if exists public.meus_locais_parceiro();
create function public.meus_locais_parceiro()
returns table (
  local_id uuid, nome text, categoria text, subcategoria text, plano_comercial text, plano_comercial_status text,
  papel text, permissoes text[], expira_em timestamptz, pode_subir_pacotes boolean
)
language sql stable security definer
set search_path = public
as $$
  select l.id, l.nome, l.categoria::text, l.subcategoria, l.plano_comercial::text, l.plano_comercial_status::text,
         'dono', array['porta', 'checkins', 'lista_vip', 'festa', 'banner', 'cupons', 'resultados'], null::timestamptz,
         coalesce(l.pode_subir_pacotes, false)
    from public.locais l
   where l.owner_id = auth.uid() and auth.uid() is not null
  union all
  select l.id, l.nome, l.categoria::text, l.subcategoria, l.plano_comercial::text, l.plano_comercial_status::text,
         q.modelo, q.permissoes, q.expira_em, coalesce(l.pode_subir_pacotes, false)
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

-- Conferência: o formato tem que terminar com pode_subir_pacotes.
select pg_get_function_result('public.meus_locais_parceiro()'::regprocedure) as formato;
