# Arquitetura do Modo parceiro (app Dicas LGBT+) — guia de construção

Leia isto antes de construir qualquer tela do Modo parceiro. Vale para quem estiver programando (Claude Code ou pessoa).
Expo SDK 58 · expo-router · Supabase. Leia também `AGENTS.md`.

## 1. O que já existe (não refazer)
| Parte | Arquivo |
|---|---|
| Abas, guarda de entrada, senha provisória | `src/app/parceiro/_layout.tsx` |
| Moldura das telas (logo, local, trocar local, título + subtítulo, régua `ESP`/`RAIO`, `GradeItens`, `ListaItens`, `TituloSecao`) | `src/components/parceiro/TelaParceiro.tsx` |
| Locais, papel, permissões `pode()`, recursos por categoria | `src/lib/modoParceiro.tsx` |
| Itens de cada aba, selos/cadeado por plano, link "Abrir no portal", WhatsApp da equipe | `src/lib/parceiroMenu.ts` |
| Início, Aprovações, Porta (QR), Divulgar, Fidelizar, Clientes VIP, Meu espaço, Trocar senha | `src/app/parceiro/*.tsx` |
| Pendências (Lista VIP, check-ins) | `src/lib/pendencias.ts` |
| Banco: equipe, PIN da porta, foto de conferência, analytics, clientes VIP | `supabase-migration/098`, `099`, `100` |

## 2. Telas a construir (hoje abrem "Abrir no portal")
Cada tela nova = 1 rota em `src/app/parceiro/`, registrada no `_layout.tsx` com `href: null`, e `rota` preenchida no item de `parceiroMenu.ts` (aí o aviso some sozinho).
A regra de negócio NÃO se inventa: copie da tela equivalente do portal (`portal-b2b-lgbt/src/app/dashboard/...`).

| Ordem | Tela (rota) | Item do menu | Copiar regra de | Tabelas / RPC | Permissão |
|---|---|---|---|---|---|
| 1 | `festa-editar` (nova e editar, `?id=`) | festa, eventos | `dashboard/eventos/novo` + componente de cadastro único (rodada 130) | `eventos` (capa_url, cor1, cor2, textura, chamada, destaques, link_ingresso, exigir_foto), `listas_vip`, storage `fotos-eventos` | `festa` |
| 2 | `festas` (Minhas festas: começa com **+ Nova festa**; lista com status, repetir da semana passada, Destacar com o plano; é o único quadradinho de festas na Divulgar) | eventos | `dashboard/eventos` | `eventos`, `resumo_da_festa` | `festa` |
| 3 | `agenda` (agenda da semana, 7 dias) + prévia de como o cliente vê + **Destacar este dia / Destacar o cartaz da semana** + **Compartilhar** (WhatsApp/Instagram com o link da casa) | agenda | `dashboard/agenda` | `agenda_semanal`, `destacar_agenda_do_plano`, `festas_do_plano_no_mes` (cota única 4/mês, migração 101) | `festa` (destacar: só dono) |
| ✅ | **Feito** · `agenda` (13/11/2026): tela 3 pronta, com prévia, destacar (dia/cartaz, contador X de 4) e compartilhar. Peças comuns em `src/components/parceiro/form/`, dados em `src/lib/parceiro/agenda.ts`. Precisa da migração `103_agenda_pela_equipe.sql` para gerente/social media salvarem | | | | |
| 4 | `cupom-editar` + lista | cupons | `dashboard/cupons` | `cupons`, `uso_ofertas_periodo` | `cupons` |
| 5 | `banner` (foto, cores, textura, frase da semana, prévia ao vivo) | banner, destaque_festa | `dashboard/destaques` | `destaque_chamada`, `vitrine_vaga`, `resumo_vitrine_local` | `banner` |
| 6 | `equipe` (convidar por código, modelos de permissão, PIN da porta) | equipe | migração 099 | `local_equipe`, `criar_convite_equipe`, `definir_pin_porta`, `porta_do_local` | só dono |
| 7 | `fidelidade` (cartão: meta, brinde, nível VIP) | fidelidade, vip | `dashboard/fidelidade` | `programas_fidelidade`, `fidelidade_clientes` | só dono |
| 8 | `pagina` (fotos, textos, horários, Instagram) | pagina | `dashboard/perfil` (grande: dividir em seções) | `locais`, storage `fotos-locais` | só dono |
| 9 | `historico` (visitas e cupons usados) | checkins (Fidelizar) | `dashboard/checkins` | `checkins_do_local` | `checkins` |
| 10 | Entrada do porteiro por PIN ("Sou da equipe da porta") na tela Conta | — | migração 099 | `entrar_modo_porta` (login anônimo) | — |

