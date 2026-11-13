'use client';
// Comunidade ("Eu vou", migração 113) — fila de denúncias de PESSOAS, separada das ocorrências.
// Quem denuncia escolhe um motivo ao tocar num rosto do "Eu vou". Aqui a equipe vê quem foi denunciado (nome e foto),
// onde, quantas denúncias a pessoa já tem, muda a situação, anota e pode tirar a pessoa da comunidade
// (suspender: ela não aparece mais nem consegue ligar "aparecer").
import { Loader2, ShieldOff, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Den = {
  id: string; created_at: string; status: string; motivo: string; descricao: string | null; nota_equipe: string | null;
  denunciado_id: string; denunciado_nome: string | null; denunciado_foto: string | null; denunciado_suspenso: boolean; denuncias_contra: number;
  reporter_nome: string | null; onde: string; data: string | null;
};
const MOTIVO: Record<string, string> = {
  assedio: 'Assédio ou mensagem ofensiva', ameaca: 'Ameaça ou violência', foto_impropria: 'Foto imprópria',
  perfil_falso: 'Perfil falso', menor_de_idade: 'Parece menor de 18', outro: 'Outro motivo',
};
const STATUS: { v: string; rotulo: string; cor: string }[] = [
  { v: 'aberta', rotulo: 'Nova', cor: '#6C8CFF' },
  { v: 'em_analise', rotulo: 'Em análise', cor: '#F5A524' },
  { v: 'resolvida', rotulo: 'Resolvida', cor: '#3DD68C' },
  { v: 'rejeitada', rotulo: 'Sem fundamento', cor: '#8A8AA0' },
];
const dh = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function PainelDenunciasComunidade() {
  const [filtro, setFiltro] = useState<'abertas' | 'todas'>('abertas');
  const [lista, setLista] = useState<Den[]>([]);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    const { data, error } = await supabase.rpc('fila_denuncias_comunidade', { p_status: filtro });
    if (error) {
      setErro(/could not find the function/i.test(error.message) ? 'Rode a migração 113 no Supabase para ligar esta fila.' : error.message);
      setLista([]);
    } else {
      const l = (data as Den[]) || [];
      setLista(l);
      setNotas(Object.fromEntries(l.map((d) => [d.id, d.nota_equipe || ''])));
      const caminhos = [...new Set(l.map((d) => d.denunciado_foto).filter((c): c is string => !!c && !/^https?:/.test(c)))];
      if (caminhos.length) {
        const { data: ass } = await supabase.storage.from('avatares').createSignedUrls(caminhos, 3600);
        setFotos(Object.fromEntries((ass || []).filter((x) => x.signedUrl && x.path).map((x) => [x.path as string, x.signedUrl as string])));
      }
    }
    setCarregando(false);
  }, [filtro]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function mudarStatus(d: Den, status: string) {
    setSalvando(d.id);
    const fim = status === 'resolvida' || status === 'rejeitada';
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('denuncias_comunidade').update({
      status, nota_equipe: (notas[d.id] || '').trim() || null,
      resolvido_em: fim ? new Date().toISOString() : null, resolvido_por: fim ? u.user?.id ?? null : null,
    }).eq('id', d.id);
    setSalvando(null);
    if (error) return alert(error.message);
    void carregar();
  }

  async function suspender(d: Den, sim: boolean) {
    if (sim && !confirm(`Tirar ${d.denunciado_nome || 'esta pessoa'} da comunidade? Ela deixa de aparecer no "Eu vou" e não consegue mais ligar "aparecer". Ela continua usando o resto do app.`)) return;
    setSalvando(d.id);
    const { error } = await supabase.rpc('suspender_da_comunidade', { p_user: d.denunciado_id, p_suspender: sim, p_motivo: MOTIVO[d.motivo] || d.motivo });
    setSalvando(null);
    if (error) return alert(error.message);
    void carregar();
  }

  const campo = 'w-full bg-[#12121A] border border-[#232230] rounded-xl px-3 py-2 text-sm text-white placeholder-[#626274] focus:outline-none focus:border-[#E1306C]';
  const st = (v: string) => STATUS.find((s) => s.v === v) || STATUS[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className={`${campo} max-w-[220px]`} value={filtro} onChange={(e) => setFiltro(e.target.value as 'abertas' | 'todas')}>
          <option value="abertas">Em aberto</option>
          <option value="todas">Todas (últimas 300)</option>
        </select>
        <p className="text-xs text-[#A0A0B2]">Denúncias feitas ao tocar num rosto do &quot;Eu vou&quot;. Quem denunciou não é mostrado para a pessoa denunciada.</p>
      </div>
      {carregando ? (
        <Loader2 className="animate-spin text-[#E1306C] mx-auto my-6" size={20} />
      ) : erro ? (
        <p className="text-sm text-amber-400">{erro}</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-[#626274]">Nenhuma denúncia neste filtro.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lista.map((d) => {
            const s = st(d.status);
            const foto = d.denunciado_foto ? fotos[d.denunciado_foto] || (/^https?:/.test(d.denunciado_foto) ? d.denunciado_foto : null) : null;
            return (
              <li key={d.id} className="bg-[#161520] border border-[#232230] rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto} alt="" className="w-12 h-12 rounded-full object-cover border border-[#232230]" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#2A1530] flex items-center justify-center font-bold">{(d.denunciado_nome || '?').charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-sm truncate">{d.denunciado_nome || 'Sem nome'}</b>
                      <span className="text-[10px] font-bold" style={{ color: s.cor }}>{s.rotulo}</span>
                    </div>
                    <p className="text-xs text-[#E1306C] font-bold mt-0.5">{MOTIVO[d.motivo] || d.motivo}</p>
                    <p className="text-xs text-[#A0A0B2] mt-0.5">{d.onde}{d.data ? ` · ${d.data.split('-').reverse().join('/')}` : ''} · {dh(d.created_at)}</p>
                    <p className="text-xs text-[#A0A0B2]">Denunciado por: {d.reporter_nome || 'conta apagada'} · {d.denuncias_contra} denúncia(s) contra esta pessoa</p>
                    {d.denunciado_suspenso && <p className="text-xs text-amber-400 font-bold mt-1">Fora da comunidade</p>}
                  </div>
                </div>
                {!!d.descricao && <p className="text-sm whitespace-pre-wrap bg-[#12121A] rounded-xl p-3">{d.descricao}</p>}
                <textarea className={campo} rows={2} maxLength={500} placeholder="Anotação da equipe (só a equipe vê)" value={notas[d.id] ?? ''} onChange={(e) => setNotas((n) => ({ ...n, [d.id]: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  {STATUS.filter((x) => x.v !== 'aberta').map((x) => (
                    <button key={x.v} disabled={salvando === d.id} onClick={() => void mudarStatus(d, x.v)}
                      className={`text-xs font-bold rounded-lg px-3 py-2 border ${d.status === x.v ? 'border-transparent text-black' : 'border-[#232230] hover:border-[#3a3950]'}`}
                      style={d.status === x.v ? { background: x.cor } : undefined}>
                      {x.rotulo}
                    </button>
                  ))}
                  <button disabled={salvando === d.id} onClick={() => void suspender(d, !d.denunciado_suspenso)}
                    className="ml-auto flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 border border-[#232230] hover:border-[#E1306C]">
                    {d.denunciado_suspenso ? <><ShieldCheck size={14} /> Devolver à comunidade</> : <><ShieldOff size={14} /> Tirar da comunidade</>}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
