import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Compass,
  Globe2,
  Heart,
  Map as MapIcon,
  MapPin,
  Palette,
  PartyPopper,
  Plane,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import Link from 'next/link';
import Footer from '../components/Footer';
import Header from '../components/Header';
import MobileFixedCta from '../components/MobileFixedCta';
import { URL_PORTAL } from '../lib/constants';

// Rodada 58 — Página inicial reescrita ponta a ponta seguindo
// Guia_Configuracao_Site_Dicas_LGBT_App.docx, Seção 2 ("Página inicial —
// cadastro de empresas"), na ordem e com os textos exatos do documento.
// Mudança de framing importante em relação à Rodada 42: lá a Home falava
// com usuário final E empresa na mesma página (hero + lista de espera +
// cards de negócio, todos misturados). O Guia divide isso — a Home passa
// a ser 100% focada em cadastro de EMPRESA (a lista de espera do usuário
// final virou a página própria /lancamento), e o conteúdo voltado a
// usuário final foi pra /app e /sobre. Ver nota maior no rodapé deste
// arquivo sobre a Seção 9 (formulário de cadastro).

const PLANOS_PREVIEW = [
  { nome: 'Freemium', preco: 'R$0', destaque: false },
  { nome: 'Starter', preco: 'R$59/mês', destaque: false },
  { nome: 'Intermediário', preco: 'R$249/mês', destaque: false },
  { nome: 'Premium', preco: 'R$599/mês', destaque: true },
  // Rodada 59 — Andrea confirmou: Fundador não é mensal, é pacote único
  // de 12 meses (R$3.490 à vista ou 12x R$349) — bate com a página
  // /parceiro-fundador. O R$3.500/mês era o valor errado.
  // Rodada 59 (parte 2) — "5 vagas" também estava errado; Andrea
  // confirmou "10 oportunidades", batendo com /parceiro-fundador.
  { nome: 'Fundador', preco: 'R$3.490 à vista', destaque: false, tag: '10 vagas no total' },
];

const ATALHOS = [
  { titulo: 'Sobre o Dicas LGBT+', texto: 'Conheça nossa história, propósito e trajetória.', href: '/sobre' },
  { titulo: 'Dicas LGBT+ App', texto: 'Veja como o aplicativo vai funcionar.', href: '/app' },
  { titulo: 'Dicas Trip', texto: 'Conheça a área de turismo do aplicativo.', href: '/dicas-trip' },
  { titulo: 'Lista de lançamento', texto: 'Quero ser avisado quando o app for lançado.', href: '/lancamento' },
];

const NUMEROS = [
  { destaque: 'Quase 5 anos', texto: 'conectando comunidade e empresas' },
  { destaque: 'Mais de 100', texto: 'empresas atendidas' },
  { destaque: '35 mil', texto: 'pessoas no Instagram' },
  { destaque: 'Cerca de 1 milhão', texto: 'de impressões mensais' },
];

const TELAS = [
  { nome: 'Início', legenda: 'Destaques, categorias e sugestões do que fazer hoje.', icone: Sparkles },
  { nome: 'Mapa', legenda: 'Lugares organizados por proximidade, categoria e experiência.', icone: MapIcon },
  { nome: 'Agenda', legenda: 'Festas, eventos e programações por data.', icone: Calendar },
  { nome: 'Dicas Trip', legenda: 'Destinos, hospedagens, roteiros e experiências.', icone: Plane },
  { nome: 'Perfil', legenda: 'Favoritos, cupons, indicações e preferências.', icone: User },
];

const BENEFICIOS = [
  { titulo: 'Pioneirismo', texto: 'Esteja entre as primeiras empresas disponíveis no lançamento.' },
  { titulo: 'Visibilidade segmentada', texto: 'Seja encontrada por pessoas interessadas na sua categoria e experiência.' },
  { titulo: 'Perfil do negócio', texto: 'Apresente fotos, contatos, público, vibe e diferenciais.' },
  { titulo: 'Agenda e eventos', texto: 'Mostre o que acontece no seu espaço e mantenha o público atualizado.' },
  { titulo: 'Possibilidades comerciais', texto: 'Conheça opções futuras de cupons, destaques e campanhas.' },
  { titulo: 'Dados e resultados', texto: 'Nos planos comerciais, acompanhe visibilidade e interações.' },
];

