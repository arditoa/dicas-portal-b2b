'use client';
// Rodada 73 — aba "Avisos" do /admin: envio manual de notificações push.
// Tabelas/funções da migration 044; envio pela Edge Function "enviar-push"
// (só admin). Começa sempre em modo TESTE (só para os seus aparelhos).
import { Loader2, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Tipo = 'festas' | 'cupons' | 'lembretes' | 'novidades';
const TIPOS: { v: Tipo; rotulo: string; dica: string }[] = [
  { v: 'festas', rotulo: 'Festas e agenda', dica: 'Festa em destaque, evento do dia ou do fim de semana.' },
  { v: 'cupons', rotulo: 'Cupons e ofertas', dica: 'Mensagem promocional de cupom ou parceiro.' },
  { v: 'lembretes', rotulo: 'Lembretes', dica: 'Lembrete de evento salvo, Lista VIP, cupom a vencer.' },
  { v: 'novidades', rotulo: 'Novidades do app', dica: 'Lançamento, novas categorias, avisos gerais.' },
];
const DESTINOS = [
  { v: '', rotulo: 'Abrir o app (início)' },
  { v: '/(tabs)/events', rotulo: 'Aba Eventos' },
  { v: '/(tabs)/tourism', rotulo: 'Aba Trip' },
  { v: '/(tabs)/explore', rotulo: 'Aba Mapa' },
  { v: '/coupons', rotulo: 'Meus cupons' },
  { v: '/roteiros', rotulo: 'Roteiros' },
];

type Envio = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  so_teste: boolean;
  total: number;
  aceitos: number;
  erros: number;
  criado_em: string;
};

export default function PainelPush() {
  const [tipo, setTipo] = useState<Tipo>('festas');
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [rota, setRota] = useState('');
  const [soTeste, setSoTeste] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [resumo, setResumo] = useState<Record<string, number>>({});
  const [historico, setHistorico] = useState<Envio[]>([]);

  const carregar = useCallback(async () => {
    const [r, h] = await Promise.all([
      supabase.rpc('push_resumo'),
      supabase.from('push_envios').select('id,tipo,titulo,corpo,so_teste,total,aceitos,erros,criado_em').order('criado_em', { ascending: false }).limit(15),
    ]);
    const mapa: Record<string, number> = {};
    (r.data ?? []).forEach((x: { tipo: string; aparelhos: number }) => { mapa[x.tipo] = Number(x.aparelhos); });
    setResumo(mapa);
    setHistorico((h.data as Envio[]) ?? []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function enviar() {
    setMsg(null);
    if (titulo.trim().length < 2 || corpo.trim().length < 2) {
      setMsg({ ok: false, texto: 'Preencha o título e a mensagem.' });
      return;
    }
    if (!soTeste) {
      const n = resumo[tipo] ?? 0;
      const ok = window.confirm(
        `Enviar para ${n} aparelho(s) que aceitaram "${TIPOS.find((t) => t.v === tipo)?.rotulo}"?\n\n${titulo}\n${corpo}\n\nNão dá para desfazer.`
      );
      if (!ok) return;
    }
    setEnviando(true);
    const { data, error } = await supabase.functions.invoke('enviar-push', {
      body: { tipo, titulo: titulo.trim(), corpo: corpo.trim(), rota: rota || undefined, so_teste: soTeste },
    });
    setEnviando(false);
    if (error || !data?.ok) {
      let detalhe = (data as { erro?: string } | null)?.erro;
      if (!detalhe && error && 'context' in error) {
        try { detalhe = (await (error as unknown as { context: Response }).context.json()).erro; } catch { /* ignora */ }
      }
      setMsg({ ok: false, texto: detalhe || 'Não foi possível enviar agora. Confira se a função "enviar-push" foi publicada no Supabase.' });
      return;
    }
    setMsg({ ok: true, texto: `Enviado: ${data.aceitos} aceito(s) de ${data.total}${data.erros ? `, ${data.erros} com erro` : ''}.` });
    if (!soTeste) { setTitulo(''); setCorpo(''); }
    carregar();
  }

  const campo = 'w-full bg-[#12121A] border border-[#232230] rounded-xl px-4 py-3 text-sm text-white placeholder-[#626274] focus:outline-none focus:border-[#E1306C]';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-[#A0A0B2]">Tipo de aviso</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {TIPOS.map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => setTipo(t.v)}
                className={`text-left rounded-xl border px-3 py-2.5 transition ${tipo === t.v ? 'border-[#E1306C] bg-[#E1306C]/10' : 'border-[#232230] hover:border-[#3a3950]'}`}
              >
                <span className="block text-sm font-bold">{t.rotulo}</span>
                <span className="block text-[11px] text-[#A0A0B2] mt-0.5">{resumo[t.v] ?? 0} aparelho(s) aceitaram</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#626274] mt-2">{TIPOS.find((t) => t.v === tipo)?.dica}</p>
        </div>

        <div>
          <label className="text-xs font-bold text-[#A0A0B2]">Título ({titulo.length}/60)</label>
          <input className={`${campo} mt-1.5`} maxLength={60} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Sábado tem festa!" />
        </div>
        <div>
          <label className="text-xs font-bold text-[#A0A0B2]">Mensagem ({corpo.length}/170)</label>
          <textarea className={`${campo} mt-1.5 h-24`} maxLength={170} value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder="Texto curto e direto. Sem promessas que você não possa cumprir." />
        </div>
        <div>
          <label className="text-xs font-bold text-[#A0A0B2]">Ao tocar, abrir</label>
          <select className={`${campo} mt-1.5`} value={rota} onChange={(e) => setRota(e.target.value)}>
            {DESTINOS.map((d) => <option key={d.v} value={d.v}>{d.rotulo}</option>)}
          </select>
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="mt-1" checked={soTeste} onChange={(e) => setSoTeste(e.target.checked)} />
          <span>
            <b>Teste: enviar só para os meus aparelhos</b>
            <span className="block text-[11px] text-[#A0A0B2]">Deixe marcado para ver como chega no seu celular. Desmarque para enviar de verdade.</span>
          </span>
        </label>

        {msg && <p role="alert" className={`text-sm ${msg.ok ? 'text-[#4CAF7D]' : 'text-red-400'}`}>{msg.texto}</p>}

        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="inline-flex items-center justify-center gap-2 bg-[#E1306C] hover:opacity-90 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-xl transition"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {soTeste ? 'Enviar teste' : 'Enviar para todos que aceitaram'}
        </button>
      </div>

      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
        <h3 className="font-bold text-sm mb-3">Últimos envios</h3>
        {historico.length === 0 && <p className="text-xs text-[#626274]">Nenhum envio ainda.</p>}
        <ul className="flex flex-col gap-3">
          {historico.map((e) => (
            <li key={e.id} className="text-xs border-b border-[#232230] pb-3 last:border-0">
              <p className="font-bold text-white">{e.titulo}</p>
              <p className="text-[#A0A0B2]">{e.corpo}</p>
              <p className="text-[#626274] mt-1">
                {new Date(e.criado_em).toLocaleString('pt-BR')} · {e.so_teste ? 'teste' : e.tipo} · {e.aceitos}/{e.total} aceitos{e.erros ? ` · ${e.erros} erros` : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
