// Volta do login do Instagram: troca o "code" pelo token curto, depois pelo token longo (60 dias) e guarda (só o servidor lê).
import { admin, APP_DEEP_LINK, paginaSimples } from '../../../../lib/mercadoPago';
import { credenciaisIg, IG_GRAPH, IG_TOKEN, redirectUriIg } from '../../../../lib/instagram';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const code = (p.get('code') || '').replace(/#_$/, '');
  const estado = p.get('state') || '';
  const voltar = { href: `${APP_DEEP_LINK}parceiro/espaco`, rotulo: 'Voltar ao app' };
  if (!code) return paginaSimples('Conexão cancelada', 'Nada foi conectado. Volte ao app quando quiser tentar de novo.', voltar);
  try {
    const sb = admin();
    const { data: est } = await sb.from('ig_oauth_estados').select('local_id, user_id, criado_em').eq('estado', estado).maybeSingle();
    const e = est as { local_id: string; user_id: string; criado_em: string } | null;
    if (!e || Date.now() - new Date(e.criado_em).getTime() > 15 * 60 * 1000) {
      return paginaSimples('Link vencido', 'Volte ao app e toque de novo em "Conectar Instagram".');
    }
    const { id, secret } = credenciaisIg();
    const form = new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'authorization_code', redirect_uri: redirectUriIg(req), code });
    const r1 = await fetch(IG_TOKEN, { method: 'POST', body: form });
    const curto = await r1.json();
    if (!r1.ok || !curto.access_token) {
      return paginaSimples('Não deu para conectar', curto?.error_message || 'O Instagram recusou a conexão. A conta precisa ser profissional (Empresa ou Criador de conteúdo).', voltar);
    }
    const r2 = await fetch(`${IG_GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(secret)}&access_token=${encodeURIComponent(curto.access_token)}`);
    const longo = await r2.json();
    const token: string = longo.access_token || curto.access_token;
    const expira = new Date(Date.now() + (longo.expires_in || 3600) * 1000).toISOString();
    const r3 = await fetch(`${IG_GRAPH}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`);
    const eu = r3.ok ? await r3.json() : {};
    const { error } = await sb.from('ig_contas').upsert({
      local_id: e.local_id, ig_user_id: String(eu.user_id || curto.user_id), username: eu.username || null,
      access_token: token, expira_em: expira, conectado_por: e.user_id, conectado_em: new Date().toISOString(), renovado_em: null,
    }, { onConflict: 'local_id' });
    await sb.from('ig_oauth_estados').delete().eq('estado', estado);
    if (error) return paginaSimples('Não deu para salvar', error.message, voltar);
    return paginaSimples('Instagram conectado!', `${eu.username ? `@${eu.username} está ligado à sua casa. ` : ''}Agora, ao criar uma festa, toque em "Puxar do Instagram" e escolha o post do flyer.`, voltar);
  } catch (err) {
    return paginaSimples('Não deu para conectar', (err as Error).message, voltar);
  }
}
