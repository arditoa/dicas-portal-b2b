import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, SafeAreaView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MOCK_COUPONS = [
  { id: '1', title: 'Double Chopp no Happy Hour', venue: 'Bar Castro', code: 'RAINBOW10', discount: '2x1', color: '#E1306C' },
  { id: '2', title: '15% de Desconto na Reserva', venue: 'Hotel Aurora Pinheiros', code: 'AURORA15', discount: '15% OFF', color: '#9C27B0' },
];

export default function CouponsScreen() {
  const router = useRouter();

  const handleShareCode = (code: string, venue: string) => {
    Share.share({ message: `Meu cupom no ${venue}: ${code}` });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Meus Cupons & VIP</Text>
        </View>

        <FlatList
          data={MOCK_COUPONS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 14 }}
          renderItem={({ item }) => (
            <View style={styles.couponCard}>
              <View style={[styles.badgeStrip, { backgroundColor: item.color }]}>
                <Text style={styles.discountText}>{item.discount}</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.venueName}>{item.venue}</Text>
                <Text style={styles.couponTitle}>{item.title}</Text>

                <View style={styles.codeRow}>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => handleShareCode(item.code, item.venue)}
                  >
                    <Feather name="share-2" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
  couponCard: { backgroundColor: '#1C1B26', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2D2B3D' },
  badgeStrip: { paddingHorizontal: 14, paddingVertical: 6 },
  discountText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  cardBody: { padding: 14 },
  venueName: { fontSize: 12, color: '#A0A0B0', marginBottom: 2 },
  couponTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeBox: { backgroundColor: '#282836', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3D3D4E' },
  codeText: { color: '#FFD54F', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  shareBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#282836', justifyContent: 'center', alignItems: 'center' },
});