-- Nova categoria "Artistas" (bandas, artistas solo, drags, DJs, humor e dança).
-- Mesmo padrão da 033 (Produtos) e da 053 (Educação): ALTER TYPE ... ADD VALUE IF NOT EXISTS, seguro repetir.
-- IMPORTANTE: rode este arquivo SOZINHO no SQL Editor (um valor novo de enum não pode ser
-- usado na mesma transação em que foi criado).
alter type public.categoria_tipo add value if not exists 'artistas';
