-- Rodada 26 — pedido da Andrea: aprovar evento/festa também deve gerar um
-- convite/aviso por WhatsApp pro organizador, igual já existe pra `locais`
-- desde a Rodada 22/23. Pré-requisito identificado na Rodada 25: `eventos`
-- nunca teve coluna própria de contato — o WhatsApp do organizador vinha
-- só embutido como texto solto dentro de `descricao` ("Contato: nome —
-- whatsapp"), o que é frágil pra qualquer automação ler de volta.
--
-- Colunas abertas (mesmo padrão de publico_tags/tags/descrição — a RLS
-- eventos_insert_qualquer_um / eventos_update_dono_ou_admin já cobre,
-- sem precisar de trigger novo).

alter table public.eventos
  add column if not exists contato_nome text,
  add column if not exists contato_whatsapp text;

comment on column public.eventos.contato_nome is 'Nome de quem cadastrou o evento — pra admin saber com quem falar na aprovação.';
comment on column public.eventos.contato_whatsapp is 'WhatsApp de quem cadastrou o evento — usado no aviso automático de aprovação (Rodada 26). Formato livre digitado no cadastro; normalizado só na hora de montar o link wa.me.';
