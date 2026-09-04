import { useState } from 'react';

export interface Parceiro {
  id: string;
  nome: string;
  responsavel: string;
  status: string;
  doc: string;
}

export default function AdminModeration() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([
    { id: '1', nome: 'Bar Acolhedor', responsavel: 'Alex Silva', status: 'PENDENTE', doc: '12.345.678/0001-90' },
    { id: '2', nome: 'Club Rainbow', responsavel: 'Carla Dias', status: 'PENDENTE', doc: '98.765.432/0001-10' },
  ]);

  const aprovar = (id: string) => {
    setParceiros(parceiros.map(p => p.id === id ? { ...p, status: 'APROVADO' } : p));
  };

  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4">🛡️ Painel de Moderação Admin</h2>
      <div className="space-y-4">
        {parceiros.map(p => (
          <div key={p.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-white text-lg">{p.nome}</h3>
              <p className="text-xs text-slate-400">Resp: {p.responsavel} • Doc: {p.doc}</p>
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded font-bold ${p.status === 'APROVADO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {p.status}
              </span>
            </div>
            {p.status === 'PENDENTE' && (
              <button
                onClick={() => aprovar(p.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
              >
                ✓ Aprovar Perfil
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
