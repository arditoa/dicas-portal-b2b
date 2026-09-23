'use client';

import { ArrowLeft, CheckCircle2, ImagePlus, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { buscarCoordenadas } from '../../../lib/geocodificar';
import { telefoneParecCurto } from '../../../lib/parceiroAuth';
import { erroFotoNaoSuportada, TAMANHO_MAXIMO_FOTO_MB } from '../../../lib/validarFoto';
import { CLASSIFICACOES_LGBT } from '../../../lib/classificacaoLgbt';

// Rodada 49 — pedido direto da Andrea: dar a opção de já subir a foto de
// capa aqui no cadastro público (antes só existia depois de aprovado, via
// /admin ou o portal do parceiro). Sempre foi OPCIONAL — quem não tiver
// foto na mão continua cadastrando normal e adiciona depois.
//
// Desafio técnico: o local ainda NÃO EXISTE no banco no momento da
// escolha da foto (o formulário só faz o insert no submit). A RLS de
// Storage (`fotos_locais_insert_pendente_anonimo`, migration 018) só
// libera o upload pra uma pasta cujo nome seja o ID de um local que já
// existe, pendente e sem dono — e pra ESSE anônimo conseguir ler esse ID
// de volta depois do insert seria preciso passar pela policy de SELECT de
// `locais`, que nunca deixa (mesmo bug que a migration 017 corrigiu pro
// /cadastro/rapido). Em vez de duplicar aquela solução com RPCs novas,
// aproveitei que a coluna `id` só tem DEFAULT (gen_random_uuid()), não é
// "generated always" — ou seja, o cliente pode gerar o UUID e mandar
// junto no insert. Assim: 1) gera o id aqui mesmo (crypto.randomUUID()),
// 2) manda esse id no insert, 3) já com o id em mãos (sem precisar de
// SELECT nenhum), sobe a foto pra `${id}/capa-...` e chama a MESMA RPC
// que o /cadastro/rapido já usa (`cadastro_rapido_definir_foto_local`,
// migration 017) pra gravar foto_capa_url — essa função é genérica (só
// exige status='pendente' e owner_id nulo), não tem nada de "rápido"
// específico nela, então reaproveitar é seguro e não precisa de
// migration nova nenhuma.
function CampoFotoCapa({
  arquivo,
  onSelect,
  disabled,
}: {
  arquivo: File | null;
  onSelect: (f: File | null) => void;
  disabled?: boolean;
}) {
  const preview = arquivo ? URL.createObjectURL(arquivo) : null;
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  return (
    <div>
      <label className={labelClass}>Foto de capa (opcional)</label>
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
              Toque pra escolher a foto que aparece no app
              <br />
              JPG, PNG ou WebP, até {TAMANHO_MAXIMO_FOTO_MB}MB — pode adicionar depois também
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
            if (f.size > TAMANHO_MAXIMO_FOTO_MB * 1024 * 1024) {
              setErroLocal(`Essa imagem passa de ${TAMANHO_MAXIMO_FOTO_MB}MB — escolha uma menor.`);
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

async function enviarFotoCapaLocal(localId: string, arquivo: File): Promise<string> {
  const extensao = arquivo.name.split('.').pop() || 'jpg';
  const caminho = `${localId}/capa-${Date.now()}.${extensao}`;
  const { error } = await supabase.storage.from('fotos-locais').upload(caminho, arquivo, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('fotos-locais').getPublicUrl(caminho);
  return data.publicUrl;
}

// Espelha a taxonomia de categorias do app (src/lib/categorias.ts). "Festas"
// não entra aqui porque no app ela abre a aba de Eventos (agenda), não uma
// categoria de local — pra cadastrar uma festa/evento use /cadastro/evento.
// As categorias sem valor real no enum public.categoria_tipo, e "Serviços"
// (que já tem valor real mas a Andrea decidiu manter fora do app por
// enquanto — mesma decisão refletida no app), aparecem desabilitadas como
// "Em breve".
const CATEGORIAS = [
  { value: 'lugares', label: 'Bares', disabled: false },
  { value: 'gastronomia', label: 'Gastronomia', disabled: false },
  { value: 'cultura', label: 'Cultura', disabled: false },
  { value: 'turismo', label: 'Turismo / Agências de turismo', disabled: false },
  { value: 'beleza', label: 'Beleza', disabled: true },
  { value: 'mais18', label: 'Espaços 18+', disabled: true },
  { value: 'lojas', label: 'Lojas', disabled: true },
  { value: 'servicos', label: 'Serviços', disabled: false },
  { value: 'produtos', label: 'Produtos', disabled: false },
  { value: 'lazer', label: 'Lazer', disabled: true },
] as const;

// Precisam bater com o enum public.publico_tag
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

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const inputClass =
  'w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C] disabled:opacity-60';
const labelClass = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2';

function formatCnpj(digits: string) {
  const d = digits.slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// Rodada 52 — pedido direto da Andrea: CEP automático que preenche o
// endereço, igual o CNPJ já faz (buscarCnpj acima). Máscara "00000-000".
function formatCep(digits: string) {
  const d = digits.slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}

export default function CadastroLocalPage() {
  const [documento, setDocumento] = useState('');
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [cnpjEncontrado, setCnpjEncontrado] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepEncontrado, setCepEncontrado] = useState(false);
  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false);

  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nomeEspaco, setNomeEspaco] = useState('');
  const [nomeVeioDaRazaoSocial, setNomeVeioDaRazaoSocial] = useState(false);
  const [categoria, setCategoria] = useState<string>('');
  const [classificacaoLgbt, setClassificacaoLgbt] = useState<string>('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [publicoTags, setPublicoTags] = useState<string[]>(['todos']);
  const [fotoCapa, setFotoCapa] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const digitsOnly = (v: string) => v.replace(/\D/g, '');

  // Busca CNPJ na BrasilAPI e preenche o endereço automaticamente. É só uma
  // conveniência — se falhar (CNPJ ainda não encontrado, API fora do ar,
  // etc.) o formulário continua funcionando normalmente, com preenchimento manual.
  const buscarCnpj = async (valor: string) => {
    const cnpjLimpo = digitsOnly(valor);
    if (cnpjLimpo.length !== 14) return;

    setBuscandoCnpj(true);
    setCnpjEncontrado(false);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!resp.ok) return;
      const dados = await resp.json();

      if (!nomeEspaco && (dados.nome_fantasia || dados.razao_social)) {
        setNomeEspaco(dados.nome_fantasia || dados.razao_social);
        // BrasilAPI só retorna a razão social (nome jurídico/formal) pra
        // muitos CNPJs pequenos, que nunca registraram nome fantasia. Isso
        // não é o nome que o cliente final conhece — avisamos pra edição.
        setNomeVeioDaRazaoSocial(!dados.nome_fantasia && !!dados.razao_social);
      }
      if (dados.cep) setCep(String(dados.cep));
      if (dados.descricao_tipo_de_logradouro || dados.logradouro) {
        setLogradouro(
          [dados.descricao_tipo_de_logradouro, dados.logradouro].filter(Boolean).join(' ').trim()
        );
      }
      if (dados.numero) setNumero(String(dados.numero));
      if (dados.complemento) setComplemento(String(dados.complemento));
      if (dados.bairro) setBairro(dados.bairro);
      if (dados.municipio) setCidade(dados.municipio);
      if (dados.uf) setUf(dados.uf);
      setCnpjEncontrado(true);
    } catch (err) {
      // Silencioso de propósito — autofill é conveniência, não bloqueio.
      console.warn('Não foi possível buscar o CNPJ na BrasilAPI:', err);
    } finally {
      setBuscandoCnpj(false);
    }
  };

  // Rodada 52 — pedido direto da Andrea: CEP automático que preenche o
  // endereço, igual o CNPJ já faz acima. Usa a ViaCEP (gratuita, sem
  // chave, é a mesma API que a maioria dos sites brasileiros usa pra
  // isso). Só preenche logradouro/bairro/cidade/UF — número e
  // complemento continuam sendo digitados pela pessoa, porque a ViaCEP
  // não sabe o número da casa/sala (às vezes devolve um "complemento"
  // que é só uma faixa de números do próprio CEP, não o complemento de
  // verdade de quem está preenchendo).
  const buscarCep = async (valor: string) => {
    const cepLimpo = digitsOnly(valor);
    setCepEncontrado(false);
    setCepNaoEncontrado(false);
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      if (!resp.ok) return;
      const dados = await resp.json();
      if (dados.erro) {
        setCepNaoEncontrado(true);
        return;
      }
      if (dados.logradouro) setLogradouro(dados.logradouro);
      if (dados.bairro) setBairro(dados.bairro);
      if (dados.localidade) setCidade(dados.localidade);
      if (dados.uf) setUf(dados.uf);
      setCepEncontrado(true);
    } catch (err) {
      // Silencioso de propósito — autofill é conveniência, não bloqueio.
      console.warn('Não foi possível buscar o CEP na ViaCEP:', err);
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!aceitouTermos) {
      setErrorMsg('É preciso aceitar os termos pra continuar.');
      return;
    }
    if (digitsOnly(documento).length < 11) {
      setErrorMsg('CNPJ inválido.');
      return;
    }
    if (!categoria) {
      setErrorMsg('Escolha uma categoria.');
      return;
    }
    if (!classificacaoLgbt) {
      setErrorMsg('Escolha a relação do espaço com a comunidade LGBT+.');
      return;
    }

    setLoading(true);
    try {
      const cnpjLimpo = digitsOnly(documento);

      // Mesma checagem de duplicidade feita no backend — evita dois
      // cadastros com o mesmo CNPJ.
      const { data: existente } = await supabase
        .from('locais')
        .select('id')
        .eq('cnpj', cnpjLimpo)
        .maybeSingle();

      if (existente) {
        setErrorMsg('Já existe um local cadastrado com este CNPJ.');
        setLoading(false);
        return;
      }

      const endereco = `${logradouro}, ${numero}${complemento ? ' - ' + complemento : ''} - ${cidade}/${uf}`;

      // Best-effort: tenta achar lat/lng pelo endereço completo antes de
      // gravar. Nunca bloqueia o cadastro se falhar (ver geocodificar.ts).
      const coordenadas = await buscarCoordenadas(`${endereco}, Brasil`);

      // Rodada 49 — gera o id aqui mesmo (o banco aceitaria de qualquer
      // forma via DEFAULT gen_random_uuid(), isso só antecipa esse valor
      // pro navegador já saber o id sem precisar de nenhum SELECT depois
      // do insert — ver comentário grande acima de CampoFotoCapa).
      // Fallback só pra navegador muito antigo sem crypto.randomUUID —
      // gera um UUID v4 válido "na mão" (a coluna locais.id é do tipo
      // uuid de verdade, não aceita qualquer string).
      const novoId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            });

      const { error } = await supabase.from('locais').insert({
        id: novoId,
        nome: nomeEspaco,
        categoria,
        cnpj: cnpjLimpo,
        bairro,
        cidade,
        endereco,
        lat: coordenadas?.lat ?? null,
        lng: coordenadas?.lng ?? null,
        contato_nome: nomeResponsavel,
        contato_telefone: whatsapp,
        classificacao_lgbt: classificacaoLgbt || null,
        publico_tags: publicoTags.length > 0 ? publicoTags : ['todos'],
        // status / safe_space / plano_destaque / owner_id são forçados pelo
        // trigger enforce_local_seguro_insert no banco — não mandamos aqui.
      });

      if (error) throw error;

      // Foto é opcional e nunca deve travar o cadastro em si — se o
      // upload falhar por qualquer motivo, o local já foi criado
      // normalmente e a foto pode ser adicionada depois (admin ou portal
      // do parceiro), então só avisamos, não bloqueamos a tela de sucesso.
      if (fotoCapa) {
        try {
          const url = await enviarFotoCapaLocal(novoId, fotoCapa);
          await supabase.rpc('cadastro_rapido_definir_foto_local', { p_id: novoId, p_url: url });
        } catch (erroFoto) {
          console.warn('Cadastro criado, mas a foto de capa não subiu:', erroFoto);
        }
      }

      setSucesso(true);
    } catch (err: any) {
      console.error('Erro ao cadastrar local:', err);
      setErrorMsg(err.message || 'Não foi possível enviar o cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-6 text-white">
        <div className="max-w-md text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-bold">Cadastro recebido!</h1>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Vamos analisar as informações do <strong className="text-white">{nomeEspaco}</strong> e
            avisar por WhatsApp quando for aprovado.
          </p>
          <Link href="/" className="inline-block mt-4 text-[#E1306C] hover:underline text-sm font-medium">
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#A0A0B2] hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="mb-6">
          <div className="relative h-14 w-32 mb-4">
            <Image
              src="/logos-dicasapp-semfundo (2).png"
              alt="Dicas LGBT+ Parceiros"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E1306C] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <span className="text-sm text-[#A0A0B2] font-medium">Cadastro de local</span>
          </div>
        </div>
        <h1 className="text-3xl font-black mb-2">Cadastre seu espaço</h1>
        <p className="text-[#A0A0B2] text-sm mb-8">
          Sem login, sem burocracia — preencha os dados abaixo. Depois de aprovado, você recebe um
          convite por WhatsApp pra criar sua conta e gerenciar o perfil completo.
        </p>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Dados do responsável</h2>

            <div>
              <label className={labelClass}>CNPJ</label>
              <input
                type="text"
                required
                value={formatCnpj(digitsOnly(documento))}
                onChange={(e) => setDocumento(digitsOnly(e.target.value))}
                onBlur={(e) => buscarCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className={inputClass}
                disabled={loading}
              />
              {buscandoCnpj && (
                <p className="text-xs text-[#A0A0B2] mt-2 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Buscando dados do CNPJ...
                </p>
              )}
              {cnpjEncontrado && !buscandoCnpj && (
                <p className="text-xs text-emerald-400 mt-2">Endereço preenchido automaticamente — confira antes de enviar.</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome do responsável</label>
                <input
                  type="text"
                  required
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  placeholder="Seu nome completo"
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
          </div>

          <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Dados do espaço</h2>

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
              <p className="text-xs text-[#A0A0B2] mt-2">
                Esse é o nome que os clientes vão ver no app — pode ser diferente da
                razão social do CNPJ. Use o nome que o público já conhece (nome de
                fachada/fantasia).
              </p>
              {nomeVeioDaRazaoSocial && (
                <p className="text-xs text-amber-400 mt-1">
                  Preenchemos com a razão social do CNPJ porque não encontramos um
                  nome fantasia cadastrado — edite acima se o local é conhecido por
                  outro nome.
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

            <div>
              <label className={labelClass}>Relação com a comunidade LGBT+ *</label>
              <div className="flex flex-col gap-2">
                {CLASSIFICACOES_LGBT.map((c) => {
                  const ativo = classificacaoLgbt === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setClassificacaoLgbt(ativo ? '' : c.value)}
                      disabled={loading}
                      className={`text-left px-4 py-3 rounded-xl border transition ${
                        ativo
                          ? 'bg-[#7E57C2]/15 border-[#7E57C2] ring-1 ring-[#7E57C2]'
                          : 'bg-[#161520] border-[#232230] hover:border-[#7E57C2]/50'
                      }`}
                    >
                      <span className={`text-sm font-semibold ${ativo ? 'text-white' : 'text-[#E5E5F0]'}`}>
                        {c.emoji} {c.label}
                      </span>
                      <p className="text-xs text-[#A0A0B2] mt-1 leading-relaxed">{c.descricao}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#626274] mt-2">
                Escolha a opção que melhor descreve o espaço, seguindo a metodologia da Câmara de Comércio LGBT+. Selecione uma — clique de novo pra desmarcar.
              </p>
            </div>

            <CampoFotoCapa arquivo={fotoCapa} onSelect={setFotoCapa} disabled={loading} />

            <div>
              <label className={labelClass}>Predominância de público</label>
              <div className="flex flex-wrap gap-2">
                {PUBLICOS.map((pub) => {
                  const ativo = publicoTags.includes(pub.value);
                  return (
                    <button
                      key={pub.value}
                      type="button"
                      onClick={() => setPublicoTags((prev) => alternarPublico(prev, pub.value))}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        ativo
                          ? 'bg-[#E1306C] border-[#E1306C] text-white'
                          : 'bg-[#161520] border-[#232230] text-[#A0A0B2] hover:border-[#E1306C]/50'
                      }`}
                    >
                      {pub.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#626274] mt-2">
                Selecione um ou mais públicos. Se o espaço é pra todo mundo, deixe só &quot;Todos&quot; marcado.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>CEP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCep(digitsOnly(cep))}
                  onChange={(e) => setCep(digitsOnly(e.target.value))}
                  onBlur={(e) => buscarCep(e.target.value)}
                  placeholder="00000-000"
                  className={inputClass}
                  disabled={loading}
                />
                {buscandoCep && (
                  <p className="text-xs text-[#A0A0B2] mt-2 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando endereço do CEP...
                  </p>
                )}
                {cepEncontrado && !buscandoCep && (
                  <p className="text-xs text-emerald-400 mt-2">Endereço preenchido automaticamente — confira antes de enviar.</p>
                )}
                {cepNaoEncontrado && !buscandoCep && (
                  <p className="text-xs text-amber-400 mt-2">CEP não encontrado — preencha o endereço manualmente.</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Logradouro</label>
                <input
                  type="text"
                  required
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Rua / Avenida"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Número</label>
                <input
                  type="text"
                  required
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Complemento</label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Opcional"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Bairro</label>
                <input
                  type="text"
                  required
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
                  required
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>UF</label>
                <select
                  required
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  <option value="" disabled>
                    --
                  </option>
                  {UFS.map((sigla) => (
                    <option key={sigla} value={sigla}>
                      {sigla}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

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
              <Link href="/termos" target="_blank" className="text-[#E1306C] hover:underline">
                termos de cadastro de parceiro
              </Link>{' '}
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
      </div>
    </div>
  );
}
