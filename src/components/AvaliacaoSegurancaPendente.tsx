// Selo "Lugar seguro" (migração 136): depois de uma visita (2h depois, até 3 dias), 3 perguntas rápidas.
// Aparece na Home e na Conta. "Agora não" pula esta visita.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { avaliacaoPendente, AvaliacaoPendente, avaliarSeguranca } from '../lib/seguranca';

const PERGUNTAS = [
  { k: 'acolhimento', p: 'Você se sentiu acolhida(o)?' },
  { k: 'saida', p: 'A saída e o entorno pareceram seguros?' },
  { k: 'equipe', p: 'A equipe foi respeitosa?' },
] as const;
type Notas = { acolhimento: number; saida: number; equipe: number };

export default function AvaliacaoSegurancaPendente({ margem = 0 }: { margem?: number }) {
  const { user } = useAuth();
  const [p, setP] = useState<AvaliacaoPendente | null>(null);
  const [notas, setNotas] = useState<Partial<Notas>>({});
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [obrigado, setObrigado] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user) { setP(null); return; }
    let vivo = true;
    avaliacaoPendente().then((x) => { if (vivo) setP(x); });
    return () => { vivo = false; };
  }, [user?.id]));

  const enviar = async (pular: boolean) => {
    if (!p) return;
    setEnviando(true);
    try {
      await avaliarSeguranca(p, pular ? null : (notas as Notas), pular ? '' : comentario);
      if (pular) setP(null); else setObrigado(true);
    } catch (e: any) { Alert.alert('Não deu', e?.message || 'Tente de novo.'); } finally { setEnviando(false); }
  };

  if (obrigado) {
    return (
      <View style={[s.card, { marginHorizontal: margem, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
        <Feather name="heart" size={18} color="#34D399" />
        <Text style={[s.sub, { flex: 1, marginTop: 0 }]}>Obrigada(o)! Sua resposta ajuda outras pessoas a escolher lugares seguros.</Text>
      </View>
    );
  }
  if (!p) return null;
  const completo = PERGUNTAS.every((q) => notas[q.k]);
  return (
    <View style={[s.card, { marginHorizontal: margem }]}>
      <View style={s.topo}>
        <Feather name="shield" size={16} color="#34D399" />
        <Text style={s.tit}>Como foi no {p.casa}?</Text>
      </View>
      <Text style={s.sub}>3 toques, anônimo. As notas formam o selo Lugar seguro da casa.</Text>
      {PERGUNTAS.map((q) => (
        <View key={q.k} style={{ marginTop: 10 }}>
          <Text style={s.perg}>{q.p}</Text>
          <View style={s.escala}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = notas[q.k] === n;
              return (
                <TouchableOpacity key={n} style={[s.n, on && s.nOn]} onPress={() => setNotas({ ...notas, [q.k]: n })} accessibilityLabel={`${q.p} nota ${n}`} accessibilityState={{ selected: on }}>
                  <Text style={[s.nTxt, on && { color: '#0B0A10' }]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
      {completo && (
        <TextInput value={comentario} onChangeText={setComentario} placeholder="Quer contar algo? Só a equipe Dicas lê (opcional)" placeholderTextColor="#626274"
          style={s.input} maxLength={280} multiline />
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TouchableOpacity style={[s.btn, !completo && { opacity: 0.4 }]} disabled={!completo || enviando} onPress={() => enviar(false)} accessibilityRole="button">
          {enviando ? <ActivityIndicator color="#0B0A10" /> : <Text style={s.btnTxt}>Enviar</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.pular} onPress={() => enviar(true)} disabled={enviando}><Text style={s.pularTxt}>Agora não</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#34D39944', borderRadius: 16, padding: 14, marginTop: 16 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tit: { color: '#FFF', fontSize: 15, fontWeight: '800', flex: 1 },
  sub: { color: '#A0A0B2', fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  perg: { color: '#E9E7F3', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  escala: { flexDirection: 'row', gap: 6 },
  n: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#2A2840', borderRadius: 10, paddingVertical: 8 },
  nOn: { backgroundColor: '#34D399', borderColor: '#34D399' },
  nTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: '#2A2840', backgroundColor: '#0F0E16', borderRadius: 12, color: '#FFF', padding: 10, fontSize: 13, marginTop: 10, minHeight: 44 },
  btn: { flex: 1, alignItems: 'center', backgroundColor: '#34D399', borderRadius: 12, paddingVertical: 11 },
  btnTxt: { color: '#0B0A10', fontSize: 14, fontWeight: '800' },
  pular: { justifyContent: 'center', paddingHorizontal: 12 },
  pularTxt: { color: '#8E8BA3', fontSize: 13, fontWeight: '700' },
});
