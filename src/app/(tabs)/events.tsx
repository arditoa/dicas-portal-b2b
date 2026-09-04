import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RatingBadge } from '../../components/RatingBadge';
import { COLORS, LAYOUT, RADIUS, TYPOGRAPHY } from '../../constants/theme';

const DATE_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanhã' },
  { id: 'weekend', label: 'Próx. FDS' },
];

const PUBLIC_OPTIONS = [
  'Gay',
  'Lésbico',
  'Geral / Todos bem-vindos',
  'Trans & Não-binário',
  'Bissexual+',
  'Drag',
];

const MUSIC_OPTIONS = [
  'Pop',
  'Funk',
  'Eletrônica',
  'Brasilidades',
  'Indie/Rock',
  'Reggaeton',
];

const EVENTS_DATA = [
  {
    id: '1',
    title: 'Noite Popozuda',
    venue: 'Bar da Gra',
    time: 'hoje, 22h',
    dateType: 'today',
    rating: 5.0,
    reviewCount: 34,
    tags: ['Gay', 'Drag', '♪ Pop', '♪ Funk'],
    categoryPublic: 'Gay',
    categoryMusic: 'Pop',
  },
  {
    id: '2',
    title: 'Techno & Cia',
    venue: 'Vezpa Bar',
    time: 'sex, 23h',
    dateType: 'weekend',
    rating: 4.8,
    reviewCount: 12,
    tags: ['Lésbico', 'Trans & Não-binário', '♪ Eletrônica'],
    categoryPublic: 'Lésbico',
    categoryMusic: 'Eletrônica',
  },
  {
    id: '3',
    title: 'Pop Night',
    venue: 'Bourbon Bar',
    time: 'sáb, 21h',
    dateType: 'weekend',
    rating: 0,
    reviewCount: 2,
    tags: ['Gay', 'Ursos/Leather'],
    categoryPublic: 'Gay',
    categoryMusic: 'Pop',
  },
  {
    id: '4',
    title: 'Matinê Queer',
    venue: 'Castro Bar',
    time: 'amanhã, 18h',
    dateType: 'tomorrow',
    rating: 4.9,
    reviewCount: 28,
    tags: ['Geral / Todos bem-vindos', '♪ Brasilidades'],
    categoryPublic: 'Geral / Todos bem-vindos',
    categoryMusic: 'Brasilidades',
  },
];

export default function EventsScreen() {
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [selectedPublic, setSelectedPublic] = useState<string[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string[]>([]);
  const [savedEvents, setSavedEvents] = useState<string[]>([]);

  const togglePublic = (item: string) => {
    setSelectedPublic((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleMusic = (item: string) => {
    setSelectedMusic((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleSave = (id: string) => {
    setSavedEvents((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredEvents = EVENTS_DATA.filter((event) => {
    const matchDate = selectedDateFilter === 'all' || event.dateType === selectedDateFilter;
    const matchPublic = selectedPublic.length === 0 || selectedPublic.includes(event.categoryPublic);
    const matchMusic = selectedMusic.length === 0 || selectedMusic.includes(event.categoryMusic);

    return matchDate && matchPublic && matchMusic;
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Text style={TYPOGRAPHY.screenTitle}>Agenda Festas</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setCalendarModalVisible(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Seletor Rápido de Datas (Barra Horizontal) */}
      <View style={styles.dateBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {DATE_FILTERS.map((df) => {
            const active = selectedDateFilter === df.id;
            return (
              <TouchableOpacity
                key={df.id}
                style={[styles.dateChip, active && styles.dateChipActive]}
                onPress={() => setSelectedDateFilter(df.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                  {df.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Text style={styles.counterText}>{filteredEvents.length} eventos encontrados</Text>

      {/* Lista de Festas */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const isSaved = savedEvents.includes(item.id);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={TYPOGRAPHY.venueName}>{item.title}</Text>
                  <Text style={TYPOGRAPHY.bodyMetadata}>
                    📍 {item.venue} • {item.time}
                  </Text>
                </View>
                <View style={styles.rightCardHeader}>
                  <RatingBadge rating={item.rating} reviewCount={item.reviewCount} />
                  <TouchableOpacity onPress={() => toggleSave(item.id)} style={{ marginLeft: 8 }}>
                    <Ionicons
                      name={isSaved ? 'bookmark' : 'bookmark-outline'}
                      size={20}
                      color={isSaved ? COLORS.accent : COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        }}
      />

      {/* Modal de Calendário Simplificado */}
      <Modal visible={calendarModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filtrar por Calendário 🗓️</Text>
              <TouchableOpacity onPress={() => setCalendarModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={26} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[TYPOGRAPHY.bodyMetadata, { marginBottom: 16 }]}>
              Escolha uma data específica para encontrar as festas agendadas:
            </Text>

            <View style={styles.calendarGrid}>
              {['Hoje', 'Amanhã', 'Sáb (05/09)', 'Dom (06/09)', 'Próx. Sex (11/09)', 'Próx. Sáb (12/09)'].map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.calendarOptionBtn}
                  onPress={() => {
                    setSelectedDateFilter(i === 0 ? 'today' : i === 1 ? 'tomorrow' : 'weekend');
                    setCalendarModalVisible(false);
                  }}
                >
                  <Ionicons name="time-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.calendarOptionText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Sheet Modal de Filtros (Público + Estilo Musical) */}
      <Modal visible={filterModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filtros de Festa</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
              <Text style={styles.filterSectionTitle}>PÚBLICO ALVO</Text>
              <View style={styles.chipContainer}>
                {PUBLIC_OPTIONS.map((item) => {
                  const active = selectedPublic.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => togglePublic(item)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>ESTILO MUSICAL</Text>
              <View style={styles.chipContainer}>
                {MUSIC_OPTIONS.map((item) => {
                  const active = selectedMusic.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleMusic(item)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.btnApply}
              onPress={() => setFilterModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnApplyText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.15)',
  },
  dateBarContainer: { marginTop: 14 },
  dateScroll: { paddingHorizontal: 20, gap: 8 },
  dateChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.15)',
  },
  dateChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dateChipText: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textSecondary, fontWeight: '500' },
  dateChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  counterText: {
    ...TYPOGRAPHY.bodyMetadata,
    color: COLORS.textSecondary,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
  },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(182, 166, 190, 0.1)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rightCardHeader: { flexDirection: 'row', alignItems: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: {
    backgroundColor: 'rgba(182, 166, 190, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  tagText: { ...TYPOGRAPHY.captionTag, color: COLORS.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  calendarModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  calendarGrid: { gap: 8 },
  calendarOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: RADIUS.card,
  },
  calendarOptionText: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textPrimary, fontWeight: 'bold' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { ...TYPOGRAPHY.venueName, fontSize: 18 },
  sheetContent: { paddingBottom: 20 },
  filterSectionTitle: { ...TYPOGRAPHY.captionTag, color: COLORS.textSecondary, fontWeight: 'bold', marginBottom: 12 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(182, 166, 190, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  chipActive: { backgroundColor: COLORS.accent },
  chipText: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textPrimary },
  chipTextActive: { color: '#FFF', fontWeight: 'bold' },
  btnApply: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    height: LAYOUT.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  btnApplyText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});