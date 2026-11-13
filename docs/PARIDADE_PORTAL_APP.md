# Paridade portal × app (Modo parceiro)

Auditoria de 13/11/2026. Compara o portal do parceiro (`portal-b2b-lgbt/src/app/dashboard/**`, `lib/parceiro.ts`, `components/parceiro/**`) com o Modo parceiro do app (`src/app/parceiro/**`, `src/lib/modoParceiro.tsx`, `parceiroMenu.ts`, `statusDivulgar.ts`, `pendencias.ts`).
Nenhum código foi alterado nesta auditoria.

**Legenda:** ✅ existe · 🟡 parcial · ❌ não existe · ➕ só no app · ⚠️ diferente do portal (decidir).
**Etapa:** número da seção 2 de `docs/ARQUITETURA_MODO_PARCEIRO.md`.

---

## Resumo

| Situação | O quê |
|---|---|
| 🔴 **Bug** | Recusar pedido da Lista VIP no app grava `'recusada'`, mas o banco só aceita `'rejeitada'` (enum `status_solicitacao_vip`, migração 001). Hoje recusar **falha** com "tente de novo". Arquivos: `src/lib/pendencias.ts` (`responderPedido`), `src/app/parceiro/aprovacoes.tsx`, `src/app/parceiro/porta.tsx`. Reservas usam `'recusada'` e estão certas. → **Etapa 0** |
| 🔴 **Regra errada** | **Plano efetivo:** no portal, plano pago só vale com `plano_comercial_status = 'ativo'`. Senão, conta como gratuito. A função `meus_locais_parceiro` (099) nem devolve o status. Por isso, no app, quem está em "interesse", "aguardando pagamento" ou "cancelado" aparece como pago: cadeados abertos, nome do plano e cotas errados. → **Etapa 0** |
| ✅ Já igual | Recursos por categoria (POR_CATEGORIA), troca de senha provisória, troca de local, agenda da semana, situação do cupom (libera em dd/mm) e do banner (dias desde a troca), cota de 4 destaques, validar check-in, porta com QR. |
| ❌ Telas que faltam | Festa (nova/editar/lista), cupons, banner, fidelidade, histórico de check-ins, Minha página, equipe, **produtos**, **hospedagem**, **pacotes**, central de ajuda. |
| ❌ Regras do Início que faltam | Primeiros passos (checklist com %), perfil incompleto, cadastro em análise/rejeitado, lembretes com "lembrar amanhã", sino de lembretes e caixa "Como funciona". |
| ⚠️ Para decidir | Cupom no plano Gratuito (o portal deixa criar só no perfil, o app tranca) · "Aprovar e liberar" na porta (o portal já marca a entrada, o app só aprova) · janela da festa de hoje (o app usa 18h antes/2h depois, o banco usa 12h/12h) · no portal só o dono mexe em cupons, enquanto o app mostra cupons para a equipe com permissão, mas o banco ainda trava (ver etapa 0). |

---

## 1. Regras gerais (plano, categoria, permissão, acesso)

