-- Pipeline comercial da equipe (página escondida em www.dicaslgbt.com.br/equipe).
--
-- Guarda fases do funil, cadências de mensagens e leads (empresas
-- prospectadas) numa única tabela de documentos (pipeline_docs), e uma lista
-- de quem da equipe pode usar (pipeline_equipe).
--
-- QUEM ACESSA: só usuários do Supabase Auth que estejam em pipeline_equipe.
-- Ninguém sem login (anon) lê ou grava nada. Para dar ou tirar acesso de
-- alguém, mexa só na tabela pipeline_equipe (instruções no fim do arquivo).
--
-- Seguro rodar mais de uma vez (tudo com "if not exists" / "or replace").

begin;

-- ─────────────────────────────────────────────────────────────────────
-- 1) Quem é da equipe
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.pipeline_equipe (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  papel text not null default 'comercial' check (papel in ('admin', 'comercial')),
  criado_em timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 2) Documentos do pipeline (fases, cadencias, leads)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.pipeline_docs (
  colecao text not null check (colecao in ('fases', 'cadencias', 'leads')),
  id text not null check (char_length(id) between 1 and 64),
  data jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (colecao, id)
);

create index if not exists pipeline_docs_colecao_idx on public.pipeline_docs (colecao);

create or replace function public.pipeline_docs_touch()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists pipeline_docs_touch_trg on public.pipeline_docs;
create trigger pipeline_docs_touch_trg
  before update on public.pipeline_docs
  for each row execute function public.pipeline_docs_touch();

-- ─────────────────────────────────────────────────────────────────────
-- 3) "Sou da equipe?" — usada pelas regras de acesso (RLS)
--    SECURITY DEFINER para poder consultar pipeline_equipe sem cair em
--    recursão com a própria regra dessa tabela.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.is_pipeline_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.pipeline_equipe where user_id = auth.uid());
$$;

revoke all on function public.is_pipeline_equipe() from public;
grant execute on function public.is_pipeline_equipe() to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4) Regras de acesso (RLS)
-- ─────────────────────────────────────────────────────────────────────
alter table public.pipeline_equipe enable row level security;
alter table public.pipeline_docs enable row level security;

-- pipeline_equipe: a equipe enxerga a lista (para mostrar nomes nos
-- cartões). Ninguém altera por aqui — só pelo SQL Editor do Supabase.
drop policy if exists "pipeline_equipe_select" on public.pipeline_equipe;
create policy "pipeline_equipe_select" on public.pipeline_equipe
  for select to authenticated
  using (user_id = auth.uid() or public.is_pipeline_equipe());

-- pipeline_docs: a equipe lê e grava tudo.
drop policy if exists "pipeline_docs_select" on public.pipeline_docs;
create policy "pipeline_docs_select" on public.pipeline_docs
  for select to authenticated using (public.is_pipeline_equipe());

drop policy if exists "pipeline_docs_insert" on public.pipeline_docs;
create policy "pipeline_docs_insert" on public.pipeline_docs
  for insert to authenticated with check (public.is_pipeline_equipe());

drop policy if exists "pipeline_docs_update" on public.pipeline_docs;
create policy "pipeline_docs_update" on public.pipeline_docs
  for update to authenticated
  using (public.is_pipeline_equipe()) with check (public.is_pipeline_equipe());

drop policy if exists "pipeline_docs_delete" on public.pipeline_docs;
create policy "pipeline_docs_delete" on public.pipeline_docs
  for delete to authenticated using (public.is_pipeline_equipe());

revoke all on public.pipeline_equipe from anon, authenticated;
revoke all on public.pipeline_docs from anon, authenticated;
grant select on public.pipeline_equipe to authenticated;
grant select, insert, update, delete on public.pipeline_docs to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5) Atualização parcial de um documento (mescla campos no JSON).
--    SECURITY INVOKER: respeita a RLS de quem chama.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.pipeline_merge(p_colecao text, p_id text, p_patch jsonb)
returns void
language sql
security invoker
as $$
  update public.pipeline_docs
     set data = data || p_patch
   where colecao = p_colecao
     and id = p_id
     and jsonb_typeof(p_patch) = 'object';
$$;

revoke all on function public.pipeline_merge(text, text, jsonb) from public;
grant execute on function public.pipeline_merge(text, text, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6) Atualização ao vivo na tela de quem estiver com o Pipeline aberto
-- ─────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'pipeline_docs'
     ) then
    alter publication supabase_realtime add table public.pipeline_docs;
  end if;
end
$$;

commit;

-- ─────────────────────────────────────────────────────────────────────
-- COMO DAR ACESSO A ALGUÉM DA EQUIPE (rodar depois, uma vez por pessoa)
-- ─────────────────────────────────────────────────────────────────────
-- 1. Supabase > Authentication > Users > Add user > Create new user:
--    e-mail da pessoa, uma senha temporária só dela e marque
--    "Auto Confirm User". Envie a senha por um canal separado.
-- 2. Rode no SQL Editor (troque o e-mail e o nome):
--
--    insert into public.pipeline_equipe (user_id, nome, papel)
--    select id, 'NOME DA PESSOA', 'comercial'
--      from auth.users
--     where lower(email) = lower('EMAIL.DA.PESSOA@exemplo.com')
--    on conflict (user_id) do update set nome = excluded.nome;
--
--    (Use papel 'admin' para você mesma.)
--
-- COMO TIRAR O ACESSO:
--
--    delete from public.pipeline_equipe
--     where user_id = (select id from auth.users
--                       where lower(email) = lower('EMAIL.DA.PESSOA@exemplo.com'));
