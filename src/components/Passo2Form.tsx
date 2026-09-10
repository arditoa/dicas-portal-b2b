import { EXPERIENCES_TAGS_SIMPLE, MUSIC_STYLES, PUBLIC_VIBES } from '@/constants/tags';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebBadge } from './web-badge';

export interface Passo2Data {
  instagram: string;
  diferencial: string;
  selectedExperiences: string[];
  selectedMusic: string[];
  selectedVibes: string[];
}

interface Passo2Props {
  data: Passo2Data;
  onChange: (field: keyof Passo2Data, value: any) => void;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
}

export default function Passo2Form({
  data,
  onChange,
  onBack,
  onSubmit,
  loading,
}: Passo2Props) {
  const toggleItem = (
    field: 'selectedExperiences' | 'selectedMusic' | 'selectedVibes',
    item: string
  ) => {
    const list = [...data[field]];
    if (list.includes(item)) {
      onChange(
        field,
        list.filter((i) => i !== item)
      );
    } else {
      onChange(field, [...list, item]);
    }
  };

  return (
    <View style={styles.cardForm}>
      <View style={styles.logoWrapper}>
        <WebBadge />
      </View>

      <Text style={styles.sectionTitle}>2. Perfil, Vibe & Experiências</Text>
      <Text style={styles.subTitle}>
        Selecione as opções que definem a atmosfera do seu local no app:
      </Text>

      {/* INSTAGRAM */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>INSTAGRAM DO ESPAÇO</Text>
        <TextInput
          style={styles.input}
          placeholder="@seuespaco"
          placeholderTextColor="#606070"
          value={data.instagram}
          onChangeText={(val) => onChange('instagram', val)}
        />
      </View>

      {/* DESCRIÇÃO / PROPOSTA */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>DESCRIÇÃO / PROPOSTA DO ESPAÇO *</Text>
        <TextInput
          style={[styles.input, { height: 80, paddingTop: 10 }]}
          placeholder="Conte um pouco sobre a atmosfera do seu espaço..."
          placeholderTextColor="#606070"
          multiline
          value={data.diferencial}
          onChangeText={(val) => onChange('diferencial', val)}
        />
      </View>

      {/* 10 INTENÇÕES DE BUSCA OFICIAIS */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>INTENÇÕES DE BUSCA (EXPERIÊNCIAS NO APP)</Text>
        <View style={styles.chipsContainer}>
          {EXPERIENCES_TAGS_SIMPLE.map((tag) => {
            const active = data.selectedExperiences.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleItem('selectedExperiences', tag)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {active ? '✓ ' : '+ '}{tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ESTILO MUSICAL */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>ESTILO MUSICAL PREDOMINANTE</Text>
        <View style={styles.chipsContainer}>
          {MUSIC_STYLES.map((style) => {
            const active = data.selectedMusic.includes(style);
            return (
              <TouchableOpacity
                key={style}
                onPress={() => toggleItem('selectedMusic', style)}
                style={[styles.chip, active && { backgroundColor: '#7E57C2', borderColor: '#7E57C2' }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {active ? '✓ ' : '+ '}{style}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* PÚBLICO & VIBE */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>PÚBLICO & VIBE</Text>
        <View style={styles.chipsContainer}>
          {PUBLIC_VIBES.map((vibe) => {
            const active = data.selectedVibes.includes(vibe);
            return (
              <TouchableOpacity
                key={vibe}
                onPress={() => toggleItem('selectedVibes', vibe)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {active ? '✓ ' : '+ '}{vibe}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* BOTÕES DE AÇÃO */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} disabled={loading}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} disabled={loading}>
          <Text style={styles.submitBtnText}>
            {loading ? 'Cadastrando...' : 'Finalizar Cadastro B2B ✨'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardForm: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#121118',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232230',
    padding: 24,
    gap: 16,
    marginBottom: 40,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  subTitle: { fontSize: 12, color: '#A0A0B2', marginTop: -8, marginBottom: 4 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: '#A0A0B2', letterSpacing: 0.5 },
  input: {
    height: 46,
    backgroundColor: '#1A1924',
    borderWidth: 1,
    borderColor: '#2A2938',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#FFF',
    fontSize: 14,
  },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#1A1924',
    borderWidth: 1,
    borderColor: '#2A2938',
  },
  chipActive: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  chipText: { fontSize: 12, color: '#A0A0B2', fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  backBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#1A1924',
    borderWidth: 1,
    borderColor: '#2A2938',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { color: '#A0A0B2', fontWeight: '700', fontSize: 14 },
  submitBtn: {
    flex: 2,
    height: 48,
    backgroundColor: '#E1306C',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});