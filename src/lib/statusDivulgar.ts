// Rodada 145 — situação de cada coisa que a casa sobe na semana (mesma regra do portal, lib/parceiro.ts):
//   • Agenda da semana: em dia / falta esta semana (linha fixa vale para todas as semanas).
//   • Cupom: liberado / libera dd/mm (uso_ofertas_periodo: Premium e Fundador 1 a cada 7 dias, Intermediário 1 a cada 14).
//   • Banner (Premium/Fundador): frase atual e há quantos dias foi trocado. Pode trocar quando quiser; o ideal é toda semana.
//   • Festas em destaque do plano (Premium/Fundador): X de 4 usadas no mês.
// Qualquer consulta que falhar (sem permissão, migração faltando) só deixa aquele item sem situação.
import { useCallback, useEffect, useState } from 'react';
import { LocalDoParceiro, Permissao, recursosDaCategoria } from './modoParceiro';
import { nivelDoPlano } from './parceiroMenu';
import { supabase } from './supabase';

export type Tom = 'ok' | 'alerta' | 'neutro';
export type Situacao = { txt: string; tom: Tom };
export type StatusDivulgar = {
  itens: Record<string, Situacao>;
  banner: { chamada: string | null; dias: number | null } | null; // null = não se aplica
  destaques: { usadas: number; limite: number } | null; // null = sem festa do plano
  reservasHoje: { confirmadas: number; aguardando: number } | null; // null = reservas desligadas / sem acesso
};

const VAZIO: StatusDivulgar = { itens: {}, banner: null, destaques: null, reservasHoje: null };
const chave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function useStatusDivulgar(local: LocalDoParceiro | null | undefined, pode: (p: Permissao) => boolean) {
  const [st, setSt] = useState<StatusDivulgar>(VAZIO);
  const localId = local?.local_id;
  const categoria = local?.categoria ?? '';
  const plano = local?.plano_comercial ?? null; // plano efetivo (modoParceiro): pago fora do status ativo = Gratuito
  const podeFesta = pode('festa');
  const podeCupom = pode('cupons');
  const podeBanner = pode('banner');
  const podeLista = pode('lista_vip');

  const carregar = useCallback(async () => {
    if (!localId) return;
    const r = recursosDaCategoria(categoria);
    const premium = nivelDoPlano(plano) === 'premium';
    const agora = new Date();
    const seg = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - ((agora.getDay() + 6) % 7));
    const dom = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);
    const itens: Record<string, Situacao> = {};
    let banner: StatusDivulgar['banner'] = null;
    let destaques: StatusDivulgar['destaques'] = null;
    let reservasHoje: StatusDivulgar['reservasHoje'] = null;

    await Promise.all([
      (async () => {
        if (!(podeFesta && r.agenda)) return;
        const { data, error } = await supabase.from('agenda_semanal').select('data, tipo, ativo').eq('local_id', localId);
        if (error) return;
        const linhas = ((data as { data: string | null; tipo: string | null; ativo: boolean | null }[]) || []).filter((l) => l.ativo !== false);
        const emDia = linhas.some((l) => !l.data && l.tipo !== 'semana') || linhas.some((l) => !!l.data && l.data >= chave(seg) && l.data <= chave(dom));
        itens.agenda = emDia ? { txt: 'Semana em dia', tom: 'ok' } : { txt: 'Falta esta semana', tom: 'alerta' };
      })(),
      (async () => {
        if (!(podeCupom && r.cupom !== false) || nivelDoPlano(plano) === 'gratuito') return;
        const { data, error } = await supabase.rpc('uso_ofertas_periodo', { p_local_id: localId });
        if (error) return;
        const l = (Array.isArray(data) ? data[0] : data) as { limite: number | null; usadas: number; libera_em: string | null } | null;
        if (!l) return;
        const livre = l.limite == null || Number(l.usadas) < l.limite;
        itens.cupons = livre ? { txt: 'Liberado agora', tom: 'ok' } : { txt: l.libera_em ? `Libera ${dataCurta(l.libera_em)}` : 'Já usado', tom: 'neutro' };
      })(),
      (async () => {
        if (!(podeBanner && premium) || categoria === 'eventos') return;
        const { data, error } = await supabase.from('destaque_chamada').select('chamada, updated_at').eq('local_id', localId).maybeSingle();
        if (error) return;
        const d = data as { chamada: string; updated_at: string } | null;
        const dias = d?.updated_at ? Math.floor((agora.getTime() - new Date(d.updated_at).getTime()) / 864e5) : null;
        banner = { chamada: d?.chamada ?? null, dias };
        itens.banner = !d
          ? { txt: 'Sem frase ainda', tom: 'alerta' }
          : dias !== null && dias >= 7
          ? { txt: `Trocado há ${dias} dias`, tom: 'alerta' }
          : { txt: dias === 0 ? 'Trocado hoje' : `Trocado há ${dias} dia${dias === 1 ? '' : 's'}`, tom: 'ok' };
      })(),
      (async () => {
        if (!(podeFesta && r.eventos && premium)) return;
        const { data, error } = await supabase.rpc('festas_do_plano_no_mes', { p_local: localId, p_data: agora.toISOString() });
        if (error) return;
        destaques = { usadas: Number(data) || 0, limite: 4 };
      })(),
      (async () => {
        // Reservas (migração 102): como o botão está e quantas reservas hoje.
        if (!r.reservas || nivelDoPlano(plano) === 'gratuito') return;
        const { data, error } = await supabase.from('reserva_config').select('modo').eq('local_id', localId).maybeSingle();
        if (error) return;
        const modo = (data as { modo: string } | null)?.modo || 'desligado';
        itens.reservas = modo === 'app' ? { txt: 'Ligada · pelo app', tom: 'ok' } : modo === 'whatsapp' ? { txt: 'Ligada · WhatsApp', tom: 'ok' } : { txt: 'Desligada', tom: 'alerta' };
        if (modo !== 'app' || !podeLista) return;
        const { data: rs } = await supabase.from('reservas').select('status').eq('local_id', localId).eq('data', chave(agora)).in('status', ['aguardando', 'confirmada']);
        const linhas = (rs as { status: string }[]) || [];
        reservasHoje = { confirmadas: linhas.filter((x) => x.status === 'confirmada').length, aguardando: linhas.filter((x) => x.status === 'aguardando').length };
      })(),
    ]);
    setSt({ itens, banner, destaques, reservasHoje });
  }, [localId, categoria, plano, podeFesta, podeCupom, podeBanner, podeLista]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { ...st, recarregar: carregar };
}

// Aplica a situação no item (etiqueta + cor) e, no banner, a mensagem do toque.
export function comSituacao<T extends { chave: string; selo?: string; seloTom?: Tom; aviso?: string; bloqueado?: boolean }>(itens: T[], st: StatusDivulgar): T[] {
  return itens.map((i) => {
    if (i.bloqueado) return i;
    const s = st.itens[i.chave];
    let aviso = i.aviso;
    if (i.chave === 'banner' && st.banner) {
      const { chamada, dias } = st.banner;
      aviso = `${chamada ? `Banner atual: “${chamada}”` : 'Você ainda não escreveu a frase do banner.'}${dias !== null ? `\nTrocado há ${dias} dia${dias === 1 ? '' : 's'}.` : ''}\n\nVocê pode trocar quando quiser. O ideal é toda semana: quem vê a Home sempre encontra novidade.`;
    }
    return s ? { ...i, selo: s.txt, seloTom: s.tom, aviso } : { ...i, aviso };
  });
}
