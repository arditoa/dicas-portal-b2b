import { useEffect, useState } from 'react';
import { 
  listarParceirosPendentes, 
  aprovarParceiro, 
  rejeitarParceiro, 
  PartnerPendente 
} from '../lib/admin';

export function AdminModeration() {
  const [parceiros, setParceiros] = useState<PartnerPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [motivoRejeicao, setMotivoRejeicao] = useState<{ [id: string]: string }>({});
  const [modalRejeitarId, setModalRejeitarId] = useState<string | null>(null);

  const carregarPendentes = async () => {
    setLoading(true);
    const dados = await listarParceirosPendentes();
    setParceiros(dados);
    setLoading(false);
  };

  useEffect(() => {
    carregarPendentes();
  }, []);

  const handleAprovar = async (id: string) => {
    if (confirm('Deseja aprovar este parceiro? A assinatura no plano básico será criada.')) {
      const ok = await aprovarParceiro(id);
      if (ok) {
        alert('Parceiro aprovado com sucesso!');
        carregarPendentes();
      } else {
        alert('Erro ao aprovar o parceiro.');
      }
    }
  };

  const handleRejeitar = async (id: string) => {
    const motivo = motivoRejeicao[id];
    if (!motivo) {
      alert('Por favor, informe o motivo da rejeição.');
      return;
    }

    const ok = await rejeitarParceiro(id, motivo);
    if (ok) {
      alert('Parceiro rejeitado.');
      setModalRejeitarId(null);
      carregarPendentes();
    } else {
      alert('Erro ao rejeitar o parceiro.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-500 font-medium">
        Carregando fila de moderação...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painel de Moderação</h2>
          <p className="text-sm text-slate-500">Analise e aprove novas solicitações de parceiros.</p>
        </div>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full">
          {parceiros.length} PENDENTES
        </span>
      </div>

      {parceiros.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-100 text-slate-500">
          🎉 Nenhum parceiro aguardando moderação no momento.
        </div>
      ) : (
        <div className="space-y-4">
          {parceiros.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{p.nome_responsavel}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    CPF/CNPJ: {p.cpf_ou_cnpj} • WhatsApp: {p.whatsapp_comercial}
                  </p>
                </div>
              </div>

              {p.venue && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  {p.venue.foto_capa && (
                    <img src={p.venue.foto_capa} alt="Capa" className="w-full h-48 object-cover rounded-xl" />
                  )}
                  <p className="text-sm text-slate-700"><strong className="text-slate-900">Bio:</strong> {p.venue.bio || 'Sem descrição'}</p>
                  <p className="text-sm text-slate-700">
                    <strong className="text-slate-900">Instagram:</strong> {p.venue.instagram || 'N/A'} • <strong className="text-slate-900">Site:</strong> {p.venue.website || 'N/A'}
                  </p>
                  
                  {p.venue.tags_publico_vibe && p.venue.tags_publico_vibe.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.venue.tags_publico_vibe.map(tag => (
                        <span key={tag} className="bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => handleAprovar(p.id)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all"
                >
                  ✓ Aprovar Perfil
                </button>
                <button 
                  onClick={() => setModalRejeitarId(modalRejeitarId === p.id ? null : p.id)}
                  className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-sm transition-all"
                >
                  ✕ Rejeitar
                </button>
              </div>

              {modalRejeitarId === p.id && (
                <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 space-y-3 mt-3">
                  <label className="block text-xs font-bold text-rose-800">
                    Motivo da Rejeição *:
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ex: Foto de capa fora dos padrões do portal."
                    value={motivoRejeicao[p.id] || ''}
                    onChange={e => setMotivoRejeicao({ ...motivoRejeicao, [p.id]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button 
                    onClick={() => handleRejeitar(p.id)}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg text-xs"
                  >
                    Confirmar Rejeição
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
