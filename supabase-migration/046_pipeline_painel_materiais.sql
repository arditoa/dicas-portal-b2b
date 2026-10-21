-- Rodada 82 — Pipeline da equipe (/equipe): aba "Painel" e aba "Materiais".
--
-- 1) pipeline_materiais: biblioteca de materiais oficiais (apresentações,
--    fotos, logos, vídeos, links do Canva/Drive) para a equipe enviar a leads.
-- 2) Bucket de arquivos "pipeline-materiais" (público para LEITURA pelo link,
--    porque o link é enviado por WhatsApp a quem não tem login; só a equipe
--    envia, troca ou apaga). Não suba aqui nada confidencial.
-- 3) pipeline_painel_app(): números do app para o Painel — locais por cidade
--    e categoria, usuários cadastrados (total, novos e por cidade quando o
--    app passar a salvar a cidade no perfil). Só a equipe do Pipeline chama.
--
-- Seguro rodar mais de uma vez.

begin;

-- ─────────────────────────────────────────────────────────────────────
-- 1) Materiais oficiais
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.pipeline_materiais (
  id bigint generated always as identity primary key,
  titulo text not null check (char_length(titulo) between 1 and 120),
  tipo text not null default 'apresentacao'
    check (tipo in ('apresentacao', 'foto', 'logo', 'video', 'texto', 'outro')),
  descricao text check (descricao is null or char_length(descricao) <= 500),
  -- ou um arquivo no bucket (caminho), ou um link externo (Canva, Drive…)
  caminho text check (caminho is null or char_length(caminho) <= 300),
  link text check (link is null or link ~* '^https?://'),
  mime text,
  tamanho bigint,
  fixado boolean not null default false,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint pipeline_materiais_origem check (caminho is not null or link is not null)
);
create index if not exists pipeline_materiais_tipo_idx on public.pipeline_materiais (tipo, criado_em desc);

alter table public.pipeline_materiais enable row level security;

drop policy if exists "pipeline_materiais_select" on public.pipeline_materiais;
create policy "pipeline_materiais_select" on public.pipeline_materiais
  for select to authenticated using (public.is_pipeline_equipe());

drop policy if exists "pipeline_materiais_insert" on public.pipeline_materiais;
create policy "pipeline_materiais_insert" on public.pipeline_materiais
  for insert to authenticated with check (public.is_pipeline_equipe());

drop policy if exists "pipeline_materiais_update" on public.pipeline_materiais;
create policy "pipeline_materiais_update" on public.pipeline_materiais
  for update to authenticated
  using (public.is_pipeline_equipe()) with check (public.is_pipeline_equipe());

drop policy if exists "pipeline_materiais_delete" on public.pipeline_materiais;
create policy "pipeline_materiais_delete" on public.pipeline_materiais
  for delete to authenticated using (public.is_pipeline_equipe());

revoke all on public.pipeline_materiais from anon, authenticated;
grant select, insert, update, delete on public.pipeline_materiais to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2) Bucket de arquivos (até 50 MB por arquivo)
-- ─────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pipeline-materiais', 'pipeline-materiais', true, 52428800,
  array['application/pdf',
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
        'video/mp4', 'video/quicktime',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pipeline_materiais_arq_enviar" on storage.objects;
create policy "pipeline_materiais_arq_enviar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pipeline-materiais' and public.is_pipeline_equipe());

drop policy if exists "pipeline_materiais_arq_ler" on storage.objects;
create policy "pipeline_materiais_arq_ler" on storage.objects
  for select to authenticated
  using (bucket_id = 'pipeline-materiais' and public.is_pipeline_equipe());

drop policy if exists "pipeline_materiais_arq_trocar" on storage.objects;
create policy "pipeline_materiais_arq_trocar" on storage.objects
  for update to authenticated
  using (bucket_id = 'pipeline-materiais' and public.is_pipeline_equipe())
  with check (bucket_id = 'pipeline-materiais' and public.is_pipeline_equipe());

drop policy if exists "pipeline_materiais_arq_apagar" on storage.objects;
create policy "pipeline_materiais_arq_apagar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pipeline-materiais' and public.is_pipeline_equipe());

-- ─────────────────────────────────────────────────────────────────────
-- 3) Números do app para o Painel (só contagens, nenhum dado pessoal)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.pipeline_painel_app()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  if not public.is_pipeline_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'gerado_em', now(),
    'locais_total', (select count(*) from locais where status = 'aprovado'),
    'locais_pendentes', (select count(*) from locais where status = 'pendente'),
    'locais_novos_30d', (select count(*) from locais where status = 'aprovado'
                           and created_at >= now() - interval '30 days'),
    'locais_por_cidade', coalesce((
      select jsonb_agg(jsonb_build_object('cidade', cidade, 'n', n) order by n desc, cidade)
      from (select coalesce(nullif(trim(cidade), ''), 'Não informada') as cidade, count(*) as n
              from locais where status = 'aprovado' group by 1) x), '[]'::jsonb),
    'locais_por_categoria', coalesce((
      select jsonb_agg(jsonb_build_object('categoria', categoria, 'n', n) order by n desc)
      from (select categoria::text as categoria, count(*) as n
              from locais where status = 'aprovado' group by 1) x), '[]'::jsonb),
    'usuarios_total', (select count(*) from profiles),
    'usuarios_novos_7d', (select count(*) from profiles where created_at >= now() - interval '7 days'),
    'usuarios_novos_30d', (select count(*) from profiles where created_at >= now() - interval '30 days'),
    -- profiles ainda não tem coluna "cidade": quando tiver, a lista aparece sozinha
    'usuarios_por_cidade', coalesce((
      select jsonb_agg(jsonb_build_object('cidade', cidade, 'n', n) order by n desc, cidade)
      from (select to_jsonb(p) ->> 'cidade' as cidade, count(*) as n
              from profiles p
             where nullif(trim(to_jsonb(p) ->> 'cidade'), '') is not null
             group by 1) x), '[]'::jsonb)
  ) into r;

  return r;
end;
$$;

revoke all on function public.pipeline_painel_app() from public, anon;
grant execute on function public.pipeline_painel_app() to authenticated;

commit;
