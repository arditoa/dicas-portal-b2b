import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function IndicarScreen() {
  const router = useRouter();
  const [placeName, setPlaceName] = useState('');
  const [category, setCategory] = useState('Gastronomia');
  const [address, setAddress] = useState('');
  const [instagram, setInstagram] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!placeName.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o nome do local ou festa.');
      return;
    }

    Alert.alert(
      'Indicação Enviada!',
      'Obrigado por ajudar a comunidade a crescer. Analisaremos sua indicação em breve.'
    );
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Indicar um Local ou Festa</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <Text style={styles.subtitle}>
            Conhece um espaço seguro, acolhedor ou uma festa incrível que deveria estar no app? Conte para a gente!
          </Text>

          <Text style={styles.label}>Nome do Local ou Festa *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Bar Castro"
            placeholderTextColor="#606070"
            value={placeName}
            onChangeText={setPlaceName}
          />

          <Text style={styles.label}>Categoria</Text>
          <View style={styles.categoryRow}>
            {['Gastronomia', 'Cultura', 'Turismo', 'Eventos'].map((item) => {
              const isSelected = category === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Endereço ou Bairro</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Rua Frei Caneca, Consolação"
            placeholderTextColor="#606070"
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.label}>Instagram (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="@nomedolocal"
            placeholderTextColor="#606070"
            value={instagram}
            onChangeText={setInstagram}
          />

          <Text style={styles.label}>Por que esse lugar é seguro/especial?</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ex: Equipe treinada, ambiente acolhedor, ótimos drinks..."
            placeholderTextColor="#606070"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.submitText}>Enviar Indicação</Text>
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
  subtitle: { fontSize: 13, color: '#A0A0B0', lineHeight: 18, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  input: { backgroundColor: '#1C1B26', height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', paddingHorizontal: 14, color: '#FFF', fontSize: 14 },
  textArea: { backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', padding: 14, color: '#FFF', fontSize: 14, textAlignVertical: 'top', height: 100 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1C1B26', borderWidth: 1, borderColor: '#2D2B3D' },
  categoryChipActive: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#A0A0B0' },
  categoryTextActive: { color: '#FFF' },
  submitBtn: { backgroundColor: '#E1306C', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});