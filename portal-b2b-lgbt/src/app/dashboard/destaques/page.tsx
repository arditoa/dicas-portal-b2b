'use client';
// "Destaques e resultados" — a tela que mostra ao parceiro o valor de estar em destaque:
// exposições/toques dos últimos 30 dias, uso das ofertas do mês e (para Fundadores) a comunicação
// escrita pela equipe, que ele pode ajustar. Quem ainda não paga vê o que está perdendo + CTA de upgrade.
// Tabelas/funções: migration 059 (uso_ofertas_mes, resumo_vitrine_local, fundador_comunicacao, categoria_patrocinio).
import { ArrowLeft, Check, Loader2, Save, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const label = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1.5';
const card = 'bg-[#161520] border border-[#232230] rounded-2xl p-5 mb-6';

type Local = { id: string; nome: string; plano_comercial: string; plano_comercial_status: string };
type Resumo = { secao: string; exibicoes: number; cliques: number };
type Com = { headline: string; texto: string; oferta: string; cta: string; destino: string; escrito_por: string };
type Patro = { categoria: string; tag: string; titulo: string; subtitulo: string; cta: string; destino: string; cor1: string; cor2: string };

const NOME_SECAO: Record<string, string> = { destaques: 'Destaques da categoria', patrocinio: 'Banner patrocinador', oferta: 'Ofertas e benefícios', home: 'Home do app' };
const rotuloSecao = (s: string) => {
  const [tipo, cat] = s.split(':');
  return `${NOME_SECAO[tipo] || tipo}${cat ? ` · ${cat}` : ''}`;
};

export default function DestaquesPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [local, setLocal] = useState<Local | null>(null);
  const [resumo, setResumo] = useState<Resumo[]>([]);
  const [uso, setUso] = useState<{ limite: number | null; usadas: number } | null>(null);
  const [com, setCom] = useState<Com | null>(null);
  const [patro, setPatro] = useState<Patro | null>(null);
  const [cham, setCham] = useState<{ chamada: string; cta: string }>({ chamada: '', cta: 'Conhecer' });
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { router.push('/login'); return; }
    const { data: l } = await supabase.from('locais').select('id, nome, plano_comercial, plano_comercial_status').eq('owner_id', u.user.id).maybeSingle();
    if (!l) { router.push('/dashboard'); return; }
    setLocal(l as Local);

    const { data: r } = await supabase.rpc('resumo_vitrine_local', { p_local_id: l.id, p_dias: 30 });
    setResumo(((r as any[]) || []).map((x) => ({ secao: x.secao, exibicoes: Number(x.exibicoes), cliques: Number(x.cliques) })));

    const { data: o } = await supabase.rpc('uso_ofertas_mes', { p_local_id: l.id });
    const lo = Array.isArray(o) ? o[0] : o;
    if (lo) setUso({ limite: lo.limite ?? null, usadas: Number(lo.usadas) || 0 });

    const { data: c } = await supabase.from('fundador_comunicacao').select('headline, texto, oferta, cta, destino, escrito_por').eq('local_id', l.id).maybeSingle();
    if (c) setCom({ headline: c.headline || '', texto: c.texto || '', oferta: c.oferta || '', cta: c.cta || 'Conhecer', destino: c.destino || '', escrito_por: c.escrito_por });

    const { data: ch } = await supabase.from('destaque_chamada').select('chamada, cta').eq('local_id', l.id).maybeSingle();
    if (ch) setCham({ chamada: (ch as any).chamada || '', cta: (ch as any).cta || 'Conhecer' });

    const { data: p } = await supabase.from('categoria_patrocinio').select('categoria, tag, titulo, subtitulo, cta, destino, cor1, cor2').eq('local_id', l.id).maybeSingle();
    if (p) setPatro({ ...(p as any), subtitulo: (p as any).subtitulo || '' });
    setCarregando(false);
  }, [router]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvarCom = async () => {
    if (!local || !com) return;
    setErro(''); setAviso('');
    const { error } = await supabase.from('fundador_comunicacao').update({
      headline: com.headline.trim() || null, texto: com.texto.trim() || null, oferta: com.oferta.trim() || null,
      cta: com.cta.trim() || 'Conhecer', destino: com.destino.trim(),
    }).eq('local_id', local.id);
    if (error) setErro(error.message); else setAviso('Comunicação atualizada — já aparece no app.');
  };

  const salvarChamada = async () => {
    if (!local) return;
    setErro(''); setAviso('');
    if (!cham.chamada.trim()) { setErro('Escreva a chamada do seu banner.'); return; }
    const { error } = await supabase.from('destaque_chamada').upsert({ local_id: local.id, chamada: cham.chamada.trim(), cta: cham.cta.trim() || 'Conhecer' });
    if (error) setErro(error.message); else setAviso('Chamada salva — o banner já usa esse texto.');
  };

  const salvarPatro = async () => {
    if (!local || !patro) return;
    setErro(''); setAviso('');
    const { error } = await supabase.from('categoria_patrocinio').update({
      tag: patro.tag.trim() || 'PATROCINADOR DA CATEGORIA', titulo: patro.titulo.trim(), subtitulo: patro.subtitulo.trim() || null,
      cta: patro.cta.trim() || 'Saiba mais', destino: patro.destino.trim(), cor1: patro.cor1, cor2: patro.cor2,
    }).eq('local_id', local.id);
    if (error) setErro(error.message); else setAviso('Banner atualizado — já aparece no app.');
  };

  if (carregando || !local) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#E1306C]" /></div>;
  }

  const pago = local.plano_comercial !== 'freemium' && local.plano_comercial_status === 'ativo';
  const totalExib = resumo.reduce((a, x) => a + x.exibicoes, 0);
  const totalCliq = resumo.reduce((a, x) => a + x.cliques, 0);
  const ehFundador = !!com || local.plano_comercial === 'fundador';

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 text-white">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-6"><ArrowLeft size={14} /> Voltar</Link>
      <h1 className="text-2xl font-black">Destaques e resultados</h1>
      <p className="text-[#A0A0B2] text-xs mt-1 mb-6">Quantas pessoas viram e tocaram no {local.nome} nas áreas de destaque do app, nos últimos 30 dias.</p>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4">{erro}</div>}
      {aviso && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs mb-4 flex items-center gap-2"><Check size={14} /> {aviso}</div>}

      {!pago && (
        <div className="rounded-2xl p-5 mb-6 border border-[#E1306C]/40" style={{ background: 'linear-gradient(135deg,#2A1230,#161520)' }}>
          <div className="flex items-center gap-2 mb-2"><Sparkles size={16} className="text-[#FFD54F]" /><b className="text-sm">Seu local ainda não está em destaque</b></div>
          <p className="text-xs text-[#C9C9D6] mb-4">Nos planos pagos o {local.nome} aparece no topo das categorias, no rodízio da Home e pode publicar ofertas que as pessoas procuram primeiro. Veja abaixo o que já foi medido e o que os destaques entregam.</p>
          <Link href="/planos" className="inline-block bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition">Quero aparecer em destaque</Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className={card + ' !mb-0 text-center'}><p className="text-2xl font-black">{totalExib}</p><p className="text-[11px] text-[#A0A0B2]">Exibições</p></div>
        <div className={card + ' !mb-0 text-center'}><p className="text-2xl font-black">{totalCliq}</p><p className="text-[11px] text-[#A0A0B2]">Toques</p></div>
        <div className={card + ' !mb-0 text-center'}><p className="text-2xl font-black">{totalExib ? `${((totalCliq / totalExib) * 100).toFixed(1)}%` : '—'}</p><p className="text-[11px] text-[#A0A0B2]">Taxa de toque</p></div>
      </div>

      <div className={card}>
        <h2 className="text-sm font-black mb-3 flex items-center gap-2"><TrendingUp size={15} /> Onde você apareceu</h2>
        {resumo.length === 0 ? (
          <p className="text-xs text-[#626274]">{pago ? 'Ainda sem exibições medidas. Assim que seu local aparecer nos destaques, os números entram aqui.' : 'Sem destaques medidos porque o plano ainda é gratuito.'}</p>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[#8888A0]"><th className="py-1">Área</th><th className="text-right">Exibições</th><th className="text-right">Toques</th></tr></thead>
            <tbody>{resumo.map((x) => (<tr key={x.secao} className="border-t border-[#232230]"><td className="py-1.5">{rotuloSecao(x.secao)}</td><td className="text-right">{x.exibicoes}</td><td className="text-right">{x.cliques}</td></tr>))}</tbody>
          </table>
        )}
      </div>

      <div className={card}>
        <h2 className="text-sm font-black mb-1">Chamada do seu banner de destaque</h2>
        <p className="text-xs text-[#A0A0B2] mb-3">No banner que gira no topo das categorias <b>seu nome não aparece</b>: aparece uma chamada que dá vontade de conhecer. Ex.: &ldquo;Conheça o nosso queridinho drink de Lichia&rdquo;. Quem toca vai para a página do {local.nome}.</p>
        <div className="space-y-3">
          <div><label className={label}>Chamada (até 90 caracteres)</label><input className={input} maxLength={90} value={cham.chamada} onChange={(e) => setCham({ ...cham, chamada: e.target.value })} /></div>
          <div><label className={label}>Texto do botão</label><input className={input} maxLength={24} value={cham.cta} onChange={(e) => setCham({ ...cham, cta: e.target.value })} /></div>
          <button onClick={salvarChamada} className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2"><Save size={14} /> Salvar chamada</button>
          {!pago && <p className="text-[11px] text-[#A0A0B2]">O banner só gira para planos pagos — a chamada fica guardada para quando o plano for ativado.</p>}
        </div>
      </div>

      <div className={card}>
        <h2 className="text-sm font-black mb-1">Ofertas do mês</h2>
        <p className="text-xs text-[#A0A0B2] mb-3">
          {uso === null ? 'Carregando…' : uso.limite === null ? `Sem limite mensal no seu plano. Você publicou ${uso.usadas} neste mês.` : `Você usou ${uso.usadas} de ${uso.limite} ofertas deste mês.`}
        </p>
        <Link href="/dashboard/cupons" className="inline-block bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition">Gerenciar ofertas</Link>
      </div>

      {ehFundador && (
        <div className={card}>
          <h2 className="text-sm font-black mb-1">Comunicação do Membro Fundador</h2>
          <p className="text-xs text-[#A0A0B2] mb-4">Nossa equipe de comunicação escreve este texto para deixar o seu negócio o mais atrativo possível. Você pode ajustar quando quiser.</p>
          {!com ? (
            <p className="text-xs text-[#626274]">A equipe ainda está preparando o texto do {local.nome}.</p>
          ) : (
            <div className="space-y-3">
              <div><label className={label}>Frase de destaque</label><input className={input} maxLength={90} value={com.headline} onChange={(e) => setCom({ ...com, headline: e.target.value })} /></div>
              <div><label className={label}>Texto de apoio</label><textarea className={input} rows={3} maxLength={280} value={com.texto} onChange={(e) => setCom({ ...com, texto: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><label className={label}>Oferta do momento</label><input className={input} maxLength={90} value={com.oferta} onChange={(e) => setCom({ ...com, oferta: e.target.value })} /></div>
                <div><label className={label}>Texto do botão</label><input className={input} maxLength={24} value={com.cta} onChange={(e) => setCom({ ...com, cta: e.target.value })} /></div>
              </div>
              <button onClick={salvarCom} className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2"><Save size={14} /> Salvar</button>
            </div>
          )}
        </div>
      )}

      {patro && (
        <div className={card}>
          <h2 className="text-sm font-black mb-1">Seu banner de patrocinador ({patro.categoria})</h2>
          <p className="text-xs text-[#A0A0B2] mb-4">Fica logo abaixo dos destaques da categoria. Ajuste o texto, o botão e as cores; imagem, período e categoria são definidos pela equipe.</p>
          <div className="space-y-3">
            <div className="rounded-xl p-4" style={{ background: `linear-gradient(135deg, ${patro.cor1}, ${patro.cor2})` }}>
              <p className="text-[10px] font-black tracking-wider opacity-80">{patro.tag}</p>
              <p className="text-base font-black">{patro.titulo || 'Seu título aqui'}</p>
              {patro.subtitulo && <p className="text-xs opacity-90">{patro.subtitulo}</p>}
            </div>
            <div><label className={label}>Título</label><input className={input} maxLength={90} value={patro.titulo} onChange={(e) => setPatro({ ...patro, titulo: e.target.value })} /></div>
            <div><label className={label}>Subtítulo</label><input className={input} maxLength={120} value={patro.subtitulo} onChange={(e) => setPatro({ ...patro, subtitulo: e.target.value })} /></div>
            <div className="grid md:grid-cols-3 gap-3">
              <div><label className={label}>Botão</label><input className={input} maxLength={24} value={patro.cta} onChange={(e) => setPatro({ ...patro, cta: e.target.value })} /></div>
              <div><label className={label}>Cor 1</label><input type="color" className="w-full h-10 bg-transparent" value={patro.cor1} onChange={(e) => setPatro({ ...patro, cor1: e.target.value })} /></div>
              <div><label className={label}>Cor 2</label><input type="color" className="w-full h-10 bg-transparent" value={patro.cor2} onChange={(e) => setPatro({ ...patro, cor2: e.target.value })} /></div>
            </div>
            <button onClick={salvarPatro} className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2"><Save size={14} /> Salvar banner</button>
          </div>
        </div>
      )}
    </div>
  );
}
