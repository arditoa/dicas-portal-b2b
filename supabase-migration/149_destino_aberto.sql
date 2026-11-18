-- 149 · Destinos da Dicas Trip: "Aberto" ou "Em breve" pelo Modo equipe (antes era fixo no código).
-- Seguro rodar mais de uma vez.
alter table public.destinos add column if not exists aberto boolean not null default false;
update public.destinos set aberto = true where slug = 'sao-paulo';
notify pgrst, 'reload schema';
