import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { apenasDigitos, formatarDocumento } from '../lib/documento';
import { formatarWhatsApp } from '../lib/whatsapp';
import './CadastroCompletoForm.css';

const WHATSAPP_SUPORTE = '5511942922028';

// Categorias Principais (Sincronizadas)
const CATEGORIAS_B2B = [
  'Bares & Vida Noturna',
  'Gastronomia',
  'Festas & Eventos',
  'Cultura & Lazer',
  'Dicas Trip (Turismo)',
  'Beleza',
  'Espaços 18+',
  'Lojas',
  'Serviços',
  'Lazer'
];

// Subcategorias Atualizadas
const SUBCATEGORIAS_B2B: Record<string, string[]> = {
  'Bares & Vida Noturna': ['Música ao vivo', 'Rooftops', 'Karaokês', 'Happy Hours', 'Parklet'],
  'Gastronomia': ['Restaurantes', 'Cafés', 'Padarias', 'Hamburguerias', 'Docerias', 'Vegano'],
  'Festas & Eventos': ['Baladas', 'Festivais', 'Open Bar', 'Drag Shows', 'Sunsets'],
  'Cultura & Lazer': ['Teatros', 'Centros Culturais', 'Cinemas', 'Exposições', 'Museus'],
  'Dicas Trip (Turismo)': ['Hotéis', 'Pousadas', 'Roteiros Guiados', 'Pontos Turísticos']
};

// Preset de Experiências & Infraestrutura
const EXPERIENCIAS_PRESET = [
  'Date', 'Rolê com amigos', 'Dançar', 'Música ao vivo', 'Karaokê',
  'Drag show', 'Comer bem', 'Happy hour', 'Relaxar', 'Conhecer pessoas',
  'Passear', 'Aniversário', 'Aula de dança', 'Aula de forró',
  'Acessível PCD', 'Pet Friendly', 'Wi-Fi Grátis', 'Estacionamento'
];

