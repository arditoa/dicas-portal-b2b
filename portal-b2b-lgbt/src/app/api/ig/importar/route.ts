// Puxa a imagem de um post do Instagram da casa para o storage do app (fotos-eventos/instagram/<local>/<post>.jpg)
// e devolve a URL pública + sugestões tiradas da legenda (título, data e hora).
// POST /api/ig/importar  { local, post }  com Authorization: Bearer <token da pessoa no app>
import { admin, doUsuario, tokenDoPedido } from '../../../../lib/mercadoPago';
import { IG_GRAPH, sugestoesDaLegenda, tokenIgDaCasa } from '../../../../lib/instagram';

export async function POST(req: Request) {
  const { local, post } = (await req.json().catch(() => ({}))) as { local?: string; post?: string };
  const jwt = tokenDoPedido(req);
  if (!local || !post || !/^\d+$/.test(post) || !jwt) return Response.json({ erro: 'Pedido inválido.' }, { status: 400 });
  const { data: pode } = await doUsuario(jwt).rpc('pode_instagram_da_casa', { p_local: local });
  if (!pode) return Response.json({ erro: 'Sem acesso a esta casa.' }, { status: 403 });
  const sb = admin();
  const conta = await tokenIgDaCasa(sb, local);
  if (!conta) return Response.json({ erro: 'Instagram não conectado ou vencido.', conectar: true }, { status: 409 });

  const tk = encodeURIComponent(conta.access_token);
  const r = await fetch(`${IG_GRAPH}/${post}?fields=id,caption,media_type,media_url,thumbnail_url,children{media_type,media_url}&access_token=${tk}`);
  const m = await r.json();
  if (!r.ok) return Response.json({ erro: m?.error?.message || 'Post não encontrado.' }, { status: 502 });
  // Carrossel: a 1ª imagem. Vídeo/Reels: a capa.
  const filho = m.children?.data?.find((c: { media_type: string }) => c.media_type === 'IMAGE');
  const url: string | undefined = m.media_type === 'CAROUSEL_ALBUM' ? filho?.media_url : m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url;
  if (!url) return Response.json({ erro: 'Este post não tem imagem para usar como flyer.' }, { status: 422 });

  const img = await fetch(url);
  if (!img.ok) return Response.json({ erro: 'Não deu para baixar a imagem.' }, { status: 502 });
  const bytes = new Uint8Array(await img.arrayBuffer());
  if (bytes.byteLength > 12 * 1024 * 1024) return Response.json({ erro: 'Imagem grande demais.' }, { status: 413 });
  const caminho = `instagram/${local}/${post}.jpg`;
  const { error } = await sb.storage.from('fotos-eventos').upload(caminho, bytes, { contentType: img.headers.get('content-type') || 'image/jpeg', upsert: true });
  if (error) return Response.json({ erro: error.message }, { status: 500 });
  const { data: pub } = sb.storage.from('fotos-eventos').getPublicUrl(caminho);
  return Response.json({ url: `${pub.publicUrl}?v=${Date.now()}`, sugestoes: sugestoesDaLegenda(m.caption) });
}
