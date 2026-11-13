// Banner do Modo parceiro (tela Banner). REGRAS COPIADAS de portal-b2b-lgbt/src/app/dashboard/destaques/page.tsx
// e de components/EditorEstiloBanner.tsx; estilos e cores de src/lib/estiloBanner.ts (igual no portal).
//   - só Premium e Fundador com plano efetivo editam (o app trava; o banco guarda em destaque_chamada);
//   - frase obrigatória: até 60 letras com foto em meio banner (foto à direita/esquerda), até 90 nos outros estilos;
//   - texto do botão até 24 (padrão "Conhecer"); palavra de impacto até 30;
//   - foto em fotos-locais "<local_id>/banner-…"; ao subir foto com estilo "Só cor", passa para "Foto à direita";
//   - "trocado há N dias" (updated_at), aviso a partir de 7 dias;
//   - variantes por lugar (096) NÃO são mexidas aqui: o salvar só grava os campos desta tela.
// Banco: destaque_chamada (060, 095, 099 equipe 'banner'), vitrine_vaga (071). Foto do parceiro precisa da 107.
import { EstiloBanner } from '../estiloBanner';
import { supabase } from '../supabase';

export type Banner = {
  chamada: string;
  cta: string;
  imagem_url: string | null;
  estilo: EstiloBanner;
  cor1: string | null;
  cor2: string | null;
  cor_texto: string | null;
  destaque_texto: string;
  cor_destaque: string | null;
};
export const BANNER_VAZIO: Banner = { chamada: '', cta: 'Conhecer', imagem_url: null, estilo: 'degrade', cor1: null, cor2: null, cor_texto: null, destaque_texto: '', cor_destaque: null };
export const MAX_CTA = 24;
export const MAX_DESTAQUE = 30;
export const meioBanner = (b: Pick<Banner, 'estilo' | 'imagem_url'>) => !!b.imagem_url && (b.estilo === 'foto_metade' || b.estilo === 'foto_esquerda');
export const maxChamada = (b: Pick<Banner, 'estilo' | 'imagem_url'>) => (meioBanner(b) ? 60 : 90);

export function traduzirErro(e: { message?: string } | null | undefined): string {
  const m = (e?.message || '').toLowerCase();
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('row-level') || m.includes('policy') || m.includes('permission denied')) return 'Seu acesso não permite mudar o banner deste local. Fale com o dono.';
  if (m.includes('chamada')) return 'A frase precisa ter de 1 a 90 letras.';
  if (m.includes('cta')) return 'O texto do botão pode ter até 24 letras.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet e tente de novo.';
  return e?.message || 'Algo deu errado. Tente de novo.';
}

export async function obterBanner(localId: string): Promise<{ banner: Banner; atualizado: string | null; existe: boolean }> {
  const t = () => supabase.from('destaque_chamada') as any;
  let r: any = await t().select('chamada, cta, imagem_url, updated_at, estilo, cor1, cor2, cor_texto, destaque_texto, cor_destaque').eq('local_id', localId).maybeSingle();
  if (r.error) r = await t().select('chamada, cta, imagem_url, updated_at').eq('local_id', localId).maybeSingle(); // sem a 095
  if (r.error) throw new Error(traduzirErro(r.error));
  const c = r.data as any;
  if (!c) return { banner: { ...BANNER_VAZIO }, atualizado: null, existe: false };
  return {
    banner: {
      chamada: c.chamada || '', cta: c.cta || 'Conhecer', imagem_url: c.imagem_url || null,
      estilo: (c.estilo as EstiloBanner) || (c.imagem_url ? 'foto_metade' : 'degrade'),
      cor1: c.cor1 ?? null, cor2: c.cor2 ?? null, cor_texto: c.cor_texto ?? null, destaque_texto: c.destaque_texto || '', cor_destaque: c.cor_destaque ?? null,
    },
    atualizado: c.updated_at || null,
    existe: true,
  };
}

export type ErrosBanner = Partial<Record<'chamada' | 'cta' | 'foto', string>>;
export function validarBanner(b: Banner): ErrosBanner {
  const e: ErrosBanner = {};
  const max = maxChamada(b);
  if (!b.chamada.trim()) e.chamada = 'Escreva a frase do seu banner.';
  else if (b.chamada.trim().length > max) e.chamada = meioBanner(b) ? `Com foto em meio banner, a frase fica em meio cartão: até ${max} letras.` : `Até ${max} letras.`;
  if (b.cta.trim().length > MAX_CTA) e.cta = `Até ${MAX_CTA} letras.`;
  if (b.estilo !== 'degrade' && !b.imagem_url) e.foto = 'Suba a foto para este estilo aparecer (ou escolha "Só cor").';
  return e;
}

