-- Rodada 60 — Andrea recebeu da Câmara de Comércio LGBT+ (mensagem do
-- Renan) uma classificação de 4 categorias pra descrever a relação de um
-- estabelecimento/evento com a comunidade LGBT+, e pediu pra: 1) capturar
-- isso no cadastro (locais e eventos), e 2) mostrar no app, na tela do
-- local, perto do cupom. Confirmado com ela (AskUserQuestion): campo de
-- escolha ÚNICA (não multi-select, diferente de publico_tags/estilos_
-- musicais, que já são arrays) e, por ora, só exibido no app na tela do
-- local (não em cards de lista nem em eventos).
--
-- Coluna aberta (mesmo padrão de tags/bairro_exibicao/logo_url desde a
-- Rodada 16/29): NÃO entra na lista travada por protect_admin_fields_
-- locais (024) nem no equivalente de eventos, então o dono continua
-- podendo editar sozinho sem mudança de RLS nenhuma — só a checagem de
-- valores válidos via CHECK constraint, pra não deixar lixo livre nessa
-- coluna (diferente de `tags`, que é digitação livre por natureza).
alter table public.locais
  add column if not exists classificacao_lgbt text
    check (classificacao_lgbt in ('lugar_lgbt', 'voltado_comunidade', 'acolhedor_diversidade', 'frequentado_comunidade'));

alter table public.eventos
  add column if not exists classificacao_lgbt text
    check (classificacao_lgbt in ('lugar_lgbt', 'voltado_comunidade', 'acolhedor_diversidade', 'frequentado_comunidade'));

comment on column public.locais.classificacao_lgbt is
  'Classificação da relação do estabelecimento com a comunidade LGBT+, conforme metodologia da Câmara de Comércio LGBT+: lugar_lgbt (criado/liderado por pessoas LGBTQI+), voltado_comunidade (produtos/serviços pensados pra comunidade), acolhedor_diversidade (atendimento inclusivo), frequentado_comunidade (virou ponto de encontro espontâneo). Escolha única, opcional.';
comment on column public.eventos.classificacao_lgbt is
  'Mesma classificação de public.locais.classificacao_lgbt, aplicada ao evento.';
