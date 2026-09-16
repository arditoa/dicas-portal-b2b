-- ============================================================================
-- 018 - Corrige o MESMO tipo de erro ("new row violates row-level security
-- policy"), agora no upload da FOTO em si (Storage), nao na tabela
-- ============================================================================
-- Contexto: a 017 corrigiu o problema no INSERT da linha em locais/eventos
-- (RETURNING exigindo policy de SELECT). Depois de aplicar a 017 e
-- redeployar, o cadastro anonimo passou dessa etapa, mas o UPLOAD DA FOTO
-- (que o navegador faz direto pro Supabase Storage, via
-- `supabase.storage.from(...).upload(...)`) comecou a bater no mesmo tipo
-- de erro - so que dessa vez vindo da API de Storage, que mostra uma
-- versao mais generica da mensagem (sem o nome da tabela).
--
-- Causa raiz (mesmo mecanismo da 017, num lugar diferente): as policies
-- `fotos_locais_insert_pendente_anonimo`/`fotos_eventos_insert_pendente_anonimo`
-- (009_upload_anonimo_cadastro_rapido.sql) liberam o upload verificando,
-- dentro do proprio WITH CHECK, se o local/evento daquela pasta esta
-- "pendente e sem dono" - so que esse `exists (select 1 from public.locais
-- ...)` roda com o mesmo papel (anon) que esta tentando subir o arquivo, e
-- por isso passa pela policy de SELECT de `locais`/`eventos`
-- (`locais_select_aprovados_ou_dono`), que nunca deixa um anonimo VER uma
-- linha pendente/sem dono. Resultado: a condicao do WITH CHECK nunca bate
-- pra ninguem anonimo, mesmo quando o local E de fato pendente e sem dono
-- (testado e confirmado localmente antes de corrigir).
--
-- Solucao: mover essa verificacao pra dentro de uma funcao SECURITY
-- DEFINER (mesmo princicpio da 017) - ela faz a mesma pergunta ("esse
-- local/evento esta pendente e sem dono?"), mas por dentro do banco, sem
-- depender da policy de SELECT do papel que esta chamando. As policies
-- passam a chamar essa funcao em vez de repetir o EXISTS direto.
--
-- Testado localmente: o EXISTS direto (como as policies faziam antes)
-- confirmado retornando falso pra um local recem-criado, pendente e sem
-- dono, quando avaliado como o papel anonimo (reproduz o bug); a funcao
-- nova, chamada pelo mesmo papel, retorna verdadeiro pra esse mesmo caso.
-- Testado tambem o upload de verdade num mock de storage.objects: anonimo
-- consegue subir foto pro proprio cadastro pendente/sem dono; a mesma
-- tentativa pra um local JA aprovado/com dono e corretamente recusada.
-- ============================================================================

create or replace function public.local_pendente_sem_dono(p_local_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.locais l
    where l.id::text = p_local_id
      and l.owner_id is null
      and l.status = 'pendente'
  );
$$;

grant execute on function public.local_pendente_sem_dono(text) to anon, authenticated;

create or replace function public.evento_pendente_sem_dono(p_evento_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.eventos e
    where e.id::text = p_evento_id
      and e.criado_por is null
      and e.status = 'pendente'
  );
$$;

grant execute on function public.evento_pendente_sem_dono(text) to anon, authenticated;

drop policy if exists "fotos_locais_insert_pendente_anonimo" on storage.objects;
create policy "fotos_locais_insert_pendente_anonimo"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-locais'
    and public.local_pendente_sem_dono((storage.foldername(name))[1])
  );

drop policy if exists "fotos_eventos_insert_pendente_anonimo" on storage.objects;
create policy "fotos_eventos_insert_pendente_anonimo"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-eventos'
    and public.evento_pendente_sem_dono((storage.foldername(name))[1])
  );
