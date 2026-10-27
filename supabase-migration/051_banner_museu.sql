-- Banner do Museu da Diversidade Sexual (apoio cultural). Entra ATIVO para testar no app;
-- antes do lançamento público, confira logo/textos com o museu e, se faltar algo, pause
-- em /admin > Banners e parceiros. Destino = página interna do app.
-- Precisa da 050_banners_app.sql já rodada.
insert into public.banners_app (chave, tag, titulo, cta, icone, cor, destino, telas, parceria, peso, ativo, traducoes)
values
 ('museu', 'APOIO CULTURAL', 'Visite o Museu da Diversidade Sexual: onde a cultura é viva, a diversidade é protagonista', 'Visite o Museu', 'book-open', '#6D28D9', '/apoiador/museu-diversidade', '{home,trip}', 'patrocinio', 3, true,
  '{"en":{"tag":"CULTURAL SUPPORTER","titulo":"Visit the Museum of Sexual Diversity: where culture is alive, diversity takes center stage","cta":"Visit the Museum"},"es":{"tag":"APOYO CULTURAL","titulo":"Visita el Museo de la Diversidad Sexual: donde la cultura está viva, la diversidad es protagonista","cta":"Visita el Museo"}}'::jsonb)
on conflict (chave) do update set ativo = true, destino = excluded.destino, peso = excluded.peso,
  tag = excluded.tag, titulo = excluded.titulo, cta = excluded.cta, traducoes = excluded.traducoes;

-- Na aba Trip, o Museu substitui o card da Câmara LGBT (a Câmara continua só na Home).
update public.banners_app set telas = '{home}' where chave = 'camara';
