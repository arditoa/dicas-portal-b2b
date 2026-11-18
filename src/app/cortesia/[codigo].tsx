// Migração 132 — cortesia: a casa manda o link; a pessoa abre e guarda o ingresso na própria conta.
// Link: dicaslgbt://cortesia/<código> (ou a página do portal /cortesia/<código>, que abre o app).
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TopoApp from '../../components/TopoApp';
import { useAuth } from '../../lib/authContext';
import { resgatarCortesia } from '../../lib/ingressos';

export default function GuardarCortesia() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [estado, setEstado] = useState<'pronto' | 'salvando' | 'ok' | string>('pronto');
  const [festa, setFesta] = useState<string>('');

  const guardar = async () => {
    setEstado('salvando');
    try {
      const r = await resgatarCortesia(String(codigo || ''));
      setFesta(r.festa);
      setEstado('ok');
    } catch (e: any) {
      setEstado(e?.message || 'Não deu agora.');
    }
  };

  return (
    <View style={s.tela}>
      <TopoApp voltar />
      <View style={s.caixa}>
        <View style={s.icone}><Feather name="gift" size={26} color="#E1306C" /></View>
        {estado === 'ok' ? (
          <>
            <Text style={s.tit}>Cortesia guardada! 🎉</Text>
            <Text style={s.txt}>Seu ingresso para {festa || 'a festa'} está em Meus ingressos. Mostre o QR na porta.</Text>
            <TouchableOpacity style={s.botao} onPress={() => router.replace('/ingressos' as any)} accessibilityRole="button"><Text style={s.botaoTxt}>Ver meu ingresso</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.tit}>Você ganhou uma cortesia</Text>
            <Text style={s.txt}>{user ? 'Toque abaixo para guardar o ingresso na sua conta.' : 'Entre na sua conta (ou crie uma, é rapidinho) para guardar o ingresso.'}</Text>
            {estado !== 'pronto' && estado !== 'salvando' && <Text style={s.erro}>{estado}</Text>}
            {user ? (
              <TouchableOpacity style={s.botao} onPress={() => void guardar()} disabled={estado === 'salvando'} accessibilityRole="button">
                {estado === 'salvando' ? <ActivityIndicator color="#FFF" /> : <Text style={s.botaoTxt}>Guardar meu ingresso</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.botao} onPress={() => router.push('/(tabs)/profile' as any)} accessibilityRole="button"><Text style={s.botaoTxt}>Entrar</Text></TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0A10' },
  caixa: { margin: 20, padding: 20, borderRadius: 20, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', alignItems: 'center', gap: 12 },
  icone: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#E1306C22', alignItems: 'center', justifyContent: 'center' },
  tit: { color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  txt: { color: '#A0A0B2', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  erro: { color: '#FF7A7A', fontSize: 13, textAlign: 'center' },
  botao: { alignSelf: 'stretch', backgroundColor: '#E1306C', borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  botaoTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
