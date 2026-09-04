import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { theme } from '../../constants/theme';
import { fetchCNPJAndLocation } from '../../services/cnpj';
import { triggerImpact } from '../../utils/haptics';

const CATEGORIES = [
  { id: 'bar', label: 'Bar' },
  { id: 'balada', label: 'Balada' },
  { id: 'comer', label: 'Restaurante / Cafeteria' },
  { id: 'experiencia', label: 'Experiência' },
  { id: 'turismo', label: 'Turismo & Roteiro' },
];

const AUDIENCE_OPTIONS = ['gay', 'lesbico', 'trans', 'bi', 'drag'];
const MUSIC_OPTIONS = ['Pop', 'Funk', 'Eletrônica', 'Brasilidades', 'Indie/Rock', 'Samba/Pagode'];

export default function BusinessRegisterScreen() {
  const router = useRouter();

  const [cnpj, setCnpj] = useState('');
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

  const [name, setName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState<'bar' | 'balada' | 'comer' | 'experiencia' | 'roteiro' | 'hot' | 'turismo'>('bar');
  const [selectedAudience, setSelectedAudience] = useState<string[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [acceptedSafeSpaceTerms, setAcceptedSafeSpaceTerms] = useState(false);

  const handleCnpjChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length > 5) formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length > 8) formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    if (cleaned.length > 12) formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
    
    setCnpj(formatted);

    if (cleaned.length === 14) {
      handleSearchCNPJ(cleaned);
    }
  };

  const handleSearchCNPJ = async (rawCnpj: string) => {
    setIsSearchingCnpj(true);
    triggerImpact('light');

    const result = await fetchCNPJAndLocation(rawCnpj);
    setIsSearchingCnpj(false);

    if (result) {
      setName(result.companyName);
      setNeighborhood(result.neighborhood);
      setCity(result.city);
      setState(result.state);
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      triggerImpact('medium');
    } else {
      Alert.alert('CNPJ não localizado', 'Não conseguimos preencher os dados automaticamente. Por favor, digite manualmente.');
    }
  };

  const toggleAudience = (tag: string) => {
    triggerImpact('light');
    setSelectedAudience((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const toggleMusic = (tag: string) => {
    triggerImpact('light');
    setSelectedMusic((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || !city.trim() || !neighborhood.trim()) {
      Alert.alert('Atenção', 'Preencha o CNPJ ou os campos obrigatórios de identificação.');
      return;
    }

    if (!acceptedSafeSpaceTerms) {
      Alert.alert('Termo Obrigatório', 'É necessário aceitar o compromisso de Espaço Seguro (Safe Space) para cadastrar seu estabelecimento.');
      return;
    }

    triggerImpact('medium');
    Alert.alert(
      'Cadastro Enviado!',
      'Seu estabelecimento foi recebido pela nossa equipe de curadoria. Em breve entraremos em contato.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cadastro de Parceiro B2B</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Bloco CNPJ */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>1. Identificação do Local</Text>
          <Text style={styles.inputLabel}>CNPJ (Busca Automática)</Text>
          <View style={styles.cnpjInputWrapper}>
            <TextInput
              value={cnpj}
              onChangeText={handleCnpjChange}
              placeholder="00.000.000/0000-00"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              maxLength={18}
              style={styles.cnpjInput}
            />
            {isSearchingCnpj && <ActivityIndicator color={theme.colors.accent} style={{ marginRight: 10 }} />}
          </View>

          <Text style={styles.inputLabel}>Nome do Estabelecimento</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Castro Bar"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 2 }}>
              <Text style={styles.inputLabel}>Bairro</Text>
              <TextInput
                value={neighborhood}
                onChangeText={setNeighborhood}
                placeholder="Ex: Pinheiros"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.inputLabel}>Cidade</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Ex: São Paulo"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>UF</Text>
              <TextInput
                value={state}
                onChangeText={setState}
                placeholder="SP"
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.input}
                maxLength={2}
              />
            </View>
          </View>

          {latitude && longitude && (
            <View style={styles.geoBadge}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.positive} />
              <Text style={styles.geoBadgeText}>Localização Geocodificada para o Mapa</Text>
            </View>
          )}
        </View>

        {/* Categoria */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>2. Categoria</Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => {
                    triggerImpact('light');
                    setCategory(cat.id as any);
                  }}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Público e Música */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>3. Perfil &amp; Atmosfera</Text>
          
          <Text style={styles.inputLabel}>Público Alvo Principal</Text>
          <View style={styles.chipGrid}>
            {AUDIENCE_OPTIONS.map((tag) => {
              const isActive = selectedAudience.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => toggleAudience(tag)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {tag.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Estilo Musical Predominante</Text>
          <View style={styles.chipGrid}>
            {MUSIC_OPTIONS.map((tag) => {
              const isActive = selectedMusic.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => toggleMusic(tag)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    ♪ {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Compromisso Safe Space */}
        <View style={[styles.cardSection, { borderColor: theme.colors.accent }]}>
          <View style={styles.safeSpaceHeader}>
            <Ionicons name="shield-checkmark" size={24} color={theme.colors.accent} />
            <Text style={styles.safeSpaceTitle}>Selo de Espaço Seguro (Safe Space)</Text>
          </View>
          <Text style={styles.safeSpaceDescription}>
            Declaro que este estabelecimento possui política de tolerância zero contra LGBTQIAPN+fobia, machismo, racismo ou qualquer tipo de assédio, contando com equipe orientada ao acolhimento respeitoso.
          </Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Aceito o Termo de Conduta</Text>
            <Switch
              value={acceptedSafeSpaceTerms}
              onValueChange={(val) => {
                triggerImpact('medium');
                setAcceptedSafeSpaceTerms(val);
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={theme.colors.textPrimary}
            />
          </View>
        </View>

        {/* Botão Enviar */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Enviar para Análise de Curadoria</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary },
  container: { padding: 16, gap: 16 },
  cardSection: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.card, padding: 16, borderWidth: 1, borderColor: theme.colors.border, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 4 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.button, paddingHorizontal: 12, height: 44, color: theme.colors.textPrimary, fontSize: 14 },
  cnpjInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.accent, borderRadius: theme.borderRadius.button },
  cnpjInput: { flex: 1, paddingHorizontal: 12, height: 44, color: theme.colors.textPrimary, fontSize: 14, fontWeight: 'bold' },
  rowInputs: { flexDirection: 'row', gap: 8 },
  geoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(146, 192, 155, 0.15)', padding: 8, borderRadius: 8, marginTop: 4 },
  geoBadgeText: { fontSize: 11, fontWeight: 'bold', color: theme.colors.positive },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.textPrimary },
  safeSpaceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  safeSpaceTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.accent },
  safeSpaceDescription: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  switchLabel: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textPrimary },
  submitBtn: { backgroundColor: theme.colors.accent, height: 50, borderRadius: theme.borderRadius.button, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 15, fontWeight: 'bold', color: theme.colors.textPrimary },
});