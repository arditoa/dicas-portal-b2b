// Envio de fotos do Modo parceiro para o Storage do Supabase (mesmos buckets do portal).
//   fotos-locais: "<local_id>/..." (agenda, página)  ·  fotos-eventos: "<local_id>/..." (festas)
// Limite do bucket: 8 MB e só JPG/PNG/WebP/GIF/HEIC (migração 084).
import { supabase } from '../supabase';

export type Bucket = 'fotos-locais' | 'fotos-eventos';
export const LIMITE_MB = 8;

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif' };

export async function enviarFoto(bucket: Bucket, pasta: string, prefixo: string, uri: string, tipo?: string | null): Promise<string> {
  const contentType = tipo && EXT[tipo] ? tipo : 'image/jpeg';
  let buf: ArrayBuffer;
  try {
    buf = await (await fetch(uri)).arrayBuffer();
  } catch {
    throw new Error('Não deu para ler a foto. Tente outra.');
  }
  if (buf.byteLength > LIMITE_MB * 1024 * 1024) throw new Error(`A foto passou de ${LIMITE_MB} MB. Escolha uma menor.`);
  const caminho = `${pasta}/${prefixo}-${Date.now()}.${EXT[contentType]}`;
  const { error } = await supabase.storage.from(bucket).upload(caminho, buf, { contentType, cacheControl: '3600', upsert: false });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('row-level') || m.includes('policy') || m.includes('unauthorized')) throw new Error('Seu acesso não permite enviar fotos para este local.');
    if (m.includes('size') || m.includes('too large')) throw new Error(`A foto passou de ${LIMITE_MB} MB. Escolha uma menor.`);
    if (m.includes('mime') || m.includes('type')) throw new Error('Esse tipo de arquivo não é aceito. Use JPG ou PNG.');
    throw new Error('Não deu para enviar a foto agora. Confira a internet e tente de novo.');
  }
  return supabase.storage.from(bucket).getPublicUrl(caminho).data.publicUrl;
}
