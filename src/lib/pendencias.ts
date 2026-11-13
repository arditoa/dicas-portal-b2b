// Rodada 145 — o que precisa de resposta do parceiro agora (aba Aprovações):
//   • pedidos de Lista VIP esperando aprovação (festas que ainda não passaram da janela, até 14 dias à frente);
//   • festa de hoje (atalho para abrir a porta);
//   • check-ins por código esperando confirmação;
//   • festas em análise pela equipe Dicas (só informação).
// Tudo lido com as permissões do banco (migration 099): quem não pode, simplesmente não recebe.
import { useCallback, useEffect, useState } from 'react';
import { LocalDoParceiro, Permissao, recursosDaCategoria } from './modoParceiro';
import { supabase } from './supabase';

export type PedidoVip = {
  id: string; nome: string; acompanhantes: number; criado_em: string;
  festa: { id: string; titulo: string; data_inicio: string };
};
export type CheckinPendente = { id: string; codigo: string; cliente: string; cupom: string | null; criado_em: string; distancia: number | null };
export type ReservaPendente = { id: string; nome: string; area: string; data: string; horario: string; pessoas: number; ocasiao: string | null; observacao: string | null; telefone: string | null };
export type FestaHoje = { id: string; titulo: string; data_inicio: string; faltam: number; entraram: number };
export type Pendencias = {
  vip: PedidoVip[];
  checkins: CheckinPendente[];
  reservas: ReservaPendente[];
  festaHoje: FestaHoje | null;
  emAnalise: { id: string; titulo: string; data_inicio: string }[];
  total: number;
};
const VAZIO: Pendencias = { vip: [], checkins: [], reservas: [], festaHoje: null, emAnalise: [], total: 0 };

// Janela da porta — espelho de evento_na_janela_da_porta (migração 099): de 12h antes do início
// até 12h depois do fim (sem fim, conta o início). Usada para "festa de hoje" aqui e no Início.
const JANELA_MS = 12 * 36e5;
export const fimDaJanela = (inicio: string, fim: string | null) => new Date(fim || inicio).getTime() + JANELA_MS;
export function festaNaJanelaDaPorta(inicio: string, fim: string | null, agora = Date.now()): boolean {
  return agora >= new Date(inicio).getTime() - JANELA_MS && agora <= fimDaJanela(inicio, fim);
}

