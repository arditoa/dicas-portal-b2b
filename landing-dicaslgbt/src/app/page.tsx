import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  Drama,
  Heart,
  HeartPulse,
  Lightbulb,
  MapPin,
  Music,
  PartyPopper,
  Plane,
  Presentation,
  Rocket,
  Scissors,
  Search,
  Sparkles,
  Users,
  Utensils,
  Video,
  Wine,
  Wrench,
  Check,
  FileText,
  Store,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import FotoTile from '../components/FotoTile';
import Footer from '../components/Footer';
import Header from '../components/Header';
import MobileFixedCta from '../components/MobileFixedCta';
import PhoneMock from '../components/PhoneMock';
import { FOTOS } from '../lib/fotos';
import { URL_PORTAL } from '../lib/constants';

// Home de cadastro de empresas, escrita a partir do documento
// "1- Home do site (cadastro de empresas)" e do modelo visual enviado pela
// Andrea. Dois caminhos separados: cadastro de empresas (botão principal,
// vai ao portal) e Lista Antecipada (/lista-antecipada, para o público).
// O backup da Home anterior está em `page.home-antiga.txt`.
//
// Âncoras usadas pelo resto do site: #cadastro (seção "cadastro simples") e
// #duvidas (FAQ). Fotos reais entram em `src/lib/fotos.ts`.

const CADASTRO_EMPRESA = `${URL_PORTAL}/cadastro/local`;

const PERGUNTAS = [
  'O público LGBT+ consegue encontrar e identificar o seu negócio nos meios digitais?',
  'Você quer ser encontrado pelo público LGBT+, mas não sabe por onde começar?',
  'Novas pessoas conhecem o seu espaço ou serviço, ou só quem já conhece chega até você?',
  'Já pensou em fazer parte de um mapa de busca LGBT+?',
];

const CATEGORIAS = [
  { nome: 'Festas e eventos', icone: PartyPopper },
  { nome: 'Bares', icone: Wine },
  { nome: 'Gastronomia', icone: Utensils },
  { nome: 'Cultura', icone: Drama },
  { nome: 'Viagens', icone: Plane },
  { nome: 'Serviços', icone: Wrench },
  { nome: 'Experiências e lazer', icone: Sparkles },
  { nome: 'Estética e beleza', icone: Scissors },
  { nome: 'Saúde LGBT+', icone: HeartPulse },
  { nome: 'Empregabilidade', icone: Briefcase },
];

const FILTROS = [
  'Público LGBT+ predominante',
  'Estilo musical',
  'Formato de apresentações',
  'Tipos de gastronomia',
  'Tipos de hospedagens',
  'E mais…',
];

const PASSOS = [
  { titulo: 'Você preenche o cadastro', texto: 'Com as informações do negócio.', icone: FileText },
  { titulo: 'Nossa equipe analisa', texto: 'Os dados enviados.', icone: Search },
  { titulo: 'Com a aprovação…', texto: 'Seu negócio pode fazer parte do mapa do Dicas LGBT+ App.', icone: Check },
];

const GALERIA = [
  { legenda: 'Na rua, descobrindo lugares', chave: 'rua', icone: MapPin, tom: 'blue', pos: '50% 35%' },
  { legenda: 'Bastidores de gravação', chave: 'bastidores', icone: Video, tom: 'purple', pos: '50% 32%' },
  { legenda: 'O app na palma da mão', chave: 'soloApp', icone: Heart, tom: 'pink', pos: '50% 30%' },
  { legenda: 'Explorando a cidade', chave: 'cidade', icone: Music, tom: 'pink', pos: '50% 45%' },
] as const;

const DUVIDAS = [
  {
    p: 'O cadastro da empresa é gratuito?',
    r: 'Sim. Você pode enviar os dados do seu negócio sem pagar pelo cadastro inicial.',
  },
  {
    p: 'Qualquer negócio pode se cadastrar?',
    r: 'O cadastro é para negócios LGBT+ e também para lugares que recebem a comunidade com respeito, acolhimento e fazem parte dos seus encontros e experiências.',
  },
  {
    p: 'O cadastro garante aprovação?',
    r: 'Não. As informações são analisadas pela equipe antes da entrada no aplicativo.',
  },
  {
    p: 'Quando o aplicativo será lançado?',
    r: 'O lançamento está previsto para 3 de dezembro de 2026.',
  },
  {
    p: 'A Lista Antecipada é para empresas?',
    r: 'Ela é voltada ao público que quer receber novidades do app. Para cadastrar um negócio, use o botão de cadastro de empresas.',
  },
];

