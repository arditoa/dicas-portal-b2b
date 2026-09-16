'use client';

import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Precisam bater com o enum public.origem_lead_institucional
// (004_ajustes_cadastro_publico.sql)
const TIPOS = [
  { value: 'institucional_ong', label: 'Instituição / ONG / projeto social' },
  { value: 'parceiro_institucional', label: 'Marca ou negócio parceiro (indicação com comissão)' },
] as const;

const inputClass =
  'w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60';
const labelClass = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2';

export default function CadastroInstitucionalPage() {
  const [origem, setOrigem] = useState<string>('institucional_ong');
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

    if (!nomeOrganizacao.trim()) {
      setErrorMsg('Preencha o nome da organização.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('leads_institucionais').insert({
        origem,
        nome_organizacao: nomeOrganizacao,
        nome_contato: nomeContato || null,
        email: email || null,
        whatsapp: whatsapp || null,
        mensagem: mensagem || null,
      });

      if (error) throw error;
      setSucesso(true);
    } catch (err: any) {
      console.error('Erro ao enviar cadastro institucional:', err);
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
          <h1 className="text-2xl font-bold">Recebemos seu cadastro!</h1>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Nosso time vai entrar em contato com <strong className="text-white">{nomeOrganizacao}</strong>{' '}
            em breve.
          </p>
          <Link href="/" className="inline-block mt-4 text-indigo-400 hover:underline text-sm font-medium">
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-[#A0A0B2] font-medium">Cadastro institucional</span>
          </div>
        </div>
        <h1 className="text-3xl font-black mb-2">Institucional / ONG</h1>
        <p className="text-[#A0A0B2] text-sm mb-8">
          Organizações, projetos sociais e negócios parceiros que não são um espaço físico do app.
          Preencha os dados e nosso time entra em contato diretamente.
        </p>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 space-y-4">
            <div>
              <label className={labelClass}>Qual desses descreve você melhor?</label>
              <div className="grid grid-cols-1 gap-2">
                {TIPOS.map((tipo) => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => setOrigem(tipo.value)}
                    disabled={loading}
                    className={`text-left px-4 py-3 rounded-xl text-sm border transition ${
                      origem === tipo.value
                        ? 'bg-indigo-500/10 border-indigo-500 text-white'
                        : 'bg-transparent border-[#232230] text-[#A0A0B2] hover:border-indigo-500/50'
                    }`}
                  >
                    {tipo.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Nome da organização / marca</label>
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
              <label className={labelClass}>Mensagem</label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Conte um pouco sobre a organização e como imagina a parceria"
                rows={4}
                className={inputClass}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Enviando...' : 'Enviar cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
}
