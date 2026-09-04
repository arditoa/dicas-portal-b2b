import React, { useState } from 'react';

interface Passo1Props {
  onSuccess: (partnerId: string) => void;
}

export default function Passo1Form({ onSuccess }: Passo1Props) {
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess('partner-123-demo');
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-800 p-6 rounded-2xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-2">Cadastre seu espaço no Dicas LGBT</h2>
      <p className="text-sm text-slate-400 mb-6">Leva menos de 2 minutos. É grátis para começar.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">CPF ou CNPJ</label>
          <input
            type="text"
            required
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="Digite seu CPF ou CNPJ"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Seu Nome</label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome de quem está cadastrando"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-lg shadow-purple-600/30"
        >
          {loading ? 'Processando...' : 'Avançar para Passo 2 →'}
        </button>
      </form>
    </div>
  );
}
