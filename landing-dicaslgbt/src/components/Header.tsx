'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { NAV_ITEMS } from '../lib/constants';

// Rodada 58 — Guia_Configuracao_Site_Dicas_LGBT_App.docx, "Cabeçalho
// global": logo à esquerda, menu com os itens do mapa do site, link
// discreto "Já sou parceiro" → /entrar, e no celular menu recolhido
// mostrando só logo + ícone do menu + "Entrar". Extraído da page.tsx
// original (que só tinha logo + "Já é parceiro? Entrar") pra ficar
// compartilhado entre as páginas novas, em vez de repetir em cada uma.
//
// Rodada 59 (parte 3) — Andrea pediu pra "melhorar o topo": header virou
// sticky com leve desfoque (mais premium, fica visível ao rolar a página
// longa) e a borda inferior ficou mais sutil (branca translúcida em vez
// de cinza sólido, ver nota na Seção 2/9-12 do page.tsx sobre os
// divisores). "Área do Parceiro" saiu do menu por já duplicar este botão
// "Já sou parceiro" — ver NAV_ITEMS em lib/constants.ts.
export default function Header() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="w-full border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-[#0B0B0E]/80">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <Link href="/" className="relative h-9 w-36 sm:h-10 sm:w-44 shrink-0">
          <Image src="/logo-lockup.png" alt="Dicas LGBT+" fill className="object-contain object-left" priority />
        </Link>

        {/* Desktop */}
        <nav className="hidden lg:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="text-xs font-semibold text-[#A0A0B2] hover:text-white transition">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/entrar"
          className="hidden lg:inline-flex text-xs font-medium bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl border border-white/10 transition shrink-0"
        >
          Já sou parceiro
        </Link>

        {/* Mobile — só logo + ícone do menu + Entrar, como pede o Guia */}
        <div className="flex lg:hidden items-center gap-3">
          <Link href="/entrar" className="text-xs font-semibold text-white">
            Entrar
          </Link>
          <button
            onClick={() => setAberto((v) => !v)}
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#232230] text-white"
          >
            {aberto ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {aberto && (
        <nav className="lg:hidden flex flex-col gap-1 px-6 pb-5 border-t border-white/5 pt-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              className="text-sm font-semibold text-[#D0D0E0] hover:text-white py-2.5"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
