-- Rodada 61 — Andrea pediu uma categoria de verdade nova: "Produtos".
-- Diferente de "Serviços"/"Turismo" (que já existiam no enum e só
-- estavam escondidas na UI), "Produtos" nunca existiu em
-- public.categoria_tipo. Mesmo padrão idempotente da migration 026
-- (que fez isso pra Beleza/Lojas/Lazer): ALTER TYPE ADD VALUE IF NOT
-- EXISTS, seguro repetir.
alter type public.categoria_tipo add value if not exists 'produtos';

commit;
