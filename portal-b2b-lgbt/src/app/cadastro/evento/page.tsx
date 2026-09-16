'use client';

import { ArrowLeft, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { telefoneParecCurto } from '../../../lib/parceiroAuth';

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
  const [publicoTags, setPublicoTags] = useState<string[]>(['todos']);
  const [nomeContato, setNomeContato] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

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

      const { error } = await supabase.from('eventos').insert({
        titulo,
        descricao: descricaoCompleta,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: dataFim ? new Date(dataFim).toISOString() : null,
        estilos_musicais: estilos,
        publico_tags: publicoTags.length ? publicoTags : ['todos'],
        // Rodada 26 — colunas próprias de contato (015_contato_organizador_
        // eventos.sql), além de continuarem no texto de descricaoCompleta
        // acima (mantido por compatibilidade visual com o que a Andrea já
        // vê no /admin) — agora o aviso automático de aprovação por
        // WhatsApp consegue ler o telefone de um campo de verdade, em vez
        // de tentar extrair de texto livre.
        contato_nome: nomeContato || null,
        contato_whatsapp: whatsapp || null,
        // status / plano_destaque / criado_por são forçados pelo trigger
        // enforce_evento_seguro_insert no banco.
      });

      if (error) throw error;
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
