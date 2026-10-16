import { ArrowRight, Instagram, Mail, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { INSTAGRAM_URL, SUPORTE_EMAIL, SUPORTE_WHATSAPP, URL_PORTAL, linkWhatsapp } from '../lib/constants';

// Rodapé no modelo novo da Home (marca + frase, navegação, "Para empresas",
// novidades, linha final com slogan). Mantém os links legais (Termos,
// Privacidade e Exclusão de conta — esta última é exigida pelo Google Play).
// "Dicas Ecossistema" e "Dicas Lab", que aparecem no modelo, ainda não têm
// página: ficam de fora até existirem, para não criar link quebrado.
const NAVEGACAO = [
  { label: 'Conheça o Dicas LGBT+', href: '/sobre' },
  { label: 'Aplicativo', href: '/app' },
  { label: 'Dicas Trip', href: '/dicas-trip' },
  { label: 'Dicas Lab', href: '/dicas-lab' },
  { label: 'Lista Antecipada', href: '/lista-antecipada' },
];

const ICONE =
  'flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#E6E0F0] transition hover:border-[#F0258C] hover:text-[#F0258C]';

export default function Footer() {
  return (
    <footer className="mt-0 w-full border-t-4 border-[#F0258C]/40 bg-[#0B0B0E]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 text-sm sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <div className="relative mb-4 h-10 w-44">
            <Image src="/logo-lockup.png" alt="Dicas LGBT+" fill className="object-contain object-left" />
          </div>
          <p className="max-w-[16rem] text-xs leading-relaxed text-[#A0A0B2]">
            Lugares, pessoas e experiências que celebram todas as identidades.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            {INSTAGRAM_URL && (
              <a href={INSTAGRAM_URL} data-track="instagram" data-onde="rodape" target="_blank" rel="noopener noreferrer" aria-label="Instagram do Dicas LGBT+" className={ICONE}>
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {SUPORTE_WHATSAPP && (
              <a
                href={linkWhatsapp(SUPORTE_WHATSAPP, 'Olá! Vim pelo site do Dicas LGBT+.')}
                data-track="whatsapp"
                data-onde="rodape"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp do Dicas LGBT+"
                className={ICONE}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            {SUPORTE_EMAIL && (
              <a href={`mailto:${SUPORTE_EMAIL}`} aria-label="E-mail do Dicas LGBT+" className={ICONE}>
                <Mail className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold text-white">Navegação</h3>
          <ul className="space-y-2 text-xs">
            {NAVEGACAO.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-[#A0A0B2] transition hover:text-white">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold text-white">Para empresas</h3>
          <ul className="space-y-2 text-xs">
            <li>
              <a href={`${URL_PORTAL}/cadastro/local`} data-track="cadastro_empresa" data-onde="rodape" className="text-[#A0A0B2] transition hover:text-white">
                Cadastrar minha empresa
              </a>
            </li>
            <li>
              <Link href="/parceiro-fundador" className="text-[#A0A0B2] transition hover:text-white">
                Parceiro Fundador
              </Link>
            </li>
            <li>
              <Link href="/#duvidas" className="text-[#A0A0B2] transition hover:text-white">
                Dúvidas frequentes
              </Link>
            </li>
            {SUPORTE_WHATSAPP && (
              <li>
                <a
                  href={linkWhatsapp(SUPORTE_WHATSAPP, 'Olá! Vim pelo site do Dicas LGBT+.')}
                  data-track="whatsapp"
                  data-onde="rodape"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#A0A0B2] transition hover:text-white"
                >
                  Fale conosco
                </a>
              </li>
            )}
            <li>
              <Link href="/entrar" className="text-[#A0A0B2] transition hover:text-white">
                Já sou parceiro
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold text-white">Receba novidades</h3>
          <p className="mb-4 text-xs leading-relaxed text-[#A0A0B2]">
            Novidades sobre o app, lançamentos e oportunidades para o seu negócio.
          </p>
          <Link
            href="/lista-antecipada"
            data-track="lista_antecipada"
            data-onde="rodape"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F0258C] to-[#B620E0] px-5 py-2.5 text-xs font-bold text-white transition hover:brightness-110"
          >
            Entrar na Lista Antecipada
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-5 text-[11px] text-[#626274] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            <p>© {new Date().getFullYear()} Dicas LGBT+. Todos os direitos reservados.</p>
            <nav className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/termos" className="hover:text-white">Termos de Uso e Cadastro</Link>
              <Link href="/privacidade" className="hover:text-white">Política de Privacidade</Link>
              <Link href="/excluir-conta" className="hover:text-white">Exclusão de conta</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <p>Mais diversidade. Mais encontro. Mais orgulho.</p>
            <span
              className="h-1.5 w-14 rounded-full"
              style={{ background: 'linear-gradient(90deg,#E40303,#FF8C00,#FFED00,#008026,#24408E,#732982)' }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