// Grava só os campos desta tela (upsert não mexe em variantes, comunicação etc.).
// Devolve um aviso quando o banco não guardou a foto (sem a migração 107, o gatilho da 060 descarta).
export async function salvarBanner(localId: string, b: Banner): Promise<{ atualizado: string; aviso: string | null }> {
  const erro = Object.values(validarBanner(b))[0];
  if (erro) throw new Error(erro);
  const dados = {
    local_id: localId,
    chamada: b.chamada.trim(),
    cta: b.cta.trim() || 'Conhecer',
    imagem_url: b.imagem_url || null,
    estilo: b.estilo,
    cor1: b.cor1, cor2: b.cor2, cor_texto: b.cor_texto,
    destaque_texto: b.destaque_texto.trim() || null,
    cor_destaque: b.cor_destaque,
  };
  const { error } = await supabase.from('destaque_chamada').upsert(dados);
  if (error) throw new Error(traduzirErro(error));
  const salvo = await obterBanner(localId);
  const fotoPerdida = !!b.imagem_url && salvo.banner.imagem_url !== b.imagem_url;
  return {
    atualizado: salvo.atualizado || new Date().toISOString(),
    aviso: fotoPerdida ? 'A frase foi salva, mas o banco ainda não guarda a foto do parceiro. Peça para a equipe Dicas rodar a atualização 107.' : null,
  };
}

export type Vaga = { categoria: string; tipo: string; posicao: number };
export async function vagasDoLocal(localId: string): Promise<Vaga[]> {
  const { data, error } = await supabase.from('vitrine_vaga').select('categoria, tipo, posicao').eq('local_id', localId);
  return error ? [] : ((data as Vaga[]) || []);
}

export const diasDesde = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)) : null);

// Mesmos nomes do portal (dashboard/destaques).
export const NOME_CATEGORIA_APP: Record<string, string> = {
  bares: 'Bares & Vida Noturna', festas: 'Festas & Eventos', servicos: 'Serviços', turismo: 'Dicas Trip', artistas: 'Artistas & Entretenimento',
  beleza: 'Beleza & Estética', mais18: 'Espaços 18+', gastronomia: 'Gastronomia', cultura: 'Cultura', educacao: 'Educação',
  produtos: 'Compras & Produtos', lazer: 'Experiências & Lazer', destaques: 'Destaques',
};
export const textoDaVaga = (v: Vaga, fundador: boolean) =>
  `${v.tipo === 'premium' ? (fundador ? 'Banner Fundador' : 'Banner Premium') : 'Intermediário'} ${v.posicao} em ${NOME_CATEGORIA_APP[v.categoria] || v.categoria}`;

// O que o plano inclui (texto do portal, sem preço).
export const PLANO_TEXTO: Record<'fundador' | 'premium', { nome: string; cor: string; itens: string[] }> = {
  fundador: { nome: 'Membro Fundador', cor: '#FFD54F', itens: [
    'Seu banner roda nos Destaques e na Home do app, com o selo dourado de Membro Fundador.',
    'Nossa equipe de comunicação escreve a frase do seu banner para dar vontade de conhecer. Você pode ajustar quando quiser, aqui mesmo.',
    'Você publica 1 cupom por semana na faixa de cupons da categoria (2 vagas de Fundador por categoria, trocando a cada 10 minutos).',
    'Se você faz festas: destaque até 4 por mês em “Festas em destaque” (só o flyer), todos os dias até a festa. Ative em Minhas festas › Destacar com o plano.',
  ] },
  premium: { nome: 'Plano Premium', cor: '#E1306C', itens: [
    'Seu banner roda no topo da sua categoria: são 12 vagas e 4 aparecem por hora, então você é visto o dia todo.',
    'Você escreve a frase do banner e pode trocá-la toda semana: é o jeito mais fácil de manter o banner novo e as pessoas voltando.',
    'Além do banner, você publica 1 cupom por semana na faixa de cupons da categoria (10 vagas Premium por categoria).',
    'Se você faz festas: destaque até 4 por mês em “Festas em destaque” (só o flyer), todos os dias até a festa. Ative em Minhas festas › Destacar com o plano.',
  ] },
};

