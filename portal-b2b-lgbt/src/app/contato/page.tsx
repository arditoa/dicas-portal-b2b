'use client';

import { ArrowLeft, CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const inputClass =
  'w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-yellow-500 disabled:opacity-60';
const labelClass = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2';

export default function ContatoPage() {
  const [nomeOrganizacao, setNomeOrganizacao] = useState('');
  const [nomeContato, setNomeContato] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nomeOrganizacao.trim() || (!whatsapp.trim() && !email.trim())) {
      setErrorMsg('Preencha seu nome/marca e pelo menos um jeito de contato (WhatsApp ou e-mail).');
      return;
    }

    setLoading(true);
    try {
      // "Falar com o time" (card de Parceiro Institucional no onboarding) —
      // mesma tabela leads_institucionais, origem 'parceiro_institucional'
      // por padrão já que é essa a origem mais comum dessa página.
      const { error } = await supabase.from('leads_institucionais').insert({
        origem: 'parceiro_institucional',
        nome_organizacao: nomeOrganizacao,
        nome_contato: nomeContato || null,
        email: email || null,
        whatsapp: whatsapp || null,
        mensagem: mensagem || null,
      });

      if (error) throw error;
      setSucesso(true);
    } catch (err: any) {
      console.error('Erro ao enviar contato:', err);
      setErrorMsg(err.message || 'Não foi possível enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-6 text-white">
        <div className="max-w-md text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-bold">Mensagem enviada!</h1>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Nosso time vai falar com você em breve.
          </p>
          <Link href="/" className="inline-block mt-4 text-yellow-400 hover:underline text-sm font-medium">
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#A0A0B2] hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-black" />
          </div>
          <span className="text-sm text-[#A0A0B2] font-medium">Parceiro institucional</span>
        </div>
        <h1 className="text-3xl font-black mb-2">Fale com o time</h1>
        <p className="text-[#A0A0B2] text-sm mb-8">
          Marcas e negócios que não são um espaço físico do app (ex.: petshop, seguradora) — parceria
          fechada por atendimento direto, com comissão sobre indicações fechadas.
        </p>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 space-y-4">
            <div>
              <label className={labelClass}>Nome da sua marca ou negócio</label>
              <input
                type="text"
                required
                value={nomeOrganizacao}
                onChange={(e) => setNomeOrganizacao(e.target.value)}
                className={inputClass}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome do contato</label>
                <input
                  type="text"
                  value={nomeContato}
                  onChange={(e) => setNomeContato(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>WhatsApp</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                disabled={loading}
              />
            </div>

            <div>
              <label className={labelClass}>Como imagina a parceria?</label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Conte um pouco sobre a proposta"
                rows={4}
                className={inputClass}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
}
