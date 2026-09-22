import { Instagram, Mail, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { INSTAGRAM_URL, NAV_ITEMS, SUPORTE_EMAIL, SUPORTE_WHATSAPP, linkWhatsapp } from '../lib/constants';

// Rodada 58 — Guia, Seção 9 "Rodapé e páginas legais": navegação (mesmos
// 7 itens do header), contato (Instagram/WhatsApp/e-mail oficiais),
// legal (Termos/Privacidade) e marca (logo + © 2026). Os 3 contatos
// oficiais usam as mesmas variáveis de ambiente que a Rodada 42 já tinha
// deixado em branco de propósito em /excluir-conta — mesmo princípio
// aqui: some da tela em vez de virar link morto quando não preenchido.
export default function Footer() {
  return (
    <footer className="w-full border-t border-white/5 mt-16">
      <div className="w-full max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs">
        <div className="col-span-2 sm:col-span-1">
          <div className="relative h-8 w-14 mb-4">
            <Image src="/logo-icon.png" alt="Dicas LGBT+" fill className="object-contain object-left" />
          </div>
          <p className="text-[#626274] leading-relaxed">
            © {new Date().getFullYear()} Dicas LGBT+. Todos os direitos reservados.
          </p>
        </div>

        <div>
          <h3 className="text-[#626274] font-bold uppercase tracking-wide mb-3 text-[10px]">Navegação</h3>
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-[#A0A0B2] hover:text-white transition">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[#626274] font-bold uppercase tracking-wide mb-3 text-[10px]">Contato</h3>
          <ul className="space-y-2">
            {INSTAGRAM_URL && (
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-[#A0A0B2] hover:text-white transition inline-flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5" /> Instagram
                </a>
              </li>
            )}
            {SUPORTE_WHATSAPP && (
              <li>
                <a href={linkWhatsapp(SUPORTE_WHATSAPP, 'Olá! Vim pelo site do Dicas LGBT+.')} target="_blank" rel="noopener noreferrer" className="text-[#A0A0B2] hover:text-white transition inline-flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </li>
            )}
            {SUPORTE_EMAIL && (
              <li>
                <a href={`mailto:${SUPORTE_EMAIL}`} className="text-[#A0A0B2] hover:text-white transition inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> E-mail
                </a>
              </li>
            )}
            {!INSTAGRAM_URL && !SUPORTE_WHATSAPP && !SUPORTE_EMAIL && (
              <li className="text-[#FFD54F]/80 leading-relaxed">
                Contatos oficiais ainda não configurados (ver .env.local).
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-[#626274] font-bold uppercase tracking-wide mb-3 text-[10px]">Legal</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/termos" className="text-[#A0A0B2] hover:text-white transition">
                Termos de Uso e Cadastro
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className="text-[#A0A0B2] hover:text-white transition">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link href="/excluir-conta" className="text-[#A0A0B2] hover:text-white transition">
                Exclusão de conta
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
