// Migração 131 — Mercado Pago (marketplace / split 1:1). Só roda no SERVIDOR (rotas /api), nunca no navegador.
// Variáveis na Vercel: MP_CLIENT_ID, MP_CLIENT_SECRET, MP_WEBHOOK_SECRET (opcional, recomendado),
// SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL (já existem).
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const MP_API = 'https://api.mercadopago.com';
export const MP_AUTH = 'https://auth.mercadopago.com/authorization';
export const APP_DEEP_LINK = 'dicaslgbt://';

export function urlBase(req: Request) {
  const u = new URL(req.url);
  return process.env.PORTAL_URL || `${u.protocol}//${u.host}`;
}
export const redirectUri = (req: Request) => `${urlBase(req)}/api/mp/callback`;

export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase do servidor não configurado.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function credenciais() {
  const id = process.env.MP_CLIENT_ID;
  const secret = process.env.MP_CLIENT_SECRET;
  if (!id || !secret) throw new Error('MP_CLIENT_ID / MP_CLIENT_SECRET não configurados na Vercel.');
  return { id, secret };
}

type Conta = { local_id: string; mp_user_id: number; access_token: string; refresh_token: string | null; expira_em: string | null };

// Token da casa; renova sozinho quando faltam menos de 7 dias para vencer.
export async function tokenDaCasa(sb: SupabaseClient, filtro: { local_id?: string; mp_user_id?: number }): Promise<Conta | null> {
  let q = sb.from('mp_contas').select('local_id, mp_user_id, access_token, refresh_token, expira_em');
  q = filtro.local_id ? q.eq('local_id', filtro.local_id) : q.eq('mp_user_id', filtro.mp_user_id!);
  const { data } = await q.maybeSingle();
  const c = data as Conta | null;
  if (!c) return null;
  const vence = c.expira_em ? new Date(c.expira_em).getTime() : Infinity;
  if (c.refresh_token && vence - Date.now() < 7 * 864e5) {
    const { id, secret } = credenciais();
    const r = await fetch(`${MP_API}/oauth/token`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'refresh_token', refresh_token: c.refresh_token }),
    });
    if (r.ok) {
      const t = await r.json();
      const nova = { access_token: t.access_token, refresh_token: t.refresh_token ?? c.refresh_token, expira_em: new Date(Date.now() + (t.expires_in || 15552000) * 1000).toISOString() };
      await sb.from('mp_contas').update(nova).eq('local_id', c.local_id);
      return { ...c, ...nova };
    }
  }
  return c;
}

// Confere a assinatura do aviso do Mercado Pago (x-signature: "ts=...,v1=...").
export function assinaturaValida(req: Request, dataId: string | null): boolean {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) return true; // sem segredo configurado: aceita (e confere o pagamento direto na API do MP)
  const sig = req.headers.get('x-signature') || '';
  const reqId = req.headers.get('x-request-id') || '';
  const partes = Object.fromEntries(sig.split(',').map((p) => p.trim().split('=') as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const manifesto = `id:${(dataId || '').toLowerCase()};request-id:${reqId};ts:${partes.ts};`;
  const h = crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(partes.v1)); } catch { return false; }
}

export function paginaSimples(titulo: string, texto: string, link?: { href: string; rotulo: string }) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><style>body{background:#0B0B0E;color:#fff;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}
.c{max-width:420px}h1{font-size:22px}p{color:#A0A0B2;line-height:1.5}a{display:inline-block;margin-top:16px;background:#E1306C;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800}</style></head>
<body><div class="c"><h1>${esc(titulo)}</h1><p>${esc(texto)}</p>${link ? `<a href="${esc(link.href)}">${esc(link.rotulo)}</a>` : ''}</div></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// Cliente com o login da PESSOA (para conferir que o pedido é dela, respeitando a RLS)
export function doUsuario(token: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  });
}
export const tokenDoPedido = (req: Request) => (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
