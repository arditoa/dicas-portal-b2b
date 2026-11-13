// Rodada 145 — Início do Modo parceiro (aba 1 de 4: Início · Divulgar · Fidelizar · Meu espaço).
//
//   • Logo, selo "Modo parceiro" logo abaixo e "Ver como cliente" (moldura TelaParceiro).
//   • Saudação pelo horário (Bom dia / Boa tarde / Boa noite) + nome do local.
//   • Cartão "Agora": festa de hoje › próxima festa › subir festa › check-ins de hoje › cupom.
//   • Seus números (7 ou 30 dias): visitas, Instagram, cupons, check-ins e as demais métricas
//     (WhatsApp, rota, telefone, favoritos, banner, festas, Lista VIP), com comparação no período de 7 dias.
//   • Ações rápidas.
//   • ESPAÇO RESERVADO para frases de venda (Plano Fundador, divulgação): ver <ChamadaVenda /> no fim do arquivo.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConviteCrescer from '../../../components/ConviteCrescer';
import FundoCaixaDegrade from '../../../components/FundoCaixaDegrade';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../../components/parceiro/TelaParceiro';
import { NOME_PAPEL, Permissao, recursosDaCategoria, useModoParceiro } from '../../../lib/modoParceiro';
import { abrirItem, IconeFeather, itensDaAba, nivelDoPlano } from '../../../lib/parceiroMenu';
import { festaNaJanelaDaPorta, usePendencias } from '../../../lib/pendencias';
import { comSituacao, useStatusDivulgar } from '../../../lib/statusDivulgar';
import { supabase } from '../../../lib/supabase';

type Numeros = Record<string, number>;
type Periodo = 7 | 30;
type Festa = { id: string; titulo: string; data_inicio: string; data_fim: string | null; status: string; listas_vip: { id: string }[] | null };
type Lista = { aguardando: number; aprovados: number; entraram: number; pessoasEntraram: number };
type Agora = {
  icone: IconeFeather; cores: [string, string]; rotulo: string; titulo: string; detalhe?: string;
  botoes: { titulo: string; chave: string; rota?: string; principal?: boolean }[];
};
type Metrica = { chave: string; rotulo: string; icone: IconeFeather; cores?: [string, string] };

const NOME_PLANO: Record<string, string> = { fundador: 'Fundador', premium: 'Premium', intermediario: 'Intermediário' };
const VAZIA: Lista = { aguardando: 0, aprovados: 0, entraram: 0, pessoasEntraram: 0 };

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const diaHora = (iso: string) =>
  `${new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} · ${hora(iso)}`;
// Festa de hoje = janela do banco (12h antes do início até 12h depois do fim), igual à porta.
const ehDeHoje = (f: Festa, agora: number) => festaNaJanelaDaPorta(f.data_inicio, f.data_fim, agora);

async function analytics(localId: string, inicio: Date, fim: Date): Promise<Numeros> {
  const { data, error } = await supabase.rpc('resumo_analytics_local', {
    p_local_id: localId, p_inicio: inicio.toISOString(), p_fim: fim.toISOString(),
  });
  if (error) throw error;
  const n: Numeros = {};
  for (const l of (data as { tipo: string; total: number }[]) || []) n[l.tipo] = Number(l.total);
  return n;
}

