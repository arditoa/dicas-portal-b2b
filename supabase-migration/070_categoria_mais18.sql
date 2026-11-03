-- Categoria "Espaços 18+" aberta na Home (saunas, motéis, sex shops, casas adultas...).
-- 'beleza' já existe no enum desde a 026. Mesmo padrão da 033/053/069: ADD VALUE IF NOT EXISTS, seguro repetir.
-- IMPORTANTE: rode este arquivo SOZINHO no SQL Editor (um valor novo de enum não pode ser
-- usado na mesma transação em que foi criado).
alter type public.categoria_tipo add value if not exists 'mais18';
