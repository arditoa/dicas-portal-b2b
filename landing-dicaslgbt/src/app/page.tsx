'use client';

import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Compass,
  Heart,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// URL real do portal de parceiros já publicado (projeto Next separado,
// deploy próprio na Vercel) — ajustar aqui se/quando um domínio
// definitivo (ex.: portal.vezpabar.com) for configurado. Mesma constante
// que já existe em portal-b2b-lgbt/src/app/admin/page.tsx.
const URL_PORTAL = 'https://dicas-portal-b2b-dun.vercel.app';

interface PlanoPreview {
  nome: string;
  preco: string;
  destaque: boolean;
  tag?: string;
}

const PLANOS_PREVIEW: PlanoPreview[] = [
  { nome: 'Freemium', preco: 'R$0', destaque: false },
  { nome: 'Starter', preco: 'R$59/mês', destaque: false },
  { nome: 'Intermediário', preco: 'R$249/mês', destaque: false },
  { nome: 'Premium', preco: 'R$599/mês', destaque: true },
  { nome: 'Fundador', preco: 'R$3.500/mês', destaque: false, tag: '5 vagas no total' },
];

function WaitlistForm() {
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nome.trim() || !contato.trim()) {
      setErro('Preencha seu nome e um e-mail ou WhatsApp pra te avisar.');
      return;
    }

    setLoading(true);
    try {
      const ehEmail = contato.includes('@');
      // Reaproveita a tabela leads_institucionais (a mesma que o /contato
      // do portal já usa em produção — RLS já libera insert público) em
      // vez de criar uma tabela nova só pra isso. origem fica marcada
      // como 'contato_geral' (único valor do enum que cabe aqui sem
      // precisar de uma migration nova) e a mensagem é prefixada pra dar
      // pra distinguir de um contato institucional de verdade na fila do
      // /admin.
      const { error } = await supabase.from('leads_institucionais').insert({
        origem: 'contato_geral',
        nome_organizacao: nome,
        email: ehEmail ? contato : null,
        whatsapp: ehEmail ? null : contato,
        mensagem: '[Lista de espera do app — site institucional] Quero ser avisado(a) quando o app for lançado.',
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="flex items-center gap-3 bg-[#161520] border border-[#4CAF7D]/30 rounded-2xl p-5">
        <CheckCircle2 className="w-6 h-6 text-[#4CAF7D] shrink-0" />
        <p className="text-sm text-[#D0D0E0]">
          Prontinho! Você vai ser avisado(a) em primeira mão quando o app estiver disponível.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Seu nome"
        disabled={loading}
        className="flex-1 bg-[#161520] border border-[#232230] rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-[#626274] focus:outline-none focus:border-[#E1306C] disabled:opacity-60"
      />
      <input
        type="text"
        value={contato}
        onChange={(e) => setContato(e.target.value)}
        placeholder="E-mail ou WhatsApp"
        disabled={loading}
        className="flex-1 bg-[#161520] border border-[#232230] rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-[#626274] focus:outline-none focus:border-[#E1306C] disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-[#E1306C] hover:bg-[#c2285c] disabled:opacity-60 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Quero ser avisado(a)
      </button>
      {erro && <p className="text-xs text-red-400 sm:absolute sm:mt-14">{erro}</p>}
    </form>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      {/* Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="relative h-10 w-40 sm:h-11 sm:w-48">
          <Image
            src="/logo-lockup.png"
            alt="Dicas LGBT+"
            fill
            className="object-contain object-left"
            priority
          />
        </div>
        <Link
          href={`${URL_PORTAL}/login`}
          className="text-xs sm:text-sm font-medium bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl border border-white/10 transition"
        >
          Já é parceiro? Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="w-full max-w-4xl mx-auto text-center px-6 pt-12 pb-16 fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7E57C2]/10 border border-[#7E57C2]/30 text-[#B79EE8] text-xs font-semibold tracking-wide uppercase mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Em breve — App Store e Google Play
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Conectamos experiências <span className="gradient-text">LGBT+</span> aos lugares que fazem
          elas acontecerem.
        </h1>
        <p className="text-[#A0A0B2] text-base sm:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
          O Dicas LGBT+ ajuda você a encontrar bares, baladas, eventos e espaços seguros de verdade —
          e ajuda esses lugares a serem descobertos por quem mais quer viver essa experiência.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-10">
          <a
            href="#lista-de-espera"
            className="bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition flex items-center gap-2"
          >
            Quero ser avisado(a) no lançamento
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#para-o-seu-negocio"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition"
          >
            Sou um local ou organizo eventos
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-xs text-[#626274]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF7D]" /> Selo Espaço Seguro
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-[#E1306C]" /> Feito por e para a comunidade LGBT+
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#7E57C2]" /> Bares, eventos e experiências reais
          </span>
        </div>
      </section>

      {/* Para você (usuário final) */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-[#232230]">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-bold text-[#E1306C] uppercase tracking-wide">Para você</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">
            Nada de pesquisar &quot;lugar LGBT-friendly perto de mim&quot; e torcer pra dar certo.
          </h2>
          <p className="text-[#A0A0B2] text-sm sm:text-base mt-3 leading-relaxed">
            Cada local do app é organizado por categoria, tags de experiência e agenda — e os espaços
            com o selo Espaço Seguro passaram por um critério real, não é decoração.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
            <div className="w-11 h-11 rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/20 flex items-center justify-center text-[#E1306C] mb-5">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold mb-2">Descubra por categoria</h3>
            <p className="text-[#A0A0B2] text-sm leading-relaxed">
              Bares, baladas, restaurantes e mais — filtrados por experiência que você procura, não só
              por endereço no mapa.
            </p>
          </div>
          <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
            <div className="w-11 h-11 rounded-xl bg-[#7E57C2]/10 border border-[#7E57C2]/20 flex items-center justify-center text-[#7E57C2] mb-5">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold mb-2">Agenda da semana</h3>
            <p className="text-[#A0A0B2] text-sm leading-relaxed">
              Drag show na quinta, karaokê no sábado — veja o que cada local está preparando dia a dia,
              não só o cadastro genérico.
            </p>
          </div>
          <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
            <div className="w-11 h-11 rounded-xl bg-[#FFD54F]/10 border border-[#FFD54F]/20 flex items-center justify-center text-[#FFD54F] mb-5">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold mb-2">Eventos e listas VIP</h3>
            <p className="text-[#A0A0B2] text-sm leading-relaxed">
              Festas, festivais e encontros com confirmação de presença — e entrada facilitada quando o
              evento tem lista.
            </p>
          </div>
          <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
            <div className="w-11 h-11 rounded-xl bg-[#4CAF7D]/10 border border-[#4CAF7D]/20 flex items-center justify-center text-[#4CAF7D] mb-5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold mb-2">Selo Espaço Seguro</h3>
            <p className="text-[#A0A0B2] text-sm leading-relaxed">
              Um jeito rápido de saber, antes de sair de casa, que aquele lugar recebe bem a comunidade
              de verdade.
            </p>
          </div>
        </div>
      </section>

      {/* Lista de espera */}
      <section id="lista-de-espera" className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-[#232230] text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold">
          O app ainda está a caminho das lojas.
        </h2>
        <p className="text-[#A0A0B2] text-sm sm:text-base mt-3 mb-8 max-w-xl mx-auto leading-relaxed">
          Deixe seu contato e a gente te avisa em primeira mão no dia do lançamento — sem spam, só o
          essencial.
        </p>
        <div className="flex justify-center">
          <WaitlistForm />
        </div>
      </section>

      {/* Para o seu negócio */}
      <section id="para-o-seu-negocio" className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-[#232230]">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-bold text-[#7E57C2] uppercase tracking-wide">Para o seu negócio</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">
            Seu público já existe. A questão é só: ele consegue te encontrar?
          </h2>
          <p className="text-[#A0A0B2] text-sm sm:text-base mt-3 leading-relaxed">
            A comunidade LGBT+ decide onde ir com base em quem já disse que aquele lugar é seguro e
            bem-vindo. O Dicas LGBT+ é o lugar onde essa decisão é tomada — estar lá primeiro é estar
            na frente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            href={`${URL_PORTAL}/cadastro/local`}
            className="group relative bg-[#161520] border border-[#232230] hover:border-[#E1306C]/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/20 flex items-center justify-center text-[#E1306C] mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Local / Comércio</h3>
              <p className="text-[#A0A0B2] text-sm leading-relaxed">
                Bares, restaurantes, hotéis, lojas e serviços amigáveis e seguros para a comunidade.
              </p>
            </div>
            <div className="mt-8 flex items-center text-xs font-semibold text-[#E1306C] gap-2">
              Cadastrar meu local — é grátis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href={`${URL_PORTAL}/cadastro/evento`}
            className="group relative bg-[#161520] border border-[#232230] hover:border-[#7E57C2]/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#7E57C2]/10 border border-[#7E57C2]/20 flex items-center justify-center text-[#7E57C2] mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Eventos & Festas</h3>
              <p className="text-[#A0A0B2] text-sm leading-relaxed">
                Festas, festivais, feiras culturais, conferências e encontros voltados ao público.
              </p>
            </div>
            <div className="mt-8 flex items-center text-xs font-semibold text-[#7E57C2] gap-2">
              Cadastrar meu evento
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href={`${URL_PORTAL}/cadastro/institucional`}
            className="group relative bg-[#161520] border border-[#232230] hover:border-[#FFD54F]/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#FFD54F]/10 border border-[#FFD54F]/20 flex items-center justify-center text-[#FFD54F] mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Institucional / ONG / Marca</h3>
              <p className="text-[#A0A0B2] text-sm leading-relaxed">
                Organizações, projetos sociais e marcas parceiras de apoio e visibilidade.
              </p>
            </div>
            <div className="mt-8 flex items-center text-xs font-semibold text-[#FFD54F] gap-2">
              Falar com o time
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Planos — preview */}
        <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 sm:p-8">
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
                {p.tag && (
                  <div className="text-[9px] font-extrabold text-[#FFD54F] mb-1 uppercase">{p.tag}</div>
                )}
                <div className="text-xs text-[#A0A0B2] font-semibold">{p.nome}</div>
                <div className="text-sm font-black mt-1">{p.preco}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#626274] mt-5">
            Valores exibidos para locais. Cadastre-se gratuitamente e escolha (ou troque) de plano
            depois, direto no seu painel.
          </p>
        </div>
      </section>

      {/* Por que confiar */}
      <section className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-[#232230] text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-[#4CAF7D]/10 border border-[#4CAF7D]/20 items-center justify-center mb-6">
          <Check className="w-7 h-7 text-[#4CAF7D]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold">Construído com — e para — a comunidade.</h2>
        <p className="text-[#A0A0B2] text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
          O Dicas LGBT+ nasceu pra resolver um problema real: encontrar (e ser encontrado por) quem
          entende o que significa se sentir seguro e bem-vindo. Cada plano pago existe pra manter esse
          trabalho de curadoria de pé — não pra virar mais um app cheio de anúncio genérico.
        </p>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-10 border-t border-[#232230] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#626274]">
        <div className="relative h-8 w-14">
          <Image src="/logo-icon.png" alt="Dicas LGBT+" fill className="object-contain object-left" />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center">
          <span>© {new Date().getFullYear()} Dicas LGBT+ / Vezpa Bar. Todos os direitos reservados.</span>
          <Link href="/excluir-conta" className="hover:text-white transition">
            Exclusão de conta
          </Link>
          <Link href={`${URL_PORTAL}/login`} className="hover:text-white transition">
            Área do parceiro
          </Link>
        </div>
      </footer>
    </main>
  );
}
