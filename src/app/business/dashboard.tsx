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
import { theme } from '../../constants/theme';
import { triggerImpact } from '../../utils/haptics';

export default function BusinessDashboardScreen() {
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
        <Text style={styles.headerTitle}>Painel do Parceiro</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.venueHeaderCard}>
          <Text style={styles.venueName}>Vezpa Bar</Text>
          <View style={styles.positionTag}>
            <Ionicons name="sparkles" size={12} color={theme.colors.sponsor} />
            <Text style={styles.positionTagText}>Destaque na Home</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Métricas de Desempenho (Mês Atual)</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="eye-outline" size={26} color={theme.colors.accent} />
            <Text style={styles.metricValue}>12.450</Text>
            <Text style={styles.metricLabel}>Impressões no App</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="analytics-outline" size={26} color={theme.colors.sponsor} />
            <Text style={styles.metricValue}>1.820</Text>
            <Text style={styles.metricLabel}>Cliques no Card</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="ticket-outline" size={26} color={theme.colors.positive} />
            <Text style={styles.metricValue}>340</Text>
            <Text style={styles.metricLabel}>Cupons Resgatados</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
  container: {
    padding: 16,
  },
  venueHeaderCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  venueName: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  positionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(224, 176, 100, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.button,
    borderWidth: 1,
    borderColor: theme.colors.sponsor,
  },
  positionTagText: {
    color: theme.colors.sponsor,
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    padding: 18,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginVertical: 4,
  },
  metricLabel: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
});