// Filtros compartilhados das listas de locais (Perto de mim e Predominância de público).
// A página de categoria tem a sua cópia; as páginas da Home (Em Alta etc.) usam estas.

// Filtro "Perto de mim": rótulo mostrado -> raio em km.
export const RAIOS_KM: Record<string, number> = {
  'Até 1 km': 1,
  'Até 3 km': 3,
  'Até 5 km': 5,
  'Até 10 km': 10,
  'Até 25 km': 25,
};

export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Predominância de público (locais.publico_tags, definido pelo parceiro no portal). Tag -> rótulo mostrado.
export const PUBLICOS: { slug: string; rotulo: string }[] = [
  { slug: 'gay', rotulo: 'Gay' },
  { slug: 'lesbica', rotulo: 'Lésbico' },
  { slug: 'bi', rotulo: 'Bissexual' },
  { slug: 'trans', rotulo: 'Trans e travestis' },
  { slug: 'nao_binario', rotulo: 'Não binário' },
  { slug: 'queer', rotulo: 'Queer' },
  { slug: 'ursos', rotulo: 'Ursos' },
  { slug: 'daddy', rotulo: 'Daddy' },
  { slug: 'leather', rotulo: 'Leather' },
  { slug: 'drag', rotulo: 'Drag' },
  { slug: 'misto_lgbt', rotulo: 'Misto LGBT+' },
  { slug: 'aliados', rotulo: 'Aliados (friendly)' },
];
