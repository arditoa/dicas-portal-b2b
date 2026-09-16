import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLOR_PRIMARY = '#FF3D82';
const COLOR_SURFACE = '#1D1726';

export default function BusinessDashboardScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* HEADER SECUNDÁRIO */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Painel B2B</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Painel do Parceiro</Text>
        <Text style={styles.sub}>Acompanhe a métrica do seu espaço em tempo real.</Text>

        {/* METRICAS */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>142</Text>
            <Text style={styles.metricLabel}>Visualizações</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>28</Text>
            <Text style={styles.metricLabel}>Cupons Salvos</Text>
          </View>
        </View>

        {/* STATUS DO PLANO */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⭐ Plano Atual: Destaque VIP</Text>
          <Text style={styles.cardText}>
            Seu espaço está em evidência no topo das pesquisas da região de Pinheiros.
          </Text>
          <TouchableOpacity 
            style={styles.btnSecondary} 
            activeOpacity={0.8}
            onPress={() => router.push('/plans')}
          >
            <Text style={styles.btnSecondaryText}>Gerenciar Planos</Text>
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

  metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metricCard: { 
    flex: 1, 
    backgroundColor: COLOR_SURFACE, 
    padding: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)' 
  },
  metricValue: { color: COLOR_PRIMARY, fontSize: 24, fontWeight: '900' },
  metricLabel: { color: '#B6A6BE', fontSize: 11, marginTop: 4, fontWeight: '700' },

  card: { 
    backgroundColor: COLOR_SURFACE, 
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)' 
  },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  cardText: { color: '#B6A6BE', fontSize: 13, lineHeight: 20, marginBottom: 14 },

  btnSecondary: { 
    backgroundColor: 'rgba(255, 61, 130, 0.15)', 
    paddingVertical: 10, 
    borderRadius: 10, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: COLOR_PRIMARY 
  },
  btnSecondaryText: { color: COLOR_PRIMARY, fontSize: 13, fontWeight: '800' }
});