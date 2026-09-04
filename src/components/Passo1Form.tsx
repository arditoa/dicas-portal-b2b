import React, { useState, useEffect } from 'react';
import { enviarPasso1 } from '../lib/partner';

interface Passo1Props {
  onSuccess: (partnerId: string) => void;
}

export function Passo1Form({ onSuccess }: Passo1Props) {
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [veioDoWhatsapp, setVeioDoWhatsapp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone') || params.get('whatsapp');

    if (phoneParam) {
      const numeroLimpo = phoneParam.replace(/\D/g, '');
      if (numeroLimpo) {
        setWhatsapp(numeroLimpo);
        setVeioDoWhatsapp(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!aceitouTermos) {
      setErro('Você precisa aceitar os termos de uso para continuar.');
      return;
    }

    setLoading(true);

    const resultado = await enviarPasso1({
      nome_responsavel: nomeResponsavel,
      cpf_ou_cnpj: cpfCnpj,
      whatsapp_comercial: whatsapp,
      aceitouTermos,
    });

    setLoading(false);

    if (resultado.success && resultado.partnerId) {
      onSuccess(resultado.partnerId);
    } else {
      setErro(resultado.message || 'Erro ao realizar o pré-cadastro.');
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Passo 1: Identificação do Responsável</h2>
        <p className="text-sm text-slate-500 mt-1">Preencha seus dados para iniciar o cadastro do seu espaço.</p>
      </div>

      {erro && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium mb-6 border border-red-100">
          {erro}
        </div>
      )}

      {veioDoWhatsapp && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm font-medium mb-6 border border-emerald-100 flex items-center gap-2">
          <span className="text-lg">✓</span> Número retornado do WhatsApp preenchido automaticamente!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nome do Responsável *</label>
          <input
            type="text"
            required
            value={nomeResponsavel}
            onChange={e => setNomeResponsavel(e.target.value)}
            placeholder="Seu nome completo"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">CPF ou CNPJ *</label>
          <input
            type="text"
            required
            value={cpfCnpj}
            onChange={e => setCpfCnpj(e.target.value)}
            placeholder="123.456.789-00 ou 12.345.678/0001-90"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">WhatsApp Comercial *</label>
          <input
            type="tel"
            required
            value={whatsapp}
            readOnly={veioDoWhatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="11999999999"
            className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
              veioDoWhatsapp ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="termos"
            checked={aceitouTermos}
            onChange={e => setAceitouTermos(e.target.checked)}
            className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
          />
          <label htmlFor="termos" className="text-sm text-slate-600 cursor-pointer select-none">
            Li e aceito os <span className="font-semibold text-purple-600">Termos de Uso e Privacidade</span> *
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {loading ? 'Processando...' : 'Avançar para Detalhes do Espaço →'}
        </button>
      </form>
    </div>
  );
}
