-- Foto de perfil (opcional). Bucket PRIVADO: cada pessoa só lê, grava e apaga a própria pasta
-- ("<id do usuário>/avatar.jpg"). O app mostra a foto por link temporário; ninguém mais a vê por enquanto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "avatares_ler_proprio" on storage.objects;
create policy "avatares_ler_proprio" on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares_gravar_proprio" on storage.objects;
create policy "avatares_gravar_proprio" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares_atualizar_proprio" on storage.objects;
create policy "avatares_atualizar_proprio" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares_apagar_proprio" on storage.objects;
create policy "avatares_apagar_proprio" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
