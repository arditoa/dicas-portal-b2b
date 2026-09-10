import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MUSIC_STYLES = ['Funk', 'Pop/Eletrônica', 'Sertanejo', 'Drag/Cabaré', 'MPB/Samba', 'Techno/House'];
const AUDIENCES = ['Todos os Públicos', 'Gay', 'Lésbica', 'Trans+', 'Bi+', 'Ursos'];

const EVENTS_DATA = [
  { id: 'noite-aberta', title: 'Noite Aberta', location: 'Zig Club', dateText: 'Sáb • 23h', type: 'Eventos', color: '#2558A6' },
  { id: 'drink-duplo-night', title: 'Drink Duplo Night', location: 'Castro Bar', dateText: 'Qui • 20h', type: 'Eventos', color: '#5C25A6' },
  { id: 'roteiro-guiado', title: 'Roteiro guiado — edição especial', location: 'Centro', dateText: 'Dom • 10h', type: 'Eventos', color: '#258BA6' },
];

const ANNOUNCEMENTS_DATA = [
  {
    id: 'camara-lgbt',
    title: 'Acompanhe as pautas na Câmara',
    subtitle: 'Direito & Legislação',
    description: 'Fique atento aos projetos de lei e audiências públicas em pauta na Câmara que impactam diretamente os direitos da nossa comunidade.',
    icon: 'award',
    color: '#7E57C2',
    actionText: 'Ver pautas da Câmara',
    route: '/denunciar',
  },
  {
    id: 'central-denuncia',
    title: 'Central de Denúncias Segura',
    subtitle: 'Apoio & Proteção',
    description: 'Sofreu ou presenciou discriminação ou LGBTfobia em algum estabelecimento? Faça seu relato de forma anônima e segura.',
    icon: 'shield-off',
    color: '#E1306C',
    actionText: 'Fazer Denúncia Anônima',
    route: '/denunciar',
  },
];

