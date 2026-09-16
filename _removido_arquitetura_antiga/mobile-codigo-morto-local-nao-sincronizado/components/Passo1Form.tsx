import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import WebBadge from './web-badge';

export const CATEGORIES_LIST = [
  { slug: 'bares', label: 'Bares & Vida Noturna' },
  { slug: 'gastronomia', label: 'Gastronomia' },
  { slug: 'festas', label: 'Festas & Eventos' },
  { slug: 'cultura', label: 'Cultura & Lazer' },
  { slug: 'turismo', label: 'Dicas Trip (Turismo)' },
  { slug: 'beleza', label: 'Beleza & Bem-Estar' },
  { slug: '18plus', label: 'Espaços 18+' },
];

export interface Passo1Data {
  document: string;
  responsibleName: string;
  whatsapp: string;
  companyName: string;
  fantasyName: string;
  category: string;
  neighborhood: string;
}

interface Passo1Props {
  data: Passo1Data;
  onChange: (field: keyof Passo1Data, value: string) => void;
  onNext: () => void;
  activeTab?: 'b2b' | 'coupons' | 'admin';
  onTabChange?: (tab: 'b2b' | 'coupons' | 'admin') => void;
}

export default function Passo1Form({
  data,
  onChange,
  onNext,
  activeTab = 'b2b',
  onTabChange,
}: Passo1Props) {
  const handleSubmit = () => {
    if (
      !data.document ||
      !data.responsibleName ||
      !data.whatsapp ||
      !data.companyName ||
      !data.fantasyName ||
      !data.neighborhood
    ) {
      alert('Por favor, preencha todos os campos obrigatórios (*)');
      return;
    }
    onNext();
  };

  return (
    <View style={styles.container}>
      {/* BARRA DE NAVEGAÇÃO DE ABAS */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => onTabChange && onTabChange('b2b')}
          style={[styles.navTab, activeTab === 'b2b' && styles.navTabActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.navTabText, activeTab === 'b2b' && styles.navTabTextActive]}>
            📝 Cadastro B2B
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onTabChange && onTabChange('coupons')}
          style={[styles.navTab, activeTab === 'coupons' && styles.navTabActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.navTabText, activeTab === 'coupons' && styles.navTabTextActive]}>
            ⚡ Cupons Express
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onTabChange && onTabChange('admin')}
          style={[styles.navTab, activeTab === 'admin' && styles.navTabActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.navTabText, activeTab === 'admin' && styles.navTabTextActive]}>
            🔐 Admin
          </Text>
        </TouchableOpacity>
      </View>

      {/* LOGO OFICIAL DO APP & TITULO */}
      <View style={styles.headerHero}>
        <View style={styles.logoWrapper}>
          <WebBadge />
        </View>
        <Text style={styles.mainTitle}>Cadastre seu espaço no Dicas LGBT+</Text>
        <Text style={styles.mainSubtitle}>
          Seja visto por milhares de clientes na maior plataforma de locais e roteiros inclusivos.
        </Text>
      </View>

      {/* FORMULÁRIO ETAPA 1 */}
      <View style={styles.cardForm}>
        <Text style={styles.sectionTitle}>1. Identificação do Espaço</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>CPF OU CNPJ *</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite seu CPF ou CNPJ"
            placeholderTextColor="#606070"
            value={data.document}
            onChangeText={(val) => onChange('document', val)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>NOME DO RESPONSÁVEL *</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome completo"
            placeholderTextColor="#606070"
            value={data.responsibleName}
            onChangeText={(val) => onChange('responsibleName', val)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>WHATSAPP COMERCIAL *</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 99999-9999"
            placeholderTextColor="#606070"
            keyboardType="phone-pad"
            value={data.whatsapp}
            onChangeText={(val) => onChange('whatsapp', val)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>RAZÃO SOCIAL / NOME OFICIAL *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Bar da Esquina LTDA"
            placeholderTextColor="#606070"
            value={data.companyName}
            onChangeText={(val) => onChange('companyName', val)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>NOME FANTASIA (NOME PÚBLICO) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome como o local é conhecido publicamente"
            placeholderTextColor="#606070"
            value={data.fantasyName}
            onChangeText={(val) => onChange('fantasyName', val)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>CATEGORIA PRINCIPAL *</Text>
          <View style={styles.chipRow}>
            {CATEGORIES_LIST.map((cat) => (
              <TouchableOpacity
                key={cat.slug}
                style={[styles.catChip, data.category === cat.slug && styles.catChipActive]}
                onPress={() => onChange('category', cat.slug)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catChipText, data.category === cat.slug && styles.catChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>BAIRRO / LOCALIZAÇÃO *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Pinheiros, Jardins, Centro"
            placeholderTextColor="#606070"
            value={data.neighborhood}
            onChangeText={(val) => onChange('neighborhood', val)}
          />
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Avançar para Etapa 2 →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0F0E14',
    padding: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1F1E2A',
    marginBottom: 28,
    alignSelf: 'center',
  },
  navTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
  },
  navTabActive: {
    backgroundColor: '#1E1A29',
    borderWidth: 1,
    borderColor: '#322A47',
  },
  navTabText: {
    color: '#8A8A9E',
    fontSize: 13,
    fontWeight: '600',
  },
  navTabTextActive: {
    color: '#FFF',
  },
  headerHero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    marginBottom: 16,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 14,
    color: '#9A9AAB',
    textAlign: 'center',
    maxWidth: 520,
    lineHeight: 20,
  },
  cardForm: {
    width: '100%',
    backgroundColor: '#121118',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232230',
    padding: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0A0B2',
    letterSpacing: 0.5,
  },
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1A1924',
    borderWidth: 1,
    borderColor: '#2A2938',
  },
  catChipActive: {
    backgroundColor: '#E1306C',
    borderColor: '#E1306C',
  },
  catChipText: {
    fontSize: 12,
    color: '#A0A0B2',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#FFF',
  },
  nextBtn: {
    marginTop: 12,
    height: 48,
    backgroundColor: '#E1306C',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});