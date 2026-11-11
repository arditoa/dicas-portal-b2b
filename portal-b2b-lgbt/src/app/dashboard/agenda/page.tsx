'use client';
import { CalendarDays, Info, Link as LinkIcon, Loader2, Save, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { idsMarcaAtiva } from '../../../lib/marcaAtiva';

// Rodada 126 — a agenda que o bar sobe aqui aparece SÓ na aba Eventos do app,
// no filtro "Essa semana" (pedido da Andrea). Não aparece mais no perfil do local.
//
// Modelo (public.agenda_semanal, migrations 023 + 073):
//  - cada dia da semana pode ter uma atração "só nesta semana" (linha com `data`)
//    ou "toda semana" (linha sem `data`, repete sempre naquele dia);
//  - se um dia tem as duas, a de "só nesta semana" vale e a de "toda semana" fica guardada;
//  - o cartaz da semana (flyer) é uma linha tipo = 'semana' com data = segunda-feira.
// Mesmo bucket de Storage da foto de capa ('fotos-locais'): a RLS libera "<local_id>/...".

const TAMANHO_MAXIMO_MB = 5;

const NOMES_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type Linha = {
  id: string;
  dia_semana: number;
  data: string | null;
  tipo: string;
  titulo: string;
  descricao: string | null;
  horario: string | null;
  foto_url: string | null;
  link: string | null;
  ativo: boolean;
};

type DiaEdicao = {
  chave: string; // YYYY-MM-DD
  data: Date;
  diaSemana: number;
  passou: boolean;
  datadaId: string | null;
  fixaId: string | null;
  modo: 'semana' | 'toda';
  titulo: string;
  horario: string;
  descricao: string;
  foto_url: string;
  link: string;
  ativo: boolean;
};

type Cartaz = {
  id: string | null;
  titulo: string;
  descricao: string;
  foto_url: string;
  link: string;
  ativo: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');
const chaveData = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function segundaDaSemana(offsetSemanas: number): Date {
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diasDesdeSegunda = (base.getDay() + 6) % 7; // segunda = 0
  base.setDate(base.getDate() - diasDesdeSegunda + offsetSemanas * 7);
  return base;
}

function montarDias(segunda: Date, linhas: Linha[]): DiaEdicao[] {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i);
    const chave = chaveData(d);
    const dow = d.getDay();
    const datada = linhas.find((l) => l.tipo === 'dia' && l.data === chave) || null;
    const fixa = linhas.find((l) => l.tipo === 'dia' && !l.data && l.dia_semana === dow) || null;
    const exibida = datada || fixa;
    return {
      chave,
      data: d,
      diaSemana: dow,
      passou: d.getTime() < inicioHoje.getTime(),
      datadaId: datada?.id || null,
      fixaId: fixa?.id || null,
      modo: datada ? 'semana' : fixa ? 'toda' : 'semana',
      titulo: exibida?.titulo === '(sem título)' ? '' : exibida?.titulo || '',
      horario: exibida?.horario || '',
      descricao: exibida?.descricao || '',
      foto_url: exibida?.foto_url || '',
      link: exibida?.link || '',
      ativo: exibida ? exibida.ativo : true,
    };
  });
}

function cartazVazio(): Cartaz {
  return { id: null, titulo: '', descricao: '', foto_url: '', link: '', ativo: true };
}

