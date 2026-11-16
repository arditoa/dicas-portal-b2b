// Lista os últimos posts do Instagram da casa (para escolher o flyer). Só para quem pode cuidar das festas da casa.
// GET /api/ig/posts?local=<id>  com Authorization: Bearer <token da pessoa no app>
import { admin, doUsuario, tokenDoPedido } from '../../../../lib/mercadoPago';
import { IG_GRAPH, PostIg, tokenIgDaCasa } from '../../../../lib/instagram';

export async function GET(req: Request) {
  const local = new URL(req.url).searchParams.get('local') || '';
  const jwt = tokenDoPedido(req);
  if (!local || !jwt) return Response.json({ erro: 'Entre na sua conta.' }, { status: 401 });
  const { data: pode } = await doUsuario(jwt).rpc('pode_instagram_da_casa', { p_local: local });
  if (!pode) return Response.json({ erro: 'Sem acesso a esta casa.' }, { status: 403 });
  const conta = await tokenIgDaCasa(admin(), local);
  if (!conta) return Response.json({ erro: 'Instagram não conectado ou vencido. Conecte de novo em Meu espaço.', conectar: true }, { status: 409 });
  const campos = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const r = await fetch(`${IG_GRAPH}/me/media?fields=${campos}&limit=30&access_token=${encodeURIComponent(conta.access_token)}`);
  const j = await r.json();
  if (!r.ok) return Response.json({ erro: j?.error?.message || 'O Instagram não respondeu.', conectar: j?.error?.code === 190 }, { status: 502 });
  const posts = ((j.data || []) as PostIg[]).map((p) => ({
    id: p.id, tipo: p.media_type, imagem: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
    legenda: (p.caption || '').slice(0, 300), link: p.permalink, quando: p.timestamp,
  })).filter((p) => !!p.imagem);
  return Response.json({ username: conta.username, posts });
}
