// Taxonomia de categorias mostrada na UI (Home, Categorias, Explorar,
// Turismo) e o mapeamento pro enum real public.categoria_tipo do Supabase.
//
// IMPORTANTE: o enum real só tem 6 valores —
// lugares/gastronomia/cultura/eventos/turismo/servicos. A ideia de 10
// categorias (Bares, Festas, Gastronomia, Experiência, Turismo, Serviços,
// Lojas, Cultura e Lazer, Beleza, 18+) foi desenhada nas Rodadas 1-8 da
// investigação (ver `investigacao-tecnica-app.md` no projeto), sem acesso
// ao repositório real, e essa migração de enum nunca chegou a ser
// aplicada no banco de produção. Em vez de inventar uma migração nova só
// pra isso (decisão de produto que não foi pedida), a UI mantém as
// categorias "Em breve" como já estavam (decisão da Andrea, Rodada 2) e
// as categorias habilitadas apontam pro valor real mais próximo do enum
// que já existe.

export type CategoriaSlugUI =
  | 'destaques'
  | 'bares'
  | 'gastronomia'
  | 'festas'
  | 'artistas'
  | 'cultura'
  | 'turismo'
  | 'beleza'
  | 'mais18'
  | 'lojas'
  | 'servicos'
  | 'produtos'
  | 'lazer'
  | 'saude'
  | 'comunidade'
  | 'educacao';

export interface CategoriaConfig {
  slug: CategoriaSlugUI;
  label: string;
  icon: string;
  color: string;
  // Valor real de public.categoria_tipo que esta categoria consulta.
  // null = ainda não tem tabela/coluna real equivalente (fica "Em breve").
  categoriaReal: string | null;
  emBreve?: boolean;
}

