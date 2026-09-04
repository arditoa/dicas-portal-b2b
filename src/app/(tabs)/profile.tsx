import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, LAYOUT, RADIUS, TYPOGRAPHY } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();

  const handlePrivacyNotice = () => {
    Alert.alert(
      'Política de Privacidade (LGPD)',
      'Seus dados de navegação são totalmente anônimos. Apenas coletamos dados de contato ao resgatar um cupom ou ao cadastrar um espaço.',
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[TYPOGRAPHY.screenTitle, styles.headerTitle]}>Perfil</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.userCard}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={22} color={COLORS.textSecondary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={TYPOGRAPHY.venueName} numberOfLines={1}>
              Navegação Anônima
            </Text>
            <Text style={TYPOGRAPHY.bodyMetadata} numberOfLines={1}>
              Seus dados estão protegidos
            </Text>
          </View>
          <TouchableOpacity style={styles.btnLogin} activeOpacity={0.8}>
            <Text style={styles.btnLoginText}>Entrar / Cadastrar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>MINHAS ATIVIDADES</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={20} color={COLORS.accent} />
            <Text style={styles.menuText}>Meus Favoritos</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/rewards')}
          >
            <Ionicons name="ticket-outline" size={20} color={COLORS.accent} />
            <Text style={styles.menuText}>Meus Cupons & Listas VIP</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>PRIVACIDADE</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={handlePrivacyNotice}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.positive} />
            <Text style={styles.menuText}>Política de Privacidade (LGPD)</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>COMUNIDADE</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/business/advertise?origem=perfil')}
          >
            <Ionicons name="megaphone-outline" size={20} color={COLORS.sponsor} />
            <Text style={[styles.menuText, { color: COLORS.sponsor, fontWeight: 'bold' }]}>
              Anuncie seu espaço
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.sponsor} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.menuText}>Indicar um Local ou Festa</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="people-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.menuText}>Indique um Amigo</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>SUPORTE</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.menuText}>Obtenha ajuda</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerVersion}>Dicas LGBT v1.1.0 • Privacy First</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
  headerTitle: { paddingHorizontal: 20, marginBottom: 16 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(182, 166, 190, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { flex: 1, marginRight: 4 },
  btnLogin: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  btnLoginText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  sectionTitle: { ...TYPOGRAPHY.captionTag, color: COLORS.textSecondary, marginBottom: 8, marginTop: 14, fontWeight: 'bold' },
  groupCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.card, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    minHeight: LAYOUT.minTouchTarget,
  },
  menuText: { flex: 1, ...TYPOGRAPHY.bodyMetadata, color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: 'rgba(182, 166, 190, 0.08)', marginLeft: 48 },
  footerVersion: { textAlign: 'center', ...TYPOGRAPHY.captionTag, color: COLORS.textSecondary, marginTop: 28 },
});