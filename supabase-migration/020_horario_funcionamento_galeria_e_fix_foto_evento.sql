-- ============================================================================
-- 020 — Horário de funcionamento (+ música ao vivo) em locais, galeria de
-- fotos + link de vídeo pra locais premium, e correção de RLS: dono do
-- LOCAL também pode subir foto das festas do próprio espaço
-- ============================================================================
-- Pedido da Andrea (16/09/2026): (1) horário de funcionamento no cadastro
-- rápido, com todos os dias da semana (aberto/fechado + horário inicial e
-- final) e um campo opcional de início da música ao vivo; (2) "pensar que
-- dentro do portal tanto as festas quanto os locais podem atualizar fotos"
-- — investigação achou uma lacuna real: a policy de Storage que libera
-- upload de foto de evento (`fotos_eventos_insert_dono`/`update_dono`,
-- migration 009) só reconhecia `criado_por = auth.uid()`, nunca o dono do
-- LOCAL da festa (que já pode editar o evento inteiro via
-- `pode_gerenciar_evento()`, desde a 008) — ou seja, o dono de um bar
-- conseguia editar o texto da própria festa mas não a foto dela; (3)
-- "locais premium... carrossel de fotos e até vídeos" — implementado como
-- várias fotos (`galeria_fotos`) + um link de vídeo (Instagram/YouTube,
-- sem upload de arquivo — decisão da Andrea, evita custo de armazenamento
-- de vídeo no Storage).
--
-- Tudo aditivo: nenhuma coluna/policy existente é removida.
-- ============================================================================

-- 1) Horário de funcionamento. Formato: um objeto por dia da semana
-- (chaves fixas em português, sem acento, pra bater com o que o código do
-- portal grava/lê), cada um {aberto, abre, fecha, musica_ao_vivo} — os 3
-- últimos só fazem sentido quando aberto=true, mas ficam nulos/vazios
-- sem problema quando aberto=false. Exemplo de uma linha:
-- {"sexta": {"aberto": true, "abre": "18:00", "fecha": "02:00", "musica_ao_vivo": "22:00"}, "domingo": {"aberto": false}}
alter table public.locais
  add column if not exists horario_funcionamento jsonb not null default '{}'::jsonb;

comment on column public.locais.horario_funcionamento is
  'Horário de funcionamento por dia da semana: {"<dia>": {"aberto": bool, "abre": "HH:MM", "fecha": "HH:MM", "musica_ao_vivo": "HH:MM"|null}}. Dias ausentes = não informado (não confundir com fechado). Editável pelo dono, mesma RLS de locais_update_dono_ou_admin — sem trigger novo.';

-- 2) Galeria de fotos + link de vídeo (carrossel pra locais premium).
-- Colunas abertas, mesmo padrão de `tags`/`descricao` (Rodada 24/16) — o
-- limite de quantidade/quem tem direito (plano premium/fundador) é
-- aplicado só na tela do portal, não travado no banco (mesmo grau de
-- confiança já usado hoje pro limite de tags e de cupons por plano).
alter table public.locais
  add column if not exists galeria_fotos text[] not null default '{}'::text[];

alter table public.locais
  add column if not exists video_url text;

comment on column public.locais.galeria_fotos is
  'Fotos extras além de foto_capa_url, pra carrossel no perfil do local (pensado pra planos premium/fundador — limite aplicado na tela do portal, não aqui).';
comment on column public.locais.video_url is
  'Link de vídeo (Instagram/Reels/YouTube) pra embutir no perfil do local — não é upload de arquivo, é só a URL.';

-- 3) Fix de RLS: dono do LOCAL da festa também pode subir/trocar a foto
-- do evento, não só quem cadastrou (criado_por). Mesmo helper que já
-- governa a edição do próprio evento desde a 008 — nenhuma porta nova,
-- só deixa de faltar uma peça que já devia estar coberta.
drop policy if exists "fotos_eventos_insert_dono" on storage.objects;
create policy "fotos_eventos_insert_dono"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-eventos'
    and public.pode_gerenciar_evento(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "fotos_eventos_update_dono" on storage.objects;
create policy "fotos_eventos_update_dono"
  on storage.objects for update
  using (
    bucket_id = 'fotos-eventos'
    and public.pode_gerenciar_evento(((storage.foldername(name))[1])::uuid)
  );

-- 4) RPC de conveniência: lista só os eventos que o usuário logado pode
-- gerenciar (criou, OU é dono do local da festa) — usada pela tela nova
-- /dashboard/eventos. Filtra explicitamente no WHERE (não só via RLS),
-- então nunca devolve evento de outra pessoa mesmo sendo security definer.
create or replace function public.meus_eventos_gerenciaveis()
returns setof public.eventos
language sql
stable
security definer
set search_path = public
as $$
  select e.*
  from public.eventos e
  where e.criado_por = auth.uid()
     or e.local_id in (select id from public.locais where owner_id = auth.uid());
$$;

grant execute on function public.meus_eventos_gerenciaveis() to authenticated;
