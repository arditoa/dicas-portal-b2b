import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

// Importe o seu cliente do Supabase
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

// 🎵 Filtros por Estilo Musical
const MUSIC_FILTERS = [
  { id: 'todos_estilos', label: 'Todos os Estilos' },
  { id: 'pop', label: 'Pop & Funk' },
  { id: 'eletronico', label: 'Eletrônico' },
  { id: 'brasilidades', label: 'Brasilidades & Axé' },
  { id: 'rock', label: 'Rock & Indie' },
  { id: 'samba', label: 'Samba & Pagode' },
];

// 🌈 Filtros por Perfil / Público da Festa
const PUBLIC_FILTERS = [
  { id: 'todos_publicos', label: 'Todos os Públicos' },
  { id: 'gay', label: 'Gay' },
  { id: 'lesbica', label: 'Lésbica' },
  { id: 'trans', label: 'Trans & Non-Binary' },
  { id: 'drag', label: 'Drag Shows' },
  { id: 'ursos', label: 'Bears & Ursos' },
];

// OPÇÕES DE DATAS NO CALENDÁRIO MODAL
const CALENDAR_DATES = [
  { id: 'hoje', label: 'Hoje', sub: 'Eventos acontecendo agora' },
  { id: 'amanha', label: 'Amanhã', sub: 'Agenda de amanhã' },
  { id: 'fds', label: 'Este Fim de Semana', sub: 'Sábado & Domingo' },
  { id: 'proximo_fds', label: 'Próximo Fim de Semana', sub: 'Destaques futuros' },
];

