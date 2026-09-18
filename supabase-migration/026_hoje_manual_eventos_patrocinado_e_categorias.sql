-- 026: eventos podem ser fixados em "O que Fazer Hoje" (mesmo mecanismo
-- que locais já tinham desde a 025), selo "Patrocinado" novo pra locais
-- e eventos (mecanismo de monetização simples, cobrança manual como o
-- resto), e ativação de 3 categorias que já existiam como placeholder
-- "Em breve" no admin (Beleza, Lojas, Lazer).
--
-- Contexto (Rodada 46): a Andrea pediu pra facilitar o /admin de eventos
-- e reportou que "eventos não sobem". Investigando, o motivo real é que
-- a 025 deu a LOCAIS a opção de fixação manual em "O que Fazer Hoje"
-- (destaque_secoes 'hoje') mas ASSUMIU que eventos já apareciam ali
-- automaticamente pela data (só no dia exato, ver comentário da própria
-- 025) — não existe fixação manual pra evento nessa seção, então uma
-- festa recorrente ou marcada com antecedência nunca aparecia lá fora
-- do dia exato. Corrigido dando a eventos a mesma opção manual que
-- locais já têm (app: src/app/(tabs)/index.tsx passa a buscar também
-- eventos com destaque_secoes 'hoje', igual já faz com locais).
--
-- Também pedido dela: pensar em categorias novas pra atrair mais
-- usuários e rentabilizar com quem paga pra aparecer. "Beleza", "Lojas"
-- e "Lazer" já existiam como chips do admin com categoriaReal: null (ou
-- seja, só filtro organizacional, sem categoria real no banco) — em vez
-- de inventar do zero, ativa essas 3 de verdade (mesmo padrão já usado
-- pra "servicos": existe no banco, Andrea decide quando mostrar pro
-- usuário final — a UI do app ainda precisa de uma rodada própria pra
-- dar ícone/lugar na grade de categorias a essas 3, isso aqui só libera
-- o valor no banco e no filtro do admin). "Espaço 18+" fica só como
-- ideia por ora — precisa de decisão de produto/legal (verificação de
-- idade) antes de virar categoria de banco, não é só um ALTER TYPE.
--
-- O selo "Patrocinado" é a peça de monetização mais direta que a Andrea
-- pediu ("categorias/festas pagando o aplicativo"): igual ao selo
-- "Destaque" que já existe (cobrança manual por Pix/WhatsApp, sem
-- gateway), mas não amarrado a nenhuma categoria — qualquer local OU
-- evento pode comprar esse selo pra aparecer com uma faixa
-- "Patrocinado" diferenciada, independente do plano comercial dele.

begin;

-- 1) eventos ganham a mesma opção 'hoje' que locais já têm (fixação
--    manual em "O que Fazer Hoje"), e o selo novo 'patrocinado'.
alter table public.eventos
  drop constraint if exists eventos_destaque_secoes_validas;
alter table public.eventos
  add constraint eventos_destaque_secoes_validas
  check (
    destaque_secoes <@ array['evento_destaque', 'destaque', 'hoje', 'patrocinado']::text[]
  );

-- 2) locais também ganham o selo 'patrocinado' (mesma ideia, pra local).
alter table public.locais
  drop constraint if exists locais_destaque_secoes_validas;
alter table public.locais
  add constraint locais_destaque_secoes_validas
  check (
    destaque_secoes <@ array[
      'em_alta', 'dicas_trip', 'bares', 'gastronomia', 'cultura', 'turismo', 'destaque', 'hoje', 'patrocinado'
    ]::text[]
  );

-- 3) Ativa 3 categorias que já existiam como placeholder "Em breve" no
--    admin (categoriaReal: null) — Beleza, Lojas, Lazer. Continuam
--    escondidas do usuário final até a Andrea decidir mostrar (mesmo
--    padrão do "servicos", já no banco desde a 001 e escondido por
--    decisão dela, não limitação técnica). ADD VALUE IF NOT EXISTS é
--    idempotente — seguro repetir.
alter type public.categoria_tipo add value if not exists 'beleza';
alter type public.categoria_tipo add value if not exists 'lojas';
alter type public.categoria_tipo add value if not exists 'lazer';

commit;
