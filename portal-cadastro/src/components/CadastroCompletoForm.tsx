import { useState, useEffect } from 'react';
import './CadastroCompletoForm.css';
import { formatarDocumento, apenasDigitos } from '../lib/documento';
import { formatarWhatsApp } from '../lib/whatsapp';
import { supabase } from '../lib/supabase';

const TAGS_VIBE = [
  'Geral / Todos bem-vindos',
  'Gay',
  'Lésbico',
  'Trans & Não-binário',
  'Bissexual+',
  'Drag',
  'Ursos/Leather',
  'Queer/Alternativo',
  'Ballroom/Vogue',
  'Fetiche'
];

const ESTILOS_MUSICAIS = [
  'Pop',
  'Eletrônico / House / Techno',
  'Funk',
  'Samba / Pagode',
  'MPB / Brasilidades',
  'Sertanejo',
  'Rock / Indie',
  'Hip-Hop / R&B / Trap',
  'Axé / Forró',
  'Variado / Sem Música'
];

export function CadastroCompletoForm() {
  const [doc, setDoc] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nomeEspaco, setNomeEspaco] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [categoria, setCategoria] = useState('bar');

  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [liberado, setLiberado] = useState(false);

  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [estiloMusical, setEstiloMusical] = useState('');
  const [fotoCapa, setFotoCapa] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [tagsVibe, setTagsVibe] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [carregandoCnpj, setCarregandoCnpj] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucessoConcluido, setSucessoConcluido] = useState(false);

  const [partnerIdCriado, setPartnerIdCriado] = useState<string | null>(null);

  useEffect(() => {
    const limpo = apenasDigitos(doc);
    if (limpo.length === 14) {
      setCarregandoCnpj(true);
      fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.nome_fantasia) {
            setNomeFantasia(data.nome_fantasia);
            setNomeEspaco(data.nome_fantasia);
          } else if (data.razao_social) {
            setNomeEspaco(data.razao_social);
          }
          if (data.cep) setCep(data.cep);
          if (data.logradouro) setLogradouro(data.logradouro);
          if (data.bairro) setBairro(data.bairro);
          if (data.municipio) setCidade(data.municipio);
          if (data.uf) setUf(data.uf);
        })
        .catch(() => {})
        .finally(() => setCarregandoCnpj(false));
    }
  }, [doc]);

  useEffect(() => {
    const limpo = apenasDigitos(cep);
    if (limpo.length === 8 && !logradouro) {
      fetch(`https://viacep.com.br/ws/${limpo}/json/`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.erro) {
            setLogradouro(data.logradouro || '');
            setBairro(data.bairro || '');
            setCidade(data.localidade || '');
            setUf(data.uf || '');
          }
        })
        .catch(() => {});
    }
  }, [cep]);

  const handleCheckboxChange = (checked: boolean) => {
    setAceitouTermos(checked);
    if (checked) {
      setLiberado(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNomeArquivo(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoCapa(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const concluirCadastro = async (e: React.MouseEvent) => {
    e.preventDefault();
    setEnviando(true);
    setStatusMsg('Enviando perfil para moderação...');

    try {
      let currentPartnerId = partnerIdCriado;

      if (!currentPartnerId) {
        const { data: partner, error: pErr } = await supabase
          .from('partners')
          .insert({
            nome_responsavel: nomeResponsavel || 'Responsável Não Informado',
            cpf_ou_cnpj: apenasDigitos(doc) || `00${Date.now()}`,
            whatsapp_comercial: apenasDigitos(whatsapp) || '00000000000',
            status: 'pendente'
          })
          .select()
          .single();

        if (pErr) {
          throw new Error(`Erro ao criar parceiro: ${pErr.message}`);
        }

        currentPartnerId = partner.id;
        setPartnerIdCriado(partner.id);
      }

      const enderecoFormatado = `${logradouro || 'Endereço'}, ${numero || 'S/N'}${complemento ? ' - ' + complemento : ''}, ${bairro} - ${cidade}/${uf}`;
      
      const { error: vErr } = await supabase
        .from('venues')
        .insert({
          partner_id: currentPartnerId,
          nome: nomeEspaco || nomeFantasia || 'Espaço sem nome',
          categoria,
          endereco: enderecoFormatado,
          bio,
          instagram,
          estilo_musical: estiloMusical,
          foto_capa: fotoCapa || null,
          tags_publico_vibe: tagsVibe
        });

      if (vErr) {
        throw new Error(`Erro ao criar local: ${vErr.message}`);
      }

      setSucessoConcluido(true);
    } catch (err: any) {
      console.error('Erro de Envio Final:', err);
      alert(err?.message || 'Ocorreu um erro ao gravar os dados.');
    } finally {
      setEnviando(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTagsVibe((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  if (sucessoConcluido) {
    return (
      <div className="cadastro-completo" style={{ textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1E1526' }}>Cadastro Enviado com Sucesso!</h1>
        <p style={{ color: '#64748B', marginTop: '8px', fontSize: '15px' }}>
          Obrigado por registrar seu espaço. Nossa equipe revisará seu perfil em breve e você receberá uma confirmação no WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="cadastro-completo">
      <div className="cadastro-completo__cabecalho">
        <h1>Cadastre seu espaço no Dicas LGBT</h1>
        <p>Leva menos de 2 minutos. É grátis para começar — sem cartão, sem compromisso.</p>
        {statusMsg && <div className="cadastro-completo__retomada">{statusMsg}</div>}
      </div>

      <section className="cadastro-completo__secao">
        <h2>1. Identificação do Espaço</h2>
        <div className="campo">
          <label>CPF ou CNPJ *</label>
          <input
            type="text"
            placeholder="Digite seu CPF ou CNPJ"
            value={doc}
            onChange={(e) => setDoc(formatarDocumento(e.target.value))}
          />
          {carregandoCnpj && <p className="campo__status">Buscando dados do CNPJ...</p>}
        </div>

        <div className="campo">
          <label>Nome do Responsável *</label>
          <input
            type="text"
            placeholder="Seu nome completo"
            value={nomeResponsavel}
            onChange={(e) => setNomeResponsavel(e.target.value)}
          />
        </div>

        <div className="campo">
          <label>WhatsApp Comercial *</label>
          <input
            type="text"
            placeholder="(11) 99999-9999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatarWhatsApp(e.target.value))}
          />
        </div>

        <div className="campo">
          <label>Razão Social / Nome Oficial *</label>
          <input
            type="text"
            placeholder="Ex: Bar da Esquina LTDA"
            value={nomeEspaco}
            onChange={(e) => setNomeEspaco(e.target.value)}
          />
        </div>

        <div className="campo">
          <label>Nome Fantasia</label>
          <input
            type="text"
            placeholder="Nome como o local é conhecido publicamente"
            value={nomeFantasia}
            onChange={(e) => setNomeFantasia(e.target.value)}
          />
        </div>

        <div className="campo">
          <label>Categoria *</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="bar">Bar</option>
            <option value="balada">Balada</option>
            <option value="comer">Restaurante / Comer</option>
            <option value="roteiro">Roteiro Cultural</option>
          </select>
        </div>

        <fieldset className="cadastro-completo__endereco">
          <legend>Endereço</legend>
          <div className="cadastro-completo__linha">
            <div className="campo campo--numero">
              <label>CEP *</label>
              <input type="text" placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value)} />
            </div>
            <div className="campo">
              <label>Logradouro / Rua *</label>
              <input type="text" placeholder="Rua, Avenida, Praça..." value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
            </div>
          </div>

          <div className="cadastro-completo__linha">
            <div className="campo campo--numero">
              <label>Número *</label>
              <input type="text" placeholder="123" value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div className="campo">
              <label>Complemento</label>
              <input type="text" placeholder="Apto, Sala, Bloco (opcional)" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
            </div>
          </div>

          <div className="cadastro-completo__linha">
            <div className="campo">
              <label>Bairro *</label>
              <input type="text" placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
            </div>
            <div className="campo">
              <label>Cidade *</label>
              <input type="text" placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
            <div className="campo campo--uf">
              <label>UF *</label>
              <input type="text" placeholder="SP" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
          </div>
        </fieldset>

        <div className="campo campo--checkbox">
          <label>
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
            />
            Li e aceito os termos de uso do Dicas LGBT
          </label>
        </div>
      </section>

      <section className={`cadastro-completo__secao ${!liberado ? 'cadastro-completo__secao--bloqueada' : ''}`}>
        <h2>2. Perfil e Identidade</h2>
        <p className="cadastro-completo__lede-secao">Adicione detalhes do seu espaço e conclua o envio.</p>

        <div className="campo">
          <label>Instagram do Espaço</label>
          <input
            type="text"
            placeholder="@seuespaco"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </div>

        <div className="campo">
          <label>Estilo Musical Predominante</label>
          <div className="tag-grid">
            {ESTILOS_MUSICAIS.map((estilo) => (
              <button
                key={estilo}
                type="button"
                className={`tag-chip ${estiloMusical === estilo ? 'tag-chip--marcado' : ''}`}
                onClick={() => setEstiloMusical(estilo)}
              >
                {estilo}
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <label>Descrição (Bio)</label>
          <textarea
            maxLength={500}
            placeholder="Conte um pouco sobre a atmosfera do seu espaço..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div className="campo">
          <label>Foto de Capa do Espaço (Opcional)</label>
          <input
            type="file"
            accept="image/*"
            id="foto-upload"
            className="input-file-hidden"
            onChange={handleFileUpload}
          />
          <label htmlFor="foto-upload" className="btn-upload">
            📸 {nomeArquivo ? `Foto anexada: ${nomeArquivo}` : 'Anexar Foto de Capa'}
          </label>
          {fotoCapa && (
            <div className="preview-container">
              <img src={fotoCapa} alt="Preview da capa" className="preview-foto" />
            </div>
          )}
        </div>

        <div className="campo">
          <label>Público & Vibe</label>
          <div className="tag-grid">
            {TAGS_VIBE.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${tagsVibe.includes(tag) ? 'tag-chip--marcado' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="campo-acao">
          <button
            type="button"
            className="btn-concluir"
            onClick={concluirCadastro}
            disabled={enviando}
          >
            {enviando ? 'Enviando Cadastro...' : 'Concluir Cadastro'}
          </button>
        </div>
      </section>
    </div>
  );
}
