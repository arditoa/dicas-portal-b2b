// Aviso do Mercado Pago (pagamento aprovado, estornado...). Confere o pagamento direto na API com o token
// da casa e só então emite (ou cancela) os ingressos.
import { admin, assinaturaValida, MP_API, tokenDaCasa } from '../../../../lib/mercadoPago';

export async function POST(req: Request) {
  const url = new URL(req.url);
  let corpo: any = {};
  try { corpo = await req.json(); } catch {}
  const tipo = corpo?.type || url.searchParams.get('type') || url.searchParams.get('topic');
  const dataId = String(corpo?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || '');
  if (tipo !== 'payment' || !dataId) return new Response('ok');
  if (!assinaturaValida(req, dataId)) return new Response('assinatura inválida', { status: 401 });

  try {
    const sb = admin();
    const conta = await tokenDaCasa(sb, { mp_user_id: Number(corpo?.user_id) });
    if (!conta) return new Response('ok'); // conta desconhecida: ignora
    const r = await fetch(`${MP_API}/v1/payments/${dataId}`, { headers: { Authorization: `Bearer ${conta.access_token}` } });
    if (!r.ok) return new Response('tentar de novo', { status: 500 });
    const pg = await r.json();
    const pedido = pg.external_reference as string | undefined;
    if (!pedido) return new Response('ok');
    if (pg.status === 'approved') {
      await sb.rpc('confirmar_pedido_ingresso', { p_pedido: pedido, p_payment_id: String(pg.id), p_valor_centavos: Math.round(Number(pg.transaction_amount) * 100) });
    } else if (pg.status === 'refunded' || pg.status === 'charged_back' || pg.status === 'cancelled') {
      const { data: ped } = await sb.from('ingresso_pedidos').select('status').eq('id', pedido).maybeSingle();
      // Só se ainda estiver pago (reembolso feito pelo app já marcou quem pediu).
      if ((ped as { status: string } | null)?.status === 'pago') await sb.rpc('reembolsar_pedido_ingresso', { p_pedido: pedido, p_por: 'mercado_pago' });
    }
    return new Response('ok');
  } catch {
    return new Response('tentar de novo', { status: 500 });
  }
}