const BOTAO_PRINCIPAL =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F0258C] to-[#B620E0] px-7 py-4 text-sm font-bold text-white shadow-[0_10px_40px_-10px_rgba(240,37,140,0.7)] transition hover:brightness-110';

const BOTAO_CONTORNO =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[#F0258C]/60 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#F0258C]/10';

function Rotulo({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F0258C]">{children}</p>;
}

function Titulo({ children, claro = false }: { children: ReactNode; claro?: boolean }) {
  return (
    <h2
      className={`font-display mt-3 text-4xl font-extrabold uppercase leading-[1.02] sm:text-5xl ${claro ? 'text-[#1B1030]' : 'text-white'}`}
    >
      {children}
    </h2>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0B0E] pb-28 text-white sm:pb-0">
      <Header />

      {/* 2 — Abertura */}
      <section className="relative w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 85% 25%, rgba(126,87,194,0.4), transparent 70%), radial-gradient(50% 45% at 10% 95%, rgba(240,37,140,0.25), transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-14 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pb-20 lg:pt-16">
          <div>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.98] sm:text-7xl">
              Você acaba de encontrar o futuro das conexões LGBT+, <span className="gradient-text">e ele começa agora!</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#CFC8DC] sm:text-lg">
              Você tem um negócio, presta serviço ou tem produtos voltados à comunidade LGBT+?
            </p>
            <p className="mt-1 max-w-xl text-lg font-bold text-[#FF6BB5] sm:text-xl">Então você merece ser encontrado!</p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
              Faça parte do Dicas LGBT+ App, um ecossistema para encontrar lugares, festas, gastronomia, cultura, serviços,
              experiências e destinos LGBT+ e muito mais, reunidos em uma só plataforma.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <a href={CADASTRO_EMPRESA} data-track="cadastro_empresa" data-onde="topo" className={BOTAO_PRINCIPAL}>
                Cadastre-se gratuitamente
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/lista-antecipada" data-track="lista_antecipada" data-onde="topo" className={BOTAO_CONTORNO}>
                Entrar na Lista Antecipada
              </Link>
            </div>
          </div>
          <PhoneMock
            src="/screenshots/app-inicio.jpg"
            alt="Tela inicial do app Dicas LGBT+ com categorias e lugares em destaque"
          />
        </div>

        {/* 2.1 — Perguntas para quem empreende */}
        <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#2A0F3A] via-[#1B0F2E] to-[#0B0B0E]">
          {FOTOS.renanEmerson && (
            <Image src={FOTOS.renanEmerson} alt="Renan e Emerson do Dicas LGBT+ em gravação" fill sizes="100vw" className="object-cover object-[50%_28%] opacity-50" />
          )}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#2A0F3A]/95 via-[#3A1470]/80 to-[#2A0F3A]/60"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-6xl px-6 py-14">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PERGUNTAS.map((q, i) => {
                const Icone = [Search, Store, Users, MapPin][i];
                return (
                  <div key={q} className="rounded-2xl border border-white/15 bg-white/95 p-5 text-[#1B1030] shadow-lg">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCE4F1] text-[#D81B7E]">
                      <Icone className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold leading-snug">{q}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-10 flex flex-col items-center text-center">
              <a href={CADASTRO_EMPRESA} data-track="cadastro_empresa" data-onde="perguntas" className={BOTAO_PRINCIPAL}>
                Cadastrar minha empresa gratuitamente
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-3 text-xs text-[#D6CCE6]">Cadastro gratuito e sujeito à análise.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 — O que é o Dicas LGBT+ App */}
      <section id="empresa-ganha" className="w-full scroll-mt-32 bg-[#F7F2FB] text-[#1B1030]">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Rotulo>O app</Rotulo>
            <Titulo claro>
              Um ecossistema que une o público LGBT+ <span className="gradient-text">a negócios que acolhem</span>
            </Titulo>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#4A3F5C] sm:text-base">
              Um ecossistema que une o público LGBT+ a negócios que acolhem e querem atender esse público, tudo dentro de um
              aplicativo. Reúne festas, eventos, bares, gastronomia, cultura, viagens, serviços, experiências e lazer,
              estética e beleza, saúde LGBT+, empregabilidade e muito mais.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {CATEGORIAS.map((c) => (
                <div
                  key={c.nome}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-[#E8D9F3] bg-white px-2 py-4 text-center shadow-sm"
                >
                  <c.icone className="h-6 w-6 text-[#D81B7E]" />
                  <span className="text-[11px] font-semibold leading-tight">{c.nome}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#4A3F5C] sm:text-base">
              Tudo em um só app, para facilitar a busca pelo próximo date, happy hour, rolê com a galera ou aquela viagem
              dos sonhos. <strong className="text-[#1B1030]">Menos caça ao rolê. Mais vida acontecendo.</strong>
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#4A3F5C] sm:text-base">
              Para quem empreende, é uma nova forma de apresentar o seu negócio a pessoas que estão procurando onde ir e o
              que fazer.
            </p>
          </div>
          <div className="relative flex items-center justify-center gap-0 pb-6">
            <PhoneMock
              src="/screenshots/app-mapa.jpg"
              alt="Mapa do app Dicas LGBT+ com lugares por categoria"
              className="w-[170px] -rotate-3 sm:w-[200px]"
              mostrarSaoPaulo={false}
            />
            <PhoneMock
              src="/screenshots/app-inicio.jpg"
              alt="Tela inicial do app Dicas LGBT+ com perfis de estabelecimentos"
              className="-ml-8 mt-10 w-[170px] rotate-3 sm:w-[200px]"
              mostrarSaoPaulo={false}
            />
          </div>
        </div>
      </section>

      {/* 4 — Mapa Dicas LGBT+ */}
      <section className="w-full">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1fr_1fr]">
          <div>
            <Rotulo>Mapa Dicas LGBT+</Rotulo>
            <Titulo>
              Seu negócio pode fazer parte do <span className="gradient-text">Mapa Dicas LGBT+</span>
            </Titulo>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
              Encontre os lugares próximos a você no mapa, com filtros de busca. O Mapa Dicas LGBT+ reúne as dicas da sua
              preferência para acertar no roteiro.
            </p>
            <a href={CADASTRO_EMPRESA} data-track="cadastro_empresa" data-onde="mapa" className={`${BOTAO_PRINCIPAL} mt-7`}>
              Quero cadastrar meu negócio gratuitamente
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#14111C] p-6">
            <p className="text-sm font-bold text-white">Filtros do mapa</p>
            <ul className="mt-4 divide-y divide-white/10">
              {FILTROS.map((f) => (
                <li key={f} className="flex items-center justify-between py-3 text-sm text-[#E6E0F0]">
                  {f}
                  <ChevronDown className="h-4 w-4 text-[#F0258C]" aria-hidden />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5 — Cadastro simples de 2 minutos */}
      <section id="cadastro" className="w-full scroll-mt-32 bg-[#F7F2FB] text-[#1B1030]">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <Rotulo>Cadastro</Rotulo>
          <Titulo claro>
            Um cadastro simples <span className="gradient-text">de 2 minutos</span>
          </Titulo>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#4A3F5C] sm:text-base">
            <strong className="text-[#1B1030]">Coloque seu negócio no radar.</strong> Conte quem vocês são, que experiência
            oferecem e onde encontrar vocês. Nossa equipe analisa as informações antes da entrada no app.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="flex items-start gap-4 rounded-2xl border border-[#E8D9F3] bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F0258C] to-[#B620E0] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold">{p.titulo}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#4A3F5C]">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col items-start gap-3">
            <a href={CADASTRO_EMPRESA} data-track="cadastro_empresa" data-onde="passos" className={BOTAO_PRINCIPAL}>
              Começar meu cadastro gratuito
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="max-w-xl text-xs text-[#4A3F5C]">
              O cadastro não garante uma posição específica nos resultados. A análise considera as informações e os critérios
              do aplicativo.
            </p>
          </div>
        </div>
      </section>

      {/* 6 — Acontece fora da tela */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <Titulo>
                O Dicas LGBT+ <span className="gradient-text">acontece fora da tela</span>
              </Titulo>
              <p className="mt-3 text-lg font-semibold text-white">A gente já vive esses rolês com você</p>
              <p className="mt-3 text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
                Da gravação à pista, o Dicas LGBT+ está na rua mostrando lugares, eventos e histórias da nossa comunidade.
              </p>
            </div>
            <Link href="/sobre" data-track="conheca_dicas" data-onde="galeria" className={`${BOTAO_CONTORNO} self-start`}>
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
                posicao={g.pos}
                className="min-h-[200px] lg:min-h-[260px]"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 7 — Lista Antecipada */}
      <section className="w-full overflow-hidden bg-gradient-to-br from-[#2A0F3A] via-[#5B1A8F] to-[#F0258C]/80">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-6 py-14 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFD1EA]">Lista Antecipada</p>
            <h2 className="font-display mt-3 text-4xl font-extrabold uppercase leading-[1.02] text-white sm:text-6xl">
              E você, já está na lista para descobrir o seu próximo rolê?
            </h2>
          </div>
          <div>
            <p className="text-sm leading-relaxed text-white/90 sm:text-base">
              Entre na Lista Antecipada para receber novidades sobre o lançamento do app, eventos e experiências LGBT+.
            </p>
            <Link
              href="/lista-antecipada"
              data-track="lista_antecipada"
              data-onde="bloco_home"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-bold text-[#B01A6E] shadow-lg shadow-black/20 transition hover:bg-[#FFF3FA]"
            >
              Entrar na Lista Antecipada
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8 — Dicas Lab */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Rotulo>Dicas Lab</Rotulo>
              <Titulo>
                Seu negócio também <span className="gradient-text">pode crescer com estratégia</span>
              </Titulo>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
                O Dicas Lab é o laboratório de marketing, tecnologia, treinamentos e desenvolvimento humano, que ajuda
                empresas a entender onde estão perdendo oportunidades e o que podem ajustar para vender mais e crescer.
              </p>
              <Link href="/dicas-lab" data-track="dicas_lab" data-onde="bloco_home" className={`${BOTAO_CONTORNO} mt-7`}>
                Conheça o Dicas Lab
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FotoTile posicao="50% 30%" src={FOTOS.lab1} alt="Consultoria e planejamento para o seu negócio" legenda="Consultoria e planejamento para o seu negócio" icone={Lightbulb} tom="purple" className="min-h-[200px]" />
              <FotoTile posicao="50% 30%" src={FOTOS.lab2} alt="Treinamentos e conteúdos práticos" legenda="Treinamentos e conteúdos práticos" icone={Presentation} tom="pink" className="min-h-[200px]" />
              <FotoTile posicao="50% 30%" src={FOTOS.lab3} alt="Estratégia, inovação e crescimento" legenda="Estratégia, inovação e crescimento" icone={Rocket} tom="blue" className="min-h-[200px]" />
            </div>
          </div>
        </div>
      </section>

      {/* 9 — Dúvidas frequentes */}
      <section id="duvidas" className="w-full scroll-mt-32 bg-[#F7F2FB] text-[#1B1030]">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-16 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Rotulo>FAQ</Rotulo>
            <Titulo claro>Dúvidas frequentes</Titulo>
            <p className="mt-4 text-sm leading-relaxed text-[#4A3F5C]">
              Tire suas dúvidas sobre o cadastro de empresas, o app, a Lista Antecipada e muito mais.
            </p>
          </div>
          <div className="divide-y divide-[#E3D3F0] rounded-2xl border border-[#E8D9F3] bg-white">
            {DUVIDAS.map((d) => (
              <details key={d.p} className="group px-5">
                <summary
                  data-track="faq_pergunta"
                  data-onde={d.p.slice(0, 60)}
                  className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold sm:text-base [&::-webkit-details-marker]:hidden"
                >
                  {d.p}
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#D81B7E] transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-[#4A3F5C]">{d.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 10 — Convite final */}
      <section className="w-full overflow-hidden bg-gradient-to-br from-[#F0258C] via-[#C21FBF] to-[#6B2BD9]">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="font-display text-4xl font-extrabold uppercase leading-[1.02] text-white sm:text-6xl">
              Bora colocar seu negócio nesse ecossistema?
            </h2>
          </div>
          <div>
            <p className="text-sm leading-relaxed text-white/90 sm:text-base">
              Cadastre sua empresa gratuitamente e ajude a comunidade a descobrir novos lugares, eventos e experiências.
            </p>
            <a
              href={CADASTRO_EMPRESA}
              data-track="cadastro_empresa"
              data-onde="final"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-bold text-[#B01A6E] shadow-lg shadow-black/20 transition hover:bg-[#FFF3FA]"
            >
              Cadastrar minha empresa
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <MobileFixedCta variant="cadastro" />
    </main>
  );
}
