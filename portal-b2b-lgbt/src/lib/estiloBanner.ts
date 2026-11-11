// Rodada 140 — estilos do banner de Fundador/Premium (destaque_chamada). Mesmo arquivo no app
// (src/lib/estiloBanner.ts) e no portal (portal-b2b-lgbt/src/lib/estiloBanner.ts): manter os dois iguais.
// O parceiro (ou a equipe) escolhe: fundo em degradê nas cores do app, foto em meio banner ou foto de fundo
// inteira (com um véu escuro por baixo dos dizeres), e a cor dos dizeres.

export type EstiloBanner = 'degrade' | 'foto_metade' | 'foto_esquerda' | 'foto_fundo';

export const ESTILOS_BANNER: { v: EstiloBanner; rotulo: string; dica: string }[] = [
  { v: 'degrade', rotulo: 'Só cor', dica: 'Fundo em degradê, sem foto.' },
  { v: 'foto_metade', rotulo: 'Foto à direita', dica: 'Dizeres à esquerda, foto à direita. Nada por cima da foto.' },
  { v: 'foto_esquerda', rotulo: 'Foto à esquerda', dica: 'Foto à esquerda, dizeres à direita.' },
  { v: 'foto_fundo', rotulo: 'Foto de fundo', dica: 'Foto no banner inteiro, com um véu escuro para os dizeres aparecerem.' },
];

// Degradês com as cores do app/site.
export const DEGRADES_BANNER: { chave: string; rotulo: string; cores: [string, string] }[] = [
  { chave: 'dicas', rotulo: 'Dicas (rosa e roxo)', cores: ['#E1306C', '#7E57C2'] },
  { chave: 'noite', rotulo: 'Noite', cores: ['#4C1D95', '#BE185D'] },
  { chave: 'fundador', rotulo: 'Fundador (âmbar)', cores: ['#B45309', '#9D174D'] },
  { chave: 'por_do_sol', rotulo: 'Pôr do sol', cores: ['#F59E0B', '#E1306C'] },
  { chave: 'esmeralda', rotulo: 'Esmeralda', cores: ['#0E9F6E', '#0E7490'] },
  { chave: 'oceano', rotulo: 'Oceano', cores: ['#2563EB', '#7E57C2'] },
  { chave: 'grafite', rotulo: 'Grafite', cores: ['#1C1B26', '#3A3950'] },
  { chave: 'claro', rotulo: 'Claro', cores: ['#FFF4E6', '#FBD5E5'] },
];

export const CORES_TEXTO_BANNER: { cor: string; rotulo: string }[] = [
  { cor: '#FFFFFF', rotulo: 'Branco' },
  { cor: '#1A1020', rotulo: 'Preto' },
  { cor: '#FFD54F', rotulo: 'Amarelo' },
  { cor: '#FF8FB8', rotulo: 'Rosa' },
];

// Cor da palavra de impacto (e do botão, quando escolhida).
export const CORES_DESTAQUE_BANNER: { cor: string; rotulo: string }[] = [
  { cor: '#FB923C', rotulo: 'Laranja' },
  { cor: '#EC4899', rotulo: 'Rosa' },
  { cor: '#C084FC', rotulo: 'Lilás' },
  { cor: '#FFD54F', rotulo: 'Amarelo' },
  { cor: '#34D399', rotulo: 'Verde' },
  { cor: '#FFFFFF', rotulo: 'Branco' },
];

// Divide a frase para pintar a palavra de impacto. Se ela não estiver dentro da frase, entra no fim.
export function partesDaFrase(frase: string, destaque: string | null | undefined): { antes: string; destaque: string; depois: string } {
  const d = (destaque || '').trim();
  if (!d) return { antes: frase, destaque: '', depois: '' };
  const i = frase.toLowerCase().indexOf(d.toLowerCase());
  if (i < 0) return { antes: frase ? `${frase} ` : '', destaque: d, depois: '' };
  return { antes: frase.slice(0, i), destaque: frase.slice(i, i + d.length), depois: frase.slice(i + d.length) };
}

const HEX = /^#[0-9A-Fa-f]{6}$/;
export function corValida(c: string | null | undefined): string | null {
  return c && HEX.test(c) ? c : null;
}

// Converte o estilo salvo em destaque_chamada no que o cartão do app desenha.
export function estiloDoCartao(
  com: { estilo?: string | null; cor1?: string | null; cor2?: string | null; cor_texto?: string | null; imagem_url?: string | null; destaque_texto?: string | null; cor_destaque?: string | null } | null | undefined,
  padrao: [string, string]
): { degrade: [string, string]; fotoUrl: string | null; fotoModo: 'metade' | 'esquerda' | 'fundo'; corTexto: string | null; destaqueTexto: string | null; corDestaque: string | null } {
  const c1 = corValida(com?.cor1);
  const c2 = corValida(com?.cor2);
  const estilo = (com?.estilo as EstiloBanner | null | undefined) || (com?.imagem_url ? 'foto_metade' : 'degrade');
  return {
    degrade: c1 && c2 ? [c1, c2] : padrao,
    fotoUrl: estilo !== 'degrade' ? com?.imagem_url || null : null,
    fotoModo: estilo === 'foto_fundo' ? 'fundo' : estilo === 'foto_esquerda' ? 'esquerda' : 'metade',
    corTexto: corValida(com?.cor_texto),
    destaqueTexto: (com?.destaque_texto || '').trim() || null,
    corDestaque: corValida(com?.cor_destaque),
  };
}
