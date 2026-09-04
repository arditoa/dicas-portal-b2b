import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { trackEvent } from '../utils/analytics';
import { triggerImpact } from '../utils/haptics';

const COMMERCIAL_WHATSAPP_NUMBER = '5511999999999'; // Substituir pelo número real

export default function AnnounceSpaceScreen() {
  const router = useRouter();
  const { origem } = useLocalSearchParams<{ origem?: string }>();
  
  const [placeName, setPlaceName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const leadSource = origem || 'direto';

  useEffect(() => {
    trackEvent('partner_screen_view', { origem: leadSource });
  }, [leadSource]);

  const handleSubmit = () => {
    if (!placeName.trim() || !whatsapp.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o nome do espaço e o WhatsApp.');
      return;
    }

    triggerImpact('light');
    trackEvent('partner_form_submit', { origem: leadSource, placeName });

    const message = `Olá! Quero anunciar o espaço "${placeName.trim()}" no Dicas LGBT. (Contato: ${whatsapp.trim()}) [Origem: ${leadSource}]`;
    const url = `https://wa.me/${COMMERCIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            triggerImpact('light');
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Anuncie seu espaço</Text>
        <View style={{ width: theme.touchTarget.minWidth }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Ionicons name="sparkles" size={28} color={theme.colors.sponsor} />
          <Text style={styles.heroTitle}>Alcance a comunidade LGBT+</Text>
          <Text style={styles.heroSubtitle}>
            • Destaque visual e relevância no mapa da cidade{'\n'}
            • Selo de credibilidade verificado{'\n'}
            • Relatório simples de acessos e cliques
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nome do Espaço / Evento</Text>
          <TextInput
            style={styles.input}
            value={placeName}
            onChangeText={setPlaceName}
            placeholder="Ex: Bar do Castro"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Text style={styles.label}>WhatsApp para Contato</Text>
          <TextInput
            style={styles.input}
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={styles.whatsappBtn}
          activeOpacity={0.85}
          onPress={handleSubmit}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
          <Text style={styles.whatsappBtnText}>Falar no WhatsApp</Text>
        </TouchableOpacity>

        {/* Item A: Consentimento explicito antes do envio */}
        <Text style={styles.lgpdNote}>
          Ao enviar, você concorda com nossa{' '}
          <Text
            style={styles.lgpdLink}
            onPress={() => router.push('/privacy')}
          >
            Política de Privacidade
          </Text>
          .
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.name.fontSize,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  container: { padding: 20, gap: 20 },
  heroCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.sponsor,
    gap: 10,
  },
  heroTitle: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  formGroup: { gap: 12 },
  label: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  input: {
    minHeight: theme.touchTarget.minHeight,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 14,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: theme.touchTarget.minHeight,
    backgroundColor: theme.colors.whatsapp,
    borderRadius: theme.borderRadius.button,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
  },
  lgpdNote: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  lgpdLink: {
    color: theme.colors.accent,
    textDecorationLine: 'underline',
  },
});