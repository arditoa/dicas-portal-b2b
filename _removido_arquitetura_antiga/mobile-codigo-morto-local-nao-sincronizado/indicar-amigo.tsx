import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function IndicarAmigoScreen() {
  const router = useRouter();

  const handleShareApp = async () => {
    try {
      await Share.share({
        message:
          'Conheça o Dicas LGBT+ — O seu guia de experiências e espaços seguros! Baixe agora e explore os melhores lugares, eventos e cupons exclusivos.',
      });
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Indique um Amigo</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.illustrationBox}>
            <View style={styles.iconCircle}>
              <Feather name="users" size={32} color="#7E57C2" />
            </View>
          </View>

          <Text style={styles.mainTitle}>Espalhe o amor e a comunidade!</Text>
          <Text style={styles.description}>
            Convide amigxs para descobrir lugares seguros, eventos acolhedores e cupons de desconto exclusivos no app Dicas LGBT+.
          </Text>

          <View style={styles.cardInfo}>
            <View style={styles.infoRow}>
              <Feather name="check-circle" size={18} color="#81C784" style={{ marginRight: 10 }} />
              <Text style={styles.infoText}>Acesso livre e navegação anônima</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="check-circle" size={18} color="#81C784" style={{ marginRight: 10 }} />
              <Text style={styles.infoText}>Locais com selo Safe Space checados</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="check-circle" size={18} color="#81C784" style={{ marginRight: 10 }} />
              <Text style={styles.infoText}>Agenda atualizada com festas e feiras</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShareApp} activeOpacity={0.85}>
            <Feather name="share-2" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnText}>Compartilhar o App</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  content: { padding: 20, alignItems: 'center' },
  illustrationBox: { marginVertical: 24, alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2B1E42', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#7E57C2' },
  mainTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 10 },
  description: { fontSize: 14, color: '#A0A0B0', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  cardInfo: { width: '100%', backgroundColor: '#1C1B26', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2D2B3D', gap: 12, marginBottom: 28 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
  shareBtn: { flexDirection: 'row', backgroundColor: '#E1306C', width: '100%', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  shareBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});