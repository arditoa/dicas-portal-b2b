// Categorias Principais
const CATEGORIAS_B2B = [
  'Bares & Vida Noturna',
  'Gastronomia',
  'Festas & Eventos',
  'Cultura & Lazer',
  'Dicas Trip (Turismo)',
  'Beleza',
  'Espaços 18+',
  'Lojas',
  'Serviços',
  'Lazer'
];

// Subcategorias Sincronizadas
const SUBCATEGORIAS_B2B: Record<string, string[]> = {
  'Bares & Vida Noturna': ['Música ao vivo', 'Rooftops', 'Karaokês', 'Happy Hours', 'Parklet'],
  'Gastronomia': ['Restaurantes', 'Cafés', 'Padarias', 'Hamburguerias', 'Docerias', 'Vegano'],
  'Festas & Eventos': ['Baladas', 'Festivais', 'Open Bar', 'Drag Shows', 'Sunsets'],
  'Cultura & Lazer': ['Teatros', 'Centros Culturais', 'Cinemas', 'Exposições', 'Museus'],
  'Dicas Trip (Turismo)': ['Hotéis', 'Pousadas', 'Roteiros Guiados', 'Pontos Turísticos']
};

// Tags Preset
const EXPERIENCIAS_PRESET = [
  'Date', 'Rolê com amigos', 'Dançar', 'Música ao vivo', 'Karaokê', 
  'Drag show', 'Comer bem', 'Happy hour', 'Relaxar', 'Conhecer pessoas', 
  'Passear', 'Aniversário', 'Aula de dança', 'Aula de forró',
  'Acessível PCD', 'Pet Friendly', 'Wi-Fi Grátis', 'Estacionamento'
];