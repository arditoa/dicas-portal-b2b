-- 156 · Dicas Trip reorganizada (18/11/2026, com a Andrea):
--   • Aba Trip: só os ícones Roteiros e Agências por enquanto (Passeios, Pacotes e Hospedagem ficam escondidos
--     até terem casas — dá para mostrar de novo no Modo equipe › Vitrine › Dicas Trip › Gerenciar).
--   • Roteiros = grade de destinos. Eventos especiais (Carnaval, Parada SP, Copa 2027, Réveillon…) entram na mesma
--     grade, como um destino marcado como "evento", com um selo de data (ex.: "FEV 2027").
--     Liga e desliga na mão (decisão da Andrea): "Aparece na Trip" (ativo) e "Aberto".
-- Seguro rodar mais de uma vez.

alter table public.destinos add column if not exists evento boolean not null default false;
alter table public.destinos add column if not exists selo text;

insert into public.subcategoria_config (categoria, chave, ativo, atualizado_em) values
  ('turismo', 'passeios', false, now()),
  ('turismo', 'pacotes', false, now()),
  ('turismo', 'hospedagem', false, now()),
  ('turismo', 'roteiros', false, now()) -- 18/11: só Agências; as cidades ficam em Próximas viagens / Ver todos
on conflict (categoria, chave) do update set ativo = false, atualizado_em = now();

notify pgrst, 'reload schema';
