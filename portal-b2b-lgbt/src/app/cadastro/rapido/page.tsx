'use client';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import FormularioCadastroRapido from '../../../components/FormularioCadastroRapido';

// Rodada 36 — o formulário em si (campos, busca de CNPJ, upload de foto,
// envio via RPC) foi extraído pra src/components/FormularioCadastroRapido
// pra ser reaproveitado também no /onboarding (abas com formulário
// embutido). Esta página ficou só com a "casca": header, botão de voltar,
// o alternador local/evento, e a tela cheia de sucesso — exatamente como
// já era antes, sem mudar nada do que o parceiro vê aqui.
export default function CadastroRapidoPage() {
  const [tipo, setTipo] = useState<'local' | 'evento'>('local');
  const [sucesso, setSucesso] = useState(false);
  const [whatsappEnviado, setWhatsappEnviado] = useState('');

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-6 text-white">
        <div className="max-w-md text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-bold">Recebemos seu cadastro!</h1>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Vamos dar uma olhada e te avisamos pelo WhatsApp ({whatsappEnviado}) quando estiver
            aprovado — costuma ser rapidinho.
          </p>
          <Link href="/" className="inline-block mt-4 text-[#E1306C] hover:underline text-sm font-medium">
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white p-6 md:p-12">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#A0A0B2] hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="mb-6">
          <div className="relative h-14 w-32 mb-4">
            <Image
              src="/logos-dicasapp-semfundo (2).png"
              alt="Dicas LGBT+ Parceiros"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <span className="text-sm text-[#A0A0B2] font-medium">Cadastro rápido</span>
        </div>

        <h1 className="text-3xl font-black mb-2">Cadastro rápido pelo celular</h1>
        <p className="text-[#A0A0B2] text-sm mb-8">
          Feito pra preencher em menos de 1 minuto, direto de um link no WhatsApp. Sem endereço
          completo — só o essencial pra já aparecer no app. Depois de aprovado, você recebe um
          convite pra completar o perfil com calma.
        </p>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTipo('local')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold border transition ${
              tipo === 'local'
                ? 'bg-[#E1306C] border-[#E1306C] text-white'
                : 'bg-[#12121A] border-[#232230] text-[#A0A0B2]'
            }`}
          >
            🏳️‍🌈 É um espaço
          </button>
          <button
            type="button"
            onClick={() => setTipo('evento')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold border transition ${
              tipo === 'evento'
                ? 'bg-[#E1306C] border-[#E1306C] text-white'
                : 'bg-[#12121A] border-[#232230] text-[#A0A0B2]'
            }`}
          >
            🎉 É uma festa
          </button>
        </div>

        <FormularioCadastroRapido
          tipo={tipo}
          onSucesso={(whatsapp) => {
            setWhatsappEnviado(whatsapp);
            setSucesso(true);
          }}
        />
      </div>
    </div>
  );
}
