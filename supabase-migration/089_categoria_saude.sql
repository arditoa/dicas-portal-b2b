-- Categoria "Saúde & Bem-estar" aberta na Home (clínicas, psicologia/terapia/psiquiatria, odontologia, nutrição...).
-- Mesmo padrão da 033/053/069/070: ADD VALUE IF NOT EXISTS, seguro repetir.
-- IMPORTANTE: rode este arquivo SOZINHO no SQL Editor (um valor novo de enum não pode ser
-- usado na mesma transação em que foi criado).
alter type public.categoria_tipo add value if not exists 'saude';
