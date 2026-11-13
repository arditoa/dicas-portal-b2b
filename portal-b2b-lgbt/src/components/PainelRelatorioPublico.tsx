'use client';
// Relatório de público (migração 114) — /admin › Relatório de público.
// A equipe escolhe a casa, uma festa OU um período, gera e baixa em PDF (janela de impressão › "Salvar como PDF")
// para enviar à marca patrocinadora. Só números somados e anônimos: com menos de 30 pessoas, "dados insuficientes";
// grupos com menos de 10 viram "menos de 10"; o resto vem arredondado de 5 em 5. Nunca nomes.
import { FileDown, Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Num = number | string;
type Grupo = { valor: string; n: Num };
type Rel = {
  status: 'ok' | 'dados_insuficientes';
  local: { id: string; nome: string };
  evento: { id: string; titulo: string; data_inicio: string } | null;
  de: string; ate: string; gerado_em: string;
  pessoas?: Num; novas?: Num; recorrentes?: Num;
  idade?: Record<string, Num>;
  chegada_hora?: { hora: number; n: Num }[];
  chegada_dia?: { dia: number; n: Num }[];
  gostos?: { musica: Grupo[]; experiencia: Grupo[]; responderam: Num };
  genero?: { consentiram: Num; grupos: Grupo[]; outros_ocultos: boolean };
  totais?: Record<string, Num>;
};
type Local = { id: string; nome: string; cidade: string | null };
type Ev = { id: string; titulo: string; data_inicio: string };

const IDADES = ['18–24', '25–34', '35–44', '45+'];
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TOTAIS: [string, string][] = [
  ['checkins', 'Check-ins confirmados'], ['lista_pedidos', 'Pedidos na Lista VIP'], ['lista_aprovados', 'Aprovados na Lista VIP'],
  ['lista_entraram', 'Entraram pela Lista VIP'], ['cupons_usados', 'Cupons usados'], ['eu_vou', 'Marcaram "Eu vou"'],
];
const hojeBR = (desloc = 0) => new Date(Date.now() + desloc * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const br = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const t = (n: Num | undefined) => (n == null ? '—' : typeof n === 'number' ? n.toLocaleString('pt-BR') : n);
const bar = (n: Num | undefined) => (typeof n === 'number' ? n : n ? 5 : 0);
const pct = (n: Num | undefined, tot: Num | undefined) => (typeof n === 'number' && typeof tot === 'number' && tot > 0 ? ` (${Math.round((n / tot) * 100)}%)` : '');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function linhasBarras(itens: { rotulo: string; n: Num | undefined; extra?: string }[]) {
  const max = Math.max(1, ...itens.map((i) => bar(i.n)));
  return itens.map((i) => ({ ...i, largura: Math.max(2, Math.round((bar(i.n) / max) * 100)), fraca: typeof i.n !== 'number' }));
}

function Barras({ itens }: { itens: { rotulo: string; n: Num | undefined; extra?: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {linhasBarras(itens).map((i) => (
        <div key={i.rotulo} className="flex items-center gap-2 text-xs">
          <span className="w-32 text-[#A0A0B2] truncate">{i.rotulo}</span>
          <div className="flex-1 h-2.5 bg-[#232230] rounded-full overflow-hidden"><div className={`h-full bg-[#E1306C] rounded-full ${i.fraca ? 'opacity-30' : ''}`} style={{ width: `${i.largura}%` }} /></div>
          <b className="w-32 text-right">{t(i.n)}{i.extra}</b>
        </div>
      ))}
      {!itens.length && <p className="text-xs text-[#626274]">Ainda poucas respostas.</p>}
    </div>
  );
}

export default function PainelRelatorioPublico() {
  const [busca, setBusca] = useState('');
  const [locais, setLocais] = useState<Local[]>([]);
  const [local, setLocal] = useState<Local | null>(null);
  const [eventos, setEventos] = useState<Ev[]>([]);
  const [modo, setModo] = useState<'periodo' | 'festa'>('periodo');
  const [evento, setEvento] = useState('');
  const [de, setDe] = useState(hojeBR(-89));
  const [ate, setAte] = useState(hojeBR());
  const [para, setPara] = useState('');
  const [rel, setRel] = useState<Rel | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const q = busca.trim();
    if (q.length < 2) { setLocais([]); return; }
    const id = setTimeout(async () => {
      const { data } = await supabase.from('locais').select('id, nome, cidade').ilike('nome', `%${q.replace(/[%,()]/g, '')}%`).order('nome').limit(12);
      setLocais((data as Local[]) || []);
    }, 250);
    return () => clearTimeout(id);
  }, [busca]);

  useEffect(() => {
    setEventos([]); setEvento(''); setRel(null);
    if (!local) return;
    void (async () => {
      const { data } = await supabase.from('eventos').select('id, titulo, data_inicio').eq('local_id', local.id)
        .neq('status', 'cancelado').lt('data_inicio', new Date().toISOString()).order('data_inicio', { ascending: false }).limit(40);
      setEventos((data as Ev[]) || []);
    })();
  }, [local]);

  async function gerar() {
    if (!local) return setErro('Escolha a casa.');
    if (modo === 'festa' && !evento) return setErro('Escolha a festa.');
    setGerando(true); setErro(''); setRel(null);
    const { data, error } = await supabase.rpc('relatorio_publico', {
      p_local: local.id, p_evento: modo === 'festa' ? evento : null, p_de: modo === 'periodo' ? de : null, p_ate: modo === 'periodo' ? ate : null,
    });
    setGerando(false);
    if (error) return setErro(/could not find the function/i.test(error.message) ? 'Rode a migração 114 no Supabase para ligar o relatório.' : error.message);
    setRel(data as Rel);
  }

  function baixarPdf() {
    if (!rel || rel.status !== 'ok') return;
    const w = window.open('', '_blank');
    if (!w) return alert('O navegador bloqueou a janela. Libere pop-ups para este site.');
    const blocoBarras = (titulo: string, itens: { rotulo: string; n: Num | undefined; extra?: string }[], nota?: string) => `
      <h2>${esc(titulo)}</h2>${nota ? `<p class="nota">${esc(nota)}</p>` : ''}
      ${itens.length ? `<table class="barras">${linhasBarras(itens).map((i) => `<tr><td class="r">${esc(i.rotulo)}</td><td class="b"><div class="${i.fraca ? 'f' : ''}" style="width:${i.largura}%"></div></td><td class="v">${esc(t(i.n))}${esc(i.extra || '')}</td></tr>`).join('')}</table>` : '<p class="nota">Ainda poucas respostas (grupos com menos de 10 pessoas não aparecem).</p>'}`;
    const horas = (rel.chegada_hora || []).filter((h) => bar(h.n) > 0 || h.hora >= 18 || h.hora <= 4)
      .sort((a, b) => ((a.hora + 8) % 24) - ((b.hora + 8) % 24)).map((h) => ({ rotulo: `${String(h.hora).padStart(2, '0')}h`, n: h.n }));
    const escopo = rel.evento ? `Festa: ${rel.evento.titulo} (${br(rel.evento.data_inicio)})` : `Período: ${br(rel.de)} a ${br(rel.ate)}`;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de público — ${esc(rel.local.nome)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;max-width:780px;margin:28px auto;color:#15131c;line-height:1.45;padding:0 16px}
.topo{border-bottom:3px solid #E1306C;padding-bottom:10px;margin-bottom:14px}.marca{font-weight:900;color:#E1306C;letter-spacing:.5px;font-size:12px}
h1{font-size:22px;margin:4px 0}h2{font-size:15px;margin:22px 0 6px;color:#3D3BEF}.sub{color:#555;font-size:13px}
.cards{display:flex;gap:10px;margin-top:12px}.card{flex:1;border:1px solid #ddd;border-radius:10px;padding:10px;text-align:center}
.card b{display:block;font-size:22px}.card span{font-size:11px;color:#555}
table{width:100%;border-collapse:collapse}.barras td{padding:3px 6px;font-size:12px}.barras .r{width:150px;color:#333}.barras .v{width:130px;text-align:right;font-weight:bold}
.barras .b div{height:10px;background:#E1306C;border-radius:5px}.barras .b div.f{opacity:.3}
.grade td{border:1px solid #ddd;padding:8px;font-size:13px}.grade td.v{font-weight:bold;text-align:right;width:120px}
.nota{font-size:11px;color:#666;margin:2px 0 6px}.rodape{margin-top:26px;border-top:1px solid #ddd;padding-top:10px;font-size:10.5px;color:#666}
@media print{body{margin:0 auto}h2{break-after:avoid}table{break-inside:avoid}}
</style></head><body>
<div class="topo"><div class="marca">DICAS LGBT+ · RELATÓRIO DE PÚBLICO</div>
<h1>${esc(rel.local.nome)}</h1><div class="sub">${esc(escopo)}${para.trim() ? ` · Para: ${esc(para.trim())}` : ''}</div>
<div class="sub">Gerado em ${esc(new Date(rel.gerado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}</div></div>
<div class="cards"><div class="card"><b>${esc(t(rel.pessoas))}</b><span>pessoas únicas</span></div>
<div class="card"><b>${esc(t(rel.novas))}</b><span>vieram pela 1ª vez</span></div>
<div class="card"><b>${esc(t(rel.recorrentes))}</b><span>voltaram</span></div></div>
${blocoBarras('Faixa de idade', [...IDADES.map((k) => ({ rotulo: k, n: rel.idade?.[k], extra: pct(rel.idade?.[k], rel.pessoas) })), { rotulo: 'Sem data de nascimento', n: rel.idade?.sem_info }])}
${blocoBarras('Horário de chegada', horas, 'Check-ins confirmados e entradas pela Lista VIP, horário de Brasília.')}
${blocoBarras('Dia da semana', (rel.chegada_dia || []).map((d) => ({ rotulo: DIAS[d.dia], n: d.n })))}
${blocoBarras('Gosto musical', (rel.gostos?.musica || []).map((g) => ({ rotulo: g.valor, n: g.n })), `De quem preencheu os gostos no app (${t(rel.gostos?.responderam)} pessoas).`)}
${blocoBarras('O que buscam', (rel.gostos?.experiencia || []).map((g) => ({ rotulo: g.valor, n: g.n })))}
${blocoBarras('Identidade de gênero', (rel.genero?.grupos || []).map((g) => ({ rotulo: g.valor, n: g.n })), `Só de quem autorizou expressamente, de forma anônima e somada (${t(rel.genero?.consentiram)} pessoas).${rel.genero?.outros_ocultos ? ' Identidades com menos de 10 pessoas ficam de fora.' : ''}`)}
<h2>Movimento</h2><table class="grade">${TOTAIS.map(([k, r]) => `<tr><td>${esc(r)}</td><td class="v">${esc(t(rel.totais?.[k]))}</td></tr>`).join('')}</table>
<div class="rodape">Dados somados e anônimos do app Dicas LGBT+. Nenhum nome, contato ou dado individual é compartilhado. Com menos de 30 pessoas no período o relatório não é gerado; grupos com menos de 10 pessoas aparecem como "menos de 10" e os demais números são arredondados de 5 em 5. Orientação sexual nunca é usada. Identidade de gênero só de quem deu consentimento específico.</div>
<script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  }

  const campo = 'w-full bg-[#12121A] border border-[#232230] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#626274] focus:outline-none focus:border-[#E1306C]';

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-4 flex flex-col gap-3 h-fit">
        <label className="text-xs font-bold text-[#A0A0B2]">Casa</label>
        {local ? (
          <div className="flex items-center justify-between gap-2 border border-[#E1306C] rounded-xl px-3 py-2.5">
            <span className="text-sm font-bold truncate">{local.nome}{local.cidade ? ` · ${local.cidade}` : ''}</span>
            <button className="text-xs text-[#A0A0B2] hover:text-white" onClick={() => { setLocal(null); setBusca(''); }}>Trocar</button>
          </div>
        ) : (
          <>
            <div className="relative"><Search size={14} className="absolute left-3 top-3 text-[#626274]" />
              <input className={`${campo} pl-8`} placeholder="Buscar a casa pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
            {locais.map((l) => (
              <button key={l.id} onClick={() => setLocal(l)} className="text-left text-sm border border-[#232230] hover:border-[#3a3950] rounded-xl px-3 py-2">
                {l.nome}<span className="text-xs text-[#626274]">{l.cidade ? ` · ${l.cidade}` : ''}</span>
              </button>
            ))}
          </>
        )}
        <label className="text-xs font-bold text-[#A0A0B2] mt-2">O quê</label>
        <div className="flex gap-2">
          {(['periodo', 'festa'] as const).map((m) => (
            <button key={m} onClick={() => setModo(m)} className={`flex-1 text-xs font-bold rounded-lg px-3 py-2 border ${modo === m ? 'border-[#E1306C] bg-[#E1306C]/10' : 'border-[#232230]'}`}>
              {m === 'periodo' ? 'Um período' : 'Uma festa'}
            </button>
          ))}
        </div>
        {modo === 'periodo' ? (
          <div className="flex gap-2">
            <input type="date" className={campo} value={de} onChange={(e) => setDe(e.target.value)} />
            <input type="date" className={campo} value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        ) : (
          <select className={campo} value={evento} onChange={(e) => setEvento(e.target.value)} disabled={!local}>
            <option value="">{local ? (eventos.length ? 'Escolha a festa' : 'Nenhuma festa que já aconteceu') : 'Escolha a casa primeiro'}</option>
            {eventos.map((e) => <option key={e.id} value={e.id}>{br(e.data_inicio)} · {e.titulo}</option>)}
          </select>
        )}
        <label className="text-xs font-bold text-[#A0A0B2] mt-2">Para (opcional, sai no PDF)</label>
        <input className={campo} placeholder="Ex.: marca patrocinadora" value={para} maxLength={80} onChange={(e) => setPara(e.target.value)} />
        <button onClick={() => void gerar()} disabled={gerando || !local} className="mt-2 bg-[#E1306C] disabled:opacity-50 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2">
          {gerando && <Loader2 size={14} className="animate-spin" />} Gerar relatório
        </button>
        {!!erro && <p className="text-xs text-amber-400">{erro}</p>}
        <p className="text-[11px] text-[#626274] leading-relaxed">Só números somados. Com menos de 30 pessoas, não gera. Grupos com menos de 10 viram &quot;menos de 10&quot;; o resto é arredondado de 5 em 5. Nunca nomes.</p>
      </div>

      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6 min-h-[300px]">
        {!rel ? (
          <p className="text-sm text-[#626274]">Escolha a casa e o período (ou a festa) e toque em Gerar relatório.</p>
        ) : rel.status !== 'ok' ? (
          <div className="text-center py-10">
            <p className="font-bold">Dados insuficientes</p>
            <p className="text-sm text-[#A0A0B2] mt-1">Menos de 30 pessoas em {rel.evento ? 'esta festa' : 'este período'}. Para proteger cada cliente, o relatório não é gerado. Tente um período maior.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{rel.local.nome}</h3>
                <p className="text-xs text-[#A0A0B2]">{rel.evento ? `${rel.evento.titulo} · ${br(rel.evento.data_inicio)}` : `${br(rel.de)} a ${br(rel.ate)}`}</p>
              </div>
              <button onClick={baixarPdf} className="flex items-center gap-2 text-xs font-bold border border-[#232230] rounded-lg px-3 py-2 hover:border-[#E1306C]">
                <FileDown size={14} /> Baixar PDF
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['pessoas únicas', rel.pessoas], ['1ª vez', rel.novas], ['voltaram', rel.recorrentes]].map(([r, n]) => (
                <div key={r as string} className="bg-[#12121A] rounded-xl p-3 text-center"><b className="text-xl block">{t(n as Num)}</b><span className="text-[11px] text-[#A0A0B2]">{r as string}</span></div>
              ))}
            </div>
            <div><h4 className="text-sm font-bold mb-2">Idade</h4><Barras itens={[...IDADES.map((k) => ({ rotulo: k, n: rel.idade?.[k], extra: pct(rel.idade?.[k], rel.pessoas) })), { rotulo: 'Sem data', n: rel.idade?.sem_info }]} /></div>
            <div><h4 className="text-sm font-bold mb-2">Dia da semana</h4><Barras itens={(rel.chegada_dia || []).map((d) => ({ rotulo: DIAS[d.dia], n: d.n }))} /></div>
            <div><h4 className="text-sm font-bold mb-2">Gosto musical</h4><Barras itens={(rel.gostos?.musica || []).map((g) => ({ rotulo: g.valor, n: g.n }))} /></div>
            <div><h4 className="text-sm font-bold mb-2">Identidade de gênero <span className="text-[11px] text-[#626274] font-normal">(só quem autorizou: {t(rel.genero?.consentiram)})</span></h4><Barras itens={(rel.genero?.grupos || []).map((g) => ({ rotulo: g.valor, n: g.n }))} /></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TOTAIS.map(([k, r]) => <div key={k} className="bg-[#12121A] rounded-xl p-3"><b className="block">{t(rel.totais?.[k])}</b><span className="text-[11px] text-[#A0A0B2]">{r}</span></div>)}
            </div>
            <p className="text-[11px] text-[#626274]">O PDF traz também horário de chegada e &quot;o que buscam&quot;.</p>
          </div>
        )}
      </div>
    </div>
  );
}
