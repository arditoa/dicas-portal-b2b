// A casa toca em "Conectar Mercado Pago" no app → abre esta rota com o "estado" de uso único (mp_iniciar_conexao)
// → vai para o login do Mercado Pago. Depois volta em /api/mp/callback.
import { admin, credenciais, MP_AUTH, paginaSimples, redirectUri } from '../../../../lib/mercadoPago';

export async function GET(req: Request) {
  const estado = new URL(req.url).searchParams.get('estado') || '';
  try {
    const sb = admin();
    const { data } = await sb.from('mp_oauth_estados').select('estado, criado_em').eq('estado', estado).maybeSingle();
    if (!data || Date.now() - new Date((data as { criado_em: string }).criado_em).getTime() > 10 * 60 * 1000) {
      return paginaSimples('Link vencido', 'Volte ao app e toque de novo em "Conectar Mercado Pago".');
    }
    const { id } = credenciais();
    const u = new URL(MP_AUTH);
    u.searchParams.set('client_id', id);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('platform_id', 'mp');
    u.searchParams.set('state', estado);
    u.searchParams.set('redirect_uri', redirectUri(req));
    return Response.redirect(u.toString(), 302);
  } catch (e) {
    return paginaSimples('Ainda não dá para conectar', (e as Error).message);
  }
}
