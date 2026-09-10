// 1. Categorias Principais Mapeadas
export const CATEGORIES_LIST = [
  { slug: 'bares', label: 'Bares & Vida Noturna', icon: 'coffee' },
  { slug: 'gastronomia', label: 'Gastronomia', icon: 'square' },
  { slug: 'festas', label: 'Festas & Eventos', icon: 'music' },
  { slug: 'cultura', label: 'Cultura & Lazer', icon: 'film' },
  { slug: 'turismo', label: 'Dicas Trip (Turismo)', icon: 'map-pin' },
  { slug: 'beleza', label: 'Beleza & Bem-Estar', icon: 'scissors' },
  { slug: '18plus', label: 'Espaços 18+', icon: 'eye-off' },
];

// 2. Subcategorias Padronizadas por Categoria
export const SUBCATEGORIES_MAP: Record<string, string[]> = {
  bares: ['Pubs', 'Speakeasy', 'Rooftops', 'Karaokê', 'Happy Hour'],
  gastronomia: ['Restaurantes', 'Cafés', 'Padarias', 'Hamburguerias', 'Docerias', 'Vegano'],
  festas: ['Baladas', 'Festivais', 'Open Bar', 'Drag Shows', 'Sunsets'],
  cultura: ['Teatros', 'Centros Culturais', 'Cinemas', 'Exposições', 'Museus'],
  turismo: ['Hotéis', 'Pousadas', 'Roteiros Guiados', 'Pontos Turísticos'],
  beleza: ['Barbearias', 'Salões Inclusivos', 'Spas & Estética', 'Tatuagem & Piercing'],
  '18plus': ['Saunas', 'Darkrooms', 'Festas Privadas', 'Casas de Swing'],
};

// 3. As 10 Intenções de Busca Oficiais (Experiências do App e Portal B2B)
export const EXPERIENCES_TAGS = [
  { id: 'date', label: 'Date', subtext: 'Clima intimista e ambiente romântico' },
  { id: 'role-amigos', label: 'Rolê com amigos', subtext: 'Mesas grandes e descontração' },
  { id: 'musica-vivo', label: 'Música ao vivo', subtext: 'Shows e apresentações acústicas' },
  { id: 'karaoke', label: 'Karaokê', subtext: 'Palco aberto e salas privadas' },
  { id: 'drag-show', label: 'Drag show', subtext: 'Performances e noites de cabaré' },
  { id: 'comer-bem', label: 'Comer bem', subtext: 'Gastronomia de alta qualidade' },
  { id: 'happy-hour', label: 'Happy Hour', subtext: 'Drinks e porções pós-trabalho' },
  { id: 'aniversario', label: 'Aniversário', subtext: 'Reservas de grupo e comemorações' },
  { id: 'conhecer-pessoas', label: 'Conhecer pessoas', subtext: 'Ambientes abertos para paquera' },
  { id: 'aula-danca', label: 'Aula de dança', subtext: 'Workshops e ritmos guiados' },
];

// 4. Array Simples de Strings (Usado pelos Chips/Botões no Portal Web)
export const EXPERIENCES_TAGS_SIMPLE = [
  'Date',
  'Rolê com amigos',
  'Música ao vivo',
  'Karaokê',
  'Drag show',
  'Comer bem',
  'Happy Hour',
  'Aniversário',
  'Conhecer pessoas',
  'Aula de dança',
];

// 5. Estilos Musicais
export const MUSIC_STYLES = [
  'Pop',
  'Eletrônico / House / Techno',
  'Funk',
  'Samba / Pagode',
  'MPB / Brasilidades',
  'Sertanejo',
  'Rock / Indie',
  'Hip-Hop / R&B / Trap',
  'Axé / Forró',
  'Variado / Sem Música',
];

// 6. Público & Vibe
export const PUBLIC_VIBES = [
  'Geral / Todos bem-vindos',
  'Gay',
  'Lésbico',
  'Trans & Não-binário',
  'Bissexual+',
  'Drag',
  'Ursos/Leather',
  'Queer/Alternativo',
  'Ballroom/Vogue',
  'Fetiche',
];