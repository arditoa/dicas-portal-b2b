import { useEffect, useState } from 'react';
import { apenasDigitos } from '../lib/documento';
import { supabase } from '../lib/supabase';
import './CadastroCompletoForm.css';

const WHATSAPP_SUPORTE = '5511942922028';

export function CadastroCupomExpressForm() {
  const [buscaDoc, setBuscaDoc] = useState('');
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [venueEncontrado, setVenueEncontrado] = useState<{ id: string; nome: string } | null>(null);

  const [titulo, setTitulo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [regraUso, setRegraUso] = useState('');
  const [validoAte, setValidoAte] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vId = params.get('venue_id');
    if (vId) {
      supabase
        .from('venues')
        .select('id, nome')
        .eq('id', vId)
        .single()
        .then(({ data }) => {
          if (data) setVenueEncontrado(data);
        });
    }
  }, []);

  const abrirWhatsappSuporte = () => {
    const msg = encodeURIComponent("Olá! Preciso de ajuda para cadastrar um cupom no portal Dicas LGBT+.");
    window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${msg}`, '_blank');
  };

  const buscarEspaco = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');
    const limpo = apenasDigitos(buscaDoc);

    if (!limpo) {
      setErroMsg('Por favor, informe seu CNPJ, CPF ou WhatsApp cadastrado.');
      return;
    }

    setCarregandoBusca(true);

    try {
      const { data: partners, error: pErr } = await supabase
        .from('partners')
        .select('id')
        .or(`cpf_ou_cnpj.eq.${limpo},whatsapp_comercial.eq.${limpo}`);

      if (pErr || !partners || partners.length === 0) {
        throw new Error('Nenhum cadastro encontrado com este documento/WhatsApp.');
      }

      const partnerIds = partners.map((p) => p.id);

      const { data: venues, error: vErr } = await supabase
        .from('venues')
        .select('id, nome')
        .in('partner_id', partnerIds)
        .limit(1);

      if (vErr || !venues || venues.length === 0) {
        throw new Error('Nenhum local cadastrado encontrado para este parceiro.');
      }

      setVenueEncontrado(venues[0]);
    } catch (err: any) {
      setErroMsg(err?.message || 'Erro ao localizar estabelecimento.');
    } finally {
      setCarregandoBusca(false);
    }
  };

  const publicarCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueEncontrado) return;

    setEnviando(true);
    setErroMsg('');

    const codigoFinal = codigo.trim().toUpperCase() || `DICAS${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const { error } = await supabase.from('coupons').insert({
        venue_id: venueEncontrado.id,
        titulo,
        descricao,
        codigo_promocional: codigoFinal,
        regra_uso: regraUso,
        ativo: true,
        valido_ate: validoAte ? new Date(validoAte).toISOString() : null
      });

      if (error) throw new Error(error.message);

      setSucesso(true);
    } catch (err: any) {
      setErroMsg(err?.message || 'Erro ao publicar cupom.');
    } finally {
      setEnviando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="cadastro-completo" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚡🎉</div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#FFFFFF' }}>Cupom Publicado com Sucesso!</h1>
        <p style={{ color: '#94A3B8', marginTop: '12px', fontSize: '16px', maxWidth: '480px', margin: '12px auto 0' }}>
          O seu benefício já está no ar e visível automaticamente no aplicativo Dicas LGBT+.
        </p>
        <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setSucesso(false);
              setTitulo('');
              setCodigo('');
              setDescricao('');
              setRegraUso('');
            }}
            className="btn-concluir"
            style={{ maxWidth: '240px' }}
          >
            ➕ Publicar Outro Cupom
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="portal-header">
        <div className="portal-header__brand">
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF4B4B" />
                <stop offset="25%" stopColor="#FFA000" />
                <stop offset="50%" stopColor="#22C55E" />
                <stop offset="75%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>
            <path d="M50 5C27.9 5 10 22.9 10 45C10 68 50 95 50 95C50 95 90 68 90 45C90 22.9 72.1 5 50 5ZM50 60C41.7 60 35 53.3 35 45C35 36.7 41.7 30 50 30C58.3 30 65 36.7 65 45C65 53.3 58.3 60 50 60Z" fill="url(#rainbowGrad)" />
          </svg>
          <div className="portal-header__title">
            DICAS <span>LGBT+</span>
          </div>
        </div>
      </header>

      <div className="cadastro-completo">
        <div className="cadastro-completo__cabecalho">
          <h1>Publicar Cupom Instantâneo ⚡</h1>
          <p>Suba uma promoção exclusiva em segundos e atraia clientes para seu local hoje mesmo.</p>
        </div>

        {!venueEncontrado ? (
          <section className="cadastro-completo__secao">
            <h2>1. Localize seu Estabelecimento</h2>
            <form onSubmit={buscarEspaco}>
              <div className="campo">
                <label>CNPJ, CPF ou WhatsApp Cadastrado *</label>
                <input
                  type="text"
                  placeholder="Digite CNPJ, CPF ou telefone do cadastro"
                  value={buscaDoc}
                  onChange={(e) => setBuscaDoc(e.target.value)}
                />
              </div>

              {erroMsg && <p style={{ color: '#FF4B4B', fontSize: '13px', marginBottom: '16px' }}>{erroMsg}</p>}

              <button type="submit" className="btn-concluir" disabled={carregandoBusca}>
                {carregandoBusca ? 'Buscando Local...' : 'Buscar Meu Local'}
              </button>
            </form>
          </section>
        ) : (
          <section className="cadastro-completo__secao">
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(168, 85, 247, 0.15)', border: '1px solid #A855F7', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#CBD5E1', display: 'block' }}>Espaço Identificado:</span>
                <strong style={{ fontSize: '16px', color: '#FFFFFF' }}>{venueEncontrado.nome}</strong>
              </div>
              <button
                type="button"
                onClick={() => setVenueEncontrado(null)}
                style={{ background: 'none', border: 'none', color: '#C084FC', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Trocar Local
              </button>
            </div>

            <h2>2. Detalhes da Promoção / Cupom</h2>
            <form onSubmit={publicarCupom}>
              <div className="campo">
                <label>Título do Benefício / Oferta *</label>
                <input
                  type="text"
                  placeholder="Ex: 2x1 no Caipirinha ou 15% OFF na Comanda"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="campo">
                <label>Código Promocional (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: DICAS15 (gerado automaticamente se em branco)"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>

              <div className="campo">
                <label>Descrição do Benefício</label>
                <textarea
                  placeholder="Descreva o que o cliente ganha ao apresentar o cupom no balcão..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div className="campo">
                <label>Regras & Condições de Uso</label>
                <textarea
                  placeholder="Ex: Válido de terça a quinta, das 18h às 21h. Válido apenas 1 por pessoa."
                  value={regraUso}
                  onChange={(e) => setRegraUso(e.target.value)}
                />
              </div>

              <div className="campo">
                <label>Validade do Cupom (Opcional)</label>
                <input
                  type="date"
                  value={validoAte}
                  onChange={(e) => setValidoAte(e.target.value)}
                  style={{ width: '100%', padding: '14px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#FFF' }}
                />
              </div>

              {erroMsg && <p style={{ color: '#FF4B4B', fontSize: '13px', marginBottom: '16px' }}>{erroMsg}</p>}

              <button type="submit" className="btn-concluir" disabled={enviando}>
                {enviando ? 'Publicando Cupom...' : '🚀 Ativar e Publicar no App'}
              </button>
            </form>
          </section>
        )}

        <button
          type="button"
          onClick={abrirWhatsappSuporte}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#25D366',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '99px',
            padding: '12px 20px',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 900
          }}
        >
          💬 Suporte WhatsApp
        </button>
      </div>
    </div>
  );
}