import { ArrowLeft, Mail, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Exigência do Google Play (Data Safety): além do fluxo dentro do app,
// tem que existir uma página pública na web explicando como pedir a
// exclusão da conta — é este arquivo (ver claude/auditoria-final-
// publicacao.md, seção "Exclusão de conta", bloqueador nomeado
// nomeadamente pra essa página). Preencher os 2 contatos abaixo antes de
// publicar — deixados vazios de propósito, ver aviso da Andrea no chat.
const SUPORTE_EMAIL = process.env.NEXT_PUBLIC_SUPORTE_EMAIL || '';
const SUPORTE_WHATSAPP = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP || '';

export default function ExcluirContaPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#A0A0B2] hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="relative h-9 w-36 mb-8">
          <Image src="/logo-lockup.png" alt="Dicas LGBT+" fill className="object-contain object-left" />
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-sm text-[#A0A0B2] font-medium">Exclusão de conta</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black mb-4">Como excluir sua conta no Dicas LGBT+</h1>
        <p className="text-[#A0A0B2] text-sm leading-relaxed mb-8">
          Você pode pedir a exclusão da sua conta e dos seus dados de duas formas — direto pelo app, ou
          por aqui, caso já tenha desinstalado ou não tenha mais acesso a ele.
        </p>

        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6 mb-6">
          <h2 className="font-bold mb-3">Opção 1 — direto pelo app</h2>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Abra o app, vá em <strong className="text-white">Perfil → Configurações → Excluir conta</strong>{' '}
            e confirme. A exclusão é processada imediatamente pelo próprio app.
          </p>
        </div>

        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6 mb-8">
          <h2 className="font-bold mb-3">Opção 2 — sem o app, por aqui</h2>
          <p className="text-[#A0A0B2] text-sm leading-relaxed mb-4">
            Envie um pedido de exclusão informando o e-mail ou WhatsApp usado para criar a conta.
            Confirmamos a exclusão manualmente em até alguns dias úteis.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {SUPORTE_EMAIL && (
              <a
                href={`mailto:${SUPORTE_EMAIL}?subject=${encodeURIComponent('Pedido de exclusão de conta — Dicas LGBT+')}`}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm px-4 py-3 rounded-xl transition"
              >
                <Mail className="w-4 h-4" /> Pedir por e-mail
              </a>
            )}
            {SUPORTE_WHATSAPP && (
              <a
                href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent('Quero pedir a exclusão da minha conta no Dicas LGBT+.')}`}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm px-4 py-3 rounded-xl transition"
              >
                <MessageCircle className="w-4 h-4" /> Pedir por WhatsApp
              </a>
            )}
            {!SUPORTE_EMAIL && !SUPORTE_WHATSAPP && (
              <p className="text-xs text-[#FFD54F] bg-[#FFD54F]/10 border border-[#FFD54F]/20 rounded-xl p-3">
                Canal de contato ainda não configurado (NEXT_PUBLIC_SUPORTE_EMAIL /
                NEXT_PUBLIC_SUPORTE_WHATSAPP no .env) — ver aviso sobre esta página.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 bg-[#12121A] border border-[#232230] rounded-2xl p-6">
          <ShieldCheck className="w-5 h-5 text-[#4CAF7D] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-sm mb-2">O que é excluído</h2>
            <p className="text-[#A0A0B2] text-xs leading-relaxed">
              Ao confirmar a exclusão, removemos seu perfil, favoritos, avaliações, cupons resgatados e
              demais dados pessoais associados à sua conta. Dados de locais/eventos que você administra
              em nome de um estabelecimento parceiro seguem as regras do cadastro empresarial, e podem
              ser tratados separadamente caso a conta esteja vinculada a um local ativo no portal de
              parceiros.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
