import React, { useState } from 'react';

interface Passo2Props {
  partnerId: string;
  onSuccess: () => void;
}

export default function Passo2Form({ partnerId, onSuccess }: Passo2Props) {
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-800 p-6 rounded-2xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-2">Detalhes do Espaço (Passo 2)</h2>
      <p className="text-xs text-purple-400 mb-4">ID do Parceiro: {partnerId}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Bio / Descrição</label>
          <textarea
            required
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Conte um pouco sobre a vibe do local..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500 h-24"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Instagram (@)</label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@seu.espaco"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-lg shadow-emerald-600/30"
        >
          {loading ? 'Enviando...' : 'Finalizar e Enviar para Análise'}
        </button>
      </form>
    </div>
  );
}
