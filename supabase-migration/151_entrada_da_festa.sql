-- 151 · Preço da entrada da festa e onde ela acontece (para produtoras que fazem festa em outro lugar).
--   null = não informado · 0 = grátis · > 0 = valor em centavos.
-- No app aparece "Entrada R$X" (ou "Grátis") no cartão; quem vende ingresso pelo app mostra "a partir de" do lote mais barato.
-- Seguro rodar mais de uma vez.
alter table public.eventos add column if not exists entrada_centavos integer;
alter table public.eventos drop constraint if exists eventos_entrada_valida;
alter table public.eventos add constraint eventos_entrada_valida check (entrada_centavos is null or entrada_centavos between 0 and 10000000);
notify pgrst, 'reload schema';

-- Onde a festa acontece, quando não é na própria casa de quem cadastra (produtora que faz festa no Katarina Bar, por ex.).
-- Vazio = na casa/endereço de quem cadastrou (locais).
alter table public.eventos add column if not exists onde_nome text;
alter table public.eventos add column if not exists onde_endereco text;
alter table public.eventos add column if not exists onde_bairro text;
notify pgrst, 'reload schema';
