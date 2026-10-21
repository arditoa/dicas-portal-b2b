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
  | 'bares'
  | 'gastronomia'
  | 'festas'
  | 'cultura'
  | 'turismo'
  | 'beleza'
  | 'mais18'
  | 'lojas'
  | 'servicos'
  | 'produtos'
  | 'lazer'
  | 'saude'
  | 'comunidade';

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
    categoriaReal: null,
    emBreve: true,
  },
  mais18: {
    slug: 'mais18',
    label: 'Espaços 18+',
    icon: 'lock',
    color: '#7E57C2',
    categoriaReal: null,
    emBreve: true,
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
    label: 'Compras & Produtos',
    icon: 'package',
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
    categoriaReal: null,
    emBreve: true,
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
// "Compras & Produtos" e não aparece mais nas listas.
export const CATEGORIA_ORDER: CategoriaSlugUI[] = [
  'turismo',
  'bares',
  'festas',
  'gastronomia',
  'lazer',
  'cultura',
  'saude',
  'beleza',
  'servicos',
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
  produtos: 'Produtos',
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
};

// Selo de um local já carregado do banco. Hospedagem (tipo_hospedagem,
// migration 036) vira "HOSPEDAGEM"; subcategoria com 18+/sauna vira "18+".
export function seloDaCategoria(local: { categoria?: string | null; subcategoria?: string | null; tipo_hospedagem?: string | null }): SeloCategoria | undefined {
  if (local.tipo_hospedagem) return { texto: 'HOSPEDAGEM', cor: '#4CAF7D', textoCor: '#06200F' };
  const sub = (local.subcategoria || '').toLowerCase();
  if (local.categoria === 'lugares' && (sub.includes('18') || sub.includes('sauna'))) return { texto: '18+', cor: '#8E24AA', textoCor: '#FFF' };
  return local.categoria ? SELOS_POR_CATEGORIA_REAL[local.categoria] : undefined;
}
