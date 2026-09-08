import { useState, useEffect } from 'react';
import './AdminDashboard.css';
import { supabase } from '../lib/supabase';

const ADMIN_USER = 'admin@dicaslgbt.com';
const ADMIN_PASS = 'DicasAdmin2026!';

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
  instagram?: string;
  estilo_musical?: string;
  bio?: string;
  foto_capa?: string;
  tags_publico_vibe?: string[];
}

export function AdminDashboard() {
  const [autenticado, setAutenticado] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState<'pendente' | 'ativo' | 'todos'>('pendente');

  useEffect(() => {
    const sessao = sessionStorage.getItem('admin_auth');
    if (sessao === 'true') {
      setAutenticado(true);
    }
  }, []);

  useEffect(() => {
    if (autenticado) {
      carregarSolicitacoes();
    }
  }, [autenticado, filtro]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim().toLowerCase() === ADMIN_USER && senhaInput === ADMIN_PASS) {
      sessionStorage.setItem('admin_auth', 'true');
      setAutenticado(true);
      setErroLogin('');
    } else {
      setErroLogin('E-mail ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setAutenticado(false);
  };

  const carregarSolicitacoes = async () => {
    setCarregando(true);
    try {
      let query = supabase.from('partners').select('*').order('created_at', { ascending: false });

      if (filtro === 'pendente') {
        query = query.in('status', ['pendente', 'rascunho']);
      } else if (filtro === 'ativo') {
        query = query.eq('status', 'ativo');
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

  if (!autenticado) {
    return (
      <div className="admin-login-wrapper">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <h2>Acesso Restrito — Dicas LGBT</h2>
          <p>Digite as credenciais da moderação para acessar o painel.</p>

          {erroLogin && <div className="admin-login-erro">{erroLogin}</div>}

          <div className="campo">
            <label>E-mail de Usuário</label>
            <input
              type="email"
              placeholder="admin@dicaslgbt.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label>Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={senhaInput}
              onChange={(e) => setSenhaInput(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-concluir">Entrar no Painel</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Painel de Moderação — Dicas LGBT</h1>
          <button className="admin-tab" onClick={handleLogout}>Sair</button>
        </div>
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
          {solicitacoes.map((item) => {
            const tags = item.tags_publico_vibe || [];
            return (
              <div key={item.partner_id} className="admin-card">
                {item.foto_capa && (
                  <div className="admin-card__capa">
                    <img src={item.foto_capa} alt={item.nome_espaco || 'Capa'} />
                  </div>
                )}
                <div className="admin-card__conteudo">
                  <div className={`admin-card__tag-status admin-card__tag-status--${item.status}`}>
                    {item.status.toUpperCase()}
                  </div>
                  <h2>{item.nome_espaco || 'Espaço sem nome'}</h2>
                  <span className="admin-card__categoria">{item.categoria?.toUpperCase()}</span>

                  <div className="admin-card__info">
                    <p><strong>Responsável:</strong> {item.nome_responsavel}</p>
                    <p><strong>WhatsApp:</strong> {item.whatsapp_comercial}</p>
                    <p><strong>Doc:</strong> {item.cpf_ou_cnpj}</p>
                    <p><strong>Endereço:</strong> {item.endereco || 'Endereço não informado'}</p>
                    {item.instagram && <p><strong>Instagram:</strong> {item.instagram}</p>}
                    {item.estilo_musical && <p><strong>Estilo Musical:</strong> {item.estilo_musical}</p>}
                    {item.bio && <p className="admin-card__bio">"{item.bio}"</p>}
                  </div>

                  {tags.length > 0 && (
                    <div className="admin-card__tags">
                      {tags.map((t) => (
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
            );
          })}
        </div>
      )}
    </div>
  );
}
