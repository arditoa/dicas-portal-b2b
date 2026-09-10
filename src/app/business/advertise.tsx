import { CATEGORIES_LIST, EXPERIENCES_TAGS, SUBCATEGORIES_MAP } from '@/constants/tags';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function B2BRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES_LIST[0].slug);
  const [subcategory, setSubcategory] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [diferencial, setDiferencial] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleTag = (tagLabel: string) => {
    if (selectedTags.includes(tagLabel)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagLabel));
    } else {
      setSelectedTags([...selectedTags, tagLabel]);
    }
  };

  const currentSubcategories = SUBCATEGORIES_MAP[category] || [];

  const handleRegister = async () => {
    if (!name.trim() || !neighborhood.trim() || !diferencial.trim()) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha o nome do local, bairro e o diferencial.');
      return;
    }

    setLoading(true);

    try {
      // 1. Gerar slug ID amigável único para o banco (ex: "castro-bar-832")
      const slugId = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Math.floor(Math.random() * 1000);

      // 2. Obter usuário logado se houver (para vincular como owner_id)
      const { data: { user } } = await supabase.auth.getUser();

      // 3. Inserir na tabela public.businesses
      const { error: bizError } = await supabase.from('businesses').insert({
        id: slugId,
        owner_id: user?.id || null,
        name: name.trim(),
        category,
        subcategory: subcategory || 'Geral',
        neighborhood: neighborhood.trim(),
        diferencial: diferencial.trim(),
        instagram: instagram.trim() || null,
        whatsapp: whatsapp.trim() || null,
        has_selo_dicas: true, // Pré-aprovado para curadoria
        is_featured: false,
        plan_id: 'basic',
      });

      if (bizError) throw bizError;

      // 4. Vincular as tags na tabela public.business_experiences
      if (selectedTags.length > 0) {
        const experienceLinks = selectedTags.map((tagLabel) => ({
          business_id: slugId,
          experience_tag: tagLabel,
        }));

        const { error: expError } = await supabase.from('business_experiences').insert(experienceLinks);
        if (expError) throw expError;
      }

      Alert.alert(
        'Solicitação Enviada! 🌈',
        'Seu espaço foi cadastrado com sucesso e está em análise para verificação do Selo Dicas.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Erro ao cadastrar', e.message || 'Ocorreu um erro ao cadastrar seu local.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Alinhado */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Anuncie com o Selo Dicas</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner do Selo Dicas */}
        <View style={styles.seloBanner}>
          <Feather name="award" size={20} color="#E1306C" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.seloTitle}>Selo Dicas LGBT+</Text>
            <Text style={styles.seloDesc}>
              Ao cadastrar, seu espaço declara compromisso em promover ambientes inclusivos, seguros e acolhedores.
            </Text>
          </View>
        </View>

        {/* Nome do Local */}
        <Text style={styles.label}>Nome do Estabelecimento *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Castro Lounge Bar"
          placeholderTextColor="#606070"
          value={name}
          onChangeText={setName}
        />

        {/* Categoria Principal */}
        <Text style={styles.label}>Categoria Principal *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowList}>
          {CATEGORIES_LIST.map((cat) => (
            <TouchableOpacity
              key={cat.slug}
              style={[styles.chip, category === cat.slug && styles.chipActive]}
              onPress={() => {
                setCategory(cat.slug);
                setSubcategory('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, category === cat.slug && styles.chipTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subcategoria */}
        {currentSubcategories.length > 0 && (
          <>
            <Text style={styles.label}>Subcategoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowList}>
              {currentSubcategories.map((sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.chip, subcategory === sub && styles.chipActive]}
                  onPress={() => setSubcategory(sub)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, subcategory === sub && styles.chipTextActive]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Bairro */}
        <Text style={styles.label}>Bairro / Localização *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Pinheiros, Jardins, Centro"
          placeholderTextColor="#606070"
          value={neighborhood}
          onChangeText={setNeighborhood}
        />

        {/* Diferencial */}
        <Text style={styles.label}>Diferencial / Proposta Inclusiva *</Text>
        <TextInput
          style={[styles.input, { height: 68, textAlignVertical: 'top', paddingTop: 10 }]}
          placeholder="Ex: Atendimento especializado, iluminação intimista e coquetelaria autoral."
          placeholderTextColor="#606070"
          multiline
          value={diferencial}
          onChangeText={setDiferencial}
        />

        {/* Intenções de Busca (Tags) */}
        <Text style={styles.label}>Intenções de Busca (Onde deseja aparecer)</Text>
        <View style={styles.tagsWrap}>
          {EXPERIENCES_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.label);
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => toggleTag(tag.label)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Contatos */}
        <Text style={styles.label}>Instagram do Local</Text>
        <TextInput
          style={styles.input}
          placeholder="@seulocal ou link"
          placeholderTextColor="#606070"
          value={instagram}
          onChangeText={setInstagram}
        />

        <Text style={styles.label}>WhatsApp de Contato / Reservas</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: (11) 99999-9999"
          placeholderTextColor="#606070"
          keyboardType="phone-pad"
          value={whatsapp}
          onChangeText={setWhatsapp}
        />

        {/* Botão de Envio */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Enviar para Análise e Obter Selo Dicas</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#232230', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  seloBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161520', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(225, 48, 108, 0.3)', marginBottom: 16 },
  seloTitle: { fontSize: 13, fontWeight: '800', color: '#E1306C' },
  seloDesc: { fontSize: 11, color: '#A0A0B2', marginTop: 2, lineHeight: 15 },

  label: { fontSize: 12, fontWeight: '700', color: '#A0A0B2', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#161520', borderRadius: 12, borderWidth: 1, borderColor: '#232230', paddingHorizontal: 14, height: 46, color: '#FFF', fontSize: 13 },
  
  rowList: { gap: 8, paddingBottom: 4 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  chipActive: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  chipText: { fontSize: 12, color: '#A0A0B2', fontWeight: '600' },
  chipTextActive: { color: '#FFF' },

  submitBtn: { backgroundColor: '#E1306C', height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});