'use client';
import { ArrowLeft, Link as LinkIcon, Loader2, Save, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Rodada 41 — pedido direto da Andrea: "Vamos criar a agenda da semana
// com fotos e links" (Rodada 39) + decisão já confirmada por ela em
// Rodada 38 via pergunta de múltipla escolha: "Quero foto e/ou link por
// dia também" (não só texto). Uma linha por dia da semana
// (public.agenda_semanal, migration 023) — dia sem linha ativa
// simplesmente não aparece na agenda do local no app
// (business/[id].tsx). Mesmo bucket de Storage que já existe pra foto de
// capa do local ('fotos-locais', 007_storage_fotos_locais.sql) — a RLS
// dele já libera qualquer caminho começando com "<local_id>/", então
// "agenda-<dia>-<timestamp>.jpg" funciona sem precisar de bucket novo.

const TAMANHO_MAXIMO_MB = 5;

const DIAS_SEMANA = [
  { valor: 0, label: 'Domingo' },
  { valor: 1, label: 'Segunda' },
  { valor: 2, label: 'Terça' },
  { valor: 3, label: 'Quarta' },
  { valor: 4, label: 'Quinta' },
  { valor: 5, label: 'Sexta' },
  { valor: 6, label: 'Sábado' },
];

type DiaAgenda = {
  id: string | null; // null = ainda não existe linha pra esse dia
  dia_semana: number;
  titulo: string;
  descricao: string;
  foto_url: string;
  link: string;
  ativo: boolean;
};

function diaVazio(dia: number): DiaAgenda {
  return { id: null, dia_semana: dia, titulo: '', descricao: '', foto_url: '', link: '', ativo: true };
}

export default function DashboardAgendaPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [dias, setDias] = useState<DiaAgenda[]>(DIAS_SEMANA.map((d) => diaVazio(d.valor)));
  const [erro, setErro] = useState('');
  const [salvandoDia, setSalvandoDia] = useState<number | null>(null);
  const [salvoDia, setSalvoDia] = useState<number | null>(null);
  const [enviandoFotoDia, setEnviandoFotoDia] = useState<number | null>(null);
  const inputsArquivo = useRef<Record<number, HTMLInputElement | null>>({});

  const carregarAgenda = useCallback(async (idDoLocal: string) => {
    const { data, error } = await supabase
      .from('agenda_semanal')
      .select('id, dia_semana, titulo, descricao, foto_url, link, ativo')
      .eq('local_id', idDoLocal);
    if (error) {
      setErro(error.message);
      return;
    }
    const porDia = new Map((data || []).map((linha: any) => [linha.dia_semana, linha]));
    setDias(
      DIAS_SEMANA.map((d) => {
        const linha = porDia.get(d.valor);
        if (!linha) return diaVazio(d.valor);
        return {
          id: linha.id,
          dia_semana: d.valor,
          titulo: linha.titulo || '',
          descricao: linha.descricao || '',
          foto_url: linha.foto_url || '',
          link: linha.link || '',
          ativo: linha.ativo,
        };
      })
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
        .eq('owner_id', userData.user.id)
        .maybeSingle();
      if (error || !local) {
        router.push('/dashboard');
        return;
      }
      setLocalId(local.id);
      await carregarAgenda(local.id);
      setCarregando(false);
    })();
  }, [router, carregarAgenda]);

  const atualizarDia = (diaSemana: number, patch: Partial<DiaAgenda>) => {
    setDias((atual) => atual.map((d) => (d.dia_semana === diaSemana ? { ...d, ...patch } : d)));
  };

  const salvarDia = async (dia: DiaAgenda) => {
    if (!localId) return;
    setSalvandoDia(dia.dia_semana);
    setErro('');

    const linhaSemTitulo = !dia.titulo.trim();
    if (linhaSemTitulo && !dia.id) {
      // Nada pra salvar ainda (dia vazio, nunca criado) — não faz sentido
      // gravar uma linha sem título nenhum.
      setSalvandoDia(null);
      return;
    }

    const payload = {
      local_id: localId,
      dia_semana: dia.dia_semana,
      titulo: dia.titulo.trim() || '(sem título)',
      descricao: dia.descricao.trim() || null,
      foto_url: dia.foto_url || null,
      link: dia.link.trim() || null,
      ativo: dia.ativo,
    };

    if (dia.id) {
      const { error } = await supabase.from('agenda_semanal').update(payload).eq('id', dia.id);
      if (error) setErro(error.message);
    } else {
      const { data, error } = await supabase.from('agenda_semanal').insert(payload).select('id').single();
      if (error) setErro(error.message);
      else if (data) atualizarDia(dia.dia_semana, { id: data.id });
    }

    if (!erro) {
      setSalvoDia(dia.dia_semana);
      setTimeout(() => setSalvoDia((atual) => (atual === dia.dia_semana ? null : atual)), 2000);
    }
    setSalvandoDia(null);
  };

  const removerDia = async (dia: DiaAgenda) => {
    if (!dia.id) {
      atualizarDia(dia.dia_semana, diaVazio(dia.dia_semana));
      return;
    }
    if (!window.confirm(`Remover a programação de ${DIAS_SEMANA[dia.dia_semana].label}?`)) return;
    setSalvandoDia(dia.dia_semana);
    const { error } = await supabase.from('agenda_semanal').delete().eq('id', dia.id);
    if (error) setErro(error.message);
    else atualizarDia(dia.dia_semana, diaVazio(dia.dia_semana));
    setSalvandoDia(null);
  };

  const enviarFoto = async (dia: DiaAgenda, arquivo: File) => {
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
    setEnviandoFotoDia(dia.dia_semana);
    const extensao = arquivo.name.split('.').pop() || 'jpg';
    const caminho = `${localId}/agenda-${dia.dia_semana}-${Date.now()}.${extensao}`;
    const { error: erroUpload } = await supabase.storage
      .from('fotos-locais')
      .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    if (erroUpload) {
      setErro(`Não deu pra enviar a foto: ${erroUpload.message}`);
      setEnviandoFotoDia(null);
      return;
    }
    const { data } = supabase.storage.from('fotos-locais').getPublicUrl(caminho);
    atualizarDia(dia.dia_semana, { foto_url: data.publicUrl });
    setEnviandoFotoDia(null);
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
        <h1 className="text-2xl font-black">Agenda da semana</h1>
        <p className="text-[#A0A0B2] text-xs mt-1">
          Preencha o que rola em cada dia (ex.: &quot;Segunda: Karaokê&quot;) — foto e link são
          opcionais. Dia sem título salvo simplesmente não aparece na agenda do seu local no app.
          Desligue o &quot;Ativo&quot; pra tirar do ar sem perder o que você já escreveu.
        </p>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      <div className="space-y-4">
        {dias.map((dia) => (
          <div key={dia.dia_semana} className="bg-[#161520] border border-[#232230] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">{DIAS_SEMANA[dia.dia_semana].label}</h3>
              <label className="flex items-center gap-2 text-[10px] font-bold text-[#A0A0B2] uppercase cursor-pointer">
                <input
                  type="checkbox"
                  checked={dia.ativo}
                  onChange={(e) => atualizarDia(dia.dia_semana, { ativo: e.target.checked })}
                  className="accent-[#E1306C]"
                />
                Ativo
              </label>
            </div>

            <input
              type="text"
              placeholder="Ex.: Karaokê a partir das 21h"
              value={dia.titulo}
              onChange={(e) => atualizarDia(dia.dia_semana, { titulo: e.target.value })}
              className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />

            <textarea
              placeholder="Detalhes (opcional)"
              value={dia.descricao}
              onChange={(e) => atualizarDia(dia.dia_semana, { descricao: e.target.value })}
              rows={2}
              className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />

            <div className="flex items-center gap-2 bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-4">
              <LinkIcon size={14} className="text-[#626274] shrink-0" />
              <input
                type="text"
                placeholder="Link (opcional — ex.: post do Instagram do evento)"
                value={dia.link}
                onChange={(e) => atualizarDia(dia.dia_semana, { link: e.target.value })}
                className="w-full bg-transparent text-white text-sm focus:outline-none"
              />
            </div>

            {dia.foto_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dia.foto_url}
                alt={`Foto de ${DIAS_SEMANA[dia.dia_semana].label}`}
                className="w-full h-32 object-cover rounded-xl border border-[#232230]"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            )}
            <input
              ref={(elemento) => {
                inputsArquivo.current[dia.dia_semana] = elemento;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) enviarFoto(dia, arquivo);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={enviandoFotoDia === dia.dia_semana}
              onClick={() => inputsArquivo.current[dia.dia_semana]?.click()}
              className="w-full bg-[#0B0B0E] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-2.5 px-4 text-[#D0D0E0] text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              {enviandoFotoDia === dia.dia_semana ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              {enviandoFotoDia === dia.dia_semana ? 'Enviando...' : dia.foto_url ? 'Trocar foto' : 'Enviar foto (opcional)'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => salvarDia(dia)}
                disabled={salvandoDia === dia.dia_semana}
                className="flex-1 bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2"
              >
                {salvandoDia === dia.dia_semana ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : salvoDia === dia.dia_semana ? (
                  'Salvo!'
                ) : (
                  <>
                    <Save size={14} /> Salvar
                  </>
                )}
              </button>
              {(dia.id || dia.titulo) && (
                <button
                  onClick={() => removerDia(dia)}
                  disabled={salvandoDia === dia.dia_semana}
                  className="text-[#626274] hover:text-red-400 font-bold py-2.5 px-3 rounded-xl transition text-xs"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
