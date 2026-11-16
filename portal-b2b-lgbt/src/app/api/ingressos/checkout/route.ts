// O app reservou (reservar_ingressos) e pede o link de pagamento: cria a "preferência" no Mercado Pago
// com o token DA CASA e a comissão do app (marketplace_fee). Devolve o link do Checkout Pro.
import { admin, doUsuario, MP_API, tokenDaCasa, urlBase } from '../../../../lib/mercadoPago';

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return Response.json({ error: 'Entre na sua conta.' }, { status: 401 });
  let pedidoId = '';
  let origem = 'app'; // 'site' = comprou pela página pública (/e/<festa>): volta para /meus-ingressos no navegador
  try { const b = await req.json(); pedidoId = b?.pedido_id || ''; origem = b?.origem === 'site' ? 'site' : 'app'; } catch {}
  if (!pedidoId) return Response.json({ error: 'Pedido não informado.' }, { status: 400 });

  try {
    // 1) O pedido é mesmo da pessoa logada?
    const { data: meu } = await doUsuario(token).from('ingresso_pedidos').select('id').eq('id', pedidoId).maybeSingle();
    if (!meu) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });

    // 2) Dados completos com a chave do servidor
    const sb = admin();
    const { data: p } = await sb.from('ingresso_pedidos')
      .select('id, status, evento_id, local_id, total_centavos, taxa_centavos, expira_em, eventos(titulo)')
      .eq('id', pedidoId).maybeSingle();
    const ped = p as { id: string; status: string; local_id: string; total_centavos: number; taxa_centavos: number; expira_em: string; eventos: { titulo: string } | null } | null;
    if (!ped) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    if (ped.status !== 'pendente') return Response.json({ error: ped.status === 'pago' ? 'Este pedido já foi pago.' : 'Este pedido venceu. Escolha os ingressos de novo.' }, { status: 409 });
    if (new Date(ped.expira_em).getTime() < Date.now()) return Response.json({ error: 'A reserva venceu. Escolha os ingressos de novo.' }, { status: 409 });
    // 140: cartão tem tarifa maior no Mercado Pago; o total é recalculado para a casa receber cheio
    const { data: novoTotal } = await sb.rpc('definir_forma_pedido', { p_pedido: ped.id, p_forma: 'cartao' });
    if (typeof novoTotal === 'number') ped.total_centavos = novoTotal;
    const conta = await tokenDaCasa(sb, { local_id: ped.local_id });
    if (!conta) return Response.json({ error: 'Esta casa ainda não conectou o Mercado Pago.' }, { status: 409 });

    const { count } = await sb.from('ingressos').select('id', { count: 'exact', head: true }).eq('pedido_id', ped.id);
    const base = urlBase(req);
    const retorno = origem === 'site' ? `${base}/meus-ingressos?pedido=${ped.id}` : `${base}/ingresso/retorno?pedido=${ped.id}`;
    const r = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${conta.access_token}`, 'X-Idempotency-Key': `pref-${ped.id}-${ped.total_centavos}` },
      body: JSON.stringify({
        items: [{ id: ped.id, title: `${count || 1} ingresso(s) · ${ped.eventos?.titulo || 'Festa'}`.slice(0, 250), quantity: 1, currency_id: 'BRL', unit_price: ped.total_centavos / 100 }],
        marketplace_fee: ped.taxa_centavos / 100,
        external_reference: ped.id,
        notification_url: `${base}/api/mp/webhook`,
        back_urls: { success: retorno, pending: retorno, failure: retorno },
        auto_return: 'approved',
        statement_descriptor: 'DICASLGBT',
        expires: true,
        expiration_date_to: new Date(new Date(ped.expira_em).getTime() + 5 * 60 * 1000).toISOString(),
      }),
    });
    const pref = await r.json();
    if (!r.ok || !pref.init_point) return Response.json({ error: pref?.message || 'O Mercado Pago não criou o pagamento.' }, { status: 502 });
    await sb.from('ingresso_pedidos').update({ mp_preference_id: pref.id }).eq('id', ped.id);
    return Response.json({ url: pref.init_point });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