| Regra do portal | Onde no portal | Banco | No app | Etapa |
|---|---|---|---|---|
| Plano efetivo: pago só com status `ativo`; senão gratuito | `lib/parceiro.ts` `planoEfetivo` | `locais.plano_comercial_status` | ❌ `nivelDoPlano` usa o plano cru | 0 |
| Status do plano por extenso (ativo / interesse / aguardando pagamento / cancelado) | `dashboard/page.tsx` | idem | ❌ (sem preço nem Pix no app, regra da Apple) | 0 |
| Selo "Plano X" no topo | `ParceiroShell` | — | 🟡 `TelaParceiro` mostra, sem o status | 0 |
| POR_CATEGORIA (cupom/desconto, agenda, eventos, Lista VIP, check-ins, fidelidade) | `lib/parceiro.ts` | — | ✅ espelho em `modoParceiro.tsx` (+ `reservas` ➕) | — |
| `pedeHorario` (falso em eventos, produtos, serviços, turismo) | `lib/parceiro.ts` | — | ❌ | 11 |
| `pedePagina` (festa avulsa não cobra página completa) | `lib/parceiro.ts` | `locais.subcategoria` | ❌ | 11 |
| "Cupom de desconto" ou "Cupons" pela categoria | `ParceiroShell` | — | ✅ `parceiroMenu.ts` | — |
| Menus por categoria: Pacotes (`pode_subir_pacotes`, senão turismo), Produtos (só produtos), Hospedagem (só turismo) | `ParceiroShell` | `locais.pode_subir_pacotes` | ❌ nenhum dos três itens | 12, 13, 14 |
| Grupo de menu some sem itens | `ParceiroShell` | — | ✅ abas somem | — |
| Bolinha de pendência no item do menu | `ParceiroShell` | — | ❌ (só o número em Aprovações) | 11 |
| Vários locais: marca ativa salva no aparelho | `ParceiroShell`, `lib/marcaAtiva.ts` | `locais` | ✅ (dono e equipe) | — |
| Selo "em análise" no topo quando o local está pendente | `ParceiroShell` | `locais.status` | ❌ (só aviso na Agenda) | 11 |
| Selo "Espaço Seguro" | `ParceiroShell` | `locais.safe_space` | ❌ | 8 |
| Conta sem local: tela "Nenhum espaço vinculado" (vincular / cadastrar) | `dashboard/page.tsx` | — | ❌ volta para o modo cliente | 11 |
| Organizador sem local, mas com festas, vai para Eventos | `ParceiroShell` | `meus_eventos_gerenciaveis` | ❌ não entra no Modo parceiro | 2 |
| Permissões: o portal é só do dono | todas as telas (`owner_id`) | RLS | ➕ o app tem papéis e `pode()`. A 099 já abriu para a equipe: editar festa, aprovar/recusar Lista VIP e banner. **Ainda só do dono no banco:** gravar `cupons` e **criar** `listas_vip` (insert). Precisa de migração igual à 103 antes das etapas 1 e 4 | 0 |
| Sair da conta | `ParceiroShell` | auth | ✅ `espaco.tsx` | — |

## 2. Início do portal (primeiros passos, lembretes, senha)

| Regra do portal | Onde no portal | Banco | No app | Etapa |
|---|---|---|---|---|
| **Senha provisória** (conta WhatsApp, `senha_trocada` ≠ true) | `lib/parceiro.ts` | auth metadata | ✅ `parceiroAuth.ts` | — |
| **Assistente de primeiro acesso** (janela 1× por sessão, "fazer depois") | `ParceiroShell` | sessionStorage | ⚠️ o app obriga a troca (`_layout.tsx` → `trocar-senha`) | — |
| Nova senha: mínimo 6, confirmação igual, grava `senha_trocada` | `ParceiroShell`, `perfil` | `auth.updateUser` | ✅ (e o app ainda proíbe repetir a provisória) | — |
| **Perfil incompleto:** falta foto (capa, logo ou galeria), descrição < 20, Instagram ou horário (se `pedeHorario`). Desligado se `!pedePagina` | `lib/parceiro.ts` `diagnosticar` | `locais` | ❌ | 11 |
| Lembrete fixo: cadastro **em análise** ("até 48h") ou **rejeitado** ("fale com a equipe") | `montarLembretes` | `locais.status` | ❌ | 11 |
| Lembrete "complete a página" (agora se falta foto/descrição) | `montarLembretes` | — | ❌ | 11 |
| Lembretes de festa: "cadastre a próxima" e "coloque em destaque" | `montarLembretes` | `eventos` | 🟡 cartão "Suba a próxima festa"; sem o de destaque | 11 |
| Lembrete "agenda desta semana vazia" | `montarLembretes` | `agenda_semanal` | 🟡 Lousa: "Falta esta semana" | — |
| Lembrete "agenda da próxima semana" (sexta a domingo) | `montarLembretes` | `agenda_semanal` | ❌ | 11 |
| Lembretes de cupom: convite (gratuito), "pode publicar", "libera em dd/mm" | `montarLembretes` | `uso_ofertas_periodo` | 🟡 selo na Lousa e em Divulgar | — |
| Lembrete do banner: escrever / trocar (7 dias ou mais) | `montarLembretes` | `destaque_chamada` | ✅ `statusDivulgar.ts` | — |
| Lembretes de fidelidade: "crie o cartão" e "cartão escondido do app" | `montarLembretes` | `programas_fidelidade` | ❌ | 11 |
| Ordem: agora → esta semana → dica; sino com a contagem | `ParceiroShell` | — | ❌ | 11 |
| "Lembrar amanhã" (adia 24h no aparelho; o fixo não adia) | `lib/parceiro.ts`, `ParceiroShell` | localStorage | ❌ | 11 |
| **Primeiros passos** com barra de % e "Parabéns": senha, página, festa e destaque (eventos), agenda, primeiro cupom (pago), cartão fidelidade | `montarChecklist`, `dashboard/page.tsx` | várias | ❌ | 11 |
| "O que fazer esta semana" + "Ideias para crescer"; vazio = "Tudo em dia" | `dashboard/page.tsx` | — | 🟡 Lousa da semana | — |
| Saudação pelo horário | `dashboard/page.tsx` | — | ✅ | — |
| Números de 30 dias (visitas, Instagram, cliques em cupom, **nota média**) | `dashboard/page.tsx` | `resumo_analytics_local`, `locais.rating_*` | 🟡 o app tem mais métricas, 7/30 dias; falta a nota média | 11 |
| Próximos 3 eventos com vagas da Lista VIP | `dashboard/page.tsx` | `eventos`, `listas_vip` | 🟡 cartão "Agora" (só a próxima) | 2 |
| Caixa "Como funciona" em cada tela (aberta na 1ª visita) | `CaixaComoFunciona.tsx`, `lib/ajudaPaginas.ts` | localStorage | ❌ (só o ⓘ do `TituloSecao`) | 11 |
| Central de ajuda (telas pela categoria, perguntas frequentes, WhatsApp) | `dashboard/ajuda` | — | 🟡 só "Falar com a equipe" | 11 |

