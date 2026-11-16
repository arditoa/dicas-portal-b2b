// Migração 138 — Instagram da casa (Business Login for Instagram, permissão instagram_business_basic).
// Só roda no SERVIDOR. Variáveis na Vercel: IG_APP_ID e IG_APP_SECRET (App Dashboard › Instagram › API setup with Instagram login).
// Redirecionamento cadastrado na Meta: <PORTAL_URL>/api/ig/callback
import { SupabaseClient } from '@supabase/supabase-js';
import { urlBase } from './mercadoPago';

export const IG_AUTH = 'https://www.instagram.com/oauth/authorize';
export const IG_TOKEN = 'https://api.instagram.com/oauth/access_token';
export const IG_GRAPH = 'https://graph.instagram.com';
export const redirectUriIg = (req: Request) => `${urlBase(req)}/api/ig/callback`;

export function credenciaisIg() {
  const id = process.env.IG_APP_ID;
  const secret = process.env.IG_APP_SECRET;
  if (!id || !secret) throw new Error('IG_APP_ID / IG_APP_SECRET não configurados na Vercel.');
  return { id, secret };
}

type ContaIg = { local_id: string; ig_user_id: string; username: string | null; access_token: string; expira_em: string | null; renovado_em: string | null };

// Token da casa. O token longo vale 60 dias; renovamos quando já tem mais de 1 dia e faltam menos de 20 para vencer.
export async function tokenIgDaCasa(sb: SupabaseClient, localId: string): Promise<ContaIg | null> {
  const { data } = await sb.from('ig_contas').select('local_id, ig_user_id, username, access_token, expira_em, renovado_em').eq('local_id', localId).maybeSingle();
  const c = data as ContaIg | null;
  if (!c) return null;
  const vence = c.expira_em ? new Date(c.expira_em).getTime() : Infinity;
  if (vence < Date.now()) return null;
  if (vence - Date.now() < 20 * 864e5) {
    const r = await fetch(`${IG_GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(c.access_token)}`);
    if (r.ok) {
      const t = await r.json();
      const nova = { access_token: t.access_token, expira_em: new Date(Date.now() + (t.expires_in || 5184000) * 1000).toISOString(), renovado_em: new Date().toISOString() };
      await sb.from('ig_contas').update(nova).eq('local_id', localId);
      return { ...c, ...nova };
    }
  }
  return c;
}

export type PostIg = { id: string; caption?: string; media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'; media_url?: string; thumbnail_url?: string; permalink: string; timestamp: string };

// Sugestões a partir da legenda: título (1ª linha), data (dd/mm) e hora (23h, 23:30)
export function sugestoesDaLegenda(legenda: string | undefined) {
  const txt = (legenda || '').trim();
  const titulo = txt.split('\n').map((l) => l.replace(/[#@][\w.]+/g, '').trim()).find((l) => l.length >= 3)?.slice(0, 90) || null;
  const d = txt.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  const h = txt.match(/\b(\d{1,2})(?:h|:)(\d{2})?\b/i);
  let data: string | null = null;
  if (d) {
    const dia = Number(d[1]), mes = Number(d[2]);
    const hoje = new Date();
    let ano = d[3] ? Number(d[3].length === 2 ? '20' + d[3] : d[3]) : hoje.getFullYear();
    if (!d[3] && new Date(ano, mes - 1, dia).getTime() < hoje.getTime() - 864e5) ano += 1;
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  const hora = h && Number(h[1]) <= 23 ? `${String(Number(h[1])).padStart(2, '0')}:${h[2] || '00'}` : null;
  return { titulo, descricao: txt.slice(0, 1200) || null, data, hora };
}
