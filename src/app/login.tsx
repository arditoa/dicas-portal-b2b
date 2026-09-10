import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Por favor, informe seu e-mail e senha.');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      // Registrar Novo Usuário
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Alert.alert('Erro ao cadastrar', error.message);
      } else {
        Alert.alert(
          'Conta Criada!',
          'Seu cadastro foi realizado com sucesso. Verifique seu e-mail se a confirmação estiver ativada.'
        );
        router.back();
      }
    } else {
      // Fazer Login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Falha no Login', 'E-mail ou senha incorretos.');
      } else {
        router.back();
      }
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header com botão de voltar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Image
            source={require('@/assets/images/logolinear-semfundo.png')}
            style={styles.logoLinear}
            resizeMode="contain"
          />

          <Text style={styles.title}>
            {isSignUp ? 'Criar sua Conta' : 'Acesse o Dicas LGBT+'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Guarde seus locais favoritos e acesse os cupons VIPs.'
              : 'Entre para aproveitar o melhor do app com segurança.'}
          </Text>

          {/* Form Inputs */}
          <View style={styles.form}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#606070"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#606070"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>
                {loading ? 'Aguarde...' : isSignUp ? 'Criar Conta' : 'Entrar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Alternar entre Login e Cadastro */}
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Já tem uma conta? Faça Login'
                : 'Não tem conta? Cadastre-se grátis'}
            </Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#232230' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  logoLinear: { width: 160, height: 40, alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#A0A0B2', textAlign: 'center', marginTop: 6, marginBottom: 28, lineHeight: 18 },
  form: { gap: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#A0A0B2' },
  input: { backgroundColor: '#161520', borderRadius: 12, borderWidth: 1, borderColor: '#232230', paddingHorizontal: 14, height: 48, color: '#FFF', fontSize: 14 },
  actionBtn: { backgroundColor: '#E1306C', height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  switchBtn: { marginTop: 24, padding: 8, alignItems: 'center' },
  switchText: { color: '#7E57C2', fontSize: 13, fontWeight: '600' },
});