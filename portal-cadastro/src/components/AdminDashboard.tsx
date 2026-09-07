import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './AdminDashboard.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fyisfucgzpdwupjterlh.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qSAiGoo7ZEG0IboqClunQ_NyJ80';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Solicitacao {
  partner_id: string;
  nome_responsavel: string;
  whatsapp_comercial: string;
  cpf_ou_cnpj: string;
  status: string;
  created_at: string;
  venue_id?: string;
  nome_espaco?: string;
  categoria?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  instagram?: string;
  estilo_musical?: string;
  bio?: string;
  foto_capa?: string;
  tags_publico_vibe?: string[];
}

export function AdminDashboard() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'pendente' | 'ativo' | 'todos'>('pendente');

  useEffect(() => {
    carregarSolicitacoes();
  }, [filtro]);

  const carregarSolicitacoes = async () => {
    setCarregando(true);
    try {
      let query = supabase.from('partners').select('*').order('created_at', { ascending: false });

      if (filtro !== 'todos') {
        query = query.eq('status', filtro);
      }

      const { data: partners, error: pErr } = await query;

      if (pErr) {
        console.error('Erro ao buscar parceiros:', pErr);
        setCarregando(false);
        return;
      }

      if (partners && partners.length > 0) {
        const partnerIds = partners.map((p) => p.id);
        const { data: venues } = await supabase.from('venues').select('*').in('partner_id', partnerIds);

        const combinados: Solicitacao[] = partners.map((p) => {
          const v = venues?.find((vItem) => vItem.partner_id === p.id);
          return {
            partner_id: p.id,
            nome_responsavel: p.nome_responsavel,
            whatsapp_comercial: p.whatsapp_comercial,
            cpf_ou_cnpj: p.cpf_ou_cnpj,
            status: p.status,
            created_at: p.created_at,
            venue_id: v?.id,
            nome_espaco: v?.nome,
            categoria: v?.categoria,
            endereco: v?.endereco,
            cidade: v?.cidade,
            uf: v?.uf,
            instagram: v?.instagram,
            estilo_musical: v?.estilo_musical,
            bio: v?.bio,
            foto_capa: v?.foto_capa,
            tags_publico_vibe: v?.tags_publico_vibe || []
          };
        });

        setSolicitacoes(combinados);
      } else {
        setSolicitacoes([]);
      }
    } catch (err) {
      console.error('Erro geral:', err);
    } finally {
      setCarregando(false);
    }
  };

  const atualizarStatus = async (partnerId: string, novoStatus: 'ativo' | 'rejeitado') => {
    const { error } = await supabase.from('partners').update({ status: novoStatus }).eq('id', partnerId);
    if (!error) {
      setSolicitacoes((prev) => prev.filter((item) => item.partner_id !== partnerId));
      alert(`Parceiro ${novoStatus === 'ativo' ? 'Aprovado' : 'Rejeitado'} com sucesso!`);
    } else {
      alert(`Erro ao atualizar status: ${error.message}`);
    }
  };

  const abrirWhatsapp = (numero: string, nomeEspaco?: string) => {
    const msg = encodeURIComponent(`Olá! Falamos da equipe Dicas LGBT sobre o cadastro do ${nomeEspaco || 'seu espaço'}.`);
    window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank');
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Painel de Moderacao — Dicas LGBT</h1>
        <p>Gerencie as solicitações de novos espaços e parceiros B2B.</p>
        
        <div className="admin-filtros">
          <button
            className={`admin-tab ${filtro === 'pendente' ? 'admin-tab--ativo' : ''}`}
            onClick={() => setFiltro('pendente')}
          >
            Pendentes
          </button>
          <button
            className={`admin-tab ${filtro === 'ativo' ? 'admin-tab--ativo' : ''}`}
            onClick={() => setFiltro('ativo')}
          >
            Aprovados
          </button>
          <button
            className={`admin-tab ${filtro === 'todos' ? 'admin-tab--ativo' : ''}`}
            onClick={() => setFiltro('todos')}
          >
            Todos
          </button>
        </div>
      </header>

      {carregando ? (
        <div className="admin-carregando">Carregando solicitações...</div>
      ) : solicitacoes.length === 0 ? (
        <div className="admin-vazio">Nenhuma solicitação encontrada para o filtro selecionado.</div>
      ) : (
        <div className="admin-grid">
          {solicitacoes.map((item) => (
            <div key={item.partner_id} className="admin-card">
              {item.foto_capa && (
                <div className="admin-card__capa">
                  <img src={item.foto_capa} alt={item.nome_espaco || 'Capa'} />
                </div>
              )}
              <div className="admin-card__conteudo">
                <div className="admin-card__tag-status admin-card__tag-status--${item.status}">
                  {item.status.toUpperCase()}
                </div>
                <h2>{item.nome_espaco || 'Espaço sem nome'}</h2>
                <span className="admin-card__categoria">{item.categoria?.toUpperCase()}</span>

                <div className="admin-card__info">
                  <p><strong>Responsável:</strong> {item.nome_responsavel}</p>
                  <p><strong>WhatsApp:</strong> {item.whatsapp_comercial}</p>
                  <p><strong>Doc:</strong> {item.cpf_ou_cnpj}</p>
                  <p><strong>Endereço:</strong> {item.endereco || `${item.cidade}/${item.uf}`}</p>
                  {item.instagram && <p><strong>Instagram:</strong> {item.instagram}</p>}
                  {item.estilo_musical && <p><strong>Som/Estilo:</strong> {item.estilo_musical}</p>}
                  {item.bio && <p className="admin-card__bio">"{item.bio}"</p>}
                </div>

                {item.tags_publico_vibe.length > 0 && (
                  <div className="admin-card__tags">
                    {item.tags_publico_vibe.map((t) => (
                      <span key={t} className="admin-chip">{t}</span>
                    ))}
                  </div>
                )}

                <div className="admin-card__acoes">
                  <button
                    className="btn-admin btn-admin--wa"
                    onClick={() => abrirWhatsapp(item.whatsapp_comercial, item.nome_espaco)}
                  >
                    💬 WhatsApp
                  </button>

                  {item.status !== 'ativo' && (
                    <button
                      className="btn-admin btn-admin--aprovar"
                      onClick={() => atualizarStatus(item.partner_id, 'ativo')}
                    >
                      Aprovar
                    </button>
                  )}

                  {item.status !== 'rejeitado' && (
                    <button
                      className="btn-admin btn-admin--rejeitar"
                      onClick={() => atualizarStatus(item.partner_id, 'rejeitado')}
                    >
                      Rejeitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
