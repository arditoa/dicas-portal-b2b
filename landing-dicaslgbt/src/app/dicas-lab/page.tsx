import { ArrowRight, CalendarDays, ChevronDown, Lightbulb, Megaphone, MessageCircle, Rocket, Video } from 'lucide-react';
import type { Metadata } from 'next';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import { WHATSAPP_COMERCIAL, linkWhatsapp } from '../../lib/constants';
import { CATEGORIAS, PILARES, type Produto } from '../../lib/dicasLab';

export const metadata: Metadata = {
  title: 'Dicas Lab: estratégia, marketing e divulgação',
  description:
    'Consultoria, atendimento, marketing mensal, produção de conteúdo e divulgação para negócios que querem crescer com personalidade e conectar com a comunidade LGBT+.',
};

// Conteúdo (textos, preços, botões) em src/lib/dicasLab.ts, vindo do
// documento "Produtos Dicas". Cada botão abre o WhatsApp comercial já com o
// nome do produto na mensagem, e o clique entra na medição do site
// (data-track="dicas_lab_<produto>").

const ICONES = {
  lab: Lightbulb,
  atendimento: MessageCircle,
  mensal: CalendarDays,
  producao: Video,
  divulgacao: Megaphone,
  projetos: Rocket,
} as const;

const BOTAO =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F0258C] via-[#B620E0] to-[#6B2BD9] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110';

function msg(assunto: string) {
  return linkWhatsapp(WHATSAPP_COMERCIAL, `Olá! Vim pelo site do Dicas LGBT+ e quero saber mais sobre: ${assunto}.`);
}

function Preco({ p }: { p: Produto }) {
  if (p.tabela) {
    return (
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-[#A0A0B2]">
            <tr>
              <th className="px-4 py-2 font-semibold">Modalidade</th>
              <th className="px-4 py-2 font-semibold">O que você recebe</th>
              <th className="px-4 py-2 font-semibold">Investimento</th>
            </tr>
          </thead>
          <tbody>
            {p.tabela.map((l) => (
              <tr key={l.modalidade} className="border-t border-white/10">
                <td className="px-4 py-2.5 font-semibold">{l.modalidade}</td>
                <td className="px-4 py-2.5 text-[#D0D0E0]">{l.recebe}</td>
                <td className="px-4 py-2.5 font-bold text-white">{l.preco}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="mt-4">
      {p.prefixo && <p className="text-xs text-[#A0A0B2]">{p.prefixo}</p>}
      {p.de && <p className="text-sm text-[#A0A0B2] line-through">De {p.de}</p>}
      <p className="font-display text-3xl font-extrabold leading-none text-white">
        {p.de ? <span className="mr-2 text-sm font-semibold text-[#A0A0B2]">Por</span> : null}
        {p.preco}
      </p>
      {p.nota && <p className="mt-1 text-xs text-[#A0A0B2]">{p.nota}</p>}
    </div>
  );
}

function CardProduto({ p }: { p: Produto }) {
  return (
    <article id={p.slug} className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-[#14131A] p-6">
      <h3 className="font-display text-2xl font-extrabold uppercase leading-tight">{p.nome}</h3>
      <p className="mt-2 text-sm font-semibold leading-snug text-[#FF6BB5]">{p.gancho}</p>
      <Preco p={p} />

      <details className="group mt-5 border-t border-white/10 pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[#E6E0F0] marker:hidden">
          Ver detalhes
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed">
          {p.blocos.map((b) => (
            <div key={b.t}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0B2]">{b.t}</h4>
              {b.p && <p className="mt-1 text-[#D0D0E0]">{b.p}</p>}
              {b.li && (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[#D0D0E0]">
                  {b.li.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </details>

      <a
        href={msg(p.nome)}
        target="_blank"
        rel="noopener noreferrer"
        data-track={`dicas_lab_${p.slug}`}
        data-onde="pagina_dicas_lab"
        className="mt-6 inline-flex items-center justify-between gap-3 rounded-xl border border-[#F0258C]/50 px-4 py-3 text-sm font-bold text-white transition hover:border-[#F0258C] hover:bg-[#F0258C]/10"
      >
        <span>{p.cta}</span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </a>
    </article>
  );
}

export default function DicasLabPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] pb-10 text-white">
      <Header />

      {/* Abertura */}
      <section className="relative w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
          style={{
            background:
              'radial-gradient(55% 60% at 50% -10%, rgba(240,37,140,0.22), rgba(107,43,217,0.12) 45%, transparent 75%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-4xl px-6 pb-12 pt-14 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF6BB5]">Ecossistema Dicas</p>
          <h1 className="font-display mt-3 text-5xl font-extrabold uppercase leading-[0.95] sm:text-7xl">
            Seu negócio tem potencial. <span className="gradient-text">Bora fazer ele brilhar?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold text-white">
            Vender mais, atender melhor, aparecer para as pessoas certas e tirar boas ideias do papel
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#A0A0B2]">
            A gente sabe: conquistar a comunidade LGBT+ envolve acolhimento, experiência e uma conexão que continua depois
            da primeira visita. No Ecossistema Dicas, juntamos estratégia, conteúdo e conhecimento sobre o público para
            ajudar seu negócio a crescer com personalidade.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href={msg('encontrar a solução para o meu negócio')}
              target="_blank"
              rel="noopener noreferrer"
              data-track="dicas_lab_solucao"
              data-onde="pagina_dicas_lab"
              className={BOTAO}
            >
              Bora encontrar a solução para meu negócio <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </section>

      {/* Três frentes */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-4">
        <div className="grid gap-4 md:grid-cols-3">
          {PILARES.map((x) => (
            <a
              key={x.titulo}
              href={x.href}
              className="rounded-2xl border border-white/10 bg-[#14131A] p-6 transition hover:border-[#F0258C]/60"
            >
              <h2 className="font-display text-2xl font-extrabold uppercase leading-tight">{x.titulo}</h2>
              {x.sub && <p className="mt-1 text-sm font-semibold text-[#FF6BB5]">{x.sub}</p>}
              <p className="mt-3 text-sm leading-relaxed text-[#A0A0B2]">{x.texto}</p>
            </a>
          ))}
        </div>

        <nav aria-label="Seções desta página" className="mt-8 flex flex-wrap justify-center gap-2">
          {CATEGORIAS.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-[#E6E0F0] transition hover:border-[#F0258C] hover:text-white"
            >
              {c.titulo}
            </a>
          ))}
        </nav>
      </section>

      {/* Categorias */}
      {CATEGORIAS.map((c) => {
        const Icone = ICONES[c.icone];
        return (
          <section
            key={c.id}
            id={c.id}
            className="mx-auto mt-14 w-full max-w-6xl scroll-mt-28 border-t-2 border-[#F0258C]/30 px-6 pt-12"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#14131A] text-[#FF6BB5]">
                <Icone className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">{c.titulo}</h2>
                <p className="mt-2 text-lg font-semibold text-[#FF6BB5]">{c.subtitulo}</p>
                {c.intro && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#A0A0B2]">{c.intro}</p>}
              </div>
            </div>
            <div className="mt-8 grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
              {c.produtos.map((p) => (
                <CardProduto key={p.slug} p={p} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Fechamento */}
      <section className="mx-auto mt-16 w-full max-w-4xl px-6">
        <div className="rounded-3xl border border-[#F0258C]/30 bg-gradient-to-br from-[#2A0F3A] via-[#1B0F2E] to-[#0B0B0E] px-6 py-12 text-center">
          <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">
            Crescer com personalidade. Receber com respeito. <span className="gradient-text">Conectar de verdade</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[#D0D0E0]">
            A comunidade LGBT+ reúne diferentes histórias, estilos e formas de viver. Conhecer essas diferenças ajuda seu
            negócio a comunicar melhor, acolher melhor e criar experiências que fazem sentido para as pessoas.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold text-white">
            Conte para a gente o que você quer desenvolver. Vamos encontrar o próximo passo juntos.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href={msg('conversar com o Dicas')}
              target="_blank"
              rel="noopener noreferrer"
              data-track="dicas_lab_conversar"
              data-onde="pagina_dicas_lab"
              className={BOTAO}
            >
              Bora conversar com o Dicas <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-[#8A8A9C]">
          As condições de execução, prazos, gravações, revisões e pagamento são detalhadas na proposta. Consulte a
          disponibilidade das ofertas.
        </p>
      </section>

      <Footer />
    </main>
  );
}