const CATEGORIAS = [
  { nome: 'Bares', icone: Building2 },
  { nome: 'Gastronomia', icone: UtensilsCrossed },
  { nome: 'Cultura', icone: Palette },
  { nome: 'Experiências', icone: Sparkles },
  { nome: 'Turismo', icone: Plane },
  { nome: 'Festas e eventos', icone: PartyPopper },
];

const PASSOS = [
  'Faça o cadastro e conte o essencial sobre seu negócio.',
  'A equipe confere as informações em até 48 horas.',
  'O retorno é enviado por e-mail e WhatsApp.',
  'Empresas aprovadas recebem acesso antecipado para testar e verificar o perfil.',
  'O perfil fica preparado para a chegada dos usuários no lançamento público.',
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white pb-24 sm:pb-0">
      <Header />

      {/* Seção 1 — Primeira tela */}
      <section className="w-full max-w-4xl mx-auto text-center px-6 pt-14 pb-16 fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7E57C2]/10 border border-[#7E57C2]/30 text-[#B79EE8] text-xs font-semibold tracking-wide uppercase mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Cadastros antecipados abertos
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Sua empresa precisa estar neste futuro.
        </h1>
        <p className="text-[#A0A0B2] text-base sm:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
          Cadastre gratuitamente seu negócio e esteja entre as primeiras empresas do Dicas LGBT+ App.
          Conecte-se com pessoas que procuram lugares, serviços, eventos, destinos e experiências
          comprometidas com a diversidade.
        </p>

        <div className="flex flex-col items-center gap-2 mt-10">
          <a
            href="#cadastro"
            className="bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition flex items-center gap-2"
          >
            Cadastrar minha empresa gratuitamente
            <ArrowRight className="w-4 h-4" />
          </a>
          <span className="text-xs text-[#626274]">Leva cerca de 2 minutos. Análise em até 48 horas.</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs">
          <Link href="/app" className="text-[#A0A0B2] hover:text-white transition underline underline-offset-4">
            Conhecer o aplicativo
          </Link>
          <Link href="/entrar" className="text-[#A0A0B2] hover:text-white transition">
            Já sou parceiro: entrar
          </Link>
        </div>
      </section>

      {/* Seção 2 — Atalhos do projeto */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-[#232230]">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-8">Quer conhecer melhor o projeto?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ATALHOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group bg-[#161520] border border-[#232230] hover:border-[#E1306C]/50 rounded-2xl p-6 transition-all hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-bold mb-2">{a.titulo}</h3>
                <p className="text-[#A0A0B2] text-sm leading-relaxed">{a.texto}</p>
              </div>
              <ArrowRight className="w-4 h-4 mt-5 text-[#E1306C] group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>
      </section>

      {/* Seção 3 — Números */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-[#232230]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {NUMEROS.map((n) => (
            <div key={n.destaque}>
              <div className="text-2xl sm:text-3xl font-black gradient-text">{n.destaque}</div>
              <div className="text-xs sm:text-sm text-[#A0A0B2] mt-1">{n.texto}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Seção 4 — Oportunidade */}
      <section className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-[#232230] text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold">
          Seu público já existe. Agora ele precisa encontrar você.
        </h2>
        <p className="text-[#A0A0B2] text-sm sm:text-base mt-4 leading-relaxed max-w-2xl mx-auto">
          Todos os dias, pessoas LGBT+ procuram lugares para sair, comer, viajar, se cuidar e viver
          novas experiências. O Dicas LGBT+ App vai aproximar essa comunidade das empresas que querem
          ser descobertas por ela. Quem entra primeiro ajuda a construir o mapa e começa na frente.
        </p>
        <a
          href="#cadastro"
          className="inline-flex items-center gap-2 mt-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition"
        >
          Quero colocar minha empresa no mapa
          <ArrowRight className="w-4 h-4" />
        </a>
      </section>

      {/* Seção 5 — Demonstração do aplicativo */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-[#232230]">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-10 text-center">
          Não estamos criando apenas mais um guia.
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {TELAS.map((t) => (
            <div key={t.nome} className="bg-[#161520] border border-[#232230] rounded-2xl p-5 text-center">
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/20 flex items-center justify-center text-[#E1306C] mb-4">
                <t.icone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm mb-1.5">{t.nome}</h3>
              <p className="text-[#A0A0B2] text-[11px] leading-relaxed">{t.legenda}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seção 6 — Benefícios */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-[#232230]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
              <h3 className="font-bold mb-2">{b.titulo}</h3>
              <p className="text-[#A0A0B2] text-sm leading-relaxed">{b.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seção 7 — Categorias */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-[#232230]">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-8 text-center">Tem lugar para o seu negócio aqui.</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CATEGORIAS.map((c) => (
            <a
              key={c.nome}
              href="#cadastro"
              className="group bg-[#161520] border border-[#232230] hover:border-[#E1306C]/50 rounded-2xl p-6 text-center transition-all hover:-translate-y-1"
            >
              <div className="w-11 h-11 mx-auto rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/20 flex items-center justify-center text-[#E1306C] mb-4">
                <c.icone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm mb-2">{c.nome}</h3>
              <span className="text-[11px] font-semibold text-[#E1306C] inline-flex items-center gap-1">
                Cadastrar meu negócio <ArrowRight className="w-3 h-3" />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Seção 8 — Como funciona */}
      <section className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-[#232230]">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-8 text-center">Como funciona</h2>
        <ol className="space-y-4">
          {PASSOS.map((p, i) => (
            <li key={p} className="flex items-start gap-4 bg-[#161520] border border-[#232230] rounded-2xl p-5">
              <span className="w-7 h-7 shrink-0 rounded-full bg-[#E1306C] text-white text-xs font-black flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-[#D0D0E0] leading-relaxed pt-0.5">{p}</p>
            </li>
          ))}
        </ol>
        <div className="text-center mt-8">
          <a
            href="#cadastro"
            className="inline-flex items-center gap-2 bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition"
          >
            Começar meu cadastro gratuito
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Seção 9 — Formulário de cadastro */}
      <section id="cadastro" className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-[#232230] scroll-mt-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Vamos colocar sua empresa no mapa?</h2>
          <p className="text-[#A0A0B2] text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
            Leva cerca de 2 minutos com os dados em mãos. Se precisar consultar alguma informação, você
            pode concluir em até 5 minutos.
          </p>
        </div>

        <p className="text-center text-xs font-bold text-[#626274] uppercase tracking-wide mb-5">
          Como você quer participar?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Link
            href={`${URL_PORTAL}/cadastro/local`}
            className="group bg-[#161520] border border-[#232230] hover:border-[#E1306C]/50 rounded-2xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/20 flex items-center justify-center text-[#E1306C] mb-5">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold mb-2">Tenho um espaço ou empresa</h3>
              <p className="text-[#A0A0B2] text-xs leading-relaxed">
                Negócio, contato e perfil (fotos, vibe, endereço). Cadastro gratuito, análise em até 48h.
              </p>
            </div>
            <span className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#E1306C]">
              Abrir cadastro de empresa
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link
            href={`${URL_PORTAL}/cadastro/evento`}
            className="group bg-[#161520] border border-[#232230] hover:border-[#7E57C2]/50 rounded-2xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#7E57C2]/10 border border-[#7E57C2]/20 flex items-center justify-center text-[#7E57C2] mb-5">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold mb-2">Produzo festas ou eventos</h3>
              <p className="text-[#A0A0B2] text-xs leading-relaxed">
                Cadastre o produtor e envie cada evento para revisão antes da publicação.
              </p>
            </div>
            <span className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#7E57C2]">
              Abrir cadastro de produtor/evento
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link
            href={`${URL_PORTAL}/cadastro/institucional`}
            className="group bg-[#161520] border border-[#232230] hover:border-[#FFD54F]/50 rounded-2xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#FFD54F]/10 border border-[#FFD54F]/20 flex items-center justify-center text-[#FFD54F] mb-5">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="font-bold mb-2">Represento uma instituição ou marca</h3>
              <p className="text-[#A0A0B2] text-xs leading-relaxed">
                Fale com a equipe sobre parcerias institucionais, ONGs e marcas.
              </p>
            </div>
            <span className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#FFD54F]">
              Falar com a equipe
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        {/* Planos — prévia honesta, mesma da Rodada 42 */}
        <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 sm:p-8 mt-10">
          <h3 className="font-bold text-base mb-1">Comece de graça, cresça quando quiser</h3>
          <p className="text-[#A0A0B2] text-sm mb-6">
            O cadastro é sempre gratuito. Planos pagos aumentam sua visibilidade dentro do app — sem
            contrato de fidelidade.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {PLANOS_PREVIEW.map((p) => (
              <div
                key={p.nome}
                className={`rounded-xl border p-4 text-center ${
                  p.destaque ? 'border-[#E1306C] bg-[#E1306C]/5' : 'border-[#232230] bg-[#161520]'
                }`}
              >
                {p.tag && <div className="text-[9px] font-extrabold text-[#FFD54F] mb-1 uppercase">{p.tag}</div>}
                <div className="text-xs text-[#A0A0B2] font-semibold">{p.nome}</div>
                <div className="text-sm font-black mt-1">{p.preco}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 10 — Parceiro Fundador */}
      <section className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-[#232230] text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold">
          Quer fazer parte desde o começo de um jeito ainda maior?
        </h2>
        <p className="text-[#A0A0B2] text-sm sm:text-base mt-4 max-w-2xl mx-auto leading-relaxed">
          Conheça o programa Parceiro Fundador e tenha presença de destaque, benefícios exclusivos e
          participação mais próxima na construção do Dicas LGBT+ App.
        </p>
        <Link
          href="/parceiro-fundador"
          className="inline-flex items-center gap-2 mt-8 bg-[#FFD54F] hover:bg-[#f0c53e] text-black font-bold text-sm px-6 py-3.5 rounded-xl transition"
        >
          Conhecer o Parceiro Fundador
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Seção 11 — Instituições */}
      <section className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-[#232230] text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-[#4CAF7D]/10 border border-[#4CAF7D]/20 items-center justify-center mb-6">
          <Globe2 className="w-7 h-7 text-[#4CAF7D]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold">Construído com diálogo, comunidade e parceiros.</h2>
        {/* Logos só entram aqui quando oficialmente autorizados — ver nota no rodapé do arquivo. */}
      </section>

      {/* Seção 12 — Chamada final */}
      <section className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-[#232230] text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-[#E1306C]/10 border border-[#E1306C]/20 items-center justify-center mb-6">
          <Heart className="w-7 h-7 text-[#E1306C]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold">
          O mapa está começando a ganhar vida. Sua empresa pode estar nele desde o início.
        </h2>
        <a
          href="#cadastro"
          className="inline-flex items-center gap-2 mt-8 bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition"
        >
          Cadastrar minha empresa gratuitamente
          <ArrowRight className="w-4 h-4" />
        </a>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-[#626274]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF7D]" /> Selo Espaço Seguro
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#7E57C2]" /> Bares, eventos e experiências reais
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#E1306C]" /> Feito por e para a comunidade LGBT+
          </span>
        </div>
      </section>

      <Footer />
      <MobileFixedCta variant="cadastro" />
    </main>
  );
}

// NOTA (Rodada 58, não remover): a Seção 9 do Guia especifica um
// formulário multi-etapa completo, com campos, máscaras de CPF/CNPJ,
// texto de ajuda por campo e mensagem de conclusão própria, diretamente
// nesta página. Decisão desta rodada: em vez de reconstruir esse
// formulário do zero aqui (o que criaria um SEGUNDO lugar gravando
// cadastro de local/evento/institucional, arriscando duplicar/perder
// dados e ignorar toda a lógica de aprovação que o portal já tem em
// produção), a Seção 9 virou um "roteador" pros 3 formulários REAIS que
// já existem e funcionam no portal (/cadastro/local, /cadastro/evento,
// /cadastro/institucional). O detalhamento campo a campo do Guia
// (máscaras, textos de ajuda, barra de progresso, upload com limite,
// etc.) é material valioso pra uma rodada futura de melhorar ESSES
// formulários reais no portal — não foi descartado, só não implementado
// aqui hoje. Ver "Pendente" no doc de registro desta rodada.
