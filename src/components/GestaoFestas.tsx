import React, { useState } from 'react';
import { criarFesta, TAGS_MUSICA } from '../lib/events';

interface GestaoFestasProps {
  partnerId: string;
}

export function GestaoFestas({ partnerId }: GestaoFestasProps) {
  const [nomeEvento, setNomeEvento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [precoIngressos, setPrecoIngressos] = useState('');
  const [linkVendas, setLinkVendas] = useState('');
  const [fotoBanner, setFotoBanner] = useState('');
  const [tagsMusica, setTagsMusica] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const toggleTag = (tag: string) => {
    setTagsMusica(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);

    if (tagsMusica.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Selecione ao menos 1 estilo musical/tag.' });
      return;
    }

    if (!partnerId) {
      setMensagem({ tipo: 'erro', texto: 'ID do Parceiro não localizado. Realize o login/cadastro.' });
      return;
    }

    setLoading(true);

    const resultado = await criarFesta({
      partner_id: partnerId,
      nome_evento: nomeEvento,
      descricao,
      data_inicio: dataInicio,
      data_fim: dataFim,
      preco_ingressos: precoIngressos,
      link_vendas: linkVendas,
      foto_banner: fotoBanner,
      tags_musica: tagsMusica,
    });

    setLoading(false);

    if (resultado.success) {
      setMensagem({ tipo: 'sucesso', texto: '🎉 Festa cadastrada com sucesso!' });
      // Limpa formulário
      setNomeEvento('');
      setDescricao('');
      setDataInicio('');
      setDataFim('');
      setPrecoIngressos('');
      setLinkVendas('');
      setFotoBanner('');
      setTagsMusica([]);
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.message || 'Erro ao cadastrar a festa.' });
    }
  };

  return (
    <div style={{ maxWidth: 650, margin: '0 auto', padding: 20, backgroundColor: '#FFF', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h2> 🎉 Cadastrar Nova Festa / Evento</h2>

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
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Nome do Evento *</label>
          <input
            type="text"
            required
            value={nomeEvento}
            onChange={e => setNomeEvento(e.target.value)}
            placeholder="Ex: Baile da Pride - Edição Especial"
            style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Descrição do Evento *</label>
          <textarea
            required
            rows={3}
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Detalhes sobre a festa, line-up de DJs, atrações..."
            style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Data e Hora de Início *</label>
            <input
              type="datetime-local"
              required
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Data e Hora de Término *</label>
            <input
              type="datetime-local"
              required
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Preço do Ingresso (opcional)</label>
            <input
              type="text"
              value={precoIngressos}
              onChange={e => setPrecoIngressos(e.target.value)}
              placeholder="Ex: R$ 30,00 ou VIP Grátis"
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Link para Compra (opcional)</label>
            <input
              type="url"
              value={linkVendas}
              onChange={e => setLinkVendas(e.target.value)}
              placeholder="https://sympla.com.br/meuevento"
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Foto / Banner do Evento (URL) *</label>
          <input
            type="url"
            required
            value={fotoBanner}
            onChange={e => setFotoBanner(e.target.value)}
            placeholder="https://exemplo.com/banner.jpg"
            style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #CCC' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>
            Estilo Musical / Tags * (selecione ao menos 1)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TAGS_MUSICA.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  border: '1px solid #CBD5E1',
                  background: tagsMusica.includes(tag) ? '#EC4899' : '#F1F5F9',
                  color: tagsMusica.includes(tag) ? '#FFF' : '#334155',
                  fontWeight: tagsMusica.includes(tag) ? 'bold' : 'normal',
                  cursor: 'pointer'
                }}
              >
                {tag}
              </button>
            ))}
          </div>
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
          {loading ? 'Salvando Evento...' : 'Publicar Festa'}
        </button>
      </form>
    </div>
  );
}
EOFgit add .
git commit -m "feat: cria servico events.ts e componente GestaoFestas.tsx"
git push origin main
cat << 'EOF' > src/App.tsx
import { useState } from 'react';
import { Passo1Form } from './components/Passo1Form';
import { Passo2Form } from './components/Passo2Form';
import { AdminModeration } from './components/AdminModeration';
import { GestaoFestas } from './components/GestaoFestas';

export function App() {
  const [modo, setModo] = useState<'cadastro' | 'admin' | 'festas'>('cadastro');
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [partnerId, setPartnerId] = useState<string>('');

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      {/* Barra de Navegação no Topo */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px 24px', 
        backgroundColor: '#1E1B4B', 
        color: '#FFF' 
      }}>
        <h1 style={{ fontSize: 18, margin: 0, fontWeight: 'bold' }}>Dicas LGBT — Portal</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setModo('cadastro')}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: modo === 'cadastro' ? '#6D28D9' : 'transparent',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: modo === 'cadastro' ? 'bold' : 'normal'
            }}
          >
            Formulário de Cadastro
          </button>
          <button
            onClick={() => setModo('festas')}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: modo === 'festas' ? '#EC4899' : 'transparent',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: modo === 'festas' ? 'bold' : 'normal'
            }}
          >
            🎉 Cadastrar Festa
          </button>
          <button
            onClick={() => setModo('admin')}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: modo === 'admin' ? '#6D28D9' : 'transparent',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: modo === 'admin' ? 'bold' : 'normal'
            }}
          >
            Painel Admin
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main style={{ padding: 20 }}>
        {modo === 'admin' && <AdminModeration />}

        {modo === 'festas' && <GestaoFestas partnerId={partnerId} />}

        {modo === 'cadastro' && (
          <div>
            {etapa === 1 && (
              <Passo1Form 
                onSuccess={(idGerado: string) => {
                  setPartnerId(idGerado);
                  setEtapa(2);
                }} 
              />
            )}

            {etapa === 2 && (
              <Passo2Form 
                partnerId={partnerId} 
                onSuccess={() => setEtapa(3)} 
              />
            )}

            {etapa === 3 && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <h2>🎉 Cadastro Concluído!</h2>
                <p>Seu perfil foi enviado para moderação.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                  <button 
                    onClick={() => setModo('festas')}
                    style={{ padding: '10px 20px', backgroundColor: '#EC4899', color: '#FFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Cadastrar uma Festa Agora
                  </button>
                  <button 
                    onClick={() => { setEtapa(1); setPartnerId(''); }}
                    style={{ padding: '10px 20px', cursor: 'pointer' }}
                  >
                    Cadastrar outro espaço
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
