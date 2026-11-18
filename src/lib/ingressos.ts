// Migração 131 — ingressos no app (Mercado Pago, Checkout Pro). O app reserva no banco e pede ao portal
// (servidor) o link de pagamento: as chaves do Mercado Pago nunca ficam no celular.
import { Linking } from 'react-native';
import { URL_PORTAL } from './parceiroMenu';
import { supabase } from './supabase';

export type LoteVenda = { id: string; nome: string; preco_centavos: number; permite_meia: boolean; disponivel: boolean; ultimos: boolean; em_breve: boolean; encerrado: boolean;
  abre_em?: string | null; bloqueado_virada?: boolean };
export type IngressosDaFesta = { ativos: boolean; casa_conectada: boolean; taxa_paga_por: 'comprador' | 'casa'; taxa_pct: number; lotes: LoteVenda[];
  taxa_min_centavos?: number; custo_pix_pct?: number; custo_cartao_pct?: number;
  tem_cupom?: boolean; virada?: boolean };
export type Cupom = { codigo: string; tipo: 'pct' | 'valor'; valor: number };
export type ItemCompra = { lote_id: string; titular: string; meia: boolean };

export const reais = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function precoItem(l: LoteVenda, meia: boolean) {
  return meia && l.permite_meia ? Math.floor(l.preco_centavos / 2) : l.preco_centavos;
}
// Mesma conta do banco (140): taxa do Dicas por ingresso pago (% com mínimo) e, quando o comprador paga a taxa,
// a tarifa do Mercado Pago embutida para a casa receber cheio: total = (ingressos + taxa) / (1 − tarifa).
export function taxaItem(preco: number, pct: number, minimo = 100) {
  return preco > 0 ? Math.max(Math.round(preco * (pct / 100)), minimo) : 0;
}
export function custoPagamento(sub: number, taxa: number, forma: 'pix' | 'cartao', info: { taxa_paga_por: string; custo_pix_pct?: number; custo_cartao_pct?: number }) {
  if (info.taxa_paga_por !== 'comprador' || sub <= 0) return 0;
  const r = (forma === 'cartao' ? info.custo_cartao_pct ?? 4.98 : info.custo_pix_pct ?? 0.99) / 100;
  return Math.ceil((sub + taxa) / (1 - r)) - sub - taxa;
}

export async function ingressosDaFesta(eventoId: string): Promise<IngressosDaFesta | null> {
  const { data, error } = await supabase.rpc('ingressos_da_festa', { p_evento: eventoId });
  if (error || !data) return null;
  return data as IngressosDaFesta;
}

async function chamarPortal<T>(rota: string, corpo: object): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error('Entre na sua conta de novo.');
  const resp = await fetch(`${URL_PORTAL}${rota}`, {
    method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(corpo),
  });
  const j = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(j.error || 'Não deu agora. Tente de novo.');
  return j as T;
}

export type ResultadoCompra =
  | { tipo: 'gratis' }
  | { tipo: 'cartao' }
  | { tipo: 'pix'; pedido_id: string; copia_e_cola: string; qr_base64: string; vence_em: string; total_centavos: number };

/** Reserva e paga: grátis sai na hora; Pix aparece dentro do app; cartão abre o Mercado Pago. */
export async function comprar(eventoId: string, itens: ItemCompra[], forma: 'pix' | 'cartao', cupom?: string): Promise<ResultadoCompra> {
  const { data, error } = await supabase.rpc('reservar_ingressos', { p_evento: eventoId, p_itens: itens, p_cupom: cupom?.trim() || null });
  if (error) throw new Error(error.message);
  const r = data as { pedido_id: string; gratis: boolean; total_centavos: number };
  if (r.gratis) return { tipo: 'gratis' };
  if (forma === 'pix') {
    const p = await chamarPortal<{ copia_e_cola: string; qr_base64: string; vence_em: string; total_centavos?: number }>('/api/ingressos/pix', { pedido_id: r.pedido_id });
    return { tipo: 'pix', pedido_id: r.pedido_id, ...p, total_centavos: p.total_centavos ?? r.total_centavos };
  }
  const c = await chamarPortal<{ url: string }>('/api/ingressos/checkout', { pedido_id: r.pedido_id });
  await Linking.openURL(c.url);
  return { tipo: 'cartao' };
}

export async function statusDoPedido(pedidoId: string): Promise<string | null> {
  const { data } = await (supabase.from('ingresso_pedidos') as any).select('status').eq('id', pedidoId).maybeSingle();
  return (data as { status: string } | null)?.status ?? null;
}

export async function conferirCupom(eventoId: string, codigo: string): Promise<Cupom | null> {
  const { data } = await supabase.rpc('conferir_cupom_ingresso', { p_evento: eventoId, p_codigo: codigo });
  const r = data as { ok: boolean; tipo?: 'pct' | 'valor'; valor?: number } | null;
  return r?.ok ? { codigo: codigo.trim().toUpperCase(), tipo: r.tipo!, valor: r.valor! } : null;
}

export async function pedirReembolso(pedidoId: string) {
  await chamarPortal('/api/ingressos/reembolsar', { pedido_id: pedidoId });
}

export async function resgatarCortesia(codigo: string): Promise<{ titular: string; festa: string; data_inicio: string }> {
  const { data, error } = await supabase.rpc('resgatar_cortesia', { p_codigo: codigo });
  if (error) throw new Error(error.message);
  return data as { titular: string; festa: string; data_inicio: string };
}

export const linkCortesia = (codigo: string) => `${URL_PORTAL}/cortesia/${codigo}`;

export type MeuIngresso = {
  id: string; pedido_id: string; cortesia: boolean; titular: string; meia: boolean; preco_centavos: number; codigo: string; status: 'reservado' | 'valido' | 'usado' | 'cancelado'; usado_em: string | null;
  ingresso_lotes: { nome: string } | null;
  eventos: { id: string; titulo: string; data_inicio: string; data_fim: string | null; foto_capa_url: string | null; locais: { nome: string } | null } | null;
  ingresso_pedidos: { status: string; expira_em: string; pago_em: string | null; total_centavos: number } | null;
};

export async function meusIngressos(): Promise<MeuIngresso[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  // Só os da própria pessoa (a casa também enxerga os ingressos das festas dela pela RLS).
  const { data, error } = await (supabase.from('ingressos') as any)
    .select('id, pedido_id, cortesia, titular, meia, preco_centavos, codigo, status, usado_em, ingresso_lotes(nome), eventos(id, titulo, data_inicio, data_fim, foto_capa_url, locais(nome)), ingresso_pedidos(status, expira_em, pago_em, total_centavos)')
    .eq('user_id', u.user.id).eq('cortesia_resgatar', false)
    .order('created_at', { ascending: false }).limit(100);
  if (error) return [];
  // Reserva vencida sem pagamento não aparece.
  return ((data as MeuIngresso[]) || []).filter((i) => i.status !== 'reservado' || (i.ingresso_pedidos?.status === 'pendente' && new Date(i.ingresso_pedidos.expira_em).getTime() > Date.now()));
}

/** Pode pedir reembolso pelo app? (mesma regra do banco: 7 dias depois da compra e até 48h antes da festa) */
export function podeReembolsar(i: MeuIngresso) {
  const p = i.ingresso_pedidos;
  if (!p || p.status !== 'pago' || !p.total_centavos || !p.pago_em || i.status !== 'valido' || i.cortesia) return false;
  return Date.now() - new Date(p.pago_em).getTime() < 7 * 864e5 && !!i.eventos && new Date(i.eventos.data_inicio).getTime() - Date.now() > 48 * 36e5;
}
