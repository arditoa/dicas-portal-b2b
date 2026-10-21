-- Rodada 65 — Tela "Destinos" no /admin (cidades do Dicas Trip).
-- Rodar DEPOIS da 036.
--
--   1) destinos.foto_credito — crédito/fonte da foto (ex.: "Foto: Embratur",
--      "Unsplash / Fulano"), mostrado pequeno no app. Guardar a origem de
--      cada imagem protege o app em caso de questionamento de direitos.
--   2) Bucket público `fotos-destinos`: leitura pública (o app mostra a foto),
--      envio/troca/remoção só para admin.

begin;

alter table public.destinos add column if not exists foto_credito text;

insert into storage.buckets (id, name, public)
values ('fotos-destinos', 'fotos-destinos', true)
on conflict (id) do nothing;

drop policy if exists "fotos_destinos_leitura_publica" on storage.objects;
create policy "fotos_destinos_leitura_publica" on storage.objects
  for select using (bucket_id = 'fotos-destinos');

drop policy if exists "fotos_destinos_admin_insert" on storage.objects;
create policy "fotos_destinos_admin_insert" on storage.objects
  for insert with check (bucket_id = 'fotos-destinos' and public.is_admin());

drop policy if exists "fotos_destinos_admin_update" on storage.objects;
create policy "fotos_destinos_admin_update" on storage.objects
  for update using (bucket_id = 'fotos-destinos' and public.is_admin());

drop policy if exists "fotos_destinos_admin_delete" on storage.objects;
create policy "fotos_destinos_admin_delete" on storage.objects
  for delete using (bucket_id = 'fotos-destinos' and public.is_admin());

commit;
