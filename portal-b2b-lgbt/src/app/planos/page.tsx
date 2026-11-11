'use client';
import { ArrowLeft, Check, CheckCircle2, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { idsMarcaAtiva } from '../../lib/marcaAtiva';

// Nomes/valores usados no enum public.plano_comercial (005). Precisam bater
// exatamente com os `slug`s abaixo.
type PlanoCard = {
  slug: string;
  nome: string;
  preco: string;
  sub: string;
  tag?: string;
  beneficios: readonly { text: string; ok: boolean }[];
  cta: string;
  highlight: boolean;
  color?: string;
  borderGold?: boolean;
  href?: string; // plano sem assinatura (festa avulsa, patrocínio): o botão leva a outra tela em vez de registrar interesse
};

const planos: readonly PlanoCard[] = [
  {
    slug: 'freemium',
    nome: 'Freemium',
    preco: 'R$0',
    sub: 'sempre grátis',
    beneficios: [
      { text: 'Aparece no mapa e na categoria', ok: true },
      { text: '@Instagram no perfil', ok: false },
      { text: 'Oferta semanal', ok: false },
      { text: 'Posição de destaque na categoria', ok: false },
      { text: 'Subir uma festa em destaque na aba Eventos: R$49 por festa (máx. 2 por mês)', ok: true },
    ],
    cta: 'Continuar grátis',
    highlight: false,
  },
  {
    slug: 'intermediario',
    nome: 'Intermediário',
    preco: 'R$359',
    sub: '/mês',
    beneficios: [
      { text: 'Tudo do Freemium', ok: true },
      { text: '1 cupom a cada 2 semanas na faixa de cupons da categoria (24 posições por categoria: 12 delas para Intermediários, que se alternam)', ok: true },
      { text: 'Seu cupom roda em telas de 6, que mudam a cada 30 minutos', ok: true },
      { text: 'Na busca da categoria, aparece logo depois dos Fundadores e Premiums', ok: true },
      { text: 'Roda nos banners de destaque inferiores da tela inicial, entre os 15 primeiros, a cada 4 horas', ok: true },
      { text: 'Subir uma festa em destaque na aba Eventos: R$49 por festa (máx. 2 por mês)', ok: true },
    ],
    cta: 'Selecionar',
    highlight: false,
  },
  {
    slug: 'premium',
    nome: 'Premium',
    tag: 'RECOMENDADO',
    preco: 'R$499',
    sub: '/mês',
    beneficios: [
      { text: 'Tudo do Freemium', ok: true },
      { text: 'Banner rotativo no topo da categoria (12 vagas por categoria, slots de 4, troca a cada 3 horas, texto de curiosidade trocado toda semana)', ok: true },
      { text: '1 cupom por semana na faixa de cupons da categoria (10 vagas Premium por categoria)', ok: true },
      { text: 'Sempre em primeiro na lista da categoria, por 12 meses', ok: true },
      { text: 'Roda nos banners de destaque inferiores da tela inicial, entre os 10 primeiros, a cada 3 horas', ok: true },
      { text: 'Festas do seu local em destaque na aba Eventos: até 4 por mês incluídas (extras: R$89 cada)', ok: true },
      { text: '3 tags — Top 5', ok: true },
    ],
    cta: 'Assinar Premium',
    highlight: true,
    color: '#E1306C',
  },
  {
    // Fundador: 12 vagas; R$3.490 à vista ou 12 x R$349 (definido pela Andrea).
    // Único plano com o ícone "Destaques" e o banner na tela inicial (4 por hora).
    slug: 'fundador',
    nome: 'Fundador',
    tag: '12 VAGAS NO TOTAL',
    preco: 'R$349',
    sub: '/mês × 12 meses',
    beneficios: [
      { text: 'Tudo do Premium', ok: true },
      { text: 'Pagamento: 12 parcelas de R$349 ou R$3.490 à vista', ok: true },
      { text: 'Festas do seu local em destaque na aba Eventos: até 4 por mês incluídas (extras: R$89 cada)', ok: true },
      { text: 'Banner no topo da tela inicial por 12 meses (slots de 4, troca a cada 3 horas, texto de curiosidade trocado toda semana)', ok: true },
      { text: '1 cupom por semana na faixa de cupons da categoria (2 vagas de Fundador, trocando a cada 10 minutos)', ok: true },
      { text: 'Categoria Destaques — exclusiva dos 12 Fundadores, por ordem de fechamento', ok: true },
      { text: 'Sempre em primeiro na lista da categoria; fixo na página principal', ok: true },
      { text: 'Vaga garantida por 12 meses (são só 12 no total)', ok: true },
    ],
    cta: 'Consultar vaga',
    highlight: false,
    borderGold: true,
  },
];

// Planos da categoria Festas & Eventos (produtoras, organizadores e casas de festa). Em Festas não há faixa de cupons:
// no lugar dela fica a faixa "Festas em destaque" (até 24 festas pagas ao mesmo tempo, no máximo 12 por data).
// Premium e Fundador são os mesmos planos dos locais (mesmo slug no banco); festa avulsa e patrocínio não são assinatura.
const planosEventos: readonly PlanoCard[] = [
  {
    slug: 'festa_avulsa',
    nome: 'Festa avulsa',
    preco: 'R$89',
    sub: 'por festa · preço de lançamento',
    beneficios: [
      { text: 'Sem mensalidade: você paga só a festa que quer divulgar', ok: true },
      { text: 'Faixa "Festas em destaque" no topo da aba Eventos, 1 dia antes e no dia da festa', ok: true },
      { text: 'Na frente da lista do dia, com o selo Patrocinado', ok: true },
      { text: 'Portal completo, com Lista VIP', ok: true },
      { text: 'Cobrança combinada com a equipe (Pix ou máquina)', ok: true },
    ],
    cta: 'Cadastrar uma festa',
    highlight: false,
    href: '/cadastro/evento',
  },
  {
    slug: 'premium',
    nome: 'Premium',
    tag: 'RECOMENDADO',
    preco: 'R$499',
    sub: '/mês',
    beneficios: [
      { text: 'Tudo da festa avulsa', ok: true },
      { text: 'Até 4 festas em destaque por mês incluídas (extras: R$89 cada)', ok: true },
      { text: 'Banner rotativo no topo de Festas & Eventos (12 vagas, junto com os Fundadores, 4 por vez)', ok: true },
      { text: 'Frase do banner trocada toda semana (ex.: a próxima festa)', ok: true },
      { text: 'Sempre em primeiro na lista da categoria, por 12 meses', ok: true },
    ],
    cta: 'Assinar Premium',
    highlight: true,
    color: '#E1306C',
  },
  {
    slug: 'fundador',
    nome: 'Fundador',
    tag: '12 VAGAS NO TOTAL',
    preco: 'R$349',
    sub: '/mês × 12 meses',
    beneficios: [
      { text: 'Tudo do Premium', ok: true },
      { text: 'Pagamento: 12 parcelas de R$349 ou R$3.490 à vista', ok: true },
      { text: 'Até 4 festas em destaque por mês incluídas (extras: R$89 cada)', ok: true },
      { text: 'Banner rotativo de Festas na frente dos Premium', ok: true },
      { text: 'Banner no topo da tela inicial e categoria Destaques, por 12 meses', ok: true },
      { text: 'Vaga garantida (são só 12 Fundadores no app inteiro)', ok: true },
    ],
    cta: 'Consultar vaga',
    highlight: false,
    borderGold: true,
  },
  {
    slug: 'master_festas',
    nome: 'Patrocínio Master',
    tag: '1 VAGA',
    preco: 'R$2.000',
    sub: '/mês',
    beneficios: [
      { text: 'Faixa grande e fixa no topo da aba Eventos, a primeira coisa que se vê', ok: true },
      { text: 'Fica no ar o tempo todo, enquanto durar o contrato', ok: true },
      { text: 'Título, subtítulo e botão editáveis a qualquer momento', ok: true },
      { text: 'É a mesma faixa para todos os ícones de público (Lésbica, Gay, Todos)', ok: true },
    ],
    cta: 'Falar com a equipe',
    highlight: false,
    href: '/contato',
  },
];

export default function PlanosPage() {
  const router = useRouter();
  const [localId, setLocalId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<{ nome: string; gratis: boolean } | null>(null);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState<'locais' | 'eventos'>('locais');

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data } = await supabase
          .from('locais')
          .select('id, categoria')
          .eq('owner_id', userData.user.id)
          .in('id', idsMarcaAtiva())
          .maybeSingle();
        setLocalId(data?.id ?? null);
        if (data?.categoria === 'eventos') setAba('eventos'); // quem é da categoria Festas já abre nos planos de eventos
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
        <h1 className="text-2xl font-black text-white">{aba === 'locais' ? 'Planos para o seu local' : 'Planos para eventos e festas'}</h1>
        <p className="text-[#A0A0B2] text-sm mt-1">
          {aba === 'locais'
            ? 'Escolher um plano pago registra seu interesse — combinamos o pagamento por Pix/WhatsApp e ativamos manualmente por enquanto. Você pode trocar quando quiser.'
            : 'Para produtoras, organizadores e casas de festa. Em Festas & Eventos não há cupons: as festas pagas ganham a faixa "Festas em destaque" no topo da aba Eventos. Pagamento combinado pela equipe (Pix ou máquina).'}
        </p>
        <div className="inline-flex mt-4 p-1 rounded-xl bg-[#161520] border border-[#232230] text-xs font-bold">
          {([['locais', 'Para locais'], ['eventos', 'Para eventos e festas']] as const).map(([k, rotulo]) => (
            <button
              key={k}
              onClick={() => setAba(k)}
              className={`px-4 py-2 rounded-lg transition ${aba === k ? 'bg-[#E1306C] text-white' : 'text-[#A0A0B2] hover:text-white'}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {(aba === 'locais' ? planos : planosEventos).map((p) => (
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

            {p.href ? (
              <Link href={p.href} className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                p.highlight
                  ? 'bg-[#E1306C] text-white hover:bg-[#C2285C]'
                  : p.borderGold
                  ? 'border border-[#FFD54F] text-[#FFD54F] hover:bg-[#FFD54F] hover:text-black'
                  : 'bg-[#232230] text-white hover:bg-[#2D2B3D]'
              }`}>
                {p.cta}
              </Link>
            ) : (
              <button
                onClick={() => escolherPlano(p)}
                disabled={enviando === p.slug}
                className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                p.highlight
                  ? 'bg-[#E1306C] text-white hover:bg-[#C2285C]'
                  : p.borderGold
                  ? 'border border-[#FFD54F] text-[#FFD54F] hover:bg-[#FFD54F] hover:text-black'
                  : 'bg-[#232230] text-white hover:bg-[#2D2B3D]'
              }`}>
                {enviando === p.slug && <Loader2 className="animate-spin" size={12} />}
                {p.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#626274] text-center">
        Valores de lançamento. Parcerias institucionais têm regras próprias. Cobrança manual pela equipe por enquanto.
      </p>
    </div>
  );
}
