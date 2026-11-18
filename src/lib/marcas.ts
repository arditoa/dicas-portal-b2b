// Rodada 148 — Marcas no app (migração 118): ações de marca no ar hoje.
// Uma busca só (com cache de 5 min) serve a faixa "Marcas que apoiam", a página /marca/[id] e o selo "Apoio".
// Sem a migração 118, a função não existe e nada aparece (o app segue normal).
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { supabase } from './supabase';

export type AcaoVitrine = {
  id: string; marca: string; nome: string; chamada: string | null; cor: string | null; logo_url: string | null;
  inicio: string; fim: string; cupom_ids: string[]; festa_ids: string[];
  // Migração 125 (podem vir vazios antes dela)
  moldura_url?: string | null; moldura_texto?: string | null; brinde_pergunta?: string | null; brinde_opcoes?: string[] | null;
  participacao?: 'foto' | 'checkin' | 'ambos' | null;
  // Migração 128 — brinde próprio, onde vale e quanto resta
  brinde?: string | null; regra?: string | null; evento_id?: string | null; local_ids?: string[] | null;
  feitos?: number | null; restam?: number | null;
};

// "Restam 37" (com limite) ou "12 já ganharam" (sem limite). O total nunca aparece para o público.
export function textoRestam(a: { restam?: number | null; feitos?: number | null }): string | null {
  if (a.restam != null) return a.restam > 0 ? `Restam ${a.restam}` : 'Acabou';
  if (a.feitos) return `${a.feitos} já ${a.feitos === 1 ? 'ganhou' : 'ganharam'}`;
  return null;
}

let cache: { em: number; lista: AcaoVitrine[] } | null = null;
let pedido: Promise<AcaoVitrine[]> | null = null;

// Cache curto (1 min) e nunca guarda lista vazia: uma ação nova aparece na próxima vez que a tela abre.
const ouvintes = new Set<(l: AcaoVitrine[]) => void>();

export function buscarMarcasAtivas(forcar = false): Promise<AcaoVitrine[]> {
  if (!forcar && cache && cache.lista.length > 0 && Date.now() - cache.em < 60 * 1000) return Promise.resolve(cache.lista);
  if (pedido) return pedido;
  pedido = (async () => {
    const { data, error } = await supabase.rpc('acoes_marca_vitrine');
    const lista = error || !Array.isArray(data) ? [] : (data as AcaoVitrine[]);
    cache = { em: Date.now(), lista };
    pedido = null;
    ouvintes.forEach((f) => f(lista));
    return lista;
  })().catch(() => { pedido = null; return []; });
  return pedido;
}

export function useMarcasAtivas(): AcaoVitrine[] {
  const [lista, setLista] = useState<AcaoVitrine[]>(cache?.lista ?? []);
  // Busca de novo sempre que a tela ganha foco (a Home e Eventos ficam montadas nas abas).
  // Enquanto a tela está aberta, atualiza a cada 30 s: o "Restam 37" acompanha quem vai ganhando.
  useFocusEffect(useCallback(() => {
    let vivo = true;
    const ouvir = (l: AcaoVitrine[]) => { if (vivo) setLista(l); };
    ouvintes.add(ouvir);
    buscarMarcasAtivas().then(ouvir);
    const t = setInterval(() => { void buscarMarcasAtivas(true); }, 30 * 1000);
    return () => { vivo = false; ouvintes.delete(ouvir); clearInterval(t); };
  }, []));
  return lista;
}

/** Marca de um cupom ou festa (para o selo "Apoio: …"). */
export function marcaDoItem(lista: AcaoVitrine[], tipo: 'cupom' | 'festa', id: string | null | undefined): AcaoVitrine | null {
  if (!id) return null;
  return lista.find((a) => (tipo === 'cupom' ? a.cupom_ids : a.festa_ids)?.includes(id)) || null;
}

/** Cor da marca com contraste garantido sobre o fundo escuro do app. */
export function corDaMarca(a: AcaoVitrine | null): string {
  const c = (a?.cor || '').trim();
  return /^#[0-9a-f]{6}$/i.test(c) ? c : '#F2C94C';
}
