'use client';
// Reservas no portal do parceiro (Reservas fase 2, 13/11/2026). Mesmas regras da tela do app
// (src/app/parceiro/reservas.tsx) e do banco (migrações 102 e 110):
//   - só planos pagos (plano efetivo); categorias com reserva (bares, restaurantes e afins);
//   - como receber: pelo app (quiz → pedidos aqui e em Aprovações no app), pelo WhatsApp ou desligado;
//   - regras: dias, antecedência mínima, até quantos dias à frente, máximo de pessoas, chamada e aviso;
//   - áreas do quiz (nome, como é, tipo de mesa, horário de chegada, pessoas, ativa);
//   - pedidos: confirmar ou recusar (o cliente recebe aviso no celular pela função avisar-reserva) e,
//     no dia, marcar compareceu / não veio.
import { Bookmark, Check, Loader2, Lock, Plus, Save, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParceiro } from '../../../components/parceiro/ParceiroContext';
import { recursosDaLocal } from '../../../lib/parceiro';
import { supabase } from '../../../lib/supabase';

type Modo = 'app' | 'whatsapp' | 'desligado';
type Config = { modo: Modo; whatsapp: string; chamada: string; aviso: string; dias_semana: number[]; antecedencia_horas: number; dias_a_frente: number; max_pessoas: number };
type Area = { id?: string; nome: string; descricao: string; tipo_mesa: string; hora_inicio: string; hora_limite: string; min_pessoas: number; max_pessoas: number | null; ativo: boolean; ordem: number };
type Pedido = { id: string; nome: string; telefone: string | null; area_nome: string; data: string; horario: string; pessoas: number; ocasiao: string | null; observacao: string | null; status: string };

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PADRAO: Config = { modo: 'desligado', whatsapp: '', chamada: 'Faça sua reserva', aviso: '', dias_semana: [4, 5, 6], antecedencia_horas: 2, dias_a_frente: 30, max_pessoas: 12 };
const NOVA: Area = { nome: '', descricao: '', tipo_mesa: '', hora_inicio: '18:00', hora_limite: '22:00', min_pessoas: 1, max_pessoas: null, ativo: true, ordem: 0 };
const SIT: Record<string, { txt: string; cls: string }> = {
  aguardando: { txt: 'Aguardando', cls: 'text-amber-300' }, confirmada: { txt: 'Confirmada', cls: 'text-emerald-400' },
  recusada: { txt: 'Recusada', cls: 'text-red-400' }, cancelada: { txt: 'Cancelada pelo cliente', cls: 'text-[#8888A0]' },
  compareceu: { txt: 'Compareceu', cls: 'text-emerald-400' }, nao_veio: { txt: 'Não veio', cls: 'text-[#8888A0]' },
};
const campo = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const rotulo = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1.5';
const card = 'bg-[#161520] border border-[#232230] rounded-2xl p-5 mb-6';
const soDigitos = (s: string) => s.replace(/\D/g, '');
const horaOk = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const quando = (p: Pedido) => `${new Date(`${p.data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${p.horario.slice(0, 5)}`;

export default function ReservasPage() {
  const parceiro = useParceiro();
  const local = parceiro?.local;
  const [cfg, setCfg] = useState<Config>(PADRAO);
  const [areas, setAreas] = useState<Area[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [editando, setEditando] = useState<Area | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [falta, setFalta] = useState(false);

  const carregar = useCallback(async () => {
    if (!local) return;
    const [c, a, p] = await Promise.all([
      supabase.from('reserva_config').select('*').eq('local_id', local.id).maybeSingle(),
      supabase.from('reserva_areas').select('*').eq('local_id', local.id).order('ordem'),
      supabase.from('reservas').select('id, nome, telefone, area_nome, data, horario, pessoas, ocasiao, observacao, status').eq('local_id', local.id).gte('data', hoje()).order('data').order('horario').limit(100),
    ]);
    if (c.error && /relation|does not exist|schema cache/i.test(c.error.message)) setFalta(true);
    const d = c.data as any;
    if (d) setCfg({ modo: d.modo, whatsapp: d.whatsapp || '', chamada: d.chamada || '', aviso: d.aviso || '', dias_semana: d.dias_semana || [], antecedencia_horas: d.antecedencia_horas, dias_a_frente: d.dias_a_frente, max_pessoas: d.max_pessoas });
    setAreas(((a.data as any[]) || []).map((x) => ({
      id: x.id, nome: x.nome, descricao: x.descricao || '', tipo_mesa: x.tipo_mesa || '', hora_inicio: String(x.hora_inicio).slice(0, 5),
      hora_limite: String(x.hora_limite).slice(0, 5), min_pessoas: x.min_pessoas, max_pessoas: x.max_pessoas, ativo: x.ativo, ordem: x.ordem,
    })));
    setPedidos((p.data as Pedido[]) || []);
    setCarregando(false);
  }, [local]);
  useEffect(() => { carregar(); }, [carregar]);

  if (!parceiro || !local) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#E1306C]" /></div>;
  if (!recursosDaLocal(local).reservas) return <div className="p-8 max-w-2xl mx-auto text-white"><p className="text-sm text-[#A0A0B2]">A sua categoria não usa reservas.</p></div>;
  if (!parceiro.pago) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-white">
        <h1 className="text-2xl font-black mb-4">Reservas</h1>
        <div className={card}>
          <p className="text-sm flex items-center gap-2 font-bold mb-2"><Lock size={14} /> Reservas estão incluídas nos planos pagos</p>
          <p className="text-xs text-[#A0A0B2] mb-4">Com reserva, o cliente escolhe a área (rooftop, salão, sacada…), o dia e o horário pelo app, ou chama vocês no WhatsApp.</p>
          <Link href="/planos" className="inline-block bg-[#E1306C] text-white text-xs font-bold px-4 py-2.5 rounded-xl">Conhecer os planos</Link>
        </div>
      </div>
    );
  }

  const salvarConfig = async () => {
    setErro(''); setAviso('');
    const zap = soDigitos(cfg.whatsapp);
    const numero = zap ? (zap.startsWith('55') ? zap : `55${zap}`) : '';
    if (cfg.modo === 'whatsapp' && !/^\d{12,13}$/.test(numero)) return setErro('Coloque o WhatsApp das reservas com DDD.');
    if (cfg.modo === 'app' && !areas.some((a) => a.ativo)) return setErro('Para receber pelo app, cadastre pelo menos uma área ativa (o quiz começa por "Onde você quer ficar?").');
    if (cfg.modo !== 'desligado' && !cfg.dias_semana.length) return setErro('Escolha os dias em que a casa recebe reservas.');
    setSalvando(true);
    const { error } = await supabase.from('reserva_config').upsert({
      local_id: local.id, modo: cfg.modo, whatsapp: numero || null, chamada: cfg.chamada.trim() || null, aviso: cfg.aviso.trim() || null,
      dias_semana: cfg.dias_semana, antecedencia_horas: cfg.antecedencia_horas, dias_a_frente: cfg.dias_a_frente, max_pessoas: cfg.max_pessoas, updated_at: new Date().toISOString(),
    });
    setSalvando(false);
    if (error) setErro(error.message); else setAviso('Reservas salvas. O botão "Fazer reserva" já segue essas regras no app.');
  };

  const salvarArea = async () => {
    if (!editando) return;
    setErro('');
    if (editando.nome.trim().length < 2) return setErro('Dê um nome para a área (ex.: Rooftop).');
    if (!horaOk(editando.hora_inicio) || !horaOk(editando.hora_limite) || editando.hora_inicio > editando.hora_limite) return setErro('Horário no formato 18:00, e a última chegada depois da primeira.');
    const linha = {
      local_id: local.id, nome: editando.nome.trim(), descricao: editando.descricao.trim() || null, tipo_mesa: editando.tipo_mesa.trim() || null,
      hora_inicio: editando.hora_inicio, hora_limite: editando.hora_limite, min_pessoas: editando.min_pessoas,
      max_pessoas: editando.max_pessoas && editando.max_pessoas >= editando.min_pessoas ? editando.max_pessoas : null, ativo: editando.ativo,
      ordem: editando.id ? editando.ordem : areas.length,
    };
    const { error } = editando.id ? await supabase.from('reserva_areas').update(linha).eq('id', editando.id) : await supabase.from('reserva_areas').insert(linha);
    if (error) return setErro(error.message);
    setEditando(null);
    carregar();
  };
  const apagarArea = async (a: Area) => {
    if (!a.id || !window.confirm(`Apagar "${a.nome}"? As reservas já feitas continuam com o nome da área.`)) return;
    await supabase.from('reserva_areas').delete().eq('id', a.id);
    carregar();
  };

  const responder = async (p: Pedido, status: 'confirmada' | 'recusada' | 'compareceu' | 'nao_veio') => {
    setErro('');
    const resposta = status === 'recusada' ? window.prompt('Quer mandar um recado para o cliente? (opcional)') || null : null;
    const { error } = await supabase.rpc('responder_reserva', { p_reserva: p.id, p_status: status, p_resposta: resposta });
    if (error) return setErro(error.message);
    // Avisa o cliente no celular (confirmada/recusada). Não trava a tela.
    if (status === 'confirmada' || status === 'recusada') supabase.functions.invoke('avisar-reserva', { body: { reserva_id: p.id } }).catch(() => {});
    carregar();
  };

  const aguardando = pedidos.filter((p) => p.status === 'aguardando');
  const deHoje = pedidos.filter((p) => p.data === hoje() && ['confirmada', 'compareceu', 'nao_veio'].includes(p.status));
  const proximas = pedidos.filter((p) => p.data > hoje() && p.status === 'confirmada');

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <h1 className="text-2xl font-black flex items-center gap-2"><Bookmark size={22} className="text-[#E1306C]" /> Reservas</h1>
      <p className="text-[#A0A0B2] text-xs mt-1 mb-6">O cliente escolhe a área, o dia e o horário pelo app. Vocês confirmam aqui ou no app (Aprovações).</p>
      {falta && <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-xs mb-4">O banco ainda não recebeu as reservas (migração 102). Avise a equipe Dicas.</div>}
      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4">{erro}</div>}
      {aviso && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs mb-4 flex items-center gap-2"><Check size={14} /> {aviso}</div>}
      {carregando ? <Loader2 className="animate-spin text-[#E1306C]" /> : (
        <>
          {/* Pedidos */}
          <div className={card}>
            <h2 className="text-sm font-black mb-3">Pedidos esperando ({aguardando.length})</h2>
            {aguardando.length === 0 ? <p className="text-xs text-[#626274]">Nenhum pedido esperando resposta.</p> : (
              <div className="space-y-2">
                {aguardando.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 border-t border-[#232230] pt-2 first:border-0 first:pt-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{p.nome} · {p.pessoas} pessoa{p.pessoas === 1 ? '' : 's'}</p>
                      <p className="text-xs text-[#A0A0B2]">{quando(p)} · {p.area_nome}{p.ocasiao ? ` · ${p.ocasiao}` : ''}{p.telefone ? ` · ${p.telefone}` : ''}</p>
                      {p.observacao && <p className="text-xs text-[#8888A0] italic">“{p.observacao}”</p>}
                    </div>
                    <button onClick={() => responder(p, 'confirmada')} className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 p-2 rounded-lg" title="Confirmar"><Check size={16} /></button>
                    <button onClick={() => responder(p, 'recusada')} className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg" title="Recusar"><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
            {deHoje.length > 0 && (
              <>
                <h3 className="text-xs font-black uppercase text-[#A0A0B2] mt-5 mb-2">Hoje</h3>
                {deHoje.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1 text-xs"><b className="text-white">{p.horario.slice(0, 5)}</b> {p.nome} · {p.pessoas} · {p.area_nome} <span className={SIT[p.status]?.cls}>· {SIT[p.status]?.txt}</span></div>
                    <button onClick={() => responder(p, 'compareceu')} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400">Compareceu</button>
                    <button onClick={() => responder(p, 'nao_veio')} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-[#232230] text-[#A0A0B2]">Não veio</button>
                  </div>
                ))}
              </>
            )}
            {proximas.length > 0 && <p className="text-xs text-[#8888A0] mt-4">{proximas.length} reserva{proximas.length === 1 ? '' : 's'} confirmada{proximas.length === 1 ? '' : 's'} nos próximos dias.</p>}
          </div>

          {/* Como receber */}
          <div className={card}>
            <h2 className="text-sm font-black mb-3">Como receber</h2>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([['app', 'Pelo app'], ['whatsapp', 'Pelo WhatsApp'], ['desligado', 'Desligado']] as [Modo, string][]).map(([m, t]) => (
                <button key={m} onClick={() => setCfg({ ...cfg, modo: m })} className={`rounded-xl py-2.5 text-xs font-bold border ${cfg.modo === m ? 'bg-[#E1306C] border-[#E1306C]' : 'border-[#232230] text-[#A0A0B2]'}`}>{t}</button>
              ))}
            </div>
            {cfg.modo === 'whatsapp' && <div className="mb-3"><label className={rotulo}>WhatsApp das reservas</label><input className={campo} value={cfg.whatsapp} onChange={(e) => setCfg({ ...cfg, whatsapp: e.target.value })} placeholder="(11) 90000-0000" /></div>}
            {cfg.modo !== 'desligado' && (
              <div className="space-y-3">
                <div><label className={rotulo}>Dias que recebem reserva</label>
                  <div className="flex flex-wrap gap-1.5">{DIAS.map((d, i) => { const on = cfg.dias_semana.includes(i); return <button key={d} onClick={() => setCfg({ ...cfg, dias_semana: on ? cfg.dias_semana.filter((x) => x !== i) : [...cfg.dias_semana, i].sort() })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${on ? 'bg-[#E1306C] border-[#E1306C]' : 'border-[#232230] text-[#A0A0B2]'}`}>{d}</button>; })}</div>
                </div>
                {cfg.modo === 'app' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={rotulo}>Antecedência (h)</label><input type="number" min={0} max={48} className={campo} value={cfg.antecedencia_horas} onChange={(e) => setCfg({ ...cfg, antecedencia_horas: Math.max(0, Math.min(48, Number(e.target.value) || 0)) })} /></div>
                    <div><label className={rotulo}>Até (dias à frente)</label><input type="number" min={1} max={120} className={campo} value={cfg.dias_a_frente} onChange={(e) => setCfg({ ...cfg, dias_a_frente: Math.max(1, Math.min(120, Number(e.target.value) || 1)) })} /></div>
                    <div><label className={rotulo}>Máx. pessoas</label><input type="number" min={1} max={100} className={campo} value={cfg.max_pessoas} onChange={(e) => setCfg({ ...cfg, max_pessoas: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} /></div>
                  </div>
                )}
                <div><label className={rotulo}>Texto do botão</label><input className={campo} maxLength={80} value={cfg.chamada} onChange={(e) => setCfg({ ...cfg, chamada: e.target.value })} /></div>
                <div><label className={rotulo}>Aviso para o cliente (opcional)</label><input className={campo} maxLength={280} value={cfg.aviso} onChange={(e) => setCfg({ ...cfg, aviso: e.target.value })} placeholder="Ex.: Tolerância de 15 minutos" /></div>
              </div>
            )}
            <button onClick={salvarConfig} disabled={salvando} className="mt-4 bg-[#E1306C] text-white text-xs font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 disabled:opacity-50"><Save size={14} /> {salvando ? 'Salvando...' : 'Salvar reservas'}</button>
          </div>

          {/* Áreas */}
          {cfg.modo === 'app' && (
            <div className={card}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black">Áreas do quiz</h2>
                <button onClick={() => setEditando({ ...NOVA })} className="text-xs font-bold text-[#E1306C] inline-flex items-center gap-1"><Plus size={14} /> Nova área</button>
              </div>
              {areas.length === 0 && <p className="text-xs text-[#626274]">Cadastre os lugares que o cliente pode escolher: Rooftop, Salão, Sacada…</p>}
              {areas.map((a) => (
                <div key={a.id} className={`flex items-center gap-3 border-t border-[#232230] py-2 first:border-0 ${a.ativo ? '' : 'opacity-50'}`}>
                  <button className="flex-1 text-left" onClick={() => setEditando({ ...a })}>
                    <p className="text-sm font-bold">{a.nome}{!a.ativo ? ' · pausada' : ''}</p>
                    <p className="text-xs text-[#A0A0B2]">{[a.descricao, a.tipo_mesa, `chegada ${a.hora_inicio}–${a.hora_limite}`].filter(Boolean).join(' · ')}</p>
                  </button>
                  <button onClick={() => apagarArea(a)} className="text-red-400 p-2" title="Apagar"><Trash2 size={14} /></button>
                </div>
              ))}
              {editando && (
                <div className="mt-4 border border-[#232230] rounded-xl p-4 space-y-3">
                  <div><label className={rotulo}>Nome</label><input className={campo} maxLength={40} value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} placeholder="Ex.: Rooftop" /></div>
                  <div><label className={rotulo}>Como é</label><input className={campo} maxLength={160} value={editando.descricao} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} placeholder="Ex.: Mais calmo, com mesas e cadeiras" /></div>
                  <div><label className={rotulo}>Tipo de mesa</label><input className={campo} maxLength={40} value={editando.tipo_mesa} onChange={(e) => setEditando({ ...editando, tipo_mesa: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={rotulo}>Primeira chegada</label><input className={campo} value={editando.hora_inicio} onChange={(e) => setEditando({ ...editando, hora_inicio: e.target.value })} /></div>
                    <div><label className={rotulo}>Reserva até</label><input className={campo} value={editando.hora_limite} onChange={(e) => setEditando({ ...editando, hora_limite: e.target.value })} /></div>
                    <div><label className={rotulo}>Mín. pessoas</label><input type="number" min={1} className={campo} value={editando.min_pessoas} onChange={(e) => setEditando({ ...editando, min_pessoas: Math.max(1, Number(e.target.value) || 1) })} /></div>
                    <div><label className={rotulo}>Máx. pessoas (vazio = regra geral)</label><input type="number" min={1} className={campo} value={editando.max_pessoas ?? ''} onChange={(e) => setEditando({ ...editando, max_pessoas: e.target.value ? Number(e.target.value) : null })} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#D0D0E0]"><input type="checkbox" checked={editando.ativo} onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })} className="accent-[#E1306C]" /> Aceitando reservas</label>
                  <div className="flex gap-2">
                    <button onClick={salvarArea} className="bg-[#E1306C] text-white text-xs font-bold px-4 py-2 rounded-xl">Salvar área</button>
                    <button onClick={() => setEditando(null)} className="text-xs text-[#A0A0B2] px-3">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
