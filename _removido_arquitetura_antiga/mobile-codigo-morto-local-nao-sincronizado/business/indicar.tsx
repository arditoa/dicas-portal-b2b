import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME } from '../../constants/theme';

const WHATSAPP_NUMBER = '5511999999999';

export default function IndicarScreen() {
  const router = useRouter();

  const handleOpenWhatsApp = async () => {
    const message = 'Olá! Quero indicar um local/festa seguro para ser incluído no guia Dicas LGBT+.';
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o WhatsApp no seu dispositivo.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao abrir o WhatsApp.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={THEME.textDim} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Indique um Local ou Festa</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="message-circle" size={32} color={THEME.pinkSoft} />
        </View>

        <Text style={styles.title}>Atendimento via WhatsApp</Text>
        <Text style={styles.description}>
          Para garantir a checagem rápida de informações e o selo de espaço seguro, recebemos todas as indicações diretamente no nosso canal oficial do WhatsApp.
        </Text>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleOpenWhatsApp} activeOpacity={0.85}>
          <Feather name="external-link" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.btnPrimaryText}>Abrir WhatsApp Oficial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  topbar: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.surface, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: THEME.text },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: -40 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(194,37,92,0.14)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: THEME.text, textAlign: 'center' },
  description: { fontSize: 13.5, color: THEME.textDim, textAlign: 'center', lineHeight: 20 },
  btnPrimary: { flexDirection: 'row', backgroundColor: THEME.pink, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' }
});