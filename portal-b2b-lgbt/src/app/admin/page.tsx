'use client';
import { Check, ChevronDown, ChevronUp, Loader2, LogOut, MessageCircle, Search, ShieldAlert, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { normalizarTelefoneBR } from '../../lib/parceiroAuth';
import { erroFotoNaoSuportada } from '../../lib/validarFoto';

const URL_PORTAL = 'https://dicas-portal-b2b-dun.vercel.app'; // ajuste aqui quando o domínio definitivo (ex.: portal.vezpabar.com) estiver configurado

// Painel admin mínimo — reaproveita is_admin()/RLS que já existe em todas as
// tabelas (nenhuma migration nova precisou ser feita pra segurança daqui;
// o filtro de acesso abaixo é só de UX, a segurança real já está no banco).
// Cobre as 4 filas de aprovação/ação manual que a investigação encontrou
// sem nenhuma interface: cadastros de local pendentes, pedidos de vínculo
// de conta, leads institucionais, e — a mais importante pra sustentar o
// negócio — parceiros que pediram um plano pago e estão esperando a Andrea
// cobrar (Pix/WhatsApp) e confirmar.

type LocalPendente = {
  id: string;
  nome: string;
  categoria: string;
  cidade: string;
  bairro: string | null;
  cnpj: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  created_at: string;
};

// Rodada 25 — a festa/evento cadastrado em /cadastro/evento nasce
// `status='pendente'` (mesmo trigger enforce_evento_seguro_insert de
// sempre) mas NUNCA teve fila nenhuma aqui pra aprovar — o /admin só
// tinha filas pra `locais`. A Andrea reportou que uma festa cadastrada
// não aparecia pra aprovação; essa é a causa: a fila simplesmente não
// existia, não é um bug de RLS/trigger (is_admin() já cobre SELECT e
// UPDATE de eventos pendentes, ver pode_gerenciar_evento() na 008).
//
// eventos.descricao carrega o contato/local digitados no cadastro
// (não existe coluna own própria pra isso — ver cadastro/evento/page.tsx,
// "Descrição carrega os dados de contato/local"), por isso é mostrada
// inteira aqui em vez de só um resumo.
type EventoPendente = {
  id: string;
  titulo: string;
  tipo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  contato_nome: string | null;
  contato_whatsapp: string | null;
  created_at: string;
};

// Rodada 26 — compatibilidade com eventos cadastrados ANTES da migration
// 015: nesses, o contato só existe como texto solto dentro da descrição
// ("Contato: nome — whatsapp", formato exato que cadastro/evento/page.tsx
// sempre gerou). Eventos novos já chegam com contato_nome/contato_whatsapp
// de verdade — isso aqui é só pra não perder o aviso automático nos que já
// estavam pendentes antes da coluna existir.
function extrairContatoDescricao(descricao: string): { nome: string | null; whatsapp: string | null } | null {
  const m = descricao.match(/Contato:\s*([^\n—]+?)\s*—\s*([^\n]+)/);
  if (!m) return null;
  return { nome: m[1].trim() || null, whatsapp: m[2].trim() || null };
}

// Rodada 30 — melhorias sugeridas pela própria consultoria de UX (a
// Andrea pediu "todos que sugerir"): mostrar há quanto tempo cada item
// está esperando, em vez de só ordenar por data e deixar ela adivinhar.
// Mais crítico na fila de plano pago (Prioridade 1 do roadmap: "cada dia
// sem contato é o pior tipo de fricção"), mas útil nas outras filas
// também.
function diasDesde(dataISO: string): number {
  const ms = Date.now() - new Date(dataISO).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function textoDias(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} dias`;
}

// Quanto mais tempo esperando, mais chamativo — sem cor nenhuma até 2
// dias (normal), amarelo a partir de 3, vermelho e em negrito a partir
// de 7 (o limiar que o roadmap já discutia como "esfriando").
function corDias(dias: number): string {
  if (dias >= 7) return 'text-red-400 font-bold';
  if (dias >= 3) return 'text-amber-400';
  return 'text-[#626274]';
}

const PLANO_PRECO: Record<string, string> = {
  starter: 'R$59/mês',
  intermediario: 'R$249/mês',
  premium: 'R$599/mês',
  fundador: 'R$3.500/mês',
};

type InteresseNoPlano = {
  id: string;
  nome: string;
  plano_comercial: string;
  plano_comercial_status: string;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  plano_comercial_atualizado_em: string;
};

type AprovadoSemConta = {
  id: string;
  nome: string;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  owner_id: string | null;
};

// Rodada 29 — pedido direto da Andrea: sem parceiro pagante ainda, como
// deixar "Em Alta"/"Destaque da semana" atraentes? `locais.plano_destaque`
// já existe e já é respeitado pela Home (ordenação + badge "Destaque"/
// "VIP" em (tabs)/index.tsx), mas até agora só dava pra mudar rodando SQL
// na mão — não existia UI nenhuma pra isso. Isso aqui é o seletor manual
// que faltava, pra usar como selo editorial/"Fundador" antes de cobrar de
// verdade. Sem relação com `plano_comercial` (o plano PAGO) — os dois
// aparecem juntos aqui só pra dar contexto, nunca são a mesma coisa.
//
// Rodada 43 — a Andrea reportou "todo cadastro entra em Alta" (a Home
// nunca FILTRAVA quem entra, só ordenava — corrigido em src/lib/destaque.ts
// e (tabs)/index.tsx) e pediu, direto no /admin, ao lado de cada local:
// controle de em quais seções ele aparece (várias ao mesmo tempo, não só
// uma), vendo o plano pago real dele como referência, com poder de
// direcionar manualmente mesmo quem não paga "caso o app esteja vazio".
// Isso troca destaque_secao_fixada (Rodada 41, um valor só) por
// destaque_secoes (migration 024, array) — o campo antigo fica no banco
// congelado, só como histórico, sem uso novo. Ela também pediu edição de
// conteúdo (logo, instagram, descrição, fotos) de qualquer local direto
// daqui — sem migration nova pra isso, a RLS já dava esse acesso a
// is_admin() desde a 001/007, só faltava a UI.
type LocalDestaque = {
  id: string;
  nome: string;
  categoria: string;
  cidade: string;
  bairro: string | null;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  plano_comercial: string;
  plano_comercial_status: string;
  fundador: boolean;
  destaque_secoes: string[];
  destaque_ate: string | null;
  // Rodada 44 — seletor unificado "Escolha pela experiência" (até 3,
  // migration 025). Só guarda as 9 experiências reais + Cupons
  // Exclusivos/Eventos — Membro Fundador/Destaque da Semana aparecem
  // juntos no mesmo seletor da UI mas continuam gravando em
  // local_badges/destaque_secoes (ver selecaoAtualExperiencia abaixo).
  experiencias: string[];
  descricao: string | null;
  instagram: string | null;
  foto_capa_url: string | null;
  galeria_fotos: string[];
  video_url: string | null;
  tags: string[];
};

// Rodada 44 — reestruturação do /admin pedida pela Andrea: separar
// "Aprovações" (fluxo de aprovação) de uma aba nova, "Gestão de
// Categorias e Destaques", dedicada a buscar/filtrar estabelecimentos e
// atribuir selos/destaques. Ela mandou a lista exata de filtros e pediu
// sugestões — perguntei antes de implementar (4 perguntas) e o
// combinado ficou:
//  1) As categorias que ainda não existem pro usuário final (Beleza,
//     Espaço 18+ e Serviços, que ela mantém "Em breve" por decisão
//     própria mesmo tendo categoria_tipo real) continuam sem lançar nada
//     novo — os chips abaixo são só organização/preparação no admin, sem
//     categoria_tipo nova nem exibição no app.
//  2) categoriaReal: null = nenhum local tem essa categoria ainda, então
//     o filtro sempre retorna lista vazia (comportamento intencional,
//     não um bug).
//
// Rodada 46 — pedido direto da Andrea pra sugerir categorias novas
// (pensando em atrair mais usuários e monetizar com quem paga pra
// aparecer). Em vez de inventar do zero, ativa 3 categorias que já
// existiam aqui como placeholder "Em breve" (Beleza, Lojas, Lazer —
// migration 026): ampliam o motivo de alguém abrir o app fora do
// circuito de baladas (beleza/lifestyle é uso do dia a dia, não só fim
// de semana) e são categorias naturalmente "vendáveis" pra pequenos
// negócios pagarem por visibilidade, igual bares/gastronomia já fazem
// com plano comercial. "Espaço 18+" fica de fora por ora — não é
// limitação técnica, é decisão de produto/verificação de idade que
// precisa ser tomada antes de virar categoria de banco.
const CATEGORIA_CHIPS: { slug: string; label: string; categoriaReal: string | null }[] = [
  { slug: 'bares', label: 'Bares', categoriaReal: 'lugares' },
  { slug: 'gastronomia', label: 'Gastronomia', categoriaReal: 'gastronomia' },
  { slug: 'festas', label: 'Festas', categoriaReal: null }, // eventos ficam na tabela `eventos`, não em `locais` — ver seção de eventos mais abaixo
  { slug: 'cultura', label: 'Cultura', categoriaReal: 'cultura' },
  { slug: 'dicas_trip', label: 'Dicas Trip', categoriaReal: 'turismo' },
  { slug: 'beleza', label: 'Beleza', categoriaReal: 'beleza' },
  { slug: 'mais18', label: 'Espaço 18+', categoriaReal: null },
  { slug: 'lojas', label: 'Lojas', categoriaReal: 'lojas' },
  { slug: 'servicos', label: 'Serviços', categoriaReal: 'servicos' }, // existe no banco — só não aparece pro usuário final ainda (decisão da Andrea, não limitação técnica)
  { slug: 'lazer', label: 'Lazer', categoriaReal: 'lazer' },
];

const CATEGORIA_REAL_LABEL_ADMIN: Record<string, string> = {
  lugares: 'Bares',
  gastronomia: 'Gastronomia',
  cultura: 'Cultura',
  turismo: 'Dicas Trip',
  servicos: 'Serviços',
  beleza: 'Beleza',
  lojas: 'Lojas',
  lazer: 'Lazer',
};

// Mesma regra de "quem paga de verdade" que já existe em
// src/lib/destaque.ts do app (Rodada 43) — duplicada aqui só pro filtro
// "Em Alta" deste painel achar quem entra automático, já que o portal é
// um projeto separado do app e não compartilha módulos. Se essa regra
// mudar no app, replicar aqui também.
const PLANOS_QUE_PAGAM = new Set(['premium', 'fundador']);
function pagaPlanoComDireitoADestaque(l: LocalDestaque): boolean {
  return PLANOS_QUE_PAGAM.has(l.plano_comercial) && l.plano_comercial_status === 'ativo';
}

function localCombinaComFiltroPrincipal(l: LocalDestaque, filtro: string): boolean {
  if (filtro === 'todas') return true;
  if (filtro === 'em_alta') return l.destaque_secoes.includes('em_alta') || pagaPlanoComDireitoADestaque(l);
  if (filtro === 'hoje') return l.destaque_secoes.includes('hoje');
  const chip = CATEGORIA_CHIPS.find((c) => c.slug === filtro);
  if (!chip || !chip.categoriaReal) return false;
  return l.categoria === chip.categoriaReal;
}

// Rodada 44 — seletor único "Escolha pela experiência" (até 3), pedido
// explícito da Andrea mesmo depois de eu levantar que Membro
// Fundador/Selo Dicas LGBT+ têm mecanismo próprio (local_badges /
// destaque_secoes) — ela confirmou que prefere ver tudo junto na mesma
// lista do admin. `destino` decide pra onde a marcação realmente é
// gravada (ver alternarExperiencia abaixo); a UI trata os 13 igual.
//
// Rodada 56 (2ª rodada de ajuste) — a Andrea pediu pra tirar "Destaque da
// Semana" daqui e colocar "Selo Dicas LGBT+" no lugar dela, ao lado de
// "Membro Fundador" ("o selo dicas LGBT pensei e deixar ao lado de
// membro fundador. Excluir destaque da semana, e deixar no local dos
// selos (atual)"). O valor gravado (`destaque_secoes`) continua sendo
// 'selo_dicas' — só o controle que liga/desliga mudou de lugar: antes
// vivia em OPCOES_SECAO_LOCAL_RAPIDA (linha ~332), agora vive aqui.
//
// Atenção — efeito colateral que a Andrea precisa saber: locais que já
// estavam marcados com o valor antigo 'destaque' (via "Destaque da
// Semana", agora removido) continuam com o brilho dourado/selo
// "DESTAQUE" na Home (src/lib/destaque.ts, deveExibirGlow, no app),
// porque esse dado não foi apagado — só o controle pra desmarcar
// desapareceu daqui. Se algum local ficar "preso" com esse brilho, será
// preciso desmarcar direto no banco (posso gerar o SQL se acontecer).
type OpcaoExperiencia = { slug: string; label: string; destino: 'experiencias' | 'fundador' | 'selo_dicas' };
const OPCOES_EXPERIENCIA: OpcaoExperiencia[] = [
  { slug: 'aniversario', label: 'Aniversário', destino: 'experiencias' },
  { slug: 'predominancia_lesbica', label: 'Predominância Lésbica', destino: 'experiencias' },
  { slug: 'predominancia_gay', label: 'Predominância Gay', destino: 'experiencias' },
  { slug: 'dates', label: 'Dates', destino: 'experiencias' },
  { slug: 'musica_ao_vivo', label: 'Música ao Vivo', destino: 'experiencias' },
  { slug: 'dancar', label: 'Dançar', destino: 'experiencias' },
  { slug: 'karaoke', label: 'Karaokê', destino: 'experiencias' },
  { slug: 'drag_show', label: 'Drag Show', destino: 'experiencias' },
  { slug: 'aula_de_danca', label: 'Aula de Dança', destino: 'experiencias' },
  { slug: 'membro_fundador', label: 'Membro Fundador', destino: 'fundador' },
  { slug: 'selo_dicas', label: 'Selo Dicas LGBT+ (conquista — nunca é venda)', destino: 'selo_dicas' },
  { slug: 'cupons_exclusivos', label: 'Cupons Exclusivos', destino: 'experiencias' },
  { slug: 'eventos', label: 'Eventos', destino: 'experiencias' },
];

// Junta as 3 fontes de dados numa lista só de slugs marcados, pra UI
// (checkbox) e pra contagem do limite de 3 tratarem tudo como uma lista
// única, exatamente como a Andrea pediu.
function selecaoAtualExperiencia(l: LocalDestaque): string[] {
  const selecao = [...(l.experiencias || [])];
  if (l.fundador) selecao.push('membro_fundador');
  if (l.destaque_secoes.includes('selo_dicas')) selecao.push('selo_dicas');
  return selecao;
}

// Rodada 45 — resumo em uma linha de "onde esse local aparece", pedido
// direto da Andrea ("mais fácil de entendermos o que está aonde, em
// qual sessão") — os checkboxes já mostram isso marcado, mas uma frase
// só ajuda a confirmar de longe, sem precisar ler cada checkbox.
function resumoSecoesLocal(l: LocalDestaque): string {
  const partes: string[] = [];
  const manualEmAlta = l.destaque_secoes.includes('em_alta');
  const automatico = pagaPlanoComDireitoADestaque(l);
  if (automatico && !manualEmAlta) partes.push('Em Alta (automático — plano pago)');
  else if (manualEmAlta) partes.push('Em Alta');
  if (l.destaque_secoes.includes('hoje')) partes.push('O que Fazer Hoje');
  if (l.destaque_secoes.includes('turismo')) partes.push('Dicas Trip');
  if (l.destaque_secoes.includes('patrocinado')) partes.push('Patrocinado');
  if (l.destaque_secoes.includes('selo_dicas')) partes.push('Selo Dicas LGBT+');
  return partes.length > 0 ? partes.join(', ') : 'nenhuma seção marcada';
}

function resumoExperienciasLocal(l: LocalDestaque): string {
  const selecao = selecaoAtualExperiencia(l);
  if (selecao.length === 0) return 'nenhuma';
  return selecao
    .map((slug) => OPCOES_EXPERIENCIA.find((o) => o.slug === slug)?.label || slug)
    .join(', ');
}

// Rodada 41 — pedido direto da Andrea: "rotação automática semanal +
// fixar manualmente quando quiser" (opção híbrida que ela escolheu por
// pergunta de múltipla escolha). A rotação em si não precisa de UI nem
// de nada gravado toda semana — roda sozinha via
// `public.peso_rotacao_destaque` (023_destaque_rotativo_...sql), que
// muda o desempate automaticamente quando a semana ISO muda. O que
// precisa de UI é o "direcionar": marcar em quais seções esse local
// aparece, e até quando (opcional).
//
// Rodada 43 — antes só dava pra marcar UMA seção por vez
// (destaque_secao_fixada). Agora é multi-select (destaque_secoes).
//
// Rodada 44 — a Andrea pediu pra simplificar isso pra 3 checkboxes fixos
// e universais (Em Alta / O que Fazer Hoje / Dicas Trip, iguais em
// qualquer estabelecimento, independente da categoria dele) em vez de
// uma opção "Categoria X" que só aparecia pra quem já era daquela
// categoria — "Destaque" (brilho no card) saiu daqui e entrou no
// seletor único "Escolha pela experiência" acima, como "Destaque da
// Semana".
// Rodada 46 — "Patrocinado" somado à lista: selo novo de monetização
// (migration 026), igual "Destaque" só que sem estar amarrado a nenhum
// plano comercial — qualquer local pode comprar avulso, cobrança manual
// igual ao resto (Pix/WhatsApp, sem gateway).
//
// Rodada 47 — "Selo Dicas LGBT+" somado (migration 027): diferente de
// TODOS os outros valores desta lista, este NUNCA é pago — a Andrea foi
// explícita: "o selo dicas não se vende, apenas se conquista". É
// curadoria editorial pura, ela quem escolhe. Mecanismo idêntico por
// baixo (destaque_secoes), só o rótulo e o contexto de negócio mudam —
// por isso o label já deixa isso claro na própria lista, pra nunca virar
// item de venda por engano numa conversa com parceiro.
//
// Rodada 56 (2ª rodada de ajuste) — "Selo Dicas LGBT+" saiu desta lista
// rápida e foi pro seletor "Escolha pela experiência" (OPCOES_EXPERIENCIA
// acima), ao lado de "Membro Fundador" — pedido direto da Andrea. O
// valor gravado continua 'selo_dicas' em destaque_secoes; só o controle
// mudou de lugar (ver resumoSecoesLocal/totalSeloDicas mais abaixo, que
// continuam lendo o mesmo valor e não precisaram mudar).
const OPCOES_SECAO_LOCAL_RAPIDA: { value: string; label: string }[] = [
  { value: 'em_alta', label: 'Em Alta' },
  { value: 'hoje', label: 'O que Fazer Hoje' },
  { value: 'turismo', label: 'Dicas Trip' },
  { value: 'patrocinado', label: 'Patrocinado' },
];

// Rodada 46 — a Andrea reportou "eventos não sobem": a causa real era
// que evento nunca teve a opção 'hoje' aqui (só local ganhou isso na
// 025) — a suposição de que "evento já aparece automático pela data"
// não cobria festa recorrente/marcada com antecedência. Somado 'hoje' e
// 'patrocinado' (mesma ideia de locais, acima) — migration 026 libera os
// dois valores novos na constraint do banco.
const OPCOES_SECAO_EVENTO: { value: string; label: string }[] = [
  { value: 'evento_destaque', label: 'Topo da aba Eventos' },
  { value: 'destaque', label: 'Destaque (selo no card)' },
  { value: 'hoje', label: 'O que Fazer Hoje' },
  { value: 'patrocinado', label: 'Patrocinado' },
];

// Rodada 38 — pedido direto da Andrea: organizador de evento paga uma
// taxa única (R$69, cobrança manual por Pix/WhatsApp — mesmo fluxo que já
// existe pra plano_comercial de bar, sem gateway de pagamento nenhum) pra
// ter destaque numa festa específica. `eventos.plano_destaque` já existe
// desde a 001 e o app já mostra o selo quando != 'basico'
// ((tabs)/events.tsx linha ~465) — só faltava esse seletor manual aqui,
// igual ao que já existe pra locais acima.
// Rodada 48 — pedido direto da Andrea: "além de expandir também para o
// ticks, poder subir flier" — confirmado que "ticks" são as marcações/
// seções do evento (destaque_secoes), que já existiam aqui só que com um
// fluxo de rascunho + botão "Aplicar", diferente do painel instantâneo
// que locais já tinham desde a Rodada 44. Unificado: agora clicar no
// checkbox já aplica na hora (alternarSecaoInstantaneaEvento), igual
// locais. `foto_capa_url` somado ao tipo pra dar a opção de subir o
// flier/arte do evento direto do admin — a coluna e o bucket
// (fotos-eventos) já existiam desde a Rodada 9/20 pro parceiro fazer
// isso no próprio portal; a RLS de storage já libera is_admin() nesse
// bucket também (fotos_eventos_insert_dono/update_dono, migration 009),
// então não precisou de migration nova, só esta UI.
type EventoDestaque = {
  id: string;
  titulo: string;
  tipo: string;
  data_inicio: string;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  destaque_secoes: string[];
  destaque_ate: string | null;
  foto_capa_url: string | null;
};

// Rodada 39 — mesma ideia do bloco "Locais aprovados — enviar/reenviar
// acesso" (Rodada 22) só que pra organizador de evento independente
// (criado_por preenchido, sem conta emprestada de local com dono).
type EventoComOrganizador = {
  id: string;
  titulo: string;
  contato_nome: string | null;
  contato_whatsapp: string | null;
};

type VinculoPendente = {
  id: string;
  local_id: string;
  user_id: string;
  documento_informado: string;
  criado_em: string;
  locais: { nome: string; contato_telefone: string | null; contato_email: string | null } | null;
};

type LeadInstitucional = {
  id: string;
  origem: string;
  nome_organizacao: string;
  nome_contato: string | null;
  email: string | null;
  whatsapp: string | null;
  mensagem: string | null;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  // Rodada 44 — nova navegação em abas pedida pela Andrea: Aba 1
  // "Aprovações" (fluxo de aprovação, tudo que já existia) e uma tela
  // dedicada a buscar/filtrar estabelecimentos e atribuir
  // selos/destaques.
  //
  // Rodada 45: essa segunda aba ganhou sub-abas Locais/Eventos, porque a
  // Andrea achou confuso tudo junto.
  //
  // Rodada 46: a Andrea ainda achou confuso — "Eventos" sobe de sub-aba
  // pra aba própria, no mesmo nível de "Locais". `subAbaCategorias` saiu
  // de existir; `aba` agora cobre os três níveis direto.
  const [aba, setAba] = useState<'aprovacoes' | 'locais' | 'eventos'>('aprovacoes');
  const [filtroPrincipal, setFiltroPrincipal] = useState<string>('todas');
  // Rodada 46 — filtro só da aba Eventos: "O que Fazer Hoje" (destaque_secoes
  // contém 'hoje', mesmo mecanismo que locais já tinham) vs todos.
  const [filtroEventos, setFiltroEventos] = useState<'todos' | 'hoje'>('todos');
  const [buscaLocal, setBuscaLocal] = useState('');
  const [buscaEvento, setBuscaEvento] = useState('');
  const [experienciaAberta, setExperienciaAberta] = useState<Record<string, boolean>>({});
  // Rodada 48 — pedido direto da Andrea: "poder expandir os bares pros
  // dados (menos confuso quando tivermos vários)" — antes, o card de
  // cada estabelecimento/evento mostrava TUDO sempre aberto (checkboxes,
  // Escolha pela Experiência, upload de foto/conteúdo) — com poucos
  // locais era só uma rolagem grande, mas com muitos vira uma parede de
  // formulário. Fechado por padrão (a linha "Aparece em: ..." continua
  // sempre visível, então dá pra confirmar o essencial sem abrir nada);
  // um clique mostra os controles de edição completos.
  const [localExpandido, setLocalExpandido] = useState<Record<string, boolean>>({});
  const [eventoExpandido, setEventoExpandido] = useState<Record<string, boolean>>({});
  // Rodada 48 — upload de flier/arte do evento direto do admin, mesmo
  // espírito de enviandoFoto (locais) abaixo, só que pra eventos.
  const [enviandoFlierId, setEnviandoFlierId] = useState<string | null>(null);

  const [locaisPendentes, setLocaisPendentes] = useState<LocalPendente[]>([]);
  const [eventosPendentes, setEventosPendentes] = useState<EventoPendente[]>([]);
  const [aprovadosSemConta, setAprovadosSemConta] = useState<AprovadoSemConta[]>([]);
  const [locaisDestaque, setLocaisDestaque] = useState<LocalDestaque[]>([]);
  const [eventosDestaque, setEventosDestaque] = useState<EventoDestaque[]>([]);
  const [eventosComOrganizador, setEventosComOrganizador] = useState<EventoComOrganizador[]>([]);
  const [vinculosPendentes, setVinculosPendentes] = useState<VinculoPendente[]>([]);
  const [leads, setLeads] = useState<LeadInstitucional[]>([]);
  const [interessesPlano, setInteressesPlano] = useState<InteresseNoPlano[]>([]);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  // Rodada 22 (correção): window.open() depois de um await é bloqueado
  // silenciosamente por pop-up blocker em vários navegadores — a Andrea
  // confirmou que a aprovação funcionava mas o WhatsApp nunca abria. Em
  // vez de depender de abrir sozinho, mostra um cartão fixo na tela com
  // o link (ela clica) e o telefone/senha em texto (pra copiar também).
  const [contaCriada, setContaCriada] = useState<{ nomeLocal: string; telefone: string; senha: string; link: string } | null>(null);
  // Rodada 26 — aviso simples pro organizador quando aprovar o evento NÃO
  // cria login (porque o dono do local já gerencia esse evento, ou o
  // organizador já tinha conta) — só avisa que já pode ver o evento no app.
  const [eventoAprovado, setEventoAprovado] = useState<{ titulo: string; telefone: string; link: string } | null>(null);
  // Rodada 36 — mesmo espírito do card de contaCriada (locais) acima, mas
  // pra organizador de evento independente sem conta ainda — aprovar já
  // cria o login (senha por WhatsApp) via /api/aprovar-evento.
  const [eventoContaCriada, setEventoContaCriada] = useState<{ titulo: string; telefone: string; senha: string; contaNova: boolean; link: string } | null>(null);
  // Rodada 41 — rascunho local do "fixar destaque" (seção + prazo) antes
  // de aplicar — os campos precisam ser gravados juntos numa única
  // chamada, por isso não salva a cada clique/tecla.
  //
  // Rodada 43 — trocado de uma seção só (`secao: string`) pra várias ao
  // mesmo tempo (`secoes: string[]`), acompanhando destaque_secoes.
  const [rascunhoFixacao, setRascunhoFixacao] = useState<Record<string, { secoes: string[]; ate: string }>>({});

  const lerRascunhoFixacao = (id: string, secoesAtuais: string[] | null, ateAtual: string | null) =>
    rascunhoFixacao[id] ?? { secoes: secoesAtuais || [], ate: ateAtual ? ateAtual.slice(0, 10) : '' };

  const alternarSecaoRascunho = (
    id: string,
    valor: string,
    secoesAtuais: string[] | null,
    ateAtual: string | null
  ) => {
    const rascunho = lerRascunhoFixacao(id, secoesAtuais, ateAtual);
    const jaMarcado = rascunho.secoes.includes(valor);
    const novasSecoes = jaMarcado ? rascunho.secoes.filter((s) => s !== valor) : [...rascunho.secoes, valor];
    setRascunhoFixacao((atual) => ({ ...atual, [id]: { ...rascunho, secoes: novasSecoes } }));
  };

  // Rodada 43 — pedido direto da Andrea: editar logo/capa, instagram,
  // descrição, fotos e vídeo de qualquer local direto do /admin ("a
  // gente ter mais controle"). Rascunho local dos campos de texto (só
  // grava quando ela clica "Salvar conteúdo"); upload de foto já sobe
  // e grava na hora (não faz sentido rascunho pra isso).
  const [rascunhoConteudo, setRascunhoConteudo] = useState<
    Record<string, { descricao: string; instagram: string; video_url: string; tags: string }>
  >({});
  const [enviandoFoto, setEnviandoFoto] = useState<string | null>(null);

  const lerRascunhoConteudo = (l: LocalDestaque) =>
    rascunhoConteudo[l.id] ?? {
      descricao: l.descricao || '',
      instagram: l.instagram || '',
      video_url: l.video_url || '',
      tags: (l.tags || []).join(', '),
    };

  const carregarFilas = useCallback(async () => {
    const [
      { data: locaisData },
      { data: eventosData },
      { data: aprovadosSemContaData },
      { data: vinculosData },
      { data: leadsData },
      { data: interessesData },
      { data: locaisDestaqueData },
      { data: badgesFundadorData },
      { data: eventosDestaqueData },
      { data: eventosComOrganizadorData },
    ] = await Promise.all([
        supabase
          .from('locais')
          .select('id, nome, categoria, cidade, bairro, cnpj, contato_nome, contato_telefone, contato_email, created_at')
          .eq('status', 'pendente')
          .order('created_at', { ascending: true }),
        supabase
          .from('eventos')
          .select('id, titulo, tipo, descricao, data_inicio, data_fim, contato_nome, contato_whatsapp, created_at')
          .eq('status', 'pendente')
          .order('created_at', { ascending: true }),
        supabase
          .from('locais')
          .select('id, nome, contato_nome, contato_telefone, contato_email, owner_id')
          .eq('status', 'aprovado')
          .order('created_at', { ascending: true }),
        supabase
          .from('solicitacoes_vinculo_local')
          .select('id, local_id, user_id, documento_informado, criado_em, locais(nome, contato_telefone, contato_email)')
          .eq('status', 'pendente')
          .order('criado_em', { ascending: true }),
        supabase
          .from('leads_institucionais')
          .select('id, origem, nome_organizacao, nome_contato, email, whatsapp, mensagem, status, created_at')
          .eq('status', 'novo')
          .order('created_at', { ascending: true }),
        supabase
          .from('locais')
          .select('id, nome, plano_comercial, plano_comercial_status, contato_nome, contato_telefone, contato_email, plano_comercial_atualizado_em')
          .in('plano_comercial_status', ['interesse', 'aguardando_pagamento'])
          .order('plano_comercial_atualizado_em', { ascending: true }),
        supabase
          .from('locais')
          .select(
            'id, nome, categoria, cidade, bairro, plano_destaque, plano_comercial, plano_comercial_status, destaque_secoes, destaque_ate, experiencias, descricao, instagram, foto_capa_url, galeria_fotos, video_url, tags'
          )
          .eq('status', 'aprovado')
          .order('nome', { ascending: true }),
        // Rodada 37 — selo "Membro Fundador" é um local_badges (não é
        // plano_destaque, ver experience/[tag].tsx no app) — busca junto
        // pra saber quem já tem, e mostrar o toggle certo abaixo.
        supabase
          .from('local_badges')
          .select('local_id, ativo')
          .ilike('rotulo', '%fundador%'),
        // Rodada 38 — eventos aprovados, pra dar destaque manual (mesma
        // lógica do bloco de locais acima) depois de cobrar o R$69.
        //
        // Rodada 46 — antes só buscava eventos FUTUROS: um evento cuja
        // data já passou desaparecia sozinho desta lista, sem nenhuma
        // explicação visível — exatamente o tipo de "por que não sobe"
        // que a Andrea reportou. Agora busca também os últimos 7 dias,
        // pra ela conseguir ver o evento e o aviso de "data já passou"
        // (abaixo) em vez do evento só sumir sem pista nenhuma.
        supabase
          .from('eventos')
          .select('id, titulo, tipo, data_inicio, plano_destaque, destaque_secoes, destaque_ate, foto_capa_url')
          .eq('status', 'aprovado')
          .gte('data_inicio', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('data_inicio', { ascending: true }),
        supabase
          .from('eventos')
          .select('id, titulo, contato_nome, contato_whatsapp')
          .eq('status', 'aprovado')
          .not('criado_por', 'is', null)
          .not('contato_whatsapp', 'is', null)
          .order('titulo', { ascending: true }),
      ]);

    setLocaisPendentes((locaisData as LocalPendente[]) || []);
    setEventosPendentes((eventosData as EventoPendente[]) || []);
    setAprovadosSemConta((aprovadosSemContaData as AprovadoSemConta[]) || []);
    setVinculosPendentes((vinculosData as unknown as VinculoPendente[]) || []);
    setLeads((leadsData as LeadInstitucional[]) || []);
    setInteressesPlano((interessesData as InteresseNoPlano[]) || []);
    const idsComFundadorAtivo = new Set(
      ((badgesFundadorData as { local_id: string; ativo: boolean }[]) || [])
        .filter((b) => b.ativo)
        .map((b) => b.local_id)
    );
    setLocaisDestaque(
      ((locaisDestaqueData as Omit<LocalDestaque, 'fundador'>[]) || []).map((l) => ({
        ...l,
        fundador: idsComFundadorAtivo.has(l.id),
      }))
    );
    setEventosDestaque((eventosDestaqueData as EventoDestaque[]) || []);
    setEventosComOrganizador((eventosComOrganizadorData as EventoComOrganizador[]) || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      const { data: perfil } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (perfil?.role !== 'admin') {
        setCarregando(false);
        setAutorizado(false);
        return;
      }

      setAutorizado(true);
      await carregarFilas();
      setCarregando(false);
    })();
  }, [router, carregarFilas]);

  // Rodada 22: aprovar já cria a conta de login do parceiro (por WhatsApp,
  // sem e-mail) e vincula o local, tudo numa chamada só, via
  // /api/aprovar-local (roda com a service_role key, nunca a chave anon do
  // navegador — precisa disso pra poder criar contas de autenticação). Ver
  // 012_aprovacao_gera_login_automatico.sql.
  const aprovarLocal = async (id: string) => {
    setProcessando(id);
    setErro('');
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao?.session?.access_token;
      const resp = await fetch('/api/aprovar-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ local_id: id }),
      });
      const resultado = await resp.json();
      if (!resp.ok) throw new Error(resultado.error || 'Erro ao aprovar.');

      if (resultado.senha) {
        const mensagem = `Boas notícias! Seu cadastro do "${resultado.nomeLocal}" foi aprovado no Dicas LGBT+ 🏳️‍🌈\n\nJá criamos seu acesso ao Portal de Parceiros (fotos, cupons, lista VIP, plano):\n\nLink: ${URL_PORTAL}/login\nLogin (seu WhatsApp): ${resultado.telefone}\nSenha ${resultado.contaNova ? '' : 'nova '}temporária: ${resultado.senha}\n\nDepois de entrar, você pode trocar a senha em "Minha Página". Qualquer dúvida me chama por aqui!`;
        setContaCriada({
          nomeLocal: resultado.nomeLocal,
          telefone: resultado.telefone,
          senha: resultado.senha,
          link: `https://wa.me/${resultado.telefone}?text=${encodeURIComponent(mensagem)}`,
        });
      }
    } catch (e: any) {
      setErro(e.message || 'Erro ao aprovar.');
    }
    await carregarFilas();
    setProcessando(null);
  };

  const rejeitarLocal = async (l: LocalPendente) => {
    if (!window.confirm(`Rejeitar o cadastro de "${l.nome}"? Ele para de aparecer nesta fila.`)) return;
    setProcessando(l.id);
    setErro('');
    const { error } = await supabase.from('locais').update({ status: 'rejeitado' }).eq('id', l.id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  // Rodada 36 — aprovar evento agora passa por /api/aprovar-evento (roda
  // com a service_role key, igual /api/aprovar-local): quando o
  // organizador é independente (sem local com dono, sem conta ainda) e
  // informou WhatsApp no cadastro, a aprovação já cria o login dele pro
  // portal (mesmo espírito da Rodada 22/23 pra locais). Quando o dono do
  // local já gerencia esse evento, ou o organizador já tinha conta, a
  // rota só troca o status — sem criar nada — e aqui cai no aviso simples
  // de sempre (mesmo texto da Rodada 26).
  const aprovarEvento = async (ev: EventoPendente) => {
    setProcessando(ev.id);
    setErro('');
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao?.session?.access_token;
      const resp = await fetch('/api/aprovar-evento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ evento_id: ev.id }),
      });
      const resultado = await resp.json();
      if (!resp.ok) throw new Error(resultado.error || 'Erro ao aprovar.');

      if (resultado.loginCriado && resultado.senha) {
        const mensagem = `Boas notícias! Seu evento "${resultado.tituloEvento}" foi aprovado no Dicas LGBT+ 🏳️‍🌈 e já está aparecendo no app.

Já criamos seu acesso ao Portal de Parceiros pra você editar data, descrição e fotos da festa quando quiser:

Link: ${URL_PORTAL}/login
Login (seu WhatsApp): ${resultado.telefone}
Senha ${resultado.contaNova ? '' : 'nova '}temporária: ${resultado.senha}

Depois de entrar, você pode trocar a senha. Qualquer dúvida me chama por aqui!`;
        setEventoContaCriada({
          titulo: resultado.tituloEvento,
          telefone: resultado.telefone,
          senha: resultado.senha,
          contaNova: resultado.contaNova,
          link: `https://wa.me/${resultado.telefone}?text=${encodeURIComponent(mensagem)}`,
        });
      } else {
        // Sem login novo — mesmo aviso simples de antes. Prioriza as
        // colunas de verdade (015); só cai pro texto da descrição se o
        // evento foi cadastrado ANTES dessa migration.
        const extraido = !ev.contato_whatsapp && ev.descricao ? extrairContatoDescricao(ev.descricao) : null;
        const nomeContato = ev.contato_nome || extraido?.nome || null;
        const whatsappBruto = ev.contato_whatsapp || extraido?.whatsapp || null;
        if (whatsappBruto) {
          const telefone = normalizarTelefoneBR(whatsappBruto);
          const mensagem = `Boas notícias${nomeContato ? `, ${nomeContato}` : ''}! Seu evento "${ev.titulo}" foi aprovado no Dicas LGBT+ 🏳️‍🌈 e já está aparecendo no app. Qualquer dúvida me chama por aqui!`;
          setEventoAprovado({
            titulo: ev.titulo,
            telefone,
            link: `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`,
          });
        }
      }
    } catch (e: any) {
      setErro(e.message || 'Erro ao aprovar.');
    }
    await carregarFilas();
    setProcessando(null);
  };

  // Rodada 39 — pedido da Andrea: poder gerar e reenviar uma senha nova
  // pro organizador que já tem conta, sem precisar ter guardado a antiga
  // (senha só existe em texto puro uma vez, no momento em que é gerada —
  // depois disso é só hash no banco, não tem como "recuperar"). Mesma
  // ideia do botão "Enviar acesso" que locais já têm (Rodada 22).
  const reenviarAcessoEvento = async (ev: EventoComOrganizador) => {
    setProcessando(ev.id);
    setErro('');
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao?.session?.access_token;
      const resp = await fetch('/api/aprovar-evento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ evento_id: ev.id, reenviar: true }),
      });
      const resultado = await resp.json();
      if (!resp.ok) throw new Error(resultado.error || 'Erro ao reenviar acesso.');

      if (resultado.senha) {
        const mensagem = `Oi${ev.contato_nome ? `, ${ev.contato_nome}` : ''}! Aqui está um novo acesso ao Portal de Parceiros pro seu evento "${resultado.tituloEvento}":

Link: ${URL_PORTAL}/login
Login (seu WhatsApp): ${resultado.telefone}
Senha nova temporária: ${resultado.senha}

Depois de entrar, você pode trocar a senha. Qualquer dúvida me chama por aqui!`;
        setEventoContaCriada({
          titulo: resultado.tituloEvento,
          telefone: resultado.telefone,
          senha: resultado.senha,
          contaNova: false,
          link: `https://wa.me/${resultado.telefone}?text=${encodeURIComponent(mensagem)}`,
        });
      }
    } catch (e: any) {
      setErro(e.message || 'Erro ao reenviar acesso.');
    }
    await carregarFilas();
    setProcessando(null);
  };

  const rejeitarEvento = async (ev: EventoPendente) => {
    if (!window.confirm(`Rejeitar o evento "${ev.titulo}"? Ele para de aparecer nesta fila.`)) return;
    setProcessando(ev.id);
    setErro('');
    const { error } = await supabase.from('eventos').update({ status: 'rejeitado' }).eq('id', ev.id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  const resolverVinculo = async (v: VinculoPendente, status: 'aprovado' | 'rejeitado') => {
    if (status === 'rejeitado' && !window.confirm(`Rejeitar o pedido de vínculo de "${v.locais?.nome || 'esse local'}"?`)) return;
    setProcessando(v.id);
    setErro('');
    const { error } = await supabase.from('solicitacoes_vinculo_local').update({ status }).eq('id', v.id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const marcarLeadEmContato = async (id: string) => {
    setProcessando(id);
    setErro('');
    const { error } = await supabase.from('leads_institucionais').update({ status: 'em_contato' }).eq('id', id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  // Atualizar plano_comercial_status é a única ação de admin que precisa
  // do banco confirmar de verdade que quem está chamando é admin (o
  // trigger protect_plano_comercial_status, na 005, reverte a mudança se
  // não for) — mas como esta tela já é admin-only, o botão só aparece pra
  // quem tem is_admin() = true de qualquer forma.
  const marcarAguardandoPagamento = async (id: string) => {
    setProcessando(id);
    setErro('');
    const { error } = await supabase.from('locais').update({ plano_comercial_status: 'aguardando_pagamento' }).eq('id', id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  const confirmarPagamento = async (id: string) => {
    setProcessando(id);
    setErro('');
    const { error } = await supabase.from('locais').update({ plano_comercial_status: 'ativo' }).eq('id', id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  // Rodada 29 — seletor manual de plano_destaque (básico/destaque/vip). É
  // a mesma coluna que a Home já usa pra ordenar "Em Alta"/"Dicas Trip" e
  // mostrar o badge "Destaque"/"VIP" — só que até aqui só dava pra mudar
  // rodando SQL direto no Supabase. Atualização local otimista (não
  // espera o recarregamento de toda fila) pra o select responder na hora.
  const atualizarDestaque = async (id: string, plano: 'basico' | 'destaque' | 'vip') => {
    setProcessando(id);
    setErro('');
    setLocaisDestaque((atual) => atual.map((l) => (l.id === id ? { ...l, plano_destaque: plano } : l)));
    const { error } = await supabase.from('locais').update({ plano_destaque: plano }).eq('id', id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 38 — mesma ação, mas pra eventos (tabela/coluna diferente).
  const atualizarDestaqueEvento = async (id: string, plano: 'basico' | 'destaque' | 'vip') => {
    setProcessando(id);
    setErro('');
    setEventosDestaque((atual) => atual.map((ev) => (ev.id === id ? { ...ev, plano_destaque: plano } : ev)));
    const { error } = await supabase.from('eventos').update({ plano_destaque: plano }).eq('id', id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 41 — "fixar": sobe pro topo da(s) seção(ões) marcada(s) até
  // uma data (ou pra sempre, se não informar). Rodada 43: agora grava um
  // ARRAY (destaque_secoes) em vez de um valor só — dá pra marcar várias
  // seções ao mesmo tempo no mesmo local/evento. Lista vazia = não
  // direcionar nada (só segue a rotação automática semanal por plano
  // pago). destaque_ate vazio grava null (sem prazo) — não é obrigatório.
  const fixarDestaqueLocal = async (id: string, secoes: string[], ate: string) => {
    setProcessando(id);
    setErro('');
    const patch = {
      destaque_secoes: secoes,
      destaque_ate: secoes.length > 0 && ate ? new Date(ate).toISOString() : null,
    };
    setLocaisDestaque((atual) => atual.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error } = await supabase.from('locais').update(patch).eq('id', id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  const fixarDestaqueEvento = async (id: string, secoes: string[], ate: string) => {
    setProcessando(id);
    setErro('');
    const patch = {
      destaque_secoes: secoes,
      destaque_ate: secoes.length > 0 && ate ? new Date(ate).toISOString() : null,
    };
    setEventosDestaque((atual) => atual.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)));
    const { error } = await supabase.from('eventos').update(patch).eq('id', id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 43 — salva descrição/instagram/video/tags de um local de uma
  // vez (mesmo espírito do "Aplicar fixação": junta tudo numa chamada só,
  // não grava a cada tecla). Tags são digitadas separadas por vírgula.
  const salvarConteudoLocal = async (l: LocalDestaque) => {
    const rascunho = lerRascunhoConteudo(l);
    setProcessando(l.id);
    setErro('');
    const patch = {
      descricao: rascunho.descricao.trim() || null,
      instagram: rascunho.instagram.trim() || null,
      video_url: rascunho.video_url.trim() || null,
      tags: rascunho.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    setLocaisDestaque((atual) => atual.map((item) => (item.id === l.id ? { ...item, ...patch } : item)));
    const { error } = await supabase.from('locais').update(patch).eq('id', l.id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 43 — upload de logo/capa e fotos de galeria direto do
  // /admin, pra qualquer local (não só o dono dele) — a RLS de storage
  // (fotos_locais_insert_dono/update_dono, migration 007) já libera
  // is_admin() pra escrever em qualquer local, então não precisou de
  // migration nova, só esta UI. Mesmo padrão de path já usado no
  // cadastro rápido (FormularioCadastroRapido.tsx): `${id}/capa-...` /
  // `${id}/galeria-...` no bucket público fotos-locais.
  const enviarFotoLocal = async (
    local: LocalDestaque,
    arquivo: File,
    destino: 'capa' | 'galeria'
  ) => {
    // Rodada 49 — a Andrea reportou que subiu uma foto de capa (Bar da
    // Gra) e ela não apareceu no app. Causa mais provável: HEIC/HEIF
    // (padrão do iPhone/Fotos no Mac) — o upload em si funciona (bucket
    // aceita qualquer mime type), mas o <Image> do React Native não sabe
    // decodificar esse formato e falha em silêncio. Ver validarFoto.ts.
    const erroFormato = erroFotoNaoSuportada(arquivo);
    if (erroFormato) {
      setErro(erroFormato);
      return;
    }
    setEnviandoFoto(local.id);
    setErro('');
    try {
      const extensao = arquivo.name.split('.').pop() || 'jpg';
      const caminho = `${local.id}/${destino}-${Date.now()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from('fotos-locais')
        .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
      if (erroUpload) throw erroUpload;
      const { data } = supabase.storage.from('fotos-locais').getPublicUrl(caminho);
      const url = data.publicUrl;

      const patch =
        destino === 'capa'
          ? { foto_capa_url: url }
          : { galeria_fotos: [...(local.galeria_fotos || []), url] };
      setLocaisDestaque((atual) => atual.map((item) => (item.id === local.id ? { ...item, ...patch } : item)));
      const { error: erroUpdate } = await supabase.from('locais').update(patch).eq('id', local.id);
      if (erroUpdate) throw erroUpdate;
    } catch (e: any) {
      setErro(e.message || 'Erro ao enviar foto.');
      await carregarFilas();
    }
    setEnviandoFoto(null);
  };

  // Só remove a referência da galeria (não apaga o arquivo do storage) —
  // consistente com a política de nunca excluir nada de forma
  // destrutiva; um arquivo órfão no bucket não causa problema nenhum.
  const removerFotoGaleria = async (local: LocalDestaque, url: string) => {
    setProcessando(local.id);
    setErro('');
    const patch = { galeria_fotos: (local.galeria_fotos || []).filter((f) => f !== url) };
    setLocaisDestaque((atual) => atual.map((item) => (item.id === local.id ? { ...item, ...patch } : item)));
    const { error } = await supabase.from('locais').update(patch).eq('id', local.id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 37 — toggle do selo "Membro Fundador" (local_badges), separado
  // do plano_destaque acima — é o que faz um local aparecer na seção
  // "Membro Fundador" do app (experience/[tag].tsx). Faz upsert manual
  // porque local_badges não tem unique constraint em (local_id, rotulo).
  const alternarFundador = async (id: string, ativar: boolean) => {
    setProcessando(id);
    setErro('');
    setLocaisDestaque((atual) => atual.map((l) => (l.id === id ? { ...l, fundador: ativar } : l)));

    const { data: existente } = await supabase
      .from('local_badges')
      .select('id')
      .eq('local_id', id)
      .ilike('rotulo', '%fundador%')
      .maybeSingle();

    const { error } = existente
      ? await supabase.from('local_badges').update({ ativo: ativar }).eq('id', existente.id)
      : await supabase
          .from('local_badges')
          .insert({ local_id: id, rotulo: 'Membro Fundador', cor_tag: 'dourado', ativo: ativar });

    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 44 — checkboxes de seleção rápida (Em Alta / O que Fazer Hoje
  // / Dicas Trip) da aba nova "Gestão de Categorias e Destaques": ao
  // contrário do "Aplicar seções" da Rodada 41/43 (rascunho + botão),
  // esses aplicam na hora, mesmo espírito do toggle "Membro Fundador"
  // que já existia (alternarFundador acima) — ela pediu "checkboxes de
  // seleção rápida", não um formulário com botão de salvar.
  const alternarSecaoInstantanea = async (l: LocalDestaque, secao: string, marcar: boolean) => {
    setProcessando(l.id);
    setErro('');
    const novasSecoes = marcar
      ? Array.from(new Set([...l.destaque_secoes, secao]))
      : l.destaque_secoes.filter((s) => s !== secao);
    setLocaisDestaque((atual) => atual.map((item) => (item.id === l.id ? { ...item, destaque_secoes: novasSecoes } : item)));
    const { error } = await supabase.from('locais').update({ destaque_secoes: novasSecoes }).eq('id', l.id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 48 — mesmo espírito de alternarSecaoInstantanea (locais,
  // acima) só que pra eventos: clicar no checkbox já aplica na hora,
  // sem precisar de um botão "Aplicar" separado. `destaque_ate` (prazo)
  // não é afetado aqui — continua só sendo tocado pelo campo de data +
  // botão "Aplicar prazo", que agora usa ev.destaque_secoes (o valor
  // real/atual) em vez de um rascunho separado das seções.
  const alternarSecaoInstantaneaEvento = async (ev: EventoDestaque, secao: string, marcar: boolean) => {
    setProcessando(ev.id);
    setErro('');
    const novasSecoes = marcar
      ? Array.from(new Set([...ev.destaque_secoes, secao]))
      : ev.destaque_secoes.filter((s) => s !== secao);
    setEventosDestaque((atual) => atual.map((item) => (item.id === ev.id ? { ...item, destaque_secoes: novasSecoes } : item)));
    const { error } = await supabase.from('eventos').update({ destaque_secoes: novasSecoes }).eq('id', ev.id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 48 — upload de flier/arte do evento direto do admin, pra
  // qualquer evento (não só o organizador dele) — mesma ideia de
  // enviarFotoLocal abaixo, mas gravando em eventos.foto_capa_url e no
  // bucket fotos-eventos (já existe desde a Rodada 9, RLS já libera
  // is_admin(), sem migration nova). Mesmo limite de 5MB que o portal do
  // parceiro já usa (dashboard/eventos/page.tsx).
  const enviarFlierEvento = async (ev: EventoDestaque, arquivo: File) => {
    // Rodada 49 — mesmo guard de enviarFotoLocal acima (ver validarFoto.ts):
    // bloqueia HEIC/HEIF antes de gastar upload, já que o app não consegue
    // exibir esse formato.
    const erroFormato = erroFotoNaoSuportada(arquivo);
    if (erroFormato) {
      setErro(erroFormato);
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      setErro('A imagem do flier precisa ter até 5MB.');
      return;
    }
    setEnviandoFlierId(ev.id);
    setErro('');
    try {
      const extensao = arquivo.name.split('.').pop() || 'jpg';
      const caminho = `${ev.id}/flier-${Date.now()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from('fotos-eventos')
        .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
      if (erroUpload) throw erroUpload;
      const { data } = supabase.storage.from('fotos-eventos').getPublicUrl(caminho);
      const url = data.publicUrl;
      setEventosDestaque((atual) => atual.map((item) => (item.id === ev.id ? { ...item, foto_capa_url: url } : item)));
      const { error: erroUpdate } = await supabase.from('eventos').update({ foto_capa_url: url }).eq('id', ev.id);
      if (erroUpdate) throw erroUpdate;
    } catch (e: any) {
      setErro(e.message || 'Erro ao enviar o flier.');
      await carregarFilas();
    }
    setEnviandoFlierId(null);
  };

  // Rodada 44 — seletor único "Escolha pela experiência" (até 3). Cada
  // item marcado é despachado pro mecanismo que já é dono daquele
  // conceito (local_badges pra Membro Fundador, destaque_secoes pra
  // Destaque da Semana, locais.experiencias pros outros 11) — a Andrea
  // vê e marca tudo numa lista só, mas por baixo cada coisa continua
  // gravando onde sempre gravou, sem duplicar estado.
  const alternarExperiencia = async (l: LocalDestaque, opcao: OpcaoExperiencia, marcar: boolean) => {
    const selecaoAtual = selecaoAtualExperiencia(l);
    if (marcar && selecaoAtual.length >= 3) {
      setErro('Só é possível marcar até 3 itens em "Escolha pela experiência" por local. Desmarque um antes de marcar outro.');
      return;
    }
    setErro('');

    if (opcao.destino === 'fundador') {
      await alternarFundador(l.id, marcar);
      return;
    }
    if (opcao.destino === 'selo_dicas') {
      await alternarSecaoInstantanea(l, 'selo_dicas', marcar);
      return;
    }

    setProcessando(l.id);
    const novasExperiencias = marcar
      ? [...(l.experiencias || []), opcao.slug]
      : (l.experiencias || []).filter((e) => e !== opcao.slug);
    setLocaisDestaque((atual) => atual.map((item) => (item.id === l.id ? { ...item, experiencias: novasExperiencias } : item)));
    const { error } = await supabase.from('locais').update({ experiencias: novasExperiencias }).eq('id', l.id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="text-[#E1306C] mb-4" size={32} />
        <h1 className="text-xl font-black mb-2">Acesso restrito</h1>
        <p className="text-[#A0A0B2] text-sm">Essa área é só para administradores.</p>
      </div>
    );
  }

  // Rodada 30 — resumo rápido do que precisa de atenção, pra não ter que
  // rolar as 7 seções pra saber o que tem pendente. Cada pill pula
  // direto pra seção correspondente (âncora), sem precisar de estado
  // novo — só soma o que já está carregado.
  const resumoFilas = [
    { id: 'fila-interesse', label: 'interesses em plano pago', total: interessesPlano.length, cor: 'text-[#E1306C]' },
    { id: 'fila-locais', label: 'locais pendentes', total: locaisPendentes.length, cor: 'text-white' },
    { id: 'fila-eventos', label: 'eventos pendentes', total: eventosPendentes.length, cor: 'text-white' },
    { id: 'fila-vinculos', label: 'vínculos pendentes', total: vinculosPendentes.length, cor: 'text-white' },
    { id: 'fila-leads', label: 'leads novos', total: leads.length, cor: 'text-white' },
  ];
  const totalPendente = resumoFilas.reduce((soma, f) => soma + f.total, 0);

  // Rodada 44 — lista filtrada da aba "Gestão de Categorias e
  // Destaques": chip de filtro principal (categoria ou Em Alta/O que
  // Fazer Hoje) + busca por nome/bairro/cidade, combinados.
  const locaisFiltrados = locaisDestaque.filter((l) => {
    if (!localCombinaComFiltroPrincipal(l, filtroPrincipal)) return false;
    const termo = buscaLocal.trim().toLowerCase();
    if (!termo) return true;
    return (
      l.nome.toLowerCase().includes(termo) ||
      (l.bairro || '').toLowerCase().includes(termo) ||
      l.cidade.toLowerCase().includes(termo)
    );
  });

  // Rodada 47 — contagem de quem tem o Selo Dicas LGBT+ marcado. É só um
  // AVISO, nunca um bloqueio: a Andrea pediu explicitamente ter autonomia
  // pra ajustar mesmo com regra de negócio, "caso necessário devido a
  // demanda" — então passar da faixa recomendada nunca impede marcar mais.
  const totalSeloDicas = locaisDestaque.filter((l) => l.destaque_secoes.includes('selo_dicas')).length;

  // Rodada 45 — mesma busca, agora na aba própria Eventos.
  // Rodada 46 — + filtro "O que Fazer Hoje" (destaque_secoes contém 'hoje').
  const eventosFiltrados = eventosDestaque.filter((ev) => {
    if (filtroEventos === 'hoje' && !ev.destaque_secoes.includes('hoje')) return false;
    const termo = buscaEvento.trim().toLowerCase();
    if (!termo) return true;
    return ev.titulo.toLowerCase().includes(termo);
  });

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-2xl font-black">Painel de moderação</h1>
        <button
          onClick={handleLogout}
          className="text-xs text-[#626274] hover:text-white flex items-center gap-1.5 shrink-0 mt-1"
        >
          <LogOut size={13} /> Sair
        </button>
      </div>
      <p className="text-[#A0A0B2] text-xs mb-4">
        {aba === 'aprovacoes'
          ? 'Aprovações manuais — cadastros, vínculos de conta e leads institucionais.'
          : aba === 'locais'
          ? 'Busque e filtre locais por categoria, e marque selos/destaques de cada estabelecimento.'
          : 'Busque e filtre eventos/festas, e marque em quais seções do app cada um aparece.'}
      </p>

      {/* Rodada 44 — pedido direto da Andrea: separar o fluxo de
          aprovação de uma tela dedicada a buscar/filtrar estabelecimentos
          e atribuir selos/destaques, em vez de tudo empilhado numa página
          só. Rodada 46 — "Eventos" ganha aba própria (era sub-aba dentro
          de "Gestão de Categorias e Destaques" desde a 45; a Andrea
          continuou achando confuso tudo dentro da mesma aba). */}
      <div className="flex gap-1 mb-8 border-b border-[#232230]">
        <button
          onClick={() => setAba('aprovacoes')}
          className={`text-sm font-bold px-4 py-2.5 border-b-2 -mb-px transition ${
            aba === 'aprovacoes' ? 'border-[#E1306C] text-white' : 'border-transparent text-[#626274] hover:text-[#A0A0B2]'
          }`}
        >
          Aprovações{totalPendente > 0 ? ` (${totalPendente})` : ''}
        </button>
        <button
          onClick={() => setAba('locais')}
          className={`text-sm font-bold px-4 py-2.5 border-b-2 -mb-px transition ${
            aba === 'locais' ? 'border-[#E1306C] text-white' : 'border-transparent text-[#626274] hover:text-[#A0A0B2]'
          }`}
        >
          Locais ({locaisDestaque.length})
        </button>
        <button
          onClick={() => setAba('eventos')}
          className={`text-sm font-bold px-4 py-2.5 border-b-2 -mb-px transition ${
            aba === 'eventos' ? 'border-[#E1306C] text-white' : 'border-transparent text-[#626274] hover:text-[#A0A0B2]'
          }`}
        >
          Eventos ({eventosDestaque.length})
        </button>
      </div>

      {contaCriada && (
        <div className="bg-[#4CAF7D]/10 border border-[#4CAF7D]/30 text-[#4CAF7D] p-4 rounded-xl text-xs mb-6">
          <p className="font-bold mb-2">
            ✅ "{contaCriada.nomeLocal}" aprovado e conta criada — o navegador pode ter bloqueado a
            abertura automática do WhatsApp, então aqui está tudo pra enviar manualmente:
          </p>
          <p className="text-[#D0D0E0] mb-2">
            Telefone: <b>{contaCriada.telefone}</b> · Senha temporária: <b>{contaCriada.senha}</b>
          </p>
          <div className="flex items-center gap-3">
            <a
              href={contaCriada.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-black font-bold px-3 py-1.5 rounded-lg inline-block"
            >
              Abrir WhatsApp
            </a>
            <button onClick={() => setContaCriada(null)} className="text-[#A0A0B2] hover:text-white">
              Fechar
            </button>
          </div>
        </div>
      )}

      {eventoContaCriada && (
        <div className="bg-[#4CAF7D]/10 border border-[#4CAF7D]/30 text-[#4CAF7D] p-4 rounded-xl text-xs mb-6">
          <p className="font-bold mb-2">
            ✅ "{eventoContaCriada.titulo}" aprovado e conta criada — o navegador pode ter bloqueado a
            abertura automática do WhatsApp, então aqui está tudo pra enviar manualmente:
          </p>
          <p className="text-[#D0D0E0] mb-2">
            Telefone: <b>{eventoContaCriada.telefone}</b> · Senha temporária: <b>{eventoContaCriada.senha}</b>
          </p>
          <div className="flex items-center gap-3">
            <a
              href={eventoContaCriada.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-black font-bold px-3 py-1.5 rounded-lg inline-block"
            >
              Abrir WhatsApp
            </a>
            <button onClick={() => setEventoContaCriada(null)} className="text-[#A0A0B2] hover:text-white">
              Fechar
            </button>
          </div>
        </div>
      )}

      {eventoAprovado && (
        <div className="bg-[#4CAF7D]/10 border border-[#4CAF7D]/30 text-[#4CAF7D] p-4 rounded-xl text-xs mb-6">
          <p className="font-bold mb-2">
            ✅ "{eventoAprovado.titulo}" aprovado — clique pra avisar o organizador por WhatsApp:
          </p>
          <p className="text-[#D0D0E0] mb-2">
            Telefone: <b>{eventoAprovado.telefone}</b>
          </p>
          <div className="flex items-center gap-3">
            <a
              href={eventoAprovado.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-black font-bold px-3 py-1.5 rounded-lg inline-block"
            >
              Abrir WhatsApp
            </a>
            <button onClick={() => setEventoAprovado(null)} className="text-[#A0A0B2] hover:text-white">
              Fechar
            </button>
          </div>
        </div>
      )}

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      {aba === 'aprovacoes' && (
      <>
      <div className="flex flex-wrap gap-2 mb-8">
        {totalPendente === 0 && (
          <span className="text-xs bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 px-3 py-1.5 rounded-full font-bold">
            Tudo em dia — nada pendente agora
          </span>
        )}
        {resumoFilas.map((f) => (
          <a
            key={f.id}
            href={`#${f.id}`}
            className={`text-xs px-3 py-1.5 rounded-full font-bold border ${
              f.total > 0
                ? 'bg-[#161520] border-[#232230] hover:bg-[#1D1C29] ' + f.cor
                : 'bg-transparent border-[#232230]/50 text-[#626274]'
            }`}
          >
            {f.total} {f.label}
          </a>
        ))}
      </div>

      <section className="mb-10" id="fila-interesse">
        <h2 className="text-base font-bold mb-3 text-[#E1306C]">
          💰 Parceiros interessados em plano pago ({interessesPlano.length})
        </h2>
        <p className="text-xs text-[#626274] mb-3">
          Esta é a fila que sustenta o negócio — ninguém vira assinante sem alguém aqui cobrar por
          Pix/WhatsApp e confirmar.
        </p>
        <div className="space-y-3">
          {interessesPlano.length === 0 && <p className="text-xs text-[#626274]">Nenhum interesse pendente agora.</p>}
          {interessesPlano.map((it) => (
            <div key={it.id} className="bg-[#161520] border border-[#E1306C]/30 rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">{it.nome}</h3>
                <p className="text-xs text-[#E1306C] font-bold capitalize">
                  {it.plano_comercial} — {PLANO_PRECO[it.plano_comercial] || ''}
                  {it.plano_comercial_status === 'aguardando_pagamento' ? ' (já em contato)' : ' (novo pedido)'}
                </p>
                <p className="text-xs text-[#626274] mt-1">
                  Contato: {it.contato_nome || '—'} · {it.contato_telefone || '—'} · {it.contato_email || '—'}
                </p>
                <p className={`text-xs mt-1 ${corDias(diasDesde(it.plano_comercial_atualizado_em))}`}>
                  Esperando {textoDias(diasDesde(it.plano_comercial_atualizado_em))}
                  {diasDesde(it.plano_comercial_atualizado_em) >= 7 ? ' — esfriando, chama de novo' : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {it.plano_comercial_status === 'interesse' && (
                  <button
                    onClick={() => marcarAguardandoPagamento(it.id)}
                    disabled={processando === it.id}
                    className="bg-[#232230] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#2D2B3D]"
                  >
                    Já entrei em contato
                  </button>
                )}
                <button
                  onClick={() => confirmarPagamento(it.id)}
                  disabled={processando === it.id}
                  className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#4CAF7D]/20"
                >
                  Pagamento confirmado — ativar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10" id="fila-locais">
        <h2 className="text-base font-bold mb-3">Locais pendentes de aprovação ({locaisPendentes.length})</h2>
        <div className="space-y-3">
          {locaisPendentes.length === 0 && <p className="text-xs text-[#626274]">Nenhum pendente.</p>}
          {locaisPendentes.map((l) => (
            <div key={l.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">{l.nome}</h3>
                <p className="text-xs text-[#A0A0B2] capitalize">
                  {l.categoria} · {l.bairro ? `${l.bairro}, ` : ''}{l.cidade} · CNPJ {l.cnpj || '—'}
                </p>
                <p className="text-xs text-[#626274] mt-1">
                  Contato: {l.contato_nome || '—'} · {l.contato_telefone || '—'} · {l.contato_email || '—'}
                </p>
                <p className={`text-xs mt-1 ${corDias(diasDesde(l.created_at))}`}>
                  Esperando {textoDias(diasDesde(l.created_at))}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => aprovarLocal(l.id)}
                  disabled={processando === l.id}
                  className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 p-2 rounded-lg hover:bg-[#4CAF7D]/20"
                  title="Aprovar (já cria o login do parceiro e manda por WhatsApp)"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => rejeitarLocal(l)}
                  disabled={processando === l.id}
                  className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg hover:bg-red-500/20"
                  title="Rejeitar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10" id="fila-eventos">
        <h2 className="text-base font-bold mb-3">Eventos/festas pendentes de aprovação ({eventosPendentes.length})</h2>
        <div className="space-y-3">
          {eventosPendentes.length === 0 && <p className="text-xs text-[#626274]">Nenhum pendente.</p>}
          {eventosPendentes.map((ev) => (
            <div key={ev.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">
                  {ev.titulo} <span className="text-[#626274] font-normal capitalize">— {ev.tipo}</span>
                </h3>
                <p className="text-xs text-[#A0A0B2] mt-1">
                  {new Date(ev.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  {ev.data_fim ? ` até ${new Date(ev.data_fim).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                </p>
                {ev.descricao && (
                  <p className="text-xs text-[#626274] mt-1 whitespace-pre-line">{ev.descricao}</p>
                )}
                <p className={`text-xs mt-1 ${corDias(diasDesde(ev.created_at))}`}>
                  Esperando {textoDias(diasDesde(ev.created_at))}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => aprovarEvento(ev)}
                  disabled={processando === ev.id}
                  className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 p-2 rounded-lg hover:bg-[#4CAF7D]/20"
                  title="Aprovar"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => rejeitarEvento(ev)}
                  disabled={processando === ev.id}
                  className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg hover:bg-red-500/20"
                  title="Rejeitar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base font-bold mb-3">
          Locais aprovados — enviar/reenviar acesso ao portal ({aprovadosSemConta.length})
        </h2>
        <p className="text-xs text-[#626274] mb-3">
          Já estão no app. Use "Enviar acesso" pra criar a conta de login (se ainda não tiver),
          reparar uma conta antiga que ficou sem jeito de entrar, ou só gerar e mandar uma senha
          temporária nova de novo pelo WhatsApp.
        </p>
        <div className="space-y-3">
          {aprovadosSemConta.length === 0 && <p className="text-xs text-[#626274]">Nenhum aprovado ainda.</p>}
          {aprovadosSemConta.map((l) => (
            <div key={l.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-sm">{l.nome}</h3>
                <p className="text-xs text-[#626274] mt-1">
                  {l.contato_nome || '—'} · {l.contato_telefone || 'sem telefone cadastrado'} · {l.contato_email || '—'}
                  {l.owner_id ? ' · já tem conta' : ' · sem conta ainda'}
                </p>
              </div>
              <button
                onClick={() => aprovarLocal(l.id)}
                disabled={processando === l.id || !l.contato_telefone}
                className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#25D366]/20 flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                title={!l.contato_telefone ? 'Sem WhatsApp cadastrado' : 'Enviar acesso'}
              >
                <MessageCircle size={14} /> Enviar acesso
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base font-bold mb-3">
          Organizadores de evento — reenviar acesso ({eventosComOrganizador.length})
        </h2>
        <p className="text-xs text-[#626274] mb-3">
          Mesma ideia acima, só que pro organizador independente de uma festa (sem local com
          dono). A senha só existe em texto puro uma vez — depois disso é só hash no banco, então
          "reenviar" na verdade gera uma senha nova e manda de novo pelo WhatsApp.
        </p>
        <div className="space-y-3">
          {eventosComOrganizador.length === 0 && (
            <p className="text-xs text-[#626274]">Nenhum organizador com conta própria ainda.</p>
          )}
          {eventosComOrganizador.map((ev) => (
            <div key={ev.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-sm">{ev.titulo}</h3>
                <p className="text-xs text-[#626274] mt-1">
                  {ev.contato_nome || '—'} · {ev.contato_whatsapp || 'sem telefone'}
                </p>
              </div>
              <button
                onClick={() => reenviarAcessoEvento(ev)}
                disabled={processando === ev.id || !ev.contato_whatsapp}
                className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#25D366]/20 flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                title={!ev.contato_whatsapp ? 'Sem WhatsApp cadastrado' : 'Enviar acesso'}
              >
                <MessageCircle size={14} /> Enviar acesso
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10" id="fila-vinculos">
        <h2 className="text-base font-bold mb-3">Pedidos de vínculo de conta ({vinculosPendentes.length})</h2>
        <div className="space-y-3">
          {vinculosPendentes.length === 0 && <p className="text-xs text-[#626274]">Nenhum pendente.</p>}
          {vinculosPendentes.map((v) => (
            <div key={v.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">{v.locais?.nome || '(local não encontrado)'}</h3>
                <p className="text-xs text-[#A0A0B2]">CNPJ informado: {v.documento_informado}</p>
                <p className="text-xs text-[#626274] mt-1">
                  Confira o telefone/e-mail do cadastro original ({v.locais?.contato_telefone || '—'} /{' '}
                  {v.locais?.contato_email || '—'}) antes de aprovar.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => resolverVinculo(v, 'aprovado')}
                  disabled={processando === v.id}
                  className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 p-2 rounded-lg hover:bg-[#4CAF7D]/20"
                  title="Aprovar vínculo"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => resolverVinculo(v, 'rejeitado')}
                  disabled={processando === v.id}
                  className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg hover:bg-red-500/20"
                  title="Rejeitar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="fila-leads">
        <h2 className="text-base font-bold mb-3">Leads institucionais novos ({leads.length})</h2>
        <div className="space-y-3">
          {leads.length === 0 && <p className="text-xs text-[#626274]">Nenhum novo.</p>}
          {leads.map((lead) => (
            <div key={lead.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">{lead.nome_organizacao}</h3>
                <p className="text-xs text-[#A0A0B2] capitalize">{lead.origem.replace(/_/g, ' ')}</p>
                <p className="text-xs text-[#626274] mt-1">
                  {lead.nome_contato || '—'} · {lead.whatsapp || '—'} · {lead.email || '—'}
                </p>
                {lead.mensagem && <p className="text-xs text-[#A0A0B2] mt-1">"{lead.mensagem}"</p>}
              </div>
              <button
                onClick={() => marcarLeadEmContato(lead.id)}
                disabled={processando === lead.id}
                className="bg-[#232230] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#2D2B3D] shrink-0"
              >
                Marcar em contato
              </button>
            </div>
          ))}
        </div>
      </section>
      </>
      )}

      {/* Rodada 46 — pedido direto da Andrea: "Eventos" deixa de ser
          sub-aba dentro de "Gestão de Categorias e Destaques" e passa a
          ser uma aba própria, no mesmo nível de "Locais" — ela relatou
          que a mistura ainda confundia mesmo depois da separação em
          sub-abas da Rodada 45. Cada aba agora é 100% independente. */}
      {aba === 'locais' && (
      <>
      {/* Rodada 44 — filtro principal (categorias + Em Alta + O que Fazer
          Hoje) e busca por nome/bairro/cidade, tudo combinado numa lista
          só de estabelecimentos abaixo. */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Search size={14} className="text-[#626274]" />
          <input
            type="text"
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            placeholder="Buscar por nome, bairro ou cidade..."
            className="flex-1 bg-[#161520] border border-[#232230] rounded-lg text-xs px-3 py-2"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroPrincipal('todas')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
              filtroPrincipal === 'todas'
                ? 'bg-[#E1306C] border-[#E1306C] text-white'
                : 'bg-[#161520] border-[#232230] text-[#A0A0B2] hover:bg-[#1D1C29]'
            }`}
          >
            Todas
          </button>
          {CATEGORIA_CHIPS.map((c) => (
            <button
              key={c.slug}
              onClick={() => setFiltroPrincipal(c.slug)}
              title={!c.categoriaReal ? 'Categoria ainda "Em breve" pro usuário final — filtro aqui é só organizacional' : undefined}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                filtroPrincipal === c.slug
                  ? 'bg-[#E1306C] border-[#E1306C] text-white'
                  : c.categoriaReal
                  ? 'bg-[#161520] border-[#232230] text-[#A0A0B2] hover:bg-[#1D1C29]'
                  : 'bg-transparent border-[#232230]/50 text-[#626274]'
              }`}
            >
              {c.label}
            </button>
          ))}
          <button
            onClick={() => setFiltroPrincipal('em_alta')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
              filtroPrincipal === 'em_alta'
                ? 'bg-[#FFD54F] border-[#FFD54F] text-black'
                : 'bg-[#161520] border-[#232230] text-[#FFD54F] hover:bg-[#1D1C29]'
            }`}
          >
            Em Alta
          </button>
          <button
            onClick={() => setFiltroPrincipal('hoje')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
              filtroPrincipal === 'hoje'
                ? 'bg-[#FFD54F] border-[#FFD54F] text-black'
                : 'bg-[#161520] border-[#232230] text-[#FFD54F] hover:bg-[#1D1C29]'
            }`}
          >
            O que Fazer Hoje
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base font-bold mb-3">
          Estabelecimentos ({locaisFiltrados.length}{locaisFiltrados.length !== locaisDestaque.length ? ` de ${locaisDestaque.length}` : ''})
        </h2>
        <p className="text-xs text-[#626274] mb-3">
          Quem paga plano <b className="text-[#D0D0E0]">Premium</b> ou <b className="text-[#D0D0E0]">Fundador</b> (ativo)
          já entra sozinho em Em Alta/Dicas Trip, sem precisar marcar nada — os checkboxes abaixo são
          pra você direcionar manualmente qualquer outro local, inclusive quem não paga, se o app
          estiver vazio numa seção. O select &quot;Básico/Destaque/VIP&quot; só afeta a ordem de
          desempate dentro da mesma seção (rotaciona sozinho a cada semana) — não decide quem entra.
        </p>
        {totalSeloDicas > 0 && (
          <p className={`text-xs mb-3 ${totalSeloDicas > 8 ? 'text-amber-400' : 'text-[#A0A0B2]'}`}>
            <b className={totalSeloDicas > 8 ? 'text-amber-300' : 'text-[#D0D0E0]'}>Selo Dicas LGBT+</b>:{' '}
            {totalSeloDicas} local{totalSeloDicas !== 1 ? 'is' : ''} marcado{totalSeloDicas !== 1 ? 's' : ''} agora.{' '}
            {totalSeloDicas > 8
              ? 'Passou da faixa recomendada (até 8) pra manter a exclusividade — tudo bem se for por demanda, é só um aviso, não trava nada.'
              : 'Recomendação: até 8 locais, pra manter a exclusividade do selo (a decisão é sempre sua).'}
          </p>
        )}
        <div className="space-y-2">
          {locaisFiltrados.length === 0 && <p className="text-xs text-[#626274]">Nenhum estabelecimento encontrado com esse filtro/busca.</p>}
          {locaisFiltrados.map((l) => {
            const rascunhoConteudoItem = lerRascunhoConteudo(l);
            const selecaoExperiencia = selecaoAtualExperiencia(l);
            const aberto = experienciaAberta[l.id] ?? selecaoExperiencia.length > 0;
            const expandido = localExpandido[l.id] ?? false;
            return (
            <div key={l.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    {l.nome}
                    {l.fundador && (
                      <span title="Membro Fundador" className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FFD54F]">
                        <Star size={11} fill="currentColor" /> Fundador
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[#626274] mt-1">
                    {CATEGORIA_REAL_LABEL_ADMIN[l.categoria] || l.categoria} · {[l.bairro, l.cidade].filter(Boolean).join(', ') || '—'}
                    {l.plano_comercial_status === 'ativo'
                      ? ` · Plano atual: ${l.plano_comercial}${pagaPlanoComDireitoADestaque(l) ? ' (entra automático em Em Alta/Dicas Trip)' : ''}`
                      : ' · sem plano pago ainda'}
                  </p>
                  <p className="text-xs text-[#4CAF7D] mt-1 font-bold">
                    Aparece em: {resumoSecoesLocal(l)} · Experiências: {resumoExperienciasLocal(l)}
                  </p>
                </div>
                <select
                  value={l.plano_destaque}
                  onChange={(e) => atualizarDestaque(l.id, e.target.value as 'basico' | 'destaque' | 'vip')}
                  disabled={processando === l.id}
                  className="bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs font-bold px-3 py-2 disabled:opacity-40 shrink-0"
                  title="Prioridade de ordenação (desempate)"
                >
                  <option value="basico">Básico</option>
                  <option value="destaque">Destaque</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              {/* Rodada 48 — pedido direto da Andrea: expandir/recolher os
                  dados de cada local, pra não virar uma parede de
                  formulário quando tiver muitos estabelecimentos na
                  lista. A linha "Aparece em: ..." acima já dá o essencial
                  sem precisar abrir nada. */}
              <button
                onClick={() => setLocalExpandido((atual) => ({ ...atual, [l.id]: !expandido }))}
                className="flex items-center gap-1.5 text-xs font-bold text-[#A0A0B2] hover:text-white border-t border-[#232230] pt-3 w-full"
              >
                {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {expandido ? 'Ocultar detalhes e edição' : 'Ver detalhes e editar (selos, fotos, descrição...)'}
              </button>

              {expandido && (
              <>
              <div className="flex items-center gap-3 flex-wrap border-t border-[#232230] pt-3">
                {OPCOES_SECAO_LOCAL_RAPIDA.map((o) => (
                  <label key={o.value} className="flex items-center gap-1.5 text-xs text-[#D0D0E0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={l.destaque_secoes.includes(o.value)}
                      disabled={processando === l.id}
                      onChange={(e) => alternarSecaoInstantanea(l, o.value, e.target.checked)}
                      className="accent-[#E1306C]"
                    />
                    {o.label}
                  </label>
                ))}
              </div>

              <div className="border-t border-[#232230] pt-3">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#D0D0E0] cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={aberto}
                    onChange={() => setExperienciaAberta((atual) => ({ ...atual, [l.id]: !aberto }))}
                  />
                  Escolha pela Experiência {selecaoExperiencia.length > 0 ? `(${selecaoExperiencia.length}/3)` : ''}
                  {aberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </label>
                {aberto && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {OPCOES_EXPERIENCIA.map((o) => (
                      <label key={o.slug} className="flex items-center gap-1.5 text-xs text-[#D0D0E0] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selecaoExperiencia.includes(o.slug)}
                          disabled={processando === l.id}
                          onChange={(e) => alternarExperiencia(l, o, e.target.checked)}
                          className="accent-[#7E57C2]"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-[#232230] pt-3 space-y-3">
                <p className="text-xs font-bold text-[#D0D0E0]">Conteúdo do local (o que aparece no app)</p>
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="shrink-0">
                    <p className="text-[10px] text-[#626274] mb-1">Logo / foto de capa</p>
                    {l.foto_capa_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.foto_capa_url} alt={l.nome} className="w-16 h-16 rounded-lg object-cover border border-[#232230]" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#0B0B0E] border border-dashed border-[#232230] flex items-center justify-center text-[9px] text-[#626274] text-center px-1">
                        sem foto
                      </div>
                    )}
                    <label className="block mt-1 text-center text-[10px] font-bold text-[#E1306C] cursor-pointer hover:underline">
                      {enviandoFoto === l.id ? 'Enviando...' : l.foto_capa_url ? 'Trocar' : 'Subir logo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={enviandoFoto === l.id}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) enviarFotoLocal(l, f, 'capa');
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div className="shrink-0">
                    <p className="text-[10px] text-[#626274] mb-1">Galeria de fotos ({l.galeria_fotos.length})</p>
                    <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                      {l.galeria_fotos.map((url) => (
                        <div key={url} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="w-12 h-12 rounded-md object-cover border border-[#232230]" />
                          <button
                            onClick={() => removerFotoGaleria(l, url)}
                            title="Remover da galeria"
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <label className="w-12 h-12 rounded-md border border-dashed border-[#232230] flex items-center justify-center text-[#E1306C] text-lg cursor-pointer">
                        {enviandoFoto === l.id ? '…' : '+'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={enviandoFoto === l.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) enviarFotoLocal(l, f, 'galeria');
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex-1 min-w-[220px] space-y-2">
                    <input
                      type="text"
                      value={rascunhoConteudoItem.instagram}
                      onChange={(e) => setRascunhoConteudo((atual) => ({ ...atual, [l.id]: { ...rascunhoConteudoItem, instagram: e.target.value } }))}
                      placeholder="@instagram (sem o @, opcional)"
                      className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2"
                    />
                    <input
                      type="text"
                      value={rascunhoConteudoItem.video_url}
                      onChange={(e) => setRascunhoConteudo((atual) => ({ ...atual, [l.id]: { ...rascunhoConteudoItem, video_url: e.target.value } }))}
                      placeholder="Link de vídeo (opcional)"
                      className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2"
                    />
                    <input
                      type="text"
                      value={rascunhoConteudoItem.tags}
                      onChange={(e) => setRascunhoConteudo((atual) => ({ ...atual, [l.id]: { ...rascunhoConteudoItem, tags: e.target.value } }))}
                      placeholder="Tags separadas por vírgula"
                      className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2"
                    />
                  </div>
                </div>
                <textarea
                  value={rascunhoConteudoItem.descricao}
                  onChange={(e) => setRascunhoConteudo((atual) => ({ ...atual, [l.id]: { ...rascunhoConteudoItem, descricao: e.target.value } }))}
                  placeholder="Descrição do local (aparece na página dele no app)"
                  rows={2}
                  className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2"
                />
                <button
                  onClick={() => salvarConteudoLocal(l)}
                  disabled={processando === l.id}
                  className="bg-[#232230] hover:bg-[#2C2A3A] text-[#D0D0E0] font-bold text-xs px-3 py-2 rounded-lg transition disabled:opacity-40"
                >
                  Salvar conteúdo
                </button>
              </div>
              </>
              )}
            </div>
            );
          })}
        </div>
      </section>
      </>
      )}

      {aba === 'eventos' && (
      <>
      {/* Rodada 46 — pedido direto da Andrea: filtro "O que Fazer Hoje"
          vs "Todos os Eventos" dentro da aba própria de Eventos, mesma
          ideia que Locais já tinha (filtroPrincipal). */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Search size={14} className="text-[#626274]" />
          <input
            type="text"
            value={buscaEvento}
            onChange={(e) => setBuscaEvento(e.target.value)}
            placeholder="Buscar evento por nome..."
            className="flex-1 bg-[#161520] border border-[#232230] rounded-lg text-xs px-3 py-2"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroEventos('todos')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
              filtroEventos === 'todos'
                ? 'bg-[#E1306C] border-[#E1306C] text-white'
                : 'bg-[#161520] border-[#232230] text-[#A0A0B2] hover:bg-[#1D1C29]'
            }`}
          >
            Todos os Eventos
          </button>
          <button
            onClick={() => setFiltroEventos('hoje')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
              filtroEventos === 'hoje'
                ? 'bg-[#FFD54F] border-[#FFD54F] text-black'
                : 'bg-[#161520] border-[#232230] text-[#FFD54F] hover:bg-[#1D1C29]'
            }`}
          >
            O que Fazer Hoje
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base font-bold mb-3">
          ⭐ Destaque manual dos eventos ({eventosFiltrados.length}{eventosFiltrados.length !== eventosDestaque.length ? ` de ${eventosDestaque.length}` : ''})
        </h2>
        <p className="text-xs text-[#626274] mb-3">
          Taxa única de R$69 por evento (cobrança manual por Pix/WhatsApp, igual ao fluxo de
          plano pago dos bares) — depois de confirmar o pagamento, marca aqui como
          &quot;Destaque&quot; ou &quot;VIP&quot;. Lista eventos já aprovados dos últimos 7 dias
          pra frente (evento passado ainda aparece aqui por um tempo, com aviso, pra você
          entender por que ele saiu do app). &quot;Topo da aba Eventos&quot; só muda a ORDEM
          dentro do mesmo filtro de data que o usuário já escolher no app (Hoje/Amanhã/Fim de
          semana...) — não faz o evento aparecer fora da data real dele. &quot;O que Fazer
          Hoje&quot; fixa o evento manualmente nessa seção da tela inicial, independente da
          data (útil pra festa recorrente ou pra promover uma festa antes do dia).
        </p>
        <div className="space-y-2">
          {eventosFiltrados.length === 0 && (
            <p className="text-xs text-[#626274]">Nenhum evento aprovado encontrado com esse filtro/busca.</p>
          )}
          {eventosFiltrados.map((ev) => {
            // Rodada 48 — só o prazo ("até quando") ainda usa rascunho;
            // as seções (checkboxes) abaixo agora aplicam na hora, ver
            // alternarSecaoInstantaneaEvento.
            const rascunho = lerRascunhoFixacao(ev.id, ev.destaque_secoes, ev.destaque_ate);
            const expandidoEv = eventoExpandido[ev.id] ?? false;
            return (
            <div key={ev.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  {/* Rodada 48 — miniatura do flier, sempre visível (não
                      só quando expandido) pra Andrea reconhecer a festa
                      de longe numa lista com várias. */}
                  {ev.foto_capa_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.foto_capa_url} alt={ev.titulo} className="w-12 h-12 rounded-lg object-cover border border-[#232230] shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#0B0B0E] border border-dashed border-[#232230] flex items-center justify-center text-[8px] text-[#626274] text-center px-1 shrink-0">
                      sem flier
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm">{ev.titulo}</h3>
                    <p className="text-xs text-[#626274] mt-1">
                      {ev.tipo} · {new Date(ev.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <p className="text-xs text-[#4CAF7D] mt-1 font-bold">
                      {ev.plano_destaque !== 'basico' || ev.destaque_secoes.includes('destaque')
                        ? '✓ Selo "Evento em destaque" aparece no card'
                        : 'Sem selo de destaque no card ainda'}
                      {ev.destaque_secoes.includes('evento_destaque') ? ' · fixado no topo da aba Eventos' : ''}
                      {ev.destaque_secoes.includes('hoje') ? ' · aparece em O Que Fazer Hoje' : ''}
                      {ev.destaque_secoes.includes('patrocinado') ? ' · Patrocinado' : ''}
                    </p>
                    {new Date(ev.data_inicio).getTime() < Date.now() && (
                      <p className="text-xs text-[#E1306C] mt-1 font-bold">
                        ⚠ Data já passou — some do app mesmo aprovado e destacado. Se é uma festa
                        recorrente, atualize a data pra próxima edição pra ele voltar a aparecer.
                      </p>
                    )}
                  </div>
                </div>
                <select
                  value={ev.plano_destaque}
                  onChange={(e) => atualizarDestaqueEvento(ev.id, e.target.value as 'basico' | 'destaque' | 'vip')}
                  disabled={processando === ev.id}
                  className="bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs font-bold px-3 py-2 shrink-0 disabled:opacity-40"
                >
                  <option value="basico">Básico</option>
                  <option value="destaque">Destaque (R$69)</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              {/* Rodada 48 — mesmo padrão de expandir/recolher que os
                  locais ganharam acima, pra aba Eventos não virar parede
                  de formulário também. */}
              <button
                onClick={() => setEventoExpandido((atual) => ({ ...atual, [ev.id]: !expandidoEv }))}
                className="flex items-center gap-1.5 text-xs font-bold text-[#A0A0B2] hover:text-white border-t border-[#232230] pt-3 w-full"
              >
                {expandidoEv ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {expandidoEv ? 'Ocultar detalhes e edição' : 'Ver detalhes e editar (seções, prazo, flier...)'}
              </button>

              {expandidoEv && (
              <div className="flex items-center gap-3 flex-wrap">
                {OPCOES_SECAO_EVENTO.map((o) => (
                  <label key={o.value} className="flex items-center gap-1.5 text-xs text-[#D0D0E0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ev.destaque_secoes.includes(o.value)}
                      disabled={processando === ev.id}
                      onChange={(e) => alternarSecaoInstantaneaEvento(ev, o.value, e.target.checked)}
                      className="accent-[#E1306C]"
                    />
                    {o.label}
                  </label>
                ))}
                <input
                  type="date"
                  value={rascunho.ate}
                  onChange={(e) => setRascunhoFixacao((atual) => ({ ...atual, [ev.id]: { ...rascunho, ate: e.target.value } }))}
                  className="bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2"
                  style={{ colorScheme: 'dark' }}
                  title="Até quando (opcional — vazio = sem prazo)"
                />
                <button
                  onClick={() => fixarDestaqueEvento(ev.id, ev.destaque_secoes, rascunho.ate)}
                  disabled={processando === ev.id}
                  className="bg-[#232230] hover:bg-[#2C2A3A] text-[#D0D0E0] font-bold text-xs px-3 py-2 rounded-lg transition disabled:opacity-40"
                  title="As seções acima já aplicam na hora — esse botão só grava o prazo"
                >
                  Aplicar prazo
                </button>
                {ev.destaque_secoes.length > 0 && (
                  <span className="text-xs text-[#4CAF7D]">
                    ✓ {ev.destaque_secoes.join(', ')}
                    {ev.destaque_ate ? ` até ${new Date(ev.destaque_ate).toLocaleDateString('pt-BR')}` : ''}
                  </span>
                )}

                <div className="w-full border-t border-[#232230] pt-3 flex items-center gap-3">
                  {ev.foto_capa_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.foto_capa_url} alt={ev.titulo} className="w-16 h-16 rounded-lg object-cover border border-[#232230]" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-[#0B0B0E] border border-dashed border-[#232230] flex items-center justify-center text-[9px] text-[#626274] text-center px-1">
                      sem flier
                    </div>
                  )}
                  <label className="text-xs font-bold text-[#E1306C] cursor-pointer hover:underline">
                    {enviandoFlierId === ev.id ? 'Enviando...' : ev.foto_capa_url ? 'Trocar flier' : 'Subir flier'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={enviandoFlierId === ev.id}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) enviarFlierEvento(ev, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
              )}
            </div>
            );
          })}
        </div>
      </section>
      </>
      )}
    </div>
  );
}
