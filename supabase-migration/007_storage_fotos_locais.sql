-- ============================================================================
-- 007 — Bucket de Storage pra foto de capa dos locais (upload de arquivo
-- de verdade, substituindo o campo de link que existia desde a Rodada 16)
-- ============================================================================
-- Rodada 17. Convenção de caminho dentro do bucket: "<local_id>/<arquivo>"
-- (ex.: "aaaaaaaa-.../capa-1694900000000.jpg") — o primeiro segmento do
-- caminho É o id do local, e é nele que a RLS abaixo se apoia pra saber
-- quem pode escrever onde, com storage.foldername(name)[1].
--
-- Bucket público pra LEITURA (a foto precisa aparecer pro usuário final do
-- app sem exigir login), mas ESCRITA (insert/update/delete) só pro dono do
-- local ou admin — mesmo princípio de "locais_update_dono_ou_admin" em
-- 001_migrar_para_locais.sql, agora aplicado a arquivo em vez de linha.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('fotos-locais', 'fotos-locais', true)
on conflict (id) do nothing;

drop policy if exists "fotos_locais_select_publico" on storage.objects;
create policy "fotos_locais_select_publico"
  on storage.objects for select
  using (bucket_id = 'fotos-locais');

drop policy if exists "fotos_locais_insert_dono" on storage.objects;
create policy "fotos_locais_insert_dono"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "fotos_locais_update_dono" on storage.objects;
create policy "fotos_locais_update_dono"
  on storage.objects for update
  using (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "fotos_locais_delete_dono" on storage.objects;
create policy "fotos_locais_delete_dono"
  on storage.objects for delete
  using (
    bucket_id = 'fotos-locais'
    and exists (
      select 1 from public.locais l
      where l.id::text = (storage.foldername(name))[1]
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );
