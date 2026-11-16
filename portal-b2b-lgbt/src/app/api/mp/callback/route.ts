// Volta do login do Mercado Pago: troca o "code" pelo token da casa e guarda (só o servidor lê).
import { admin, APP_DEEP_LINK, credenciais, MP_API, paginaSimples, redirectUri } from '../../../../lib/mercadoPago';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const code = p.get('code');
  const estado = p.get('state') || '';
  if (!code) return paginaSimples('Conexão cancelada', 'Nada foi conectado. Volte ao app quando quiser tentar de novo.', { href: `${APP_DEEP_LINK}parceiro/ingressos`, rotulo: 'Voltar ao app' });
  try {
    const sb = admin();
    const { data: est } = await sb.from('mp_oauth_estados').select('estado, local_id, user_id, criado_em').eq('estado', estado).maybeSingle();
    const e = est as { local_id: string; user_id: string; criado_em: string } | null;
    if (!e || Date.now() - new Date(e.criado_em).getTime() > 15 * 60 * 1000) {
      return paginaSimples('Link vencido', 'Volte ao app e toque de novo em "Conectar Mercado Pago".');
    }
    const { id, secret } = credenciais();
    const r = await fetch(`${MP_API}/oauth/token`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'authorization_code', code, redirect_uri: redirectUri(req) }),
    });
    const t = await r.json();
    if (!r.ok || !t.access_token) return paginaSimples('Não deu para conectar', t?.message || 'O Mercado Pago recusou a conexão. Tente de novo.');
    const { error } = await sb.from('mp_contas').upsert({
      local_id: e.local_id, mp_user_id: t.user_id, access_token: t.access_token, refresh_token: t.refresh_token ?? null,
      public_key: t.public_key ?? null, expira_em: new Date(Date.now() + (t.expires_in || 15552000) * 1000).toISOString(),
      conectado_por: e.user_id, conectado_em: new Date().toISOString(),
    }, { onConflict: 'local_id' });
    await sb.from('mp_oauth_estados').delete().eq('estado', estado);
    if (error) return paginaSimples('Não deu para salvar', error.message.includes('mp_user_id') ? 'Esta conta Mercado Pago já está ligada a outra casa.' : error.message);
    return paginaSimples('Mercado Pago conectado!', 'A sua casa já pode vender ingressos pelo app. O dinheiro cai direto na sua conta Mercado Pago.',
      { href: `${APP_DEEP_LINK}parceiro/ingressos?conectado=1`, rotulo: 'Voltar ao app' });
  } catch (err) {
    return paginaSimples('Não deu para conectar', (err as Error).message);
  }
}
