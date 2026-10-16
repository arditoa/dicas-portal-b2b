'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Formulário da Lista Antecipada (página /lista-antecipada). Grava em
// `leads_institucionais` (mesma tabela do /contato do portal, RLS de insert
// público já liberada) — nenhuma tabela nova. A cidade, quando pedida, vai
// dentro de `mensagem`, junto com a origem, para aparecer na fila do /admin.
interface WaitlistFormProps {
  // Prefixo salvo em `mensagem` pra distinguir a origem na fila do /admin.
  origemLabel: string;
  textoBotao?: string;
  textoSucesso?: string;
  // Mostra o campo "Sua cidade" (opcional) e troca o aceite pelo texto do
  // documento da Lista Antecipada (novidades por WhatsApp e/ou e-mail).
  mostrarCidade?: boolean;
}

const CAMPO =
  'flex-1 bg-[#161520] border border-[#232230] rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-[#626274] focus:outline-none focus:border-[#E1306C] disabled:opacity-60';

export default function WaitlistForm({
  origemLabel,
  textoBotao = 'Quero entrar na lista',
  textoSucesso = 'Pronto! Você entrou na lista. Vamos avisar por e-mail e WhatsApp quando o Dicas LGBT+ App estiver pronto para você.',
  mostrarCidade = false,
}: WaitlistFormProps) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nome.trim() || !whatsapp.trim() || !email.trim()) {
      setErro('Nome, WhatsApp e e-mail são obrigatórios.');
      return;
    }
    if (!aceite) {
      setErro(
        mostrarCidade
          ? 'Marque a caixinha para receber as novidades e entrar na lista.'
          : 'É preciso aceitar a Política de Privacidade pra continuar.',
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('leads_institucionais').insert({
        origem: 'contato_geral',
        nome_organizacao: nome,
        email,
        whatsapp,
        mensagem: `[${origemLabel}] Quero entrar na lista antecipada.${cidade.trim() ? ` Cidade: ${cidade.trim()}.` : ''}`,
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err: unknown) {
      // O erro do Supabase (PostgrestError) é um objeto comum, não uma
      // instância de Error: mostramos err.message sempre que existir.
      const mensagemErro =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : undefined;
      setErro(mensagemErro || 'Não foi possível enviar. Tente novamente.');
      console.error('Erro ao enviar lista de espera:', err);
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="flex items-center gap-3 bg-[#161520] border border-[#4CAF7D]/30 rounded-2xl p-5 max-w-xl mx-auto">
        <CheckCircle2 className="w-6 h-6 text-[#4CAF7D] shrink-0" />
        <p className="text-sm text-[#D0D0E0]">{textoSucesso}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xl mx-auto">
      <div className={mostrarCidade ? 'grid gap-3 sm:grid-cols-2' : 'flex flex-col sm:flex-row gap-3'}>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" disabled={loading} className={CAMPO} />
        <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Seu WhatsApp" disabled={loading} className={CAMPO} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" disabled={loading} className={CAMPO} />
        {mostrarCidade && (
          <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Sua cidade" disabled={loading} className={CAMPO} />
        )}
      </div>
      {mostrarCidade ? (
        <>
          <label className="flex items-start gap-2 text-xs text-[#D0D0E0] px-1">
            <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} disabled={loading} className="mt-0.5" />
            Quero receber novidades sobre o Dicas LGBT+ App pelo WhatsApp e/ou e-mail.
          </label>
          <p className="text-[11px] text-[#8A8A9C] px-1">
            Seus dados são usados só para a Lista Antecipada. Veja a{' '}
            <a href="/privacidade" target="_blank" className="underline hover:text-white">
              Política de Privacidade
            </a>
            .
          </p>
        </>
      ) : (
        <label className="flex items-start gap-2 text-xs text-[#A0A0B2] px-1">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} disabled={loading} className="mt-0.5" />
          Li e aceito a{' '}
          <a href="/privacidade" target="_blank" className="underline hover:text-white">
            Política de Privacidade
          </a>
          . (Comunicações promocionais são opcionais e não fazem parte deste aceite.)
        </label>
      )}
      <button
        type="submit"
        disabled={loading}
        className="bg-gradient-to-r from-[#F0258C] to-[#B620E0] hover:brightness-110 disabled:opacity-60 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {textoBotao}
      </button>
      {erro && <p className="text-xs text-red-400 text-center">{erro}</p>}
    </form>
  );
}