## 3. Festas e Lista VIP

| Regra do portal | Onde no portal | Banco | No app | Etapa |
|---|---|---|---|---|
| Lista de eventos que posso gerenciar (marca ativa + avulsos), mais nova primeiro | `eventos/page.tsx` | `meus_eventos_gerenciaveis` | ❌ | 2 |
| Etiqueta Aprovado / Em análise / Cancelado / Rejeitado | `eventos/page.tsx` | `eventos.status` | 🟡 só "em análise" em Aprovações | 2 |
| Nova festa: título e início obrigatórios, título formatado | `FormularioFesta.tsx` | `eventos` | ❌ | 1 |
| Relação com a comunidade LGBT+ obrigatória | `FormularioFesta.tsx` | `eventos.classificacao_lgbt` | ❌ | 1 |
| Tipo e público obrigatórios; tipo com música = 1 a 3 estilos; grava também `estilos_musicais`/`publico_tags` antigos | `FormularioFesta.tsx`, `eventos/page.tsx` | `eventos.tags` | ❌ | 1 |
| Tags opcionais em grupos (sem as automáticas e reservadas) | `FormularioFesta.tsx` | `TAGS_EVENTO_*` | ❌ | 1 |
| Flier opcional (tipo e tamanho), a falha no envio não trava | `FormularioFesta.tsx` | `fotos-eventos`, `cadastro_rapido_definir_foto_evento` | ❌ | 1 |
| Festa avulsa (sem local): CPF/CNPJ obrigatório, guardado em tabela privada | `FormularioFesta.tsx` | `cadastro_evento_definir_documento` | ❌ | 1 |
| Aviso de WhatsApp sem DDD | `FormularioFesta.tsx` | — | ❌ | 1 |
| "Quero Lista VIP": a lista nasce quando a festa é aprovada | `FormularioFesta.tsx` | `quer_lista_vip`, gatilho 031 | ❌ | 1 |
| Toda festa nova entra "em análise" (gatilho) + tela de "enviado" | `eventos/novo` | `enforce_evento_seguro_insert` | ❌ | 1 |
| Editar: mudar título/data de festa aprovada volta para análise (aviso) | `eventos/page.tsx` | `protect_admin_fields_eventos` | ❌ | 1 |
| Cancelar festa com confirmação (não apaga; só o admin reativa) | `eventos/page.tsx` | `eventos.status` | ❌ | 2 |
| Link do ingresso (`http(s)://`) e "exigir foto" na Lista VIP | **sem tela no portal**, só no banco (099) | `link_ingresso`, `exigir_foto` | ❌ (falta nas duas pontas) | 1 |
| Repetir festa | **não existe no portal** | — | ❌ (o menu promete "repetir") | 2 |
| Destacar com o plano por festa: aprovada, futura, com cota; o admin passa do limite | `DestaqueFestaPlano.tsx` | `destacar_festa_do_plano`, `festas_do_plano_no_mes` | 🟡 só o contador X/4 em Divulgar | 2 |
| Sem plano: destaque avulso | `DestaqueFestaPlano.tsx` | — | 🟡 "falar com a equipe", sem preço (Apple) | 2 |
| Cota única de 4 por mês (festas + agenda) | migração 101 | idem | ✅ | — |
| Criar Lista VIP (nome, limite de vagas ≥ 1); vagas ocupadas/limite | `eventos/page.tsx`, `lista-vip/page.tsx` | `listas_vip` | ❌ (o app não cria lista) | 1 |
| Aprovar pedido; lista cheia barra a aprovação | `lista-vip/page.tsx` | gatilho 099 | ✅ (e "aprovar todos" ➕) | — |
| **Recusar pedido = `'rejeitada'`** | `lista-vip/page.tsx`, `porta/page.tsx` | enum | 🔴 o app grava `'recusada'` e falha | 0 |
| Lista completa com canceladas e check-ins | `lista-vip/page.tsx` | — | ❌ (o app só mostra pendentes) | 2 |