export function CadastroCompletoForm() {
  const [doc, setDoc] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nomeEspaco, setNomeEspaco] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');

  // Taxonomia Sincronizada
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [liberado, setLiberado] = useState(false);
  const [modalTermosAberto, setModalTermosAberto] = useState(false);

  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [fotoCapa, setFotoCapa] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [carregandoCnpj, setCarregandoCnpj] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucessoConcluido, setSucessoConcluido] = useState(false);

  const [partnerIdCriado, setPartnerIdCriado] = useState<string | null>(null);

  // Consulta CNPJ Automática
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

  // Consulta CEP Automática
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
    setLiberado(checked);
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

  const toggleTag = (tag: string) => {
    setTagsSelecionadas((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleAddCustomTag = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    const formatted = customTagInput.trim();
    if (formatted && !tagsSelecionadas.includes(formatted)) {
      setTagsSelecionadas((prev) => [...prev, formatted]);
      setCustomTagInput('');
    }
  };

  const concluirCadastro = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!aceitouTermos) {
      alert('Por favor, aceite os Termos de Adesão B2B e Política de Privacidade antes de continuar.');
      return;
    }

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

        if (pErr) throw new Error(`Erro ao criar parceiro: ${pErr.message}`);

        currentPartnerId = partner.id;
        setPartnerIdCriado(partner.id);
      }

      const enderecoFormatado = `${logradouro || 'Endereço'}, ${numero || 'S/N'}${complemento ? ' - ' + complemento : ''}, ${bairro} - ${cidade}/${uf}`;
      
      const { error: vErr } = await supabase
        .from('venues')
        .insert({
          partner_id: currentPartnerId,
          nome: nomeEspaco || nomeFantasia || 'Espaço sem nome',
          categoria: categoria || null,
          subcategoria: subcategoria || null,
          endereco: enderecoFormatado,
          bio,
          instagram,
          foto_capa: fotoCapa || null,
          tags: tagsSelecionadas
        });

      if (vErr) throw new Error(`Erro ao criar local: ${vErr.message}`);

      setSucessoConcluido(true);
    } catch (err: any) {
      console.error('Erro de Envio Final:', err);
      alert(err?.message || 'Ocorreu um erro ao gravar os dados.');
    } finally {
      setEnviando(false);
    }
  };

  const abrirWhatsappSuporte = (opcao?: string) => {
    let msgTexto = "Olá! Vim pelo portal Dicas LGBT+.\n\n1️⃣ Quero cadastrar meu local\n2️⃣ Tenho dúvida no cadastro\n3️⃣ Quero falar com atendente";
    if (opcao) {
      msgTexto = `Olá! Vim pelo portal Dicas LGBT+.\n\nOpção escolhida: ${opcao}`;
    }
    const msg = encodeURIComponent(msgTexto);
    window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${msg}`, '_blank');
  };

  if (sucessoConcluido) {
    return (
      <div className="cadastro-completo" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#FFFFFF' }}>Cadastro Enviado para Moderação!</h1>
        <p style={{ color: '#94A3B8', marginTop: '12px', fontSize: '16px', maxWidth: '480px', margin: '12px auto 0' }}>
          Obrigado por registrar seu espaço. Nossa equipe revisará o perfil em breve e ativará o local no aplicativo Dicas LGBT+.
        </p>
        <button
          type="button"
          onClick={() => abrirWhatsappSuporte('Cadastro Concluído - Aguardando Ativação')}
          style={{ marginTop: '28px', backgroundColor: '#25D366', color: '#FFF', border: 'none', padding: '14px 28px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}
        >
          💬 Falar no WhatsApp Oficial
        </button>
      </div>
    );
  }

  return (
    <>
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
            DICAS <span>PARCEIROS</span>
          </div>
        </div>
      </header>

      <div className="cadastro-completo">
        <div className="cadastro-completo__cabecalho">
          <h1>Cadastre seu espaço no Dicas LGBT+</h1>
          <p>Seja visto por milhares de clientes na maior plataforma de locais e roteiros inclusivos.</p>
          {statusMsg && <div style={{ color: '#C084FC', marginTop: '12px', fontWeight: '600' }}>{statusMsg}</div>}
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
            {carregandoCnpj && <p style={{ fontSize: '12px', color: '#A855F7', marginTop: '6px' }}>Buscando dados do CNPJ...</p>}
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

          <fieldset className="cadastro-completo__endereco">
            <legend>Endereço</legend>
            <div className="cadastro-completo__linha">
              <div className="campo" style={{ flex: '0 0 120px' }}>
                <label>CEP *</label>
                <input type="text" placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value)} />
              </div>
              <div className="campo" style={{ flex: 1 }}>
                <label>Logradouro / Rua *</label>
                <input type="text" placeholder="Rua, Avenida, Praça..." value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
              </div>
            </div>

            <div className="cadastro-completo__linha">
              <div className="campo" style={{ flex: '0 0 100px' }}>
                <label>Número *</label>
                <input type="text" placeholder="123" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div className="campo" style={{ flex: 1 }}>
                <label>Complemento</label>
                <input type="text" placeholder="Apto, Sala, Bloco (opcional)" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              </div>
            </div>

            <div className="cadastro-completo__linha">
              <div className="campo" style={{ flex: 1 }}>
                <label>Bairro *</label>
                <input type="text" placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
              <div className="campo" style={{ flex: 1 }}>
                <label>Cidade *</label>
                <input type="text" placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="campo" style={{ flex: '0 0 70px' }}>
                <label>UF *</label>
                <input type="text" placeholder="SP" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
              </div>
            </div>
          </fieldset>

          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <input
                type="checkbox"
                style={{ marginTop: '4px', accentColor: '#A855F7' }}
                checked={aceitouTermos}
                onChange={(e) => handleCheckboxChange(e.target.checked)}
              />
              <span style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5' }}>
                Declaro que sou representante legal/autorizado do estabelecimento e <strong>aceito integralmente os</strong>{' '}
                <button
                  type="button"
                  onClick={() => setModalTermosAberto(true)}
                  style={{ background: 'none', border: 'none', color: '#C084FC', textDecoration: 'underline', padding: 0, font: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Termos de Adesão B2B e Política de Privacidade (LGPD)
                </button>
                .
              </span>
            </label>
          </div>
        </section>

        <section className={`cadastro-completo__secao ${!liberado ? 'cadastro-completo__secao--bloqueada' : ''}`}>
          <h2>2. Categorias, Subcategorias & Tags (Opcional)</h2>
          <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '-12px', marginBottom: '20px' }}>
            Selecione as categorias correspondentes e crie tags customizadas para o seu perfil.
          </p>

          {/* Seleção de Categoria Principal */}
          <div className="campo">
            <label>Categoria Principal</label>
            <div className="tag-grid">
              {CATEGORIAS_B2B.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`tag-chip ${categoria === cat ? 'tag-chip--marcado' : ''}`}
                  onClick={() => {
                    setCategoria(categoria === cat ? '' : cat);
                    setSubcategoria('');
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategoria Dinâmica */}
          {categoria && SUBCATEGORIAS_B2B[categoria] && (
            <div className="campo">
              <label>Subcategoria de {categoria}</label>
              <div className="tag-grid">
                {SUBCATEGORIAS_B2B[categoria].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    className={`tag-chip ${subcategoria === sub ? 'tag-chip--marcado' : ''}`}
                    onClick={() => setSubcategoria(subcategoria === sub ? '' : sub)}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags Preset */}
          <div className="campo">
            <label>Diferenciais & Infraestrutura</label>
            <div className="tag-grid">
              {EXPERIENCIAS_PRESET.map((exp) => (
                <button
                  key={exp}
                  type="button"
                  className={`tag-chip ${tagsSelecionadas.includes(exp) ? 'tag-chip--marcado' : ''}`}
                  onClick={() => toggleTag(exp)}
                >
                  {exp}
                </button>
              ))}
            </div>
          </div>

          {/* Criar Tags Customizadas */}
          <div className="campo">
            <label>Adicionar Tag Personalizada</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ex: Open Bar de Chope Artesanal..."
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag(e)}
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                style={{ backgroundColor: '#A855F7', color: '#FFF', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + Criar
              </button>
            </div>
          </div>

          {/* Tags Escolhidas */}
          {tagsSelecionadas.length > 0 && (
            <div className="campo" style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Tags selecionadas para este espaço:</label>
              <div className="tag-grid">
                {tagsSelecionadas.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tag-chip tag-chip--marcado"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag} ✕
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="campo" style={{ marginTop: '20px' }}>
            <label>Instagram do Espaço</label>
            <input
              type="text"
              placeholder="@seuespaco"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
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
              <div style={{ marginTop: '12px' }}>
                <img src={fotoCapa} alt="Preview da capa" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px' }} />
              </div>
            )}
          </div>

          <div style={{ marginTop: '32px' }}>
            <button
              type="button"
              className="btn-concluir"
              onClick={concluirCadastro}
              disabled={enviando}
            >
              {enviando ? 'Enviando Cadastro...' : 'Concluir Cadastro'}
            </button>
          </div>

          <div className="selo-seguranca">
            🔒 Dados protegidos por criptografia de ponta a ponta e em conformidade com a LGPD.
          </div>
        </section>

        <button
          type="button"
          onClick={() => abrirWhatsappSuporte()}
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
          💬 Atendimento WhatsApp
        </button>

        {modalTermosAberto && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
            <div style={{ backgroundColor: '#181420', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '20px', maxWidth: '600px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#FFFFFF' }}>Termos de Adesão B2B e Privacidade</h3>
                <button onClick={() => setModalTermosAberto(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
              </div>
              
              <div style={{ padding: '20px', overflowY: 'auto', fontSize: '13px', color: '#CBD5E1', lineHeight: '1.6' }}>
                <h4 style={{ color: '#C084FC', marginTop: 0 }}>1. Objeto e Natureza da Parceria</h4>
                <p>O presente instrumento rege a adesão e inclusão voluntária do estabelecimento parceiro na plataforma Dicas LGBT+. O cadastro concede direito não exclusivo para divulgação comercial do espaço e de suas atrações aos usuários do aplicativo mobile.</p>

                <h4 style={{ color: '#C084FC' }}>2. Veracidade e Representação Legal</h4>
                <p>O declarante afirma, sob as penas da lei (Código Penal, art. 299), que possui plenos poderes para atuar em nome do estabelecimento comercial cadastrado e que todas as informações prestadas são autênticas e precisas.</p>

                <h4 style={{ color: '#C084FC' }}>3. Licença de Uso de Marca, Foto e Conteúdo</h4>
                <p>O Parceiro concede à plataforma Dicas LGBT+ licença gratuita, não exclusiva e de âmbito territorial nacional para exibição, reprodução e divulgação do nome comercial, fotos, logotipos, descrições e links de redes sociais anexados ao cadastro, estritamente para promoção do estabelecimento no ecossistema.</p>

                <h4 style={{ color: '#C084FC' }}>4. Conformidade com a LGPD (Lei nº 13.709/2018)</h4>
                <p>Os dados pessoais do responsável legal (nome, CPF, WhatsApp comercial) são coletados para a finalidade de execução de contrato/termo e verificação de segurança (Art. 7º, V da LGPD). Os dados do estabelecimento serão exibidos publicamente para viabilizar o direcionamento de clientes.</p>

                <h4 style={{ color: '#C084FC' }}>5. Moderação e Cancelamento</h4>
                <p>A Dicas LGBT+ reserva-se o direito de moderar, suspender ou remover perfis que descumpram as diretrizes da plataforma ou que promovam discursos de ódio, discriminação ou ilegalidades. O parceiro poderá solicitar a exclusão de seu cadastro a qualquer momento via canal oficial de atendimento.</p>
              </div>

              <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => {
                    setAceitouTermos(true);
                    setLiberado(true);
                    setModalTermosAberto(false);
                  }}
                  style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #C084FC 100%)', color: '#FFF', border: 'none', padding: '12px 28px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Li e Concordo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}