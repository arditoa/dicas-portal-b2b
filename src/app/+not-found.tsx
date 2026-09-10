import { Feather } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME } from '../constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página Não Encontrada', headerShown: false }} />
      <View style={styles.container}>
        <Feather name="alert-circle" size={48} color={THEME.pinkSoft} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Esta tela não existe.</Text>
        <Text style={styles.subtitle}>O link que você seguiu pode estar quebrado ou a tela foi movida.</Text>

        <Link href="/(tabs)/" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Voltar para o Início</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.textDim,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: THEME.pink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});