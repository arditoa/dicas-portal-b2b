// Rodada 148 — Minhas memórias e Fotos da galera (migração 122).
// A foto fica guardada só para a pessoa. Ela escolhe, em autorizações separadas e registradas:
//   • enviar para a casa (ver e baixar, uso interno);
//   • a casa pode publicar (redes da casa) — exige confirmar que todas as pessoas da foto concordam.
// Pode retirar ou apagar quando quiser; a foto vence em 90 dias.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

export const TEXTO_VERSAO = 'memorias-v1-2026-11-15';
export const TEXTO_ENVIAR = (casa: string) => `Autorizo ${casa} a ver e baixar esta foto para uso interno da casa.`;
export const TEXTO_PUBLICAR = (casa: string) =>
  `Autorizo ${casa} a publicar esta foto nas redes sociais e materiais da casa, sem pagamento, até eu retirar esta autorização.`;
export const TEXTO_VERSAO_MARCA = 'memorias-marca-v1-2026-11-15';
export const TEXTO_ENVIAR_MARCA = (marca: string) => `Enviar esta foto para ${marca}. Só a marca e a equipe Dicas veem; não fica pública.`;
export const TEXTO_PUBLICAR_MARCA = (marca: string) =>
  `${marca} pode postar esta foto nas redes sociais dela, sem pagamento, até eu retirar esta autorização.`;
export const TEXTO_TODOS = 'Confirmo que todas as pessoas que aparecem na foto têm 18 anos ou mais e concordam com a publicação.';
export const TEXTO_RODAPE =
  'Você pode retirar as autorizações ou apagar a foto quando quiser em Conta › Minhas memórias. Ao retirar, a casa deixa de ter acesso no app; o que já foi publicado deve ser removido pela casa quando você pedir. A foto vence em 90 dias.';

export type Memoria = {
  id: string; user_id: string; local_id: string | null; caminho: string; legenda: string | null;
  enviar_para_casa: boolean; casa_pode_publicar: boolean; todos_concordam: boolean;
  acao_id?: string | null; enviar_para_marca?: boolean; marca_pode_publicar?: boolean; enviado_marca_em?: string | null; publicar_marca_em?: string | null;
  enviado_em: string | null; publicar_em: string | null; expira_em: string; created_at: string;
  locais?: { nome: string } | null; url?: string | null;
};

const BUCKET = 'memorias';

export async function salvarMemoria(p: {
  userId: string; localId: string | null; acaoId?: string | null; uri: string; legenda?: string;
  enviar: boolean; publicar: boolean; todos: boolean;
}): Promise<void> {
  const buf = await (await fetch(p.uri)).arrayBuffer();
  if (buf.byteLength > 6 * 1024 * 1024) throw new Error('A foto passou de 6 MB. Tente de novo.');
  const caminho = `${p.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(caminho, buf, { contentType: 'image/jpeg', upsert: false });
  if (up.error) throw new Error('Não deu para guardar a foto agora. Tente de novo em instantes.');
  const { error } = await (supabase.from('memorias') as any).insert({
    user_id: p.userId, local_id: p.localId, acao_id: p.acaoId ?? null, caminho, legenda: p.legenda?.trim() || null,
    enviar_para_casa: p.enviar, casa_pode_publicar: p.enviar && p.publicar, todos_concordam: p.todos, texto_versao: TEXTO_VERSAO,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw new Error(error.message || 'Não deu para guardar a foto.');
  }
}

/** Foto com a moldura enviada para a marca (migração 127). Fica também em Minhas memórias. */
export async function enviarFotoParaMarca(p: { userId: string; acaoId: string; marca: string; uri: string; publicar: boolean }): Promise<void> {
  const buf = await (await fetch(p.uri)).arrayBuffer();
  if (buf.byteLength > 6 * 1024 * 1024) throw new Error('A foto passou de 6 MB. Tente de novo.');
  const caminho = `${p.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(caminho, buf, { contentType: 'image/jpeg', upsert: false });
  if (up.error) throw new Error('Não deu para enviar a foto agora. Tente de novo em instantes.');
  const { error } = await (supabase.from('memorias') as any).insert({
    user_id: p.userId, local_id: null, acao_id: p.acaoId, caminho, legenda: `Foto com a moldura · ${p.marca}`.slice(0, 140),
    enviar_para_casa: false, casa_pode_publicar: false, todos_concordam: true,
    enviar_para_marca: true, marca_pode_publicar: p.publicar, texto_versao: TEXTO_VERSAO_MARCA,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw new Error(error.message || 'Não deu para enviar a foto.');
  }
}

export async function comUrls(lista: Memoria[]): Promise<Memoria[]> {
  if (!lista.length) return lista;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(lista.map((m) => m.caminho), 3600);
  const mapa = new Map((data || []).map((d: any) => [d.path, d.signedUrl]));
  return lista.map((m) => ({ ...m, url: mapa.get(m.caminho) || null }));
}

export async function minhasMemorias(userId: string): Promise<Memoria[]> {
  const { data, error } = await (supabase.from('memorias') as any)
    .select('id, user_id, local_id, acao_id, caminho, legenda, enviar_para_casa, casa_pode_publicar, todos_concordam, enviado_em, publicar_em, enviar_para_marca, marca_pode_publicar, enviado_marca_em, publicar_marca_em, expira_em, created_at, locais(nome)')
    .eq('user_id', userId).gt('expira_em', new Date().toISOString()).order('created_at', { ascending: false }).limit(120);
  if (error) return [];
  return comUrls((data as Memoria[]) || []);
}

export async function fotosDaCasa(localId: string): Promise<Memoria[]> {
  const { data, error } = await (supabase.from('memorias') as any)
    .select('id, user_id, local_id, caminho, legenda, enviar_para_casa, casa_pode_publicar, todos_concordam, enviado_em, publicar_em, expira_em, created_at')
    .eq('local_id', localId).eq('enviar_para_casa', true).order('created_at', { ascending: false }).limit(120);
  if (error) return [];
  return comUrls((data as Memoria[]) || []);
}

export async function mudarAutorizacao(id: string, campos: { enviar_para_casa?: boolean; casa_pode_publicar?: boolean; todos_concordam?: boolean; enviar_para_marca?: boolean; marca_pode_publicar?: boolean }) {
  const { error } = await (supabase.from('memorias') as any).update({ ...campos, texto_versao: TEXTO_VERSAO }).eq('id', id);
  if (error) throw new Error(error.message || 'Não deu para salvar.');
}

export async function apagarMemoria(m: Memoria) {
  const { error } = await (supabase.from('memorias') as any).delete().eq('id', m.id);
  if (error) throw new Error(error.message || 'Não deu para apagar.');
  await supabase.storage.from(BUCKET).remove([m.caminho]);
}

/** Baixa a foto para o celular e abre o compartilhar (salvar, Instagram, WhatsApp…). */
export async function compartilharFoto(url: string, nome = 'foto'): Promise<void> {
  const destino = `${FileSystem.cacheDirectory}${nome}-${Date.now()}.jpg`;
  const r = await FileSystem.downloadAsync(url, destino);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este celular não permite compartilhar daqui.');
  await Sharing.shareAsync(r.uri, { mimeType: 'image/jpeg' });
}

export const dataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
