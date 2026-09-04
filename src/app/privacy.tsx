import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { theme } from '../constants/theme';
import { triggerImpact } from '../utils/haptics';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

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
        <Text style={styles.headerTitle}>Política de Privacidade</Text>
        <View style={{ width: theme.touchTarget.minWidth }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.lastUpdated}>Última atualização: Setembro de 2026</Text>

        <Text style={styles.sectionTitle}>1. Coleta de Localização</Text>
        <Text style={styles.paragraph}>
          Coletamos sua localização aproximada somente quando permitido por você, com o objetivo exclusivo de exibir locais, eventos e rotas próximas no mapa. Seus dados de localização não são armazenados em nossos servidores nem compartilhados com terceiros.
        </Text>

        <Text style={styles.sectionTitle}>2. Dados para Anúncios (Parceiros)</Text>
        <Text style={styles.paragraph}>
          Ao utilizar o formulário "Anuncie seu espaço", coletamos o nome do estabelecimento e o número de WhatsApp comercial exclusivamente para contato direto e negociação do anúncio.
        </Text>

        <Text style={styles.sectionTitle}>3. Navegação Anônima</Text>
        <Text style={styles.paragraph}>
          Você pode navegar, favoritar locais e explorar a agenda de festas sem criar uma conta ou fornecer informações pessoais.
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
  container: { padding: 20, gap: 16 },
  lastUpdated: { fontSize: theme.typography.caption.fontSize, color: theme.colors.textSecondary },
  sectionTitle: {
    fontSize: theme.typography.name.fontSize,
    fontWeight: 'bold',
    color: theme.colors.accent,
    marginTop: 8,
  },
  paragraph: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
});