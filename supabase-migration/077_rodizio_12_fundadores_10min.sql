-- 077: Rodizio de lancamento: 12 vagas de Fundador no topo e giro a cada 10 minutos;
-- Em Alta completa com todas as categorias (mesmo sem plano pago).
-- Os valores continuam editaveis em /admin > Rodizio e Destaques.
insert into public.app_config (chave, valor, atualizado_em) values
  ('rodizio_intervalo_min', '10', now()),
  ('fundadores_max_topo',   '12', now()),
  ('em_alta_completar',     '1',  now())
on conflict (chave) do update
  set valor = excluded.valor, atualizado_em = now();
