-- ============================================================================
-- 045 — Registro de ocorrências (denúncia séria e rastreável)
-- ============================================================================
-- O que é: um canal de registro para pessoas que sofreram ou presenciaram
-- LGBTfobia, discriminação, ameaça, assédio ou golpe ligado a locais/eventos.
-- Gera um PROTOCOLO, guarda um relato estruturado (para a pessoa levar à
-- polícia ao registrar o Boletim de Ocorrência), aceita fotos e vídeos curtos
-- em pasta PRIVADA e mantém um histórico imutável de tudo que a equipe faz.
--
-- Importante (e dito dentro do app): o Dicas LGBT+ NÃO é órgão policial e esta
-- ferramenta NÃO substitui o B.O. oficial. Ela organiza as informações e
-- permite acompanhar o atendimento da equipe.
--
-- Não mexe na tabela antiga "denuncias" (denunciar local/conteúdo, bloqueios).
--
-- Privacidade: só quem registrou (e a equipe admin) lê. Ninguém apaga linhas
-- (rastreabilidade). Se a pessoa excluir a conta, reporter_id vira NULL e os
-- dados ficam sob guarda da equipe pelo prazo de retenção definido na política
-- de privacidade.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================================

create sequence if not exists public.ocorrencias_seq start 1;

create table if not exists public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  protocolo text unique not null default '',
  reporter_id uuid references auth.users(id) on delete set null,

  -- O quê
  categoria text not null check (categoria in (
    'agressao_fisica', 'ameaca', 'injuria_discriminacao', 'discriminacao_local',
    'assedio', 'golpe_extorsao', 'perseguicao_online', 'outro'
  )),
  risco_imediato boolean not null default false,

  -- Quando
  data_fato date not null check (data_fato <= (current_date + 1)),
  hora_fato text check (hora_fato is null or char_length(hora_fato) <= 20),

  -- Onde
  local_tipo text not null check (local_tipo in ('estabelecimento', 'via_publica', 'online', 'outro')),
  local_nome text check (local_nome is null or char_length(local_nome) <= 160),
  endereco text check (endereco is null or char_length(endereco) <= 240),
  cidade text check (cidade is null or char_length(cidade) <= 100),
  uf text check (uf is null or char_length(uf) = 2),

  -- Relato
  descricao text not null check (char_length(descricao) between 40 and 5000),
  envolvidos text check (envolvidos is null or char_length(envolvidos) <= 2000),
  testemunhas text check (testemunhas is null or char_length(testemunhas) <= 1000),

  -- Boletim de ocorrência
  bo_situacao text not null default 'nao' check (bo_situacao in ('sim', 'nao', 'pretende')),
  bo_numero text check (bo_numero is null or char_length(bo_numero) <= 60),

  -- Contato (opcional; o app sempre consegue responder dentro do histórico)
  contato_nome text check (contato_nome is null or char_length(contato_nome) <= 120),
  contato_email text check (contato_email is null or char_length(contato_email) <= 160),
  contato_whatsapp text check (contato_whatsapp is null or char_length(contato_whatsapp) <= 30),
  contato_preferido text not null default 'app' check (contato_preferido in ('app', 'whatsapp', 'email')),
  quer_orientacao boolean not null default false,

  -- Consentimento (dados sensíveis, LGPD art. 11)
  consentimento_em timestamptz not null default now(),
  consentimento_versao text not null default '2026-10',

  -- Atendimento da equipe
  status text not null default 'recebida' check (status in (
    'recebida', 'em_analise', 'aguardando_informacoes', 'encaminhada', 'concluida', 'arquivada'
  )),
  encaminhamento text check (encaminhamento is null or char_length(encaminhamento) <= 1000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ocorrencias_reporter_idx on public.ocorrencias (reporter_id, created_at desc);
create index if not exists ocorrencias_status_idx on public.ocorrencias (status, created_at desc);

create table if not exists public.ocorrencia_anexos (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.ocorrencias(id) on delete cascade,
  caminho text not null unique,
  tipo text not null check (tipo in ('imagem', 'video')),
  mime text,
  tamanho_bytes bigint check (tamanho_bytes is null or tamanho_bytes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ocorrencia_anexos_oc_idx on public.ocorrencia_anexos (ocorrencia_id);

create table if not exists public.ocorrencia_historico (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.ocorrencias(id) on delete cascade,
  autor_id uuid references auth.users(id) on delete set null,
  autor_papel text not null check (autor_papel in ('usuario', 'equipe', 'sistema')),
  acao text not null check (acao in ('criada', 'status', 'mensagem_equipe', 'mensagem_usuario', 'nota_interna', 'anexo')),
  status_novo text,
  texto text check (texto is null or char_length(texto) <= 3000),
  -- nota_interna nunca é visível para a pessoa; o resto é.
  visivel_usuario boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ocorrencia_historico_oc_idx on public.ocorrencia_historico (ocorrencia_id, created_at);

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------

-- Protocolo (DL-2026-000123), limite de envios por dia e carimbo de data.
create or replace function public.ocorrencias_antes_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd int;
begin
  if new.reporter_id is null then
    raise exception 'Faça login para registrar uma ocorrência.';
  end if;

  select count(*) into v_qtd
  from public.ocorrencias
  where reporter_id = new.reporter_id
    and created_at > now() - interval '24 hours';
  if v_qtd >= 5 then
    raise exception 'Limite de 5 registros por dia atingido. Se for urgente, ligue 190 ou Disque 100.';
  end if;

  new.protocolo := 'DL-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY')
                   || '-' || lpad(nextval('public.ocorrencias_seq')::text, 6, '0');
  new.status := 'recebida';
  new.encaminhamento := null;
  new.created_at := now();
  new.updated_at := now();
  new.consentimento_em := now();
  return new;
end;
$$;

drop trigger if exists trg_ocorrencias_antes_insert on public.ocorrencias;
create trigger trg_ocorrencias_antes_insert
  before insert on public.ocorrencias
  for each row execute function public.ocorrencias_antes_insert();

-- Registra "criada" no histórico.
create or replace function public.ocorrencias_depois_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ocorrencia_historico (ocorrencia_id, autor_id, autor_papel, acao, status_novo, texto)
  values (new.id, new.reporter_id, 'sistema', 'criada', 'recebida', 'Ocorrência registrada. Protocolo ' || new.protocolo || '.');
  return new;
end;
$$;

drop trigger if exists trg_ocorrencias_depois_insert on public.ocorrencias;
create trigger trg_ocorrencias_depois_insert
  after insert on public.ocorrencias
  for each row execute function public.ocorrencias_depois_insert();

-- Mudança de status entra sozinha no histórico (a equipe não consegue
-- "esquecer" de registrar) e o relato original fica imutável.
create or replace function public.ocorrencias_antes_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas a equipe pode alterar uma ocorrência.';
  end if;

  -- campos do relato não mudam depois de enviados
  new.protocolo := old.protocolo;
  new.reporter_id := old.reporter_id;
  new.categoria := old.categoria;
  new.data_fato := old.data_fato;
  new.hora_fato := old.hora_fato;
  new.local_tipo := old.local_tipo;
  new.local_nome := old.local_nome;
  new.endereco := old.endereco;
  new.cidade := old.cidade;
  new.uf := old.uf;
  new.descricao := old.descricao;
  new.envolvidos := old.envolvidos;
  new.testemunhas := old.testemunhas;
  new.consentimento_em := old.consentimento_em;
  new.consentimento_versao := old.consentimento_versao;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.status is distinct from old.status then
    insert into public.ocorrencia_historico (ocorrencia_id, autor_id, autor_papel, acao, status_novo, texto)
    values (new.id, auth.uid(), 'equipe', 'status', new.status, null);
  end if;

  if new.encaminhamento is distinct from old.encaminhamento and coalesce(new.encaminhamento, '') <> '' then
    insert into public.ocorrencia_historico (ocorrencia_id, autor_id, autor_papel, acao, texto)
    values (new.id, auth.uid(), 'equipe', 'mensagem_equipe', 'Encaminhamento: ' || new.encaminhamento);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ocorrencias_antes_update on public.ocorrencias;
create trigger trg_ocorrencias_antes_update
  before update on public.ocorrencias
  for each row execute function public.ocorrencias_antes_update();

-- No máximo 8 anexos por ocorrência.
create or replace function public.ocorrencia_anexos_limite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.ocorrencia_anexos where ocorrencia_id = new.ocorrencia_id) >= 8 then
    raise exception 'Limite de 8 arquivos por ocorrência.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ocorrencia_anexos_limite on public.ocorrencia_anexos;
create trigger trg_ocorrencia_anexos_limite
  before insert on public.ocorrencia_anexos
  for each row execute function public.ocorrencia_anexos_limite();

-- Histórico: ninguém edita nem apaga (sem policies de update/delete) e
-- mensagens da pessoa não podem se passar pela equipe.
create or replace function public.ocorrencia_historico_antes_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  new.autor_id := coalesce(auth.uid(), new.autor_id);
  -- pg_trigger_depth() = 1: inserção direta pelo app. Nas inserções feitas
  -- por outros gatilhos (ex.: "criada") o texto do sistema é mantido.
  if pg_trigger_depth() = 1 and not public.is_admin() and auth.uid() is not null then
    new.autor_papel := 'usuario';
    new.acao := 'mensagem_usuario';
    new.status_novo := null;
    new.visivel_usuario := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ocorrencia_historico_antes_insert on public.ocorrencia_historico;
create trigger trg_ocorrencia_historico_antes_insert
  before insert on public.ocorrencia_historico
  for each row execute function public.ocorrencia_historico_antes_insert();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.ocorrencias enable row level security;
alter table public.ocorrencia_anexos enable row level security;
alter table public.ocorrencia_historico enable row level security;

-- ocorrencias
drop policy if exists "ocorrencias_ler" on public.ocorrencias;
create policy "ocorrencias_ler" on public.ocorrencias
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "ocorrencias_criar" on public.ocorrencias;
create policy "ocorrencias_criar" on public.ocorrencias
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "ocorrencias_equipe_atualiza" on public.ocorrencias;
create policy "ocorrencias_equipe_atualiza" on public.ocorrencias
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- anexos
drop policy if exists "ocorrencia_anexos_ler" on public.ocorrencia_anexos;
create policy "ocorrencia_anexos_ler" on public.ocorrencia_anexos
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.ocorrencias o where o.id = ocorrencia_id and o.reporter_id = auth.uid())
  );

