-- 158 · Roteiro patrocinado (18/11/2026): uma casa pode patrocinar um roteiro da Dicas Trip
--   ("Oferecido por Vezpa"). A equipe liga no Modo equipe › Vitrine › Dicas Trip › cidade › Roteiros.
--   As paradas já podem apontar para uma casa do app (roteiro_paradas.local_id, migração 039).
-- Seguro rodar mais de uma vez.
alter table public.roteiros add column if not exists patrocinador_id uuid references public.locais(id) on delete set null;
notify pgrst, 'reload schema';
