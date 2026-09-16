import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { VenueCard } from '../components/VenueCard';
import { fetchPromotions } from '../lib/api';
import { triggerImpact } from '../utils/haptics';

export default function PromotionsScreen() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPromos() {
      try {
        const data = await fetchPromotions();
        setPromotions(data);
      } catch (e) {
        console.error('Erro ao carregar promoções:', e);
      } finally {
        setLoading(false);
      }
    }
    loadPromos();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF2D78" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            triggerImpact('light');
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cupons & Promoções</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={promotions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <VenueCard venue={item} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma promoção ativa no momento.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0A14' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0A14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#181524',
    borderBottomWidth: 1,
    borderBottomColor: '#262238',
  },
  backBtn: {
    backgroundColor: '#0C0A14',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262238',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 40 },
  emptyText: { color: '#8A889D', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 24 },
});