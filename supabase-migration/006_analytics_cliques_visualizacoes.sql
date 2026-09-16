-- ============================================================================
-- 006 — Analytics de parceiro: visualizações de perfil e cliques no Instagram
-- ============================================================================
-- Contexto (Rodada 17): esta migration foi DESENHADA e VALIDADA desde a
-- Rodada 5 (ver investigacao-tecnica-app.md), mas nunca entrou no conjunto
-- numerado de migrations (`supabase-migration/`) nem foi confirmada como
-- aplicada em produção — por isso o dashboard do portal (`/dashboard`)
-- mostrava "Em breve" no lugar de visualizações/cliques desde a Rodada 15.
-- O conteúdo abaixo é o mesmo já testado na Rodada 5 (mesma tabela, mesma
-- RLS, mesma função agregada) — só formalizado aqui como `006` pra ficar
-- rastreável junto com o resto e finalmente ser aplicado.
--
-- Depende só de `public.locais`, `public.profiles` e `public.is_admin()`
-- (001) — não toca em nenhuma tabela existente.
--
-- Princípio de privacidade: o parceiro nunca vê QUAL usuário clicou/
-- visualizou — só o AGREGADO (quantos). A tabela crua (com user_id) só é
-- legível por admin; o parceiro só acessa via `resumo_analytics_local`,
-- que devolve contagens, nunca linhas individuais.
-- ============================================================================

do $$ begin
  create type public.tipo_evento_analytics as enum (
    'visualizacao_perfil',
    'clique_instagram',
    'clique_cupom'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.eventos_analytics (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais(id) on delete cascade,
  tipo public.tipo_evento_analytics not null,
  user_id uuid references public.profiles(id) on delete set null, -- null = visitante anônimo
  created_at timestamptz not null default now()
);

-- Sempre grava o usuário de verdade de quem está logado (nunca o que o
-- cliente mandar no payload) — mesmo padrão de `new.owner_id := auth.uid()`
-- em locais.
create or replace function public.enforce_eventos_analytics_insert()
returns trigger as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_insert_eventos_analytics on public.eventos_analytics;
create trigger before_insert_eventos_analytics before insert on public.eventos_analytics
  for each row execute function public.enforce_eventos_analytics_insert();

alter table public.eventos_analytics enable row level security;

-- Qualquer pessoa (logada ou anônima) pode registrar um evento, mas só pra
-- um local aprovado (não dá pra logar clique num local pendente/rejeitado,
-- que nem aparece pro público).
drop policy if exists "eventos_analytics insert publico" on public.eventos_analytics;
create policy "eventos_analytics insert publico"
  on public.eventos_analytics for insert
  with check (
    exists (select 1 from public.locais l where l.id = local_id and l.status = 'aprovado')
  );

-- Ninguém lê a tabela crua diretamente, exceto admin — nem o próprio dono
-- do local (a linha crua tem user_id de quem clicou). O dono acessa as
-- MÉTRICAS agregadas só pela função abaixo.
drop policy if exists "eventos_analytics select admin" on public.eventos_analytics;
create policy "eventos_analytics select admin"
  on public.eventos_analytics for select
  using (public.is_admin());

-- Sem policy de update/delete — evento de analytics é imutável (é log).

-- Devolve, por tipo de evento, o total no intervalo [p_inicio, p_fim) —
-- sem nenhuma linha individual, nunca o user_id.
create or replace function public.resumo_analytics_local(
  p_local_id uuid,
  p_inicio timestamptz default now() - interval '30 days',
  p_fim timestamptz default now()
)
returns table (tipo public.tipo_evento_analytics, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    exists (select 1 from public.locais l where l.id = p_local_id and l.owner_id = auth.uid())
    or public.is_admin()
  ) then
    raise exception 'Sem permissão para ver as métricas deste local.';
  end if;

  return query
    select ea.tipo, count(*)::bigint as total
    from public.eventos_analytics ea
    where ea.local_id = p_local_id
      and ea.created_at >= p_inicio
      and ea.created_at < p_fim
    group by ea.tipo;
end;
$$;

grant execute on function public.resumo_analytics_local(uuid, timestamptz, timestamptz) to authenticated;

create index if not exists idx_eventos_analytics_local_tipo_created
  on public.eventos_analytics (local_id, tipo, created_at);
