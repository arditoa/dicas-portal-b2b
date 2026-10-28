// Espelho das subcategorias fixas do app (src/lib/subcategorias.ts) — mantenha as duas listas iguais.
// Chave = categoria REAL do banco; 'lugares' = Bares & Vida Noturna.
export const SUBCATEGORIAS_APP: Record<string, { titulo: string; itens: { chave: string; rotulo: string }[] }> = {
  lugares: {
    titulo: 'Bares & Vida Noturna',
    itens: [
      { chave: 'bares', rotulo: 'Bares' },
      { chave: 'botecos e pubs', rotulo: 'Botecos e Pubs' },
      { chave: 'baladas e clubes', rotulo: 'Baladas e Clubes' },
      { chave: 'drag e shows', rotulo: 'Drag e Shows' },
      { chave: 'karaoke', rotulo: 'Karaokê' },
      { chave: 'musica ao vivo', rotulo: 'Música ao vivo' },
      { chave: 'rooftops e lounges', rotulo: 'Rooftops e Lounges' },
      { chave: 'coquetelarias', rotulo: 'Coquetelarias' },
    ],
  },
};
