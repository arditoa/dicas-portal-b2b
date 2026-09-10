import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME } from '../../constants/theme';

const CATEGORY_DATA: Record<string, { title: string; subtitle: string; items: any[] }> = {
  gastronomia: {
    title: 'Gastronomia',
    subtitle: 'Bares, cafés, restaurantes e ambientes acolhedores',
    items: [
      { id: 'cafe-amigas', name: 'Café das Amigas', desc: 'Cafeteria e Brunch · Pinheiros', rating: '4.9', dist: '600m', badge: 'Safe Space' },
      { id: 'castro-bar', name: 'Castro Bar', desc: 'Bar & Petiscos · Consolação', rating: '4.9', dist: '1.2km', badge: 'Drink Duplo' },
    ]
  },
  cultura: {
    title: 'Cultura',
    subtitle: 'Teatros, galerias, saraus e feiras independentes',
    items: [
      { id: 'galeria-diversa', name: 'Galeria Diversa', desc: 'Exposições & Arte · Vila Madalena', rating: '4.8', dist: '1.5km', badge: 'VIP' },
    ]
  },
  turismo: {
    title: 'Turismo',
    subtitle: 'Pousadas, hotéis, agências e roteiros qualificados',
    items: [
      { id: 'hotel-aurora', name: 'Hotel Aurora', desc: 'Hotelaria · Pinheiros', rating: '4.8', dist: '900m', badge: 'Cupom 15%' },
    ]
  },
  servicos: {
    title: 'Serviços',
    subtitle: 'Profissionais, saúde, psicologia e consultoria',
    items: [
      { id: 'clinica-acolher', name: 'Clínica Acolher', desc: 'Psicologia & Saúde · Bela Vista', rating: '5.0', dist: '2.1km', badge: 'Verificado' },
    ]
  }
};

export default function CategoryScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const [filter, setFilter] = useState<'dist' | 'rating'>('dist');

  const currentCategory = CATEGORY_DATA[key || 'gastronomia'] || CATEGORY_DATA.gastronomia;
  
  const sortedItems = [...currentCategory.items].sort((a, b) => {
    if (filter === 'rating') return parseFloat(b.rating) - parseFloat(a.rating);
    return parseFloat(a.dist) - parseFloat(b.dist);
  });

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color={THEME.textDim} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{currentCategory.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{currentCategory.subtitle}</Text>

        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'dist' && styles.filterChipActive]}
            onPress={() => setFilter('dist')}
          >
            <Text style={[styles.filterText, filter === 'dist' && styles.filterTextActive]}>Mais próximos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, filter === 'rating' && styles.filterChipActive]}
            onPress={() => setFilter('rating')}
          >
            <Text style={[styles.filterText, filter === 'rating' && styles.filterTextActive]}>Melhor avaliados</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {sortedItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/business/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.rating}>★ {item.rating}</Text>
              </View>
              <Text style={styles.cardDesc}>{item.desc} · {item.dist}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  topbar: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.surface, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: THEME.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 30, gap: 16 },
  subtitle: { fontSize: 13, color: THEME.textDim },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: THEME.border },
  filterChipActive: { backgroundColor: THEME.pink, borderColor: THEME.pink },
  filterText: { color: THEME.textDim, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  list: { gap: 12 },
  card: { backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 14, padding: 14, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', color: THEME.text },
  rating: { color: THEME.gold, fontSize: 12.5, fontWeight: '700' },
  cardDesc: { fontSize: 12, color: THEME.textFaint },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(194,37,92,0.14)', borderWidth: 1, borderColor: 'rgba(194,37,92,0.5)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: THEME.pinkSoft, fontSize: 10.5, fontWeight: '600' }
});