-- Banner do Museu da Diversidade Sexual (apoio cultural). Entra DESATIVADO:
-- no portal (Banners e parceiros) cadastre a logo, confira os textos com o
-- museu e ative. Destino = página interna do app.
insert into public.banners_app (chave, tag, titulo, cta, icone, cor, destino, telas, parceria, peso, ativo, traducoes)
values
 ('museu', 'APOIO CULTURAL', 'Museu da Diversidade Sexual: memória e cultura LGBT+ no centro de SP', 'Conhecer', 'book-open', '#6D28D9', '/apoiador/museu-diversidade', '{home,trip}', 'patrocinio', 2, false,
  '{"en":{"tag":"CULTURAL SUPPORTER","titulo":"Museum of Sexual Diversity: LGBTQ+ memory and culture in downtown SP","cta":"Explore"},"es":{"tag":"APOYO CULTURAL","titulo":"Museo de la Diversidad Sexual: memoria y cultura LGBT+ en el centro de SP","cta":"Conocer"}}'::jsonb)
on conflict (chave) do nothing;
