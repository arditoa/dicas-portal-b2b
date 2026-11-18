// Atalho para o Modo equipe (app admin) no topo da Conta. Só aparece para a equipe Dicas (profiles.role = 'admin').
// O banco só reconhece admin com senha + código do app autenticador (migração 085). Por isso, ao tocar,
// se a sessão ainda não passou pelo código, o cartão pede os 6 dígitos (o mesmo autenticador do portal /admin).
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { confirmarCodigoAdmin, sessaoComCodigo, useContaAdmin } from '../lib/admin';
import { useAuth } from '../lib/authContext';

export default function CartaoEquipeDicas() {
  const router = useRouter();
  const { user } = useAuth();
  const eh = useContaAdmin(user?.id);
  const [pedindo, setPedindo] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (!eh) return null;

  const abrir = async () => {
    setErro(null);
    setOcupado(true);
    try {
      if (await sessaoComCodigo()) { router.push('/adm' as any); return; }
      setPedindo(true);
    } catch { setPedindo(true); } finally { setOcupado(false); }
  };
  const confirmar = async () => {
    setErro(null);
    setOcupado(true);
    try {
      await confirmarCodigoAdmin(codigo);
      setPedindo(false); setCodigo('');
      router.push('/adm' as any);
    } catch (e: any) { setErro(e?.message || 'Não deu. Tente de novo.'); } finally { setOcupado(false); }
  };

  return (
    <View style={s.card}>
      <TouchableOpacity style={s.linha} onPress={abrir} disabled={ocupado} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Abrir o Modo equipe">
        <View style={s.icone}><Feather name="shield" size={16} color="#FFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.tit}>Modo equipe Dicas</Text>
          <Text style={s.sub}>Banners, vitrine, aprovações e casas</Text>
        </View>
        {ocupado && !pedindo ? <ActivityIndicator color="#A0A0B2" /> : <Feather name={pedindo ? 'chevron-down' : 'chevron-right'} size={16} color="#A0A0B2" />}
      </TouchableOpacity>
      {pedindo && (
        <View style={s.codigoBox}>
          <Text style={s.sub}>Digite o código de 6 números do seu app autenticador (o mesmo do portal).</Text>
          <View style={s.codigoLinha}>
            <TextInput value={codigo} onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))} placeholder="000000" placeholderTextColor="#626274"
              keyboardType="number-pad" textContentType="oneTimeCode" autoFocus maxLength={6} style={s.input} onSubmitEditing={confirmar} />
            <TouchableOpacity style={[s.btn, (codigo.length < 6 || ocupado) && { opacity: 0.5 }]} onPress={confirmar} disabled={codigo.length < 6 || ocupado} accessibilityRole="button">
              {ocupado ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnTxt}>Entrar</Text>}
            </TouchableOpacity>
          </View>
          {!!erro && <Text style={s.erro}>{erro}</Text>}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  icone: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center' },
  tit: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  sub: { color: '#A0A0B2', fontSize: 10, marginTop: 1 },
  codigoBox: { borderTopWidth: 1, borderTopColor: '#232230', paddingHorizontal: 14, paddingVertical: 12 },
  codigoLinha: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#232230', backgroundColor: '#0F0E16', borderRadius: 12, color: '#FFF', fontSize: 18, letterSpacing: 6, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { backgroundColor: '#0F766E', borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  erro: { color: '#F87171', fontSize: 11, marginTop: 8 },
});
