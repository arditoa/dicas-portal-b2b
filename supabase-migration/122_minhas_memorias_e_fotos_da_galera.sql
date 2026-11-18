-- 122 — Minhas memórias e Fotos da galera (15/11/2026). Rode depois da 121.
--
-- A pessoa tira uma foto no app (na página de uma casa Premium/Fundador) e ela fica em "Minhas memórias".
-- Ela escolhe, com autorizações SEPARADAS e registradas (data, hora e versão do texto):
--   1) enviar_para_casa: a casa pode VER e BAIXAR a foto (para uso interno);
--   2) casa_pode_publicar: a casa pode PUBLICAR (redes sociais da casa, com crédito ao app).
--      Exige 1) e a confirmação "todas as pessoas da foto concordam" (todos_concordam).
-- A pessoa pode retirar qualquer autorização ou apagar a foto quando quiser: some para a casa também.
-- A foto vence em 90 dias (o app esconde; a função limpar_memorias_vencidas apaga de vez).
-- Bucket privado 'memorias', pasta = id da pessoa. Nada é público.
-- Seguro rodar mais de uma vez.

-- 1) Bucket privado --------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memorias', 'memorias', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 2) As fotos -----------------------------------------------------------------------------------------------
create table if not exists public.memorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  local_id uuid references public.locais(id) on delete set null,
  acao_id uuid references public.acoes_marca(id) on delete set null,
  caminho text not null unique,                       -- <user_id>/<arquivo>.jpg no bucket 'memorias'
  legenda text check (legenda is null or char_length(legenda) <= 140),
  enviar_para_casa boolean not null default false,
  casa_pode_publicar boolean not null default false,
  todos_concordam boolean not null default false,
  texto_versao text,                                  -- versão do texto de autorização que a pessoa viu
  enviado_em timestamptz,                             -- quando autorizou enviar para a casa
  publicar_em timestamptz,                            -- quando autorizou a casa publicar
  revogado_em timestamptz,                            -- última vez que retirou alguma autorização
  oculta_pela_casa boolean not null default false,    -- a casa pode tirar da sua lista (não apaga da pessoa)
  expira_em timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  constraint memorias_publicar_exige check (not casa_pode_publicar or (enviar_para_casa and todos_concordam))
);
create index if not exists memorias_user_idx on public.memorias(user_id, created_at desc);
create index if not exists memorias_local_idx on public.memorias(local_id, created_at desc) where enviar_para_casa;
alter table public.memorias enable row level security;

-- Histórico das autorizações (nosso respaldo): cada vez que a pessoa dá ou retira uma autorização.
create table if not exists public.memorias_consentimentos (
  id bigint generated always as identity primary key,
  memoria_id uuid not null,
  user_id uuid not null,
  local_id uuid,
  acao text not null,             -- 'enviar' | 'publicar' | 'retirar_envio' | 'retirar_publicacao' | 'apagar'
  todos_concordam boolean,
  texto_versao text,
  created_at timestamptz not null default now()
);
alter table public.memorias_consentimentos enable row level security;
drop policy if exists memorias_consent_ver on public.memorias_consentimentos;
create policy memorias_consent_ver on public.memorias_consentimentos for select using (auth.uid() = user_id or public.is_admin());

-- 3) Quem vê ----------------------------------------------------------------------------------------------
drop policy if exists memorias_dono on public.memorias;
create policy memorias_dono on public.memorias for select using (auth.uid() = user_id);
drop policy if exists memorias_casa on public.memorias;
create policy memorias_casa on public.memorias for select using (
  enviar_para_casa and not oculta_pela_casa and expira_em > now() and local_id is not null
  and (public.pode_no_local(local_id, 'resultados') or public.pode_no_local(local_id, 'banner'))
  and public.local_premium_ativo(local_id));
drop policy if exists memorias_admin on public.memorias;
create policy memorias_admin on public.memorias for select using (public.is_admin());

drop policy if exists memorias_criar on public.memorias;
create policy memorias_criar on public.memorias for insert with check (
  auth.uid() = user_id and split_part(caminho, '/', 1) = auth.uid()::text
  and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false));
drop policy if exists memorias_editar on public.memorias;
create policy memorias_editar on public.memorias for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists memorias_apagar on public.memorias;
create policy memorias_apagar on public.memorias for delete using (auth.uid() = user_id);

