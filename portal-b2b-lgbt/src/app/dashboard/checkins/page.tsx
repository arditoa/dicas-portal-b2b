'use client';
import { Loader2, MapPin, QrCode, RefreshCw, Sparkles, UserCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { idsMarcaAtiva } from '../../../lib/marcaAtiva';

// Check-ins do local (migration 079). A casa NÃO precisa confirmar nada na noite:
//  - check-in feito com o celular perto do local já nasce confirmado ("pela localização");
//  - check-in por código que ninguém digitou entra sozinho às 6h da manhã ("no fim da noite");
//  - esta tela serve para acompanhar quem chegou e, por exceção, cancelar um check-in indevido.
type Linha = {
  checkin_id: string;
  criado_em: string;
  cliente: string;
  cupom: string | null;
  metodo: string;
  situacao: 'confirmado' | 'pendente' | 'cancelado';
  distancia: number | null;
  codigo_checkin: string;
};

const PERIODOS = [
  { dias: 1, rotulo: 'Últimas 24 horas' },
  { dias: 2, rotulo: 'Últimos 2 dias' },
  { dias: 7, rotulo: 'Últimos 7 dias' },
  { dias: 30, rotulo: 'Últimos 30 dias' },
];

function comoFoi(l: Linha): string {
  if (l.situacao === 'pendente') return 'aguardando confirmação (entra sozinho às 6h)';
  if (l.metodo === 'gps') return l.distancia != null ? `pela localização (${l.distancia} m do local)` : 'pela localização';
  if (l.metodo === 'automatico') return 'confirmado no fim da noite';
  return 'confirmado pela casa';
}

export default function CheckinsPage() {
  const router = useRouter();
  const [localId, setLocalId] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [dias, setDias] = useState(2);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async (id: string, d: number) => {
    setAtualizando(true);
    setErro('');
    const { data, error } = await supabase.rpc('checkins_do_local', { p_local_id: id, p_dias: d });
    if (error) {
      setErro(/does not exist|checkins_do_local/i.test(error.message) ? 'Falta rodar a migration 079 no Supabase.' : error.message);
      setLinhas([]);
    } else {
      setLinhas((data as Linha[]) || []);
    }
    setAtualizando(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) { router.push('/login'); return; }
      const { data: local } = await supabase.from('locais').select('id').eq('owner_id', userData.user.id).in('id', idsMarcaAtiva()).maybeSingle();
      if (!local) { router.push('/dashboard'); return; }
      setLocalId(local.id);
      setCarregando(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!localId) return;
    carregar(localId, dias);
    const t = setInterval(() => carregar(localId, dias), 30000); // noite cheia: a lista se atualiza sozinha
    return () => clearInterval(t);
  }, [localId, dias, carregar]);

  const cancelar = async (l: Linha) => {
    if (!localId) return;
    if (!window.confirm(`Cancelar o check-in de ${l.cliente}? A visita e o cupom resgatado voltam atrás.`)) return;
    const { error } = await supabase.rpc('cancelar_checkin_local', { p_checkin_id: l.checkin_id });
    if (error) { setErro(error.message); return; }
    await carregar(localId, dias);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  const confirmados = linhas.filter((l) => l.situacao === 'confirmado').length;
  const pendentes = linhas.filter((l) => l.situacao === 'pendente').length;
  const cancelados = linhas.filter((l) => l.situacao === 'cancelado').length;

  return (
    <div className="p-8 max-w-3xl mx-auto text-white">
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black">Check-ins</h1>
          <p className="text-[#A0A0B2] text-xs mt-1 leading-relaxed">
            Quem chegou no seu local pelo app. Quem faz check-in com o celular perto do local já entra confirmado, sem você
            digitar nada. Check-ins por código que ninguém digitou entram sozinhos às 6h da manhã. Se algo não estiver certo,
            é só cancelar.
          </p>
        </div>
        <button
          onClick={() => localId && carregar(localId, dias)}
          className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-3 py-2.5 rounded-xl transition flex items-center gap-2 shrink-0"
        >
          <RefreshCw size={14} className={atualizando ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={dias}
          onChange={(e) => setDias(Number(e.target.value))}
          className="bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#E1306C]"
        >
          {PERIODOS.map((p) => <option key={p.dias} value={p.dias}>{p.rotulo}</option>)}
        </select>
        <span className="text-xs text-[#A0A0B2]">
          <b className="text-white">{confirmados}</b> confirmados · <b className="text-white">{pendentes}</b> pendentes · <b className="text-white">{cancelados}</b> cancelados
        </span>
        <Link href="/dashboard/cupons" className="ml-auto text-xs text-[#E1306C] font-bold flex items-center gap-1.5 hover:underline">
          <QrCode size={13} /> Validar um código manualmente
        </Link>
      </div>

      {erro && <p className="text-xs text-red-400 mb-4">{erro}</p>}

      <div className="space-y-3">
        {linhas.length === 0 && !erro && (
          <p className="text-xs text-[#626274]">Nenhum check-in neste período.</p>
        )}
        {linhas.map((l) => {
          const quando = new Date(l.criado_em);
          const cor = l.situacao === 'confirmado' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : l.situacao === 'pendente' ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
            : 'text-[#A0A0B2] bg-[#232230] border-[#2D2B3D]';
          return (
            <div key={l.checkin_id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <UserCheck size={14} className="text-[#E1306C] shrink-0" /> <span className="truncate">{l.cliente}</span>
                </h3>
                <p className="text-xs text-[#A0A0B2] mt-1">
                  {quando.toLocaleDateString('pt-BR')} às {quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {l.cupom ? ` · cupom: ${l.cupom}` : ' · visita (sem cupom)'}
                </p>
                <p className="text-[11px] text-[#626274] mt-1 flex items-center gap-1.5">
                  {l.metodo === 'gps' ? <MapPin size={11} /> : l.metodo === 'automatico' ? <Sparkles size={11} /> : <QrCode size={11} />}
                  {comoFoi(l)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${cor}`}>
                  {l.situacao === 'confirmado' ? 'Confirmado' : l.situacao === 'pendente' ? 'Pendente' : 'Cancelado'}
                </span>
                {l.situacao !== 'cancelado' && (
                  <button
                    onClick={() => cancelar(l)}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                    title="Cancelar este check-in"
                  >
                    <XCircle size={12} /> Cancelar
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
