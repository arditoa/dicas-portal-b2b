'use client';
import { ArrowLeft, Check, CheckCircle2, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Nomes/valores usados no enum public.plano_comercial (005). Precisam bater
// exatamente com os `slug`s abaixo.
const planos = [
  {
    slug: 'freemium',
    nome: 'Freemium',
    preco: 'R$0',
    sub: 'sempre grátis',
    beneficios: [
      { text: 'Aparece no mapa e na categoria', ok: true },
      { text: '@Instagram no perfil', ok: false },
      { text: 'Cupons', ok: false },
      { text: 'Destaque / tags', ok: false },
    ],
    cta: 'Continuar grátis',
    highlight: false,
  },
  {
    slug: 'starter',
    nome: 'Starter',
    preco: 'R$59',
    sub: '/mês',
    beneficios: [
      { text: 'Tudo do Freemium', ok: true },
      { text: 'Mostre seu instagram', ok: true },
      { text: '2 cupons por mês', ok: false },
      { text: 'Destaque / tags', ok: false },
    ],
    cta: 'Selecionar',
    highlight: false,
  },
  {
    slug: 'intermediario',
    nome: 'Intermediário',
    preco: 'R$249',
    sub: '/mês',
    beneficios: [
      { text: 'Tudo do Starter', ok: true },
      { text: 'Suba na sua categoria', ok: true },
      { text: 'Prioridade — Top 15 da categoria', ok: true },
      { text: 'Cupons ilimitados', ok: true },
    ],
    cta: 'Selecionar',
    highlight: false,
  },
  {
    slug: 'premium',
    nome: 'Premium',
    tag: 'RECOMENDADO',
    preco: 'R$599',
    sub: '/mês',
    beneficios: [
      { text: 'Tudo do Intermediário', ok: true },
      { text: 'Apareça no "Em Alta"', ok: true },
      { text: 'Seção "Em Alta" rotativa (pool de 20)', ok: true },
      { text: '3 tags — Top 5', ok: true },
      { text: '1 push mensal', ok: true },
    ],
    cta: 'Assinar Premium',
    highlight: true,
    color: '#E1306C',
  },
  {
    // Rodada 59 — Andrea corrigiu: "esse 3500 esta equivocado". O plano
    // Fundador nunca foi mensal de verdade — é um pacote único de 12
    // meses (R$3.490 à vista ou 12x R$349, ~R$4.188 parcelado), igual ao
    // que a página /parceiro-fundador do site institucional já anuncia
    // (Rodada 58, copy do Guia). R$3.500/mês era o valor errado, usado
    // desde a Rodada 24.
    // Rodada 59 (parte 2) — "5 VAGAS NO TOTAL" também estava errado;
    // Andrea confirmou "10 oportunidades", batendo com "Lote 1 | 10
    // oportunidades" que já estava certo em /parceiro-fundador.
    // Atualização — Andrea pediu pra liderar com "12x R$349" em vez de
    // "R$3.490", pra parecer mais barato/vendável (mesmo pacote de 12
    // meses, só troca qual número fica em destaque). R$3.490 à vista
    // continua disponível, agora como opção secundária no "sub".
    slug: 'fundador',
    nome: 'Fundador',
    tag: '10 VAGAS NO TOTAL',
    preco: 'R$349',
    sub: '/mês × 12 (ou R$3.490 à vista)',
    beneficios: [
      { text: 'Tudo do Premium', ok: true },
      { text: 'Banner permanente na Home', ok: true },
      { text: 'Não entra em rotação', ok: true },
      { text: 'Vagas travadas — exclusividade', ok: true },
    ],
    cta: 'Consultar vaga',
    highlight: false,
    borderGold: true,
  },
] as const;

export default function PlanosPage() {
  const router = useRouter();
  const [localId, setLocalId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<{ nome: string; gratis: boolean } | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data } = await supabase
          .from('locais')
          .select('id')
          .eq('owner_id', userData.user.id)
          .maybeSingle();
        setLocalId(data?.id ?? null);
      }
      setCarregando(false);
    })();
  }, []);

  const escolherPlano = async (plano: (typeof planos)[number]) => {
    setErro('');

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      router.push('/login');
      return;
    }
    if (!localId) {
      // Tem conta, mas não tem local vinculado ainda — não dá pra registrar
      // interesse em nenhum plano sem saber qual local é.
      router.push('/vincular');
      return;
    }

    setEnviando(plano.slug);
    const ehGratis = plano.slug === 'freemium';
    const { error } = await supabase
      .from('locais')
      .update({
        plano_comercial: plano.slug,
        plano_comercial_status: ehGratis ? 'ativo' : 'interesse',
      })
      .eq('id', localId);

    if (error) {
      setErro(error.message);
      setEnviando(null);
      return;
    }

    setConfirmado({ nome: plano.nome, gratis: ehGratis });
    setEnviando(null);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  if (confirmado) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex flex-col items-center justify-center p-6 text-center text-white">
        <CheckCircle2 className="text-[#4CAF7D] mb-4" size={40} />
        <h1 className="text-xl font-black mb-2">
          {confirmado.gratis ? `Plano ${confirmado.nome} ativado` : `Interesse no plano ${confirmado.nome} registrado`}
        </h1>
        <p className="text-[#A0A0B2] text-sm mb-6 max-w-sm">
          {confirmado.gratis
            ? 'Seu local já está no plano gratuito — nada muda pra você agora.'
            : `Vamos entrar em contato pelo WhatsApp ou e-mail cadastrado pra combinar o pagamento (Pix). Assim que confirmarmos, o plano ${confirmado.nome} é ativado no seu painel.`}
        </p>
        <Link href="/dashboard" className="text-[#E1306C] text-sm font-bold hover:underline">
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] p-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-6">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Planos para o seu local</h1>
        <p className="text-[#A0A0B2] text-sm mt-1">
          Escolher um plano pago registra seu interesse — combinamos o pagamento por Pix/WhatsApp e
          ativamos manualmente por enquanto. Você pode trocar quando quiser.
        </p>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {planos.map((p) => (
          <div
            key={p.slug}
            className={`bg-[#161520] border rounded-2xl p-6 flex flex-col justify-between relative ${
              p.highlight
                ? 'border-[#E1306C] shadow-lg shadow-[#E1306C]/10'
                : p.borderGold
                ? 'border-[#FFD54F]'
                : 'border-[#232230]'
            }`}
          >
            {p.tag && (
              <span
                className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-extrabold px-3 py-1 rounded-full text-white ${
                  p.borderGold ? 'bg-[#FFD54F] text-black' : 'bg-[#E1306C]'
                }`}
              >
                {p.tag}
              </span>
            )}

            <div>
              <h2 className="text-sm font-bold text-[#A0A0B2] mb-4">{p.nome}</h2>
              <div className="mb-6">
                <span className="text-3xl font-black text-white">{p.preco}</span>
                <span className="text-xs text-[#A0A0B2] ml-1">{p.sub}</span>
              </div>

              <div className="space-y-3 mb-6">
                {p.beneficios.map((b, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    {b.ok ? (
                      <Check size={14} className="text-[#4CAF7D] shrink-0 mt-0.5" />
                    ) : (
                      <X size={14} className="text-[#626274] shrink-0 mt-0.5" />
                    )}
                    <span className={b.ok ? 'text-[#D0D0E0]' : 'text-[#626274]'}>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => escolherPlano(p)}
              disabled={enviando === p.slug}
              className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                p.highlight
                  ? 'bg-[#E1306C] text-white hover:bg-[#C2285C]'
                  : p.borderGold
                  ? 'border border-[#FFD54F] text-[#FFD54F] hover:bg-[#FFD54F] hover:text-black'
                  : 'bg-[#232230] text-white hover:bg-[#2D2B3D]'
              }`}
            >
              {enviando === p.slug && <Loader2 className="animate-spin" size={12} />}
              {p.cta}
            </button>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#626274] text-center">
        Preços exibidos para o local. Pacotes avulsos de evento e parcerias institucionais têm regras próprias.
      </p>
    </div>
  );
}
