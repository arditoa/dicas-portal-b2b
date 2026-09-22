'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Rodada 58 — extraído de page.tsx (era um componente local só da Home)
// pra ser reaproveitado também em /lancamento, que o Guia pede como
// página própria com o mesmo formulário (nome, WhatsApp, e-mail).
//
// O Guia pede 3 campos separados (nome, WhatsApp, e-mail, todos
// obrigatórios) — a versão original da Rodada 42 tinha só nome + "e-mail
// ou WhatsApp" combinado num campo só. Ajustado aqui pra bater com o
// Guia. Continua gravando em `leads_institucionais` (mesma tabela do
// /contato do portal, RLS de insert público já liberada) — nenhuma
// tabela nova.
interface WaitlistFormProps {
  // Prefixo salvo em `mensagem` pra distinguir a origem na fila do
  // /admin (ex.: veio da Home vs. veio de /lancamento).
  origemLabel: string;
  textoBotao?: string;
  textoSucesso?: string;
}

export default function WaitlistForm({
  origemLabel,
  textoBotao = 'Quero entrar na lista de lançamento',
  textoSucesso = 'Pronto! Você entrou na lista. Vamos avisar por e-mail e WhatsApp quando o Dicas LGBT+ App estiver pronto para você.',
}: WaitlistFormProps) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
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
      setErro('É preciso aceitar a Política de Privacidade pra continuar.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('leads_institucionais').insert({
        origem: 'contato_geral',
        nome_organizacao: nome,
        email,
        whatsapp,
        mensagem: `[${origemLabel}] Quero entrar na lista de lançamento.`,
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
      <div className="flex items-center gap-3 bg-[#161520] border border-[#4CAF7D]/30 rounded-2xl p-5 max-w-xl mx-auto">
        <CheckCircle2 className="w-6 h-6 text-[#4CAF7D] shrink-0" />
        <p className="text-sm text-[#D0D0E0]">{textoSucesso}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome"
          disabled={loading}
          className="flex-1 bg-[#161520] border border-[#232230] rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-[#626274] focus:outline-none focus:border-[#E1306C] disabled:opacity-60"
        />
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="WhatsApp"
          disabled={loading}
          className="flex-1 bg-[#161520] border border-[#232230] rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-[#626274] focus:outline-none focus:border-[#E1306C] disabled:opacity-60"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          disabled={loading}
          className="flex-1 bg-[#161520] border border-[#232230] rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-[#626274] focus:outline-none focus:border-[#E1306C] disabled:opacity-60"
        />
      </div>
      <label className="flex items-start gap-2 text-xs text-[#A0A0B2] px-1">
        <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} disabled={loading} className="mt-0.5" />
        Li e aceito a{' '}
        <a href="/privacidade" target="_blank" className="underline hover:text-white">
          Política de Privacidade
        </a>
        . (Comunicações promocionais são opcionais e não fazem parte deste aceite.)
      </label>
      <button
        type="submit"
        disabled={loading}
        className="bg-[#E1306C] hover:bg-[#c2285c] disabled:opacity-60 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {textoBotao}
      </button>
      {erro && <p className="text-xs text-red-400 text-center">{erro}</p>}
    </form>
  );
}
