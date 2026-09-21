'use client';

// Rodada 36 — extraído de /cadastro/rapido pra ser reaproveitado também
// no /onboarding (abas "Local/Comércio" e "Eventos e Festas" com o
// formulário embutido, sem navegar pra outra página — pedido direto da
// Andrea). Todo o miolo (campos, busca de CNPJ, upload de foto, envio via
// RPC) é exatamente o mesmo dos dois lugares; só muda quem decide o
// `tipo` (aqui é sempre uma prop controlada por fora) e o que acontece
// depois de enviar com sucesso (`onSucesso`, decidido por quem usa este
// componente — /cadastro/rapido mostra uma tela cheia; /onboarding
// mostra um cartão inline dentro da própria aba).

import { ImagePlus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { buscarCoordenadas } from '../lib/geocodificar';
import { telefoneParecCurto } from '../lib/parceiroAuth';
import { erroFotoNaoSuportada } from '../lib/validarFoto';

// Mesma taxonomia reduzida de /cadastro/local — ver src/lib/categorias.ts
// (app) pra explicação completa de por que só essas 4 estão habilitadas.
const CATEGORIAS = [
  { value: 'lugares', label: 'Bares', disabled: false },
  { value: 'gastronomia', label: 'Gastronomia', disabled: false },
  { value: 'cultura', label: 'Cultura', disabled: false },
  { value: 'turismo', label: 'Dicas Trip', disabled: false },
  { value: 'beleza', label: 'Beleza', disabled: true },
  { value: 'mais18', label: 'Espaços 18+', disabled: true },
  { value: 'lojas', label: 'Lojas', disabled: true },
  { value: 'servicos', label: 'Serviços', disabled: true },
  { value: 'lazer', label: 'Lazer', disabled: true },
] as const;

// Precisam bater com o enum public.estilo_musical
const ESTILOS = [
  { value: 'funk', label: 'Funk' },
  { value: 'pop_eletronica', label: 'Pop / Eletrônica' },
  { value: 'sertanejo', label: 'Sertanejo' },
  { value: 'drag_cabare', label: 'Drag / Cabaré' },
  { value: 'mpb_samba', label: 'MPB / Samba' },
  { value: 'techno_house', label: 'Techno / House' },
  { value: 'rock', label: 'Rock' },
  { value: 'forro', label: 'Forró' },
] as const;

// Precisam bater com o enum public.publico_tag. Taxonomia revisada (Rodada
// 25) — pensada pra personalizar a descoberta, não pra representar a
// identidade de quem cadastra ou de quem visita.
const PUBLICOS = [
  { value: 'lesbica', label: 'Mulheres lésbicas' },
  { value: 'gay', label: 'Homens gays' },
  { value: 'bi', label: 'Pessoas bissexuais' },
  { value: 'trans', label: 'Pessoas trans e travestis' },
  { value: 'nao_binario', label: 'Pessoas não binárias' },
  { value: 'queer', label: 'Público queer' },
  { value: 'ursos', label: 'Ursos' },
  { value: 'daddy', label: 'Daddys' },
  { value: 'leather', label: 'Leather' },
  { value: 'drag', label: 'Drag' },
  { value: 'misto_lgbt', label: 'Público misto LGBT+' },
  { value: 'aliados', label: 'Espaços frequentados por aliados' },
  { value: 'todos', label: 'Todas as opções' },
] as const;

const TAMANHO_MAXIMO_MB = 5;

const inputClass =
  'w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C] disabled:opacity-60';
const labelClass = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2';
// Rodada 50 — a Andrea reportou o campo de data/hora ilegível na página
// principal do cadastro rápido. O texto digitado já era branco
// (inputClass já tinha text-white), mas o navegador desenha o ícone do
// calendário/relógio e o mini-popup de seleção usando o tema CLARO por
// padrão, sem saber que o fundo ao redor é escuro — ícone escuro em cima
// de fundo escuro, quase invisível. `colorScheme: 'dark'` avisa o
// navegador que esse campo está num contexto escuro, e ele já desenha o
// ícone/popup nativo em branco sozinho (Chrome, Edge, Firefox e Safari
// tratam isso automaticamente, sem precisar de CSS extra por navegador).
const dateInputStyle = { colorScheme: 'dark' } as const;

function toggleValue<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// "todos" ("Todas as opções") funciona como reset — marcá-la limpa as
// outras; marcar qualquer outra tag tira o "todos" (evita a combinação sem
// sentido de "todas as opções" + uma tag específica ao mesmo tempo).
function alternarPublico(atual: string[], valor: string): string[] {
  if (valor === 'todos') return ['todos'];
  const semTodos = atual.filter((v) => v !== 'todos');
  const ligado = semTodos.includes(valor);
  const novo = ligado ? semTodos.filter((v) => v !== valor) : [...semTodos, valor];
  return novo.length > 0 ? novo : ['todos'];
}

function TagButton({
  ativo,
  onClick,
  disabled,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
        ativo
          ? 'bg-[#E1306C] border-[#E1306C] text-white'
          : 'bg-[#161520] border-[#232230] text-[#A0A0B2] hover:border-[#E1306C]/50'
      }`}
    >
      {children}
    </button>
  );
}

function CampoFoto({
  label,
  arquivo,
  onSelect,
  disabled,
}: {
  label: string;
  arquivo: File | null;
  onSelect: (f: File | null) => void;
  disabled?: boolean;
}) {
  const preview = arquivo ? URL.createObjectURL(arquivo) : null;
  // Rodada 49 — antes, um arquivo inválido (HEIC/HEIF ou grande demais)
  // era simplesmente ignorado sem nenhum aviso — quem escolhia a foto
  // achava que tinha funcionado e só ia descobrir que não subiu nada
  // muito depois (ou nunca). Ver validarFoto.ts pro motivo do HEIC.
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <label
        className={`flex items-center gap-3 border border-dashed border-[#232230] rounded-xl p-4 cursor-pointer hover:border-[#E1306C]/50 transition ${
          disabled ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pré-visualização" className="w-14 h-14 rounded-lg object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-[#161520] border border-[#232230] flex items-center justify-center">
            <ImagePlus className="w-5 h-5 text-[#A0A0B2]" />
          </div>
        )}
        <div className="text-xs text-[#A0A0B2]">
          {arquivo ? (
            <span className="text-white">{arquivo.name}</span>
          ) : (
            <>
              Toque pra escolher uma foto (opcional)
              <br />
              JPG, PNG ou WebP, até {TAMANHO_MAXIMO_MB}MB
            </>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setErroLocal(null);
            if (!f) {
              onSelect(null);
              return;
            }
            const erroFormato = erroFotoNaoSuportada(f);
            if (erroFormato) {
              setErroLocal(erroFormato);
              onSelect(null);
              return;
            }
            if (f.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
              setErroLocal(`Essa imagem passa de ${TAMANHO_MAXIMO_MB}MB — escolha uma menor.`);
              onSelect(null);
              return;
            }
            onSelect(f);
          }}
        />
      </label>
      {erroLocal && <p className="text-xs text-red-400 mt-2 leading-relaxed">{erroLocal}</p>}
    </div>
  );
}

