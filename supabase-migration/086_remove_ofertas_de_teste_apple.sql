-- 086 — Antes de enviar o app para a Apple: remove as 4 ofertas de exemplo criadas pela migração 061
-- no local "vezpa" (conteúdo de teste visível pode gerar reprovação na revisão).
-- Seguro rodar mais de uma vez. Passo 1 mostra o que existe; passo 2 apaga; passo 3 confere.

-- PASSO 1 — conferir (deve listar até 4 ofertas)
select c.id, l.nome as local, c.titulo, c.ativo
from public.cupons c
join public.locais l on l.id = c.local_id
where c.criado_pela_equipe = true
  and c.titulo in ('2 caipirinhas por R$ 49', 'Batata grátis para o date', 'Entrada free', 'Tome 3 pague 2');

-- PASSO 2 — apagar (os resgates ligados a elas também saem, por cascata)
delete from public.cupons c
using public.locais l
where l.id = c.local_id
  and c.criado_pela_equipe = true
  and c.titulo in ('2 caipirinhas por R$ 49', 'Batata grátis para o date', 'Entrada free', 'Tome 3 pague 2');

-- PASSO 3 — conferir de novo (deve voltar vazio)
select count(*) as ofertas_de_teste_restantes
from public.cupons
where criado_pela_equipe = true
  and titulo in ('2 caipirinhas por R$ 49', 'Batata grátis para o date', 'Entrada free', 'Tome 3 pague 2');
