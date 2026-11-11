-- 096 — Rodada 141: banner diferente em cada lugar (pedido da Andrea: o Fundador muda os dizeres na Home e na
-- categoria; e quem está em 2 ou mais categorias pode ter foto/cores diferentes em cada uma).
-- As colunas de destaque_chamada continuam sendo o banner PADRÃO (vale em todo lugar). A coluna nova `variantes`
-- guarda as versões por lugar: {"home": {...}, "cat:bares": {...}, "cat:festas": {...}, "cat:destaques": {...}},
-- cada uma com chamada, cta, imagem_url, estilo, cor1, cor2, cor_texto, destaque_texto, cor_destaque.
-- Lugar sem variante = usa o padrão. Rode uma vez no SQL Editor.
alter table public.destaque_chamada add column if not exists variantes jsonb;

select column_name, data_type from information_schema.columns where table_name = 'destaque_chamada' and column_name = 'variantes';