async function enviarFoto(bucket: string, id: string, arquivo: File) {
  const extensao = arquivo.name.split('.').pop() || 'jpg';
  const caminho = `${id}/capa-${Date.now()}.${extensao}`;
  const { error } = await supabase.storage.from(bucket).upload(caminho, arquivo, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(caminho);
  return data.publicUrl;
}

// Rodada 32 — pedido da Andrea: já que o formulário pede CNPJ/CPF mesmo
// sendo "rápido", aproveitar pra puxar bairro/cidade automaticamente (e
// sugerir o nome) igual /cadastro/local já faz — só dispara pra CNPJ (14
// dígitos); CPF não tem nada pra buscar na BrasilAPI. Mesma lógica de
// "nome pode ter vindo da razão social" da Rodada 28 (cadastro/local),
// repetida aqui porque agora essa tela também busca na BrasilAPI.
async function buscarDadosCnpjRapido(
  valor: string,
  estado: {
    nomeEspaco: string;
    bairro: string;
    cidade: string;
    setNomeEspaco: (v: string) => void;
    setNomeVeioDaRazaoSocial: (v: boolean) => void;
    setBairro: (v: string) => void;
    setCidade: (v: string) => void;
    setBuscandoCnpj: (v: boolean) => void;
    setCnpjEncontrado: (v: boolean) => void;
  }
) {
  const cnpjLimpo = valor.replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) return;

  estado.setBuscandoCnpj(true);
  estado.setCnpjEncontrado(false);
  try {
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    if (!resp.ok) return;
    const dados = await resp.json();

    if (!estado.nomeEspaco && (dados.nome_fantasia || dados.razao_social)) {
      estado.setNomeEspaco(dados.nome_fantasia || dados.razao_social);
      estado.setNomeVeioDaRazaoSocial(!dados.nome_fantasia && !!dados.razao_social);
    }
    if (!estado.bairro && dados.bairro) estado.setBairro(dados.bairro);
    if (!estado.cidade && dados.municipio) estado.setCidade(dados.municipio);
    estado.setCnpjEncontrado(true);
  } catch (err) {
    // Silencioso de propósito — autofill é conveniência, não bloqueio.
    console.warn('Não foi possível buscar o CNPJ na BrasilAPI:', err);
  } finally {
    estado.setBuscandoCnpj(false);
  }
}