### Regra nova — destaque da agenda (migração 101)
- Premium/Fundador: **4 destaques por mês, uma cota só** para festas do plano + agenda.
- Dia da agenda: destaca uma data e fica no ar até o fim do dia. Cartaz da semana: destaca de segunda a domingo e conta como 1.
- Falta fazer no **app cliente** (`src/app/(tabs)/events.tsx`, faixa "Festas em destaque"): ler `destaques_agenda` com data_fim >= hoje, juntar com `agenda_semanal` (titulo, foto_url, horario) e mostrar junto das festas do plano (só a foto; sem foto, ícone + nome). Abre a página do local.
- Falta fazer no **portal**: mesmo botão em `dashboard/agenda` e o texto "Usadas X de 4 (festas + agenda)" em `DestaqueFestaPlano.tsx`.

### Reservas (migração 102) — já feito
- Parceiro: `src/app/parceiro/reservas.tsx` (Meu espaço › Reservas): modo app / WhatsApp / desligado, regras, áreas.
- Aprovações: "Reservas a confirmar" (✓/✕, toque abre detalhe e WhatsApp do cliente). Badge soma reservas.
- Cliente: botão "Fazer reserva" em `business/[id].tsx` e o passo a passo em `src/app/reserva/[id].tsx`.
- Falta: aviso por push ao cliente quando a casa confirma; "Minhas reservas" na Conta; lista do dia na porta (compareceu / não veio).

## 3. Peças comuns (criar uma vez, em `src/components/parceiro/form/`)
- `Campo` (rótulo, ajuda, erro, contador), `CampoData` e `CampoHora` (pt-BR), `Chips` (escolha única ou múltipla), `Interruptor` com explicação.
- `FotoUpload` (galeria/câmera, recorte, compressão, sobe no bucket e devolve a URL).
- `SeletorCor` + `SeletorTextura` (as mesmas opções do portal).
- `BarraSalvar` fixa embaixo (Salvar / Publicar), que trava enquanto salva e avisa se você tentar sair sem salvar.
- `Previa` mostrando o card como o cliente vai ver (reaproveitar os componentes do app cliente).
Dados em `src/lib/parceiro/<assunto>.ts` (festas.ts, agenda.ts, cupons.ts, banner.ts, equipe.ts, fidelidade.ts, pagina.ts): funções `listar/obter/salvar`, erros já traduzidos para português.

## 4. Regras que valem para todas as telas
- **Apple:** nada de preço, botão de pagamento ou link de pagamento. Vender = WhatsApp da equipe (`falarComEquipe`).
- **Plano:** o limite vem do portal (cupons 1/7 dias Premium/Fundador, 1/14 Intermediário, cadeado no Gratuito; banner só Premium/Fundador; 4 festas em destaque por mês Premium/Fundador, as demais são avulsas). O banco é quem trava de verdade; o app só explica.
- **Categoria:** o que aparece segue `recursosDaCategoria()` (mesmo POR_CATEGORIA do portal).
- **Permissão:** esconder o que `pode()` nega, e o RLS confirma no banco.
- **Layout:** só `TelaParceiro` + régua `ESP`/`RAIO` (8 entre caixas, 12 dentro delas, 24 entre seções), área de toque mínima de 44, uma ação principal por tela, textos curtos dizendo onde aquilo aparece para o público.
- **Português** em tudo, nomes sem caixa alta, datas `dd/mm`.

## 5. Como saber que a tela está pronta
1. `npx tsc --noEmit` limpo.
2. Abre no Expo Go, salva, reabre, e o dado está lá (e aparece igual no portal).
3. Testada com dono, gerente e porteiro (permissões) e com plano Gratuito e Fundador.
4. `rota` preenchida em `parceiroMenu.ts`, para o aviso "Abrir no portal" sumir.
5. Uma linha em `docs/ARQUITETURA_MODO_PARCEIRO.md` §2 marcando a tela como feita.
