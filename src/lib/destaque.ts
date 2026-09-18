// Rodada 41 — pedido direto da Andrea: uma lógica pra decidir quem
// aparece em destaque em cada seção do app (Em Alta, Dicas Trip,
// categorias, aba Eventos), rodando semanalmente, sem exigir que ela
// ajuste isso toda semana — e com a opção de fixar manualmente alguém
// quando quiser (a opção "híbrida" que ela escolheu por pergunta de
// múltipla escolha).
//
// Rodada 43 — Andrea reportou que "todo cadastro entra em Alta": a Home
// buscava e ordenava, mas nunca FILTRAVA quem entra nas seções
// curadas (Em Alta / Dicas Trip). Corrigido aqui com um modelo híbrido:
//  - quem paga de verdade (plano_comercial premium/fundador, ativo)
//    entra automaticamente nessas seções, sem a Andrea precisar tocar
//    em nada;
//  - a Andrea pode incluir manualmente qualquer local/evento em
//    qualquer seção via destaque_secoes (multi-select, /admin),
//    inclusive quem não paga, "caso o app esteja vazio";
//  - 'destaque' dentro de destaque_secoes é um selo visual (brilho no
//    card) independente das seções — outra forma de override manual,
//    além de quem já ganha o brilho automaticamente por pagar.
//
// Três peças, que combinam nesta ordem de prioridade pra ORDENAR (a
// inclusão em si é decidida por deveIncluirEm, abaixo, antes de chegar
// aqui):
//  1) FIXAÇÃO MANUAL (destaque_secoes contém a seção, dentro do prazo
//     de destaque_ate se houver) — sempre vai pro topo.
//  2) PLANO PAGO (plano_destaque: vip > destaque > basico — campo
//     legado, ainda usado só pra desempate de ordenação) — quem paga
//     mais continua tendo prioridade sobre quem paga menos/não paga.
//  3) ROTAÇÃO AUTOMÁTICA SEMANAL — entre itens do MESMO plano (ex.: dois
//     locais "destaque" disputando o topo de Em Alta), o desempate muda
//     sozinho a cada semana ISO, pra não ser sempre o mesmo no topo. Não
//     precisa de nenhuma linha gravada nem de cron — é só uma função
//     determinística de (id + semana atual), igual ao que a migration
//     023 já faz do lado do banco (`public.peso_rotacao_destaque`) pras
//     queries que preferirem ordenar direto no SQL.
//
// Este arquivo é a versão client-side (usada onde o app já busca a
// lista inteira e ordena em JS, como hoje) — mesma regra, sem precisar
// duplicar em cada tela.

export const PLANO_PRIORIDADE: Record<string, number> = { vip: 0, destaque: 1, basico: 2 };

// Seções onde a inclusão é curada (precisa pagar OU ser incluído
// manualmente) — diferente das páginas de categoria, que mostram todo
// approved (diretório completo) e só usam destaque_secoes pra ordenar.
const SECOES_CURADAS = new Set(['em_alta', 'dicas_trip']);

const PLANOS_QUE_PAGAM = new Set(['premium', 'fundador']);

export interface ItemComDestaque {
  id: string;
  plano_destaque: string;
  /** @deprecated Rodada 41, substituído por destaque_secoes (Rodada 43) — mantido no banco só como histórico. */
  destaque_secao_fixada?: string | null;
  destaque_secoes?: string[] | null;
  destaque_ate?: string | null;
  plano_comercial?: string | null;
  plano_comercial_status?: string | null;
  experiencias?: string[] | null;
}

// Rodada 44 — lista canônica das "experiências reais" (Aniversário,
// Karaokê etc.) que a Andrea marca em até 3 por local no /admin
// (locais.experiencias, migration 025) e que os chips "Escolha pela
// experiência" da Home agora filtram de verdade (antes eram decorativos
// — só mostravam um título, sem filtrar nada). Membro Fundador e
// Destaque da Semana aparecem no MESMO seletor do admin (pedido dela),
// mas continuam gravando em local_badges/destaque_secoes — nunca entram
// nesta lista nem em locais.experiencias. Cupons Exclusivos e Eventos
// entram como tags manuais/descritivas (sem checagem contra dados reais
// de cupons/agenda — é a Andrea quem garante que fazem sentido pro
// local antes de marcar).
export const EXPERIENCIAS_REAIS: { slug: string; label: string }[] = [
  { slug: 'aniversario', label: 'Aniversário' },
  { slug: 'predominancia_lesbica', label: 'Predominância lésbica' },
  { slug: 'predominancia_gay', label: 'Predominância Gay' },
  { slug: 'dates', label: 'Dates' },
  { slug: 'musica_ao_vivo', label: 'Música ao vivo' },
  { slug: 'dancar', label: 'Dançar' },
  { slug: 'karaoke', label: 'Karaokê' },
  { slug: 'drag_show', label: 'Drag show' },
  { slug: 'aula_de_danca', label: 'Aula de dança' },
];