export const CATEGORIAS: Record<CategoriaSlugUI, CategoriaConfig> = {
  // Primeira categoria da Home (out/2026): Membros Fundadores + Dicas Trip em destaque.
  // Não entra em CATEGORIA_ORDER (esse array alimenta o mapa e os filtros); a Home a coloca na frente.
  destaques: {
    slug: 'destaques',
    label: 'Destaques',
    icon: 'star',
    color: '#FFD54F',
    categoriaReal: null,
  },
  bares: {
    slug: 'bares',
    label: 'Bares & Vida Noturna',
    icon: 'moon',
    color: '#E1306C',
    categoriaReal: 'lugares',
  },
  gastronomia: {
    slug: 'gastronomia',
    label: 'Gastronomia',
    icon: 'coffee',
    color: '#FFD54F',
    categoriaReal: 'gastronomia',
  },
  festas: {
    slug: 'festas',
    label: 'Festas & Eventos',
    icon: 'music',
    color: '#FFB74D',
    // "Festas" não lista locais — abre a aba Eventos (agenda de
    // eventos/roteiros), então não precisa de categoriaReal aqui.
    categoriaReal: null,
  },
  // Nov/2026 — categoria nova pedida pela Andrea (migration 069): bandas, artistas solo, drags, DJs, humor e dança.
  // Quem se apresenta (pessoa ou grupo), não o lugar; o show em si continua em Festas & Eventos.
  artistas: {
    slug: 'artistas',
    label: 'Artistas & Entretenimento',
    icon: 'mic',
    color: '#BA68C8',
    categoriaReal: 'artistas',
  },
  cultura: {
    slug: 'cultura',
    label: 'Cultura',
    icon: 'film',
    color: '#4FC3F7',
    categoriaReal: 'cultura',
  },
  turismo: {
    slug: 'turismo',
    label: 'Turismo | Dicas Trip',
    icon: 'compass',
    color: '#81C784',
    categoriaReal: 'turismo',
  },
  beleza: {
    slug: 'beleza',
    label: 'Beleza & Estética',
    icon: 'scissors',
    color: '#E1306C',
    categoriaReal: 'beleza', // enum já existia (migration 026); aberta na Home em nov/2026
  },
  mais18: {
    slug: 'mais18',
    label: 'Espaços 18+',
    icon: 'lock',
    color: '#7E57C2',
    categoriaReal: 'mais18', // valor novo do enum (migration 070); aberta na Home em nov/2026
  },
  lojas: {
    slug: 'lojas',
    label: 'Lojas',
    icon: 'shopping-bag',
    color: '#E1306C',
    categoriaReal: null,
    emBreve: true,
  },
  servicos: {
    slug: 'servicos',
    label: 'Serviços',
    icon: 'briefcase',
    color: '#7E57C2',
    // "Serviços" já existia no enum real, ficava "Em breve" por decisão
    // de produto da Andrea (Rodada 2). Habilitado agora, a pedido dela
    // (bastante interesse real na feira) — nenhuma migration necessária,
    // o valor real 'servicos' do enum já existia desde a Rodada 1.
    categoriaReal: 'servicos',
  },
  produtos: {
    slug: 'produtos',
    label: 'Moda & Acessórios',
    icon: 'shopping-bag',
    color: '#FFD54F',
    // Categoria nova de verdade (Rodada 61) — 'produtos' não existia no
    // enum categoria_tipo antes; ver migration 033.
    categoriaReal: 'produtos',
  },
  lazer: {
    slug: 'lazer',
    label: 'Experiências & Lazer',
    icon: 'smile',
    color: '#4FC3F7',
    categoriaReal: null,
    emBreve: true,
  },
  // Out/2026 — novas categorias da lista oficial da Andrea (12 itens).
  // Ainda sem valor equivalente no enum categoria_tipo → "Em breve".
  saude: {
    slug: 'saude',
    label: 'Saúde & Bem-estar',
    icon: 'activity',
    color: '#4CAF7D',
    categoriaReal: 'saude', // valor novo do enum (migration 089); aberta na Home em nov/2026
  },
  // Nov/2026 — categoria nova pedida pela Andrea (migration 053). Cursos, idiomas,
  // escolas, mentorias e formações inclusivas. Ativa desde o lançamento.
  educacao: {
    slug: 'educacao',
    label: 'Educação',
    icon: 'book-open',
    color: '#FF8A65',
    categoriaReal: 'educacao',
  },
  comunidade: {
    slug: 'comunidade',
    label: 'Comunidade & Apoio',
    icon: 'users',
    color: '#B39DDB',
    categoriaReal: null,
    emBreve: true,
  },
};

// Ordem oficial (out/2026, lista da Andrea). 'lojas' foi absorvida por
// "Moda & Acessórios" e não aparece mais nas listas.
export const CATEGORIA_ORDER: CategoriaSlugUI[] = [
  'turismo',
  'bares',
  'festas',
  'artistas',
  'gastronomia',
  'lazer',
  'cultura',
  'saude',
  'beleza',
  'servicos',
  'educacao',
  'produtos',
  'comunidade',
  'mais18',
];

// Label de exibição por valor REAL do enum categoria_tipo (usado em telas
// que mostram a categoria de um `locais` já carregado do banco).
export const CATEGORIA_REAL_LABEL: Record<string, string> = {
  lugares: 'Bares',
  gastronomia: 'Gastronomia',
  cultura: 'Cultura & Lazer',
  eventos: 'Festas & Eventos',
  turismo: 'Turismo',
  servicos: 'Serviços Inclusivos',
  produtos: 'Moda & Acessórios',
  educacao: 'Educação',
  artistas: 'Artistas & Entretenimento',
  beleza: 'Beleza & Estética',
  mais18: 'Espaços 18+',
  saude: 'Saúde & Bem-estar',
};

// Rodada 66 — selo colorido de categoria nos cards (pedido da Andrea a
// partir do selo "FESTA" do "O que fazer hoje"). Uma cor por categoria, bem
// distintas entre si; FESTA mantém o rosa que ela aprovou.
export type SeloCategoria = { texto: string; cor: string; textoCor: string };

