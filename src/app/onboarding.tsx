import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleStart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.replace('/(tabs)');
    } else {
      router.push('/register');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.rainbowEmoji}>🌈</Text>
        <Text style={styles.title}>Dicas LGBT</Text>
        <Text style={styles.subtitle}>
          Seu guia de rolês, compras e profissionais da comunidade
        </Text>

        <View style={styles.cardGroup}>
          <View style={styles.infoCard}>
            <Text style={styles.cardEmoji}>🛡️</Text>
            <Text style={styles.cardText}>
              <Text style={styles.bold}>Selo Safe Space</Text> com critérios reais de verificação.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardEmoji}>🗺️</Text>
            <Text style={styles.cardText}>
              <Text style={styles.bold}>Mapa interativo</Text> com o que rola perto de você.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardEmoji}>🎉</Text>
            <Text style={styles.cardText}>
              <Text style={styles.bold}>Promoções exclusivas</Text> e check-in com pontos.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnWrapper} onPress={handleStart} activeOpacity={0.8}>
          <LinearGradient colors={['#FF2D78', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
            <Text style={styles.buttonText}>Começar a explorar</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1335' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  rainbowEmoji: { fontSize: 50, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#D1D5DB', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  cardGroup: { width: '100%', gap: 12, marginBottom: 40 },
  infoCard: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: 16, alignItems: 'center', gap: 12 },
  cardEmoji: { fontSize: 20 },
  cardText: { flex: 1, fontSize: 13, color: '#E5E7EB', lineHeight: 18 },
  bold: { fontWeight: '700', color: '#FFFFFF' },
  btnWrapper: { width: '100%' },
  button: { height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
