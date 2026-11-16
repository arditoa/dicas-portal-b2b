// Fase 2 — Reembolso pelo app. Quem pode:
//   • o comprador: até 7 dias depois da compra e até 48h antes da festa (direito de arrependimento; devolve TUDO, inclusive a taxa);
//   • a casa (quem vende na festa): qualquer pedido, a qualquer hora (ex.: festa cancelada).
// Devolve no Mercado Pago com o token da casa e só então cancela os ingressos.
import { admin, doUsuario, MP_API, tokenDaCasa, tokenDoPedido } from '../../../../lib/mercadoPago';

export async function POST(req: Request) {
  const token = tokenDoPedido(req);
  if (!token) return Response.json({ error: 'Entre na sua conta.' }, { status: 401 });
  let pedidoId = '';
  try { pedidoId = (await req.json())?.pedido_id || ''; } catch {}
  if (!pedidoId) return Response.json({ error: 'Pedido não informado.' }, { status: 400 });
  try {
    const sb = admin();
    const { data: p } = await sb.from('ingresso_pedidos').select('id, user_id, evento_id, local_id, status, total_centavos, mp_payment_id').eq('id', pedidoId).maybeSingle();
    const ped = p as { id: string; user_id: string; evento_id: string; local_id: string; status: string; total_centavos: number; mp_payment_id: string | null } | null;
    if (!ped) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    if (ped.status !== 'pago') return Response.json({ error: 'Este pedido não está pago.' }, { status: 409 });

    const usuario = doUsuario(token);
    const { data: quem } = await usuario.auth.getUser();
    const uid = quem?.user?.id;
    let por: 'comprador' | 'casa' | null = null;
    const { data: ehCasa } = await usuario.rpc('pode_vender_no_evento', { p_evento: ped.evento_id });
    if (ehCasa) por = 'casa';
    else if (uid === ped.user_id) {
      const { data: pode } = await usuario.rpc('pode_pedir_reembolso', { p_pedido: ped.id });
      if (!pode) return Response.json({ error: 'O reembolso pelo app vale até 7 dias depois da compra e até 48h antes da festa. Fale com a casa.' }, { status: 409 });
      por = 'comprador';
    }
    if (!por) return Response.json({ error: 'Sem permissão.' }, { status: 403 });

    if (ped.total_centavos > 0) {
      if (!ped.mp_payment_id) return Response.json({ error: 'Pagamento não encontrado no Mercado Pago.' }, { status: 409 });
      const conta = await tokenDaCasa(sb, { local_id: ped.local_id });
      if (!conta) return Response.json({ error: 'A conta Mercado Pago da casa não está conectada.' }, { status: 409 });
      const r = await fetch(`${MP_API}/v1/payments/${ped.mp_payment_id}/refunds`, {
        method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${conta.access_token}`, 'X-Idempotency-Key': `reemb-${ped.id}` },
        body: JSON.stringify({}),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return Response.json({ error: j?.message?.includes('amount') ? 'A casa está sem saldo no Mercado Pago para devolver agora.' : j?.message || 'O Mercado Pago não fez o reembolso.' }, { status: 502 });
    }
    await sb.rpc('reembolsar_pedido_ingresso', { p_pedido: ped.id, p_por: por });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