## 4. Porta

| Regra do portal | Onde no portal | Banco | No app | Etapa |
|---|---|---|---|---|
| Só festas com Lista VIP; abre na mais próxima de agora | `porta/page.tsx` | `eventos`, `listas_vip` | ✅ (−3 a +14 dias) | — |
| Código = 6 primeiros do id; QR `dicasvip:<id>` | `porta/page.tsx` | — | ✅ | — |
| Câmera lê o QR; recarrega a cada 12s | `porta/page.tsx` | — | ✅ (expo-camera) | — |
| Busca por nome/código sem acento | `porta/page.tsx` | — | 🟡 sem tirar acento | 0 |
| "Aprovar e liberar" já marca a entrada (`check_in`) | `porta/page.tsx` | — | ⚠️ o app só aprova | 0 |
| Já entrou: "convite já usado" + desfazer | `porta/page.tsx` | — | ✅ | — |
| "Aprovar mesmo assim" para recusada/cancelada | `porta/page.tsx` | — | 🟡 depende do bug `'recusada'` | 0 |
| Conferir documento com foto | `porta/page.tsx` | — | ✅ + foto de conferência ➕ | — |
| Contadores (dentro, faltam, aguardando, com acompanhantes) | `porta/page.tsx` | — | ✅ | — |
| Filtro "Todos" esconde cancelados; atalhos na linha | `porta/page.tsx` | — | ❌ | 2 |
| Resumo da festa (pediram, aprovados, presença %) e vagas | `porta/page.tsx` | `listas_vip.vagas_*` | ❌ | 2 |
| Baixar CSV da lista | `porta/page.tsx` | — | ❌ (avaliar se cabe no celular) | 2 |
| Porteiro só na janela da festa (12h antes até 12h depois) | banco 099 | `evento_na_janela_da_porta` | ⚠️ "festa de hoje" usa 18h/2h (`pendencias.ts`) | 0 |
| Entrada do porteiro com PIN | banco 099 | `entrar_modo_porta` | ❌ | 10 |

## 5. Cupons

| Regra do portal | Onde no portal | Banco | No app | Etapa |
|---|---|---|---|---|
| Título obrigatório; descrição, código (maiúsculo), validade, limite de uso ≥ 1 | `cupons/page.tsx` | `cupons` | ❌ | 4 |
| Dias da semana (vazio ou 7 = todos → null), atalhos Ter–Qui / Sex–Dom / Todos | `cupons/page.tsx` | `cupons.dias_semana` | ❌ | 4 |
| Horário início/fim; check-in só na janela (Brasília) | `cupons/page.tsx` | `hora_inicio/fim` (078) | ❌ | 4 |
| Limite: Premium/Fundador 1 a cada 7 dias, Intermediário 1 a cada 14, "libera em dd/mm" | `cupons/page.tsx` | `uso_ofertas_periodo` | 🟡 só a etiqueta | 4 |
| Gratuito: cupom só no perfil (a faixa da categoria é dos pagos) | `cupons/page.tsx` | — | ⚠️ o app tranca com cadeado | 4 |
| Plano mensal antigo: "X de Y ofertas do mês" | `cupons/page.tsx` | — | ❌ (ver se ainda existe alguém nele) | 4 |
| Ativar/desativar, excluir, resgates x/limite | `cupons/page.tsx` | `cupons_resgatados` | ❌ | 4 |
| Validar check-in pelo código (libera o cupom) | `cupons/page.tsx` | `validar_checkin` | ✅ (e o app lê QR ➕) | — |

## 6. Banner e destaques