drop policy if exists "ocorrencia_anexos_criar" on public.ocorrencia_anexos;
create policy "ocorrencia_anexos_criar" on public.ocorrencia_anexos
  for insert to authenticated
  with check (
    exists (select 1 from public.ocorrencias o where o.id = ocorrencia_id and o.reporter_id = auth.uid())
    and split_part(caminho, '/', 1) = auth.uid()::text
  );

-- histórico
drop policy if exists "ocorrencia_historico_ler" on public.ocorrencia_historico;
create policy "ocorrencia_historico_ler" on public.ocorrencia_historico
  for select to authenticated
  using (
    public.is_admin()
    or (
      visivel_usuario
      and exists (select 1 from public.ocorrencias o where o.id = ocorrencia_id and o.reporter_id = auth.uid())
    )
  );

drop policy if exists "ocorrencia_historico_criar" on public.ocorrencia_historico;
create policy "ocorrencia_historico_criar" on public.ocorrencia_historico
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (select 1 from public.ocorrencias o where o.id = ocorrencia_id and o.reporter_id = auth.uid())
  );

revoke all on public.ocorrencias, public.ocorrencia_anexos, public.ocorrencia_historico from anon;
grant select, insert on public.ocorrencias to authenticated;
grant update on public.ocorrencias to authenticated;       -- só admin passa pelo gatilho/RLS
grant select, insert on public.ocorrencia_anexos to authenticated;
grant select, insert on public.ocorrencia_historico to authenticated;
grant all on public.ocorrencias, public.ocorrencia_anexos, public.ocorrencia_historico to service_role;

-- ---------------------------------------------------------------------------
-- Pasta privada de fotos e vídeos
-- ---------------------------------------------------------------------------
-- Caminho dos arquivos: <id_da_pessoa>/<id_da_ocorrencia>/<arquivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ocorrencias', 'ocorrencias', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
        'video/mp4', 'video/quicktime']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ocorrencias_arquivos_enviar" on storage.objects;
create policy "ocorrencias_arquivos_enviar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ocorrencias'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "ocorrencias_arquivos_ler" on storage.objects;
create policy "ocorrencias_arquivos_ler" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ocorrencias'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
-- Sem policy de update/delete: arquivos enviados não podem ser trocados nem
-- apagados pelo app (cadeia de evidência).

-- ---------------------------------------------------------------------------
-- Resumo para o /admin (contagem por status)
-- ---------------------------------------------------------------------------
create or replace function public.ocorrencias_resumo()
returns table (status text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select o.status, count(*) from public.ocorrencias o
  where public.is_admin()
  group by o.status;
$$;

revoke all on function public.ocorrencias_resumo() from public;
revoke all on function public.ocorrencias_resumo() from anon;
grant execute on function public.ocorrencias_resumo() to authenticated;
