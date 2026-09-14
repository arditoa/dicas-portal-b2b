'use client';
import { ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PlanosPage() {
  const router = useRouter();

  const planos = [
    {
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
      nome: 'Fundador',
      tag: '5 VAGAS NO TOTAL',
      preco: 'R$2.500',
      sub: '/mês',
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
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0E] p-8">
      <Link href="/onboarding" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-6">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Planos para o seu local</h1>
        <p className="text-[#A0A0B2] text-sm mt-1">Você pode trocar de plano quando quiser, direto no portal.</p>
      </div>

      {/* CARDS DOS 5 PLANOS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {planos.map((p, i) => (
          <div
            key={i}
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
              onClick={() => router.push('/dashboard')}
              className={`w-full py-3 rounded-xl font-bold text-xs transition ${
                p.highlight
                  ? 'bg-[#E1306C] text-white hover:bg-[#C2285C]'
                  : p.borderGold
                  ? 'border border-[#FFD54F] text-[#FFD54F] hover:bg-[#FFD54F] hover:text-black'
                  : 'bg-[#232230] text-white hover:bg-[#2D2B3D]'
              }`}
            >
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