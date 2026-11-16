// Página pública da festa com venda de ingressos (/e/<id da festa>): para mandar no WhatsApp, Instagram e bio.
// Quem não tem o app compra aqui (Pix ou cartão pelo Mercado Pago). O link mostra flyer e nome ao ser compartilhado.
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import PaginaFesta from '../../../components/ingressos/PaginaFesta';

type Festa = { id: string; titulo: string; descricao: string | null; data_inicio: string; foto_capa_url: string | null; locais: { nome: string; cidade: string | null } | null };

async function lerFesta(id: string): Promise<Festa | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await sb.from('eventos').select('id, titulo, descricao, data_inicio, foto_capa_url, locais(nome, cidade)').eq('id', id).eq('status', 'aprovado').maybeSingle();
  return (data as unknown as Festa) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const f = await lerFesta((await params).id);
  if (!f) return { title: 'Festa · Dicas LGBT+' };
  const quando = new Date(f.data_inicio).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const desc = `${quando}${f.locais ? ` · ${f.locais.nome}` : ''}. Ingressos pelo Dicas LGBT+.`;
  return {
    title: `${f.titulo} · Ingressos`,
    description: desc,
    openGraph: { title: f.titulo, description: desc, images: f.foto_capa_url ? [{ url: f.foto_capa_url }] : undefined, type: 'website' },
    twitter: { card: f.foto_capa_url ? 'summary_large_image' : 'summary', title: f.titulo, description: desc },
  };
}

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return <PaginaFesta id={(await params).id} />;
}