// ---------------------------------------------------------------------------------------------------------------
// Rodada 146 — escolher QUAL banner mudar: Home (Membro Fundador) ou topo da categoria.
//   • Categoria = colunas normais de destaque_chamada (banner padrão).
//   • Home = destaque_chamada.variantes.home (migração 096; a Home já lê primeiro essa variante).
//   • Sem nada salvo ainda, a Home mostra a frase da equipe de comunicação (fundador_comunicacao.headline,
//     ex.: "Já ouviu falar do Vezpa Queen?"): ela vem preenchida para a pessoa só ajustar.
//   • Salvar a categoria de um Fundador guarda a frase atual da Home em variantes.home, para a Home não mudar junto.
export type LugarBanner = 'home' | 'categoria';
type VarianteSalva = Partial<Record<'chamada' | 'cta' | 'imagem_url' | 'estilo' | 'cor1' | 'cor2' | 'cor_texto' | 'destaque_texto' | 'cor_destaque', string | null>>;

const deVariante = (v: VarianteSalva): Banner => ({
  chamada: v.chamada || '', cta: v.cta || 'Conhecer', imagem_url: v.imagem_url || null,
  estilo: ((v.estilo as EstiloBanner) || (v.imagem_url ? 'foto_metade' : 'degrade')),
  cor1: v.cor1 ?? null, cor2: v.cor2 ?? null, cor_texto: v.cor_texto ?? null, destaque_texto: v.destaque_texto || '', cor_destaque: v.cor_destaque ?? null,
});
const paraVariante = (b: Banner): VarianteSalva => ({
  chamada: b.chamada.trim(), cta: b.cta.trim() || 'Conhecer', imagem_url: b.imagem_url || null, estilo: b.estilo,
  cor1: b.cor1, cor2: b.cor2, cor_texto: b.cor_texto, destaque_texto: b.destaque_texto.trim() || null, cor_destaque: b.cor_destaque,
});
const colunas = (b: Banner) => ({
  chamada: b.chamada.trim(), cta: b.cta.trim() || 'Conhecer', imagem_url: b.imagem_url || null, estilo: b.estilo,
  cor1: b.cor1, cor2: b.cor2, cor_texto: b.cor_texto, destaque_texto: b.destaque_texto.trim() || null, cor_destaque: b.cor_destaque,
});

async function linhaAtual(localId: string): Promise<{ existe: boolean; variantes: Record<string, VarianteSalva> }> {
  const { data, error } = await (supabase.from('destaque_chamada') as any).select('local_id, variantes').eq('local_id', localId).maybeSingle();
  if (error) return { existe: false, variantes: {} };
  return { existe: !!data, variantes: ((data as any)?.variantes as Record<string, VarianteSalva>) || {} };
}

export async function obterBanners(localId: string): Promise<{ categoria: Banner; home: Banner; atualizado: string | null; existe: boolean }> {
  const base = await obterBanner(localId);
  const [{ variantes }, fc] = await Promise.all([
    linhaAtual(localId),
    (supabase.from('fundador_comunicacao') as any).select('headline, cta').eq('local_id', localId).maybeSingle(),
  ]);
  const frase = (fc?.data as { headline?: string | null; cta?: string | null } | null) || null;
  const categoria = base.existe ? base.banner : { ...BANNER_VAZIO, chamada: frase?.headline || '' };
  const home = variantes.home?.chamada
    ? deVariante(variantes.home)
    : base.existe
    ? base.banner
    : { ...BANNER_VAZIO, chamada: frase?.headline || '', cta: frase?.cta || 'Conhecer' };
  return { categoria, home, atualizado: base.atualizado, existe: base.existe };
}

// homeAtual: como a Home está salva agora (para não mudar junto quando se salva a categoria de um Fundador).
export async function salvarBannerNoLugar(localId: string, lugar: LugarBanner, b: Banner, opc: { fundador: boolean; homeAtual: Banner; categoriaAtual: Banner }) {
  const erro = Object.values(validarBanner(b))[0];
  if (erro) throw new Error(erro);
  const { existe, variantes } = await linhaAtual(localId);
  if (lugar === 'categoria') {
    const novas = { ...variantes };
    if (opc.fundador && !novas.home?.chamada && opc.homeAtual.chamada.trim()) novas.home = paraVariante(opc.homeAtual);
    const { error } = await (supabase.from('destaque_chamada') as any).upsert({ local_id: localId, ...colunas(b), variantes: novas });
    if (error) throw new Error(traduzirErro(error));
  } else {
    const novas = { ...variantes, home: paraVariante(b) };
    const q = existe
      ? (supabase.from('destaque_chamada') as any).update({ variantes: novas }).eq('local_id', localId)
      : (supabase.from('destaque_chamada') as any).insert({ local_id: localId, ...colunas(opc.categoriaAtual.chamada.trim() ? opc.categoriaAtual : b), variantes: novas });
    const { error } = await q;
    if (error) throw new Error(traduzirErro(error));
  }
  const salvo = await obterBanner(localId);
  return { atualizado: salvo.atualizado || new Date().toISOString() };
}