export default function DashboardAgendaPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0); // 0 = esta semana, 1 = próxima
  const [dias, setDias] = useState<DiaEdicao[]>([]);
  const [cartaz, setCartaz] = useState<Cartaz>(cartazVazio());
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState<string | null>(null);
  const inputsArquivo = useRef<Record<string, HTMLInputElement | null>>({});

  const segunda = segundaDaSemana(offset);
  const domingo = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 6);
  const chaveSegunda = chaveData(segunda);
  const rotuloSemana = `${pad(segunda.getDate())}/${pad(segunda.getMonth() + 1)} a ${pad(domingo.getDate())}/${pad(domingo.getMonth() + 1)}`;

  const carregar = useCallback(async (idDoLocal: string, off: number) => {
    const seg = segundaDaSemana(off);
    const dom = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);
    const { data, error } = await supabase
      .from('agenda_semanal')
      .select('id, dia_semana, data, tipo, titulo, descricao, horario, foto_url, link, ativo')
      .eq('local_id', idDoLocal)
      .or(`data.is.null,and(data.gte.${chaveData(seg)},data.lte.${chaveData(dom)})`);
    if (error) {
      setErro(
        error.message.includes('data') || error.message.includes('tipo') || error.message.includes('horario')
          ? 'O banco ainda não recebeu a atualização da agenda (migration 073). Avise o administrador.'
          : error.message
      );
      return;
    }
    const linhas = (data || []) as Linha[];
    setDias(montarDias(seg, linhas));
    const c = linhas.find((l) => l.tipo === 'semana' && l.data === chaveData(seg));
    setCartaz(
      c
        ? {
            id: c.id,
            titulo: c.titulo === '(sem título)' ? '' : c.titulo,
            descricao: c.descricao || '',
            foto_url: c.foto_url || '',
            link: c.link || '',
            ativo: c.ativo,
          }
        : cartazVazio()
    );
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      const { data: local, error } = await supabase
        .from('locais')
        .select('id')
        .eq('owner_id', userData.user.id).in('id', idsMarcaAtiva())
        .maybeSingle();
      if (error || !local) {
        router.push('/dashboard');
        return;
      }
      setLocalId(local.id);
      await carregar(local.id, 0);
      setCarregando(false);
    })();
  }, [router, carregar]);

  const trocarSemana = async (novo: number) => {
    if (!localId || novo === offset) return;
    setOffset(novo);
    setErro('');
    await carregar(localId, novo);
  };

  const atualizarDia = (chave: string, patch: Partial<DiaEdicao>) => {
    setDias((atual) => atual.map((d) => (d.chave === chave ? { ...d, ...patch } : d)));
  };

  const marcarSalvo = (chave: string) => {
    setSalvo(chave);
    setTimeout(() => setSalvo((atual) => (atual === chave ? null : atual)), 2000);
  };

  const salvarDia = async (dia: DiaEdicao) => {
    if (!localId) return;
    if (!dia.titulo.trim()) {
      setErro(`Escreva o que rola ${dia.diaSemana === 0 || dia.diaSemana === 6 ? 'no' : 'na'} ${NOMES_DIA[dia.diaSemana].toLowerCase()} antes de salvar.`);
      return;
    }
    setSalvando(dia.chave);
    setErro('');
    const base = {
      local_id: localId,
      tipo: 'dia',
      dia_semana: dia.diaSemana,
      titulo: dia.titulo.trim(),
      horario: dia.horario.trim() || null,
      descricao: dia.descricao.trim() || null,
      foto_url: dia.foto_url || null,
      link: dia.link.trim() || null,
      ativo: dia.ativo,
    };
    let msgErro = '';
    if (dia.modo === 'toda') {
      const payload = { ...base, data: null };
      const r = dia.fixaId
        ? await supabase.from('agenda_semanal').update(payload).eq('id', dia.fixaId)
        : await supabase.from('agenda_semanal').insert(payload);
      if (r.error) msgErro = r.error.message;
      else if (dia.datadaId) {
        // virou "toda semana": a versão só desta semana não precisa mais existir
        const d = await supabase.from('agenda_semanal').delete().eq('id', dia.datadaId);
        if (d.error) msgErro = d.error.message;
      }
    } else {
      const payload = { ...base, data: dia.chave };
      const r = dia.datadaId
        ? await supabase.from('agenda_semanal').update(payload).eq('id', dia.datadaId)
        : await supabase.from('agenda_semanal').insert(payload);
      if (r.error) msgErro = r.error.message;
    }
    if (msgErro) setErro(msgErro);
    else {
      marcarSalvo(dia.chave);
      await carregar(localId, offset);
    }
    setSalvando(null);
  };

  const limparDia = async (dia: DiaEdicao) => {
    if (!localId) return;
    if (!dia.datadaId && !dia.fixaId) {
      atualizarDia(dia.chave, { titulo: '', horario: '', descricao: '', foto_url: '', link: '', ativo: true });
      return;
    }
    const idParaApagar = dia.datadaId || dia.fixaId!;
    const apagandoFixa = !dia.datadaId;
    const aviso = apagandoFixa
      ? `Isso para de repetir "${NOMES_DIA[dia.diaSemana]}" em TODAS as semanas. Continuar?`
      : `Remover a atração de ${NOMES_DIA[dia.diaSemana]} (${pad(dia.data.getDate())}/${pad(dia.data.getMonth() + 1)})?`;
    if (!window.confirm(aviso)) return;
    setSalvando(dia.chave);
    const { error } = await supabase.from('agenda_semanal').delete().eq('id', idParaApagar);
    if (error) setErro(error.message);
    else await carregar(localId, offset);
    setSalvando(null);
  };

  const enviarFoto = async (chave: string, arquivo: File, aplicar: (url: string) => void) => {
    if (!localId) return;
    setErro('');
    if (!arquivo.type.startsWith('image/')) {
      setErro('Envie um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setErro(`A imagem precisa ter até ${TAMANHO_MAXIMO_MB}MB.`);
      return;
    }
    setEnviandoFoto(chave);
    const extensao = arquivo.name.split('.').pop() || 'jpg';
    const caminho = `${localId}/agenda-${chave}-${Date.now()}.${extensao}`;
    const { error: erroUpload } = await supabase.storage
      .from('fotos-locais')
      .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    if (erroUpload) {
      setErro(`Não deu pra enviar a foto: ${erroUpload.message}`);
      setEnviandoFoto(null);
      return;
    }
    const { data } = supabase.storage.from('fotos-locais').getPublicUrl(caminho);
    aplicar(data.publicUrl);
    setEnviandoFoto(null);
  };

  const salvarCartaz = async () => {
    if (!localId) return;
    if (!cartaz.foto_url && !cartaz.descricao.trim()) {
      setErro('Envie a imagem do cartaz ou escreva a programação para salvar.');
      return;
    }
    setSalvando('cartaz');
    setErro('');
    const payload = {
      local_id: localId,
      tipo: 'semana',
      data: chaveSegunda,
      dia_semana: 1,
      titulo: cartaz.titulo.trim() || 'Programação da semana',
      descricao: cartaz.descricao.trim() || null,
      foto_url: cartaz.foto_url || null,
      link: cartaz.link.trim() || null,
      horario: null,
      ativo: cartaz.ativo,
    };
    const r = cartaz.id
      ? await supabase.from('agenda_semanal').update(payload).eq('id', cartaz.id)
      : await supabase.from('agenda_semanal').insert(payload);
    if (r.error) setErro(r.error.message);
    else {
      marcarSalvo('cartaz');
      await carregar(localId, offset);
    }
    setSalvando(null);
  };

  const removerCartaz = async () => {
    if (!localId || !cartaz.id) {
      setCartaz(cartazVazio());
      return;
    }
    if (!window.confirm('Remover o cartaz desta semana?')) return;
    setSalvando('cartaz');
    const { error } = await supabase.from('agenda_semanal').delete().eq('id', cartaz.id);
    if (error) setErro(error.message);
    else await carregar(localId, offset);
    setSalvando(null);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  const preenchidos = dias.filter((d) => d.datadaId || d.fixaId).length;
  const campo =
    'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]';

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">

      <div className="mb-6">
        <h1 className="text-2xl font-black">Agenda da semana</h1>
        <p className="text-[#A0A0B2] text-xs mt-1">
          Conte o que rola no seu local em cada dia. Nada de mexer no perfil: a agenda é publicada
          direto na aba <b className="text-white">Eventos → Essa semana</b> do app.
        </p>
      </div>

      <div className="bg-[#7E57C2]/10 border border-[#7E57C2]/30 rounded-2xl p-4 mb-6 flex gap-3">
        <Info size={16} className="text-[#B39DDB] shrink-0 mt-0.5" />
        <div className="text-xs text-[#D0D0E0] space-y-1.5">
          <p>
            <b>Como funciona:</b> escolha a semana, preencha os dias e clique em Salvar em cada um. Pode
            deixar a próxima semana pronta com antecedência.
          </p>
          <p>
            <b>Só nesta semana</b> vale apenas para aquela data. <b>Toda semana</b> repete sempre
            naquele dia (ótimo pra &quot;toda quinta tem karaokê&quot;).
          </p>
          <p>
            A agenda <b>não aparece no perfil</b> do seu local — fica só na aba Eventos, que é onde o
            público procura o que fazer.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        {[0, 1].map((o) => (
          <button
            key={o}
            onClick={() => trocarSemana(o)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold border transition ${
              offset === o
                ? 'bg-[#E1306C] border-[#E1306C] text-white'
                : 'bg-[#161520] border-[#232230] text-[#A0A0B2] hover:text-white'
            }`}
          >
            {o === 0 ? 'Esta semana' : 'Próxima semana'}
          </button>
        ))}
      </div>
      <p className="text-[#A0A0B2] text-[11px] mb-6 flex items-center gap-1.5">
        <CalendarDays size={12} /> {rotuloSemana} · {preenchidos} de 7 dias preenchidos
      </p>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      {/* CARTAZ DA SEMANA */}
      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5 space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">Cartaz da semana (opcional)</h3>
          <label className="flex items-center gap-2 text-[10px] font-bold text-[#A0A0B2] uppercase cursor-pointer">
            <input
              type="checkbox"
              checked={cartaz.ativo}
              onChange={(e) => setCartaz({ ...cartaz, ativo: e.target.checked })}
              className="accent-[#E1306C]"
            />
            Ativo
          </label>
        </div>
        <p className="text-[11px] text-[#A0A0B2]">
          Já tem a arte com a programação da semana inteira? Envie aqui. Ela aparece em destaque na
          aba Eventos, no topo de &quot;Essa semana&quot;.
        </p>
        {cartaz.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cartaz.foto_url} alt="Cartaz da semana" className="w-full max-h-72 object-contain rounded-xl border border-[#232230] bg-[#0B0B0E]" />
        )}
        <input
          ref={(el) => {
            inputsArquivo.current['cartaz'] = el;
          }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) enviarFoto('cartaz', arquivo, (url) => setCartaz((c) => ({ ...c, foto_url: url })));
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={enviandoFoto === 'cartaz'}
          onClick={() => inputsArquivo.current['cartaz']?.click()}
          className="w-full bg-[#0B0B0E] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-2.5 px-4 text-[#D0D0E0] text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-40"
        >
          {enviandoFoto === 'cartaz' ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
          {enviandoFoto === 'cartaz' ? 'Enviando...' : cartaz.foto_url ? 'Trocar imagem do cartaz' : 'Enviar imagem do cartaz'}
        </button>
        <textarea
          placeholder={'Ou escreva a programação (uma linha por dia)'}
          value={cartaz.descricao}
          onChange={(e) => setCartaz({ ...cartaz, descricao: e.target.value.slice(0, 1200) })}
          rows={3}
          className={campo}
        />
        <div className="flex gap-2">
          <button
            onClick={salvarCartaz}
            disabled={salvando === 'cartaz'}
            className="flex-1 bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2"
          >
            {salvando === 'cartaz' ? <Loader2 className="animate-spin" size={14} /> : salvo === 'cartaz' ? 'Salvo!' : (<><Save size={14} /> Salvar cartaz</>)}
          </button>
          {(cartaz.id || cartaz.foto_url || cartaz.descricao) && (
            <button
              onClick={removerCartaz}
              disabled={salvando === 'cartaz'}
              className="text-[#626274] hover:text-red-400 font-bold py-2.5 px-3 rounded-xl transition text-xs"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      {/* DIAS */}
      <div className="space-y-4">
        {dias.map((dia) => {
          const rotuloDia = `${NOMES_DIA[dia.diaSemana]}, ${pad(dia.data.getDate())}/${pad(dia.data.getMonth() + 1)}`;
          const existe = !!(dia.datadaId || dia.fixaId);
          return (
            <div
              key={dia.chave}
              className={`bg-[#161520] border border-[#232230] rounded-2xl p-5 space-y-3 ${dia.passou ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">
                  {rotuloDia}
                  {dia.passou && <span className="ml-2 text-[10px] font-bold text-[#626274] uppercase">já passou</span>}
                  {!dia.datadaId && dia.fixaId && (
                    <span className="ml-2 text-[10px] font-bold text-[#B39DDB] uppercase">repete toda semana</span>
                  )}
                </h3>
                <label className="flex items-center gap-2 text-[10px] font-bold text-[#A0A0B2] uppercase cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dia.ativo}
                    onChange={(e) => atualizarDia(dia.chave, { ativo: e.target.checked })}
                    className="accent-[#E1306C]"
                  />
                  Ativo
                </label>
              </div>

              <input
                type="text"
                placeholder="O que rola? Ex.: Noite do Karaokê com a Drag Lola"
                value={dia.titulo}
                onChange={(e) => atualizarDia(dia.chave, { titulo: e.target.value })}
                className={campo}
              />

              <input
                type="text"
                placeholder="Horário (ex.: 21h ou a partir das 22h)"
                value={dia.horario}
                onChange={(e) => atualizarDia(dia.chave, { horario: e.target.value })}
                className={campo}
              />

              <textarea
                placeholder="Detalhes (opcional): entrada, atrações, dress code..."
                value={dia.descricao}
                onChange={(e) => atualizarDia(dia.chave, { descricao: e.target.value })}
                rows={2}
                className={campo}
              />

              <div className="flex items-center gap-2 bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-4">
                <LinkIcon size={14} className="text-[#626274] shrink-0" />
                <input
                  type="text"
                  placeholder="Link (opcional — ex.: post do Instagram, ingressos)"
                  value={dia.link}
                  onChange={(e) => atualizarDia(dia.chave, { link: e.target.value })}
                  className="w-full bg-transparent text-white text-sm focus:outline-none"
                />
              </div>

              {dia.foto_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dia.foto_url}
                  alt={`Arte de ${NOMES_DIA[dia.diaSemana]}`}
                  className="w-full h-32 object-cover rounded-xl border border-[#232230]"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              )}
              <input
                ref={(el) => {
                  inputsArquivo.current[dia.chave] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) enviarFoto(dia.chave, arquivo, (url) => atualizarDia(dia.chave, { foto_url: url }));
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={enviandoFoto === dia.chave}
                onClick={() => inputsArquivo.current[dia.chave]?.click()}
                className="w-full bg-[#0B0B0E] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-2.5 px-4 text-[#D0D0E0] text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-40"
              >
                {enviandoFoto === dia.chave ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                {enviandoFoto === dia.chave ? 'Enviando...' : dia.foto_url ? 'Trocar arte' : 'Enviar arte/foto (opcional)'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                {(['semana', 'toda'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => atualizarDia(dia.chave, { modo: m })}
                    className={`rounded-xl py-2 text-[11px] font-bold border transition ${
                      dia.modo === m
                        ? 'bg-[#7E57C2]/20 border-[#7E57C2] text-white'
                        : 'bg-[#0B0B0E] border-[#232230] text-[#A0A0B2] hover:text-white'
                    }`}
                  >
                    {m === 'semana' ? 'Só nesta semana' : 'Repetir toda semana'}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => salvarDia(dia)}
                  disabled={salvando === dia.chave}
                  className="flex-1 bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2"
                >
                  {salvando === dia.chave ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : salvo === dia.chave ? (
                    'Salvo!'
                  ) : (
                    <>
                      <Save size={14} /> Salvar
                    </>
                  )}
                </button>
                {(existe || dia.titulo) && (
                  <button
                    onClick={() => limparDia(dia)}
                    disabled={salvando === dia.chave}
                    className="text-[#626274] hover:text-red-400 font-bold py-2.5 px-3 rounded-xl transition text-xs"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
