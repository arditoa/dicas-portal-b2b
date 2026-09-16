'use client';
import { ArrowLeft, Check, Loader2, LogIn, Plus, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Gestão de Lista VIP pelo dono do LOCAL (Rodada 17). Só existe porque a
// migration 008_vinculo_evento_e_gestao_lista_vip.sql criou
// `pode_gerenciar_evento()`, que reconhece o dono do local (locais.owner_id)
// como gestor da Lista VIP de qualquer evento vinculado àquele local — mesmo
// quando o evento em si foi cadastrado anonimamente (`criado_por` nulo),
// que é o caso mais comum vindo do formulário público /cadastro/evento.
//
// Eventos criados por um ORGANIZADOR INDEPENDENTE (sem local_id) não
// aparecem aqui — essa conta de portal é sempre "sou dono de um local".
// O parceiro independente teria que passar primeiro pelo fluxo de vínculo
// em `solicitacoes_vinculo_evento` (mesma migration), que hoje só tem o
// lado do banco pronto; a tela pra isso é um próximo passo se surgir esse
// caso de uso.

type Solicitacao = {
  id: string;
  user_id: string;
  status: 'solicitada' | 'aprovada' | 'rejeitada' | 'cancelada' | 'check_in';
  acompanhantes: number;
  created_at: string;
  nome?: string;
};

type ListaVip = {
  id: string;
  titulo: string;
  vagas_limite: number | null;
  vagas_ocupadas: number;
  ativa: boolean;
};

type Evento = {
  id: string;
  titulo: string;
  data_inicio: string;
  status: string;
  listas_vip: ListaVip[];
};

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  solicitada: { label: 'Aguardando', cor: '#E1A93A' },
  aprovada: { label: 'Aprovada', cor: '#4CAF7D' },
  rejeitada: { label: 'Rejeitada', cor: '#8A8A9A' },
  cancelada: { label: 'Cancelada pelo usuário', cor: '#8A8A9A' },
  check_in: { label: 'Check-in feito', cor: '#4CAF7D' },
};

