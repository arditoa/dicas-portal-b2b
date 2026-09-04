import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, LAYOUT, RADIUS, TYPOGRAPHY } from '../../constants/theme';

export default function AdvertiseScreen() {
  const { origem = 'direto' } = useLocalSearchParams<{ origem?: string }>();
  const [venueName, setVenueName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const WHATSAPP_NUMBER = '5511999999999';

  const handleOpenWhatsApp = () => {
    if (!venueName.trim() || !whatsapp.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o nome do espaço e seu WhatsApp.');
      return;
    }

    const message = `Olá! Quero anunciar meu espaço no Dicas LGBT.\n\n` +
      `• *Nome do Espaço:* ${venueName}\n` +
      `• *Contato:* ${whatsapp}\n` +
      `• *Origem:* ${origem}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <Text style={TYPOGRAPHY.screenTitle}>Anuncie seu espaço</Text>

      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitItem}>✨ Maior visibilidade para o público LGBT+ da cidade</Text>
        <Text style={styles.benefitItem}>🌟 Selo Destaque Dicas e vitrine editorial na Home</Text>
        <Text style={styles.benefitItem}>📊 Relatório simples de impressões e engajamento</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nome do local ou evento</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Bar do Dragão"
          placeholderTextColor={COLORS.textSecondary}
          value={venueName}
          onChangeText={setVenueName}
        />

        <Text style={styles.label}>Seu WhatsApp com DDD</Text>
        <TextInput
          style={styles.input}
          placeholder="(11) 99999-9999"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="phone-pad"
          value={whatsapp}
          onChangeText={setWhatsapp}
        />

        <Text style={styles.privacyNote}>
          🔒 Ao enviar, você concorda que entraremos em contato via WhatsApp para apresentar as opções de anúncios.
        </Text>

        <TouchableOpacity style={styles.btnWhatsapp} onPress={handleOpenWhatsApp} activeOpacity={0.8}>
          <Text style={styles.btnWhatsappText}>Conversar no WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 60 },
  benefitsContainer: { marginVertical: 20, backgroundColor: COLORS.surface, padding: 16, borderRadius: RADIUS.card },
  benefitItem: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textPrimary, marginBottom: 8 },
  form: { marginTop: 10 },
  label: { ...TYPOGRAPHY.bodyMetadata, color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(182, 166, 190, 0.2)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: 14,
    color: COLORS.textPrimary,
    marginBottom: 16,
    minHeight: LAYOUT.minTouchTarget,
  },
  privacyNote: { ...TYPOGRAPHY.captionTag, color: COLORS.textSecondary, marginBottom: 20 },
  btnWhatsapp: {
    backgroundColor: COLORS.whatsapp,
    borderRadius: RADIUS.pill,
    height: LAYOUT.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnWhatsappText: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
});