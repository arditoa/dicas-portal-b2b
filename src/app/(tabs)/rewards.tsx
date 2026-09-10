import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';

const REWARDS_DATA = [
  { id: '1', title: 'Drink Cortesia no Castro Bar', discount: '100% OFF', code: 'CASTROVIP', color: '#2558A6' },
  { id: '2', title: 'Entrada VIP na Zig Club', discount: 'Isenção de Couvert', code: 'ZIGVIP', color: '#5C25A6' },
  { id: '3', title: '15% OFF em Pratos da Gra', discount: '15% OFF', code: 'GRA15OFF', color: '#258BA6' },
];

export default function RewardsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Header com Ícone da Marca */}
          <View style={styles.headerRow}>
            <Image
              source={require('@/assets/images/logo-icon.png')}
              style={styles.headerIcon}
              resizeMode="contain"
            />
            <Text style={styles.pageTitle}>Cupons & VIP</Text>
          </View>
          <Text style={styles.subTitle}>Seus benefícios exclusivos da comunidade LGBT+</Text>

          {/* Lista de Cupons / Cards */}
          <View style={styles.listContainer}>
            {REWARDS_DATA.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={[styles.cardHeader, { backgroundColor: item.color }]}>
                  <Text style={styles.discountBadge}>{item.discount}</Text>
                  <Feather name="gift" size={20} color="#FFFFFF" />
                </View>
                
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.codeLabel}>CÓDIGO DO CUPOM:</Text>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{item.code}</Text>
                    <Feather name="copy" size={16} color="#E1306C" />
                  </View>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121216',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerIcon: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subTitle: {
    fontSize: 13,
    color: '#A0A0B0',
    marginBottom: 20,
  },
  listContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1C1B26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2B3D',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#606070',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  codeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#282836',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D3D4E',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFD54F',
    letterSpacing: 1,
  },
});