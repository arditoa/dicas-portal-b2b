import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyScreen() {
  const router = useRouter();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir conta',
      'Tem certeza de que deseja excluir permanentemente sua conta? Esta ação é irreversível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir permanentemente',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Conta Excluída', 'Sua conta foi removida com sucesso.');
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Privacidade & LGPD</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Text style={styles.sectionTitle}>Sua privacidade é nossa prioridade</Text>
          <Text style={styles.paragraph}>
            Respeitamos totalmente a sua privacidade e o direito à proteção de dados (LGPD). O app Dicas LGBT+ permite navegação anônima sem exigir criação de conta para visualizar estabelecimentos e mapas.
          </Text>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Feather name="trash-2" size={16} color="#FF5252" style={{ marginRight: 8 }} />
            <Text style={styles.deleteText}>Excluir minha conta</Text>
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  paragraph: { fontSize: 14, color: '#A0A0B0', lineHeight: 22 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#331515', height: 48, borderRadius: 12, justifyContent: 'center', marginTop: 24, borderWidth: 1, borderColor: '#FF525240' },
  deleteText: { color: '#FF5252', fontSize: 14, fontWeight: '700' },
});