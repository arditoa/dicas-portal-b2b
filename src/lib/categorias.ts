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
  | 'lazer';

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
    label: 'Bares',
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
    label: 'Festas',
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
    label: 'Dicas Trip',
    icon: 'compass',
    color: '#81C784',
    categoriaReal: 'turismo',
  },
  beleza: {
    slug: 'beleza',
    label: 'Beleza',
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
    // "Serviços" já existe no enum real, mas continua marcada "Em breve"
    // por decisão de produto da Andrea (Rodada 2) — não é limitação
    // técnica, então não habilitei sozinho.
    categoriaReal: 'servicos',
    emBreve: true,
  },
  lazer: {
    slug: 'lazer',
    label: 'Lazer',
    icon: 'smile',
    color: '#4FC3F7',
    categoriaReal: null,
    emBreve: true,
  },
};

export const CATEGORIA_ORDER: CategoriaSlugUI[] = [
  'bares',
  'gastronomia',
  'festas',
  'cultura',
  'turismo',
  'beleza',
  'mais18',
  'lojas',
  'servicos',
  'lazer',
];

// Label de exibição por valor REAL do enum categoria_tipo (usado em telas
// que mostram a categoria de um `locais` já carregado do banco).
export const CATEGORIA_REAL_LABEL: Record<string, string> = {
  lugares: 'Bares & Vida Noturna',
  gastronomia: 'Gastronomia',
  cultura: 'Cultura & Lazer',
  eventos: 'Festas & Eventos',
  turismo: 'Turismo',
  servicos: 'Serviços Inclusivos',
};
