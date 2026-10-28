-- 064 — (1) garante as permissões de leitura das tabelas da vitrine para o app e (2) liga o banner de EXEMPLO
-- "Bares by Ambev" na categoria Bares por 14 dias, MESMO que Bares já tivesse um banner (substitui o texto dele).
-- Use só para teste; desligue antes de mostrar a investidores/lojas (/admin > Vitrine das categorias > Bares > Ativo).
grant select on public.categoria_patrocinio, public.fundador_comunicacao, public.planos_limite_ofertas to anon, authenticated;
grant select on public.destaque_chamada to anon, authenticated;
grant insert on public.vitrine_eventos to anon, authenticated;
grant select, insert, update, delete on public.categoria_patrocinio, public.fundador_comunicacao, public.destaque_chamada, public.planos_limite_ofertas to authenticated;

insert into public.categoria_patrocinio (categoria, tag, titulo, subtitulo, cta, destino, cor1, cor2, ativo, inicio, fim)
values (
  'bares', 'PATROCÍNIO · EXEMPLO', 'Bares by Ambev',
  'A Ambev é a maior cervejaria do Brasil, com marcas como Skol, Brahma e Antarctica, presente em milhares de bares do país. Aqui, ela apoia a vida noturna que acolhe todo mundo.',
  'Saiba mais', 'https://www.ambev.com.br', '#F59E0B', '#B45309', true, now(), now() + interval '14 days'
)
on conflict (categoria) do update set
  tag = excluded.tag, titulo = excluded.titulo, subtitulo = excluded.subtitulo, cta = excluded.cta, destino = excluded.destino,
  cor1 = excluded.cor1, cor2 = excluded.cor2, ativo = true, inicio = excluded.inicio, fim = excluded.fim;

-- Conferência (aparece como resultado): deve listar 1 linha, ativo = true.
select categoria, titulo, ativo, inicio, fim from public.categoria_patrocinio where categoria = 'bares';
