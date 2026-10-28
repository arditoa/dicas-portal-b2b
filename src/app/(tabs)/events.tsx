import { BotaoVoltar, TituloTela } from '../../components/CabecalhoTela';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/authContext';
import { deveExibirGlow, estaFixadoEm } from '../../lib/destaque';
import { supabase } from '../../lib/supabase';
import { GRUPOS_EVENTO, LEGADO_EVENTO, TAGS_EVENTO_AUTOMATICAS, rotuloTag, slugTag } from '../../lib/taxonomia';
import { useRastrearTela } from '../../lib/usoTelas';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
  gold: '#FFD54F',
  green: '#4CAF7D',
};

// Rodada 63 — filtros com a taxonomia oficial (src/lib/taxonomia.ts).
// Eventos antigos (só com estilos_musicais/publico_tags do enum antigo)
// continuam aparecendo pelos equivalentes em LEGADO_EVENTO.
const GRUPO = (id: string) => GRUPOS_EVENTO.find((g) => g.id === id)!;
const GRUPOS_EXTRAS = ['ingresso', 'quando', 'estrutura', 'ambiente', 'classificacao'];

function eventoTem(ev: { tags?: string[] | null; estilos_musicais?: string[] | null; publico_tags?: string[] | null; listaVipAtiva?: any }, slug: string): boolean {
  if (ev.tags?.includes(slug)) return true;
  if (slug === 'lista_vip' && ev.listaVipAtiva) return true;
  const legado = LEGADO_EVENTO[slug];
  return !!legado && legado.some((l) => ev.estilos_musicais?.includes(l) || ev.publico_tags?.includes(l));
}

// Rodada 39 — bug real encontrado: `calcularDateTag` sempre soube gerar a
// tag 'outro' (qualquer evento além do próximo fim de semana), mas
// NENHUM lugar da UI (nem os botões rápidos, nem esse modal) tinha uma
// opção que setasse `dateFilter` pra 'outro' — um evento aprovado com
// data futura "normal" (ex.: dentro de 3 semanas) ficava
// PERMANENTEMENTE inalcançável na tela, mesmo aparecendo certinho no
// banco. Reportado pela Andrea ("testei datas futuras mas não aparece no
// app, no Supabase aparecem os eventos"). Adicionada a opção que faltava.
const CALENDAR_DATES = [
  { id: 'hoje', label: 'Hoje', sub: 'Eventos acontecendo agora' },
  { id: 'amanha', label: 'Amanhã', sub: 'Agenda de amanhã' },
  { id: 'fds', label: 'Este Fim de Semana', sub: 'Sábado & Domingo' },
  { id: 'proximo_fds', label: 'Próximo Fim de Semana', sub: 'Destaques futuros' },
  { id: 'outro', label: 'Mais pra Frente', sub: 'Depois do próximo fim de semana' },
];

const STATUS_SOLICITACAO_LABEL: Record<string, string> = {
  solicitada: 'Solicitação enviada — aguardando aprovação',
  aprovada: 'Aprovada! Seu nome está confirmado na lista',
  rejeitada: 'Solicitação não aprovada',
  cancelada: 'Solicitação cancelada',
  check_in: 'Check-in já feito na portaria',
};

const DIAS_SEMANA = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

type DateTag = 'hoje' | 'amanha' | 'fds' | 'proximo_fds' | 'outro';

interface ListaVip {
  id: string;
  titulo: string;
  vagas_limite: number | null;
  vagas_ocupadas: number;
  ativa: boolean;
}

interface EventoRow {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  estilos_musicais: string[];
  publico_tags: string[];
  tags?: string[] | null;
  foto_capa_url: string | null;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  destaque_secao_fixada: string | null;
  destaque_secoes: string[] | null;
  destaque_ate: string | null;
  local_id: string | null;
  locais: { nome: string; bairro: string | null; cidade: string } | null;
  listas_vip: ListaVip[] | null;
}

