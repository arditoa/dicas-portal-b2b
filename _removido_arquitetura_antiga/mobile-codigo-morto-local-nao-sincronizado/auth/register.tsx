import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
  safeSpace: '#4CAF7D',
};

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [nomeSocial, setNomeSocial] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [senha, setSenha] = useState('');
  const [aceitaLGPD, setAceitaLGPD] = useState(false);

  const handleRegister = () => {
    if (!nomeSocial || !email || !telefone || !dataNascimento || !senha) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha todos os campos do formulário.');
      return;
    }

    if (!aceitaLGPD) {
      Alert.alert(
        'Consentimento LGPD',
        'Você precisa aceitar os termos da LGPD e autorizar o uso dos dados para prosseguir.'
      );
      return;
    }

    // LÓGICA DE SALVAMENTO (Supabase / Context)
    Alert.alert('Cadastro Realizado!', `Seja bem-vinde, ${nomeSocial}!`, [
      { text: 'Continuar', onPress: () => router.replace('/(tabs)/profile') },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Criar sua Conta</Text>
        <Text style={styles.subtitle}>
          Junte-se à nossa comunidade com segurança e privacidade.
        </Text>

        {/* CAMPO: NOME SOCIAL */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Social *</Text>
          <View style={styles.inputContainer}>
            <Feather name="user" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Como prefere ser chamado(a/e)"
              placeholderTextColor={COLORS.textMuted}
              value={nomeSocial}
              onChangeText={setNomeSocial}
            />
          </View>
        </View>

        {/* CAMPO: E-MAIL */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-mail *</Text>
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

        {/* CAMPO: TELEFONE */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefone (WhatsApp) *</Text>
          <View style={styles.inputContainer}>
            <Feather name="phone" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="(11) 99999-9999"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={telefone}
              onChangeText={setTelefone}
            />
          </View>
        </View>

        {/* CAMPO: DATA DE NASCIMENTO */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Data de Nascimento *</Text>
          <View style={styles.inputContainer}>
            <Feather name="calendar" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={dataNascimento}
              onChangeText={setDataNascimento}
            />
          </View>
        </View>

        {/* CAMPO: SENHA */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha *</Text>
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

        {/* TERMOS LGPD E AUTORIZAÇÃO DE DADOS */}
        <TouchableOpacity
          style={styles.lgpdBox}
          activeOpacity={0.8}
          onPress={() => setAceitaLGPD(!aceitaLGPD)}
        >
          <View style={[styles.checkbox, aceitaLGPD && styles.checkboxActive]}>
            {aceitaLGPD && <Feather name="check" size={14} color="#FFF" />}
          </View>
          <Text style={styles.lgpdText}>
            Estou ciente e autorizo a coleta do meu <Text style={styles.bold}>Telefone</Text> e{' '}
            <Text style={styles.bold}>Data de Nascimento</Text> conforme a LGPD para
            personalização de experiências e segurança na comunidade.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>Concluir Cadastro</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24 },
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
    height: 46,
  },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  lgpdBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 16,
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: COLORS.purple },
  lgpdText: { flex: 1, fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  bold: { fontWeight: '700', color: COLORS.textPrimary },
  submitBtn: {
    height: 48,
    backgroundColor: COLORS.pink,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});