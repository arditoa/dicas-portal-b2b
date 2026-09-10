import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MOCK_FAVORITES = [
  { id: 'bar-castro', name: 'Bar Castro', category: 'Gastronomia • Bar', rating: '4.9', color: '#E1306C' },
  { id: 'hotel-aurora', name: 'Hotel Aurora Pinheiros', category: 'Turismo • Hotel', rating: '4.8', color: '#9C27B0' },
];

export default function FavoritesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Meus Favoritos</Text>
        </View>

        <FlatList
          data={MOCK_FAVORITES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/business/${item.id}`)}>
              <View style={[styles.thumb, { backgroundColor: item.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>{item.category}</Text>
              </View>
              <Feather name="star" size={14} color="#FFD54F" />
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1B26', padding: 12, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: '#2D2B3D' },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  cardSub: { fontSize: 12, color: '#A0A0B0' },
});