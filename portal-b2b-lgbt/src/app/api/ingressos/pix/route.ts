// Fase 2 — Pix SEM sair do app: cria o pagamento Pix no Mercado Pago (token da casa + comissão do app)
// e devolve o "copia e cola" e o QR. O app mostra na tela e confere sozinho quando cai.
import { admin, doUsuario, MP_API, tokenDaCasa, tokenDoPedido, urlBase } from '../../../../lib/mercadoPago';

export async function POST(req: Request) {
  const token = tokenDoPedido(req);
  if (!token) return Response.json({ error: 'Entre na sua conta.' }, { status: 401 });
  let pedidoId = '';
  try { pedidoId = (await req.json())?.pedido_id || ''; } catch {}
  if (!pedidoId) return Response.json({ error: 'Pedido não informado.' }, { status: 400 });
  try {
    const { data: meu } = await doUsuario(token).from('ingresso_pedidos').select('id').eq('id', pedidoId).maybeSingle();
    if (!meu) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    const sb = admin();
    const { data: p } = await sb.from('ingresso_pedidos')
      .select('id, user_id, status, local_id, total_centavos, taxa_centavos, expira_em, eventos(titulo)').eq('id', pedidoId).maybeSingle();
    const ped = p as { id: string; user_id: string; status: string; local_id: string; total_centavos: number; taxa_centavos: number; expira_em: string; eventos: { titulo: string } | null } | null;
    if (!ped || ped.status !== 'pendente' || new Date(ped.expira_em).getTime() < Date.now()) {
      return Response.json({ error: 'A reserva venceu. Escolha os ingressos de novo.' }, { status: 409 });
    }
    // 140: total do Pix (taxa do Dicas + tarifa do Mercado Pago embutida no Pix)
    const { data: novoTotal } = await sb.rpc('definir_forma_pedido', { p_pedido: ped.id, p_forma: 'pix' });
    if (typeof novoTotal === 'number') ped.total_centavos = novoTotal;
    const conta = await tokenDaCasa(sb, { local_id: ped.local_id });
    if (!conta) return Response.json({ error: 'Esta casa ainda não conectou o Mercado Pago.' }, { status: 409 });
    const { data: u } = await sb.auth.admin.getUserById(ped.user_id);
    const email = u?.user?.email && /@/.test(u.user.email) ? u.user.email : `cliente+${ped.user_id.slice(0, 8)}@dicaslgbt.app`;
    const vence = new Date(new Date(ped.expira_em).getTime() + 5 * 60 * 1000);

    const r = await fetch(`${MP_API}/v1/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${conta.access_token}`, 'X-Idempotency-Key': `pix-${ped.id}-${ped.total_centavos}` },
      body: JSON.stringify({
        transaction_amount: ped.total_centavos / 100,
        description: `Ingressos · ${ped.eventos?.titulo || 'Festa'}`.slice(0, 200),
        payment_method_id: 'pix',
        payer: { email },
        application_fee: ped.taxa_centavos / 100,
        external_reference: ped.id,
        notification_url: `${urlBase(req)}/api/mp/webhook`,
        date_of_expiration: vence.toISOString().replace('Z', '-00:00'),
      }),
    });
    const pg = await r.json();
    const dados = pg?.point_of_interaction?.transaction_data;
    if (!r.ok || !dados?.qr_code) return Response.json({ error: pg?.message || 'O Mercado Pago não gerou o Pix.' }, { status: 502 });
    await sb.from('ingresso_pedidos').update({ mp_payment_id: String(pg.id) }).eq('id', ped.id);
    return Response.json({ copia_e_cola: dados.qr_code, qr_base64: dados.qr_code_base64, vence_em: vence.toISOString(), total_centavos: ped.total_centavos });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
