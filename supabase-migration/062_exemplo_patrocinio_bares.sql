-- 062 — EXEMPLO de patrocínio fixo da categoria Bares ("Bares by Ambev"), criado DESLIGADO (ativo = false).
-- Serve só para você ver no /admin (Vitrine das categorias) como o banner é montado. Só ligue se houver contrato
-- real com a marca: ligado, o app mostra "Bares by Ambev" a todos os usuários. Não usa logo nem marca registrada.
-- Categorias sem patrocinador não mostram nenhum banner. Seguro rodar mais de uma vez; não mexe se Bares já tem patrocínio.
insert into public.categoria_patrocinio (categoria, tag, titulo, subtitulo, cta, destino, cor1, cor2, ativo)
values (
  'bares',
  'PATROCÍNIO · EXEMPLO',
  'Bares by Ambev',
  'A Ambev é a maior cervejaria do Brasil, com marcas como Skol, Brahma e Antarctica, presente em milhares de bares do país. Aqui, ela apoia a vida noturna que acolhe todo mundo.',
  'Saiba mais',
  'https://www.ambev.com.br',
  '#F59E0B',
  '#B45309',
  false
)
on conflict (categoria) do nothing;
