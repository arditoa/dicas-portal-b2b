'use client';

// Rodada 36 — pedido direto da Andrea: virar 2 abas ("Local/Comércio" e
// "Eventos e Festas") com o MESMO formulário do cadastro rápido embutido
// direto aqui (sem navegar pra /cadastro/rapido), mantendo o layout visual
// que já existia (header com logo, cards escuros com acento rosa/roxo).
// O card de "Parceiro Institucional" (leads sem espaço físico, fechado por
// atendimento direto) continua existindo — só ficou menor, como opção
// secundária abaixo das abas, porque não é um cadastro rápido tipo os
// outros dois.
import { Building2, Calendar, CheckCircle2, Home as HomeIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import FormularioCadastroRapido from '../../components/FormularioCadastroRapido';

export default function OnboardingPage() {
  const [aba, setAba] = useState<'local' | 'evento'>('local');
  const [sucesso, setSucesso] = useState(false);
  const [whatsappEnviado, setWhatsappEnviado] = useState('');

  return (
    <div className="min-h-screen bg-[#111217] text-white flex flex-col justify-center items-center p-6">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header com Logo */}
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-48">
            <Image
              src="/logos-dicasapp-semfundo (2).png"
              alt="Dicas LGBT+ Parceiros"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <span className="text-gray-400 font-medium text-sm">Parceiros</span>
        </div>

        {/* Título Principal */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {sucesso ? 'Recebemos seu cadastro!' : 'Como você quer aparecer no app?'}
          </h1>
          {!sucesso && (
            <p className="text-gray-400 text-base">
              Escolha o tipo de conta e preencha o cadastro rápido abaixo — leva menos de 1 minuto.
            </p>
          )}
        </div>

        {sucesso ? (
          <div className="bg-[#1A1B23] border border-[#2A2C38] rounded-2xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <p className="text-gray-300 text-sm leading-relaxed">
              Vamos dar uma olhada e te avisamos pelo WhatsApp ({whatsappEnviado}) quando estiver
              aprovado — costuma ser rapidinho.
            </p>
            <Link href="/" className="inline-block text-pink-500 hover:underline text-sm font-medium">
              Voltar para o início
            </Link>
          </div>
        ) : (
          <>
            {/* Abas */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAba('local')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold border transition ${
                  aba === 'local'
                    ? 'bg-pink-600 border-pink-600 text-white'
                    : 'bg-[#1A1B23] border-[#2A2C38] text-gray-300 hover:border-pink-500/50'
                }`}
              >
                <HomeIcon className="w-4 h-4" /> Local / Comércio
              </button>
              <button
                type="button"
                onClick={() => setAba('evento')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold border transition ${
                  aba === 'evento'
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-[#1A1B23] border-[#2A2C38] text-gray-300 hover:border-purple-500/50'
                }`}
              >
                <Calendar className="w-4 h-4" /> Eventos e Festas
              </button>
            </div>

            <p className="text-gray-500 text-xs -mt-2">
              {aba === 'local'
                ? 'Bares, restaurantes, hotéis e outros espaços físicos. Aparece no mapa, nas categorias e pode ganhar destaque.'
                : 'Festas, shows e eventos avulsos — com ou sem local fixo. Divulgação pontual, com opção de venda de ingresso.'}
            </p>

            <FormularioCadastroRapido
              key={aba}
              tipo={aba}
              onSucesso={(whatsapp) => {
                setWhatsappEnviado(whatsapp);
                setSucesso(true);
              }}
            />

            {/* Parceiro Institucional — opção secundária, não é um
                cadastro rápido (sempre fechado por atendimento direto). */}
            <div className="bg-[#1A1B23] border border-[#2A2C38] rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Parceiro Institucional</h3>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Marcas e negócios sem espaço físico no app (ex.: petshop, seguradora) — comissão sobre indicações fechadas.
                  </p>
                </div>
              </div>
              <Link
                href="/contato"
                className="shrink-0 py-2.5 px-4 rounded-xl font-medium text-xs bg-[#161720] border border-[#2A2C38] hover:bg-[#222430] text-white text-center transition-colors"
              >
                Falar com o time
              </Link>
            </div>
          </>
        )}

        {/* Rodapé / Link para Login */}
        <div className="text-center pt-4">
          <p className="text-sm text-gray-400">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-pink-500 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
