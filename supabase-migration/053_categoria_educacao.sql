-- Nova categoria "Educação" (cursos, idiomas, escolas e mentorias inclusivas).
-- Mesmo padrão da 033 (Produtos): ALTER TYPE ... ADD VALUE IF NOT EXISTS, seguro repetir.
-- IMPORTANTE: rode este arquivo SOZINHO no SQL Editor (um valor novo de enum não pode ser
-- usado na mesma transação em que foi criado).
alter type public.categoria_tipo add value if not exists 'educacao';
