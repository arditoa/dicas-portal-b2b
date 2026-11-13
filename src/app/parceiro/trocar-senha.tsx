// Rodada 145 — troca obrigatória da senha provisória ("dica" + 4 últimos números do WhatsApp)
// antes de abrir o Modo parceiro. Grava senha_trocada = true, a mesma marca que o portal usa.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/authContext';
import { traduzErroAuth } from '../../lib/erroAuth';
import { useModoParceiro } from '../../lib/modoParceiro';
import { supabase } from '../../lib/supabase';

const C = { bg: '#0B0B0E', card: '#161520', borda: '#232230', texto: '#FFFFFF', dim: '#A0A0B2', fraco: '#626274', rosa: '#E1306C' };

export default function TrocarSenha() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { definirModo } = useModoParceiro();
  const [nova, setNova] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const digitosEmail = (user?.email || '').replace(/\D/g, '');
  const senhaAntiga = `dica${digitosEmail.slice(-4)}`;

  const salvar = async () => {
    if (nova.length < 6) return Alert.alert('Senha curta', 'Use pelo menos 6 caracteres.');
    if (nova !== repetir) return Alert.alert('As senhas não batem', 'Digite a mesma senha nos dois campos.');
    if (nova.toLowerCase() === senhaAntiga) return Alert.alert('Escolha outra', 'A nova senha precisa ser diferente da provisória.');
    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nova, data: { senha_trocada: true } });
      if (error) throw error;
      Alert.alert('Pronto!', 'Senha trocada. Use a nova senha no app e no portal.');
      router.replace('/parceiro');
    } catch (e: any) {
      Alert.alert('Não foi possível trocar', traduzErroAuth(e));
    } finally {
      setSalvando(false);
    }
  };

  const verComoCliente = () => {
    definirModo('cliente');
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.conteudo, { paddingTop: insets.top + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={s.icone}><Feather name="lock" size={26} color={C.rosa} /></View>
        <Text style={s.titulo}>Crie a sua senha</Text>
        <Text style={s.texto}>
          Você entrou com a senha provisória que a equipe Dicas enviou. Para proteger o seu negócio, crie agora uma
          senha só sua. Ela vale no app e no portal do parceiro.
        </Text>

        <Text style={s.label}>Nova senha</Text>
        <View style={s.campo}>
          <TextInput
            style={s.input} value={nova} onChangeText={setNova} secureTextEntry={!ver}
            placeholder="Pelo menos 6 caracteres" placeholderTextColor={C.fraco} autoCapitalize="none"
            textContentType="newPassword" autoComplete="password-new"
          />
          <TouchableOpacity onPress={() => setVer(!ver)} accessibilityLabel={ver ? 'Esconder senha' : 'Mostrar senha'}>
            <Feather name={ver ? 'eye-off' : 'eye'} size={18} color={C.dim} />
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Repita a nova senha</Text>
        <View style={s.campo}>
          <TextInput
            style={s.input} value={repetir} onChangeText={setRepetir} secureTextEntry={!ver}
            placeholder="Igual à de cima" placeholderTextColor={C.fraco} autoCapitalize="none"
            textContentType="newPassword"
          />
        </View>

        <TouchableOpacity style={[s.botao, salvando && { opacity: 0.6 }]} onPress={salvar} disabled={salvando}>
          {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={s.botaoTexto}>Salvar e continuar</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.link} onPress={verComoCliente}>
          <Text style={s.linkTexto}>Agora não, ver o app como cliente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.link} onPress={() => void signOut()}>
          <Text style={[s.linkTexto, { color: C.fraco }]}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  conteudo: { paddingHorizontal: 24, paddingBottom: 40 },
  icone: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#2A1420', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  titulo: { color: C.texto, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  texto: { color: C.dim, fontSize: 15, lineHeight: 22, marginBottom: 24 },
  label: { color: C.texto, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  campo: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderColor: C.borda, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, minHeight: 50, marginBottom: 16,
  },
  input: { flex: 1, color: C.texto, fontSize: 16 },
  botao: { backgroundColor: C.rosa, borderRadius: 12, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  botaoTexto: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 14 },
  linkTexto: { color: C.dim, fontSize: 14 },
});
