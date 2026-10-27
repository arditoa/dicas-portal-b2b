-- Banner do Museu da Diversidade Sexual (apoio cultural). Entra ATIVO para testar no app;
-- antes do lançamento público, confira logo/textos com o museu e, se faltar algo, pause
-- em /admin > Banners e parceiros. Destino = página interna do app.
-- Precisa da 050_banners_app.sql já rodada.
insert into public.banners_app (chave, tag, titulo, cta, icone, cor, destino, telas, parceria, peso, ativo, traducoes)
values
 ('museu', 'APOIO CULTURAL', 'Museu da Diversidade Sexual: memória e cultura LGBT+ no centro de SP', 'Conhecer', 'book-open', '#6D28D9', '/apoiador/museu-diversidade', '{home,trip}', 'patrocinio', 3, true,
  '{"en":{"tag":"CULTURAL SUPPORTER","titulo":"Museum of Sexual Diversity: LGBTQ+ memory and culture in downtown SP","cta":"Explore"},"es":{"tag":"APOYO CULTURAL","titulo":"Museo de la Diversidad Sexual: memoria y cultura LGBT+ en el centro de SP","cta":"Conocer"}}'::jsonb)
on conflict (chave) do update set ativo = true, destino = excluded.destino, peso = excluded.peso;

-- Na aba Trip, o Museu substitui o card da Câmara LGBT (a Câmara continua só na Home).
update public.banners_app set telas = '{home}' where chave = 'camara';
