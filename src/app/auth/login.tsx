import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
};

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = () => {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Por favor, informe seu e-mail e senha.');
      return;
    }

    // SIMULAÇÃO DE LOGIN BEM-SUCEDIDO (SUBSTITUIR POR SUPABASE OU SEU BACKEND)
    login({
      nomeSocial: 'Alex Silva',
      email: email,
      telefone: '(11) 98765-4321',
      dataNascimento: '15/08/1995',
    });

    Alert.alert('Bem-vinde de volta!', 'Login realizado com sucesso.', [
      {
        text: 'OK',
        onPress: () => router.replace('/(tabs)/profile'),
      },
    ]);
  };

  // ENTRAR VIA APPLE (EXIGÊNCIA DA APPLE STORE)
  const handleAppleLogin = () => {
    login({
      nomeSocial: 'Usuário Apple',
      email: 'usuario.apple@privaterelay.appleid.com',
      telefone: '(11) 99999-9999',
      dataNascimento: '01/01/2000',
    });

    router.replace('/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        
        {/* BOTÃO VOLTAR */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Entrar na sua conta</Text>
        <Text style={styles.subtitle}>
          Acesse seus locais salvos, cupons e preferências.
        </Text>

        {/* CAMPO E-MAIL */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-mail</Text>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="seuemail@exemplo.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* CAMPO SENHA */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
          </View>
        </View>

        {/* BOTÃO ENTRAR */}
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
          <Text style={styles.loginBtnText}>Entrar</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OU</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* LOGIN COM APPLE */}
        <TouchableOpacity style={styles.appleBtn} onPress={handleAppleLogin} activeOpacity={0.85}>
          <Feather name="command" size={18} color="#FFF" />
          <Text style={styles.appleBtnText}>Continuar com a Apple</Text>
        </TouchableOpacity>

        {/* LINK PARA CRIAR CONTA */}
        <TouchableOpacity
          style={styles.registerLinkContainer}
          onPress={() => router.push('/auth/register')}
        >
          <Text style={styles.registerLinkText}>
            Ainda não tem conta? <Text style={styles.boldText}>Cadastre-se</Text>
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: 20 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 28 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  loginBtn: {
    height: 48,
    backgroundColor: COLORS.pink,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  loginBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },

  appleBtn: {
    height: 48,
    backgroundColor: '#000',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appleBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  registerLinkContainer: { marginTop: 24, alignItems: 'center' },
  registerLinkText: { fontSize: 13, color: COLORS.textSecondary },
  boldText: { color: COLORS.purple, fontWeight: '700' },
});