export const SELO_FESTA: SeloCategoria = { texto: 'FESTA', cor: '#E1306C', textoCor: '#FFF' };

const SELOS_POR_CATEGORIA_REAL: Record<string, SeloCategoria> = {
  lugares: { texto: 'BAR', cor: '#7E57C2', textoCor: '#FFF' },
  eventos: SELO_FESTA,
  gastronomia: { texto: 'GASTRONOMIA', cor: '#FFD54F', textoCor: '#1A1300' },
  cultura: { texto: 'CULTURA', cor: '#4FC3F7', textoCor: '#06202B' },
  turismo: { texto: 'TURISMO', cor: '#81C784', textoCor: '#0C2410' },
  servicos: { texto: 'SERVIÇOS', cor: '#B39DDB', textoCor: '#1B1230' },
  produtos: { texto: 'COMPRAS', cor: '#FFB74D', textoCor: '#2A1700' },
  lojas: { texto: 'COMPRAS', cor: '#FFB74D', textoCor: '#2A1700' },
  beleza: { texto: 'BELEZA', cor: '#F48FB1', textoCor: '#2A0A16' },
  lazer: { texto: 'LAZER', cor: '#26C6DA', textoCor: '#03252A' },
  educacao: { texto: 'EDUCAÇÃO', cor: '#FF8A65', textoCor: '#2A0E05' },
  artistas: { texto: 'ARTISTA', cor: '#BA68C8', textoCor: '#1F0A26' },
  mais18: { texto: '18+', cor: '#8E24AA', textoCor: '#FFF' },
};

// Selo de um local já carregado do banco. Hospedagem (tipo_hospedagem,
// migration 036) vira "HOSPEDAGEM"; subcategoria com 18+/sauna vira "18+".
export function seloDaCategoria(local: { categoria?: string | null; subcategoria?: string | null; tipo_hospedagem?: string | null }): SeloCategoria | undefined {
  if (local.tipo_hospedagem) return { texto: 'HOSPEDAGEM', cor: '#4CAF7D', textoCor: '#06200F' };
  const sub = (local.subcategoria || '').toLowerCase();
  if (local.categoria === 'lugares' && (sub.includes('18') || sub.includes('sauna'))) return { texto: '18+', cor: '#8E24AA', textoCor: '#FFF' };
  return local.categoria ? SELOS_POR_CATEGORIA_REAL[local.categoria] : undefined;
}

// Frase curta abaixo do título de cada categoria (mesmo estilo do "Viaje pelo Brasil com quem entende a comunidade", da Dicas Trip).
export const SUBTITULO_CATEGORIA: Partial<Record<CategoriaSlugUI, string>> = {
  destaques: 'Os negócios que acreditaram na comunidade desde o começo',
  bares: 'Bares, baladas e a noite que acolhe você',
  gastronomia: 'Sabores e mesas onde você pode ser quem é',
  festas: 'As festas e eventos da cena LGBT+',
  artistas: 'Bandas, drags, DJs e artistas que fazem a nossa cena',
  cultura: 'Museus, arte e histórias da nossa comunidade',
  turismo: 'Viaje pelo Brasil com quem entende a comunidade',
  beleza: 'Cuidado e estética com respeito à sua identidade',
  mais18: 'Espaços adultos, com discrição e respeito',
  lojas: 'Lojas que apoiam a causa e recebem todo mundo',
  servicos: 'Profissionais que entendem e apoiam a comunidade',
  produtos: 'Marcas e produtos de quem está do nosso lado',
  lazer: 'Passeios e experiências para curtir sem medo',
  saude: 'Cuidado com a saúde, com acolhimento e respeito',
  educacao: 'Cursos e escolas que acolhem a diversidade',
  comunidade: 'Apoio, acolhimento e conexão entre pessoas',
};
