import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { triggerImpact } from '../utils/haptics';

export default function RewardsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            triggerImpact('light');
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clube de Recompensas</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.rewardCard}>
          <Ionicons name="gift-outline" size={40} color="#F5C518" style={{ marginBottom: 10 }} />
          <Text style={styles.cardTitle}>Passe VIP Boas-Vindas</Text>
          <Text style={styles.cardDesc}>
            Complete 100% do seu perfil para desbloquear seu Welcome Drink e descontos em parceiros.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              triggerImpact('medium');
              router.push('/(tabs)/profile');
            }}
          >
            <Text style={styles.actionBtnText}>Completar Perfil Agora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0A14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#181524',
    borderBottomWidth: 1,
    borderBottomColor: '#262238',
  },
  backBtn: {
    backgroundColor: '#0C0A14',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262238',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 40 },
  rewardCard: {
    backgroundColor: '#181524',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5C518',
  },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  cardDesc: { color: '#8A889D', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  actionBtn: {
    backgroundColor: '#FF2D78',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
});