import { ArrowRight, Gift, Heart, MapPin, Music, Share2, ShoppingBag, Sparkles, Ticket, Wine, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import FotoTile from '../../components/FotoTile';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import MobileFixedCta from '../../components/MobileFixedCta';
import PhoneMock from '../../components/PhoneMock';
import WaitlistForm from '../../components/WaitlistForm';
import { FOTOS } from '../../lib/fotos';
import { URL_SITE } from '../../lib/constants';

export const metadata: Metadata = {
  title: 'Lista Antecipada do app',
  description:
    'Entre na Lista Antecipada do Dicas LGBT+ App e receba as novidades do lançamento, previsto para 3 de dezembro de 2026.',
};

export const dynamic = 'force-dynamic';

// Página montada a partir do documento "Lista Antecipada" (8 blocos).
// O formulário grava em leads_institucionais (origem na mensagem).
// Os benefícios do bloco 3 estão escritos como no documento ("pode ter");
// confirmar o que será entregue antes de prometer algo específico.

const OPCOES = [
  { texto: 'Date gostoso', icone: Heart },
  { texto: 'Happy hour sem perrengue', icone: Wine },
  { texto: 'Festa com o seu som', icone: Music },
  { texto: 'Lugar que acolhe você', icone: MapPin },
  { texto: 'Moda e Estilo', icone: ShoppingBag },
];

const VANTAGENS = [
  { texto: 'Cupons', icone: Ticket },
  { texto: 'Descontos', icone: Sparkles },
  { texto: 'Brindes', icone: Gift },
  { texto: 'Acesso antecipado', icone: Zap },
];

const GALERIA = [
  { legenda: 'Renan e Emerson', chave: 'renanEmerson', icone: Heart, tom: 'pink' },
  { legenda: 'Parada LGBT+', chave: 'parada', icone: Heart, tom: 'purple' },
  { legenda: 'Gravações e eventos', chave: 'bastidores', icone: Music, tom: 'pink' },
  { legenda: 'Rolês do Dicas', chave: 'festas', icone: MapPin, tom: 'blue' },
] as const;

const PERGUNTAS = [
  { p: 'Entrar na lista é grátis?', r: 'Sim! É de graça e sem complicação.' },
  { p: 'Quando o app será lançado?', r: 'O lançamento está previsto para 3 de dezembro de 2026.' },
  { p: 'Como vou receber as novidades?', r: 'Pelo WhatsApp e/ou e-mail que você informar.' },
  {
    p: 'Onde o app começa?',
    r: 'A primeira fase do mapa começa por São Paulo. A ideia é conectar cada vez mais lugares e experiências LGBT+ pelo Brasil.',
  },
  {
    p: 'Como funcionam as vantagens para as 100 primeiras pessoas?',
    r: 'A gente vai divulgar os detalhes da ação antes do lançamento. Fica de olho 👀',
  },
];

const BOTAO =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F0258C] to-[#B620E0] px-7 py-4 text-sm font-bold text-white shadow-[0_10px_40px_-10px_rgba(240,37,140,0.7)] transition hover:brightness-110';

const LINK_COMPARTILHAR = `https://wa.me/?text=${encodeURIComponent(
  `Bora entrar na Lista Antecipada do Dicas LGBT+ App? ${URL_SITE}/lista-antecipada`,
)}`;

export default function ListaAntecipadaPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0B0E] pb-28 text-white sm:pb-0">
      <Header />

      {/* 1 — Topo e apresentação */}
      <section className="relative w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 85% 20%, rgba(126,87,194,0.4), transparent 70%), radial-gradient(50% 45% at 10% 95%, rgba(240,37,140,0.25), transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
          <div>
            <span className="inline-block rounded-full border border-[#F0258C]/60 bg-[#F0258C]/10 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#FF6BB5]">
              Lista Antecipada
            </span>
            <h1 className="font-display mt-4 text-5xl font-extrabold uppercase leading-[0.98] sm:text-7xl">
              Já cansou de procurar rolê LGBT+ <span className="gradient-text">em mil perfis?</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#CFC8DC]">
              Salvou um monte de post e, na hora H, ainda tá no grupo: “gente, pra onde vamos?” 👀
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-[#CFC8DC]">
              Quer achar um date gostoso, um happy hour sem perrengue, uma loja para um look icônico, planejar aquele passeio
              ou viagem, uma festa com o seu som e lugares que recebem você bem?
            </p>

            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {OPCOES.map((o) => (
                <li
                  key={o.texto}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#14111C] px-4 py-3 text-sm font-semibold"
                >
                  <o.icone className="h-5 w-5 shrink-0 text-[#F0258C]" aria-hidden />
                  {o.texto}
                </li>
              ))}
            </ul>

            <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
              Agora imagina ter lugares, festas, gastronomia, cultura, experiências e destinos LGBT+ reunidos em uma só
              plataforma? O Dicas LGBT+ App está chegando para ajudar você a descobrir tudo isso, com menos tempo de procura
              e mais tempo vivendo!
            </p>
            <p className="mt-4 text-lg font-bold">Entre agora em nossa Lista</p>
            <div className="mt-4 flex flex-col items-start gap-3">
              <a href="#lista" data-track="lista_antecipada_quero" data-onde="topo" className={BOTAO}>
                Quero entrar na lista!
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-xs font-semibold text-[#FFD1EA]">Lançamento previsto: 3 de dezembro de 2026</p>
            </div>
          </div>
          <PhoneMock src="/screenshots/app-inicio.jpg" alt="Tela inicial do Dicas LGBT+ App" />
        </div>
      </section>

      {/* 2 — O que é o aplicativo */}
      <section className="w-full bg-[#F7F2FB] text-[#1B1030]">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="font-display text-4xl font-extrabold uppercase leading-[1.02] sm:text-5xl">
              Tá, mas o que é o <span className="gradient-text">Dicas LGBT+ App?</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#4A3F5C] sm:text-base">
              É um mapa de rolês, lugares e experiências LGBT+ pra você descobrir onde ir e o que fazer.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#4A3F5C] sm:text-base">
              Tem festas, bares, gastronomia, cultura, viagens e muito mais, tudo reunido em um só app, pra facilitar a busca
              pelo próximo date, happy hour ou rolê com a galera.
            </p>
            <p className="mt-4 text-lg font-extrabold">Menos caça ao rolê. Mais vida acontecendo.</p>
          </div>
          <PhoneMock src="/screenshots/app-mapa.jpg" alt="Mapa do Dicas LGBT+ App" mostrarSaoPaulo={false} />
        </div>
      </section>

      {/* 3 — Vantagens para as primeiras pessoas */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 text-center">
          <h2 className="font-display text-4xl font-extrabold uppercase leading-[1.02] sm:text-5xl">
            Chegou primeiro? <span className="gradient-text">Tem vantagem 👀</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
            As 100 primeiras pessoas inscritas na lista que fizerem o download e o cadastro no app no lançamento vão
            participar de uma ação especial de lançamento.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold text-white sm:text-base">
            Cupons, descontos, brindes e acesso antecipado? Pode ter tudo isso e muito mais...
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {VANTAGENS.map((v) => (
              <li key={v.texto} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#14111C] px-3 py-5">
                <v.icone className="h-7 w-7 text-[#F0258C]" aria-hidden />
                <span className="text-sm font-semibold">{v.texto}</span>
              </li>
            ))}
          </ul>
          <a href="#lista" data-track="lista_antecipada_quero" data-onde="vantagens" className={`${BOTAO} mt-8`}>
            Quero garantir meu lugar na lista
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* 4 — Fotos e conteúdos do Dicas */}
      <section className="w-full border-t-2 border-[#F0258C]/30">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-display text-4xl font-extrabold uppercase leading-[1.02] sm:text-5xl">
                A gente já vive <span className="gradient-text">esses rolês com você</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
                Da gravação à pista, o Dicas LGBT+ tá na rua mostrando lugares, eventos e histórias da nossa comunidade.
              </p>
            </div>
            <Link
              href="/sobre"
              data-track="conheca_dicas"
              data-onde="lista_antecipada"
              className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-[#F0258C]/60 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#F0258C]/10"
            >
              Conheça o Dicas LGBT+
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {GALERIA.map((g) => (
              <FotoTile
                key={g.chave}
                src={FOTOS[g.chave]}
                alt={g.legenda}
                legenda={g.legenda}
                icone={g.icone}
                tom={g.tom}
                className="min-h-[200px] lg:min-h-[260px]"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5 — Cadastro na lista */}
      <section id="lista" className="w-full scroll-mt-32 bg-gradient-to-br from-[#2A0F3A] via-[#1B0F2E] to-[#0B0B0E]">
        <div className="mx-auto w-full max-w-2xl px-6 py-16 text-center">
          <h2 className="font-display text-4xl font-extrabold uppercase leading-[1.02] sm:text-5xl">
            Quero receber <span className="gradient-text">as novidades</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
            Entre na lista gratuita e fique por dentro do lançamento e das vantagens especiais.
          </p>
          <div className="mt-8">
            <WaitlistForm
              origemLabel="Lista Antecipada (/lista-antecipada)"
              textoBotao="Me coloca nessa lista"
              textoSucesso="Pronto! Você está na lista. Vamos avisar pelo WhatsApp e/ou e-mail que você informou quando tivermos novidades do Dicas LGBT+ App."
              mostrarCidade
            />
          </div>
        </div>
      </section>

      {/* 6 — Perguntas rápidas */}
      <section className="w-full bg-[#F7F2FB] text-[#1B1030]">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-16 lg:grid-cols-[0.7fr_1.3fr]">
          <h2 className="font-display text-4xl font-extrabold uppercase leading-[1.02] sm:text-5xl">Perguntas rápidas</h2>
          <div className="divide-y divide-[#E3D3F0] rounded-2xl border border-[#E8D9F3] bg-white">
            {PERGUNTAS.map((d) => (
              <details key={d.p} className="group px-5">
                <summary
                  data-track="faq_pergunta"
                  data-onde={`lista: ${d.p.slice(0, 50)}`}
                  className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold sm:text-base [&::-webkit-details-marker]:hidden"
                >
                  {d.p}
                  <span className="shrink-0 text-lg font-bold text-[#D81B7E] group-open:hidden" aria-hidden>
                    +
                  </span>
                  <span className="hidden shrink-0 text-lg font-bold text-[#D81B7E] group-open:inline" aria-hidden>
                    −
                  </span>
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-[#4A3F5C]">{d.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — Compartilhamento */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-3xl px-6 py-14 text-center">
          <a
            href={LINK_COMPARTILHAR}
            target="_blank"
            rel="noopener noreferrer"
            data-track="lista_compartilhar"
            data-onde="lista_antecipada"
            className={BOTAO}
          >
            <Share2 className="h-4 w-4" />
            Chamar meu bonde pra lista
          </a>
          <p className="mt-4 text-sm text-[#CFC8DC]">Compartilhe com quem também ama um bom rolê LGBT+.</p>
          <p className="mt-8 text-sm font-bold">Mapeando rolês. Conectando pessoas. Mais vida acontecendo.</p>
          <p className="mt-1 text-xs text-[#A0A0B2]">Mais lugares, mais pessoas, mais histórias.</p>
        </div>
      </section>

      <Footer />
      <MobileFixedCta variant="lancamento" />
    </main>
  );
}
