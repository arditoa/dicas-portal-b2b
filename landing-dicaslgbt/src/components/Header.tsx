'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { NAV_ITEMS, URL_PORTAL } from '../lib/constants';

// Cabeçalho global no formato do documento da Home: logo à esquerda, dois
// caminhos sempre visíveis (Cadastrar minha empresa em destaque e Entrar na
// Lista Antecipada), menu com os itens do mapa do site numa segunda linha
// no desktop, e menu recolhido no celular. "Já sou parceiro" continua como
// link discreto para a Área do Parceiro (/entrar).
const CADASTRO_EMPRESA = `${URL_PORTAL}/cadastro/local`;

export default function Header() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="w-full sticky top-0 z-50 backdrop-blur-md bg-[#0B0B0E]/85">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="relative h-9 w-36 sm:h-10 sm:w-44 shrink-0">
          <Image src="/logo-lockup.png" alt="Dicas LGBT+" fill className="object-contain object-left" priority />
        </Link>

        {/* Desktop: os dois caminhos */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/entrar"
            data-track="entrar_parceiro"
            data-onde="header"
            className="text-xs font-medium text-[#A0A0B2] hover:text-white transition mr-1"
          >
            Já sou parceiro
          </Link>
          <Link
            href="/lista-antecipada"
            data-track="lista_antecipada"
            data-onde="header"
            className="text-xs font-bold text-white px-4 py-2.5 rounded-full border border-[#F0258C]/60 hover:bg-[#F0258C]/10 transition"
          >
            Entrar na Lista Antecipada
          </Link>
          <a
            href={CADASTRO_EMPRESA}
            data-track="cadastro_empresa"
            data-onde="header"
            className="text-xs font-bold text-white px-5 py-2.5 rounded-full bg-gradient-to-r from-[#F0258C] to-[#B620E0] hover:brightness-110 transition"
          >
            Cadastrar minha empresa
          </a>
        </div>

        {/* Mobile: Entrar + ícone do menu */}
        <div className="flex lg:hidden items-center gap-3">
          <Link href="/entrar" data-track="entrar_parceiro" data-onde="header" className="text-xs font-semibold text-white">
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

      {/* Desktop: menu em segunda linha */}
      <nav className="hidden lg:block border-t border-white/5">
        <div className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-6 py-2.5">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} href={item.href} className="text-xs font-semibold text-[#A0A0B2] hover:text-white transition">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="h-1 w-full bg-gradient-to-r from-[#F0258C] via-[#B620E0] to-[#6B2BD9]" aria-hidden />

      {aberto && (
        <nav className="lg:hidden flex flex-col gap-1 px-6 pb-5 border-t border-white/5 pt-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
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
