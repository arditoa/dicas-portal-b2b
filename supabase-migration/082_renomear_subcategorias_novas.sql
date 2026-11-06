-- 082 — Subcategorias novas (nov/2026, lista da Andrea): renomeia o que já está gravado em locais.subcategoria.
-- O app já reconhece os nomes antigos como sinônimos, então rodar esta migration é opcional, mas deixa o painel/admin
-- mostrando os nomes novos. Seguro rodar mais de uma vez (só troca quem ainda está com o nome antigo).
update public.locais l set subcategoria = m.novo
from (values
  -- Bares & Vida Noturna
  ('pubs & cervejarias','Pubs e Cervejarias'),
  ('coquetelaria & speakeasies','Coquetelaria'),
  ('wine bars','Wine Bar'),
  ('gastrobares & lounges','Gastrobar e Lounges'),
  ('musica ao vivo & rodas de samba','Bares com Atrações & Música ao Vivo'),
  ('bares interativos & esportes','Bares com Atrações & Música ao Vivo'),
  -- Gastronomia
  ('restaurantes tradicionais & a la carte','Comida Brasileira & À la Carte'),
  ('pizzarias & esfiharias','Pizzarias'),
  ('culinaria japonesa & asiatica','Culinária Árabe, Oriental & Internacional'),
  ('cafeterias, docerias & padarias artesanais','Cafeterias, Padarias, Docerias & Sorveterias'),
  ('churrascarias & parrillas','Churrascarias'),
  -- Cultura
  ('cinemas & cineclubes','Cinemas'),
  ('museus, galerias & exposicoes','Museus, Galerias e Exposições'),
  ('centros culturais & casas de memoria','Centros Culturais'),
  ('patrimonio historico & visitas guiadas','Centros Culturais'),
  ('livrarias, sebos & bibliotecas','Livrarias e Bibliotecas'),
  ('shows acusticos, operas & orquestras','Shows Acústicos'),
  ('saraus, batalhas de rima & slam','Saraus'),
  -- Beleza & Estética
  ('barbearias & barbaterapia','Barbearias'),
  ('unhas, manicure & pedicure','Manicure e Pedicure'),
  ('design de sobrancelhas, cilios & micropigmentacao','Sobrancelhas, Cílios & Micropigmentação'),
  ('estetica corporal & massoterapia','Estética Corporal e Massoterapia'),
  ('depilacao & laser','Depilação e Laser'),
  ('maquiagem social & noivas','Maquiagem'),
  -- Espaços 18+
  ('sex shops & lingeries sensuais','Sex Shops'),
  ('casas noturnas adultas & clubes de strip','Casas Noturnas, Boates & Cabaré Adultos'),
  ('boates & lounges adultos (prives)','Casas Noturnas, Boates & Cabaré Adultos'),
  ('saunas & clubes liberais masculinos/gays','Saunas, Swing & Festas Liberais'),
  ('clubes de swing & festas liberais','Saunas, Swing & Festas Liberais'),
  ('tattoo & body piercing sensual / bdsm','Tattoo, Piercing & BDSM')
) as m(antigo, novo)
where lower(translate(l.subcategoria,'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ','aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) = m.antigo;

-- Liga/desliga do admin (subcategoria_config) usava a chave antiga: as novas começam ligadas (sem linha = ligada).
