'use client';
import { ArrowLeft, CheckCircle2, Gift, Info, Loader2, QrCode, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Plano de fidelidade da casa (migrations 010 + 074).
// A casa define: quantas visitas, o que o cliente ganha e se a contagem é por mês.
// Cada visita = um check-in que a casa confirma com o código de 6 letras do cliente.
// Quando o cliente bate a meta, a casa entrega o brinde e marca "Entreguei" aqui.

type Programa = {
  id: string;
  nome: string;
  descricao: string | null;
  visitas_necessarias: number;
  recompensa: string;
  janela: 'mes' | 'sempre';
  exibir_no_app: boolean;
  ativo: boolean;
};

type ClienteFid = {
  user_id: string;
  nome: string;
  visitas: number;
  ultima_visita: string;
  ja_ganhou: boolean;
};

type Resultado = { tipo: 'sucesso' | 'erro'; mensagem: string; userId?: string; nome?: string; visitas?: number } | null;

const campo =
  'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]';

function fraseRegra(visitas: number, recompensa: string, janela: string) {
  const quando = janela === 'mes' ? ' no mês' : '';
  return `A cada ${visitas || '…'} visita${visitas === 1 ? '' : 's'}${quando}, o cliente ganha: ${recompensa.trim() || '…'}`;
}

export default function FidelidadePage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [programaId, setProgramaId] = useState<string | null>(null);
  const [nome, setNome] = useState('Cartão fidelidade');
  const [visitas, setVisitas] = useState('7');
  const [recompensa, setRecompensa] = useState('');
  const [descricao, setDescricao] = useState('');
  const [janela, setJanela] = useState<'mes' | 'sempre'>('mes');
  const [exibir, setExibir] = useState(true);
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');

  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [entregando, setEntregando] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteFid[]>([]);

  const necessarias = parseInt(visitas, 10) || 0;

  const carregarClientes = useCallback(async (pid: string) => {
    const { data, error } = await supabase.rpc('fidelidade_clientes', { p_programa_id: pid });
    if (!error) setClientes((data || []) as ClienteFid[]);
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
      const { data: prog, error: erroProg } = await supabase
        .from('programas_fidelidade')
        .select('id, nome, descricao, visitas_necessarias, recompensa, janela, exibir_no_app, ativo')
        .eq('local_id', local.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (erroProg) {
        setErro(
          erroProg.message.includes('janela') || erroProg.message.includes('exibir_no_app')
            ? 'O banco ainda não recebeu a atualização da fidelidade (migration 074). Avise o administrador.'
            : erroProg.message
        );
      } else if (prog) {
        const p = prog as Programa;
        setProgramaId(p.id);
        setNome(p.nome);
        setVisitas(String(p.visitas_necessarias));
        setRecompensa(p.recompensa);
        setDescricao(p.descricao || '');
        setJanela(p.janela);
        setExibir(p.exibir_no_app);
        setAtivo(p.ativo);
        await carregarClientes(p.id);
      }
      setCarregando(false);
    })();
  }, [router, carregarClientes]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localId) return;
    setErro('');
    if (necessarias < 1) {
      setErro('Informe quantas visitas o cliente precisa fazer (mínimo 1).');
      return;
    }
    if (!recompensa.trim()) {
      setErro('Escreva o que o cliente ganha (ex.: 1 drink grátis).');
      return;
    }
    setSalvando(true);
    const payload = {
      local_id: localId,
      nome: nome.trim() || 'Cartão fidelidade',
      descricao: descricao.trim() || null,
      visitas_necessarias: necessarias,
      recompensa: recompensa.trim(),
      janela,
      exibir_no_app: exibir,
      ativo,
    };
    if (programaId) {
      const { error } = await supabase.from('programas_fidelidade').update(payload).eq('id', programaId);
      if (error) setErro(error.message);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2500);
        await carregarClientes(programaId);
      }
    } else {
      const { data, error } = await supabase.from('programas_fidelidade').insert(payload).select('id').single();
      if (error) setErro(error.message);
      else if (data) {
        setProgramaId(data.id);
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2500);
      }
    }
    setSalvando(false);
  };

  const validar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    setValidando(true);
    setResultado(null);
    try {
      const { data, error } = await supabase.rpc('validar_checkin', { p_codigo: codigo.trim() });
      if (error) throw error;
      const checkin = data as { user_id: string } | null;
      let nomeCliente = 'Cliente';
      let total: number | undefined;
      if (checkin?.user_id) {
        const { data: perfil } = await supabase.from('perfis_publicos').select('display_name').eq('id', checkin.user_id).maybeSingle();
        if (perfil?.display_name) nomeCliente = perfil.display_name;
        if (programaId && ativo) {
          const { data: n } = await supabase.rpc('contar_visitas_fidelidade', { p_programa_id: programaId, p_user_id: checkin.user_id });
          if (typeof n === 'number') total = n;
        }
      }
      setResultado({
        tipo: 'sucesso',
        mensagem: 'Visita confirmada!',
        userId: checkin?.user_id,
        nome: nomeCliente,
        visitas: total,
      });
      setCodigo('');
      if (programaId) await carregarClientes(programaId);
    } catch (err: any) {
      setResultado({ tipo: 'erro', mensagem: err?.message || 'Não foi possível validar esse código.' });
    } finally {
      setValidando(false);
    }
  };

  const entregar = async (userId: string) => {
    if (!programaId) return;
    setEntregando(userId);
    setErro('');
    const { error } = await supabase.rpc('resgatar_fidelidade', { p_programa_id: programaId, p_user_id: userId });
    if (error) setErro(error.message);
    else {
      setResultado(null);
      await carregarClientes(programaId);
    }
    setEntregando(null);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  const prontos = clientes.filter((c) => c.visitas >= necessarias && !c.ja_ganhou && necessarias > 0);
  const ganharam = clientes.filter((c) => c.ja_ganhou).length;

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-6">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Gift size={22} className="text-[#E1306C]" /> Fidelidade
        </h1>
        <p className="text-[#A0A0B2] text-xs mt-1">
          Faça seus clientes voltarem: defina quantas visitas valem um brinde e acompanhe tudo por aqui.
        </p>
      </div>

      <div className="bg-[#7E57C2]/10 border border-[#7E57C2]/30 rounded-2xl p-4 mb-6 flex gap-3">
        <Info size={16} className="text-[#B39DDB] shrink-0 mt-0.5" />
        <div className="text-xs text-[#D0D0E0] space-y-1.5">
          <p><b>1.</b> Você define a regra abaixo (ex.: 7 visitas no mês = 1 drink grátis).</p>
          <p><b>2.</b> O cliente faz check-in no app e mostra o código de 6 letras. Você digita o código em <b>Confirmar visita</b>: cada código confirmado vale uma visita.</p>
          <p><b>3.</b> Quando ele bate a meta, aparece o botão <b>Entreguei o brinde</b>. Com a contagem por mês, ela recomeça todo dia 1º e cada cliente ganha no máximo 1 brinde por mês.</p>
          <p><b>Aparece no app?</b> Você escolhe. Com a opção ligada, o cliente vê o cartão com as visitas no perfil do seu local. Desligada, você continua contando as visitas, mas o cartão fica escondido.</p>
        </div>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      {/* REGRA */}
      <form onSubmit={salvar} className="bg-[#161520] border border-[#232230] rounded-2xl p-6 space-y-4 mb-8">
        <h2 className="text-sm font-bold">Regra do seu cartão fidelidade</h2>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1">Visitas</label>
            <input type="number" min={1} max={60} value={visitas} onChange={(e) => setVisitas(e.target.value)} className={campo} />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1">O que o cliente ganha</label>
            <input
              type="text"
              value={recompensa}
              maxLength={120}
              onChange={(e) => setRecompensa(e.target.value)}
              placeholder="Ex.: 1 drink grátis"
              className={campo}
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-1">Como contar</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['mes', 'Dentro de cada mês', 'Reinicia todo dia 1º'],
              ['sempre', 'Sem prazo', 'Acumula até ganhar o brinde'],
            ] as const).map(([valor, titulo, sub]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setJanela(valor)}
                className={`text-left rounded-xl p-3 border transition ${
                  janela === valor ? 'bg-[#7E57C2]/20 border-[#7E57C2]' : 'bg-[#0B0B0E] border-[#232230] hover:border-[#7E57C2]/50'
                }`}
              >
                <span className="block text-xs font-bold">{titulo}</span>
                <span className="block text-[10px] text-[#A0A0B2] mt-0.5">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0B0B0E] border border-[#232230] rounded-xl p-3">
          <p className="text-[10px] font-bold text-[#626274] uppercase mb-1">Assim o cliente vai ler</p>
          <p className="text-sm font-bold text-[#FFD54F]">{fraseRegra(necessarias, recompensa, janela)}</p>
        </div>

        <details className="text-xs text-[#A0A0B2]">
          <summary className="cursor-pointer font-bold">Nome e observações (opcional)</summary>
          <div className="space-y-3 mt-3">
            <input type="text" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cartão" className={campo} />
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Regras extras (ex.: válido de terça a quinta, não cumulativo com outras promoções)"
              className={campo}
            />
          </div>
        </details>

        <div className="space-y-2">
          <label className="flex items-start gap-3 bg-[#0B0B0E] border border-[#232230] rounded-xl p-3 cursor-pointer">
            <input type="checkbox" checked={exibir} onChange={(e) => setExibir(e.target.checked)} className="accent-[#E1306C] mt-0.5" />
            <span>
              <span className="block text-xs font-bold">Mostrar o cartão fidelidade no app</span>
              <span className="block text-[10px] text-[#A0A0B2]">
                Ligado: aparece no perfil do seu local, com o progresso de cada cliente. Desligado: fica só pra você.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 bg-[#0B0B0E] border border-[#232230] rounded-xl p-3 cursor-pointer">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="accent-[#E1306C] mt-0.5" />
            <span>
              <span className="block text-xs font-bold">Programa ativo</span>
              <span className="block text-[10px] text-[#A0A0B2]">Desative para pausar a promoção sem perder o histórico.</span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
        >
          {salvando ? <Loader2 className="animate-spin" size={16} /> : salvo ? 'Salvo!' : (<><Save size={16} /> {programaId ? 'Salvar regra' : 'Criar cartão fidelidade'}</>)}
        </button>
      </form>

      {/* CONFIRMAR VISITA */}
      {programaId && (
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
            <QrCode size={16} className="text-[#E1306C]" /> Confirmar visita
          </h2>
          <p className="text-[#A0A0B2] text-xs mb-4">
            Peça o código de 6 letras do check-in que aparece no app do cliente e digite aqui. Isso soma uma visita (e também libera o cupom, se ele tiver escolhido um).
          </p>
          <form onSubmit={validar} className="flex gap-3">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: A1B2C3"
              maxLength={6}
              className="flex-1 bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm uppercase tracking-widest text-center font-bold focus:outline-none focus:border-[#E1306C]"
            />
            <button
              type="submit"
              disabled={validando || !codigo.trim()}
              className="bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-50 text-white text-xs font-bold px-5 rounded-xl transition"
            >
              {validando ? 'Confirmando...' : 'Confirmar'}
            </button>
          </form>

          {resultado && (
            <div
              className={`mt-4 rounded-xl p-4 text-xs border ${
                resultado.tipo === 'sucesso'
                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              <p className="font-bold flex items-center gap-2">
                {resultado.tipo === 'sucesso' && <CheckCircle2 size={14} />} {resultado.mensagem}
              </p>
              {resultado.tipo === 'sucesso' && resultado.visitas !== undefined && necessarias > 0 && (
                <>
                  <p className="mt-1">
                    {resultado.nome} está com <b>{resultado.visitas} de {necessarias}</b> visitas
                    {janela === 'mes' ? ' neste mês' : ''}.
                  </p>
                  {resultado.visitas >= necessarias && resultado.userId && (
                    <button
                      onClick={() => entregar(resultado.userId!)}
                      disabled={entregando === resultado.userId}
                      className="mt-3 bg-[#FFD54F] hover:bg-[#F5C842] text-black font-bold text-xs px-4 py-2 rounded-xl transition"
                    >
                      {entregando === resultado.userId ? 'Registrando...' : `Meta batida! Entreguei o brinde (${recompensa})`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* CLIENTES */}
      {programaId && (
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold">{janela === 'mes' ? 'Visitas deste mês' : 'Visitas em andamento'}</h2>
            <span className="text-[10px] text-[#A0A0B2] font-bold uppercase">
              {clientes.length} cliente{clientes.length === 1 ? '' : 's'} · {prontos.length} com meta batida · {ganharam} brinde{ganharam === 1 ? '' : 's'} entregue{ganharam === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[#A0A0B2] text-xs mb-4">Quem já fez visita confirmada. Quem bateu a meta aparece com o botão para entregar.</p>

          {clientes.length === 0 ? (
            <p className="text-xs text-[#626274]">Nenhuma visita confirmada ainda {janela === 'mes' ? 'neste mês' : ''}.</p>
          ) : (
            <div className="space-y-2">
              {clientes.map((c) => {
                const meta = necessarias > 0 && c.visitas >= necessarias;
                const pct = necessarias > 0 ? Math.min(100, Math.round((c.visitas / necessarias) * 100)) : 0;
                return (
                  <div key={c.user_id} className="bg-[#0B0B0E] border border-[#232230] rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{c.nome}</p>
                        <p className="text-[10px] text-[#626274]">
                          última visita {new Date(c.ultima_visita).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {c.ja_ganhou ? (
                          <span className="text-[10px] font-bold text-green-400 uppercase">brinde entregue</span>
                        ) : meta ? (
                          <button
                            onClick={() => entregar(c.user_id)}
                            disabled={entregando === c.user_id}
                            className="bg-[#FFD54F] hover:bg-[#F5C842] text-black font-bold text-[11px] px-3 py-1.5 rounded-lg transition"
                          >
                            {entregando === c.user_id ? '...' : 'Entreguei o brinde'}
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-[#D0D0E0]">{c.visitas}/{necessarias}</span>
                        )}
                      </div>
                    </div>
                    {!c.ja_ganhou && (
                      <div className="h-1.5 bg-[#232230] rounded-full mt-2 overflow-hidden">
                        <div className={`h-full ${meta ? 'bg-[#FFD54F]' : 'bg-[#E1306C]'}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
