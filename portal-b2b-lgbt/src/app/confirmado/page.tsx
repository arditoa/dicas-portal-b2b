// Rodada 37 — página de destino do link de confirmação de e-mail
// (Supabase Auth), tanto do cadastro no app mobile quanto do portal.
// Antes, sem nenhum "Site URL"/"Redirect URL" configurado no Supabase
// apontando pra algo real, o link do e-mail levava a pessoa a um erro —
// essa página existe pra dar um destino de verdade e configurável.
// Ver instrução em investigacao-tecnica-app.md/Rodada 37: cadastrar esta
// URL (com /confirmado) em Authentication → URL Configuration, tanto em
// "Site URL" quanto em "Redirect URLs", no painel do Supabase.
'use client';
import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export default function ConfirmadoPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="relative h-14 w-32 mx-auto mb-8">
          <Image
            src="/logos-dicasapp-semfundo (2).png"
            alt="Dicas LGBT+"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4CAF7D]/15 mb-5">
          <CheckCircle2 className="text-[#4CAF7D]" size={32} />
        </div>
        <h1 className="text-xl font-black mb-2">E-mail confirmado!</h1>
        <p className="text-sm text-[#A0A0B2] leading-relaxed">
          Sua conta já está confirmada. Pode voltar pro app Dicas LGBT+ e entrar com seu
          e-mail e senha.
        </p>
      </div>
    </div>
  );
}
