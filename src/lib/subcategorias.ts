// Subcategorias definidas por categoria (out/2026). Aparecem como banners em "Explore por tipo".
// O cadastro do local tem texto livre; cada subcategoria reconhece o nome dela e sinônimos comuns
// (sem diferenciar maiúscula nem acento). Quem não encaixa em nenhuma cai em "Outros".
// Chave = categoria REAL do banco (categoria_tipo): Bares & Vida Noturna = 'lugares'.
export type SubDef = { chave: string; rotulo: string; icone: string; palavras: string[] };

export const normTxt = (s?: string | null) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const def = (rotulo: string, icone: string, palavras: string[]): SubDef => ({ chave: normTxt(rotulo), rotulo, icone, palavras: palavras.map(normTxt) });

export const SUBCATEGORIAS: Record<string, SubDef[]> = {
  // Bares & Vida Noturna — ordem em que os banners aparecem. (Lista provisória: ajustar com a Andrea.)
  lugares: [
    def('Bares', 'coffee', ['bar', 'bares', 'bar lgbt']),
    def('Botecos e Pubs', 'users', ['boteco', 'botequim', 'pub', 'choperia', 'cervejaria', 'cervejaria artesanal']),
    def('Baladas e Clubes', 'disc', ['balada', 'baladas', 'club', 'clube', 'boate', 'night', 'nightclub', 'dance', 'danceteria']),
    def('Drag e Shows', 'star', ['drag', 'drag show', 'show', 'shows', 'cabare', 'cabaret', 'performance', 'teatro']),
    def('Karaokê', 'mic', ['karaoke', 'karaoke bar']),
    def('Música ao vivo', 'music', ['musica ao vivo', 'ao vivo', 'sertanejo', 'pagode', 'samba', 'forro', 'mpb', 'jazz', 'rock']),
    def('Rooftops e Lounges', 'sun', ['rooftop', 'lounge', 'terraco', 'sky bar', 'skybar']),
    def('Coquetelarias', 'droplet', ['coquetelaria', 'drinks', 'drink', 'mixologia', 'speakeasy', 'cocktail']),
  ],
};

// Subcategoria fixa em que o texto livre do local se encaixa (por igualdade ou por palavra inteira); null = Outros.
export function subcategoriaFixa(defs: SubDef[], texto?: string | null): SubDef | null {
  const t = normTxt(texto);
  if (!t) return null;
  const exato = defs.find((d) => d.chave === t || d.palavras.includes(t));
  if (exato) return exato;
  const partes = t.split(/[^a-z0-9]+/).filter(Boolean);
  return defs.find((d) => d.palavras.some((p) => (p.includes(' ') ? t.includes(p) : partes.includes(p)))) || null;
}
