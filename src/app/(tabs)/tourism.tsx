import { THEME } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: 'compass' },
  { id: 'pousadas', name: 'Pousadas', icon: 'home' },
  { id: 'hoteis', name: 'Hotéis', icon: 'briefcase' },
  { id: 'agencias', name: 'Agências', icon: 'map' },
  { id: 'roteiros', name: 'Roteiros', icon: 'navigation' },
];

const TOURISM_ITEMS = [
  {
    id: 'pousada-arco-iris',
    name: 'Pousada Arco-Íris',
    category: 'pousadas',
    location: 'Maresias, SP',
    rating: '4.9',
    tag: 'Pet Friendly & Friendly',
  },
  {
    id: 'hotel-pride-plaza',
    name: 'Grand Pride Hotel',
    category: 'hoteis',
    location: 'São Paulo, SP',
    rating: '4.8',
    tag: 'Safe Space Verificado',
  },
  {
    id: 'agencia-queer-travel',
    name: 'Queer Travel Agência',
    category: 'agencias',
    location: 'Atendimento Brasil',
    rating: '5.0',
    tag: 'Especialista LGBT+',
  },
  {
    id: 'roteiro-frei-caneca',
    name: 'Roteiro Histórico Paulista',
    category: 'roteiros',
    location: 'São Paulo, SP',
    rating: '4.9',
    tag: 'Guia Local VIP',
  },
];

export default function TourismScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredItems = selectedCategory === 'all'
    ? TOURISM_ITEMS
    : TOURISM_ITEMS.filter(item => item.category === selectedCategory);

  return (
    <View style={styles.container}>
      {/* Topo / Voltar */}
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={THEME.textDim} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Turismo LGBT+</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filtro de Subcategorias */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Feather
                  name={cat.icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : THEME.textDim}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de Destinos e Serviços */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/business/${item.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.tag}</Text>
              </View>
              <View style={styles.ratingBox}>
                <Feather name="star" size={12} color={THEME.gold} style={{ marginRight: 4 }} />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>{item.name}</Text>
            
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color={THEME.textDim} style={{ marginRight: 4 }} />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg, paddingTop: 52 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.surface, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '800', color: THEME.text },
  filterSection: { marginBottom: 16 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  chipActive: { backgroundColor: THEME.pink, borderColor: THEME.pink },
  chipText: { fontSize: 13, fontWeight: '600', color: THEME.textDim },
  chipTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { backgroundColor: THEME.surface2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: THEME.pinkSoft },
  ratingBox: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 12, fontWeight: '700', color: THEME.text },
  cardTitle: { fontSize: 18, fontWeight: '700', color: THEME.text, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 12, color: THEME.textDim },
});