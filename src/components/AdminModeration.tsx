import { useEffect, useState } from 'react';
import {
    aprovarParceiro,
    listarParceirosPendentes,
    PartnerPendente,
    rejeitarParceiro
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
    return <p style={{ textAlign: 'center', padding: 20 }}>Carregando fila de moderação...</p>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h2>Painel de Moderação — Perfis Pendentes ({parceiros.length})</h2>

      {parceiros.length === 0 ? (
        <p>Nenhum parceiro aguardando moderação no momento.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
          {parceiros.map(p => (
            <div key={p.id} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 16, backgroundColor: '#FFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{p.nome_responsavel}</h3>
                  <span style={{ fontSize: 14, color: '#6B7280' }}>CPF/CNPJ: {p.cpf_ou_cnpj} | WhatsApp: {p.whatsapp_comercial}</span>
                </div>
                <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 8px', borderRadius: 4, height: 'fit-content', fontSize: 12, fontWeight: 'bold' }}>
                  PENDENTE
                </span>
              </div>

              {p.venue && (
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12, marginTop: 12 }}>
                  {p.venue.foto_capa && (
                    <img src={p.venue.foto_capa} alt="Capa" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6, marginBottom: 12 }} />
                  )}
                  <p><strong>Bio:</strong> {p.venue.bio || 'Sem descrição'}</p>
                  <p><strong>Instagram:</strong> {p.venue.instagram || 'N/A'} | <strong>Site:</strong> {p.venue.website || 'N/A'}</p>
                  
                  <div style={{ marginTop: 8 }}>
                    <strong>Público & Vibe:</strong>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {p.venue.tags_publico_vibe?.map(tag => (
                        <span key={tag} style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 16, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
                <button 
                  onClick={() => handleAprovar(p.id)}
                  style={{ backgroundColor: '#059669', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✓ Aprovar Perfil
                </button>
                <button 
                  onClick={() => setModalRejeitarId(modalRejeitarId === p.id ? null : p.id)}
                  style={{ backgroundColor: '#DC2626', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
                >
                  ✕ Rejeitar
                </button>
              </div>

              {modalRejeitarId === p.id && (
                <div style={{ marginTop: 12, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 6 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', marginBottom: 4, color: '#991B1B' }}>
                    Motivo da Rejeição *:
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ex: Foto de capa fora dos padrões do portal."
                    value={motivoRejeicao[p.id] || ''}
                    onChange={e => setMotivoRejeicao({ ...motivoRejeicao, [p.id]: e.target.value })}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #FCA5A5', marginBottom: 8 }}
                  />
                  <button 
                    onClick={() => handleRejeitar(p.id)}
                    style={{ backgroundColor: '#991B1B', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}
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