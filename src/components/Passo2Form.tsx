import React, { useState } from 'react';
import {
    enviarDetalhesEspaco,
    TAGS_COMODIDADES,
    TAGS_PUBLICO_VIBE
} from '../lib/venue';

interface Passo2Props {
  partnerId: string;
  onSuccess: () => void;
}

export function Passo2Form({ partnerId, onSuccess }: Passo2Props) {
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [fotoCapa, setFotoCapa] = useState('');
  const [tagsPublico, setTagsPublico] = useState<string[]>([]);
  const [tagsComodidades, setTagsComodidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const togglePublicoTag = (tag: string) => {
    setTagsPublico(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleComodidadeTag = (tag: string) => {
    setTagsComodidades(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!fotoCapa) {
      setErro('A foto de capa é obrigatória.');
      return;
    }

    if (tagsPublico.length === 0) {
      setErro('Selecione ao menos 1 tag de Público & Vibe.');
      return;
    }

    setLoading(true);

    const resultado = await enviarDetalhesEspaco(partnerId, {
      bio,
      instagram,
      website,
      foto_capa: fotoCapa,
      tags_publico_vibe: tagsPublico,
      tags_comodidades: tagsComodidades,
    });

    setLoading(false);

    if (resultado.success) {
      onSuccess();
    } else {
      setErro(resultado.message || 'Erro ao enviar os detalhes do espaço.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>Passo 2: Perfil do Espaço</h2>

      {erro && <div style={{ color: 'red', padding: 8, border: '1px solid red' }}>{erro}</div>}

      <div>
        <label>Descrição/Bio do Espaço (até 500 caracteres):</label>
        <textarea
          maxLength={500}
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Conte um pouco sobre a proposta do seu espaço..."
          rows={4}
          style={{ width: '100%', marginTop: 4 }}
        />
      </div>

      <div>
        <label>Instagram (@seu_espaço):</label>
        <input
          type="text"
          value={instagram}
          onChange={e => setInstagram(e.target.value)}
          placeholder="@dicaslgbt"
          style={{ width: '100%', marginTop: 4 }}
        />
      </div>

      <div>
        <label>Website:</label>
        <input
          type="url"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          placeholder="https://meusite.com.br"
          style={{ width: '100%', marginTop: 4 }}
        />
      </div>

      <div>
        <label>Foto de Capa (URL da Imagem) *:</label>
        <input
          type="url"
          required
          value={fotoCapa}
          onChange={e => setFotoCapa(e.target.value)}
          placeholder="https://exemplo.com/foto-capa.jpg"
          style={{ width: '100%', marginTop: 4 }}
        />
      </div>

      <div>
        <label><strong>Público & Vibe * (selecione ao menos 1):</strong></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {TAGS_PUBLICO_VIBE.map((tag: string) => (
            <button
              type="button"
              key={tag}
              onClick={() => togglePublicoTag(tag)}
              style={{
                padding: '6px 12px',
                borderRadius: 16,
                border: '1px solid #ccc',
                background: tagsPublico.includes(tag) ? '#7C3AED' : '#f0f0f0',
                color: tagsPublico.includes(tag) ? '#fff' : '#333',
                cursor: 'pointer'
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label><strong>Comodidades:</strong></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {TAGS_COMODIDADES.map((tag: string) => (
            <button
              type="button"
              key={tag}
              onClick={() => toggleComodidadeTag(tag)}
              style={{
                padding: '6px 12px',
                borderRadius: 16,
                border: '1px solid #ccc',
                background: tagsComodidades.includes(tag) ? '#10B981' : '#f0f0f0',
                color: tagsComodidades.includes(tag) ? '#fff' : '#333',
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
        style={{ padding: '12px 24px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 16 }}
      >
        {loading ? 'Enviando...' : 'Concluir Cadastro'}
      </button>
    </form>
  );
}