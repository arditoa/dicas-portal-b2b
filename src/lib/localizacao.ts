// Rodada 77 — o que mostrar de "onde fica" nos cards da Home e das seções.
// Só lugares onde a pessoa vai (bares/vida noturna, festas e eventos,
// gastronomia e cultura) mostram o bairro junto da cidade. Nas demais
// categorias (serviços, turismo, profissionais que atendem em casa ou
// online) mostra só a cidade — por praticidade e por segurança de quem
// atende em endereço residencial. Rua e número ficam só na página do local.
//
// A coluna `categoria` do banco usa: lugares (bares), gastronomia, cultura,
// eventos, turismo e servicos.
const CATEGORIAS_COM_ENDERECO = new Set(['lugares', 'gastronomia', 'cultura', 'eventos']);

type ComLocal = {
  categoria?: string | null;
  bairro?: string | null;
  bairro_exibicao?: string | null;
  cidade?: string | null;
};

export function categoriaMostraEndereco(categoria?: string | null): boolean {
  return !!categoria && CATEGORIAS_COM_ENDERECO.has(categoria);
}

export function textoLocalizacao(l: ComLocal): string {
  const bairro = (l.bairro_exibicao || l.bairro || '').trim();
  const cidade = (l.cidade || '').trim();
  if (categoriaMostraEndereco(l.categoria)) {
    if (bairro && cidade && bairro.toLowerCase() !== cidade.toLowerCase()) return `${bairro}, ${cidade}`;
    return bairro || cidade;
  }
  return cidade || bairro;
}
