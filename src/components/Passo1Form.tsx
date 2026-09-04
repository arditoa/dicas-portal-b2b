import React, { useEffect, useState } from 'react';
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
    <form onSubmit={handleSubmit} style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>Passo 1: Identificação do Responsável</h2>

      {erro && (
        <div style={{ color: '#DC2626', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 6, fontSize: 14 }}>
          {erro}
        </div>
      )}

      {veioDoWhatsapp && (
        <div style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: 12, borderRadius: 6, fontSize: 14 }}>
          ✓ Número retornado do WhatsApp preenchido automaticamente!
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Nome do Responsável *</label>
        <input
          type="text"
          required
          value={nomeResponsavel}
          onChange={e => setNomeResponsavel(e.target.value)}
          placeholder="Seu nome completo"
          style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>CPF ou CNPJ *</label>
        <input
          type="text"
          required
          value={cpfCnpj}
          onChange={e => setCpfCnpj(e.target.value)}
          placeholder="123.456.789-00 ou 12.345.678/0001-90"
          style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>WhatsApp Comercial *</label>
        <input
          type="tel"
          required
          value={whatsapp}
          readOnly={veioDoWhatsapp}
          onChange={e => setWhatsapp(e.target.value)}
          placeholder="11999999999"
          style={{ 
            width: '100%', 
            padding: 10, 
            borderRadius: 4, 
            border: '1px solid #CCC',
            backgroundColor: veioDoWhatsapp ? '#F3F4F6' : '#FFF',
            cursor: veioDoWhatsapp ? 'not-allowed' : 'text'
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <input
          type="checkbox"
          id="termos"
          checked={aceitouTermos}
          onChange={e => setAceitouTermos(e.target.checked)}
          style={{ width: 18, height: 18, cursor: 'pointer' }}
        />
        <label htmlFor="termos" style={{ fontSize: 14, cursor: 'pointer' }}>
          Li e aceito os Termos de Uso e Privacidade *
        </label>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        style={{ 
          padding: '12px 24px', 
          backgroundColor: '#7C3AED', 
          color: '#FFF', 
          border: 'none', 
          borderRadius: 6, 
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: 12 
        }}
      >
        {loading ? 'Processando...' : 'Avançar para Detalhes do Espaço'}
      </button>
    </form>
  );
}
