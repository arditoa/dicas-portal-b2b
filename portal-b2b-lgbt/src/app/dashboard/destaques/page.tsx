'use client';
// "Destaques e resultados" — a tela que mostra ao parceiro o valor de estar em destaque:
// exposições/toques dos últimos 30 dias, uso das ofertas do mês e (para Fundadores) a comunicação
// escrita pela equipe, que ele pode ajustar. Quem ainda não paga vê o que está perdendo + CTA de upgrade.
// Tabelas/funções: migration 059 (uso_ofertas_mes, resumo_vitrine_local, fundador_comunicacao, categoria_patrocinio).
import { Check, Loader2, Lock, Save, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { idsMarcaAtiva } from '../../../lib/marcaAtiva';
import { erroFotoNaoSuportada } from '../../../lib/validarFoto';

const input = 'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const label = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1.5';
const card = 'bg-[#161520] border border-[#232230] rounded-2xl p-5 mb-6';

type Local = { id: string; nome: string; plano_comercial: string; plano_comercial_status: string };
type Resumo = { secao: string; exibicoes: number; cliques: number };
type Com = { headline: string; texto: string; oferta: string; cta: string; destino: string; escrito_por: string };
type Patro = { categoria: string; tag: string; titulo: string; subtitulo: string; cta: string; destino: string; cor1: string; cor2: string };

// O que cada plano dá ao parceiro — texto simples, sem jargão (mostrado no topo da tela).
const NOME_CATEGORIA_APP: Record<string, string> = { bares: 'Bares & Vida Noturna', festas: 'Festas & Eventos', servicos: 'Serviços', turismo: 'Dicas Trip', artistas: 'Artistas & Entretenimento', beleza: 'Beleza & Estética', mais18: 'Espaços 18+', gastronomia: 'Gastronomia', cultura: 'Cultura', educacao: 'Educação', produtos: 'Compras & Produtos', lazer: 'Experiências & Lazer', destaques: 'Destaques' };
const PLANO_TEXTO: Record<string, { nome: string; cor: string; itens: string[] }> = {
  fundador: { nome: 'Membro Fundador', cor: '#FFD54F', itens: [
    'Seu banner roda nos Destaques e na Home do app, com o selo dourado de Membro Fundador.',
    'Nossa equipe de comunicação escreve a frase do seu banner para dar vontade de conhecer. Você pode ajustar quando quiser, aqui mesmo.',
    'Você publica 1 cupom por semana na faixa de cupons da categoria (2 vagas de Fundador por categoria, trocando a cada 10 minutos).',
  ] },
  premium: { nome: 'Plano Premium', cor: '#E1306C', itens: [
    'Seu banner roda no topo da sua categoria — são 12 vagas, 4 aparecem por hora, então você é visto o dia todo.',
    'Você escreve a frase do banner e pode trocá-la toda semana: é o jeito mais fácil de manter o banner novo e as pessoas voltando. Basta editar a frase abaixo e salvar.',
    'Além do banner, você publica 1 cupom por semana na faixa de cupons da categoria (10 vagas Premium por categoria).',
  ] },
  intermediario: { nome: 'Plano Intermediário', cor: '#7E57C2', itens: [
    'Você aparece nos quadradinhos de cupom da sua categoria: são 12 vagas para Intermediários, que se alternam (12 por hora), e a tela muda a cada 30 minutos.',
    'Publique 1 cupom a cada 2 semanas em “Gerenciar ofertas”: é ele que aparece no quadradinho.',
    'Quer o banner grande no topo da categoria, com a sua frase? Isso é do Plano Premium.',
  ] },
  freemium: { nome: 'Plano gratuito', cor: '#A0A0B2', itens: [
    'Seu local aparece na lista da categoria, como todos.',
    'No plano Intermediário você ganha um quadradinho de cupom; no Premium, o banner grande no topo da categoria com a sua frase e um cupom por semana.',
  ] },
};

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
  const [uso, setUso] = useState<{ plano: string; periodo: 'semana' | 'mes' | 'dias'; limite: number | null; usadas: number; dias: number; liberaEm: string | null } | null>(null);
  const [com, setCom] = useState<Com | null>(null);
  const [patro, setPatro] = useState<Patro | null>(null);
  const [cham, setCham] = useState<{ chamada: string; cta: string; imagem_url: string }>({ chamada: '', cta: 'Conhecer', imagem_url: '' });
  const [enviandoFotoBanner, setEnviandoFotoBanner] = useState(false);
  const [chamAtualizada, setChamAtualizada] = useState<string | null>(null);
  const [vagas, setVagas] = useState<{ categoria: string; tipo: string; posicao: number }[]>([]);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { router.push('/login'); return; }
    const { data: l } = await supabase.from('locais').select('id, nome, plano_comercial, plano_comercial_status').eq('owner_id', u.user.id).in('id', idsMarcaAtiva()).maybeSingle();
    if (!l) { router.push('/dashboard'); return; }
    setLocal(l as Local);

    const { data: r } = await supabase.rpc('resumo_vitrine_local', { p_local_id: l.id, p_dias: 30 });
    setResumo(((r as any[]) || []).map((x) => ({ secao: x.secao, exibicoes: Number(x.exibicoes), cliques: Number(x.cliques) })));

    const { data: o } = await supabase.rpc('uso_ofertas_periodo', { p_local_id: l.id });
    const lo = Array.isArray(o) ? o[0] : o;
    if (lo) setUso({ plano: lo.plano, periodo: lo.periodo === 'dias' ? 'dias' : lo.periodo === 'semana' ? 'semana' : 'mes', limite: lo.limite ?? null, usadas: Number(lo.usadas) || 0, dias: Number(lo.dias) || 7, liberaEm: lo.libera_em ?? null });

    const { data: c } = await supabase.from('fundador_comunicacao').select('headline, texto, oferta, cta, destino, escrito_por').eq('local_id', l.id).maybeSingle();
    if (c) setCom({ headline: c.headline || '', texto: c.texto || '', oferta: c.oferta || '', cta: c.cta || 'Conhecer', destino: c.destino || '', escrito_por: c.escrito_por });

    const { data: ch } = await supabase.from('destaque_chamada').select('chamada, cta, imagem_url, updated_at').eq('local_id', l.id).maybeSingle();
    if (ch) { setCham({ chamada: (ch as any).chamada || '', cta: (ch as any).cta || 'Conhecer', imagem_url: (ch as any).imagem_url || '' }); setChamAtualizada((ch as any).updated_at || null); }

    const { data: vg } = await supabase.from('vitrine_vaga').select('categoria, tipo, posicao').eq('local_id', l.id);
    setVagas((vg as any[]) || []);

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
    const { error } = await supabase.from('destaque_chamada').upsert({ local_id: local.id, chamada: cham.chamada.trim(), cta: cham.cta.trim() || 'Conhecer', imagem_url: cham.imagem_url || null });
    if (error) setErro(error.message); else { setAviso('Frase salva — o banner já usa esse texto.'); setChamAtualizada(new Date().toISOString()); }
  };

  // Rodada 136 — foto do banner: fica na metade direita; a frase fica na metade esquerda, sem nada por cima.
  const enviarFotoBanner = async (arquivo: File | undefined) => {
    if (!arquivo || !local) return;
    const problema = erroFotoNaoSuportada(arquivo);
    if (problema) { setErro(problema); return; }
    setEnviandoFotoBanner(true); setErro('');
    const extensao = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
    const caminho = `${local.id}/banner-${Date.now()}.${extensao}`;
    const { error } = await supabase.storage.from('fotos-locais').upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    if (error) { setErro(`Não deu para enviar a foto: ${error.message}`); setEnviandoFotoBanner(false); return; }
    setCham((c) => ({ ...c, imagem_url: supabase.storage.from('fotos-locais').getPublicUrl(caminho).data.publicUrl }));
    setEnviandoFotoBanner(false);
    setAviso('Foto enviada. Clique em "Salvar frase" para publicar.');
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
  const planoAtivo = pago ? local.plano_comercial : 'freemium';
  const textoPlano = PLANO_TEXTO[planoAtivo] || PLANO_TEXTO.freemium;
  const podeEditarFrase = pago && (local.plano_comercial === 'premium' || local.plano_comercial === 'fundador');
  const diasChamada = chamAtualizada ? Math.floor((Date.now() - new Date(chamAtualizada).getTime()) / 86400000) : null;

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 text-white">
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

      <div className={card} style={{ borderColor: textoPlano.cor + '66' }}>
        <p className="text-[11px] font-bold uppercase text-[#A0A0B2] mb-1">O seu plano</p>
        <h2 className="text-base font-black mb-3" style={{ color: textoPlano.cor }}>{textoPlano.nome}{pago ? '' : ''}</h2>
        <ul className="space-y-2 text-xs text-[#D0D0E0] list-disc list-inside">
          {textoPlano.itens.map((t) => <li key={t}>{t}</li>)}
        </ul>
        {vagas.length > 0 && (
          <p className="text-xs mt-3 text-[#D0D0E0]">
            <b>Sua vaga no app:</b>{' '}
            {vagas.map((v) => `${v.tipo === 'premium' ? (local.plano_comercial === 'fundador' ? 'Banner Fundador' : 'Banner Premium') : 'Intermediário'} ${v.posicao} em ${NOME_CATEGORIA_APP[v.categoria] || v.categoria}`).join(' · ')}.
          </p>
        )}
        {vagas.length === 0 && pago && <p className="text-[11px] mt-3 text-[#A0A0B2]">A posição exata do seu banner entre as vagas é definida pela nossa equipe; você não precisa fazer nada para entrar na rotação.</p>}
        {!pago && <Link href="/planos" className="inline-block mt-4 bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition">Conhecer os planos</Link>}
      </div>

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
        <h2 className="text-sm font-black mb-1 flex items-center gap-2">{!podeEditarFrase && <Lock size={14} className="text-[#A0A0B2]" />} Frase do seu banner</h2>
        {podeEditarFrase && (
          <p className={`text-xs mb-3 ${diasChamada !== null && diasChamada >= 7 ? 'text-amber-400' : 'text-[#A0A0B2]'}`}>
            {diasChamada === null ? 'Você ainda não escreveu a frase do seu banner.' : diasChamada >= 7 ? `Sua frase foi atualizada há ${diasChamada} dias. Que tal trocar por uma novidade da semana? Banner novo chama mais atenção.` : `Sua frase foi atualizada há ${diasChamada} dia${diasChamada === 1 ? '' : 's'}. Você pode trocar quando quiser — o ideal é toda semana.`}
          </p>
        )}
        {!podeEditarFrase && (
          <div className="bg-[#0B0B0E] border border-[#232230] rounded-xl p-3 mb-3 text-xs text-[#C9C9D6]">
            A frase do banner grande no topo da categoria é do <b>Plano Premium</b> (e do Fundador): ele roda 4 por hora e você troca a frase toda semana. Hoje o seu plano não inclui esse banner{pago ? '' : ', e o plano ainda não está ativo'}.
            <Link href="/planos" className="text-[#E1306C] font-bold ml-1">Ver planos</Link>
          </div>
        )}
        <p className="text-xs text-[#A0A0B2] mb-3">No banner que gira no topo da categoria <b>seu nome não aparece</b>: aparece uma chamada que dá vontade de conhecer. Ex.: &ldquo;Conheça o nosso queridinho drink de Lichia&rdquo;. Quem toca vai para a página do {local.nome}.</p>
        <div className="space-y-3">
          <div>
            <label className={label}>Chamada ({cham.imagem_url ? 'com foto: até 60 caracteres' : 'até 90 caracteres'})</label>
            <input className={input} maxLength={cham.imagem_url ? 60 : 90} value={cham.chamada} onChange={(e) => setCham({ ...cham, chamada: e.target.value })} />
            <p className={`text-[11px] mt-1 ${cham.imagem_url && cham.chamada.length > 60 ? 'text-amber-300' : 'text-[#626274]'}`}>{cham.chamada.length}/{cham.imagem_url ? 60 : 90}{cham.imagem_url && cham.chamada.length > 60 ? ' — com foto o texto fica em meio cartão: encurte para até 60.' : ''}</p>
          </div>
          <div><label className={label}>Texto do botão</label><input className={input} maxLength={24} value={cham.cta} onChange={(e) => setCham({ ...cham, cta: e.target.value })} /></div>
          <div>
            <label className={label}>Foto do banner (opcional)</label>
            <p className="text-[11px] text-[#A0A0B2] mb-2">A foto ocupa a metade direita do banner e a frase fica na metade esquerda, nunca por cima. Prefira foto <b>sem texto escrito</b>, com o drink, o prato ou o ambiente no centro. Fotos com letreiro ou flier com texto ficam ruins.</p>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs font-bold text-[#E1306C] cursor-pointer hover:underline">
                {enviandoFotoBanner ? 'Enviando...' : cham.imagem_url ? 'Trocar foto' : 'Subir foto'}
                <input type="file" accept="image/*" className="hidden" disabled={enviandoFotoBanner} onChange={(e) => { enviarFotoBanner(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {cham.imagem_url && <button type="button" className="text-xs font-bold text-[#A0A0B2] hover:underline" onClick={() => setCham({ ...cham, imagem_url: '' })}>Tirar foto</button>}
            </div>
          </div>
          {/* Prévia: igual ao banner do app (metade frase, metade foto). */}
          <div>
            <p className={label}>Prévia no app</p>
            <div className="relative flex h-32 max-w-md rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #B45309, #9D174D)' }}>
              <div className={`${cham.imagem_url ? 'w-[55%]' : 'w-full pr-24'} p-3.5 flex flex-col justify-center gap-1.5`}>
                <span className="self-start text-[9px] font-black uppercase tracking-wide bg-white/20 text-white px-2 py-0.5 rounded-lg">{local.nome}</span>
                <p className={`font-black text-white leading-tight ${cham.imagem_url ? 'text-[13px] line-clamp-3' : 'text-[15px] line-clamp-2'}`}>{cham.chamada || 'Sua chamada aparece aqui'}</p>
                <span className="self-start text-[11px] font-black bg-white text-[#1A1020] px-2.5 py-1 rounded-lg">{cham.cta || 'Conhecer'} →</span>
              </div>
              {cham.imagem_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cham.imagem_url} alt="" className="absolute right-0 top-0 h-full w-[45%] object-cover" />
              )}
            </div>
          </div>
          <button onClick={salvarChamada} className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2"><Save size={14} /> Salvar frase</button>
          {!podeEditarFrase && <p className="text-[11px] text-[#A0A0B2]">Você pode guardar a frase desde já: ela entra no ar quando o plano Premium for ativado.</p>}
        </div>
      </div>

      <div className={card}>
        <h2 className="text-sm font-black mb-1">{uso?.periodo === 'dias' ? (uso.dias === 7 ? 'Cupom da semana' : `Cupom a cada ${uso.dias} dias`) : 'Ofertas'}</h2>
        <p className="text-xs text-[#A0A0B2] mb-3">
          {uso === null ? 'Carregando…' : uso.periodo === 'dias' ? `Seu plano permite ${uso.limite ?? 1} cupom a cada ${uso.dias} dias${uso.dias === 7 ? ' (1 por semana)' : uso.dias === 14 ? ' (1 a cada 2 semanas)' : ''}; ele aparece na faixa de cupons da sua categoria. Você publicou ${uso.usadas} nos últimos ${uso.dias} dias${uso.liberaEm && uso.limite !== null && uso.usadas >= uso.limite ? ` e libera o próximo em ${new Date(uso.liberaEm).toLocaleDateString('pt-BR')}` : ''}.` : uso.limite === null ? `Sem limite mensal no seu plano. Você publicou ${uso.usadas} neste mês.` : `Você usou ${uso.usadas} de ${uso.limite} ofertas deste mês.`}
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
          <h2 className="text-sm font-black mb-1">Seu Patrocínio Master ({NOME_CATEGORIA_APP[patro.categoria] || patro.categoria})</h2>
          <p className="text-xs text-[#A0A0B2] mb-4">É a faixa grande no topo da categoria, só sua. Você pode ajustar os dizeres, o botão e as cores quando quiser; a arte e o período são definidos pela nossa equipe.</p>
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
