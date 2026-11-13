-- 103 — Agenda da semana pela equipe (Modo parceiro, tela Agenda da semana, 13/11/2026).
--
-- Antes: só o DONO (owner_id) gravava em agenda_semanal (migração 023) e subia foto em fotos-locais (007).
-- O Modo parceiro mostra a Agenda para quem tem a permissão 'festa' (gerente, social media, personalizado),
-- então essas pessoas recebiam "sem permissão" ao salvar. Agora:
--   * agenda_semanal: ler e gravar = dono, admin ou quem tem 'festa' no local (pode_no_local, migração 099).
--   * fotos-locais: quem tem 'festa' pode subir/trocar/apagar SÓ arquivos da agenda ("<local_id>/agenda-...").
--   * Destacar com o plano continua só do dono (destacar_agenda_do_plano, migração 101) — não muda aqui.
-- O portal continua igual (o dono segue podendo tudo). Seguro rodar mais de uma vez. Rode depois da 099 e da 101.

-- 1) agenda_semanal
drop policy if exists "agenda_semanal_select_publico" on public.agenda_semanal;
create policy "agenda_semanal_select_publico" on public.agenda_semanal
  for select using (
    (ativo = true and exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado'))
    or public.pode_no_local(local_id, 'festa')
  );

drop policy if exists "agenda_semanal_write_dono_ou_admin" on public.agenda_semanal;
drop policy if exists "agenda_semanal_write_equipe" on public.agenda_semanal;
create policy "agenda_semanal_write_equipe" on public.agenda_semanal
  for all using (public.pode_no_local(local_id, 'festa'))
  with check (public.pode_no_local(local_id, 'festa'));
-- (pode_no_local já inclui o dono e o admin, via e_dono_do_local.)

-- 2) Fotos da agenda no bucket fotos-locais (as políticas do dono, da 007, continuam valendo)
drop policy if exists "fotos_locais_agenda_insert_equipe" on storage.objects;
create policy "fotos_locais_agenda_insert_equipe" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos-locais'
    and (storage.filename(name)) like 'agenda-%'
    and public.pode_no_local(public.uuid_ou_nulo((storage.foldername(name))[1]), 'festa')
  );
drop policy if exists "fotos_locais_agenda_update_equipe" on storage.objects;
create policy "fotos_locais_agenda_update_equipe" on storage.objects for update to authenticated
  using (
    bucket_id = 'fotos-locais'
    and (storage.filename(name)) like 'agenda-%'
    and public.pode_no_local(public.uuid_ou_nulo((storage.foldername(name))[1]), 'festa')
  );
drop policy if exists "fotos_locais_agenda_delete_equipe" on storage.objects;
create policy "fotos_locais_agenda_delete_equipe" on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos-locais'
    and (storage.filename(name)) like 'agenda-%'
    and public.pode_no_local(public.uuid_ou_nulo((storage.foldername(name))[1]), 'festa')
  );

-- Conferência: devem aparecer 2 políticas em agenda_semanal e 3 "fotos_locais_agenda_*".
select tablename, policyname from pg_policies
 where policyname like 'agenda_semanal_%' or policyname like 'fotos_locais_agenda_%'
 order by 1, 2;
