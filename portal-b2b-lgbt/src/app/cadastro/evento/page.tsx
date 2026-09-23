'use client';

import { ArrowLeft, Calendar, CheckCircle2, ImagePlus, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { telefoneParecCurto } from '../../../lib/parceiroAuth';
import { erroFotoNaoSuportada, TAMANHO_MAXIMO_FOTO_MB } from '../../../lib/validarFoto';
import { CLASSIFICACOES_LGBT } from '../../../lib/classificacaoLgbt';

// Rodada 49 — pedido direto da Andrea: dar a opção de já subir o flier
// aqui no cadastro público (antes só existia depois de aprovado, via
// /admin ou dashboard/eventos do parceiro). Opcional, mesma lógica e
// mesmo motivo técnico de CampoFotoCapa em /cadastro/local — ver o
// comentário grande lá pra explicação completa (gerar o id no navegador
// pra não precisar de SELECT depois do insert anônimo, e reaproveitar a
// RPC genérica cadastro_rapido_definir_foto_evento sem migration nova).
function CampoFlier({
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
      <label className={labelClass}>Flier / arte do evento (opcional)</label>
      <label
        className={`flex items-center gap-3 border border-dashed border-[#232230] rounded-xl p-4 cursor-pointer hover:border-purple-500/50 transition ${
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
              Toque pra escolher a arte que aparece no app
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

async function enviarFlierEvento(eventoId: string, arquivo: File): Promise<string> {
  const extensao = arquivo.name.split('.').pop() || 'jpg';
  const caminho = `${eventoId}/flier-${Date.now()}.${extensao}`;
  const { error } = await supabase.storage.from('fotos-eventos').upload(caminho, arquivo, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('fotos-eventos').getPublicUrl(caminho);
  return data.publicUrl;
}

// Precisam bater com o enum public.estilo_musical (001_migrar_para_locais.sql)
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

const inputClass =
  'w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-60';
const labelClass = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2';

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

export default function CadastroEventoPage() {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [nomeLocal, setNomeLocal] = useState('');
  const [cidade, setCidade] = useState('');
  const [estilos, setEstilos] = useState<string[]>([]);
  const [classificacaoLgbt, setClassificacaoLgbt] = useState<string>('');
  const [publicoTags, setPublicoTags] = useState<string[]>(['todos']);
  const [nomeContato, setNomeContato] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [flier, setFlier] = useState<File | null>(null);
  // Rodada 59 (parte 7) — Andrea pediu pra já oferecer a opção de Lista
  // VIP aqui no cadastro público, em vez de só depois no dashboard (ver
  // migration 031, trigger criar_lista_vip_ao_aprovar_evento).
  const [querListaVip, setQuerListaVip] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!titulo.trim() || !dataInicio) {
      setErrorMsg('Preencha o título e a data do evento.');
      return;
    }

    setLoading(true);
    try {
      // Descrição carrega os dados de contato/local — a Etapa 1 (esta) não
      // exige login; a Etapa 2, depois de aprovado, é feita já autenticado
      // e pode editar tudo em detalhe.
      const descricaoCompleta = [
        descricao,
        nomeLocal ? `Local: ${nomeLocal}${cidade ? ' — ' + cidade : ''}` : cidade ? `Cidade: ${cidade}` : '',
        `Contato: ${nomeContato} — ${whatsapp}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      // Rodada 49 — mesmo raciocínio de /cadastro/local: gera o id aqui
      // pra poder subir o flier (se ela escolher um) sem precisar de
      // nenhum SELECT depois do insert anônimo. Ver comentário grande em
      // CampoFlier/enviarFlierEvento acima.
      // Fallback só pra navegador muito antigo sem crypto.randomUUID —
      // gera um UUID v4 válido "na mão" (a coluna eventos.id é do tipo
      // uuid de verdade, não aceita qualquer string).
      const novoId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            });

      const { error } = await supabase.from('eventos').insert({
        id: novoId,
        titulo,
        descricao: descricaoCompleta,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: dataFim ? new Date(dataFim).toISOString() : null,
        estilos_musicais: estilos,
        classificacao_lgbt: classificacaoLgbt || null,
        publico_tags: publicoTags.length ? publicoTags : ['todos'],
        // Rodada 26 — colunas próprias de contato (015_contato_organizador_
        // eventos.sql), além de continuarem no texto de descricaoCompleta
        // acima (mantido por compatibilidade visual com o que a Andrea já
        // vê no /admin) — agora o aviso automático de aprovação por
        // WhatsApp consegue ler o telefone de um campo de verdade, em vez
        // de tentar extrair de texto livre.
        contato_nome: nomeContato || null,
        contato_whatsapp: whatsapp || null,
        // Rodada 59 (parte 7) — se marcado, a Lista VIP já nasce criada
        // sozinha quando o evento for aprovado (ver migration 031).
        quer_lista_vip: querListaVip,
        // status / plano_destaque / criado_por são forçados pelo trigger
        // enforce_evento_seguro_insert no banco.
      });

      if (error) throw error;

      // Flier é opcional e nunca deve travar o cadastro — se o upload
      // falhar, o evento já foi criado normalmente e o flier pode ser
      // adicionado depois (admin ou dashboard/eventos do parceiro).
      if (flier) {
        try {
          const url = await enviarFlierEvento(novoId, flier);
          await supabase.rpc('cadastro_rapido_definir_foto_evento', { p_id: novoId, p_url: url });
        } catch (erroFlier) {
          console.warn('Evento criado, mas o flier não subiu:', erroFlier);
        }
      }

      setSucesso(true);
    } catch (err: any) {
      console.error('Erro ao cadastrar evento:', err);
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
          <h1 className="text-2xl font-bold">Evento recebido!</h1>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            Vamos analisar <strong className="text-white">{titulo}</strong> e avisar por WhatsApp
            quando for aprovado.
          </p>
          <p className="text-[#A0A0B2] text-sm leading-relaxed">
            {querListaVip ? (
              <>
                Sua <strong className="text-white">Lista VIP</strong> já vai nascer aberta assim que o
                evento for aprovado — você acompanha e aprova quem pede entrada direto no portal do
                parceiro, em &quot;Meus eventos&quot;.
              </>
            ) : (
              <>
                Depois de aprovado, você pode abrir uma <strong className="text-white">Lista VIP</strong>{' '}
                pra este evento direto no portal do parceiro, em &quot;Meus eventos&quot;.
              </>
            )}
          </p>
          <Link href="/" className="inline-block mt-4 text-purple-400 hover:underline text-sm font-medium">
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
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-[#A0A0B2] font-medium">Cadastro de evento</span>
          </div>
        </div>
        <h1 className="text-3xl font-black mb-2">Divulgue seu evento</h1>
        <p className="text-[#A0A0B2] text-sm mb-8">
          Sem login, sem mensalidade — conte pra gente o que vai rolar. Depois de aprovado, você
          recebe um convite por WhatsApp pra completar os detalhes (foto de capa, ingressos etc).
        </p>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Sobre o evento</h2>

            <div>
              <label className={labelClass}>Título do evento</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Festa Aurora — Edição Verão"
                className={inputClass}
                disabled={loading}
              />
            </div>

            <div>
              <label className={labelClass}>Descrição</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Conte um pouco sobre a festa/evento"
                rows={3}
                className={inputClass}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Data e hora de início</label>
                <input
                  type="datetime-local"
                  required
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className={inputClass}
                  style={{ colorScheme: 'dark' }}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Data e hora de término</label>
                <input
                  type="datetime-local"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className={inputClass}
                  style={{ colorScheme: 'dark' }}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Local (se já souber)</label>
                <input
                  type="text"
                  value={nomeLocal}
                  onChange={(e) => setNomeLocal(e.target.value)}
                  placeholder="Nome do espaço"
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
            </div>

            <CampoFlier arquivo={flier} onSelect={setFlier} disabled={loading} />

            <div>
              <label className={labelClass}>Relação com a comunidade LGBT+ (opcional)</label>
              <div className="flex flex-wrap gap-2">
                {CLASSIFICACOES_LGBT.map((c) => {
                  const ativo = classificacaoLgbt === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setClassificacaoLgbt(ativo ? '' : c.value)}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        ativo
                          ? 'bg-[#7E57C2] border-[#7E57C2] text-white'
                          : 'bg-[#161520] border-[#232230] text-[#A0A0B2] hover:border-[#7E57C2]/50'
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#626274] mt-2">
                Escolha a opção que melhor descreve o evento, seguindo a metodologia da Câmara de Comércio LGBT+. Selecione no máximo uma — clique de novo pra desmarcar.
              </p>
            </div>

            <div>
              <label className={labelClass}>Estilo musical</label>
              <div className="flex flex-wrap gap-2">
                {ESTILOS.map((estilo) => (
                  <button
                    key={estilo.value}
                    type="button"
                    onClick={() => setEstilos((prev) => toggleValue(prev, estilo.value))}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      estilos.includes(estilo.value)
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-transparent border-[#232230] text-[#A0A0B2] hover:border-purple-500/50'
                    }`}
                  >
                    {estilo.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Público</label>
              <div className="flex flex-wrap gap-2">
                {PUBLICOS.map((publico) => (
                  <button
                    key={publico.value}
                    type="button"
                    onClick={() => setPublicoTags((prev) => alternarPublico(prev, publico.value))}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      publicoTags.includes(publico.value)
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-transparent border-[#232230] text-[#A0A0B2] hover:border-purple-500/50'
                    }`}
                  >
                    {publico.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Contato do organizador</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome</label>
                <input
                  type="text"
                  required
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
          </div>

          <div className="bg-[#12121A] border border-[#232230] rounded-2xl p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={querListaVip}
                onChange={(e) => setQuerListaVip(e.target.checked)}
                disabled={loading}
                className="mt-0.5 w-4 h-4 accent-purple-600"
              />
              <span>
                <span className="block text-sm font-bold text-white">Quero abrir Lista VIP para este evento</span>
                <span className="block text-xs text-[#A0A0B2] mt-1 leading-relaxed">
                  Assim que o evento for aprovado, a Lista VIP já é criada automaticamente — você não
                  precisa voltar aqui depois. Dá pra ajustar vagas e aprovar convidados pelo portal do
                  parceiro em qualquer momento.
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Enviando...' : 'Enviar evento'}
          </button>
        </form>
      </div>
    </div>
  );
}
