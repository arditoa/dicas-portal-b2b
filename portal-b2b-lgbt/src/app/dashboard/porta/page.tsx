'use client';
import { Camera, Check, Download, DoorOpen, Loader2, RefreshCw, ScanLine, Search, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { idsMarcaAtiva } from '../../../lib/marcaAtiva';

// Modo porta (nov/2026): a casa valida na entrada quem está na Lista VIP.
// O convidado aprovado mostra o QR/código no app (src/app/evento/[id].tsx); aqui a portaria
// digita o código de 6 caracteres, lê o QR com a câmera (quando o navegador tem BarcodeDetector)
// ou procura pelo nome, e confirma a entrada com um toque. O check-in passa a ser feito SÓ
// pela casa — o botão "Cheguei" do app foi trocado pelo QR. Quem pode mudar o status é o dono
// do local / admin (trigger protect_status_listas_vip_solicitacoes), então não há migration nova.

type Status = 'solicitada' | 'aprovada' | 'rejeitada' | 'cancelada' | 'check_in';

type Solicitacao = {
  id: string;
  user_id: string;
  status: Status;
  acompanhantes: number;
  created_at: string;
  nome: string;
};

type ListaVip = { id: string; titulo: string; vagas_limite: number | null; vagas_ocupadas: number; ativa: boolean };

type Evento = { id: string; titulo: string; data_inicio: string; status: string; listas_vip: ListaVip[] };

const ROTULO: Record<Status, { label: string; cor: string }> = {
  solicitada: { label: 'Aguardando', cor: '#E1A93A' },
  aprovada: { label: 'Aprovada · falta entrar', cor: '#4CAF7D' },
  check_in: { label: 'Dentro', cor: '#3B9EFF' },
  rejeitada: { label: 'Recusada', cor: '#8A8A9A' },
  cancelada: { label: 'Cancelou', cor: '#8A8A9A' },
};

type Filtro = 'todos' | 'solicitada' | 'aprovada' | 'check_in';

/** Código curto que o convidado vê no app: 6 primeiros caracteres do id, em maiúsculas. */
const codigoDe = (id: string) => id.replace(/-/g, '').slice(0, 6).toUpperCase();
const pessoas = (s: Solicitacao) => 1 + (s.acompanhantes || 0);
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PortaPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState<string | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [codigo, setCodigo] = useState('');
  const [achado, setAchado] = useState<Solicitacao | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [camera, setCamera] = useState(false);
  const [temLeitor, setTemLeitor] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const evento = useMemo(() => eventos.find((e) => e.id === eventoId) || null, [eventos, eventoId]);
  const lista = evento?.listas_vip?.[0] || null;

  // ---- carga -------------------------------------------------------------------------------
  const carregarSolicitacoes = useCallback(async (listaId: string) => {
    const { data } = await supabase
      .from('listas_vip_solicitacoes')
      .select('id, user_id, status, acompanhantes, created_at')
      .eq('lista_vip_id', listaId)
      .order('created_at', { ascending: true });
    const base = ((data as Omit<Solicitacao, 'nome'>[]) || []).map((s) => ({ ...s, nome: 'Convidado' }));
    if (base.length > 0) {
      const { data: perfis } = await supabase
        .from('perfis_publicos')
        .select('id, display_name')
        .in('id', base.map((s) => s.user_id));
      const nomeDoId = new Map((perfis || []).map((p: any) => [p.id, p.display_name]));
      base.forEach((s) => (s.nome = nomeDoId.get(s.user_id) || 'Convidado'));
    }
    setSolicitacoes(base);
    setAtualizadoEm(new Date());
  }, []);

  useEffect(() => {
    setTemLeitor(typeof window !== 'undefined' && 'BarcodeDetector' in window);
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      const { data: local } = await supabase
        .from('locais')
        .select('id')
        .eq('owner_id', userData.user.id)
        .in('id', idsMarcaAtiva())
        .maybeSingle();
      if (!local) {
        router.push('/dashboard');
        return;
      }
      const { data } = await supabase
        .from('eventos')
        .select('id, titulo, data_inicio, status, listas_vip(id, titulo, vagas_limite, vagas_ocupadas, ativa)')
        .eq('local_id', local.id)
        .order('data_inicio', { ascending: false });
      const comLista = ((data as unknown as Evento[]) || []).filter((e) => e.listas_vip?.length);
      setEventos(comLista);
      // abre no evento mais próximo de agora (a festa de hoje, ou a mais recente)
      const agora = Date.now();
      const maisPerto = [...comLista].sort(
        (a, b) => Math.abs(new Date(a.data_inicio).getTime() - agora) - Math.abs(new Date(b.data_inicio).getTime() - agora)
      )[0];
      if (maisPerto) setEventoId(maisPerto.id);
      setCarregando(false);
    })();
  }, [router]);

  useEffect(() => {
    setAchado(null);
    setAviso(null);
    setCodigo('');
    if (!lista) {
      setSolicitacoes([]);
      return;
    }
    carregarSolicitacoes(lista.id);
    // a casa vê o que outro celular da portaria acabou de fazer
    const t = setInterval(() => carregarSolicitacoes(lista.id), 12000);
    return () => clearInterval(t);
  }, [lista?.id, carregarSolicitacoes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- ações -------------------------------------------------------------------------------
  const mudarStatus = async (s: Solicitacao, novo: Status, msg: string) => {
    setSalvando(s.id);
    const { error } = await supabase.from('listas_vip_solicitacoes').update({ status: novo }).eq('id', s.id);
    setSalvando(null);
    if (error) {
      setAviso({ tipo: 'erro', texto: error.message });
      return;
    }
    setAviso({ tipo: 'ok', texto: msg });
    setAchado((a) => (a && a.id === s.id ? { ...a, status: novo } : a));
    if (lista) await carregarSolicitacoes(lista.id);
  };

  const procurar = useCallback(
    (bruto: string) => {
      const txt = bruto.trim();
      if (!txt) return;
      const id = txt.toLowerCase().startsWith('dicasvip:') ? txt.slice(9).trim().toLowerCase() : null;
      const cod = txt.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const s = solicitacoes.find((x) => (id ? x.id.toLowerCase() === id : codigoDe(x.id) === cod || x.id.toLowerCase() === txt.toLowerCase()));
      if (!s) {
        setAchado(null);
        setAviso({ tipo: 'erro', texto: 'Código não encontrado nesta festa. Confira se escolheu o evento certo.' });
        return;
      }
      setAchado(s);
      setAviso(null);
    },
    [solicitacoes]
  );

  // ---- câmera / QR ------------------------------------------------------------------------
  useEffect(() => {
    if (!camera) return;
    let parar = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (parar || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Leitor = (window as any).BarcodeDetector;
        const detector = new Leitor({ formats: ['qr_code'] });
        timer = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const lidos = await detector.detect(videoRef.current);
            if (lidos.length > 0) {
              const valor = String(lidos[0].rawValue || '');
              setCodigo(valor.toLowerCase().startsWith('dicasvip:') ? codigoDe(valor.slice(9)) : valor);
              procurar(valor);
              setCamera(false);
            }
          } catch {
            /* quadro sem QR: segue lendo */
          }
        }, 400);
      } catch {
        setAviso({ tipo: 'erro', texto: 'Não consegui abrir a câmera. Digite o código ou procure pelo nome.' });
        setCamera(false);
      }
    })();
    return () => {
      parar = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camera, procurar]);

  // ---- números -----------------------------------------------------------------------------
  const n = useMemo(() => {
    const por = (st: Status) => solicitacoes.filter((s) => s.status === st);
    const aprovadas = por('aprovada');
    const dentro = por('check_in');
    const soma = (arr: Solicitacao[]) => arr.reduce((t, s) => t + pessoas(s), 0);
    const aprovadosTotal = aprovadas.length + dentro.length;
    return {
      pediram: solicitacoes.length,
      aguardando: por('solicitada').length,
      aprovadas: aprovadas.length,
      dentro: dentro.length,
      rejeitadas: por('rejeitada').length,
      canceladas: por('cancelada').length,
      aprovadosTotal,
      pessoasDentro: soma(dentro),
      pessoasEsperadas: soma(aprovadas) + soma(dentro),
      faltaramPessoas: soma(aprovadas),
      taxa: aprovadosTotal > 0 ? Math.round((dentro.length / aprovadosTotal) * 100) : 0,
    };
  }, [solicitacoes]);

  const visiveis = useMemo(() => {
    const q = semAcento(busca.trim());
    return solicitacoes
      .filter((s) => (filtro === 'todos' ? s.status !== 'cancelada' : s.status === filtro))
      .filter((s) => !q || semAcento(s.nome).includes(q) || codigoDe(s.id).toLowerCase().includes(q));
  }, [solicitacoes, busca, filtro]);

  const baixarCsv = () => {
    if (!evento) return;
    const linhas = [
      ['Nome', 'Código', 'Situação', 'Acompanhantes', 'Pessoas', 'Pediu em'],
      ...solicitacoes.map((s) => [
        s.nome,
        codigoDe(s.id),
        s.status === 'check_in' ? 'Compareceu' : s.status === 'aprovada' ? 'Aprovada (não compareceu)' : ROTULO[s.status].label,
        String(s.acompanhantes || 0),
        String(pessoas(s)),
        new Date(s.created_at).toLocaleString('pt-BR'),
      ]),
    ];
    const csv = '﻿' + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-vip-${semAcento(evento.titulo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" />
      </div>
    );
  }

  const caixa = 'bg-[#161520] border border-[#232230] rounded-2xl';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <DoorOpen className="text-[#E1306C]" />
        <div>
          <h1 className="text-2xl font-black">Modo porta</h1>
          <p className="text-xs text-[#A0A0B2]">Confirme quem chegou na Lista VIP e feche a festa com o resumo.</p>
        </div>
      </div>

      {eventos.length === 0 ? (
        <div className={`${caixa} p-8 text-center text-xs text-[#A0A0B2]`}>
          Nenhum evento com Lista VIP ainda. Abra a lista em{' '}
          <Link href="/dashboard/lista-vip" className="text-[#E1306C] underline">Lista VIP</Link>.
        </div>
      ) : (
        <>
          <div className={`${caixa} p-4 flex flex-wrap items-center gap-3`}>
            <select
              value={eventoId || ''}
              onChange={(e) => setEventoId(e.target.value)}
              className="flex-1 min-w-[200px] bg-[#0B0B0E] border border-[#232230] rounded-xl py-2.5 px-3 text-sm text-white"
            >
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titulo} · {new Date(e.data_inicio).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
            <button
              onClick={() => lista && carregarSolicitacoes(lista.id)}
              className="text-xs text-[#A0A0B2] hover:text-white inline-flex items-center gap-1.5"
            >
              <RefreshCw size={13} /> Atualizar{atualizadoEm ? ` · ${atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </button>
          </div>

          {/* contadores */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`${caixa} p-4`}>
              <div className="text-[10px] font-bold uppercase text-[#A0A0B2]">Já entraram</div>
              <div className="text-3xl font-black text-[#3B9EFF]">{n.pessoasDentro}</div>
              <div className="text-[10px] text-[#626274]">pessoas · {n.dentro} convites</div>
            </div>
            <div className={`${caixa} p-4`}>
              <div className="text-[10px] font-bold uppercase text-[#A0A0B2]">Faltam entrar</div>
              <div className="text-3xl font-black text-[#4CAF7D]">{n.faltaramPessoas}</div>
              <div className="text-[10px] text-[#626274]">pessoas · {n.aprovadas} convites</div>
            </div>
            <div className={`${caixa} p-4`}>
              <div className="text-[10px] font-bold uppercase text-[#A0A0B2]">Aguardando</div>
              <div className="text-3xl font-black text-[#E1A93A]">{n.aguardando}</div>
              <div className="text-[10px] text-[#626274]">pedidos sem resposta</div>
            </div>
          </div>

          {/* validar */}
          <div className={`${caixa} p-4 space-y-3`}>
            <div className="text-[11px] font-bold uppercase text-[#A0A0B2]">Validar na entrada</div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                procurar(codigo);
              }}
              className="flex gap-2"
            >
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Código do convidado (ex.: 3F9A21)"
                autoCapitalize="characters"
                maxLength={64}
                className="flex-1 bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-lg font-bold tracking-widest focus:outline-none focus:border-[#E1306C]"
              />
              <button type="submit" className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 rounded-xl inline-flex items-center gap-2">
                <ScanLine size={14} /> Validar
              </button>
            </form>
            {temLeitor && (
              <button
                onClick={() => setCamera((c) => !c)}
                className="text-xs font-bold text-[#E1306C] inline-flex items-center gap-1.5"
              >
                <Camera size={14} /> {camera ? 'Fechar câmera' : 'Ler QR com a câmera'}
              </button>
            )}
            {camera && (
              <video ref={videoRef} playsInline muted className="w-full max-h-72 rounded-xl bg-black object-cover" />
            )}

            {aviso && (
              <div
                className={`text-xs rounded-xl px-3 py-2 ${
                  aviso.tipo === 'ok' ? 'bg-[#4CAF7D]/10 text-[#4CAF7D]' : 'bg-red-500/10 text-red-300'
                }`}
              >
                {aviso.texto}
              </div>
            )}

            {achado && (
              <div className="border border-[#232230] rounded-xl p-4 bg-[#0B0B0E] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black">{achado.nome}</div>
                    <div className="text-xs text-[#A0A0B2]">
                      {pessoas(achado)} {pessoas(achado) === 1 ? 'pessoa' : 'pessoas'}
                      {achado.acompanhantes > 0 ? ` (com ${achado.acompanhantes} acompanhante${achado.acompanhantes > 1 ? 's' : ''})` : ''} · código {codigoDe(achado.id)}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ color: ROTULO[achado.status].cor, background: `${ROTULO[achado.status].cor}22` }}>
                    {ROTULO[achado.status].label}
                  </span>
                </div>
                <p className="text-[11px] text-[#A0A0B2]">Confira o documento com foto antes de liberar.</p>
                <div className="flex flex-wrap gap-2">
                  {achado.status === 'aprovada' && (
                    <button
                      disabled={salvando === achado.id}
                      onClick={() => mudarStatus(achado, 'check_in', `${achado.nome} liberado(a).`)}
                      className="flex-1 bg-[#4CAF7D] hover:bg-[#3E9468] text-white text-sm font-black py-3 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Check size={16} /> Confirmar entrada
                    </button>
                  )}
                  {achado.status === 'solicitada' && (
                    <>
                      <button
                        disabled={salvando === achado.id}
                        onClick={() => mudarStatus(achado, 'check_in', `${achado.nome} aprovado(a) e liberado(a).`)}
                        className="flex-1 bg-[#4CAF7D] hover:bg-[#3E9468] text-white text-sm font-black py-3 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <Check size={16} /> Aprovar e liberar
                      </button>
                      <button
                        disabled={salvando === achado.id}
                        onClick={() => mudarStatus(achado, 'rejeitada', `${achado.nome} recusado(a).`)}
                        className="px-4 border border-[#232230] text-[#A0A0B2] text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
                      >
                        <X size={14} /> Recusar
                      </button>
                    </>
                  )}
                  {achado.status === 'check_in' && (
                    <>
                      <div className="flex-1 text-sm font-bold text-[#3B9EFF] py-3">Esse convite já foi usado.</div>
                      <button
                        disabled={salvando === achado.id}
                        onClick={() => mudarStatus(achado, 'aprovada', 'Entrada desfeita.')}
                        className="px-4 border border-[#232230] text-[#A0A0B2] text-xs font-bold rounded-xl"
                      >
                        Desfazer entrada
                      </button>
                    </>
                  )}
                  {(achado.status === 'rejeitada' || achado.status === 'cancelada') && (
                    <button
                      disabled={salvando === achado.id}
                      onClick={() => mudarStatus(achado, 'aprovada', `${achado.nome} aprovado(a).`)}
                      className="px-4 py-3 border border-[#232230] text-white text-xs font-bold rounded-xl"
                    >
                      Aprovar mesmo assim
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* lista */}
          <div className={`${caixa} p-4 space-y-3`}>
            <div className="flex items-center gap-2 bg-[#0B0B0E] border border-[#232230] rounded-xl px-3">
              <Search size={14} className="text-[#626274]" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Procurar pelo nome ou código"
                className="flex-1 bg-transparent py-2.5 text-sm text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['todos', `Todos (${n.pediram - n.canceladas})`],
                  ['solicitada', `Aguardando (${n.aguardando})`],
                  ['aprovada', `Falta entrar (${n.aprovadas})`],
                  ['check_in', `Dentro (${n.dentro})`],
                ] as [Filtro, string][]
              ).map(([k, rotulo]) => (
                <button
                  key={k}
                  onClick={() => setFiltro(k)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                    filtro === k ? 'bg-[#E1306C] border-[#E1306C] text-white' : 'border-[#232230] text-[#A0A0B2]'
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            {visiveis.length === 0 ? (
              <p className="text-xs text-[#626274] text-center py-4">Ninguém por aqui.</p>
            ) : (
              <ul className="divide-y divide-[#232230]">
                {visiveis.map((s) => (
                  <li key={s.id} className="py-2.5 flex items-center gap-3">
                    <button onClick={() => { setAchado(s); setAviso(null); }} className="flex-1 text-left min-w-0">
                      <div className="text-sm font-bold truncate">{s.nome}</div>
                      <div className="text-[10px] text-[#A0A0B2]">
                        {codigoDe(s.id)} · {pessoas(s)} {pessoas(s) === 1 ? 'pessoa' : 'pessoas'} ·{' '}
                        <span style={{ color: ROTULO[s.status].cor }}>{ROTULO[s.status].label}</span>
                      </div>
                    </button>
                    {s.status === 'aprovada' && (
                      <button
                        disabled={salvando === s.id}
                        onClick={() => mudarStatus(s, 'check_in', `${s.nome} liberado(a).`)}
                        className="bg-[#4CAF7D]/15 text-[#4CAF7D] text-[11px] font-bold px-3 py-1.5 rounded-lg"
                      >
                        Entrou
                      </button>
                    )}
                    {s.status === 'solicitada' && (
                      <button
                        disabled={salvando === s.id}
                        onClick={() => mudarStatus(s, 'aprovada', `${s.nome} aprovado(a).`)}
                        className="bg-[#E1A93A]/15 text-[#E1A93A] text-[11px] font-bold px-3 py-1.5 rounded-lg"
                      >
                        Aprovar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* resumo */}
          <div className={`${caixa} p-5 space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black">
                <Users size={16} className="text-[#E1306C]" /> Resumo da festa
              </div>
              <button
                onClick={baixarCsv}
                disabled={solicitacoes.length === 0}
                className="text-xs font-bold text-[#E1306C] inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <Download size={14} /> Baixar lista (CSV)
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                ['Pediram', n.pediram],
                ['Aprovados', n.aprovadosTotal],
                ['Compareceram', n.dentro],
                ['Presença', `${n.taxa}%`],
              ].map(([r, v]) => (
                <div key={String(r)} className="bg-[#0B0B0E] rounded-xl py-3">
                  <div className="text-2xl font-black">{v}</div>
                  <div className="text-[10px] uppercase font-bold text-[#A0A0B2]">{r}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#A0A0B2] leading-relaxed">
              Entraram <b className="text-white">{n.pessoasDentro}</b> pessoas de <b className="text-white">{n.pessoasEsperadas}</b> esperadas (contando acompanhantes).
              {' '}Recusados: {n.rejeitadas} · Cancelaram: {n.canceladas} · Aguardando resposta: {n.aguardando}.
              {lista?.vagas_limite ? ` Vagas da lista: ${lista.vagas_ocupadas}/${lista.vagas_limite}.` : ''}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
