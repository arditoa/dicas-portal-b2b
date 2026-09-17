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
import { supabase } from '../../lib/supabase';

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

// Precisam bater com o enum public.estilo_musical (001_migrar_para_locais.sql) —
// os mesmos valores/labels usados no cadastro de evento do portal.
const MUSIC_FILTERS = [
  { id: 'todos_estilos', label: 'Todos os Estilos' },
  { id: 'funk', label: 'Funk' },
  { id: 'pop_eletronica', label: 'Pop / Eletrônica' },
  { id: 'sertanejo', label: 'Sertanejo' },
  { id: 'drag_cabare', label: 'Drag / Cabaré' },
  { id: 'mpb_samba', label: 'MPB / Samba' },
  { id: 'techno_house', label: 'Techno / House' },
];

// Precisam bater com o enum public.publico_tag
const PUBLIC_FILTERS = [
  { id: 'todos_publicos', label: 'Todos os Públicos' },
  { id: 'gay', label: 'Gays' },
  { id: 'lesbica', label: 'Lésbicas' },
  { id: 'trans', label: 'Trans' },
  { id: 'bi', label: 'Bi' },
  { id: 'ursos', label: 'Ursos' },
];

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
  foto_capa_url: string | null;
  plano_destaque: 'basico' | 'destaque' | 'vip';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const isUserLogged = !!session;

  const [dateFilter, setDateFilter] = useState<DateTag>('hoje');
  const [selectedMusic, setSelectedMusic] = useState('todos_estilos');
  const [selectedPublic, setSelectedPublic] = useState('todos_publicos');

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

      const { data, error } = await supabase
        .from('eventos')
        .select(
          'id, titulo, descricao, data_inicio, data_fim, estilos_musicais, publico_tags, foto_capa_url, plano_destaque, local_id, locais(nome, bairro, cidade), listas_vip(id, titulo, vagas_limite, vagas_ocupadas, ativa)'
        )
        .eq('status', 'aprovado')
        .gte('data_inicio', inicioHoje.toISOString())
        .order('data_inicio', { ascending: true })
        .limit(60);

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

  const filteredEvents = events.filter((ev) => {
    if (ev.dateTag !== dateFilter) return false;
    if (selectedMusic !== 'todos_estilos' && !ev.estilos_musicais?.includes(selectedMusic)) return false;
    if (selectedPublic !== 'todos_publicos' && !ev.publico_tags?.includes(selectedPublic)) return false;
    return true;
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

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerEsquerda}>
          <Image
            source={require('../../assets/images/logolinear-semfundo.png')}
            style={styles.logoLinear}
            resizeMode="contain"
          />
          <Text style={styles.appSubtitulo}>Conexões e Experiências LGBT+</Text>
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
          <Text style={styles.mainTitle}>Eventos</Text>

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

        {/* FILEIRA 1: Estilo Musical */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Estilo Musical</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {MUSIC_FILTERS.map((item) => {
              const isSelected = selectedMusic === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.musicChip, isSelected && styles.musicChipActive]}
                  onPress={() => setSelectedMusic(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* FILEIRA 2: Público / Perfil */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Público & Perfil</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {PUBLIC_FILTERS.map((item) => {
              const isSelected = selectedPublic === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.publicChip, isSelected && styles.publicChipActive]}
                  onPress={() => setSelectedPublic(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

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
                style={[styles.eventCard, !item.listaVipAtiva && styles.eventCardDisabled]}
                onPress={() => handleEventClick(item)}
                activeOpacity={item.listaVipAtiva ? 0.85 : 1}
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
                  {item.plano_destaque !== 'basico' && (
                    <Text style={styles.eventPrice}>★ Evento em destaque</Text>
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

  titleArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  mainTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },

  dateSelectorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  dateBtnActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  dateBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  dateBtnTextActive: { color: '#FFF', fontWeight: '700' },
  calendarIconBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },

  filterSection: { marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, paddingHorizontal: 16, marginBottom: 6 },
  chipsRow: { paddingHorizontal: 16, gap: 8 },

  musicChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  musicChipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },

  publicChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  publicChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },

  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  listArea: { paddingHorizontal: 16, marginTop: 8 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  eventCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 10 },
  eventCardDisabled: { opacity: 0.6 },
  eventThumb: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(225, 48, 108, 0.12)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  eventThumbImg: { width: 48, height: 48 },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  eventDate: { fontSize: 11, fontWeight: '700', color: COLORS.pink },
  guestListBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(76, 175, 125, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  guestListBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.green },
  eventTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  eventLocation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  eventLocationLink: { textDecorationLine: 'underline', color: COLORS.pink },
  eventPrice: { fontSize: 11, fontWeight: '700', color: COLORS.gold, marginTop: 4 },

  emptyBox: { padding: 30, alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { width: '100%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  modalOptionsList: { gap: 10 },
  modalOptionCard: { padding: 14, borderRadius: 14, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: COLORS.border },
  modalOptionActive: { borderColor: COLORS.pink, backgroundColor: 'rgba(225, 48, 108, 0.12)' },
  modalOptionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  modalOptionSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Modal Nome na Lista VIP
  listModalContent: { width: '100%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  listEventName: { fontSize: 16, fontWeight: '800', color: COLORS.pink },
  listEventSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 20 },
  formGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  textInput: { height: 44, borderRadius: 12, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, color: COLORS.textPrimary, fontSize: 13 },
  submitListBtn: { height: 46, backgroundColor: COLORS.pink, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitListBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
});
