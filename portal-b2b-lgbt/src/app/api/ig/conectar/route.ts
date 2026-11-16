// A casa toca em "Conectar Instagram" no app → abre esta rota com o "estado" de uso único (ig_iniciar_conexao)
// → vai para o login do Instagram. Depois volta em /api/ig/callback.
import { admin, paginaSimples } from '../../../../lib/mercadoPago';
import { credenciaisIg, IG_AUTH, redirectUriIg } from '../../../../lib/instagram';

export async function GET(req: Request) {
  const estado = new URL(req.url).searchParams.get('estado') || '';
  try {
    const sb = admin();
    const { data } = await sb.from('ig_oauth_estados').select('criado_em').eq('estado', estado).maybeSingle();
    if (!data || Date.now() - new Date((data as { criado_em: string }).criado_em).getTime() > 10 * 60 * 1000) {
      return paginaSimples('Link vencido', 'Volte ao app e toque de novo em "Conectar Instagram".');
    }
    const { id } = credenciaisIg();
    const u = new URL(IG_AUTH);
    u.searchParams.set('client_id', id);
    u.searchParams.set('redirect_uri', redirectUriIg(req));
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'instagram_business_basic');
    u.searchParams.set('state', estado);
    return Response.redirect(u.toString(), 302);
  } catch (e) {
    return paginaSimples('Ainda não dá para conectar', (e as Error).message);
  }
}
