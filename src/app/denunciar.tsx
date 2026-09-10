import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function DenunciarScreen() {
  const router = useRouter();
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    Alert.alert('Denúncia Enviada', 'Agradecemos sua colaboração. Nossa equipe analisará o conteúdo.');
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Obtenha Ajuda & Denunciar</Text>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          <Text style={styles.label}>Descreva o problema ou denúncia:</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Conte-nos o que aconteceu ou qual conteúdo viola as regras..."
            placeholderTextColor="#606070"
            multiline
            numberOfLines={5}
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity style={styles.sendBtn} onPress={handleSubmit}>
            <Text style={styles.sendText}>Enviar Denúncia</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  label: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  textArea: { backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', padding: 14, color: '#FFF', textAlignVertical: 'top', height: 120 },
  sendBtn: { backgroundColor: '#E1306C', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});