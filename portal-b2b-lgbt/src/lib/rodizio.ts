// Rodízio de destaques por horário (Home: carrossel do topo e "Em Alta").
// Lógica PURA e determinística: a mesma conta no app e no painel /admin
// (este arquivo existe com o mesmo conteúdo nos dois projetos), sem cron e
// sem gravar nada por hora — o grupo que aparece é função de (hora atual,
// semana, lista de locais).
//
// Regra: a cada "slot" (padrão 60 min, no horário de Brasília) aparecem
// `tamanho` locais (padrão 6).
//  - Prioritários (planos pagos ativos + fixados manualmente na seção):
//    se houver `tamanho` ou mais, só eles rodam; se houver menos, todos
//    aparecem em todos os slots e o resto das vagas é completado,
//    em rodízio, com os demais locais aprovados.
//  - A ordem do ciclo é embaralhada por semana (estável durante a semana),
//    então cada local do mesmo grupo aparece o mesmo número de vezes.
//    Com 72 locais no rodízio, cada um aparece 2x por dia (24 slots × 6 ÷ 72).

export const RODIZIO_TAMANHO_PADRAO = 6;
export const RODIZIO_INTERVALO_PADRAO_MIN = 60;
const BRASILIA_MS = 3 * 3600 * 1000; // UTC-3 (sem horário de verão)

function fnv1a(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Número do slot que contém o instante `agora` (muda a cada `intervaloMin` minutos, hora de Brasília). */
export function slotAtual(agora: number = Date.now(), intervaloMin: number = RODIZIO_INTERVALO_PADRAO_MIN): number {
  return Math.floor((agora - BRASILIA_MS) / (Math.max(1, intervaloMin) * 60000));
}

/** Instante em que o slot começa. */
export function inicioDoSlot(slot: number, intervaloMin: number = RODIZIO_INTERVALO_PADRAO_MIN): Date {
  return new Date(slot * Math.max(1, intervaloMin) * 60000 + BRASILIA_MS);
}

/** Chave da semana ISO (hora de Brasília) — a ordem do ciclo muda só quando a semana muda. */
export function chaveSemana(agora: number = Date.now()): string {
  const d = new Date(agora - BRASILIA_MS);
  const dia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const iso = dia.getUTCDay() === 0 ? 7 : dia.getUTCDay();
  dia.setUTCDate(dia.getUTCDate() + 4 - iso);
  const inicioAno = new Date(Date.UTC(dia.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((dia.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7);
  return `${dia.getUTCFullYear()}-${String(semana).padStart(2, '0')}`;
}

/** `tamanho` itens do ciclo para o slot dado (se há `tamanho` ou menos, devolve todos). */
export function janelaRodizio<T extends { id: string }>(pool: T[], slot: number, tamanho: number, semana: string): T[] {
  const n = pool.length;
  if (n <= tamanho) return pool.slice();
  const ciclo = [...pool].sort((a, b) => fnv1a(`${a.id}|${semana}`) - fnv1a(`${b.id}|${semana}`) || (a.id < b.id ? -1 : 1));
  const ini = (slot * tamanho) % n;
  const saida: T[] = [];
  for (let i = 0; i < tamanho; i++) saida.push(ciclo[(ini + i) % n]);
  return saida;
}

/** Prioritários primeiro; completa as vagas que sobrarem com os demais, em rodízio. */
export function rodizioComPrioridade<T extends { id: string }>(
  prioritarios: T[],
  demais: T[],
  slot: number,
  tamanho: number,
  semana: string
): T[] {
  if (prioritarios.length >= tamanho) return janelaRodizio(prioritarios, slot, tamanho, semana);
  const vagas = tamanho - prioritarios.length;
  return [...prioritarios, ...janelaRodizio(demais, slot, vagas, semana)];
}

/** Quantas vezes por dia cada local do grupo aparece (média), para o painel. */
export function aparicoesPorDia(tamLista: number, tamanho: number, intervaloMin: number): number {
  if (tamLista <= 0) return 0;
  const slotsPorDia = (24 * 60) / Math.max(1, intervaloMin);
  return tamLista <= tamanho ? slotsPorDia : (slotsPorDia * tamanho) / tamLista;
}

// ---------------------------------------------------------------------------
// Rodada 77 — bloco FIXO de Membros Fundadores (topo da Home).
// Fundador paga por posição garantida: aparece sempre, não entra no rodízio.
// Para ser justo entre fundadores, a ORDEM muda uma vez por dia (hora de
// Brasília). Se houver mais fundadores que o limite do bloco, o grupo que
// aparece avança a cada dia, até todos passarem pelo topo.
// ---------------------------------------------------------------------------
export const FUNDADORES_MAX_PADRAO = 8;

/** Número do dia (hora de Brasília): muda à meia-noite daqui. */
export function diaNumero(agora: number = Date.now()): number {
  return Math.floor((agora - BRASILIA_MS) / 86400000);
}

export function blocoFixoDiario<T extends { id: string }>(itens: T[], max: number, agora: number = Date.now()): T[] {
  const dia = diaNumero(agora);
  const limite = Math.max(1, max);
  const base = itens.length > limite ? janelaRodizio(itens, dia, limite, chaveSemana(agora)) : itens.slice();
  return base.sort((a, b) => fnv1a(`${a.id}|d${dia}`) - fnv1a(`${b.id}|d${dia}`) || (a.id < b.id ? -1 : 1));
}

/** O bloco "Em alta agora" só aparece se houver o que rodar (ao menos `tamanho` locais). */
export function deveMostrarRodizio(qtdNoPool: number, tamanho: number): boolean {
  return qtdNoPool >= Math.max(2, tamanho);
}

// ---------------------------------------------------------------------------
// Rodada 78 — quem pode aparecer no bloco "Em alta agora" da Home.
// Só lugares de experiência (bares/vida noturna, festas e eventos, gastronomia,
// cultura e turismo) e só com foto: serviços e lojas continuam nas suas próprias
// categorias, e card sem foto parece incompleto.
// ---------------------------------------------------------------------------
export const CATEGORIAS_VITRINE_HOME = new Set(['lugares', 'eventos', 'gastronomia', 'cultura', 'turismo']);
export const VITRINE_HOME_MAX = 6;

export function elegivelVitrineHome(l: {
  nome?: string | null;
  categoria?: string | null;
  foto_capa_url?: string | null;
  galeria_fotos?: string[] | null;
}): boolean {
  // Cadastro com razão social no lugar do nome (ex.: "31.635.075 Paulo ...") não vai para a vitrine.
  if (l.nome && /^\s*\d{2}\.?\d{3}\.?\d{3}/.test(l.nome)) return false;
  return !!l.categoria && CATEGORIAS_VITRINE_HOME.has(l.categoria) && !!(l.foto_capa_url || l.galeria_fotos?.[0]);
}
