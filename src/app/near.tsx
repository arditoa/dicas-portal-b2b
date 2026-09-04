import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VenueCard } from '../components/VenueCard';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

const NEARBY_VENUES = [
  {
    id: 'bar-da-gra',
    name: 'Bar da Gra',
    category: 'Bares',
    neighborhood: 'Pinheiros',
    distance: '450m',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
    deal: null,
    rating: 5.0,
    reviewCount: 18,
  },
  {
    id: 'castro-bar',
    name: 'Castro Bar',
    category: 'Bares',
    neighborhood: 'Consolação',
    distance: '1.2km',
    image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
    deal: 'Drink Duplo',
    rating: 4.9,
    reviewCount: 42,
  },
];

export default function NearMeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.screenTitle}>Perto de Mim</Text>
      </View>

      <FlatList
        data={NEARBY_VENUES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <VenueCard
            id={item.id}
            name={item.name}
            category={item.category}
            neighborhood={item.neighborhood}
            distance={item.distance}
            image={item.image}
            deal={item.deal}
            rating={item.rating}
            reviewCount={item.reviewCount}
            onPress={() => router.push(`/venue/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: { marginRight: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
});