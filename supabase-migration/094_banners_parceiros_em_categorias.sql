-- 094 — Rodada 139: banners de parceiros e campanhas (aba "Banners e parceiros") também nas categorias.
-- banners_app.telas já aceita qualquer texto; agora usa também 'cat:bares', 'cat:festas', 'cat:turismo'…
-- A medição (banners_eventos.tela) só aceitava 'home' e 'trip'. Rode uma vez no SQL Editor.
alter table public.banners_eventos drop constraint if exists banners_eventos_tela_check;
alter table public.banners_eventos add constraint banners_eventos_tela_check
  check (tela in ('home', 'trip') or tela like 'cat:%');

-- Conferência
select pg_get_constraintdef(oid) from pg_constraint where conname = 'banners_eventos_tela_check';
