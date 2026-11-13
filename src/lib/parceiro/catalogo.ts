// Catálogo de produtos e Pacotes e roteiros do Modo parceiro (Etapas 12 e 14). Só o dono (RLS: *_write_dono_ou_admin, 034).
// REGRAS COPIADAS do portal:
//   - dashboard/produtos (só categoria produtos): nome obrigatório; descrição, preço (≥ 0), link de compra e foto
//     opcionais; foto em fotos-locais/<local>/produtos/…; ativar/desativar; excluir.
//   - dashboard/pacotes (locais.pode_subir_pacotes; sem a coluna, turismo): nome obrigatório; destino; duração
//     (Bate-volta, 2 a 3 dias, 4 a 7 dias, 8 dias ou mais); estilo (vai para tags); preço de/até; foto em
//     fotos-locais/<local>/pacotes/…; ativar/desativar; excluir. Sem a migração 054, salva sem destino/duração.
// Diferenças de propósito: o app pede confirmação para excluir (o portal apaga direto); preço do próprio produto ou
// pacote é informação da casa (o app cliente já mostra) e não é cobrança no app.
import { supabase } from '../supabase';

export type Tipo = 'produtos' | 'pacotes';
export const DURACOES = ['Bate-volta', '2 a 3 dias', '4 a 7 dias', '8 dias ou mais'];
export const ESTILOS = ['Praia', 'Cultura', 'Natureza', 'Vida noturna', 'Gastronomia', 'Aventura', 'Romântico', 'Cruzeiro'];

export type Item = {
  id: string | null;
  nome: string;
  descricao: string;
  preco: string; // produtos
  precoDe: string; // pacotes
  precoAte: string;
  link: string; // produtos: link de compra
  destino: string; // pacotes
  duracao: string;
  estilo: string;
  foto: string | null;
  ativo: boolean;
  ordem: number;
};
export const ITEM_VAZIO: Item = { id: null, nome: '', descricao: '', preco: '', precoDe: '', precoAte: '', link: '', destino: '', duracao: '', estilo: '', foto: null, ativo: true, ordem: 0 };

const tabela = (t: Tipo) => (t === 'produtos' ? 'produtos_catalogo' : 'pacotes_turismo');
const num = (v: unknown) => (v == null ? '' : String(v).replace('.', ','));
// "1.200,50" → 1200.5; "49,90" → 49.9; "49.90" → 49.9 (teclado em inglês). Ponto só é milhar quando há vírgula.
export const paraNumero = (v: string) => { const t = v.trim(); if (!t) return null; const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); return Number.isFinite(n) ? n : null; };
export const moeda = (v: string) => { const n = paraNumero(v); return n == null ? null : `R$ ${n.toFixed(2).replace('.', ',')}`; };

export function traduzirErro(e: { message?: string } | null | undefined): string {
  const m = (e?.message || '').toLowerCase();
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('pacotes_turismo') && (m.includes('row-level') || m.includes('policy'))) return 'Pacotes e roteiros são liberados pela equipe Dicas. Fale com a equipe.';
  if (m.includes('row-level') || m.includes('policy') || m.includes('permission denied')) return 'Só o dono do local mexe no catálogo.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet e tente de novo.';
  return e?.message || 'Algo deu errado. Tente de novo.';
}

export async function listar(t: Tipo, localId: string): Promise<Item[]> {
  const campos = t === 'produtos'
    ? 'id, nome, descricao, preco, foto_url, link_compra, ordem, ativo, created_at'
    : 'id, nome, descricao, preco_de, preco_ate, foto_url, ordem, ativo, created_at, destino, duracao_texto, tags';
  let r: any = await supabase.from(tabela(t)).select(campos).eq('local_id', localId).order('ordem', { ascending: true }).order('created_at', { ascending: false });
  if (r.error && t === 'pacotes') r = await supabase.from(tabela(t)).select('id, nome, descricao, preco_de, preco_ate, foto_url, ordem, ativo, created_at, tags').eq('local_id', localId).order('ordem').order('created_at', { ascending: false });
  if (r.error) throw new Error(traduzirErro(r.error));
  return ((r.data as any[]) || []).map((x) => ({
    id: x.id, nome: x.nome, descricao: x.descricao || '', preco: num(x.preco), precoDe: num(x.preco_de), precoAte: num(x.preco_ate),
    link: x.link_compra || '', destino: x.destino || '', duracao: x.duracao_texto || '', estilo: (x.tags || [])[0] || '',
    foto: x.foto_url || null, ativo: !!x.ativo, ordem: x.ordem ?? 0,
  }));
}

export function validar(t: Tipo, i: Item): string | null {
  if (!i.nome.trim()) return t === 'produtos' ? 'Dê um nome para o produto.' : 'Dê um nome para o pacote.';
  if (t === 'produtos') {
    if (i.preco.trim() && (paraNumero(i.preco) == null || paraNumero(i.preco)! < 0)) return 'Confira o preço (ex.: 49,90).';
    if (i.link.trim() && !/^https?:\/\//i.test(i.link.trim())) return 'O link de compra começa com https://';
  } else {
    const de = paraNumero(i.precoDe), ate = paraNumero(i.precoAte);
    if ((i.precoDe.trim() && de == null) || (i.precoAte.trim() && ate == null)) return 'Confira os preços (ex.: 1.200,00).';
    if (de != null && ate != null && ate < de) return 'O preço "até" precisa ser maior que o "a partir de".';
  }
  return null;
}

export async function salvar(t: Tipo, localId: string, i: Item, total: number): Promise<void> {
  const e = validar(t, i);
  if (e) throw new Error(e);
  const base: Record<string, unknown> = t === 'produtos'
    ? { nome: i.nome.trim(), descricao: i.descricao.trim() || null, preco: paraNumero(i.preco), foto_url: i.foto, link_compra: i.link.trim() || null, ativo: i.ativo }
    : { nome: i.nome.trim(), descricao: i.descricao.trim() || null, preco_de: paraNumero(i.precoDe), preco_ate: paraNumero(i.precoAte), foto_url: i.foto, ativo: i.ativo, tags: i.estilo ? [i.estilo] : [] };
  const extras = t === 'pacotes' ? { destino: i.destino.trim() || null, duracao_texto: i.duracao || null } : {};
  const gravar = (dados: Record<string, unknown>) => (i.id
    ? supabase.from(tabela(t)).update(dados).eq('id', i.id)
    : supabase.from(tabela(t)).insert({ ...dados, local_id: localId, ordem: total }));
  let { error } = await gravar({ ...base, ...extras });
  if (error && t === 'pacotes' && /destino|duracao_texto/.test(error.message)) ({ error } = await gravar(base)); // sem a 054
  if (error) throw new Error(t === 'pacotes' && /row-level|policy/i.test(error.message) ? 'Pacotes e roteiros são liberados pela equipe Dicas. Fale com a equipe.' : traduzirErro(error));
}

export async function alternarAtivo(t: Tipo, id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from(tabela(t)).update({ ativo }).eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}
export async function excluir(t: Tipo, id: string): Promise<void> {
  const { error } = await supabase.from(tabela(t)).delete().eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}