export default function InicioParceiro() {
  const router = useRouter();
  const { localAtivo, pode, recarregar } = useModoParceiro();
  const [periodo, setPeriodo] = useState<Periodo>(7);
  const [atual, setAtual] = useState<Numeros | null>(null);
  const [anterior, setAnterior] = useState<Numeros | null>(null);
  const [festas, setFestas] = useState<Festa[]>([]);
  const [listas, setListas] = useState<Record<string, Lista>>({});
  const [checkinsHoje, setCheckinsHoje] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [maisNumeros, setMaisNumeros] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const pend = usePendencias(localAtivo, pode);
  const st = useStatusDivulgar(localAtivo, pode);

  const localId = localAtivo?.local_id;
  const categoria = localAtivo?.categoria ?? '';
  const podeRes = pode('resultados');
  const podeFestas = pode('festa') || pode('porta') || pode('lista_vip');
  const podeCheck = pode('checkins');

  const carregar = useCallback(async () => {
    if (!localId) return;
    setCarregando(true);
    const r = recursosDaCategoria(categoria);
    const agora = new Date();
    const ini = new Date(agora.getTime() - periodo * 864e5);
    const iniAnt = new Date(agora.getTime() - 2 * periodo * 864e5);
    const atualN: Numeros = {};
    const antN: Numeros = {};
    const tarefas: Promise<void>[] = [];

    if (podeRes) {
      tarefas.push((async () => {
        try {
          const [a, b] = await Promise.all([analytics(localId, ini, agora), analytics(localId, iniAnt, ini)]);
          Object.assign(atualN, a);
          Object.assign(antN, b);
        } catch (err: any) { console.warn('[parceiro] analytics:', err?.message); }
      })());
    }

    if (podeCheck && r.checkins) {
      tarefas.push((async () => {
        // checkins_do_local devolve até 31 dias (e 300 linhas): no período de 30 dias não há comparação.
        const dias = Math.min(31, periodo * 2);
        const { data, error } = await supabase.rpc('checkins_do_local', { p_local_id: localId, p_dias: dias });
        if (error) return;
        const linhas = ((data as { criado_em: string; situacao: string }[]) || []).filter((c) => c.situacao !== 'cancelado');
        const t = (c: { criado_em: string }) => new Date(c.criado_em).getTime();
        atualN.checkins = linhas.filter((c) => t(c) >= ini.getTime()).length;
        if (periodo === 7) antN.checkins = linhas.filter((c) => t(c) >= iniAnt.getTime() && t(c) < ini.getTime()).length;
        const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
        setCheckinsHoje(linhas.filter((c) => t(c) >= inicioDia).length);
      })());
    }

    if (podeFestas && r.eventos) {
      tarefas.push((async () => {
        // Pedidos de Lista VIP no período (todas as festas do local).
        const { data: sol } = await supabase
          .from('listas_vip_solicitacoes')
          .select('status, acompanhantes, created_at, listas_vip!inner(eventos!inner(local_id))')
          .eq('listas_vip.eventos.local_id', localId)
          .gte('created_at', iniAnt.toISOString());
        for (const x of (sol as unknown as { status: string; acompanhantes: number; created_at: string }[]) || []) {
          const alvo = new Date(x.created_at).getTime() >= ini.getTime() ? atualN : antN;
          alvo.lista_pedidos = (alvo.lista_pedidos || 0) + 1;
          if (x.status === 'check_in') alvo.lista_entraram = (alvo.lista_entraram || 0) + 1 + (x.acompanhantes || 0);
        }

        // Festas de hoje e dos próximos 7 dias (cartão "Agora").
        const { data, error } = await supabase
          .from('eventos')
          .select('id, titulo, data_inicio, data_fim, status, listas_vip(id)')
          .eq('local_id', localId)
          .neq('status', 'cancelado')
          .gte('data_inicio', new Date(agora.getTime() - 3 * 864e5).toISOString()) // festa longa ainda na janela de 12h após o fim
          .lte('data_inicio', new Date(agora.getTime() + 7 * 864e5).toISOString())
          .order('data_inicio', { ascending: true })
          .limit(20);
        if (error) return;
        const fs = (data as unknown as Festa[]) || [];
        setFestas(fs);
        const ids = fs.flatMap((f) => (f.listas_vip || []).map((l) => l.id));
        if (!ids.length) { setListas({}); return; }
        const { data: ped } = await supabase.from('listas_vip_solicitacoes').select('lista_vip_id, status, acompanhantes').in('lista_vip_id', ids);
        const por: Record<string, Lista> = {};
        for (const p of (ped as { lista_vip_id: string; status: string; acompanhantes: number }[]) || []) {
          const l = (por[p.lista_vip_id] ||= { ...VAZIA });
          if (p.status === 'solicitada') l.aguardando++;
          if (p.status === 'aprovada' || p.status === 'check_in') l.aprovados++;
          if (p.status === 'check_in') { l.entraram++; l.pessoasEntraram += 1 + (p.acompanhantes || 0); }
        }
        setListas(por);
      })());
    }

    await Promise.all(tarefas);
    setAtual(atualN);
    setAnterior(antN);
    setCarregando(false);
  }, [localId, categoria, periodo, podeRes, podeFestas, podeCheck]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  if (!localAtivo) return null;
  const r = recursosDaCategoria(localAtivo.categoria);
  const ehFesta = localAtivo.categoria === 'eventos';
  const p = (x: Permissao) => pode(x);
  const plano = localAtivo.plano_comercial ? NOME_PLANO[localAtivo.plano_comercial] : undefined;

  // ---------- cartão "Agora" ----------
  const soma = (f: Festa): Lista =>
    (f.listas_vip || []).reduce<Lista>((acc, l) => {
      const x = listas[l.id];
      return x ? { aguardando: acc.aguardando + x.aguardando, aprovados: acc.aprovados + x.aprovados, entraram: acc.entraram + x.entraram, pessoasEntraram: acc.pessoasEntraram + x.pessoasEntraram } : acc;
    }, { ...VAZIA });
  const agoraMs = Date.now();
  const festaHoje = festas.find((f) => f.status === 'aprovado' && ehDeHoje(f, agoraMs));
  const proxima = festas.find((f) => new Date(f.data_inicio).getTime() > agoraMs && f !== festaHoje);
  let agora: Agora | null = null;
  if (festaHoje) {
    const l = soma(festaHoje);
    const temLista = (festaHoje.listas_vip || []).length > 0;
    agora = {
      icone: 'zap', cores: ['#C2185B', '#6A1B9A'],
      rotulo: new Date(festaHoje.data_inicio).getTime() <= agoraMs ? 'Acontecendo agora' : 'Hoje tem festa',
      titulo: `${festaHoje.titulo} · ${hora(festaHoje.data_inicio)}`,
      detalhe: temLista ? `${l.entraram} entraram (${l.pessoasEntraram} pessoas) · ${l.aprovados} aprovados · ${l.aguardando} esperando` : 'Sem Lista VIP nesta festa',
      botoes: [
        ...(p('porta') && temLista ? [{ titulo: 'Abrir a porta', chave: 'porta', rota: '/parceiro/aprovacoes', principal: true }] : []),
        ...(p('lista_vip') && l.aguardando > 0 ? [{ titulo: `Aprovar ${l.aguardando}`, chave: 'lista', rota: '/parceiro/aprovacoes' }] : []),
      ],
    };
  } else if (proxima) {
    const l = soma(proxima);
    const temLista = (proxima.listas_vip || []).length > 0;
    agora = {
      icone: 'calendar', cores: ['#4A1C8C', '#1F3A93'],
      rotulo: proxima.status === 'aprovado' ? 'Próxima festa' : 'Próxima festa · em aprovação',
      titulo: proxima.titulo,
      detalhe: `${diaHora(proxima.data_inicio)}${temLista ? ` · ${l.aguardando + l.aprovados} pedidos na lista` : ''}`,
      botoes: [
        ...(p('lista_vip') && l.aguardando > 0 ? [{ titulo: `Aprovar ${l.aguardando}`, chave: 'lista', rota: '/parceiro/aprovacoes', principal: true }] : []),
        ...(p('festa') ? [{ titulo: 'Editar festa', chave: 'eventos', rota: `/parceiro/festa-editar?id=${proxima.id}` }] : []),
      ],
    };
  } else if (r.eventos && p('festa') && ehFesta) {
    agora = {
      icone: 'plus-circle', cores: ['#4A1C8C', '#C2185B'], rotulo: 'Nenhuma festa nos próximos 7 dias',
      titulo: 'Suba a próxima festa', detalhe: 'Com flyer, data e público. Aparece em Eventos depois da aprovação.',
      botoes: [{ titulo: 'Subir festa', chave: 'festa', rota: '/parceiro/festa-editar', principal: true }],
    };
  }

  // ---------- métricas (só as que valem para a categoria e o acesso) ----------
  const grandes: Metrica[] = [];
  const pequenas: Metrica[] = [];
  if (podeRes) {
    grandes.push({ chave: 'visualizacao_perfil', rotulo: 'Visitas à página', icone: 'eye', cores: ['#E1306C', '#9B3CFF'] });
    grandes.push({ chave: 'clique_instagram', rotulo: 'Cliques no Instagram', icone: 'instagram', cores: ['#7E57C2', '#3F51B5'] });
    if (r.cupom !== false) grandes.push({ chave: 'clique_cupom', rotulo: 'Cliques em cupom', icone: 'tag', cores: ['#F2A900', '#D2551A'] });
  }
  if (podeCheck && r.checkins) grandes.push({ chave: 'checkins', rotulo: 'Check-ins', icone: 'check-circle', cores: ['#1B9E5F', '#1F6F93'] });
  if (podeFestas && r.listaVip) {
    grandes.push({ chave: 'lista_pedidos', rotulo: 'Pedidos de Lista VIP', icone: 'users', cores: ['#6A1B9A', '#C2185B'] });
    pequenas.push({ chave: 'lista_entraram', rotulo: 'Entraram pela lista', icone: 'log-in' });
  }
  if (podeRes) {
    pequenas.push(
      { chave: 'clique_whatsapp', rotulo: 'WhatsApp', icone: 'message-circle' },
      { chave: 'clique_rota', rotulo: 'Pediram a rota', icone: 'map-pin' },
      { chave: 'clique_telefone', rotulo: 'Ligações', icone: 'phone' },
      { chave: 'favoritou', rotulo: 'Salvaram o local', icone: 'heart' },
    );
    if (!ehFesta) pequenas.push({ chave: 'visualizacao_banner', rotulo: 'Banner visto', icone: 'image' }, { chave: 'clique_banner', rotulo: 'Cliques no banner', icone: 'mouse-pointer' });
    if (r.eventos) pequenas.push({ chave: 'visualizacao_festa', rotulo: 'Festas vistas', icone: 'star' }, { chave: 'clique_ingresso', rotulo: 'Cliques no ingresso', icone: 'credit-card' });
  }

  const variacao = (chave: string): { txt: string; d: number } | null => {
    if (periodo !== 7) return null;
    const v = atual?.[chave] ?? 0;
    const a = anterior?.[chave];
    if (a === undefined && !v) return null;
    if (!v && !a) return null;
    const d = v - (a ?? 0);
    return { d, txt: d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${Math.abs(d)}` : '= igual' };
  };
  const corVar = (d: number) => (d > 0 ? '#5BD69A' : d < 0 ? '#FF8A8A' : CP.dim);
  const destaque = grandes[0];
  const outrasGrandes = grandes.slice(1);
  const pequenasVisiveis = maisNumeros ? pequenas : pequenas.slice(0, 4);
  const tudoZero = !!atual && [...grandes, ...pequenas].every((m) => !atual[m.chave]);
  const nivel = nivelDoPlano(localAtivo.plano_comercial);
  const visitas = atual?.visualizacao_perfil ?? 0;
  const varVisitas = variacao('visualizacao_perfil');

  // Atalhos = só o que a casa SOBE na semana, todos do mesmo tamanho numa linha.
  // Festa em destaque fica na aba Divulgar (é compra/cota do plano, não tarefa da semana).
  const ORDEM = ['agenda', 'cupons', 'banner', 'festa', 'reservas'];
  const rapidas = comSituacao([...itensDaAba('divulgar', localAtivo, pode), ...itensDaAba('espaco', localAtivo, pode).filter((i) => i.chave === 'reservas')], st)
    .filter((i) => ORDEM.includes(i.chave))
    .sort((a, b) => ORDEM.indexOf(a.chave) - ORDEM.indexOf(b.chave));
  // ---------- Lousa da semana: cada linha = o que subir, como está e o botão do próximo passo ----------
  type LinhaLousa = { item: (typeof rapidas)[number]; titulo: string; situacao: string; tom: 'ok' | 'alerta' | 'neutro'; acao: string; aoTocar?: () => void };
  // Cada ação da lousa vira um ícone (o texto fica só para leitor de tela).
  const ICONE_ACAO: Record<string, IconeFeather> = {
    Subir: 'upload', Criar: 'plus', Nova: 'plus', Ver: 'eye', Trocar: 'refresh-cw', Confirmar: 'check',
    Ajustar: 'sliders', Ligar: 'power', Liberar: 'unlock', Abrir: 'chevron-right',
  };
  const lousa: LinhaLousa[] = rapidas.map((it) => {
    const s = it.seloTom ? { txt: it.selo || '', tom: it.seloTom } : null;
    if (it.bloqueado) return { item: it, titulo: it.titulo, situacao: it.selo || 'Planos pagos', tom: 'neutro', acao: 'Liberar' };
    switch (it.chave) {
      case 'agenda':
        return { item: it, titulo: 'Agenda da semana', situacao: s?.txt || 'Programação de cada dia', tom: s?.tom || 'neutro', acao: s?.tom === 'ok' ? 'Ver' : 'Subir' };
      case 'cupons':
        // "Novo cupom": liberado → abre direto a criação; senão, a lista (mostra quando libera).
        return {
          item: it, titulo: 'Cupom', situacao: s?.txt || 'Na página da casa', tom: s?.tom || 'neutro', acao: s?.tom === 'ok' ? 'Criar' : 'Ver',
          aoTocar: s?.tom === 'ok' ? () => router.push('/parceiro/cupom-editar') : undefined,
        };
      case 'banner':
        return { item: it, titulo: 'Banner', situacao: s?.txt || 'Na Home e na categoria', tom: s?.tom || 'neutro', acao: 'Trocar' };
      case 'festa': {
        const f = festaHoje || proxima;
        return {
          item: it, titulo: 'Festa', acao: 'Nova',
          situacao: festaHoje ? `Hoje: ${festaHoje.titulo}` : proxima ? `Próxima: ${diaHora(proxima.data_inicio)}` : 'Nenhuma nos próximos 7 dias',
          tom: f ? 'ok' : ehFesta ? 'alerta' : 'neutro',
        };
      }
      case 'reservas': {
        const h = st.reservasHoje;
        if (h && (h.confirmadas || h.aguardando)) {
          return {
            item: it, titulo: 'Reservas de hoje', acao: h.aguardando ? 'Confirmar' : 'Ver',
            situacao: `${h.confirmadas} confirmada${h.confirmadas === 1 ? '' : 's'}${h.aguardando ? ` · ${h.aguardando} esperando` : ''}`,
            tom: h.aguardando ? 'alerta' : 'ok',
            aoTocar: h.aguardando ? () => router.push('/parceiro/aprovacoes') : undefined,
          };
        }
        return { item: it, titulo: 'Reservas', situacao: s?.txt || 'Botão na página da casa', tom: s?.tom || 'neutro', acao: s?.tom === 'ok' ? 'Ajustar' : 'Ligar' };
      }
      default:
        return { item: it, titulo: it.titulo, situacao: it.sub, tom: 'neutro', acao: 'Abrir' };
    }
  });
  const emDia = lousa.filter((l) => l.tom === 'ok').length;

  const tocarBotao = (b: Agora['botoes'][number]) =>
    abrirItem(router, { chave: b.chave, titulo: b.titulo, sub: '', icone: 'circle', cor: '', rota: b.rota });

  const atualizar = async () => {
    setAtualizando(true);
    await recarregar();
    await Promise.all([carregar(), pend.recarregar(), st.recarregar()]);
    setAtualizando(false);
  };

  return (
    <TelaParceiro atualizando={atualizando} aoAtualizar={atualizar}>
      <ConviteCrescer local={localAtivo} />

      {/* Faixa de mensagem: o que espera resposta (leva a Aprovações) ou, sem pendências, a mensagem da equipe Dicas */}
      {pend.total > 0 ? (
        <TouchableOpacity style={[e.msg, e.msgAlerta]} onPress={() => router.push('/parceiro/aprovacoes')} activeOpacity={0.85} accessibilityRole="button">
          <View style={[e.msgIcone, { backgroundColor: '#E1306C' }]}><Text style={e.msgNum}>{pend.total > 99 ? '99+' : pend.total}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={e.msgTitulo}>{pend.total} {pend.total > 1 ? 'coisas esperando' : 'coisa esperando'} você</Text>
            <Text style={e.msgSub} numberOfLines={1}>
              {[pend.vip.length ? `${pend.vip.length} pedido${pend.vip.length > 1 ? 's' : ''} de Lista VIP` : '', pend.checkins.length ? `${pend.checkins.length} check-in${pend.checkins.length > 1 ? 's' : ''}` : '', pend.reservas.length ? `${pend.reservas.length} reserva${pend.reservas.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <ChamadaVenda
          titulo={podeRes && visitas > 0 ? `${visitas} visita${visitas > 1 ? 's' : ''} na sua página` : 'Tudo em dia por aqui'}
          sub={
            localAtivo.papel === 'porta_pin' && localAtivo.expira_em
              ? `Acesso da porta até ${hora(localAtivo.expira_em)}`
              : podeRes && visitas > 0
              ? `Nos últimos ${periodo} dias${varVisitas && varVisitas.d > 0 ? ` · ${varVisitas.d} a mais que na semana passada` : ''} · nada esperando resposta`
              : 'Nenhum pedido ou check-in esperando você.'
          }
          dica={localAtivo.papel === 'dono' && nivel !== 'premium' ? 'Apareça na Home com banner e cupons' : null}
          aoTocarDica={() => router.push('/parceiro/divulgar')}
        />
      )}

      {/* Agora: só quando há festa (hoje, próxima ou nenhuma marcada) */}
      {agora && (
        <View style={e.agora}>
          <FundoCaixaDegrade id="parceiro-agora" cores={agora.cores} />
          <View style={{ flex: 1 }}>
            <View style={e.agoraTopo}>
              <Feather name={agora.icone} size={12} color="#FFFFFF" />
              <Text style={e.agoraRotulo}>{agora.rotulo}</Text>
            </View>
            <Text style={e.agoraTitulo} numberOfLines={1}>{agora.titulo}</Text>
            {!!agora.detalhe && <Text style={e.agoraDetalhe} numberOfLines={2}>{agora.detalhe}</Text>}
          </View>
          {agora.botoes[0] && (
            <TouchableOpacity style={e.agoraBotao} onPress={() => tocarBotao(agora!.botoes[0])} accessibilityRole="button">
              <Text style={e.agoraBotaoTexto}>{agora.botoes[0].titulo}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Lousa da semana: recado do que subir e do que já está em dia (no lugar dos quadradinhos) */}
      {lousa.length > 0 && (
        <View style={e.lousa}>
          <View style={e.lousaTopo}>
            <Feather name="edit-3" size={14} color={GIZ} />
            <Text style={e.lousaTitulo}>Lousa da semana</Text>
            <Text style={e.lousaConta}>{emDia} de {lousa.length} em dia</Text>
          </View>
          {lousa.map((l, i) => {
            const cor = l.tom === 'ok' ? '#7FE0A8' : l.tom === 'alerta' ? '#FF8FB1' : '#9FB0A6';
            return (
              <TouchableOpacity
                key={l.item.chave}
                style={[e.lousaLinha, i > 0 && e.lousaRisco]}
                onPress={l.aoTocar || (() => abrirItem(router, l.item, localAtivo.nome))}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${l.titulo}. ${l.situacao}. ${l.acao}`}
              >
                <View style={[e.lousaMarca, { borderColor: cor }, l.tom === 'ok' && { backgroundColor: cor }]}>
                  {l.tom === 'ok' ? <Feather name="check" size={12} color="#17201C" /> : l.item.bloqueado ? <Feather name="lock" size={10} color={cor} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[e.lousaItem, l.tom === 'ok' && e.lousaFeito]} numberOfLines={1}>{l.titulo}</Text>
                  <Text style={[e.lousaSit, { color: cor }]} numberOfLines={1}>{l.situacao}</Text>
                </View>
                <View style={[e.lousaAcao, l.tom === 'alerta' && { backgroundColor: GIZ, borderColor: GIZ }]}>
                  <Feather name={ICONE_ACAO[l.acao] || 'chevron-right'} size={16} color={l.tom === 'alerta' ? '#17201C' : GIZ} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Seus números */}
      {(grandes.length > 0 || pequenas.length > 0) && (
        <>
          <TituloSecao
            texto="Seus números"
            direita={
              <View style={e.periodo}>
                {([7, 30] as Periodo[]).map((d) => (
                  <TouchableOpacity key={d} onPress={() => setPeriodo(d)} style={[e.periodoBotao, periodo === d && e.periodoAtivo]}>
                    <Text style={[e.periodoTexto, periodo === d && { color: '#FFF' }]}>{d} dias</Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
          {carregando && !atual ? (
            <ActivityIndicator color={CP.rosa} style={{ marginVertical: 18 }} />
          ) : (
            <>
              {destaque && (() => {
                const v = variacao(destaque.chave);
                return (
                  <View style={e.destaque}>
                    <FundoCaixaDegrade id={`num-${destaque.chave}`} cores={destaque.cores!} />
                    <View style={{ flex: 1 }}>
                      <View style={e.destaqueTopo}>
                        <Feather name={destaque.icone} size={14} color="#FFFFFF" />
                        <Text style={e.destaqueRotulo}>{destaque.rotulo}</Text>
                      </View>
                      <Text style={e.destaqueValor}>{atual?.[destaque.chave] ?? 0}</Text>
                    </View>
                    {!!v && (
                      <View style={e.destaqueVar}>
                        <Text style={e.destaqueVarTxt}>{v.txt}</Text>
                        <Text style={e.destaqueVarSub}>vs. semana passada</Text>
                      </View>
                    )}
                  </View>
                );
              })()}
              {outrasGrandes.length > 0 && (
                <View style={[e.grade, { marginTop: ESP.s }]}>
                  {outrasGrandes.map((m) => {
                    const v = variacao(m.chave);
                    const cor = m.cores?.[0] || CP.rosa;
                    return (
                      <View key={m.chave} style={e.numeroCaixa}>
                        <View style={e.numeroTopo}>
                          <View style={[e.numeroIcone, { backgroundColor: cor + '2E' }]}><Feather name={m.icone} size={14} color={cor} /></View>
                          {!!v && <Text style={[e.numeroVar, { color: corVar(v.d) }]}>{v.txt}</Text>}
                        </View>
                        <Text style={e.numeroValor}>{atual?.[m.chave] ?? 0}</Text>
                        <Text style={e.numeroRotulo} numberOfLines={1}>{m.rotulo}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {pequenas.length > 0 && (
                <View style={[e.cartaoPequenas, { marginTop: ESP.s }]}>
                  {pequenasVisiveis.map((m, i) => {
                    const v = variacao(m.chave);
                    return (
                      <View key={m.chave} style={[e.pequena, i > 0 && e.pequenaBorda]}>
                        <Feather name={m.icone} size={15} color={CP.dim} />
                        <Text style={e.pequenaRotulo} numberOfLines={1}>{m.rotulo}</Text>
                        {!!v && <Text style={[e.pequenaVar, { color: corVar(v.d) }]}>{v.txt}</Text>}
                        <Text style={e.pequenaValor}>{atual?.[m.chave] ?? 0}</Text>
                      </View>
                    );
                  })}
                  {pequenas.length > 4 && (
                    <TouchableOpacity style={[e.pequena, e.pequenaBorda, { justifyContent: 'center' }]} onPress={() => setMaisNumeros((x) => !x)}>
                      <Text style={e.verMais}>{maisNumeros ? 'Ver menos' : `Ver mais ${pequenas.length - 4} números`}</Text>
                      <Feather name={maisNumeros ? 'chevron-up' : 'chevron-down'} size={16} color={CP.rosa} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {tudoZero && (
                <Text style={e.zero}>
                  Os números começam a contar quando o público abre sua página, salva o local ou pede a Lista VIP. Festa e agenda em dia trazem as primeiras visitas.
                </Text>
              )}
            </>
          )}
        </>
      )}

      <View style={{ height: 8 }} />

    </TelaParceiro>
  );
}

// Faixa de mensagem quando não há pendências. Hoje mostra a saudação; é aqui que entram as
// mensagens da equipe Dicas (Plano Fundador, divulgação de festas…), sem preço e sem pagamento no app.
const GIZ = '#EEF3EF'; // cor do giz na lousa
const ROTULO_CURTO: Record<string, string> = {
  festa: 'Nova festa', agenda: 'Agenda da semana', banner: 'Banner', cupons: 'Novo cupom', destaque_festa: 'Festa em destaque', eventos: 'Minhas festas',
};
function ChamadaVenda({ titulo, sub, dica, aoTocarDica }: { titulo: string; sub: string; dica: string | null; aoTocarDica: () => void }) {
  return (
    <View style={e.msgCaixa}>
      <View style={e.msgLinha}>
        <View style={[e.msgIcone, { backgroundColor: '#14301F' }]}><Feather name="check" size={18} color="#4CAF7D" /></View>
        <View style={{ flex: 1 }}>
          <Text style={e.msgTitulo} numberOfLines={1}>{titulo}</Text>
          <Text style={e.msgSub} numberOfLines={2}>{sub}</Text>
        </View>
      </View>
      {!!dica && (
        <TouchableOpacity style={e.msgDica} onPress={aoTocarDica} accessibilityRole="button">
          <Feather name="trending-up" size={14} color={CP.rosa} />
          <Text style={e.msgDicaTxt}>{dica}</Text>
          <Feather name="chevron-right" size={16} color={CP.rosa} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const e = StyleSheet.create({
  msg: {
    marginTop: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m,
    paddingHorizontal: ESP.m, paddingVertical: ESP.m, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: ESP.m,
  },
  msgCaixa: { marginTop: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  msgLinha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m },
  msgDica: {
    flexDirection: 'row', alignItems: 'center', gap: ESP.s, marginTop: ESP.m, paddingTop: ESP.m,
    borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth,
  },
  msgDicaTxt: { flex: 1, color: CP.rosa, fontSize: 12, fontWeight: '800' },
  msgAlerta: { backgroundColor: '#3A1424', borderColor: '#7A2348' },
  msgIcone: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  msgNum: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  msgTitulo: { color: CP.texto, fontSize: 14, fontWeight: '700' },
  msgSub: { color: CP.dim, fontSize: 12, marginTop: 1 },

  agora: {
    flexDirection: 'row', alignItems: 'center', gap: ESP.m, borderRadius: RAIO.m, overflow: 'hidden',
    paddingHorizontal: 14, paddingVertical: 14, marginTop: ESP.s, backgroundColor: CP.card,
  },
  agoraTopo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  agoraRotulo: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  agoraTitulo: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 3 },
  agoraDetalhe: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 16, marginTop: 2 },
  agoraBotao: { backgroundColor: '#FFFFFF', borderRadius: RAIO.s, paddingHorizontal: ESP.m, minHeight: 40, justifyContent: 'center' },
  agoraBotaoTexto: { color: '#1A0F1F', fontSize: 13, fontWeight: '800' },

  atalhos: { flexDirection: 'row', gap: ESP.s },
  atalho: { flex: 1, borderRadius: RAIO.m, borderWidth: 1, paddingVertical: ESP.m, paddingHorizontal: 6, minHeight: 96, alignItems: 'center' },
  atalhoIcone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  atalhoTxt: { color: CP.texto, fontSize: 12, fontWeight: '800', marginTop: ESP.s, lineHeight: 15, textAlign: 'center' },
  atalhoSit: { fontSize: 10, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  atalhoCadeado: { position: 'absolute', top: ESP.s, right: ESP.s, width: 20, height: 20, borderRadius: 10, backgroundColor: '#3A3950', alignItems: 'center', justifyContent: 'center' },

  // Lousa: fundo verde-ardósia escuro, letras cor de giz, riscos tracejados entre as linhas.
  lousa: { marginTop: ESP.xl, backgroundColor: '#17201C', borderColor: '#2C3A33', borderWidth: 1, borderRadius: RAIO.m, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  lousaTopo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  lousaTitulo: { flex: 1, color: GIZ, fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase' },
  lousaConta: { color: '#9FB0A6', fontSize: 11, fontWeight: '700' },
  lousaLinha: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  lousaRisco: { borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: '#34443C' },
  lousaMarca: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  lousaItem: { color: GIZ, fontSize: 15, fontWeight: '700' },
  lousaFeito: { color: '#C7D3CB' },
  lousaSit: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  lousaAcao: { borderWidth: 1, borderColor: '#5B6E63', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lousaAcaoTxt: { color: GIZ, fontSize: 12, fontWeight: '800' },

  periodo: { flexDirection: 'row', backgroundColor: CP.card, borderRadius: 14, padding: 2, borderColor: CP.borda, borderWidth: 1 },
  periodoBotao: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  periodoAtivo: { backgroundColor: CP.rosa },
  periodoTexto: { color: CP.dim, fontSize: 11, fontWeight: '700' },

  // 1 número em destaque (degradê) + caixas iguais escuras + lista compacta com "ver mais"
  destaque: { flexDirection: 'row', alignItems: 'center', borderRadius: RAIO.m, overflow: 'hidden', padding: ESP.l, minHeight: 100, backgroundColor: CP.card },
  destaqueTopo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  destaqueRotulo: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '700' },
  destaqueValor: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 },
  destaqueVar: { backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: RAIO.s, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'flex-end' },
  destaqueVarTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  destaqueVarSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s },
  numeroCaixa: {
    width: '48%', flexGrow: 1, borderRadius: RAIO.m, padding: ESP.m, minHeight: 96, backgroundColor: CP.card,
    borderColor: CP.borda, borderWidth: 1,
  },
  numeroTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numeroIcone: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  numeroValor: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: ESP.s },
  numeroRotulo: { color: CP.dim, fontSize: 12, fontWeight: '600' },
  numeroVar: { fontSize: 11, fontWeight: '800' },

  cartaoPequenas: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden' },
  pequena: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: ESP.m, minHeight: 46 },
  pequenaBorda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  pequenaRotulo: { flex: 1, color: CP.dim, fontSize: 13 },
  pequenaValor: { color: CP.texto, fontSize: 15, fontWeight: '800', minWidth: 28, textAlign: 'right' },
  pequenaVar: { fontSize: 11, fontWeight: '800' },
  verMais: { color: CP.rosa, fontSize: 13, fontWeight: '800' },
  zero: { color: CP.fraco, fontSize: 12, lineHeight: 17, marginTop: ESP.s },

});
