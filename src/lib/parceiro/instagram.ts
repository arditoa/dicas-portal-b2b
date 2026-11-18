// Migração 138 — Instagram da casa: conectar (login oficial do Instagram, pelo portal) e puxar o flyer de um post.
import { Linking } from 'react-native';
import { URL_PORTAL } from '../parceiroMenu';
import { supabase } from '../supabase';

export type StatusIg = { conectado: boolean; username?: string | null; desde?: string; vencido?: boolean };
export type PostIg = { id: string; tipo: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'; imagem: string; legenda: string; link: string; quando: string };
export type Sugestoes = { titulo: string | null; descricao: string | null; data: string | null; hora: string | null };

export async function statusInstagram(localId: string): Promise<StatusIg | null> {
  const { data, error } = await supabase.rpc('ig_status_da_casa', { p_local: localId });
  return error ? null : ((data as StatusIg) || null);
}
export async function conectarInstagram(localId: string) {
  const { data, error } = await supabase.rpc('ig_iniciar_conexao', { p_local: localId });
  if (error || !data) throw new Error(error?.message?.includes('ig_iniciar_conexao') ? 'Esta função ainda não está ligada.' : error?.message || 'Não deu agora.');
  await Linking.openURL(`${URL_PORTAL}/api/ig/conectar?estado=${data}`);
}
export async function desconectarInstagram(localId: string) {
  await supabase.rpc('ig_desconectar', { p_local: localId });
}

async function token() {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error('Entre na sua conta de novo.');
  return t;
}
export async function postsDoInstagram(localId: string): Promise<{ username: string | null; posts: PostIg[] }> {
  const r = await fetch(`${URL_PORTAL}/api/ig/posts?local=${localId}`, { headers: { Authorization: `Bearer ${await token()}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e: any = new Error(j.erro || 'Não deu para abrir o Instagram.'); e.conectar = !!j.conectar; throw e; }
  return j;
}
export async function importarDoInstagram(localId: string, postId: string): Promise<{ url: string; sugestoes: Sugestoes }> {
  const r = await fetch(`${URL_PORTAL}/api/ig/importar`, {
    method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ local: localId, post: postId }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || 'Não deu para puxar o flyer.');
  return j;
}