interface EventItem extends EventoRow {
  dateTag: DateTag;
  listaVipAtiva: ListaVip | null;
}

function calcularDateTag(dataInicioISO: string): DateTag {
  const agora = new Date();
  const data = new Date(dataInicioISO);

  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diffDias = Math.round((inicioData.getTime() - inicioHoje.getTime()) / 86400000);

  if (diffDias === 0) return 'hoje';
  if (diffDias === 1) return 'amanha';

  const diaSemanaHoje = agora.getDay(); // 0 = domingo, 6 = sábado
  const diasAteSabado = (6 - diaSemanaHoje + 7) % 7;
  const diasAteDomingo = diasAteSabado + 1;

  if (diffDias >= diasAteSabado && diffDias <= diasAteDomingo) return 'fds';
  if (diffDias >= diasAteSabado + 7 && diffDias <= diasAteDomingo + 7) return 'proximo_fds';

  return 'outro';
}

function formatarDataEvento(dataInicioISO: string, tag: DateTag): string {
  const data = new Date(dataInicioISO);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (tag === 'hoje') return `Hoje • ${hora}`;
  if (tag === 'amanha') return `Amanhã • ${hora}`;
  return `${DIAS_SEMANA[data.getDay()]} • ${hora}`;
}

export default function EventsScreen() {
  useRastrearTela('eventos');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const isUserLogged = !!session;

  const [dateFilter, setDateFilter] = useState<DateTag>('hoje');
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [selectedPublic, setSelectedPublic] = useState<string | null>(null);
  const [filtrosExtras, setFiltrosExtras] = useState<string[]>([]);
  const [showFiltrosModal, setShowFiltrosModal] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<Record<string, string>>({});

  // Modais
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEventForList, setSelectedEventForList] = useState<EventItem | null>(null);
  const [acompanhantes, setAcompanhantes] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const carregarEventos = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);

      const CAMPOS =
        'id, titulo, descricao, data_inicio, data_fim, estilos_musicais, publico_tags, foto_capa_url, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, local_id, locais(nome, bairro, cidade), listas_vip(id, titulo, vagas_limite, vagas_ocupadas, ativa)';
      const consultar = (campos: string) =>
        supabase
          .from('eventos')
          .select(campos)
          .eq('status', 'aprovado')
          .gte('data_inicio', inicioHoje.toISOString())
          .order('data_inicio', { ascending: true })
          .limit(60);
      // Coluna `tags` vem da migration 036; sem ela, segue com os campos antigos.
      let { data, error } = await consultar(`${CAMPOS}, tags`);
      if (error) ({ data, error } = await consultar(CAMPOS));

      if (error) throw error;

      const linhas = (data || []) as unknown as EventoRow[];
      const itens: EventItem[] = linhas.map((ev) => ({
        ...ev,
        dateTag: calcularDateTag(ev.data_inicio),
        listaVipAtiva: (ev.listas_vip || []).find((l) => l.ativa) || null,
      }));

      setEvents(itens);

      // Carrega o status das minhas próprias solicitações, se estiver logado
      if (user?.id) {
        const listaIds = itens.map((ev) => ev.listaVipAtiva?.id).filter(Boolean) as string[];
        if (listaIds.length > 0) {
          const { data: minhas, error: errMinhas } = await supabase
            .from('listas_vip_solicitacoes')
            .select('lista_vip_id, status')
            .eq('user_id', user.id)
            .in('lista_vip_id', listaIds);

          if (!errMinhas && minhas) {
            const mapa: Record<string, string> = {};
            minhas.forEach((s: any) => {
              mapa[s.lista_vip_id] = s.status;
            });
            setMinhasSolicitacoes(mapa);
          }
        } else {
          setMinhasSolicitacoes({});
        }
      } else {
        setMinhasSolicitacoes({});
      }
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregarEventos();
  }, [carregarEventos]);

  // Rodada 41 — a agenda é cronológica por natureza (não faz sentido um
  // evento da semana que vem furar na frente do de hoje só porque
  // paga), então a única coisa que a fixação manual do /admin
  // ("evento_destaque") faz aqui é furar a fila DENTRO do mesmo filtro
  // de data já selecionado — o resto continua ordenado por data/hora
  // como sempre foi (.filter preserva a ordem, e o sort abaixo é
  // estável: só separa fixados do resto, sem embaralhar o restante).
  const filteredEvents = events
    .filter((ev) => {
      if (ev.dateTag !== dateFilter) return false;
      if (selectedTipo && !eventoTem(ev, selectedTipo)) return false;
      if (selectedMusic && !eventoTem(ev, selectedMusic)) return false;
      if (selectedPublic && !eventoTem(ev, selectedPublic)) return false;
      if (filtrosExtras.some((t) => !eventoTem(ev, t))) return false;
      return true;
    })
    .sort((a, b) => {
      const aFixado = estaFixadoEm(a, 'evento_destaque');
      const bFixado = estaFixadoEm(b, 'evento_destaque');
      return aFixado === bFixado ? 0 : aFixado ? -1 : 1;
    });

  const handleEventClick = (eventItem: EventItem) => {
    if (!eventItem.listaVipAtiva) {
      Alert.alert('Evento sem Lista', 'Este evento não possui opção de envio de nome na lista VIP.');
      return;
    }

    if (!isUserLogged) {
      Alert.alert(
        'Acesso Restrito',
        'Crie sua conta ou entre no app para colocar seu nome na lista VIP do evento.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Entrar / Criar Conta', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    setAcompanhantes('0');
    setSelectedEventForList(eventItem);
  };

  const statusAtual = selectedEventForList?.listaVipAtiva
    ? minhasSolicitacoes[selectedEventForList.listaVipAtiva.id]
    : undefined;

  const handleSendToList = async () => {
    if (!selectedEventForList?.listaVipAtiva || !user) return;

    const numAcompanhantes = Math.max(0, Math.min(5, parseInt(acompanhantes, 10) || 0));

    setSubmitting(true);
    try {
      const { error } = await supabase.from('listas_vip_solicitacoes').insert({
        lista_vip_id: selectedEventForList.listaVipAtiva.id,
        acompanhantes: numAcompanhantes,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Você já está na lista', 'Seu nome já foi enviado para esta lista VIP.');
        } else {
          throw error;
        }
      } else {
        Alert.alert(
          'Nome enviado!',
          `Seu nome foi inserido na lista VIP de ${selectedEventForList.titulo}. Apresente um documento na portaria.`
        );
      }

      setSelectedEventForList(null);
      carregarEventos();
    } catch (err: any) {
      console.error('Erro ao enviar solicitação de lista VIP:', err);
      Alert.alert('Erro', err?.message || 'Não foi possível salvar seu nome na lista VIP. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelarSolicitacao = async () => {
    if (!selectedEventForList?.listaVipAtiva || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('listas_vip_solicitacoes')
        .delete()
        .eq('lista_vip_id', selectedEventForList.listaVipAtiva.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSelectedEventForList(null);
      carregarEventos();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível cancelar a solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  // Rodada 59 (parte 7) — pedido da Andrea depois de revisar o app final:
  // faltava o próprio usuário confirmar que chegou (check-in self-service,
  // sem depender da portaria digitar nada no portal — decisão consciente
  // dela, diferente do check-in de cupom que continua exigindo o
  // estabelecimento). Ver migration 031 (protect_status_listas_vip_solicitacoes)
  // — só esse UM caminho extra de status foi liberado, o resto continua
  // travado pra usuário comum.
  const handleCheckIn = async () => {
    if (!selectedEventForList?.listaVipAtiva || !user) return;

    const listaId = selectedEventForList.listaVipAtiva.id;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('listas_vip_solicitacoes')
        .update({ status: 'check_in' })
        .eq('lista_vip_id', listaId)
        .eq('user_id', user.id);

      if (error) throw error;

      setMinhasSolicitacoes((prev) => ({ ...prev, [listaId]: 'check_in' }));
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível confirmar seu check-in. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Depois do check-in, o check_in é o próprio gatilho pra liberar a
  // avaliação do local (Rodada 59/7) — leva direto pra tela do
  // estabelecimento, que já tem a avaliação corrigida (Rodada 59/6).
  const handleIrAvaliar = () => {
    const localId = selectedEventForList?.local_id;
    setSelectedEventForList(null);
    if (localId) {
      router.push(`/business/${localId}` as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BotaoVoltar />
          <View style={styles.headerEsquerda}>
            <Image
              source={require('../../assets/images/logolinear-semfundo.png')}
              style={styles.logoLinear}
              resizeMode="contain"
            />
            <Text style={styles.appSubtitulo}>Conexões e Experiências LGBT+</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <Feather name="user" size={18} color="#D0D0E0" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TÍTULO E BOTÕES DE SELEÇÃO DE DATA */}
        <View style={styles.titleArea}>
          <TituloTela
            semMargem
            titulo="Eventos"
            tituloMenu="Quando?"
            opcoes={CALENDAR_DATES.map((d) => ({ id: d.id, label: d.label }))}
            valor={dateFilter}
            onEscolher={(id) => setDateFilter(id as DateTag)}
          />

          <View style={styles.dateSelectorRow}>
            <TouchableOpacity
              style={[styles.dateBtn, dateFilter === 'hoje' && styles.dateBtnActive]}
              onPress={() => setDateFilter('hoje')}
              activeOpacity={0.8}
            >
              <Text style={[styles.dateBtnText, dateFilter === 'hoje' && styles.dateBtnTextActive]}>
                Hoje
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateBtn, dateFilter === 'fds' && styles.dateBtnActive]}
              onPress={() => setDateFilter('fds')}
              activeOpacity={0.8}
            >
              <Text style={[styles.dateBtnText, dateFilter === 'fds' && styles.dateBtnTextActive]}>
                Fim de semana
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.calendarIconBtn}
              onPress={() => setShowCalendarModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="calendar" size={16} color={COLORS.pink} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Rodada 63 — filtros com as tags oficiais. Cada fileira só mostra
            as tags que têm pelo menos um evento carregado. */}
        {[
          { grupo: 'tipo', titulo: 'Tipo de evento', valor: selectedTipo, set: setSelectedTipo, estilo: styles.musicChip, ativo: styles.musicChipActive },
          { grupo: 'musica', titulo: 'Estilo musical', valor: selectedMusic, set: setSelectedMusic, estilo: styles.musicChip, ativo: styles.musicChipActive },
          { grupo: 'publico', titulo: 'Público', valor: selectedPublic, set: setSelectedPublic, estilo: styles.publicChip, ativo: styles.publicChipActive },
        ].map((linha) => {
          const opcoes = GRUPO(linha.grupo).tags.map(slugTag).filter((t) => t !== 'todos_os_publicos' && events.some((ev) => eventoTem(ev, t)));
          if (opcoes.length === 0) return null;
          return (
            <View key={linha.grupo} style={styles.filterSection}>
              <Text style={styles.filterLabel}>{linha.titulo}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {[null, ...opcoes].map((tag) => {
                  const isSelected = linha.valor === tag;
                  return (
                    <TouchableOpacity
                      key={tag || 'todos'}
                      style={[linha.estilo, isSelected && linha.ativo]}
                      onPress={() => linha.set(tag)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag ? rotuloTag(tag) : 'Todos'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}

        <TouchableOpacity style={styles.maisFiltrosBtn} onPress={() => setShowFiltrosModal(true)} activeOpacity={0.8}>
          <Feather name="sliders" size={14} color={COLORS.pink} />
          <Text style={styles.maisFiltrosTxt}>
            Mais filtros{filtrosExtras.length > 0 ? ` (${filtrosExtras.length})` : ''}
          </Text>
        </TouchableOpacity>

        {/* LISTA DE EVENTOS */}
        <View style={styles.listArea}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>
              {(CALENDAR_DATES.find((d) => d.id === dateFilter)?.label) || 'Próximos Eventos'}
            </Text>
            <Text style={styles.eventCount}>{filteredEvents.length} eventos</Text>
          </View>

          {loadingEvents ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator color={COLORS.pink} />
            </View>
          ) : filteredEvents.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="calendar" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                Nenhum evento aprovado encontrado para esse filtro ainda. Novos eventos aparecem
                aqui assim que forem aprovados.
              </Text>
            </View>
          ) : (
            filteredEvents.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.eventCard}
                // Rodada 66 — o card abre a página da festa (flier, horário,
                // local, descrição, tags e a Lista VIP lá dentro).
                onPress={() => router.push(`/evento/${item.id}` as any)}
                activeOpacity={0.85}
              >
                <View style={styles.eventThumb}>
                  {item.foto_capa_url ? (
                    <Image source={{ uri: item.foto_capa_url }} style={styles.eventThumbImg} />
                  ) : (
                    <Feather name="calendar" size={20} color={COLORS.pink} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.eventHeaderRow}>
                    <Text style={styles.eventDate}>{formatarDataEvento(item.data_inicio, item.dateTag)}</Text>
                    {item.listaVipAtiva && (
                      <View style={styles.guestListBadge}>
                        <Feather name="edit-3" size={9} color={COLORS.green} />
                        <Text style={styles.guestListBadgeText}>NOME NA LISTA</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.eventTitle}>{item.titulo}</Text>
                  {item.locais && item.local_id ? (
                    <TouchableOpacity
                      onPress={() => router.push(`/business/${item.local_id}` as any)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text style={[styles.eventLocation, styles.eventLocationLink]}>
                        {item.locais.nome} • {item.locais.bairro || item.locais.cidade}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.eventLocation}>
                      {item.locais ? `${item.locais.nome} • ${item.locais.bairro || item.locais.cidade}` : 'Local a confirmar'}
                    </Text>
                  )}
                  {/* Rodada 45 — bug real reportado pela Andrea ("testei festa do
                      founders no destaque e não foi"): o checkbox "Destaque (selo
                      no card)" do /admin grava em destaque_secoes, mas esse selo
                      aqui só reagia ao SELECT separado Básico/Destaque/VIP
                      (plano_destaque) — a marcação da Andrea nunca tinha efeito
                      visual nenhum. deveExibirGlow (mesma função que já vale pra
                      locais) cobre os dois mecanismos. */}
                  {(item.plano_destaque !== 'basico' || deveExibirGlow(item)) && (
                    <Text style={styles.eventPrice}>★ Evento em destaque</Text>
                  )}
                  {/* Rodada 46 — selo novo "Patrocinado" (destaque_secoes,
                      migration 026): monetização avulsa, sem depender de
                      plano_destaque — qualquer evento pode comprar. */}
                  {estaFixadoEm(item, 'patrocinado') && (
                    <Text style={styles.patrocinadoBadge}>Patrocinado</Text>
                  )}
                </View>

                <Feather
                  name={item.listaVipAtiva ? 'user-plus' : 'chevron-right'}
                  size={18}
                  color={item.listaVipAtiva ? COLORS.pink : '#606070'}
                />
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>

      {/* MODAL 1: CALENDÁRIO */}
      <Modal visible={showFiltrosModal} transparent animationType="fade" onRequestClose={() => setShowFiltrosModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Mais filtros</Text>
              <TouchableOpacity onPress={() => setShowFiltrosModal(false)} accessibilityLabel="Fechar">
                <Feather name="x" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(() => {
                const grupos = GRUPOS_EXTRAS.map((id) => {
                  const g = GRUPO(id);
                  const opcoes = g.tags
                    .map(slugTag)
                    .filter((t) => !TAGS_EVENTO_AUTOMATICAS.includes(t))
                    .filter((t) => filtrosExtras.includes(t) || events.some((ev) => eventoTem(ev, t)));
                  return { ...g, opcoes };
                }).filter((g) => g.opcoes.length > 0);
                if (grupos.length === 0) {
                  return (
                    <Text style={styles.maisFiltrosSub}>
                      Os organizadores passam a marcar essas informações no cadastro do evento. Assim que houver eventos com elas, os filtros aparecem aqui.
                    </Text>
                  );
                }
                return grupos.map((g) => (
                  <View key={g.id} style={{ marginBottom: 14 }}>
                    <Text style={[styles.filterLabel, { paddingHorizontal: 0 }]}>{g.titulo}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {g.opcoes.map((t) => {
                        const on = filtrosExtras.includes(t);
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[styles.publicChip, on && styles.publicChipActive]}
                            onPress={() => setFiltrosExtras((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))}
                          >
                            <Text style={[styles.chipText, on && styles.chipTextActive]}>{rotuloTag(t)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ));
              })()}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={[styles.maisFiltrosBtn, { flex: 1, marginHorizontal: 0, justifyContent: 'center' }]} onPress={() => setFiltrosExtras([])}>
                <Text style={styles.maisFiltrosTxt}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.maisFiltrosBtn, { flex: 1, marginHorizontal: 0, justifyContent: 'center', backgroundColor: COLORS.pink, borderColor: COLORS.pink }]}
                onPress={() => setShowFiltrosModal(false)}
              >
                <Text style={[styles.maisFiltrosTxt, { color: '#FFF' }]}>Ver eventos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCalendarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="calendar" size={18} color={COLORS.pink} />
                <Text style={styles.modalTitle}>Filtrar por Data</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Feather name="x" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptionsList}>
              {CALENDAR_DATES.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.modalOptionCard,
                    dateFilter === opt.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setDateFilter(opt.id as DateTag);
                    setShowCalendarModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionTitle}>{opt.label}</Text>
                  <Text style={styles.modalOptionSub}>{opt.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 2: NOME NA LISTA VIP (listas_vip_solicitacoes de verdade) */}
      <Modal
        visible={selectedEventForList !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEventForList(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedEventForList(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.listModalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="user-check" size={20} color={COLORS.pink} />
                <Text style={styles.modalTitle}>Lista VIP do Evento</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedEventForList(null)}>
                <Feather name="x" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedEventForList && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.listEventName}>{selectedEventForList.titulo}</Text>
                <Text style={styles.listEventSub}>
                  {selectedEventForList.locais?.nome} •{' '}
                  {formatarDataEvento(selectedEventForList.data_inicio, selectedEventForList.dateTag)}
                </Text>
                {selectedEventForList.listaVipAtiva?.vagas_limite != null && (
                  <Text style={styles.listEventSub}>
                    {Math.max(
                      0,
                      selectedEventForList.listaVipAtiva.vagas_limite -
                        selectedEventForList.listaVipAtiva.vagas_ocupadas
                    )}{' '}
                    vagas disponíveis
                  </Text>
                )}
              </View>
            )}

            {statusAtual ? (
              <View style={{ gap: 14 }}>
                <Text style={styles.statusText}>
                  {STATUS_SOLICITACAO_LABEL[statusAtual] || statusAtual}
                </Text>
                {statusAtual === 'aprovada' && (
                  <TouchableOpacity
                    style={[styles.submitListBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleCheckIn}
                    activeOpacity={0.88}
                    disabled={submitting}
                  >
                    <Text style={styles.submitListBtnText}>
                      {submitting ? 'Confirmando...' : 'Cheguei — Confirmar Check-in'}
                    </Text>
                  </TouchableOpacity>
                )}
                {statusAtual === 'check_in' && (
                  <TouchableOpacity
                    style={[styles.submitListBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleIrAvaliar}
                    activeOpacity={0.88}
                    disabled={submitting}
                  >
                    <Text style={styles.submitListBtnText}>
                      Avaliar {selectedEventForList?.locais?.nome || 'o local'}
                    </Text>
                  </TouchableOpacity>
                )}
                {(statusAtual === 'solicitada' || statusAtual === 'aprovada') && (
                  <TouchableOpacity
                    style={[styles.submitListBtn, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border }, submitting && { opacity: 0.6 }]}
                    onPress={handleCancelarSolicitacao}
                    disabled={submitting}
                  >
                    <Text style={[styles.submitListBtnText, { color: COLORS.textSecondary }]}>
                      {submitting ? 'Cancelando...' : 'Cancelar Solicitação'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Quantos acompanhantes? (0 a 5)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    value={acompanhantes}
                    onChangeText={(v) => setAcompanhantes(v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                  />
                </View>

                <Text style={styles.listEventSub}>
                  Seu nome (do perfil) e sua conta serão usados para confirmar entrada na portaria.
                </Text>

                <TouchableOpacity
                  style={[styles.submitListBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSendToList}
                  activeOpacity={0.88}
                  disabled={submitting}
                >
                  <Text style={styles.submitListBtnText}>
                    {submitting ? 'Enviando...' : 'Enviar Nome para a Lista'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerEsquerda: { justifyContent: 'center' },
  logoLinear: { width: 140, height: 34 },
  appSubtitulo: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, marginTop: 2 },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  mainTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32, color: COLORS.textPrimary },

  dateSelectorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  dateBtnActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  dateBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  dateBtnTextActive: { color: '#FFF', fontWeight: '700' },
  calendarIconBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },

  filterSection: { marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, paddingHorizontal: 16, marginBottom: 6 },
  chipsRow: { paddingHorizontal: 16, gap: 8 },
  maisFiltrosBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  maisFiltrosTxt: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  maisFiltrosSub: { fontSize: 11, color: COLORS.textSecondary, flexShrink: 1 },

  musicChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  musicChipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },

  publicChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  publicChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },

  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  listArea: { paddingHorizontal: 16, marginTop: 8 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  eventCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 10 },
  eventCardDisabled: { opacity: 0.6 },
  eventThumb: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(225, 48, 108, 0.12)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  eventThumbImg: { width: 48, height: 48 },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  eventDate: { fontSize: 11, fontWeight: '700', color: COLORS.pink },
  guestListBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(76, 175, 125, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  guestListBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.green },
  eventTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  eventLocation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  eventLocationLink: { textDecorationLine: 'underline', color: COLORS.pink },
  eventPrice: { fontSize: 11, fontWeight: '700', color: COLORS.gold, marginTop: 4 },
  patrocinadoBadge: { fontSize: 10, fontWeight: '700', color: COLORS.purple, marginTop: 2 },

  emptyBox: { padding: 30, alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 },
  emptyText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { width: '100%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  modalOptionsList: { gap: 10 },
  modalOptionCard: { padding: 14, borderRadius: 14, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: COLORS.border },
  modalOptionActive: { borderColor: COLORS.pink, backgroundColor: 'rgba(225, 48, 108, 0.12)' },
  modalOptionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  modalOptionSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Modal Nome na Lista VIP
  listModalContent: { width: '100%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  listEventName: { fontSize: 15, fontWeight: '800', color: COLORS.pink },
  listEventSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18 },
  formGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  textInput: { height: 44, borderRadius: 12, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, color: COLORS.textPrimary, fontSize: 12 },
  submitListBtn: { height: 46, backgroundColor: COLORS.pink, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitListBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
});
