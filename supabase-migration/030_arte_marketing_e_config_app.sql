-- 030: bucket de arte de marketing (global, não ligada a um local) +
-- tabela de configuração chave/valor.
--
-- Contexto: Andrea pediu "espaço" no /admin pra subir uma arte especial
-- do banner "Membro Fundador" na Home (arte própria, "a gente mesmo
-- criará"), separado do upload de logo por local (migration 029). Como
-- essa imagem não pertence a nenhum `locais.id`, ela NÃO cabe no bucket
-- `fotos-locais` — a RLS de lá (007_storage_fotos_locais.sql) exige que
-- o primeiro segmento do caminho seja um `locais.id` de verdade
-- (`storage.foldername(name)[1]`), então mesmo admin não conseguiria
-- escrever num caminho tipo "_global/...". Por isso: bucket novo,
-- dedicado a conteúdo de marca/marketing (não por local), com escrita
-- só pra admin (sem o "ou dono" que os outros buckets têm, porque não
-- existe "dono" de uma arte global).
--
-- `app_config` é uma tabela chave/valor pequena e genérica — pensada
-- pra guardar não só a URL desta arte, mas qualquer outra configuração
-- "uma só, vale pro app inteiro" que aparecer no futuro (evita precisar
-- de uma migration nova pra cada configuração global nova).

begin;

insert into storage.buckets (id, name, public)
values ('arte-marketing', 'arte-marketing', true)
on conflict (id) do nothing;

drop policy if exists "arte_marketing_select_publico" on storage.objects;
create policy "arte_marketing_select_publico"
  on storage.objects for select
  using (bucket_id = 'arte-marketing');

drop policy if exists "arte_marketing_admin_insert" on storage.objects;
create policy "arte_marketing_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'arte-marketing' and public.is_admin());

drop policy if exists "arte_marketing_admin_update" on storage.objects;
create policy "arte_marketing_admin_update"
  on storage.objects for update
  using (bucket_id = 'arte-marketing' and public.is_admin())
  with check (bucket_id = 'arte-marketing' and public.is_admin());

drop policy if exists "arte_marketing_admin_delete" on storage.objects;
create policy "arte_marketing_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'arte-marketing' and public.is_admin());

create table if not exists public.app_config (
  chave text primary key,
  valor text,
  atualizado_em timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Leitura pública (o app final lê sem estar logado, igual as fotos).
drop policy if exists "app_config_select_publico" on public.app_config;
create policy "app_config_select_publico"
  on public.app_config for select
  using (true);

drop policy if exists "app_config_admin_insert" on public.app_config;
create policy "app_config_admin_insert"
  on public.app_config for insert
  with check (public.is_admin());

drop policy if exists "app_config_admin_update" on public.app_config;
create policy "app_config_admin_update"
  on public.app_config for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "app_config_admin_delete" on public.app_config;
create policy "app_config_admin_delete"
  on public.app_config for delete
  using (public.is_admin());

commit;
