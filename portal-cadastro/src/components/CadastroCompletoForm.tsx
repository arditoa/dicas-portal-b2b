import { useState, useEffect } from 'react';
import './CadastroCompletoForm.css';
import { formatarDocumento, apenasDigitos } from '../lib/documento';
import { formatarWhatsApp } from '../lib/whatsapp';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fyisfucgzpdwupjterlh.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qSAiGoo7ZEG0IboqClunQ_NyJ80';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

export function CadastroCompletoForm() {
  const [doc, setDoc] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nomeEspaco, setNomeEspaco] = useState('');
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

  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);

  const [bio, setBio] = useState('');
  const [fotoCapa, setFotoCapa] = useState('');
  const [tagsVibe, setTagsVibe] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [carregandoCnpj, setCarregandoCnpj] = useState(false);

  useEffect(() => {
    const limpo = apenasDigitos(doc);
    if (limpo.length === 14) {
      setCarregandoCnpj(true);
      fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.nome_fantasia || data.razao_social) {
            setNomeEspaco(data.nome_fantasia || data.razao_social);
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
      salvarRascunho();
    }
  };

  const salvarRascunho = async () => {
    setStatusMsg('Salvando rascunho...');
    const tempPartnerId = partnerId || `temp-partner-${Date.now()}`;
    const tempVenueId = venueId || `temp-venue-${Date.now()}`;

    try {
      const { data: partner } = await supabase
        .from('partners')
        .insert({
          nome_responsavel: nomeResponsavel || 'Não informado',
          cpf_ou_cnpj: apenasDigitos(doc) || '00000000000',
          whatsapp_comercial: apenasDigitos(whatsapp) || '00000000000',
          status: 'rascunho'
        })
        .select()
        .single();

      if (partner) {
        setPartnerId(partner.id);
        const enderecoFormatado = `${logradouro || 'Endereço'}, ${numero || 'S/N'}${complemento ? ' - ' + complemento : ''}, ${bairro} - ${cidade}/${uf}`;
        const { data: venue } = await supabase
          .from('venues')
          .insert({
            partner_id: partner.id,
            nome: nomeEspaco || 'Espaço',
            categoria,
            endereco: enderecoFormatado,
            cidade: cidade || 'São Paulo',
            uf: uf || 'SP'
          })
          .select()
          .single();

        if (venue) setVenueId(venue.id);
        else setVenueId(tempVenueId);
      } else {
        setPartnerId(tempPartnerId);
        setVenueId(tempVenueId);
      }
      setStatusMsg('Rascunho salvo! Continue preenchendo o perfil abaixo.');
    } catch {
      setPartnerId(tempPartnerId);
      setVenueId(tempVenueId);
      setStatusMsg('Continue preenchendo o perfil abaixo.');
    }
  };

  useEffect(() => {
    if (liberado && fotoCapa && tagsVibe.length > 0) {
      promoverParaPendente();
    }
  }, [fotoCapa, tagsVibe]);

  const promoverParaPendente = async () => {
    if (partnerId && !partnerId.startsWith('temp-')) {
      await supabase.from('venues').update({ bio, foto_capa: fotoCapa, tags_publico_vibe: tagsVibe }).eq('id', venueId);
      await supabase.from('partners').update({ status: 'pendente' }).eq('id', partnerId);
    }
    setStatusMsg('🎉 Perfil enviado automaticamente para moderação!');
  };

  const toggleTag = (tag: string) => {
    setTagsVibe((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

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
          <label>Nome do Espaço *</label>
          <input
            type="text"
            placeholder="Ex: Bar da Esquina"
            value={nomeEspaco}
            onChange={(e) => setNomeEspaco(e.target.value)}
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
        <p className="cadastro-completo__lede-secao">Adicione a foto de capa e ao menos 1 tag para entrar na fila de aprovação.</p>

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
          <label>URL da Foto de Capa *</label>
          <input
            type="text"
            placeholder="https://exemplo.com/sua-foto.jpg"
            value={fotoCapa}
            onChange={(e) => setFotoCapa(e.target.value)}
          />
        </div>

        <div className="campo">
          <label>Público & Vibe *</label>
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
      </section>
    </div>
  );
}
