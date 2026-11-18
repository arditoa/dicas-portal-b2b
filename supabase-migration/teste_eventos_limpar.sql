-- Limpeza antes do lançamento (16/11/2026): eventos de teste com datas longas que ficam "em destaque" todo dia.
-- 1) Os dois de TESTE saem do app (status cancelado; dá para voltar trocando para 'aprovado').
update public.eventos set status = 'cancelado'
where status = 'aprovado' and titulo in ('Evento Teste Andrea', 'Festa teste');

-- 2) "Gays e Garotas HUB" e "MEU GAROTO" parecem reais: só saem dos destaques (continuam na agenda).
--    Confira as datas de fim: estão até 04/12 e 03/12. Se for de uma noite só, corrija a data_fim.
update public.eventos set destaque_secoes = array_remove(array_remove(array_remove(coalesce(destaque_secoes, '{}'), 'patrocinado'), 'hoje'), 'evento_destaque')
where status = 'aprovado' and titulo in ('Gays e Garotas HUB', 'MEU GAROTO ');

-- Conferir:
select titulo, status, data_inicio, data_fim, destaque_secoes from public.eventos
where titulo in ('Evento Teste Andrea', 'Festa teste', 'Gays e Garotas HUB', 'MEU GAROTO ');
