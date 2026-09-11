import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { THEME } from '../constants/theme';
import { supabase } from '@/lib/supabase';

const WebBrowser = (() => {
  try {
    return require('expo-web-browser');
  } catch {
    return {
      maybeCompleteAuthSession: () => undefined,
      openAuthSessionAsync: async (url: string) => {
        await Linking.openURL(url);
        return { type: 'success', url };
      },
    };
  }
})();

const AuthSession = (() => {
  try {
    return require('expo-auth-session');
  } catch {
    return {
      makeRedirectUri: ({ path = 'auth/callback' }: { path?: string } = {}) => {
        const scheme = 'myapp';
        return `${scheme}://${path}`;
      },
    };
  }
})();

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [socialName, setSocialName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const redirectUri = AuthSession.makeRedirectUri({ path: 'auth/callback' });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (res.type === 'success') {
          const { url } = res;
          const params = new URLSearchParams(url.split('#')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            Alert.alert('Sucesso', 'Login com Google realizado!');
            router.back();
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Erro no Google Login', err.message || 'Ocorreu uma falha.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSignUp = async () => {
    if (!socialName || !phone || !birthDate || !email || !password) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            full_name: socialName,
            phone: phone,
            birth_date: birthDate,
          },
        ]);

        if (profileError) throw profileError;

        Alert.alert('Bem-vinde! 🏳️‍🌈', 'Sua conta foi criada com sucesso.');
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Erro ao cadastrar', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={THEME.textDim} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Entrar ou Cadastrar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Crie seu perfil seguro para salvar seus locais favoritos, eventos e resgatar cupons VIP exclusivos.
        </Text>

        <TouchableOpacity style={styles.btnGoogle} onPress={handleGoogleLogin} disabled={loading} activeOpacity={0.85}>
          <Feather name="mail" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.btnGoogleText}>Continuar com Google (Gmail)</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>ou crie sua conta na plataforma</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nome Social *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Como gostaria de ser chamade?" 
            placeholderTextColor={THEME.textFaint} 
            value={socialName} 
            onChangeText={setSocialName} 
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Data de Nascimento *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="AAAA-MM-DD" 
            placeholderTextColor={THEME.textFaint} 
            value={birthDate} 
            onChangeText={setBirthDate} 
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Telefone / WhatsApp *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="(11) 99999-9999" 
            placeholderTextColor={THEME.textFaint} 
            keyboardType="phone-pad" 
            value={phone} 
            onChangeText={setPhone} 
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>E-mail *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="seu@email.com" 
            placeholderTextColor={THEME.textFaint} 
            autoCapitalize="none" 
            keyboardType="email-address" 
            value={email} 
            onChangeText={setEmail} 
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Senha *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Mínimo 6 caracteres" 
            placeholderTextColor={THEME.textFaint} 
            secureTextEntry 
            value={password} 
            onChangeText={setPassword} 
          />
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleManualSignUp} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Finalizar Cadastro</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  topbar: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.surface, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: THEME.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  subtitle: { fontSize: 13, color: THEME.textDim, lineHeight: 18 },
  btnGoogle: { flexDirection: 'row', backgroundColor: '#4285F4', borderRadius: 12, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnGoogleText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: THEME.border },
  dividerText: { color: THEME.textFaint, fontSize: 12 },
  field: { gap: 6 },
  label: { fontSize: 12.5, fontWeight: '700', color: THEME.textDim },
  input: { backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 12, paddingHorizontal: 14, height: 46, color: THEME.text, fontSize: 14 },
  btnPrimary: { backgroundColor: THEME.pink, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' }
});