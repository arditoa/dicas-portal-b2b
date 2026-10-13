'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Medição anônima do site (visitas + cliques). Grava na tabela
// public.eventos_site do mesmo Supabase (ver supabase-migration/040).
// Sem cookies, sem IP, sem identificador de pessoa. Um botão/link entra na
// medição só de ter `data-track="nome_do_evento"` (e, opcional,
// `data-onde="ponto_da_pagina"`) — por isso as páginas não precisam de
// nenhum componente especial nos links.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function origemDoAcesso(): string {
  try {
    const utm = new URLSearchParams(window.location.search).get('utm_source');
    if (utm) return utm.slice(0, 120);
    if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host && host !== window.location.hostname) return host.slice(0, 120);
    }
  } catch {
    // ignora: cai em "direto"
  }
  return 'direto';
}

function enviar(evento: string, onde?: string | null) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return; // não polui os números com testes locais
    if (/bot|crawl|spider|preview|headless/i.test(navigator.userAgent)) return;
    fetch(`${SUPABASE_URL}/rest/v1/eventos_site`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        evento: evento.slice(0, 60),
        onde: onde ? onde.slice(0, 80) : null,
        pagina: window.location.pathname.slice(0, 120),
        origem: origemDoAcesso(),
      }),
      keepalive: true, // o clique pode abrir outra página logo em seguida
    }).catch(() => {});
  } catch {
    // medição nunca pode quebrar o site
  }
}

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    enviar('visita');
  }, [pathname]);

  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      const alvo = (e.target as Element | null)?.closest?.('[data-track]');
      if (!alvo) return;
      enviar(alvo.getAttribute('data-track') || '', alvo.getAttribute('data-onde'));
    };
    document.addEventListener('click', aoClicar, true);
    return () => document.removeEventListener('click', aoClicar, true);
  }, []);

  return null;
}
