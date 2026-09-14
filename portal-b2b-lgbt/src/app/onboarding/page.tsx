'use client';
import { Calendar, Handshake, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0B0B0E] flex flex-col justify-center items-center px-6 py-12">
      {/* HEADER LOGO */}
      <div className="w-full max-w-6xl mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#E1306C] flex items-center justify-center font-bold text-white text-xs">
          ♥
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Dicas LGBT+ <span className="text-[#A0A0B2] font-normal">Parceiros</span></span>
      </div>

      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-black text-white mb-2">Como você quer aparecer no app?</h1>
        <p className="text-[#A0A0B2] text-sm mb-10">
          Escolha o tipo de conta — você pode combinar mais de um perfil depois, se precisar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CARD 1: LOCAL / ESTABELECIMENTO */}
          <div className="bg-[#161520] border border-[#232230] rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/20 flex items-center justify-center mb-6">
                <Store size={20} className="text-[#E1306C]" />
              </div>
              <h2 className="text-lg font-black text-white mb-2">Local / Estabelecimento</h2>
              <p className="text-[#A0A0B2] text-xs leading-relaxed mb-6">
                Bares, restaurantes, hotéis e outros espaços físicos. Aparece no mapa, nas categorias e pode ganhar destaque.
              </p>
              <div className="text-[#A0A0B2] text-xs flex items-center gap-2 mb-8">
                <span className="text-[#4CAF7D]">✓</span> Planos de Freemium a Fundador
              </div>
            </div>
            <button
              onClick={() => router.push('/planos')}
              className="w-full bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-3.5 rounded-xl transition text-sm text-center"
            >
              Cadastrar meu local
            </button>
          </div>

          {/* CARD 2: ORGANIZADOR DE EVENTO */}
          <div className="bg-[#161520] border border-[#232230] rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#7E57C2]/10 border border-[#7E57C2]/20 flex items-center justify-center mb-6">
                <Calendar size={20} className="text-[#7E57C2]" />
              </div>
              <h2 className="text-lg font-black text-white mb-2">Organizador de Evento</h2>
              <p className="text-[#A0A0B2] text-xs leading-relaxed mb-6">
                Festas, shows e eventos avulsos — com ou sem local fixo. Divulgação pontual, com opção de venda de ingresso.
              </p>
              <div className="text-[#A0A0B2] text-xs flex items-center gap-2 mb-8">
                <span className="text-[#4CAF7D]">✓</span> Pacotes avulsos, sem mensalidade
              </div>
            </div>
            <button
              onClick={() => router.push('/cadastrar-evento')}
              className="w-full bg-[#232230] hover:bg-[#2D2B3D] text-white font-bold py-3.5 rounded-xl transition text-sm text-center border border-[#232230]"
            >
              Cadastrar um evento
            </button>
          </div>

          {/* CARD 3: PARCEIRO INSTITUCIONAL */}
          <div className="bg-[#161520] border border-[#232230] rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#FFD54F]/10 border border-[#FFD54F]/20 flex items-center justify-center mb-6">
                <Handshake size={20} className="text-[#FFD54F]" />
              </div>
              <h2 className="text-lg font-black text-white mb-2">Parceiro Institucional</h2>
              <p className="text-[#A0A0B2] text-xs leading-relaxed mb-6">
                Marcas e negócios que não são um espaço físico do app (ex.: petshop, seguradora). Comissão sobre indicações fechadas.
              </p>
              <div className="text-[#A0A0B2] text-xs flex items-center gap-2 mb-8">
                <span className="text-[#4CAF7D]">✓</span> Fechado por atendimento direto
              </div>
            </div>
            <button
              onClick={() => router.push('/parceria-institucional')}
              className="w-full bg-[#232230] hover:bg-[#2D2B3D] text-white font-bold py-3.5 rounded-xl transition text-sm text-center border border-[#232230]"
            >
              Falar com o time
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-xs text-[#A0A0B2]">
            Já tem uma conta? <Link href="/login" className="text-[#E1306C] font-bold">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}