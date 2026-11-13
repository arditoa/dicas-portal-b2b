-- 105 — Flyer da festa pelo Modo parceiro (telas Minhas festas e Nova/Editar festa, 13/11/2026).
--
-- Antes: no bucket fotos-eventos só subia arquivo quem CRIOU a festa (criado_por) ou o admin (migração 009).
-- O dono do local (quando outra pessoa da casa criou a festa) e a equipe com a permissão 'festa'
-- (gerente, social media) editavam a festa (099: eventos_update_equipe), mas recebiam erro ao trocar o flyer.
-- Agora: quem tem 'festa' no local da festa pode subir, trocar e apagar arquivos na pasta "<evento_id>/...".
-- As regras antigas (criador, admin, cadastro público) continuam valendo. Seguro rodar mais de uma vez.
-- Rode depois da 099.

create or replace function public.pode_no_evento(p_pasta text, p_perm text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((
    select public.pode_no_local(e.local_id, p_perm)
      from public.eventos e
     where e.id = public.uuid_ou_nulo(p_pasta) and e.local_id is not null
  ), false);
$$;
revoke execute on function public.pode_no_evento(text, text) from public, anon;
grant execute on function public.pode_no_evento(text, text) to authenticated;

drop policy if exists "fotos_eventos_insert_equipe" on storage.objects;
create policy "fotos_eventos_insert_equipe" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-eventos' and public.pode_no_evento((storage.foldername(name))[1], 'festa'));

drop policy if exists "fotos_eventos_update_equipe" on storage.objects;
create policy "fotos_eventos_update_equipe" on storage.objects for update to authenticated
  using (bucket_id = 'fotos-eventos' and public.pode_no_evento((storage.foldername(name))[1], 'festa'));

drop policy if exists "fotos_eventos_delete_equipe" on storage.objects;
create policy "fotos_eventos_delete_equipe" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-eventos' and public.pode_no_evento((storage.foldername(name))[1], 'festa'));

-- Conferência: devem aparecer as 3 políticas.
select policyname from pg_policies where policyname like 'fotos_eventos_%_equipe' order by 1;