export default function AgendaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'events' | 'announcements'>('events');
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const [musicSheetVisible, setMusicSheetVisible] = useState(false);
  const [selectedMusicStyles, setSelectedMusicStyles] = useState<string[]>([]);

  const [audienceSheetVisible, setAudienceSheetVisible] = useState(false);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(['Todos os Públicos']);

  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState('Todas as datas');

  const toggleAudience = (item: string) => {
    if (item === 'Todos os Públicos') {
      setSelectedAudiences(['Todos os Públicos']);
      return;
    }
    let updated = selectedAudiences.filter((a) => a !== 'Todos os Públicos');
    if (updated.includes(item)) {
      updated = updated.filter((a) => a !== item);
    } else {
      updated.push(item);
    }
    if (updated.length === 0) updated = ['Todos os Públicos'];
    setSelectedAudiences(updated);
  };

  const toggleMusicStyle = (item: string) => {
    if (selectedMusicStyles.includes(item)) {
      setSelectedMusicStyles(selectedMusicStyles.filter((s) => s !== item));
    } else {
      setSelectedMusicStyles([...selectedMusicStyles, item]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header com o mesmo aliamento do Explorar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerEsquerda}>
          <Image
            source={require('@/assets/images/logolinear-semfundo.png')}
            style={styles.logoLinear}
            resizeMode="contain"
          />
          <Text style={styles.appSubtitulo}>Agenda & Programação LGBT+</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <Feather name="user" size={18} color="#D0D0E0" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Toggle Principal */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'events' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('events')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'events' && styles.toggleTextActive]}>
              Eventos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'announcements' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('announcements')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, activeTab === 'announcements' && styles.toggleTextActive]}>
              Comunicados
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo Eventos */}
        {activeTab === 'events' && (
          <>
            <View style={styles.periodRow}>
              <TouchableOpacity
                style={[styles.periodChip, selectedPeriod === 'week' && styles.periodChipActive]}
                onPress={() => setSelectedPeriod('week')}
              >
                <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>Esta semana</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.periodChip, selectedPeriod === 'month' && styles.periodChipActive]}
                onPress={() => setSelectedPeriod('month')}
              >
                <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>Este mês</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.periodChip, selectedPeriod === 'saved' && styles.periodChipActive]}
                onPress={() => setSelectedPeriod('saved')}
              >
                <Text style={[styles.periodText, selectedPeriod === 'saved' && styles.periodTextActive]}>Salvos</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              <TouchableOpacity
                style={[styles.dropdownBtn, selectedMusicStyles.length > 0 && styles.dropdownBtnActive]}
                onPress={() => setMusicSheetVisible(true)}
              >
                <Feather name="music" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.dropdownText}>
                  {selectedMusicStyles.length > 0 ? `Música (${selectedMusicStyles.length})` : 'Estilo musical'}
                </Text>
                <Feather name="chevron-down" size={14} color="#A0A0B2" style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownBtn, !selectedAudiences.includes('Todos os Públicos') && styles.dropdownBtnActive]}
                onPress={() => setAudienceSheetVisible(true)}
              >
                <Feather name="users" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.dropdownText}>
                  {!selectedAudiences.includes('Todos os Públicos') ? `Público (${selectedAudiences.length})` : 'Público'}
                </Text>
                <Feather name="chevron-down" size={14} color="#A0A0B2" style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownBtn, selectedDateFilter !== 'Todas as datas' && styles.dropdownBtnActive]}
                onPress={() => setDateSheetVisible(true)}
              >
                <Feather name="calendar" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.dropdownText}>{selectedDateFilter}</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.eventsList}>
              {EVENTS_DATA.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => router.push(`/business/${event.id}`)}
                  activeOpacity={0.88}
                >
                  <View style={[styles.eventThumb, { backgroundColor: event.color }]} />
                  <View style={styles.eventInfo}>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagText}>{event.type}</Text>
                    </View>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventSubtext}>{event.location} • {event.dateText}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Conteúdo Comunicados */}
        {activeTab === 'announcements' && (
          <View style={styles.announcementsList}>
            {ANNOUNCEMENTS_DATA.map((item) => (
              <View key={item.id} style={styles.announcementCard}>
                <View style={styles.announcementHeader}>
                  <View style={[styles.announcementIconBox, { backgroundColor: item.color + '22' }]}>
                    <Feather name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.announcementSubtitle}>{item.subtitle}</Text>
                    <Text style={styles.announcementTitle}>{item.title}</Text>
                  </View>
                </View>

                <Text style={styles.announcementDesc}>{item.description}</Text>

                <TouchableOpacity
                  style={[styles.announcementBtn, { backgroundColor: item.color }]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.announcementBtnText}>{item.actionText}</Text>
                  <Feather name="arrow-right" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Modais de Filtro */}
      <Modal visible={musicSheetVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMusicSheetVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Estilo Musical</Text>
              <TouchableOpacity onPress={() => setMusicSheetVisible(false)}>
                <Feather name="x" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.chipsWrap}>
              {MUSIC_STYLES.map((style) => {
                const isSelected = selectedMusicStyles.includes(style);
                return (
                  <TouchableOpacity
                    key={style}
                    style={[styles.sheetChip, isSelected && styles.sheetChipActive]}
                    onPress={() => toggleMusicStyle(style)}
                  >
                    <Text style={[styles.sheetChipText, isSelected && styles.sheetChipTextActive]}>{style}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={() => setMusicSheetVisible(false)}>
              <Text style={styles.applyBtnText}>Aplicar Filtro</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={audienceSheetVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAudienceSheetVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Público Alvo</Text>
              <TouchableOpacity onPress={() => setAudienceSheetVisible(false)}>
                <Feather name="x" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.chipsWrap}>
              {AUDIENCES.map((aud) => {
                const isSelected = selectedAudiences.includes(aud);
                return (
                  <TouchableOpacity
                    key={aud}
                    style={[styles.sheetChip, isSelected && styles.sheetChipActive]}
                    onPress={() => toggleAudience(aud)}
                  >
                    <Text style={[styles.sheetChipText, isSelected && styles.sheetChipTextActive]}>{aud}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={() => setAudienceSheetVisible(false)}>
              <Text style={styles.applyBtnText}>Aplicar Filtro</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={dateSheetVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDateSheetVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filtrar por Data</Text>
              <TouchableOpacity onPress={() => setDateSheetVisible(false)}>
                <Feather name="x" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.chipsWrap}>
              {['Todas as datas', 'Hoje', 'Amanhã', 'Fim de Semana'].map((opt) => {
                const isSelected = selectedDateFilter === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.sheetChip, isSelected && styles.sheetChipActive]}
                    onPress={() => {
                      setSelectedDateFilter(opt);
                      setDateSheetVisible(false);
                    }}
                  >
                    <Text style={[styles.sheetChipText, isSelected && styles.sheetChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerEsquerda: { justifyContent: 'center' },
  logoLinear: { width: 150, height: 36 },
  appSubtitulo: { fontSize: 11, fontWeight: '500', color: '#A0A0B2', marginTop: 2 },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161520',
    borderWidth: 1,
    borderColor: '#232230',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: '#161520', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#232230', marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#E1306C' },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#A0A0B2' },
  toggleTextActive: { color: '#FFFFFF' },

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  periodChipActive: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#A0A0B2' },
  periodTextActive: { color: '#FFFFFF' },

  filtersScroll: { gap: 8, marginBottom: 24 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161520', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#232230' },
  dropdownBtnActive: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  dropdownText: { fontSize: 13, color: '#FFFFFF', fontWeight: '500' },

  eventsList: { gap: 12 },
  eventCard: { flexDirection: 'row', backgroundColor: '#161520', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#232230', gap: 12 },
  eventThumb: { width: 64, height: 64, borderRadius: 12 },
  eventInfo: { flex: 1, justifyContent: 'center' },
  tagBadge: { alignSelf: 'flex-start', backgroundColor: '#202B42', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
  tagText: { fontSize: 10, fontWeight: '700', color: '#5C6BC0' },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  eventSubtext: { fontSize: 12, color: '#A0A0B2' },

  announcementsList: { gap: 16 },
  announcementCard: { backgroundColor: '#161520', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#232230' },
  announcementHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  announcementIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  announcementSubtitle: { fontSize: 11, fontWeight: '700', color: '#606070', letterSpacing: 0.5 },
  announcementTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  announcementDesc: { fontSize: 13, color: '#A0A0B2', lineHeight: 18, marginBottom: 16 },
  announcementBtn: { flexDirection: 'row', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  announcementBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#161520', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderColor: '#232230' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  sheetChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#232230', borderWidth: 1, borderColor: '#3D3D4E' },
  sheetChipActive: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  sheetChipText: { fontSize: 13, color: '#A0A0B2', fontWeight: '600' },
  sheetChipTextActive: { color: '#FFF' },
  applyBtn: { backgroundColor: '#E1306C', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  applyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});