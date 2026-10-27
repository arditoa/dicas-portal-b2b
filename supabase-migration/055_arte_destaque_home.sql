-- Arte de destaque da Home (carrossel de banners grandes logo abaixo da busca).
-- Só a equipe sobe (em /admin > Catálogo > local > "Arte de destaque"); o app usa a arte dos
-- Membros Fundadores e patrocinados. Sem arte, o app mostra um cartão com a foto do local.
-- Tamanho recomendado: 1080 x 540 px (2:1).
alter table public.locais add column if not exists arte_destaque_url text;
