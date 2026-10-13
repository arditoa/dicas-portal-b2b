import {
  ArrowRight,
  ChevronDown,
  Drama,
  Flower2,
  FileText,
  Handshake,
  Heart,
  Hotel,
  MessageCircleQuestion,
  Martini,
  PartyPopper,
  Plane,
  Rocket,
  Send,
  Store,
  Ticket,
  TrendingUp,
  UtensilsCrossed,
  Users,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import FotoTile from '../components/FotoTile';
import Footer from '../components/Footer';
import Header from '../components/Header';
import MobileFixedCta from '../components/MobileFixedCta';
import PhoneMock from '../components/PhoneMock';
import { FOTOS } from '../lib/fotos';
import { INSTAGRAM_URL, URL_PORTAL } from '../lib/constants';

// Home reescrita a partir do modelo visual enviado pela Andrea (8 blocos
// numerados + rodapé). O backup da Home anterior (Guia, Rodada 58/59) está
// em `page.home-antiga.txt`, na raiz desta pasta.
//
// Destinos: o botão principal leva direto ao cadastro de empresa do portal
// (URL_PORTAL/cadastro/local). Cadastro de evento e de instituição seguem
// acessíveis no bloco 05 (âncora #cadastro, usada pelo menu e pela barra
// fixa do celular). As respostas do FAQ vêm do que já estava publicado
// (análise em até 48 h, retorno por e-mail e WhatsApp, acesso antecipado).

const CADASTRO_EMPRESA = `${URL_PORTAL}/cadastro/local`;
const CADASTRO_EVENTO = `${URL_PORTAL}/cadastro/evento`;
const CADASTRO_INSTITUCIONAL = `${URL_PORTAL}/cadastro/institucional`;

const VANTAGENS = [
  { titulo: 'Visibilidade antecipada', texto: 'Seu negócio entre os primeiros no mapa do app.', icone: Rocket },
  { titulo: 'Conexão com a comunidade', texto: 'Atrai um público que valoriza espaços seguros e inclusivos.', icone: Users },
  { titulo: 'Crescimento para o seu negócio', texto: 'Esteja pronto para as oportunidades do lançamento.', icone: TrendingUp },
];

const CATEGORIAS = [
  { nome: 'Bares', icone: Martini, cor: 'text-[#F0258C]' },
  { nome: 'Festas', icone: PartyPopper, cor: 'text-[#B65CFF]' },
  { nome: 'Gastronomia', icone: UtensilsCrossed, cor: 'text-[#FFB020]' },
  { nome: 'Cultura', icone: Drama, cor: 'text-[#FFC53D]' },
  { nome: 'Experiências', icone: Ticket, cor: 'text-[#FFE14D]' },
  { nome: 'Turismo', icone: Plane, cor: 'text-[#2FA8FF]' },
  { nome: 'Beleza', icone: Flower2, cor: 'text-[#FF5CA8]' },
  { nome: '18+', icone: Heart, cor: 'text-[#F0258C]' },
];

const PASSOS = [
  { titulo: 'Faça seu cadastro', texto: 'Preencha as informações do seu negócio.', icone: FileText },
  { titulo: 'Envie para análise', texto: 'Nossa equipe vai revisar seu cadastro.', icone: Send },
  {
    titulo: 'Prepare seu perfil para o lançamento',
    texto: 'Estando aprovado, seu negócio estará no mapa do Dicas LGBT+.',
    icone: Store,
  },
];

const DUVIDAS = [
  {
    p: 'O cadastro da minha empresa é realmente gratuito?',
    r: 'Sim. O cadastro é gratuito e dá acesso ao plano Freemium. Os planos comerciais, com mais destaque e recursos, são opcionais e só são contratados se você quiser.',
  },
  {
    p: 'Quem pode se cadastrar no Dicas LGBT+?',
    r: 'Negócios, produtores de eventos e instituições que acolhem, respeitam e apoiam a comunidade LGBTQIA+: bares, restaurantes, hotéis, espaços culturais, serviços e mais. Todo cadastro passa pela análise da nossa equipe.',
  },
  {
    p: 'Quanto tempo leva para a minha empresa ser analisada?',
    r: 'A equipe confere as informações em até 48 horas. O retorno é enviado por e-mail e WhatsApp.',
  },
  {
    p: 'Minha empresa já estará no app imediatamente?',
    r: 'Não de imediato. Empresas aprovadas recebem acesso antecipado para testar e verificar o perfil, que fica preparado para a chegada dos usuários no lançamento público.',
  },
  {
    p: 'Posso editar as informações depois?',
    r: 'Sim. Depois de aprovada, você acessa a Área do Parceiro com o seu login e atualiza o perfil do seu negócio quando precisar.',
  },
];

const BOTAO_PRINCIPAL =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F0258C] to-[#B620E0] px-7 py-4 text-sm font-bold text-white shadow-[0_10px_40px_-10px_rgba(240,37,140,0.7)] transition hover:brightness-110';

function Num({ n, claro = false }: { n: string; claro?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3" aria-hidden>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold ${
          claro ? 'border-[#D81B7E] text-[#D81B7E]' : 'border-[#F0258C] text-[#F0258C]'
        }`}
      >
        {n}
      </span>
      <span className={`h-px w-10 ${claro ? 'bg-[#D81B7E]/50' : 'bg-[#F0258C]/60'}`} />
    </div>
  );
}

function Titulo({ children, claro = false }: { children: ReactNode; claro?: boolean }) {
  return (
    <h2
      className={`font-display text-4xl font-extrabold leading-[1.02] sm:text-5xl ${claro ? 'text-[#1B1030]' : 'text-white'}`}
    >
      {children}
    </h2>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B0B0E] pb-24 text-white sm:pb-0">
      <Header />

      {/* 01 — Hero */}
      <section className="relative w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 85% 25%, rgba(126,87,194,0.35), transparent 70%), radial-gradient(50% 45% at 10% 95%, rgba(240,37,140,0.22), transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-16">
          <div>
            <Num n="01" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F0258C]">Cadastro gratuito para empresas</p>
            <h1 className="font-display mt-4 text-5xl font-extrabold leading-[0.98] sm:text-7xl">
              Sua empresa pode estar entre os primeiros lugares <span className="text-[#F0258C]">no mapa</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#CFC8DC] sm:text-lg">
              Cadastre sua empresa gratuitamente e prepare seu perfil para o lançamento do Dicas LGBT+.
            </p>
            <div className="mt-8">
              <a href={CADASTRO_EMPRESA} className={BOTAO_PRINCIPAL}>
                Quero cadastrar minha empresa
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-4 text-xs text-[#B5ADC4]">Gratuito • 2 a 5 minutos • Sujeito à análise</p>
            </div>
          </div>
          <PhoneMock />
        </div>
      </section>

      {/* 02 — O mapa começa a ser construído agora */}
      <section className="w-full bg-[#F7F2FB] text-[#1B1030]">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Num n="02" claro />
              <Titulo claro>O mapa começa a ser construído agora</Titulo>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[#4A3F5C] sm:text-base">
                Seja um dos primeiros negócios a fazer parte do Dicas LGBT+ e ganhe visibilidade desde o início.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {VANTAGENS.map((v) => (
                <div key={v.titulo} className="rounded-2xl border border-[#E8D9F3] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FCE4F1] text-[#D81B7E]">
                    <v.icone className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold">{v.titulo}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4A3F5C]">{v.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 03 — O que a comunidade vai encontrar */}
      <section className="w-full">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <Num n="03" />
            <Titulo>O que a comunidade vai encontrar</Titulo>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
              Seu negócio pode estar em uma ou mais categorias no mapa do Dicas LGBT+.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIAS.map((c) => (
              <div
                key={c.nome}
                className="flex flex-col items-center gap-2.5 rounded-2xl border border-white/10 bg-[#14111C] px-2 py-5"
              >
                <c.icone className={`h-7 w-7 ${c.cor}`} />
                <span className="text-[11px] font-semibold text-[#E6E0F0] sm:text-xs">{c.nome}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04 — Acontece fora da tela */}
      <section className="w-full border-t border-white/5">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <Num n="04" />
            <Titulo>O Dicas LGBT+ acontece fora da tela</Titulo>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
              A gente está na rua, nos eventos e nas histórias que a comunidade vive.
            </p>
            {INSTAGRAM_URL && (
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#F0258C]/60 px-5 py-3 text-sm font-bold text-white transition hover:bg-[#F0258C]/10"
              >
                Ver nossos conteúdos
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FotoTile
              src={FOTOS.parada}
              alt="Equipe do Dicas LGBT+ na Parada"
              legenda="Na Parada"
              icone={Heart}
              tom="pink"
              className="row-span-2 min-h-[260px]"
            />
            <FotoTile
              src={FOTOS.bastidores}
              alt="Bastidores das gravações do Dicas LGBT+"
              legenda="Bastidores das gravações"
              icone={Video}
              tom="purple"
              className="min-h-[124px]"
            />
            <FotoTile
              src={FOTOS.festas}
              alt="Festas e eventos cobertos pelo Dicas LGBT+"
              legenda="Festas e eventos que cobrimos"
              icone={PartyPopper}
              tom="pink"
              className="min-h-[124px]"
            />
          </div>
        </div>
      </section>

      {/* 05 — É simples começar */}
      <section id="cadastro" className="w-full scroll-mt-24 bg-[#F7F2FB] text-[#1B1030]">
        <div className="mx-auto w-full max-w-4xl px-6 py-16">
          <Num n="05" claro />
          <Titulo claro>É simples começar</Titulo>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#4A3F5C] sm:text-base">
            Cadastre sua empresa em poucos minutos e prepare seu perfil.
          </p>
          <ol className="mt-8 space-y-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="flex items-center gap-4 rounded-2xl border border-[#E8D9F3] bg-white p-4 shadow-sm sm:p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F0258C] to-[#B620E0] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p.icone className="hidden h-6 w-6 shrink-0 text-[#D81B7E] sm:block" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold sm:text-base">{p.titulo}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#4A3F5C] sm:text-sm">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col items-start gap-4">
            <a href={CADASTRO_EMPRESA} className={BOTAO_PRINCIPAL}>
              Quero cadastrar minha empresa
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="text-xs text-[#4A3F5C]">
              Produz festas ou eventos?{' '}
              <a href={CADASTRO_EVENTO} className="font-semibold text-[#D81B7E] underline underline-offset-4">
                Cadastro de evento
              </a>
              {' · '}Representa uma instituição ou marca?{' '}
              <a href={CADASTRO_INSTITUCIONAL} className="font-semibold text-[#D81B7E] underline underline-offset-4">
                Falar com a equipe
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* 06 — Seu negócio tem espaço nesse mapa */}
      <section className="w-full">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <Num n="06" />
            <Titulo>Seu negócio tem espaço nesse mapa</Titulo>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#CFC8DC] sm:text-base">
              O Dicas LGBT+ é para negócios e iniciativas que acolhem, respeitam e apoiam a comunidade LGBTQIA+.
            </p>
            <div className="mt-6 flex max-w-md items-start gap-3 rounded-2xl border border-[#F0258C]/30 bg-[#F0258C]/10 p-4">
              <Handshake className="mt-0.5 h-6 w-6 shrink-0 text-[#F0258C]" />
              <p className="text-xs leading-relaxed text-[#E6E0F0]">
                Cadastro gratuito e sujeito à análise. Buscamos locais que realmente tenham um compromisso com a
                inclusão e o respeito.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FotoTile src={FOTOS.bares} alt="Bares e casas noturnas" legenda="Bares e casas noturnas" icone={Martini} tom="pink" className="min-h-[150px]" />
            <FotoTile src={FOTOS.restaurantes} alt="Restaurantes e cafeterias" legenda="Restaurantes e cafeterias" icone={UtensilsCrossed} tom="amber" className="min-h-[150px]" />
            <FotoTile src={FOTOS.cultura} alt="Espaços culturais e eventos" legenda="Espaços culturais e eventos" icone={Drama} tom="purple" className="min-h-[150px]" />
            <FotoTile src={FOTOS.hoteis} alt="Hotéis, turismo e serviços" legenda="Hotéis, turismo e serviços" icone={Hotel} tom="blue" className="min-h-[150px]" />
          </div>
        </div>
      </section>

      {/* 07 — Chamado final */}
      <section className="w-full overflow-hidden bg-gradient-to-br from-[#F0258C] via-[#C21FBF] to-[#6B2BD9]">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Num n="07" />
            <h2 className="font-display text-4xl font-extrabold leading-[1.02] text-white sm:text-6xl">
              Sua empresa precisa estar neste futuro
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/90 sm:text-base">
              Ajude a construir o maior guia de lugares, eventos e experiências LGBTQIA+ do Brasil. Cadastre sua
              empresa gratuitamente e faça parte desde o início.
            </p>
            <div className="mt-7">
              <a
                href={CADASTRO_EMPRESA}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-bold text-[#B01A6E] shadow-lg shadow-black/20 transition hover:bg-[#FFF3FA]"
              >
                Quero cadastrar minha empresa
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-4 text-xs text-white/85">Gratuito • 2 a 5 minutos • Sujeito à análise</p>
            </div>
          </div>
          <div className="relative mx-auto aspect-[4/3] w-full max-w-md">
            <FotoTile
              src={FOTOS.cta}
              alt="Pessoas celebrando juntas"
              legenda=""
              icone={Heart}
              tom="purple"
              className="absolute inset-0 !rounded-[2.5rem] border-white/20"
            />
            <p className="font-marker pointer-events-none absolute -right-1 top-4 w-40 rotate-6 text-right text-xl leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:text-2xl">
              MAIS ESPAÇOS REAIS PARA TODAS AS PESSOAS
            </p>
          </div>
        </div>
      </section>

      {/* 08 — Dúvidas frequentes */}
      <section id="duvidas" className="w-full scroll-mt-24 bg-[#F7F2FB] text-[#1B1030]">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-16 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Num n="08" claro />
            <Titulo claro>Dúvidas frequentes</Titulo>
            <div className="mt-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#F0258C] to-[#6B2BD9] text-white shadow-lg">
              <MessageCircleQuestion className="h-12 w-12" />
            </div>
          </div>
          <div className="divide-y divide-[#E3D3F0] rounded-2xl border border-[#E8D9F3] bg-white">
            {DUVIDAS.map((d) => (
              <details key={d.p} className="group px-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold sm:text-base [&::-webkit-details-marker]:hidden">
                  {d.p}
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#D81B7E] transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-[#4A3F5C]">{d.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <MobileFixedCta variant="cadastro" />
    </main>
  );
}
