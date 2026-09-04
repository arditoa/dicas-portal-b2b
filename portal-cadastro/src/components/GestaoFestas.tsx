export interface GestaoFestasProps {
  partnerId: string;
}

export default function GestaoFestas({ partnerId }: GestaoFestasProps) {
  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-2">🎉 Gestão de Festas & Eventos</h2>
      <p className="text-xs text-purple-400 mb-4">Parceiro ativo: {partnerId}</p>
      <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-center text-slate-400 text-sm">
        Nenhuma festa cadastrada para este parceiro.
      </div>
    </div>
  );
}
