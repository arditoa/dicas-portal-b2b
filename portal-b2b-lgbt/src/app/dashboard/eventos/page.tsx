'use client';
import { ArrowLeft, Calendar, Loader2, Save, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Rodada 36 — pedido direto da Andrea: organizador de evento/festa
// (aprovado com login automático via /api/aprovar-evento, ver
// admin/page.tsx) também precisa conseguir editar data, descrição e foto
// da própria festa, sem precisar da Andrea pra isso — igual o dono de
// local já pode em /dashboard/perfil desde a Rodada 22/23.
//
// Usa a RPC `meus_eventos_gerenciaveis()` (020_horario_funcionamento_...sql)
// em vez de um `.select()` direto -- ela já cobre os dois jeitos de
// "gerenciar" um evento (criado_por = eu, OU dono do local da festa =
// eu), então esta tela funciona tanto pro organizador independente
// quanto pro dono de local que quer editar a festa do próprio bar, sem
// duplicar lógica de permissão aqui.

const TAMANHO_MAXIMO_MB = 5;

type EventoEditavel = {
  id: string;
  titulo: string;
  tipo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  foto_capa_url: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
};

// Rodada 36 — <input type="datetime-local"> exige "AAAA-MM-DDTHH:mm" sem
// fuso; timestamptz do banco vem em UTC com "Z" -- precisa converter os
// dois sentidos, senão o horário mostrado/salvo fica errado pro fuso do
// organizador.
function paraDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function paraISO(datetimeLocal: string): string | null {
  if (!datetimeLocal) return null;
  return new Date(datetimeLocal).toISOString();
}

export default function DashboardEventosPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [eventos, setEventos] = useState<EventoEditavel[]>([]);
  const [erro, setErro] = useState('');
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [salvoId, setSalvoId] = useState<string | null>(null);
  const [enviandoFotoId, setEnviandoFotoId] = useState<string | null>(null);
  const inputsArquivo = useRef<Record<string, HTMLInputElement | null>>({});

  const carregarEventos = useCallback(async () => {
    const { data, error } = await supabase.rpc('meus_eventos_gerenciaveis');
    if (error) {
      setErro(error.message);
      return;
    }
    const lista = ((data || []) as EventoEditavel[]).slice().sort((a, b) =>
      a.data_inicio < b.data_inicio ? 1 : -1
    );
    setEventos(lista);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      await carregarEventos();
      setCarregando(false);
    })();
  }, [router, carregarEventos]);

  const atualizarCampo = (id: string, patch: Partial<EventoEditavel>) => {
    setEventos((atual) => atual.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)));
  };

  const salvarEvento = async (ev: EventoEditavel) => {
    setSalvandoId(ev.id);
    setErro('');
    const { error } = await supabase
      .from('eventos')
      .update({
        titulo: ev.titulo,
        descricao: ev.descricao,
        data_inicio: ev.data_inicio,
        data_fim: ev.data_fim,
        foto_capa_url: ev.foto_capa_url,
      })
      .eq('id', ev.id);
    if (error) {
      setErro(error.message);
    } else {
      setSalvoId(ev.id);
      setTimeout(() => setSalvoId((atual) => (atual === ev.id ? null : atual)), 2000);
    }
    setSalvandoId(null);
  };

  const enviarFotoCapa = async (ev: EventoEditavel, arquivo: File) => {
    setErro('');
    if (!arquivo.type.startsWith('image/')) {
      setErro('Envie um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setErro(`A imagem precisa ter até ${TAMANHO_MAXIMO_MB}MB.`);
      return;
    }
    setEnviandoFotoId(ev.id);
    const extensao = arquivo.name.split('.').pop() || 'jpg';
    const caminho = `${ev.id}/capa-${Date.now()}.${extensao}`;
    const { error: erroUpload } = await supabase.storage
      .from('fotos-eventos')
      .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    if (erroUpload) {
      setErro(`Não deu pra enviar a foto: ${erroUpload.message}`);
      setEnviandoFotoId(null);
      return;
    }
    const { data } = supabase.storage.from('fotos-eventos').getPublicUrl(caminho);
    atualizarCampo(ev.id, { foto_capa_url: data.publicUrl });
    setEnviandoFotoId(null);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-6">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-black">Meus eventos</h1>
        <p className="text-[#A0A0B2] text-xs mt-1">
          Data, descrição e foto de capa das suas festas — o título é o mesmo que aparece no app.
        </p>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      {eventos.length === 0 && (
        <p className="text-xs text-[#626274]">
          Nenhum evento seu por aqui ainda. Cadastre uma festa em{' '}
          <Link href="/cadastro/evento" className="underline hover:text-white">/cadastro/evento</Link>.
        </p>
      )}

      <div className="space-y-6">
        {eventos.map((ev) => (
          <div key={ev.id} className="bg-[#161520] border border-[#232230] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  ev.status === 'aprovado'
                    ? 'bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30'
                    : ev.status === 'pendente'
                    ? 'bg-[#E1A93A]/10 text-[#E1A93A] border border-[#E1A93A]/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}
              >
                {ev.status === 'aprovado' ? 'Aprovado' : ev.status === 'pendente' ? 'Em análise' : 'Rejeitado'}
              </span>
              <span className="text-[10px] text-[#626274] uppercase font-bold">{ev.tipo}</span>
            </div>

            {ev.foto_capa_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ev.foto_capa_url}
                alt={`Foto de capa de ${ev.titulo}`}
                className="w-full h-40 object-cover rounded-xl border border-[#232230]"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            )}
            <input
              ref={(elemento) => {
                inputsArquivo.current[ev.id] = elemento;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) enviarFotoCapa(ev, arquivo);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={enviandoFotoId === ev.id}
              onClick={() => inputsArquivo.current[ev.id]?.click()}
              className="w-full bg-[#0B0B0E] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-3 px-4 text-[#D0D0E0] text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              {enviandoFotoId === ev.id ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {enviandoFotoId === ev.id ? 'Enviando...' : ev.foto_capa_url ? 'Trocar foto de capa' : 'Enviar foto de capa'}
            </button>

            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Título</label>
              <input
                type="text"
                value={ev.titulo}
                onChange={(e) => atualizarCampo(ev.id, { titulo: e.target.value })}
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Descrição</label>
              <textarea
                value={ev.descricao || ''}
                onChange={(e) => atualizarCampo(ev.id, { descricao: e.target.value })}
                rows={3}
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2 flex items-center gap-1.5">
                  <Calendar size={12} /> Início
                </label>
                <input
                  type="datetime-local"
                  value={paraDatetimeLocal(ev.data_inicio)}
                  onChange={(e) => atualizarCampo(ev.id, { data_inicio: paraISO(e.target.value) || ev.data_inicio })}
                  className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Fim (opcional)</label>
                <input
                  type="datetime-local"
                  value={paraDatetimeLocal(ev.data_fim)}
                  onChange={(e) => atualizarCampo(ev.id, { data_fim: paraISO(e.target.value) })}
                  className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                />
              </div>
            </div>

            <button
              onClick={() => salvarEvento(ev)}
              disabled={salvandoId === ev.id}
              className="w-full bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              {salvandoId === ev.id ? (
                <Loader2 className="animate-spin" size={16} />
              ) : salvoId === ev.id ? (
                'Salvo!'
              ) : (
                <>
                  <Save size={16} /> Salvar
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