interface EventItem {
  id: string;
  title: string;
  date: string;
  dateTag: 'hoje' | 'amanha' | 'fds';
  location: string;
  price: string;
  musicGenre: string;
  publicType: string;
  isVIP?: boolean;
  hasGuestList: boolean;
}

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // STATUS DE AUTENTICAÇÃO (Mudar para true ao testar logado ou conectar com Supabase Auth)
  const isUserLogged = false;

  const [dateFilter, setDateFilter] = useState<string>('hoje');
  const [selectedMusic, setSelectedMusic] = useState('todos_estilos');
  const [selectedPublic, setSelectedPublic] = useState('todos_publicos');
  
  // Modais
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEventForList, setSelectedEventForList] = useState<EventItem | null>(null);
  
  // Campos do formulário de Lista VIP
  const [userName, setUserName] = useState('');
  const [userCpf, setUserCpf] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const events: EventItem[] = [
    {
      id: 'ev1',
      title: 'Sunset Sessions & Karaoke Pop',
      date: 'Hoje • 18:00',
      dateTag: 'hoje',
      location: 'Castro Burger • Vila Mariana',
      price: 'Entrada Grátis',
      musicGenre: 'pop',
      publicType: 'gay',
      isVIP: true,
      hasGuestList: true,
    },
    {
      id: 'ev2',
      title: 'Noite Pop & Drag Cabaré',
      date: 'Hoje • 23:00',
      dateTag: 'hoje',
      location: 'Zig Club • Baixo Augusta',
      price: 'R$ 30,00 com lista',
      musicGenre: 'pop',
      publicType: 'drag',
      isVIP: true,
      hasGuestList: true,
    },
    {
      id: 'ev3',
      title: 'Festa Lésbica SAPHO Sunset',
      date: 'Sábado • 16:00',
      dateTag: 'fds',
      location: 'Rooftop Augusta • Centro',
      price: 'R$ 35,00',
      musicGenre: 'brasilidades',
      publicType: 'lesbica',
      isVIP: false,
      hasGuestList: true,
    },
    {
      id: 'ev4',
      title: 'Tribal Tech & Dark Room',
      date: 'Sábado • 23:59',
      dateTag: 'fds',
      location: 'Warehouse • Barra Funda',
      price: 'R$ 60,00',
      musicGenre: 'eletronico',
      publicType: 'gay',
      isVIP: true,
      hasGuestList: false,
    },
    {
      id: 'ev5',
      title: 'Bear Party & Rock Indie',
      date: 'Domingo • 17:00',
      dateTag: 'fds',
      location: 'Pub Destaque • Jardins',
      price: 'R$ 25,00',
      musicGenre: 'rock',
      publicType: 'ursos',
      isVIP: false,
      hasGuestList: false,
    },
  ];

  const filteredEvents = events.filter((ev) => {
    if (dateFilter !== 'todos' && dateFilter === 'hoje' && ev.dateTag !== 'hoje') return false;
    if (dateFilter === 'fds' && ev.dateTag !== 'fds') return false;
    if (selectedMusic !== 'todos_estilos' && ev.musicGenre !== selectedMusic) return false;
    if (selectedPublic !== 'todos_publicos' && ev.publicType !== selectedPublic) return false;
    return true;
  });

  // TRAVA DE LOGIN AO CLICAR NO EVENTO
  const handleEventClick = (eventItem: EventItem) => {
    if (!eventItem.hasGuestList) {
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

    setSelectedEventForList(eventItem);
  };

  // ENVIO DO NOME E CPF PARA O SUPABASE
  const handleSendNameToList = async () => {
    if (!userName.trim()) {
      Alert.alert('Atenção', 'Por favor, digite seu nome completo.');
      return;
    }
    if (!userCpf.trim()) {
      Alert.alert('Atenção', 'Por favor, informe seu CPF para validação na portaria.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('event_guest_lists')
        .insert([
          {
            event_id: selectedEventForList?.id,
            full_name: userName.trim(),
            cpf: userCpf.trim(),
            email: userEmail.trim() || null,
          },
        ]);

      if (error) {
        console.error('Erro ao enviar nome para o Supabase:', error);
        Alert.alert('Erro', 'Não foi possível salvar seu nome na lista VIP. Tente novamente.');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Nome Confirmado!',
        `Seu nome (${userName}) e CPF foram inseridos com sucesso na lista VIP de ${selectedEventForList?.title}. Apresente seu documento na portaria!`
      );

      setSelectedEventForList(null);
      setUserName('');
      setUserCpf('');
      setUserEmail('');
    } catch (err) {
      console.error('Erro de conexão:', err);
      Alert.alert('Erro inesperado', 'Ocorreu um problema ao comunicar com o servidor.');
    } finally {
      setLoading(false);
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
                Próximos
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
              {dateFilter === 'hoje' ? 'Agenda de Hoje' : 'Próximos Eventos'}
            </Text>
            <Text style={styles.eventCount}>{filteredEvents.length} eventos</Text>
          </View>

          {filteredEvents.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="calendar" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nenhum evento encontrado para esse filtro.</Text>
            </View>
          ) : (
            filteredEvents.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.eventCard, !item.hasGuestList && styles.eventCardDisabled]}
                onPress={() => handleEventClick(item)}
                activeOpacity={item.hasGuestList ? 0.85 : 1}
              >
                <View style={styles.eventThumb}>
                  <Feather name="calendar" size={20} color={COLORS.pink} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.eventHeaderRow}>
                    <Text style={styles.eventDate}>{item.date}</Text>
                    {item.hasGuestList && (
                      <View style={styles.guestListBadge}>
                        <Feather name="edit-3" size={9} color={COLORS.green} />
                        <Text style={styles.guestListBadgeText}>NOME NA LISTA</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventLocation}>{item.location}</Text>
                  <Text style={styles.eventPrice}>{item.price}</Text>
                </View>

                <Feather
                  name={item.hasGuestList ? 'user-plus' : 'chevron-right'}
                  size={18}
                  color={item.hasGuestList ? COLORS.pink : '#606070'}
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
                    setDateFilter(opt.id);
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

      {/* MODAL 2: NOME NA LISTA VIP COM INTEGRACAO SUPABASE */}
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
                <Text style={styles.listEventName}>{selectedEventForList.title}</Text>
                <Text style={styles.listEventSub}>{selectedEventForList.location} • {selectedEventForList.date}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Nome Completo (Como no documento)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Gabriel Silva"
                placeholderTextColor={COLORS.textMuted}
                value={userName}
                onChangeText={setUserName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>CPF (Para validação na portaria)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="000.000.000-00"
                placeholderTextColor={COLORS.textMuted}
                value={userCpf}
                onChangeText={setUserCpf}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>E-mail (Opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="seuemail@exemplo.com"
                placeholderTextColor={COLORS.textMuted}
                value={userEmail}
                onChangeText={setUserEmail}
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitListBtn, loading && { opacity: 0.6 }]} 
              onPress={handleSendNameToList} 
              activeOpacity={0.88}
              disabled={loading}
            >
              <Text style={styles.submitListBtnText}>
                {loading ? 'Enviando...' : 'Enviar Nome e CPF para a Lista'}
              </Text>
            </TouchableOpacity>
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
  logoLinear: { width: 150, height: 36 },
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
  eventThumb: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(225, 48, 108, 0.12)', justifyContent: 'center', alignItems: 'center' },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  eventDate: { fontSize: 11, fontWeight: '700', color: COLORS.pink },
  guestListBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(76, 175, 125, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  guestListBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.green },
  eventTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  eventLocation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  eventPrice: { fontSize: 11, fontWeight: '700', color: COLORS.purple, marginTop: 4 },

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
  formGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  textInput: { height: 44, borderRadius: 12, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, color: COLORS.textPrimary, fontSize: 13 },
  submitListBtn: { height: 46, backgroundColor: COLORS.pink, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitListBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
});