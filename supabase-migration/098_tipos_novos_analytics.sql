-- 098 — Novos tipos de clique/visualização para o painel de resultados do parceiro (Rodada 145).
-- RODE SOZINHA, antes da 099 (o Postgres não deixa usar um valor novo de enum na mesma transação em que ele foi criado).
-- Seguro rodar mais de uma vez.

alter type public.tipo_evento_analytics add value if not exists 'visualizacao_banner';
alter type public.tipo_evento_analytics add value if not exists 'clique_banner';
alter type public.tipo_evento_analytics add value if not exists 'clique_whatsapp';
alter type public.tipo_evento_analytics add value if not exists 'clique_rota';
alter type public.tipo_evento_analytics add value if not exists 'clique_telefone';
alter type public.tipo_evento_analytics add value if not exists 'visualizacao_festa';
alter type public.tipo_evento_analytics add value if not exists 'clique_ingresso';
alter type public.tipo_evento_analytics add value if not exists 'favoritou';

-- Conferência: NÃO rode junto (o SQL Editor roda tudo numa transação só, e o Postgres não deixa usar o valor
-- novo antes de terminar). Depois de rodar esta, abra uma consulta nova e rode só a linha abaixo; deve listar 11 tipos:
-- select unnest(enum_range(null::public.tipo_evento_analytics)) as tipo;