export default function ListaVipPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoSelecionado, setEventoSelecionado] = useState<string | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(false);
  const [criandoLista, setCriandoLista] = useState(false);
  const [tituloLista, setTituloLista] = useState('Lista VIP');
  const [vagasLimite, setVagasLimite] = useState('');
  const [erro, setErro] = useState('');

  const carregarEventos = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('eventos')
      .select('id, titulo, data_inicio, status, listas_vip(id, titulo, vagas_limite, vagas_ocupadas, ativa)')
      .eq('local_id', id)
      .order('data_inicio', { ascending: false });
    setEventos((data as unknown as Evento[]) || []);
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
        .eq('owner_id', userData.user.id)
        .maybeSingle();

      if (!local) {
        router.push('/dashboard');
        return;
      }
      setLocalId(local.id);
      await carregarEventos(local.id);
      setCarregando(false);
    })();
  }, [router, carregarEventos]);

  const carregarSolicitacoes = useCallback(async (listaId: string) => {
    setCarregandoSolicitacoes(true);
    const { data } = await supabase
      .from('listas_vip_solicitacoes')
      .select('id, user_id, status, acompanhantes, created_at')
      .eq('lista_vip_id', listaId)
      .order('created_at', { ascending: true });

    const lista = (data as Solicitacao[]) || [];
    if (lista.length > 0) {
      // profiles bruta é só-própria-conta (RLS); quem o dono PODE ler é
      // perfis_publicos (display_name/avatar_url, leitura liberada pra
      // qualquer logado) — por isso é uma segunda consulta, não um join.
      const { data: perfis } = await supabase
        .from('perfis_publicos')
        .select('id, display_name')
        .in('id', lista.map((s) => s.user_id));
      const nomeDoId = new Map((perfis || []).map((p: any) => [p.id, p.display_name]));
      lista.forEach((s) => (s.nome = nomeDoId.get(s.user_id) || 'Usuário'));
    }
    setSolicitacoes(lista);
    setCarregandoSolicitacoes(false);
  }, []);

  const selecionarEvento = async (eventoId: string, listaId: string | null) => {
    setEventoSelecionado(eventoId);
    setCriandoLista(false);
    setErro('');
    if (listaId) {
      await carregarSolicitacoes(listaId);
    } else {
      setSolicitacoes([]);
    }
  };

  const criarLista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoSelecionado) return;
    setErro('');
    const { error } = await supabase.from('listas_vip').insert({
      evento_id: eventoSelecionado,
      titulo: tituloLista || 'Lista VIP',
      vagas_limite: vagasLimite ? Number(vagasLimite) : null,
    });
    if (error) {
      setErro(error.message);
      return;
    }
    if (localId) await carregarEventos(localId);
    setCriandoLista(false);
    setTituloLista('Lista VIP');
    setVagasLimite('');
  };

  const mudarStatus = async (solicitacaoId: string, novoStatus: Solicitacao['status'], listaId: string) => {
    const { error } = await supabase
      .from('listas_vip_solicitacoes')
      .update({ status: novoStatus })
      .eq('id', solicitacaoId);
    if (error) {
      setErro(error.message);
      return;
    }
    await carregarSolicitacoes(listaId);
    if (localId) await carregarEventos(localId);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  const evento = eventos.find((e) => e.id === eventoSelecionado);
  const lista = evento?.listas_vip?.[0] || null;

  return (
    <div className="p-8 max-w-4xl mx-auto text-white">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-6">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <h1 className="text-2xl font-black mb-1">Lista VIP</h1>
      <p className="text-[#A0A0B2] text-xs mb-8">
        Escolha um evento do seu local pra ver ou abrir a lista VIP, e aprove/rejeite quem pediu entrada.
      </p>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold text-[#A0A0B2] uppercase mb-2">Seus eventos</h2>
          {eventos.length === 0 && (
            <p className="text-xs text-[#626274]">
              Nenhum evento cadastrado ainda pra este local. Cadastre um pelo{' '}
              <Link href="/cadastro/evento" className="underline hover:text-white">
                formulário público
              </Link>{' '}
              (não precisa estar logado pra isso).
            </p>
          )}
          {eventos.map((ev) => {
            const l = ev.listas_vip?.[0];
            return (
              <button
                key={ev.id}
                onClick={() => selecionarEvento(ev.id, l?.id || null)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  eventoSelecionado === ev.id
                    ? 'bg-[#E1306C]/10 border-[#E1306C]'
                    : 'bg-[#161520] border-[#232230] hover:border-[#E1306C]/50'
                }`}
              >
                <div className="text-xs font-bold">{ev.titulo}</div>
                <div className="text-[10px] text-[#A0A0B2] mt-1">
                  {new Date(ev.data_inicio).toLocaleDateString('pt-BR')} · {ev.status}
                  {l ? ` · Lista: ${l.vagas_ocupadas}${l.vagas_limite ? `/${l.vagas_limite}` : ''}` : ' · sem lista VIP'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="md:col-span-2">
          {!eventoSelecionado && (
            <div className="bg-[#161520] border border-[#232230] rounded-2xl p-8 text-center text-xs text-[#626274]">
              Selecione um evento à esquerda.
            </div>
          )}

          {eventoSelecionado && !lista && !criandoLista && (
            <div className="bg-[#161520] border border-[#232230] rounded-2xl p-8 text-center">
              <p className="text-xs text-[#A0A0B2] mb-4">Este evento ainda não tem Lista VIP.</p>
              <button
                onClick={() => setCriandoLista(true)}
                className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2"
              >
                <Plus size={14} /> Abrir Lista VIP pra este evento
              </button>
            </div>
          )}

          {eventoSelecionado && !lista && criandoLista && (
            <form onSubmit={criarLista} className="bg-[#161520] border border-[#232230] rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Nome da lista</label>
                <input
                  type="text"
                  value={tituloLista}
                  onChange={(e) => setTituloLista(e.target.value)}
                  className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Limite de vagas (opcional)</label>
                <input
                  type="number"
                  min="1"
                  value={vagasLimite}
                  onChange={(e) => setVagasLimite(e.target.value)}
                  placeholder="Sem limite"
                  className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#232230] hover:bg-[#2D2B3D] text-white font-bold py-3 rounded-xl transition text-sm"
              >
                Criar lista
              </button>
            </form>
          )}

          {eventoSelecionado && lista && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Users size={15} className="text-[#E1306C]" /> {lista.titulo}
                </h2>
                <span className="text-xs text-[#A0A0B2]">
                  {lista.vagas_ocupadas}{lista.vagas_limite ? ` / ${lista.vagas_limite}` : ''} vagas
                </span>
              </div>

              {carregandoSolicitacoes && <Loader2 className="animate-spin text-[#E1306C]" size={20} />}

              {!carregandoSolicitacoes && solicitacoes.length === 0 && (
                <p className="text-xs text-[#626274]">Ninguém pediu entrada nessa lista ainda.</p>
              )}

              <div className="space-y-2">
                {solicitacoes.map((s) => {
                  const info = STATUS_LABEL[s.status];
                  return (
                    <div key={s.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold">{s.nome}</div>
                        <div className="text-[10px] text-[#A0A0B2] mt-0.5">
                          {s.acompanhantes > 0 ? `+ ${s.acompanhantes} acompanhante(s)` : 'sem acompanhantes'}
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: info.cor }}>
                          {info.label}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {s.status === 'solicitada' && (
                          <>
                            <button
                              onClick={() => mudarStatus(s.id, 'aprovada', lista.id)}
                              className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 p-2 rounded-lg hover:bg-[#4CAF7D]/20"
                              title="Aprovar"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => mudarStatus(s.id, 'rejeitada', lista.id)}
                              className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg hover:bg-red-500/20"
                              title="Rejeitar"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                        {s.status === 'aprovada' && (
                          <button
                            onClick={() => mudarStatus(s.id, 'check_in', lista.id)}
                            className="bg-[#232230] text-white text-[11px] font-bold px-3 py-2 rounded-lg hover:bg-[#2D2B3D] flex items-center gap-1.5"
                            title="Marcar check-in (chegou no evento)"
                          >
                            <LogIn size={13} /> Check-in
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
