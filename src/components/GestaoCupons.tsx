import React, { useState } from 'react';
import { criarCupom } from '../lib/coupons';

interface GestaoCuponsProps {
  partnerId: string;
}

export function GestaoCupons({ partnerId }: GestaoCuponsProps) {
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [regras, setRegras] = useState('');
  const [tipoDesconto, setTipoDesconto] = useState<'porcentagem' | 'valor'>('porcentagem');
  const [valorDesconto, setValorDesconto] = useState('');
  const [validade, setValidade] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);

    if (!partnerId) {
      setMensagem({ tipo: 'erro', texto: 'ID do Parceiro não localizado. Realize o cadastro.' });
      return;
    }

    setLoading(true);

    const payload = {
      partner_id: partnerId,
      codigo_cupom: codigo.toUpperCase().trim(),
      titulo_oferta: titulo,
      descricao_regras: regras,
      desconto_porcentagem: tipoDesconto === 'porcentagem' ? Number(valorDesconto) : undefined,
      desconto_valor_fixo: tipoDesconto === 'valor' ? Number(valorDesconto) : undefined,
      data_validade: validade,
    };

    const resultado = await criarCupom(payload);

    setLoading(false);

    if (resultado.success) {
      setMensagem({ tipo: 'sucesso', texto: '🏷️ Cupom criado com sucesso!' });
      setCodigo('');
      setTitulo('');
      setRegras('');
      setValorDesconto('');
      setValidade('');
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.message || 'Erro ao criar cupom.' });
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, backgroundColor: '#FFF', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h2>🏷️ Criar Novo Cupom de Desconto</h2>

      {mensagem && (
        <div style={{
          padding: 12,
          borderRadius: 6,
          marginBottom: 16,
          backgroundColor: mensagem.tipo === 'sucesso' ? '#DCFCE7' : '#FEE2E2',
          color: mensagem.tipo === 'sucesso' ? '#166534' : '#991B1B',
          fontWeight: 'bold'
        }}>
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Título da Oferta *</label>
          <input
            type="text"
            required
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ex: 20% OFF no primeiro drink ou Entrata VIP"
            style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Código do Cupom *</label>
          <input
            type="text"
            required
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder="Ex: DICAS20 ou VIPSUMMER"
            style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC', textTransform: 'uppercase' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Tipo de Desconto</label>
            <select
              value={tipoDesconto}
              onChange={e => setTipoDesconto(e.target.value as 'porcentagem' | 'valor')}
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
            >
              <option value="porcentagem">Porcentagem (%)</option>
              <option value="valor">Valor Fixo (R$)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Valor *</label>
            <input
              type="number"
              required
              min="1"
              value={valorDesconto}
              onChange={e => setValorDesconto(e.target.value)}
              placeholder={tipoDesconto === 'porcentagem' ? 'Ex: 20' : 'Ex: 15'}
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Data de Validade *</label>
          <input
            type="date"
            required
            value={validade}
            onChange={e => setValidade(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Regras de Uso (opcional)</label>
          <textarea
            rows={2}
            value={regras}
            onChange={e => setRegras(e.target.value)}
            placeholder="Ex: Válido apenas de quinta a domingo. Não cumulativo com outras promoções."
            style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#059669',
            color: '#FFF',
            border: 'none',
            borderRadius: 6,
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: 8
          }}
        >
          {loading ? 'Ativando Cupom...' : 'Ativar Oferta'}
        </button>
      </form>
    </div>
  );
}
