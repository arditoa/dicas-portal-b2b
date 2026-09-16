-- Complemento ao 007_storage_fotos_locais.sql, pro /cadastro/rapido (Round
-- 24): agora dá pra anexar foto do local ou arte da festa já no formulário
-- público, sem login. As policies de storage antigas só liberavam upload
-- pra quem já é owner_id do local — impossível nesse momento, já que o
-- registro acabou de nascer sem dono (owner_id/criado_por só é preenchido
-- na Etapa 2, depois de aprovado — ver 005_planos_comerciais_e_vinculo_local.sql).
--
-- Solução: liberar insert de arquivo também quando a linha ainda está
-- "pendente" e "sem dono" — exatamente o estado em que ela nasce no
-- cadastro público. Depois de aprovada e vinculada a uma conta (owner_id /
-- criado_por preenchido), essa liberação deixa de valer sozinha e passa a
-- valer a policy de dono/admin.

-- 1) fotos-locais: libera upload pro próprio local recém-criado, pendente
-- e sem dono.
drop policy if exists "fotos_locais_insert_pendente_anonimo" on storage.objects;
create policy "fotos_locais_insert_pendente_anonimo"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and l.owner_id is null
        and l.status = 'pendente'
    )
  );

-- 2) Novo bucket fotos-eventos (arte/flyer da festa) — mesmo modelo do
-- fotos-locais: leitura pública, escrita liberada pro evento pendente e
-- sem dono (cadastro público) e, depois, pro dono (criado_por) ou admin.
insert into storage.buckets (id, name, public)
values ('fotos-eventos', 'fotos-eventos', true)
on conflict (id) do nothing;

drop policy if exists "fotos_eventos_select_publico" on storage.objects;
create policy "fotos_eventos_select_publico"
  on storage.objects for select
  using (bucket_id = 'fotos-eventos');

drop policy if exists "fotos_eventos_insert_pendente_anonimo" on storage.objects;
create policy "fotos_eventos_insert_pendente_anonimo"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-eventos'
    and exists (
      select 1 from public.eventos e
      where e.id::text = (storage.foldername(name))[1]
        and e.criado_por is null
        and e.status = 'pendente'
    )
  );

drop policy if exists "fotos_eventos_insert_dono" on storage.objects;
create policy "fotos_eventos_insert_dono"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-eventos'
    and exists (
      select 1 from public.eventos e
      where e.id::text = (storage.foldername(name))[1]
        and (e.criado_por = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "fotos_eventos_update_dono" on storage.objects;
create policy "fotos_eventos_update_dono"
  on storage.objects for update
  using (
    bucket_id = 'fotos-eventos'
    and exists (
      select 1 from public.eventos e
      where e.id::text = (storage.foldername(name))[1]
        and (e.criado_por = auth.uid() or public.is_admin())
    )
  );