-- 4) Regras e registro automático das autorizações -----------------------------------------------------------
create or replace function public.memorias_regras()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.oculta_pela_casa := false;
    new.expira_em := now() + interval '90 days';
  else
    -- Quem não é o dono da foto (a casa, pela função casa_ocultar_memoria) só muda "oculta_pela_casa".
    if auth.uid() is distinct from old.user_id then
      new := old;
      new.oculta_pela_casa := true;
      return new;
    end if;
    new.user_id := old.user_id; new.caminho := old.caminho; new.created_at := old.created_at;
    new.local_id := old.local_id; new.expira_em := old.expira_em; new.oculta_pela_casa := old.oculta_pela_casa;
  end if;
  -- Enviar para a casa só para casa Premium/Fundador ativa
  if new.enviar_para_casa and (new.local_id is null or not public.local_premium_ativo(new.local_id)) then
    raise exception 'Esta casa não recebe fotos pelo app.' using errcode = 'P0001';
  end if;
  if not new.enviar_para_casa then new.casa_pode_publicar := false; end if;
  if new.casa_pode_publicar and not new.todos_concordam then
    raise exception 'Para a casa publicar, confirme que todas as pessoas da foto concordam.' using errcode = 'P0001';
  end if;
  -- Datas de cada autorização
  if new.enviar_para_casa and (tg_op = 'INSERT' or not old.enviar_para_casa) then new.enviado_em := now(); end if;
  if new.casa_pode_publicar and (tg_op = 'INSERT' or not old.casa_pode_publicar) then new.publicar_em := now(); end if;
  if tg_op = 'UPDATE' and ((old.enviar_para_casa and not new.enviar_para_casa) or (old.casa_pode_publicar and not new.casa_pode_publicar)) then
    new.revogado_em := now();
  end if;
  return new;
end;
$$;
drop trigger if exists memorias_regras on public.memorias;
create trigger memorias_regras before insert or update on public.memorias for each row execute function public.memorias_regras();

create or replace function public.memorias_registro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao) values (old.id, old.user_id, old.local_id, 'apagar');
    return old;
  end if;
  if new.enviar_para_casa and (tg_op = 'INSERT' or not old.enviar_para_casa) then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao, todos_concordam, texto_versao) values (new.id, new.user_id, new.local_id, 'enviar', new.todos_concordam, new.texto_versao);
  end if;
  if new.casa_pode_publicar and (tg_op = 'INSERT' or not old.casa_pode_publicar) then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao, todos_concordam, texto_versao) values (new.id, new.user_id, new.local_id, 'publicar', new.todos_concordam, new.texto_versao);
  end if;
  if tg_op = 'UPDATE' and old.enviar_para_casa and not new.enviar_para_casa then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao) values (new.id, new.user_id, new.local_id, 'retirar_envio');
  elsif tg_op = 'UPDATE' and old.casa_pode_publicar and not new.casa_pode_publicar then
    insert into public.memorias_consentimentos (memoria_id, user_id, local_id, acao) values (new.id, new.user_id, new.local_id, 'retirar_publicacao');
  end if;
  return new;
end;
$$;
drop trigger if exists memorias_registro on public.memorias;
create trigger memorias_registro after insert or update or delete on public.memorias for each row execute function public.memorias_registro();

-- A casa pode tirar uma foto da lista dela (não apaga da pessoa)
create or replace function public.casa_ocultar_memoria(p_memoria uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_local uuid;
begin
  select local_id into v_local from public.memorias where id = p_memoria and enviar_para_casa;
  if v_local is null or not (public.is_admin() or public.pode_no_local(v_local, 'resultados') or public.pode_no_local(v_local, 'banner')) then
    raise exception 'Sem acesso a esta foto.' using errcode = '42501';
  end if;
  update public.memorias set oculta_pela_casa = true where id = p_memoria;
end;
$$;
revoke execute on function public.casa_ocultar_memoria(uuid) from public, anon;
grant execute on function public.casa_ocultar_memoria(uuid) to authenticated;

-- 5) Arquivos no bucket -------------------------------------------------------------------------------------
drop policy if exists memorias_arquivo_inserir on storage.objects;
create policy memorias_arquivo_inserir on storage.objects for insert with check (
  bucket_id = 'memorias' and (storage.foldername(name))[1] = auth.uid()::text
  and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false));
drop policy if exists memorias_arquivo_ver on storage.objects;
create policy memorias_arquivo_ver on storage.objects for select using (
  bucket_id = 'memorias' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.memorias m where m.caminho = storage.objects.name)  -- a RLS de memorias decide se a casa vê
  ));
drop policy if exists memorias_arquivo_apagar on storage.objects;
create policy memorias_arquivo_apagar on storage.objects for delete using (
  bucket_id = 'memorias' and (storage.foldername(name))[1] = auth.uid()::text);

-- 6) Limpeza das fotos vencidas (rodar no agendador do Supabase, 1x por dia) --------------------------------
create or replace function public.limpar_memorias_vencidas()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from storage.objects o using public.memorias m
   where o.bucket_id = 'memorias' and o.name = m.caminho and m.expira_em <= now();
  delete from public.memorias where expira_em <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.limpar_memorias_vencidas() from public, anon, authenticated;

-- Conferência
select to_regclass('public.memorias') as memorias, to_regclass('public.memorias_consentimentos') as registro,
       (select public from storage.buckets where id = 'memorias') as bucket_publico;
