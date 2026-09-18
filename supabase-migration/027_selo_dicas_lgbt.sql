-- 027: Selo Dicas LGBT+ — curadoria editorial da Andrea, nunca vendida.
--
-- Contexto (mensagem dela, na íntegra): "O selo dicas não se vende,
-- apenas se conquista (em breve envio o modelo de marketing)." Mecanismo
-- idêntico a 'hoje'/'patrocinado' (destaque_secoes, locais) — reaproveita
-- a mesma coluna/índice/trigger de proteção que já existem desde a 024,
-- só soma um valor novo à lista de valores aceitos. A diferença é 100%
-- de negócio, não de banco: este valor NUNCA deve ficar condicionado a
-- plano_comercial/pagamento em nenhuma lógica futura — só a Andrea marca,
-- manualmente, no /admin, como reconhecimento editorial.
--
-- Só pra locais nesta rodada (ela pediu "no topo colocar locais com selo
-- dicas" — não mencionou eventos). Se um dia quiser estender pra eventos,
-- é o mesmo padrão de sempre: somar 'selo_dicas' também à constraint de
-- eventos_destaque_secoes_validas.
--
-- Nota sobre o bug de "constraint-narrowing-on-replay" descoberto na
-- Rodada 46 (replay completo rejeitando dado real que já usa um valor
-- introduzido por uma migration mais nova): NÃO se aplica aqui. Aquele
-- bug só ataca quando uma migration ANTERIOR na história já tinha dado
-- real usando um valor que só uma migration POSTERIOR viria a liberar —
-- e como 'selo_dicas' é um valor completamente novo (a constraint
-- nunca aceitou ele antes desta migration), não existe nenhuma linha
-- histórica que já o use antes deste ALTER rodar. Mesmo assim, valendo a
-- regra geral já documentada: se ALGUM dia uma migration futura destas
-- (028, 029...) precisar rodar ANTES da 027 numa reordenação qualquer,
-- ou se este valor precisar ser usado por dados que já existem antes da
-- 027 aplicar, essa mesma lista precisaria ser adiantada nas migrations
-- anteriores que redefinem esta constraint (024, 025, 026) — mesma regra
-- de sempre.
--
-- Cap de vagas (~6-8 locais) é só recomendação de UX no /admin e na Home
-- — de propósito NÃO é um CHECK constraint que bloqueia: a Andrea foi
-- explícita que quer autonomia pra ajustar "caso necessário devido a
-- demanda", mesmo tendo regra de negócio. O aviso amarelo no /admin
-- (quando passar de 8) é só isso mesmo — um aviso, nunca um bloqueio.

begin;

alter table public.locais
  drop constraint if exists locais_destaque_secoes_validas;
alter table public.locais
  add constraint locais_destaque_secoes_validas
  check (
    destaque_secoes <@ array[
      'em_alta', 'dicas_trip', 'bares', 'gastronomia', 'cultura', 'turismo', 'destaque', 'hoje', 'patrocinado', 'selo_dicas'
    ]::text[]
  );

commit;