export async function carregarPendencias(local: LocalDoParceiro, pode: (p: Permissao) => boolean): Promise<Pendencias> {
  const r = recursosDaCategoria(local.categoria);
  const agora = Date.now();
  const out: Pendencias = { ...VAZIO, vip: [], checkins: [], reservas: [], emAnalise: [] };
  const tarefas: Promise<void>[] = [];

  if (r.listaVip && (pode('lista_vip') || pode('porta'))) {
    tarefas.push((async () => {
      const { data } = await supabase
        .from('listas_vip_solicitacoes')
        .select('id, user_id, status, acompanhantes, created_at, listas_vip!inner(evento_id, eventos!inner(id, titulo, data_inicio, data_fim, local_id))')
        .eq('listas_vip.eventos.local_id', local.local_id)
        // começou há até 3 dias (festa longa ainda pode estar na janela); o filtro fino é festaNaJanelaDaPorta
        .gte('listas_vip.eventos.data_inicio', new Date(agora - 3 * 864e5).toISOString())
        .lte('listas_vip.eventos.data_inicio', new Date(agora + 14 * 864e5).toISOString())
        .in('status', ['solicitada', 'aprovada', 'check_in']);
      type Linha = {
        id: string; user_id: string; status: string; acompanhantes: number; created_at: string;
        listas_vip: { evento_id: string; eventos: { id: string; titulo: string; data_inicio: string; data_fim: string | null } };
      };
      const linhas = (data as unknown as Linha[]) || [];
      // festa de hoje = mesma janela do banco (12h antes do início até 12h depois do fim)
      const deHoje = (e: Linha['listas_vip']['eventos']) => festaNaJanelaDaPorta(e.data_inicio, e.data_fim, agora);
      const naoPassou = (e: Linha['listas_vip']['eventos']) => fimDaJanela(e.data_inicio, e.data_fim) >= agora;
      const linhasValidas = linhas.filter((l) => naoPassou(l.listas_vip.eventos));
      const hoje = linhasValidas.filter((l) => deHoje(l.listas_vip.eventos));
      if (hoje.length) {
        const e = hoje[0].listas_vip.eventos;
        const daFesta = hoje.filter((l) => l.listas_vip.eventos.id === e.id);
        out.festaHoje = {
          id: e.id, titulo: e.titulo, data_inicio: e.data_inicio,
          faltam: daFesta.filter((l) => l.status === 'aprovada').reduce((t, l) => t + 1 + (l.acompanhantes || 0), 0),
          entraram: daFesta.filter((l) => l.status === 'check_in').reduce((t, l) => t + 1 + (l.acompanhantes || 0), 0),
        };
      }
      if (pode('lista_vip') || (pode('porta') && hoje.length)) {
        const esperando = linhasValidas.filter((l) => l.status === 'solicitada' && (pode('lista_vip') || deHoje(l.listas_vip.eventos)));
        let nomes = new Map<string, string | null>();
        if (esperando.length) {
          const { data: perfis } = await supabase.from('perfis_publicos').select('id, display_name').in('id', esperando.map((l) => l.user_id));
          nomes = new Map(((perfis as { id: string; display_name: string | null }[]) || []).map((p) => [p.id, p.display_name]));
        }
        out.vip = esperando
          .map((l) => ({
            id: l.id, nome: nomes.get(l.user_id) || 'Convidado', acompanhantes: l.acompanhantes || 0, criado_em: l.created_at,
            festa: { id: l.listas_vip.eventos.id, titulo: l.listas_vip.eventos.titulo, data_inicio: l.listas_vip.eventos.data_inicio },
          }))
          .sort((a, b) => a.festa.data_inicio.localeCompare(b.festa.data_inicio) || a.criado_em.localeCompare(b.criado_em));
      }
    })());
  }

  if (r.checkins && pode('checkins')) {
    tarefas.push((async () => {
      const { data, error } = await supabase.rpc('checkins_do_local', { p_local_id: local.local_id, p_dias: 2 });
      if (error) return;
      out.checkins = ((data as {
        checkin_id: string; codigo_checkin: string; cliente: string; cupom: string | null; criado_em: string; situacao: string; distancia: number | null;
      }[]) || [])
        .filter((c) => c.situacao === 'pendente')
        .map((c) => ({ id: c.checkin_id, codigo: c.codigo_checkin, cliente: c.cliente, cupom: c.cupom, criado_em: c.criado_em, distancia: c.distancia }));
    })());
  }

  // Rodada 146 — reservas esperando confirmação (de hoje em diante). Sem a migração 102, só não aparece.
  if (r.reservas && pode('lista_vip')) {
    tarefas.push((async () => {
      const d = new Date(agora);
      const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('reservas')
        .select('id, nome, area_nome, data, horario, pessoas, ocasiao, observacao, telefone')
        .eq('local_id', local.local_id)
        .eq('status', 'aguardando')
        .gte('data', hoje)
        .order('data')
        .order('horario')
        .limit(50);
      if (error) return;
      out.reservas = ((data as { id: string; nome: string; area_nome: string; data: string; horario: string; pessoas: number; ocasiao: string | null; observacao: string | null; telefone: string | null }[]) || [])
        .map((x) => ({ id: x.id, nome: x.nome, area: x.area_nome, data: x.data, horario: x.horario.slice(0, 5), pessoas: x.pessoas, ocasiao: x.ocasiao, observacao: x.observacao, telefone: x.telefone }));
    })());
  }

  if (r.eventos && pode('festa')) {
    tarefas.push((async () => {
      const { data } = await supabase
        .from('eventos')
        .select('id, titulo, data_inicio')
        .eq('local_id', local.local_id)
        .eq('status', 'pendente')
        .gte('data_inicio', new Date(agora).toISOString())
        .order('data_inicio')
        .limit(10);
      out.emAnalise = (data as Pendencias['emAnalise']) || [];
    })());
  }

  await Promise.all(tarefas);
  out.total = out.vip.length + out.checkins.length + out.reservas.length;
  return out;
}

// Para a aba e o número vermelho no rodapé. Atualiza sozinho a cada 60 s.
export function usePendencias(local: LocalDoParceiro | null, pode: (p: Permissao) => boolean, intervaloMs = 60000) {
  const [p, setP] = useState<Pendencias>(VAZIO);
  const [carregando, setCarregando] = useState(false);
  const id = local?.local_id;
  const chavePerms = (local?.permissoes || []).join(',');
  const recarregar = useCallback(async () => {
    if (!local) return;
    setCarregando(true);
    try { setP(await carregarPendencias(local, pode)); } finally { setCarregando(false); }
  }, [id, chavePerms]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void recarregar();
    const t = setInterval(() => void recarregar(), intervaloMs);
    return () => clearInterval(t);
  }, [recarregar, intervaloMs]);
  return { ...p, carregando, recarregar };
}

export async function responderReserva(id: string, status: 'confirmada' | 'recusada', resposta?: string) {
  const { error } = await supabase.rpc('responder_reserva', { p_reserva: id, p_status: status, p_resposta: resposta ?? null });
  // Reservas fase 2: avisa o cliente por push (Edge Function avisar-reserva). Não espera nem trava a tela.
  if (!error) void supabase.functions.invoke('avisar-reserva', { body: { reserva_id: id } }).catch(() => {});
  return error ? error.message : null;
}

// Muda o status de um pedido e confere se o banco aceitou (o gatilho desfaz em silêncio quando não pode).
// Recusar = 'rejeitada' (enum status_solicitacao_vip, migração 001). 'recusada' não existe para a Lista VIP.
export async function responderPedido(id: string, status: 'aprovada' | 'rejeitada'): Promise<'ok' | 'sem_permissao' | 'cheia' | 'erro'> {
  const { data, error } = await supabase.from('listas_vip_solicitacoes').update({ status }).eq('id', id).select('status').maybeSingle();
  if (error) return /cheia/i.test(error.message) ? 'cheia' : 'erro';
  return data && (data as { status: string }).status === status ? 'ok' : 'sem_permissao';
}
