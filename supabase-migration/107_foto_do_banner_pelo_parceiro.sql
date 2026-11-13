-- 107 — Foto do banner pelo parceiro (tela Banner do Modo parceiro, 13/11/2026).
--
-- PROBLEMA ENCONTRADO: o gatilho touch_destaque_chamada (migração 060) apaga a foto do banner quando quem salva
-- não é admin (no INSERT grava imagem_url = null; no UPDATE mantém a antiga). Por isso, quando o dono sobe a foto
-- pelo portal (dashboard/destaques, rodada 136), a foto é descartada sem aviso e o banner fica sem foto.
-- Agora: o parceiro (dono ou equipe com a permissão 'banner') pode gravar a foto, desde que seja um arquivo do
-- PRÓPRIO local no bucket fotos-locais ("<local_id>/banner-…"), ou tirar a foto (null). Link de fora continua
-- bloqueado. 'ativo' e 'escrito_por' seguem protegidos como antes.
-- E: a equipe com 'banner' passa a poder subir/trocar/apagar "<local_id>/banner-…" em fotos-locais.
-- Seguro rodar mais de uma vez. Rode depois da 099 (e da 103).

create or replace function public.touch_destaque_chamada()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prefixo text;
  v_foto_ok boolean;
begin
  if not public.is_admin() then
    -- foto só do próprio local, no bucket fotos-locais, com nome "banner-…"
    v_prefixo := '/storage/v1/object/public/fotos-locais/' || new.local_id::text || '/banner-';
    v_foto_ok := new.imagem_url is null or position(v_prefixo in new.imagem_url) > 0;
    if tg_op = 'INSERT' then
      if not v_foto_ok then new.imagem_url := null; end if;
      new.ativo := true;
    else
      new.local_id := old.local_id;
      if not v_foto_ok then new.imagem_url := old.imagem_url; end if;
      new.ativo := old.ativo;
    end if;
    new.escrito_por := 'local';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Equipe com 'banner' sobe a foto do banner (o dono já podia pela 007)
drop policy if exists "fotos_locais_banner_insert_equipe" on storage.objects;
create policy "fotos_locais_banner_insert_equipe" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-locais'
    and (storage.filename(name)) like 'banner-%'
    and public.pode_no_local(public.uuid_ou_nulo((storage.foldername(name))[1]), 'banner')
  );
drop policy if exists "fotos_locais_banner_update_equipe" on storage.objects;
create policy "fotos_locais_banner_update_equipe" on storage.objects for update to authenticated
  using (
    bucket_id = 'fotos-locais'
    and (storage.filename(name)) like 'banner-%'
    and public.pode_no_local(public.uuid_ou_nulo((storage.foldername(name))[1]), 'banner')
  );
drop policy if exists "fotos_locais_banner_delete_equipe" on storage.objects;
create policy "fotos_locais_banner_delete_equipe" on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos-locais'
    and (storage.filename(name)) like 'banner-%'
    and public.pode_no_local(public.uuid_ou_nulo((storage.foldername(name))[1]), 'banner')
  );

-- Conferência: devem aparecer as 3 políticas, e banners com foto que já foram salvos com sucesso.
select policyname from pg_policies where policyname like 'fotos_locais_banner_%' order by 1;
select count(*) filter (where imagem_url is not null) as banners_com_foto, count(*) as banners from public.destaque_chamada;
