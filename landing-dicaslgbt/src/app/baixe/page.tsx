// 24/11 — página do QR Code impresso pela cidade (Renan/Emerson). Endereço curto: dicaslgbt.com.br/baixe
// Os botões abrem a loja certa (BotaoBaixar); sem as lojas no ar ainda, levam à Lista Antecipada.
import Image from 'next/image';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import PhoneMock from '../../components/PhoneMock';
import BotaoBaixar from '../../components/BotaoBaixar';
import { FOTOS } from '../../lib/fotos';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Baixe o app',
  description:
    'Conheça o Dicas LGBT+ App: lugares, eventos, serviços e destinos acolhedores e conectados à comunidade LGBT+. Menos tempo procurando. Mais tempo vivendo.',
};

const BENEFICIOS: [string, string][] = [
  ['🎁', 'Retirar cupons de brindes, benefícios e descontos'],
  ['📍', 'Explorar o mapa e descobrir lugares perto de você'],
  ['🎉', 'Encontrar festas, cultura e o que fazer hoje'],
  ['🌈', 'Encontrar experiências que combinam com o seu momento'],
  ['💕', 'Encontrar o lugar perfeito para o date com aquela pessoa especial'],
  ['🧑‍💼', 'Encontrar serviços voltados para a comunidade LGBT+'],
  ['👕', 'Encontrar os melhores looks, acessórios e lojas para o seu estilo'],
  ['✈️', 'Descobrir destinos, hospedagens e roteiros no Dicas Trip'],
];

export default function Baixe() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      <Header />

      {/* Abertura */}
      <section className="w-full max-w-5xl mx-auto px-6 pt-10 pb-12 grid gap-10 sm:grid-cols-[1.15fr_1fr] items-center">
        <div className="text-center sm:text-left">
          <h1 className="text-[28px] sm:text-5xl font-black tracking-tight leading-[1.12]">
            Que tal encontrar um bar com a sua vibe, uma festa pra se jogar, um café pro date ou uma experiência fora do óbvio?
          </h1>
          <p className="text-[#C9C4DA] text-base sm:text-lg mt-5 leading-relaxed">
            Conheça o <b className="text-white">Dicas LGBT+ App</b>, uma plataforma brasileira para descobrir lugares, eventos, serviços e
            destinos acolhedores e conectados à comunidade LGBT+.
          </p>
          <div className="mt-7 flex sm:justify-start justify-center">
            <BotaoBaixar texto="Baixe aqui" onde="baixe_topo" grande />
          </div>
          <p className="mt-6 text-lg sm:text-xl font-extrabold">
            Menos tempo procurando. <span className="text-[#F472B6]">Mais tempo vivendo.</span>
          </p>
        </div>
        <PhoneMock src="/screenshots/app-inicio.jpg" alt="Tela inicial do app Dicas LGBT+" mostrarSaoPaulo={false} className="w-[210px] sm:w-[260px]" />
      </section>

      {/* O que dá para fazer */}
      <section className="w-full max-w-3xl mx-auto px-6 py-12 border-t border-white/5">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center">Com o aplicativo você pode</h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {BENEFICIOS.map(([emoji, txt]) => (
            <li key={txt} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3.5">
              <span className="text-2xl leading-none" aria-hidden>{emoji}</span>
              <span className="text-[15px] text-[#E8E4F2] leading-snug">{txt}</span>
            </li>
          ))}
        </ul>
        <div className="mt-9 flex justify-center">
          <BotaoBaixar texto="Baixe agora e aproveite os benefícios" onde="baixe_beneficios" grande />
        </div>
      </section>

      {/* Quem somos */}
      <section className="w-full max-w-4xl mx-auto px-6 py-12 border-t border-white/5 grid gap-8 sm:grid-cols-2 items-center">
        <div className="relative aspect-[4/5] w-full max-w-sm mx-auto overflow-hidden rounded-3xl border border-white/10">
          <Image src={FOTOS.renanEmerson} alt="Renan e Emerson, criadores do Dicas LGBT+" fill sizes="(max-width: 640px) 90vw, 380px" className="object-cover" />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-xs font-bold tracking-[0.2em] text-[#F472B6] uppercase">Quem somos</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">Renan e Emerson</h2>
          <p className="text-[#C9C4DA] mt-4 leading-relaxed">
            Há cinco anos, o Dicas LGBT+ compartilha lugares, histórias e experiências pelas redes sociais para aproximar a nossa
            comunidade de novas descobertas. Agora, esse encontro ganha um aplicativo.
          </p>
          <p className="mt-6 text-xl font-extrabold">Bora fazer parte?</p>
          <div className="mt-5 flex sm:justify-start justify-center">
            <BotaoBaixar texto="Faça o download do aplicativo agora" onde="baixe_quem_somos" grande />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
