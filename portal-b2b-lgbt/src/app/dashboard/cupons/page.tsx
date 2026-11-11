'use client';
import { Loader2, Plus, QrCode, Tag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { idsMarcaAtiva } from '../../../lib/marcaAtiva';
import { NOMES_DIAS, textoJanela } from '../../../lib/janelaCupom';
import { useParceiro } from '../../../components/parceiro/ParceiroContext';
import { recursosDaLocal } from '../../../lib/parceiro';

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

  const criarCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localId) return;
    setSalvando(true);
    setErro('');

    const { error } = await supabase.from('cupons').insert({
      local_id: localId,
      titulo,
      descricao: descricao || null,
      codigo: codigo || null,
      valido_de: validoDe ? new Date(validoDe).toISOString() : null,
      valido_ate: validoAte ? new Date(validoAte).toISOString() : null,
      limite_uso: limiteUso ? Number(limiteUso) : null,
      dias_semana: dias.length > 0 && dias.length < 7 ? dias : null,
      hora_inicio: horaInicio || null,
      hora_fim: horaFim || null,
    });

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
      setMostrarForm(false);
      await carregarCupons(localId);
    }
    setSalvando(false);
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
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <Plus size={14} /> Novo cupom
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

      {uso && (
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

      {mostrarForm && (
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