type Props = {
  tipo: 'local' | 'evento';
  onSucesso: (whatsapp: string) => void;
};

export default function FormularioCadastroRapido({ tipo, onSucesso }: Props) {
  // Comuns
  const [whatsapp, setWhatsapp] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Local
  const [nomeEspaco, setNomeEspaco] = useState('');
  const [documento, setDocumento] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [cnpjEncontrado, setCnpjEncontrado] = useState(false);
  const [nomeVeioDaRazaoSocial, setNomeVeioDaRazaoSocial] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [instagram, setInstagram] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [publicoLocal, setPublicoLocal] = useState<string[]>(['todos']);
  const [fotoLocal, setFotoLocal] = useState<File | null>(null);

  // Evento
  const [titulo, setTitulo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [nomeLocalEvento, setNomeLocalEvento] = useState('');
  const [cidadeEvento, setCidadeEvento] = useState('');
  const [nomeContato, setNomeContato] = useState('');
  const [estilos, setEstilos] = useState<string[]>([]);
  const [publicoEvento, setPublicoEvento] = useState<string[]>(['todos']);
  const [fotoEvento, setFotoEvento] = useState<File | null>(null);

  const buscarCnpj = (valor: string) =>
    buscarDadosCnpjRapido(valor, {
      nomeEspaco,
      bairro,
      cidade,
      setNomeEspaco,
      setNomeVeioDaRazaoSocial,
      setBairro,
      setCidade,
      setBuscandoCnpj,
      setCnpjEncontrado,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!aceitouTermos) {
      setErrorMsg('É preciso aceitar os termos pra continuar.');
      return;
    }
    if (!whatsapp.trim()) {
      setErrorMsg('Informe um WhatsApp pra contato.');
      return;
    }

    if (tipo === 'local') {
      const documentoLimpo = documento.replace(/\D/g, '');
      if (!nomeEspaco.trim() || !categoria) {
        setErrorMsg('Preencha o nome do espaço e a categoria.');
        return;
      }
      if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
        setErrorMsg('Informe um CNPJ (14 números) ou CPF (11 números) válido.');
        return;
      }
    } else {
      if (!titulo.trim() || !dataInicio) {
        setErrorMsg('Preencha o título e a data da festa.');
        return;
      }
    }

    setLoading(true);
    try {
      if (tipo === 'local') {
        const documentoLimpo = documento.replace(/\D/g, '');

        // Mesma checagem de duplicidade do /cadastro/local completo — evita
        // dois cadastros pro mesmo negócio (o índice único no banco só
        // cobre CNPJ de 14 dígitos; CPF de 11 não tem índice único parcial
        // ainda, então a checagem aqui é a única linha de defesa pra CPF).
        const { data: existente } = await supabase
          .from('locais')
          .select('id')
          .eq('cnpj', documentoLimpo)
          .maybeSingle();

        if (existente) {
          setErrorMsg('Já existe um cadastro com este CNPJ/CPF.');
          setLoading(false);
          return;
        }

        // Best-effort: aqui só temos bairro/cidade (o cadastro rápido não
        // pede endereço completo) — dá coordenada do CENTRO do bairro, não
        // do endereço exato, mas é bem melhor que nenhuma coordenada
        // nenhuma (o mapa no app hoje não mostra nada sem isso). Nunca
        // bloqueia o cadastro se falhar (ver geocodificar.ts).
        const cidadeFinal = cidade.trim() ? cidade.trim() : 'São Paulo';
        const bairroFinal = bairro.trim() ? bairro.trim() : null;
        const coordenadas = await buscarCoordenadas(
          [bairroFinal, cidadeFinal, 'Brasil'].filter(Boolean).join(', ')
        );

        // RPC em vez de insert().select() direto: evita o erro de RLS
        // "new row violates row-level security policy" que aparece quando
        // o cliente pede o RETURNING de uma linha pendente/anônima (ver
        // supabase-migration/017_fix_returning_rls_cadastro_rapido.sql).
        const { data: novoLocalId, error } = await supabase.rpc('cadastro_rapido_criar_local', {
          p_nome: nomeEspaco,
          p_categoria: categoria,
          p_cnpj: documentoLimpo,
          p_contato_telefone: whatsapp,
          p_instagram: instagram.trim() ? instagram.trim() : null,
          p_bairro: bairroFinal,
          p_cidade: cidadeFinal,
          p_lat: coordenadas?.lat ?? null,
          p_lng: coordenadas?.lng ?? null,
          p_publico_tags: publicoLocal.length > 0 ? publicoLocal : ['todos'],
        });

        if (error) throw error;

        if (fotoLocal && novoLocalId) {
          const url = await enviarFoto('fotos-locais', novoLocalId, fotoLocal);
          await supabase.rpc('cadastro_rapido_definir_foto_local', { p_id: novoLocalId, p_url: url });
        }
      } else {
        const descricaoCompleta = [
          nomeLocalEvento ? `Local: ${nomeLocalEvento}${cidadeEvento ? ' — ' + cidadeEvento : ''}` : cidadeEvento ? `Cidade: ${cidadeEvento}` : '',
          `Contato: ${nomeContato || '(não informado)'} — ${whatsapp}`,
        ]
          .filter(Boolean)
          .join('\n\n');

        // RPC pelo mesmo motivo do bloco de locais acima (017).
        const { data: novoEventoId, error } = await supabase.rpc('cadastro_rapido_criar_evento', {
          p_titulo: titulo,
          p_descricao: descricaoCompleta,
          p_data_inicio: new Date(dataInicio).toISOString(),
          p_estilos_musicais: estilos,
          p_publico_tags: publicoEvento.length > 0 ? publicoEvento : ['todos'],
        });

        if (error) throw error;

        // Rodada 53 — bug real reportado pela Andrea: "as festas de
        // cadastro também têm que ter acesso ao portal". Causa: o RPC
        // acima nunca gravou contato_nome/contato_whatsapp (colunas de
        // verdade, existentes desde a Rodada 26) — só embutia o WhatsApp
        // como texto dentro de `descricao`. `/api/aprovar-evento` só cria
        // login automático pro organizador quando a COLUNA
        // contato_whatsapp está preenchida — sem isso, a aprovação nunca
        // criava conta nenhuma pra quem cadastrou pelo cadastro rápido.
        // Ver 028_contato_evento_cadastro_rapido.sql.
        if (novoEventoId) {
          try {
            await supabase.rpc('cadastro_rapido_definir_contato_evento', {
              p_id: novoEventoId,
              p_contato_nome: nomeContato || null,
              p_contato_whatsapp: whatsapp || null,
            });
          } catch (erroContato) {
            // Não bloqueia o cadastro (o evento já foi criado) — mas sem
            // isso o organizador não ganha acesso automático ao portal na
            // aprovação, então vale investigar se aparecer no console.
            console.warn('Evento criado, mas não foi possível gravar contato para acesso ao portal:', erroContato);
          }
        }

        if (fotoEvento && novoEventoId) {
          const url = await enviarFoto('fotos-eventos', novoEventoId, fotoEvento);
          await supabase.rpc('cadastro_rapido_definir_foto_evento', { p_id: novoEventoId, p_url: url });
        }
      }

      onSucesso(whatsapp);
    } catch (err: any) {
      console.error('Erro no cadastro rápido:', err);
      setErrorMsg(err.message || 'Não foi possível enviar o cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {tipo === 'local' ? (
          <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Sobre o espaço</h2>

            <div>
              <label className={labelClass}>Nome do local (como vai aparecer no app)</label>
              <input
                type="text"
                required
                value={nomeEspaco}
                onChange={(e) => {
                  setNomeEspaco(e.target.value);
                  setNomeVeioDaRazaoSocial(false);
                }}
                placeholder="Ex: Bar Aurora"
                className={inputClass}
                disabled={loading}
              />
              <p className="text-xs text-[#626274] mt-2">
                Pode ser diferente da razão social do CNPJ — use o nome que o público já
                conhece.
              </p>
              {nomeVeioDaRazaoSocial && (
                <p className="text-xs text-amber-400 mt-1">
                  Preenchemos com a razão social do CNPJ porque não encontramos um nome
                  fantasia cadastrado — edite acima se o local é conhecido por outro nome.
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>CNPJ ou CPF</label>
              <input
                type="text"
                required
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                onBlur={(e) => buscarCnpj(e.target.value)}
                placeholder="Só números — CNPJ (14) ou CPF (11)"
                className={inputClass}
                disabled={loading}
              />
              <p className="text-xs text-[#626274] mt-1">
                Ainda não tem CNPJ? Pode usar seu CPF por enquanto.
              </p>
              {buscandoCnpj && (
                <p className="text-xs text-[#A0A0B2] mt-2 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Buscando dados do CNPJ...
                </p>
              )}
              {cnpjEncontrado && !buscandoCnpj && (
                <p className="text-xs text-emerald-400 mt-2">
                  Nome e endereço preenchidos automaticamente — confira antes de enviar.
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Categoria</label>
              <select
                required
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className={inputClass}
                disabled={loading}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value} disabled={c.disabled}>
                    {c.label}
                    {c.disabled ? ' (Em breve)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Instagram</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@seuespaco"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className={inputClass}
                  disabled={loading}
                />
                {telefoneParecCurto(whatsapp) && (
                  <p className="text-xs text-amber-400 mt-2">
                    Esse número parece incompleto — confere se o DDD está incluído?
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bairro</label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Cidade</label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="São Paulo"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Predominância de público</label>
              <div className="flex flex-wrap gap-2">
                {PUBLICOS.map((p) => (
                  <TagButton
                    key={p.value}
                    ativo={publicoLocal.includes(p.value)}
                    onClick={() => setPublicoLocal((prev) => alternarPublico(prev, p.value))}
                    disabled={loading}
                  >
                    {p.label}
                  </TagButton>
                ))}
              </div>
            </div>

            <CampoFoto label="Foto do espaço" arquivo={fotoLocal} onSelect={setFotoLocal} disabled={loading} />
          </div>
        ) : (
          <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Sobre a festa</h2>

            <div>
              <label className={labelClass}>Nome da festa</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Noite Aurora"
                className={inputClass}
                disabled={loading}
              />
            </div>

            <div>
              <label className={labelClass}>Data e horário</label>
              <input
                type="datetime-local"
                required
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className={inputClass}
                style={dateInputStyle}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Onde vai ser</label>
                <input
                  type="text"
                  value={nomeLocalEvento}
                  onChange={(e) => setNomeLocalEvento(e.target.value)}
                  placeholder="Nome do local ou endereço"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Cidade</label>
                <input
                  type="text"
                  value={cidadeEvento}
                  onChange={(e) => setCidadeEvento(e.target.value)}
                  placeholder="São Paulo"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Seu nome</label>
                <input
                  type="text"
                  value={nomeContato}
                  onChange={(e) => setNomeContato(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className={inputClass}
                  disabled={loading}
                />
                {telefoneParecCurto(whatsapp) && (
                  <p className="text-xs text-amber-400 mt-2">
                    Esse número parece incompleto — confere se o DDD está incluído?
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Estilo musical</label>
              <div className="flex flex-wrap gap-2">
                {ESTILOS.map((es) => (
                  <TagButton
                    key={es.value}
                    ativo={estilos.includes(es.value)}
                    onClick={() => setEstilos((prev) => toggleValue(prev, es.value))}
                    disabled={loading}
                  >
                    {es.label}
                  </TagButton>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Predominância de público</label>
              <div className="flex flex-wrap gap-2">
                {PUBLICOS.map((p) => (
                  <TagButton
                    key={p.value}
                    ativo={publicoEvento.includes(p.value)}
                    onClick={() => setPublicoEvento((prev) => alternarPublico(prev, p.value))}
                    disabled={loading}
                  >
                    {p.label}
                  </TagButton>
                ))}
              </div>
            </div>

            <CampoFoto label="Arte da festa" arquivo={fotoEvento} onSelect={setFotoEvento} disabled={loading} />
          </div>
        )}

        <label className="flex items-start gap-3 text-sm text-[#A0A0B2] cursor-pointer">
          <input
            type="checkbox"
            checked={aceitouTermos}
            onChange={(e) => setAceitouTermos(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-[#232230] bg-[#161520] accent-[#E1306C]"
            disabled={loading}
          />
          <span>
            Li e aceito os{' '}
            <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-[#E1306C] hover:underline">
              termos de cadastro de parceiro
            </a>{' '}
            e autorizo o contato por WhatsApp sobre a análise do meu cadastro.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Enviando...' : 'Enviar cadastro'}
        </button>
      </form>
    </>
  );
}