| Regra do portal | Onde no portal | Banco | No app | Etapa |
|---|---|---|---|---|
| Só Premium/Fundador ativo edita; não vale para festas | `destaques/page.tsx` | `plano_comercial(_status)` | 🟡 cadeado certo, mas usa o plano cru (etapa 0) | 5 |
| Frase obrigatória até 90 (60 com foto); botão até 24 ("Conhecer") | `destaques/page.tsx` | `destaque_chamada` | ❌ | 5 |
| Aviso "trocado há N dias" (7 ou mais em âmbar) | `destaques/page.tsx` | `updated_at` | ✅ | — |
| Foto opcional → estilo "foto à direita"; dica de foto sem texto | `destaques/page.tsx` | `fotos-locais/<local>/banner-*` | ❌ | 5 |
| Estilo, cores, palavra de impacto e prévia | `destaques/page.tsx` | colunas 095 | ❌ (`SeletorCor` pronto) | 5 |
| Variantes por lugar (Home, categoria, Destaques) | `destaques/page.tsx` | `variantes` (096) | ❌ | 5 |
| Vaga no app (Banner N na categoria) | `destaques/page.tsx` | `vitrine_vaga` | ❌ | 5 |
| Exibições, toques e taxa de 30 dias por área | `destaques/page.tsx` | `resumo_vitrine_local` | 🟡 métricas de 7 dias no Início | 5 |
| Comunicação do Fundador (frase 90, texto 280, oferta 90, botão 24) | `destaques/page.tsx` | `fundador_comunicacao` | ❌ | 5 |
| Patrocínio Master (título 90, subtítulo 120, botão 24, cores) | `destaques/page.tsx` | `categoria_patrocinio` | ❌ | 5 |

## 7. Agenda da semana (etapa 3, feita)

| Regra do portal | No app |
|---|---|
| Esta/próxima semana, "N de 7", só nesta semana × toda semana, a datada vale primeiro | ✅ |
| Virar "toda semana" apaga a datada; limpar a fixa avisa "todas as semanas" | ✅ |
| Título obrigatório; cartaz = imagem ou texto (1200), título padrão | ✅ |
| Foto até 5MB no portal | 🟡 o app aceita até 8MB (limite do bucket, migração 084) |
| Aviso "falta a migração 073" | 🟡 aviso genérico "o banco ainda não recebeu" |
| Destacar dia/cartaz, prévia, compartilhar | ➕ só no app (o portal ainda não tem: ver §2 do guia) |

## 8. Fidelidade e check-ins

| Regra do portal | Onde no portal | Banco | No app | Etapa |
|---|---|---|---|---|
| 1 programa por local (o mais antigo) | `fidelidade/page.tsx` | `programas_fidelidade` | ❌. Atenção: `clientes_vip_do_local` (100) pega o **mais novo** | 7 |
| Visitas 1–60, brinde obrigatório (120), nome padrão (60), observações (300) | `fidelidade/page.tsx` | idem | ❌ | 7 |
| Contagem "no mês" (zera dia 1º, 1 brinde/mês) ou "sempre" | `fidelidade/page.tsx` | `janela` | ❌ | 7 |
| Nível VIP: mínimo 2 (máx. 200) e benefício obrigatório (120) | `fidelidade/page.tsx` | `visitas_vip`, `beneficio_vip` (081) | 🟡 o app lê (padrão 3), não edita | 7 |
| "Mostrar no app" e "Programa ativo" (pausa sem perder histórico) | `fidelidade/page.tsx` | `exibir_no_app`, `ativo` | ❌ | 7 |
| Prévia "A cada N visitas, o cliente ganha…" e ajuda em 4 passos | `fidelidade/page.tsx` | — | ❌ | 7 |
| Confirmar visita mostrando "X de N visitas" | `fidelidade/page.tsx` | `contar_visitas_fidelidade` | 🟡 confirma, sem o progresso | 7 |
| "Entreguei o brinde" | `fidelidade/page.tsx` | `resgatar_fidelidade` | ❌ | 7 |
| Lista de clientes com progresso, VIP e brinde | `fidelidade/page.tsx` | `fidelidade_clientes` | ⚠️ Clientes VIP usa outra regra (90 dias fixos) | 7 |
| Histórico 24h / 2 / 7 / 30 dias; confirmado / pendente / cancelado | `checkins/page.tsx` | `checkins_do_local` | 🟡 só pendentes de 2 dias | 9 |
| Como foi: GPS (metros), automático 6h, pela casa | `checkins/page.tsx` | `metodo`, `distancia` | 🟡 só a distância | 9 |
| Cancelar com confirmação (visita e cupom voltam); cancelar já confirmados | `checkins/page.tsx` | `cancelar_checkin_local` | 🟡 só pendentes; sem tratar erro | 9 |
| Recarrega a cada 30s | `checkins/page.tsx` | — | ✅ | — |

