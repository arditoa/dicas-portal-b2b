import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLOR_PRIMARY = '#FF3D82';
const COLOR_SURFACE = '#1D1726';

export default function PlansScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Planos de Destaque</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Aumente a visibilidade do seu espaço</Text>
        <Text style={styles.sub}>Ganhe topo no mapa, selo verificado e notificações para a comunidade.</Text>

        <View style={styles.planCard}>
          <Text style={styles.planBadge}>MAIS POPULAR</Text>
          <Text style={styles.planTitle}>Plano Destaque VIP</Text>
          <Text style={styles.planPrice}>R$ 99<Text style={{ fontSize: 14, fontWeight: 'normal' }}>/mês</Text></Text>
          <Text style={styles.planDesc}>Apareça em primeiro lugar nas buscas e receba mais clientes no seu estabelecimento.</Text>

          <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85} onPress={() => router.back()}>
            <Text style={styles.btnPrimaryText}>Contratar via Suporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15111C' },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  backBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginLeft: 4 },
  content: { padding: 20 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 8 },
  sub: { color: '#B6A6BE', fontSize: 13, marginTop: 4, marginBottom: 20 },
  planCard: { backgroundColor: COLOR_SURFACE, padding: 20, borderRadius: 16, borderWidth: 1.5, borderColor: COLOR_PRIMARY },
  planBadge: { color: COLOR_PRIMARY, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  planTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  planPrice: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginVertical: 8 },
  planDesc: { color: '#B6A6BE', fontSize: 13, lineHeight: 18, marginBottom: 20 },
  btnPrimary: { backgroundColor: COLOR_PRIMARY, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }
});