export function temExperiencia(item: ItemComDestaque, slug: string): boolean {
  return !!item.experiencias?.includes(slug);
}

// Quem paga um plano real (premium/fundador, ativo) — usado tanto pra
// inclusão automática em Em Alta/Dicas Trip quanto pro brilho no card.
export function pagaPlanoComDireitoADestaque(item: ItemComDestaque): boolean {
  return (
    !!item.plano_comercial &&
    PLANOS_QUE_PAGAM.has(item.plano_comercial) &&
    (item.plano_comercial_status ?? 'ativo') === 'ativo'
  );
}

function secoesDoItem(item: ItemComDestaque): string[] {
  if (item.destaque_secoes && item.destaque_secoes.length > 0) return item.destaque_secoes;
  // Compat: item ainda não passou pela migration/backfill ou foi lido
  // de uma query antiga que só trouxe o campo legado.
  return item.destaque_secao_fixada ? [item.destaque_secao_fixada] : [];
}

function dentroDoPrazo(item: ItemComDestaque): boolean {
  if (!item.destaque_ate) return true;
  return new Date(item.destaque_ate).getTime() >= Date.now();
}

// Decide se o item deve APARECER numa seção curada (Em Alta / Dicas
// Trip). Nas demais seções (categorias) não filtra — todo approved
// aparece, e destaque_secoes só pinça a ordem via compararDestaque.
export function deveIncluirEm(item: ItemComDestaque, secao: string): boolean {
  if (!SECOES_CURADAS.has(secao)) return true;
  const incluidoManualmente = secoesDoItem(item).includes(secao) && dentroDoPrazo(item);
  return pagaPlanoComDireitoADestaque(item) || incluidoManualmente;
}

// Selo visual de destaque (brilho + logo/foto no card) — automático pra
// quem paga premium/fundador, ou manual via destaque_secoes: ['destaque'].
export function deveExibirGlow(item: ItemComDestaque): boolean {
  return pagaPlanoComDireitoADestaque(item) || (secoesDoItem(item).includes('destaque') && dentroDoPrazo(item));
}

// Rodada 44 — pedido direto da Andrea: fixar um LOCAL manualmente em "O
// que Fazer Hoje" (antes só entravam eventos com data de hoje,
// automático pela agenda — sem jeito de colocar um bar ali sem cadastrar
// um evento formal). Reaproveita destaque_secoes com o valor novo 'hoje'
// em vez de criar coluna nova.
export function estaFixadoParaHoje(item: ItemComDestaque): boolean {
  return secoesDoItem(item).includes('hoje') && dentroDoPrazo(item);
}

function semanaIsoAtual(): string {
  const agora = new Date();
  // Mesmo cálculo de semana ISO que to_char(now(), 'IYYY-IW') no Postgres:
  // ajusta pra quinta-feira da semana atual (ISO 8601), pra semana virar
  // exatamente no mesmo instante em qualquer lugar (não depende de fuso
  // do dispositivo além do que Date já resolve).
  const d = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
  const diaSemanaIso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - diaSemanaIso);
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((d.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(semana).padStart(2, '0')}`;
}

// Hash simples (FNV-1a, 32 bits) só pra distribuir de forma pseudo-
// aleatória e estável — não precisa ser criptográfico, só precisa mudar
// de forma consistente quando a semana muda e ser igual pra todo mundo
// consultando ao mesmo tempo.
function fnv1a(texto: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function pesoRotacaoSemanal(id: string): number {
  return fnv1a(`${id}|${semanaIsoAtual()}`);
}

// Exportada separada do comparador — útil quando a lista já tem uma
// ordem própria que não deve ser totalmente substituída (ex.: a agenda
// de eventos, que é cronológica por natureza) e só a fixação manual deve
// furar a fila, sem entrar rotação/prioridade de plano no meio.
export function estaFixadoEm(item: ItemComDestaque, secao: string): boolean {
  return fixacaoValidaPara(item, secao);
}

function fixacaoValidaPara(item: ItemComDestaque, secao: string): boolean {
  if (!secoesDoItem(item).includes(secao)) return false;
  return dentroDoPrazo(item);
}

// Comparador pra usar em `.sort()`. `secao` é o identificador da seção
// sendo montada agora ('em_alta', 'dicas_trip', 'bares', 'evento_destaque'
// etc. — mesmos valores gravados em destaque_secao_fixada pelo /admin) —
// só entidades fixadas NESSA seção específica furam a fila.
export function compararDestaque<T extends ItemComDestaque>(secao: string) {
  return (a: T, b: T): number => {
    const aFixado = fixacaoValidaPara(a, secao);
    const bFixado = fixacaoValidaPara(b, secao);
    if (aFixado !== bFixado) return aFixado ? -1 : 1;

    const prioridadeA = PLANO_PRIORIDADE[a.plano_destaque] ?? 2;
    const prioridadeB = PLANO_PRIORIDADE[b.plano_destaque] ?? 2;
    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;

    return pesoRotacaoSemanal(a.id) - pesoRotacaoSemanal(b.id);
  };
}