## 9. Minha página (só o dono)

| Regra do portal | Banco | No app | Etapa |
|---|---|---|---|
| Status, selo e destaque são do admin (só aparecem) | gatilho `protect_admin_fields_locais` | ❌ | 8 |
| Capa e logo: imagem até 5MB (`capa-*`, `logo-*`); sem logo o app usa a capa | `fotos-locais` | ❌ (`FotoUpload` pronto) | 8 |
| Galeria até 6 fotos; galeria e vídeo só aparecem no app com Premium/Fundador | `galeria_fotos`, `video_url` | ❌ | 8 |
| Vídeo só por link (Instagram/Reels/YouTube) | `video_url` | ❌ | 8 |
| Nome obrigatório; descrição até 800 (o lembrete pede 20 ou mais) | `nome`, `descricao` | ❌ | 8 |
| Categoria (algumas "em breve") e subcategoria ou "Outros" | `subcategoria` | ❌ | 8 |
| Serviços: tipo de atendimento + especialidade; Produtos: link da loja | `atendimento_tipo`, `especialidade`, `link_loja_online` | ❌ | 8 |
| Relação com a comunidade LGBT+ (uma; tocar de novo desmarca) | `classificacao_lgbt` | ❌ | 8 |
| Público: nenhum marcado = `['todos']` | `publico_tags` | ❌ | 8 |
| Horário de funcionamento (cobrado se `pedeHorario`) | `horario_funcionamento` | ❌ | 8 |
| Instagram (@usuário) e WhatsApp (aviso sem DDD) | `instagram`, `contato_telefone` | ❌ | 8 |
| Cidade obrigatória (exceto serviços, turismo, produtos); bairro para exibir | `cidade`, `bairro_exibicao` | ❌ | 8 |
| Coordenadas: busca pelo endereço ou à mão ("Ver no mapa") | `lat`, `lng` | ❌ | 8 |
| Programação foi para a Agenda | — | ✅ | — |

## 10. Telas só de algumas categorias

| Tela | Para quem | Regras principais | Banco | No app | Etapa |
|---|---|---|---|---|---|
| **Produtos** (catálogo) | só `produtos` | Nome obrigatório; descrição, preço ≥ 0, link e foto opcionais; ativar/excluir (o portal exclui **sem confirmação** e a foto não tem limite: no app, confirmar e limitar) | `produtos_catalogo`, `fotos-locais/<local>/produtos/` | ❌ | 12 |
| **Hospedagem** | só `turismo` | 9 etapas salvas a cada troca; obrigatórios: tipo, Cadastur, check-in/out, endereço no mapa, capa, 1 quarto com foto, 3 comodidades, cancelamento, termo; % de completude ordena no app; galeria até 10, sem HEIC, até 5MB; quartos/áreas com capacidade, camas e preço; fotos de espaços e locais próximos só com Premium/Fundador; tags reservadas saem ao salvar; comprovante até 10MB (só a equipe vê); termo trava depois de aceito; locais próximos ficam em análise (até 3km); reserva por link/WhatsApp/e-mail/site, sem comissão; status rascunho → enviado → ajustes/aprovado | `hospedagem_perfil`, `hospedagem_espacos`, `hospedagem_validacao`, `pontos_proximos`, bucket `documentos-hospedagem` | ❌ (o cliente já vê) | 13 |
| **Pacotes e roteiros** | `pode_subir_pacotes` (sem a coluna, turismo) | Nome obrigatório; destino; duração (4 opções); estilo (8, vai para tags); preço de/até; ativar/excluir; foto sem limite no portal | `pacotes_turismo` (054), `fotos-locais` | ❌ (o cliente já vê) | 14 |

## 11. O que o app tem e o portal não tem

Papéis e permissões da equipe, porteiro por PIN, foto de conferência na porta, aprovar todos, leitura de QR no check-in, reservas (102), destacar e compartilhar a agenda, prévia ao vivo, Clientes VIP com aniversários. Destas, só **destacar a agenda** e o **"Usadas X de 4 (festas + agenda)"** já estão listadas para levar ao portal (§2 do guia).
