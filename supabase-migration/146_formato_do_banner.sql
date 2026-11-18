-- 146 · Formato do banner do app (Modo equipe › Banner):
--   'info' = cartão informativo (cor/degradê + ícone ou logo)   ·   'foto' = foto no cartão inteiro com os dizeres por cima.
-- Seguro rodar mais de uma vez.
alter table public.banners_app add column if not exists estilo text not null default 'info';
alter table public.banners_app add column if not exists foto_url text;
alter table public.banners_app drop constraint if exists banners_app_estilo_valido;
alter table public.banners_app add constraint banners_app_estilo_valido check (estilo in ('info', 'foto'));
notify pgrst, 'reload schema';
