'use client';
import { Loader2, Lock, Plus, QrCode, Tag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { idsMarcaAtiva } from '../../../lib/marcaAtiva';
import { NOMES_DIAS, textoJanela } from '../../../lib/janelaCupom';
import { useParceiro } from '../../../components/parceiro/ParceiroContext';
import { recursosDaLocal } from '../../../lib/parceiro';
import { CORES_TEXTO_BANNER, DEGRADES_BANNER } from '../../../lib/estiloBanner';
import { erroFotoNaoSuportada } from '../../../lib/validarFoto';

// "Um cupom, dois lugares" (migração 109): o mesmo cupom aparece na página da casa (linha com "Usar") e na faixa de
// Ofertas da categoria. Aqui a aparência opcional do cartão da faixa — igual ao editor do Modo parceiro no app
// (src/app/parceiro/cupom-editar.tsx) e ao cartão do app (src/components/CartaoCupomVitrine.tsx).
const DEGRADE_CUPOM: [string, string] = ['#E0197D', '#3D3BEF'];
function partesCupom(titulo: string, descricao: string, validoAte: string): { oferta: string; detalhe: string } {
  const t = titulo.trim();
  const m = t.match(/^(.+?)\s+((?:at[eé]|v[aá]lido|das|a partir)\s.+)$/i);
  if (m) return { oferta: m[1], detalhe: m[2].charAt(0).toUpperCase() + m[2].slice(1) };
  const d = descricao.trim();
  if (d && d.length <= 40) return { oferta: t, detalhe: d };
  if (validoAte) { const [, mm, dd] = validoAte.split('-'); return { oferta: t, detalhe: `Válido até ${dd}/${mm}` }; }
  return { oferta: t, detalhe: '' };
}

// Decisão da Andrea (13/11/2026): plano Gratuito NÃO cria cupom. Mesma mensagem do app (src/lib/parceiroMenu.ts)
// e o banco trava de verdade (migração 104, gatilho exigir_plano_pago_no_cupom; o admin pode).
const MSG_CUPOM_PLANO_PAGO = 'Os cupons aparecem na página da casa e na busca e estão incluídos nos planos pagos.';

// Cupons são 100% do dono do local — a policy `cupons_write_dono_ou_admin`
// (001_migrar_para_locais.sql) já deixa o dono criar/editar/apagar cupom
// do PRÓPRIO local direto, sem precisar de nenhuma aprovação da Andrea.
// Quem resgata (usuário final, no app) grava em `cupons_resgatados` — essa
// tela só mostra quantos já foram resgatados de cada um, pra referência.

type Cupom = {
  id: string;
  titulo: string;
  descricao: string | null;
  codigo: string | null;
  valido_de: string | null;
  valido_ate: string | null;
  limite_uso: number | null;
  dias_semana?: number[] | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  ativo: boolean;
  created_at: string;
  resgates?: number;
};

export default function CupomPage() {
  const parceiro = useParceiro();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Rodada 59 (parte 8) — "Fluxo completo" pra ativar cupom de verdade:
  // aqui o dono do local confere o código de 6 letras que o app mostrou
  // pro cliente depois do check-in e chama validar_checkin (migration 010,
  // security definer) — ela confirma o check-in e já resgata o cupom
  // vinculado (cupons_resgatados) na mesma chamada.
  const [codigoValidar, setCodigoValidar] = useState('');
  const [validando, setValidando] = useState(false);
  const [resultadoValidacao, setResultadoValidacao] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [validoDe, setValidoDe] = useState('');
  const [validoAte, setValidoAte] = useState('');
  const [limiteUso, setLimiteUso] = useState('');
  // Migration 078 — dias da semana e horário em que o cupom vale (vazio = sempre).
  const [dias, setDias] = useState<number[]>([]);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  // Aparência na faixa de Ofertas (109). Oferta vazia = cartão automático.
  const [vOferta, setVOferta] = useState('');
  const [vDetalhe, setVDetalhe] = useState('');
  const [vEstilo, setVEstilo] = useState<'degrade' | 'foto'>('degrade');
  const [vFoto, setVFoto] = useState('');
  const [vCores, setVCores] = useState<[string, string] | null>(null);
  const [vCorTexto, setVCorTexto] = useState<string | null>(null);
  const [enviandoFotoCupom, setEnviandoFotoCupom] = useState(false);
  // Migration 066 — quantas ofertas o plano permite por período (Premium/Fundador: 1 a cada 7 dias; Intermediário: 1 a cada 14 dias; null = sem limite).
  const [uso, setUso] = useState<{ plano: string; periodo: 'semana' | 'mes' | 'dias'; limite: number | null; usadas: number; dias: number; liberaEm: string | null } | null>(null);

  const carregarCupons = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('cupons')
      .select('id, titulo, descricao, codigo, valido_de, valido_ate, limite_uso, dias_semana, hora_inicio, hora_fim, ativo, created_at, cupons_resgatados(count)')
      .eq('local_id', id)
      .order('created_at', { ascending: false });

    const lista = (data || []).map((c: any) => ({
      ...c,
      resgates: c.cupons_resgatados?.[0]?.count ?? 0,
    }));
    setCupons(lista);
    const { data: u } = await supabase.rpc('uso_ofertas_periodo', { p_local_id: id });
    const linha = Array.isArray(u) ? u[0] : u;
    if (linha) setUso({ plano: linha.plano, periodo: linha.periodo === 'dias' ? 'dias' : linha.periodo === 'semana' ? 'semana' : 'mes', limite: linha.limite ?? null, usadas: Number(linha.usadas) || 0, dias: Number(linha.dias) || 7, liberaEm: linha.libera_em ?? null });
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      const { data: local } = await supabase
        .from('locais')
        .select('id')
        .eq('owner_id', userData.user.id).in('id', idsMarcaAtiva())
        .maybeSingle();

      if (!local) {
        router.push('/dashboard');
        return;
      }
      setLocalId(local.id);
      await carregarCupons(local.id);
      setCarregando(false);
    })();
  }, [router, carregarCupons]);

  // Plano pago E com status ativo (planoEfetivo). Sem o contexto (organizador/admin), não trava aqui: o banco decide.
  const semPlanoPago = !!parceiro && !parceiro.pago;

  const criarCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localId) return;
    if (semPlanoPago) {
      setErro(MSG_CUPOM_PLANO_PAGO);
      return;
    }
    if (vOferta.trim().length > 24 || vDetalhe.trim().length > 30) { setErro('Na faixa de Ofertas: oferta até 24 letras e detalhe até 30.'); return; }
    if (vOferta.trim() && vEstilo === 'foto' && !vFoto) { setErro('Suba a foto do cartão da faixa (ou escolha Degradê).'); return; }
    setSalvando(true);
    setErro('');

    const proprio = !!vOferta.trim();
    const vitrine = {
      vitrine_oferta: proprio ? vOferta.trim() : null,
      vitrine_detalhe: proprio ? vDetalhe.trim() || null : null,
      vitrine_estilo: proprio ? vEstilo : null,
      vitrine_foto_url: proprio && vEstilo === 'foto' ? vFoto : null,
      vitrine_cor1: proprio && vCores ? vCores[0] : null,
      vitrine_cor2: proprio && vCores ? vCores[1] : null,
      vitrine_cor_texto: proprio ? vCorTexto : null,
    };
    const base = {
      local_id: localId,
      titulo,
      descricao: descricao || null,
      codigo: codigo || null,
      valido_de: validoDe ? new Date(validoDe).toISOString() : null,
      // Válido até as 23h59 do dia (Brasília), igual ao app. Antes: meia-noite UTC = 21h do dia anterior.
      valido_ate: validoAte ? `${validoAte}T23:59:59-03:00` : null,
      limite_uso: limiteUso ? Number(limiteUso) : null,
      dias_semana: dias.length > 0 && dias.length < 7 ? dias : null,
      hora_inicio: horaInicio || null,
      hora_fim: horaFim || null,
    };
    let { error } = await supabase.from('cupons').insert({ ...base, ...vitrine });
    // Sem a migração 109: salva o cupom sem a aparência.
    if (error && /vitrine_/.test(error.message)) ({ error } = await supabase.from('cupons').insert(base));

    if (error) {
      setErro(error.message);
    } else {
      setTitulo('');
      setDescricao('');
      setCodigo('');
      setValidoDe('');
      setValidoAte('');
      setLimiteUso('');
      setDias([]);
      setHoraInicio('');
      setHoraFim('');
      setVOferta(''); setVDetalhe(''); setVEstilo('degrade'); setVFoto(''); setVCores(null); setVCorTexto(null);
      setMostrarForm(false);
      await carregarCupons(localId);
    }
    setSalvando(false);
  };

  const enviarFotoCupom = async (arquivo: File | undefined) => {
    if (!arquivo || !localId) return;
    const problema = erroFotoNaoSuportada(arquivo);
    if (problema) { setErro(problema); return; }
    setEnviandoFotoCupom(true); setErro('');
    const ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
    const caminho = `${localId}/cupom-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('fotos-locais').upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    if (error) setErro(`Não deu para enviar a foto: ${error.message}`);
    else setVFoto(supabase.storage.from('fotos-locais').getPublicUrl(caminho).data.publicUrl);
    setEnviandoFotoCupom(false);
  };

  const alternarAtivo = async (cupom: Cupom) => {
    if (!localId) return;
    await supabase.from('cupons').update({ ativo: !cupom.ativo }).eq('id', cupom.id);
    await carregarCupons(localId);
  };

  const apagarCupom = async (id: string) => {
    if (!localId) return;
    await supabase.from('cupons').delete().eq('id', id);
    await carregarCupons(localId);
  };

  const handleValidarCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoValidar.trim()) return;
    setValidando(true);
    setResultadoValidacao(null);
    try {
      const { data, error } = await supabase.rpc('validar_checkin', { p_codigo: codigoValidar.trim() });
      if (error) throw error;
      const checkin = data as { cupom_id: string | null } | null;
      let mensagemCupom = '';
      if (checkin?.cupom_id) {
        const { data: cupomData } = await supabase
          .from('cupons')
          .select('titulo')
          .eq('id', checkin.cupom_id)
          .maybeSingle();
        mensagemCupom = cupomData?.titulo ? ` — cupom "${cupomData.titulo}" liberado.` : ' — cupom liberado.';
      }
      setResultadoValidacao({ tipo: 'sucesso', mensagem: `Check-in confirmado!${mensagemCupom}` });
      setCodigoValidar('');
      if (localId) await carregarCupons(localId);
    } catch (err: any) {
      setResultadoValidacao({ tipo: 'erro', mensagem: err?.message || 'Não foi possível validar esse código.' });
    } finally {
      setValidando(false);
    }
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

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black">{parceiro && recursosDaLocal(parceiro.local).cupom === 'desconto' ? 'Cupom de desconto' : 'Cupons'}</h1>
          <p className="text-[#A0A0B2] text-xs mt-1">Cupons de desconto que aparecem no perfil do seu local no app.</p>
        </div>
        <button
          onClick={() => !semPlanoPago && setMostrarForm(!mostrarForm)}
          disabled={semPlanoPago}
          title={semPlanoPago ? MSG_CUPOM_PLANO_PAGO : undefined}
          className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#E1306C]"
        >
          {semPlanoPago ? <Lock size={14} /> : <Plus size={14} />} Novo cupom
        </button>
      </div>

      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
          <QrCode size={16} className="text-[#E1306C]" /> Validar check-in
        </h2>
        <p className="text-[#A0A0B2] text-xs mb-4">
          Peça pro cliente mostrar o código de 6 letras que apareceu no app dele e digite aqui pra confirmar a
          chegada e liberar o cupom.
        </p>
        <form onSubmit={handleValidarCheckin} className="flex gap-3">
          <input
            type="text"
            value={codigoValidar}
            onChange={(e) => setCodigoValidar(e.target.value.toUpperCase())}
            placeholder="Ex: A1B2C3"
            maxLength={6}
            className="flex-1 bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm uppercase tracking-widest text-center font-bold focus:outline-none focus:border-[#E1306C]"
          />
          <button
            type="submit"
            disabled={validando || !codigoValidar.trim()}
            className="bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-50 text-white text-xs font-bold px-5 rounded-xl transition"
          >
            {validando ? 'Validando...' : 'Validar'}
          </button>
        </form>
        {resultadoValidacao && (
          <div
            className={`mt-4 text-xs p-3 rounded-xl border ${
              resultadoValidacao.tipo === 'sucesso'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {resultadoValidacao.mensagem}
          </div>
        )}
      </div>

      {semPlanoPago && (
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-4 mb-6 text-xs text-[#A0A0B2] flex items-start gap-3">
          <Lock size={16} className="text-[#E1306C] shrink-0 mt-0.5" />
          <div>
            {MSG_CUPOM_PLANO_PAGO}{' '}
            <Link href="/planos" className="underline font-bold text-white">Conheça os planos</Link>.
          </div>
        </div>
      )}

      {uso && !semPlanoPago && (
        <div className={`border rounded-2xl p-4 mb-6 text-xs ${uso.limite !== null && uso.usadas >= uso.limite ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-[#161520] border-[#232230] text-[#A0A0B2]'}`}>
          {uso.periodo === 'dias' ? (
            <>
              Plano <b className="text-white">{uso.plano === 'fundador' ? 'Fundador' : uso.plano === 'premium' ? 'Premium' : uso.plano === 'intermediario' ? 'Intermediário' : uso.plano}</b>:
              {' '}você pode publicar <b className="text-white">{uso.limite ?? 1} cupom a cada {uso.dias} dias</b>{uso.dias === 7 ? ' (1 por semana)' : uso.dias === 14 ? ' (1 a cada 2 semanas)' : ''}.
              {' '}Nos últimos {uso.dias} dias você publicou <b className="text-white">{uso.usadas}</b>.
              {uso.limite !== null && uso.usadas >= uso.limite
                ? <> {uso.liberaEm ? <>Você libera o próximo em <b className="text-white">{new Date(uso.liberaEm).toLocaleDateString('pt-BR')}</b>.</> : <>Em breve você libera outro.</>}</>
                : <> Seu cupom aparece na faixa de cupons da sua categoria no app (os quadradinhos que passam de lado).</>}
            </>
          ) : uso.limite === null ? (
            <>Plano <b className="text-white">{uso.plano}</b>: você pode criar cupons para o perfil do seu local. A faixa de cupons das categorias é dos planos Intermediário, Premium e Fundador.</>
          ) : (
            <>
              Plano <b className="text-white">{uso.plano}</b>: você usou <b className="text-white">{uso.usadas} de {uso.limite}</b> ofertas deste mês.
              {uso.usadas >= uso.limite && (
                <> Para publicar mais, <Link href="/planos" className="underline font-bold">conheça os planos</Link>.</>
              )}
            </>
          )}
        </div>
      )}

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      {mostrarForm && !semPlanoPago && (
        <form onSubmit={criarCupom} className="bg-[#161520] border border-[#232230] rounded-2xl p-6 mb-8 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Título</label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: 10% de desconto na primeira visita"
              className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Código (opcional)</label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="LGBT10"
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Válido até</label>
              <input
                type="date"
                value={validoAte}
                onChange={(e) => setValidoAte(e.target.value)}
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Limite de uso</label>
              <input
                type="number"
                min="1"
                value={limiteUso}
                onChange={(e) => setLimiteUso(e.target.value)}
                placeholder="Sem limite"
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Dias em que vale (opcional)</label>
            <div className="flex flex-wrap gap-2">
              {NOMES_DIAS.map((nome, i) => (
                <button
                  type="button"
                  key={nome}
                  onClick={() => setDias((atual) => (atual.includes(i) ? atual.filter((x) => x !== i) : [...atual, i].sort((a, b) => a - b)))}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${dias.includes(i) ? 'bg-[#E1306C] border-[#E1306C] text-white' : 'bg-[#0B0B0E] border-[#232230] text-[#A0A0B2]'}`}
                >
                  {nome}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button type="button" onClick={() => setDias([2, 3, 4])} className="text-[11px] text-[#A0A0B2] underline">Ter a Qui</button>
              <button type="button" onClick={() => setDias([0, 5, 6])} className="text-[11px] text-[#A0A0B2] underline">Sex a Dom</button>
              <button type="button" onClick={() => setDias([])} className="text-[11px] text-[#A0A0B2] underline">Todos os dias</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">A partir das (opcional)</label>
              <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]" style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Até às (opcional)</label>
              <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]" style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <p className="text-[11px] text-[#626274]">Sem nada marcado, o cupom vale todos os dias e o dia todo. O app só libera o check-in nos dias e horários escolhidos (horário de Brasília).</p>
          {/* "Um cupom, dois lugares": aparência opcional na faixa de Ofertas + prévias */}
          {(() => {
            const auto = partesCupom(titulo, descricao, validoAte);
            const proprio = !!vOferta.trim();
            const oferta = proprio ? vOferta.trim() : auto.oferta;
            const detalhe = proprio ? vDetalhe.trim() : auto.detalhe;
            const cores = proprio && vCores ? vCores : DEGRADE_CUPOM;
            const corTxt = proprio && vCorTexto ? vCorTexto : '#FFFFFF';
            const comFoto = proprio && vEstilo === 'foto' && !!vFoto;
            const chip = (on: boolean) => `text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ${on ? 'border-[#E1306C] bg-[#E1306C]/15 text-white' : 'border-[#232230] text-[#A0A0B2]'}`;
            return (
              <div className="border-t border-[#232230] pt-4 space-y-3">
                <p className="text-[11px] font-bold text-[#A0A0B2] uppercase">Como aparece na faixa de Ofertas (opcional)</p>
                <p className="text-[11px] text-[#626274]">O mesmo cupom aparece na página da casa e na faixa de Ofertas da categoria. Sem oferta em destaque, o cartão é automático.</p>
                <div className="grid grid-cols-2 gap-3">
                  <input className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm" maxLength={24} placeholder="Oferta em destaque (até 24)" value={vOferta} onChange={(e) => setVOferta(e.target.value)} />
                  <input className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm disabled:opacity-40" maxLength={30} placeholder="Detalhe (até 30)" value={vDetalhe} disabled={!proprio} onChange={(e) => setVDetalhe(e.target.value)} />
                </div>
                {proprio && (
                  <>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <button type="button" className={chip(vEstilo === 'degrade')} onClick={() => setVEstilo('degrade')}>Degradê</button>
                      <button type="button" className={chip(vEstilo === 'foto')} onClick={() => setVEstilo('foto')}>Foto</button>
                      {vEstilo === 'foto' && (
                        <label className="text-xs font-bold text-[#E1306C] cursor-pointer ml-2">
                          {enviandoFotoCupom ? 'Enviando...' : vFoto ? 'Trocar foto' : 'Subir foto'}
                          <input type="file" accept="image/*" className="hidden" disabled={enviandoFotoCupom} onChange={(e) => { enviarFotoCupom(e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DEGRADES_BANNER.map((d) => {
                        const on = !!vCores && vCores[0] === d.cores[0] && vCores[1] === d.cores[1];
                        return <button key={d.chave} type="button" title={d.rotulo} onClick={() => setVCores(on ? null : d.cores)} className={`w-9 h-9 rounded-lg border-2 ${on ? 'border-white' : 'border-transparent'}`} style={{ background: `linear-gradient(135deg, ${d.cores[0]}, ${d.cores[1]})` }} aria-label={d.rotulo} />;
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CORES_TEXTO_BANNER.map((c) => (
                        <button key={c.cor} type="button" className={chip((vCorTexto || '#FFFFFF') === c.cor)} onClick={() => setVCorTexto(c.cor === '#FFFFFF' ? null : c.cor)}>
                          <span className="inline-block w-3 h-3 rounded-full mr-1 align-[-1px] border border-white/30" style={{ background: c.cor }} />{c.rotulo}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex flex-wrap gap-4 items-start">
                  <div>
                    <p className="text-[10px] font-bold text-[#A0A0B2] mb-1">Na faixa da categoria</p>
                    <div className="relative w-[176px] h-[116px] rounded-2xl overflow-hidden p-3 border border-white/15" style={{ background: `linear-gradient(135deg, ${cores[0]}, ${cores[1]})` }}>
                      {comFoto && (<>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={vFoto} alt="" className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-0" style={{ background: 'rgba(10,6,20,0.45)' }} /></>)}
                      <div className="relative">
                        <span className="inline-block max-w-full truncate text-[10px] font-bold text-white bg-white/25 rounded-full px-2 py-0.5 mb-2">{parceiro?.local.nome || 'Sua casa'}</span>
                        <p className="text-[17px] leading-5 font-black uppercase line-clamp-2" style={{ color: corTxt }}>{oferta || 'Sua oferta'}</p>
                        {detalhe && <p className="text-[11px] mt-1 truncate" style={{ color: corTxt, opacity: 0.9 }}>{detalhe}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-[10px] font-bold text-[#A0A0B2] mb-1">Na sua página</p>
                    <div className="bg-[#161520] border border-[#FFD54F30] rounded-2xl p-4">
                      <p className="text-[11px] font-black uppercase tracking-wide text-[#FFD54F] mb-2">Cupom da casa</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white">{titulo || 'O que o cliente ganha'}</p>
                          {descricao && <p className="text-xs text-[#A0A0B2]">{descricao}</p>}
                          <p className="text-xs font-bold text-[#FFD54F] mt-1">{textoJanela(dias, horaInicio, horaFim) ? `Vale ${textoJanela(dias, horaInicio, horaFim)}` : 'Vale todos os dias'}</p>
                        </div>
                        <span className="bg-[#7E57C2] text-white text-xs font-black rounded-xl px-4 py-2">Usar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-[#232230] hover:bg-[#2D2B3D] text-white font-bold py-3 rounded-xl transition text-sm"
          >
            {salvando ? 'Salvando...' : 'Criar cupom'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {cupons.length === 0 && <p className="text-xs text-[#626274]">Nenhum cupom criado ainda.</p>}
        {cupons.map((c) => (
          <div key={c.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Tag size={14} className="text-[#E1306C]" /> {c.titulo}
                {!c.ativo && <span className="text-[10px] text-[#626274] font-normal">(inativo)</span>}
              </h3>
              {c.descricao && <p className="text-xs text-[#A0A0B2] mt-1">{c.descricao}</p>}
              <p className="text-[11px] text-[#626274] mt-1">
                {c.codigo ? `Código: ${c.codigo} · ` : ''}
                {c.limite_uso ? `${c.resgates}/${c.limite_uso} resgatados` : `${c.resgates} resgatados`}
                {c.valido_ate ? ` · válido até ${new Date(c.valido_ate).toLocaleDateString('pt-BR')}` : ''}
              </p>
              {textoJanela(c.dias_semana, c.hora_inicio, c.hora_fim) && <p className="text-[11px] text-amber-300 mt-1">Vale: {textoJanela(c.dias_semana, c.hora_inicio, c.hora_fim)}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => alternarAtivo(c)}
                className="bg-[#232230] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#2D2B3D]"
              >
                {c.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => apagarCupom(c.id)}
                className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg hover:bg-red-500/20"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
