// Ingressos pelo site (página pública /e/<festa> e /meus-ingressos). Mesmas regras do app (src/lib/ingressos.ts):
// reserva no banco (reservar_ingressos) e o servidor do portal cria o pagamento no Mercado Pago com o token da casa.
import { supabase } from './supabase';

export type LoteVenda = { id: string; nome: string; preco_centavos: number; permite_meia: boolean; disponivel: boolean; ultimos: boolean; em_breve: boolean; encerrado: boolean;
  abre_em?: string | null; bloqueado_virada?: boolean };
export type IngressosDaFesta = { ativos: boolean; casa_conectada: boolean; taxa_paga_por: 'comprador' | 'casa'; taxa_pct: number; lotes: LoteVenda[]; tem_cupom?: boolean; virada?: boolean;
  taxa_min_centavos?: number; custo_pix_pct?: number; custo_cartao_pct?: number };
export type Cupom = { codigo: string; tipo: 'pct' | 'valor'; valor: number };
export type ItemCompra = { lote_id: string; titular: string; meia: boolean };
export type Pix = { pedido_id: string; copia_e_cola: string; qr_base64: string; vence_em: string; total_centavos: number };

export const reais = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const precoItem = (l: LoteVenda, meia: boolean) => (meia && l.permite_meia ? Math.floor(l.preco_centavos / 2) : l.preco_centavos);
// Mesma conta do banco (140): taxa do Dicas (% com mínimo) + tarifa do Mercado Pago embutida quando o comprador paga a taxa
export const taxaItem = (preco: number, pct: number, minimo = 100) => (preco > 0 ? Math.max(Math.round(preco * (pct / 100)), minimo) : 0);
export function custoPagamento(sub: number, taxa: number, forma: 'pix' | 'cartao', info: { taxa_paga_por: string; custo_pix_pct?: number; custo_cartao_pct?: number }) {
  if (info.taxa_paga_por !== 'comprador' || sub <= 0) return 0;
  const r = (forma === 'cartao' ? info.custo_cartao_pct ?? 4.98 : info.custo_pix_pct ?? 0.99) / 100;
  return Math.ceil((sub + taxa) / (1 - r)) - sub - taxa;
}

export async function ingressosDaFesta(eventoId: string): Promise<IngressosDaFesta | null> {
  const { data, error } = await supabase.rpc('ingressos_da_festa', { p_evento: eventoId });
  return error || !data ? null : (data as IngressosDaFesta);
}
export async function conferirCupom(eventoId: string, codigo: string): Promise<Cupom | null> {
  const { data } = await supabase.rpc('conferir_cupom_ingresso', { p_evento: eventoId, p_codigo: codigo });
  const r = data as { ok: boolean; tipo?: 'pct' | 'valor'; valor?: number } | null;
  return r?.ok ? { codigo: codigo.trim().toUpperCase(), tipo: r.tipo!, valor: r.valor! } : null;
}

async function chamar<T>(rota: string, corpo: object): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Entre na sua conta.');
  const r = await fetch(rota, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Não deu agora. Tente de novo.');
  return j as T;
}

export type ResultadoCompra = { tipo: 'gratis' } | { tipo: 'cartao'; url: string } | ({ tipo: 'pix' } & Pix);
export async function comprar(eventoId: string, itens: ItemCompra[], forma: 'pix' | 'cartao', cupom?: string): Promise<ResultadoCompra> {
  const { data, error } = await supabase.rpc('reservar_ingressos', { p_evento: eventoId, p_itens: itens, p_cupom: cupom?.trim() || null });
  if (error) throw new Error(error.message);
  const r = data as { pedido_id: string; gratis: boolean; total_centavos: number };
  if (r.gratis) return { tipo: 'gratis' };
  if (forma === 'pix') {
    const p = await chamar<{ copia_e_cola: string; qr_base64: string; vence_em: string; total_centavos?: number }>('/api/ingressos/pix', { pedido_id: r.pedido_id });
    return { tipo: 'pix', pedido_id: r.pedido_id, ...p, total_centavos: p.total_centavos ?? r.total_centavos };
  }
  const c = await chamar<{ url: string }>('/api/ingressos/checkout', { pedido_id: r.pedido_id, origem: 'site' });
  return { tipo: 'cartao', url: c.url };
}
export async function statusDoPedido(pedidoId: string): Promise<string | null> {
  const { data } = await supabase.from('ingresso_pedidos').select('status').eq('id', pedidoId).maybeSingle();
  return (data as { status: string } | null)?.status ?? null;
}
export async function pedirReembolso(pedidoId: string) {
  await chamar('/api/ingressos/reembolsar', { pedido_id: pedidoId });
}

export type MeuIngresso = {
  id: string; pedido_id: string; cortesia: boolean; titular: string; meia: boolean; preco_centavos: number; codigo: string; status: 'reservado' | 'valido' | 'usado' | 'cancelado'; usado_em: string | null;
  ingresso_lotes: { nome: string } | null;
  eventos: { id: string; titulo: string; data_inicio: string; data_fim: string | null; foto_capa_url: string | null; locais: { nome: string; endereco: string | null } | null } | null;
  ingresso_pedidos: { status: string; expira_em: string; pago_em: string | null; total_centavos: number } | null;
};
export async function meusIngressos(userId: string): Promise<MeuIngresso[]> {
  const { data, error } = await supabase.from('ingressos')
    .select('id, pedido_id, cortesia, titular, meia, preco_centavos, codigo, status, usado_em, ingresso_lotes(nome), eventos(id, titulo, data_inicio, data_fim, foto_capa_url, locais(nome, endereco)), ingresso_pedidos(status, expira_em, pago_em, total_centavos)')
    .eq('user_id', userId).eq('cortesia_resgatar', false)
    .order('created_at', { ascending: false }).limit(100);
  if (error) return [];
  return ((data as unknown as MeuIngresso[]) || []).filter((i) => i.status !== 'reservado' || (i.ingresso_pedidos?.status === 'pendente' && new Date(i.ingresso_pedidos.expira_em).getTime() > Date.now()));
}
export function podeReembolsar(i: MeuIngresso) {
  const p = i.ingresso_pedidos;
  if (!p || p.status !== 'pago' || !p.total_centavos || !p.pago_em || i.status !== 'valido' || i.cortesia) return false;
  return Date.now() - new Date(p.pago_em).getTime() < 7 * 864e5 && !!i.eventos && new Date(i.eventos.data_inicio).getTime() - Date.now() > 48 * 36e5;
}

export const quandoFesta = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
