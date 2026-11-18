// Termômetro da noite (migração 136): "Estou aqui agora" sem benefício, conferido pela localização (até 300 m),
// com 3 toques opcionais (lotação, fila, clima). Também libera o "Me ajuda aqui" e a avaliação do selo Lugar seguro.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { estouAquiAgora, ROTULO } from '../lib/seguranca';

type Sinal = 'lotacao' | 'fila' | 'clima';
const GRUPOS: { k: Sinal; tit: string }[] = [{ k: 'lotacao', tit: 'Movimento' }, { k: 'fila', tit: 'Fila na porta' }, { k: 'clima', tit: 'Clima' }];

export default function EstouAquiAgora({ localId, nome, compacto, aoEnviar }: { localId: string; nome: string; compacto?: boolean; aoEnviar?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [sinais, setSinais] = useState<Partial<Record<Sinal, number>>>({});
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);

  const enviar = async () => {
    setEnviando(true);
    try {
      const r = await estouAquiAgora(localId, sinais);
      if (r.status === 'longe') {
        Alert.alert('Você parece longe', `Sua localização está a uns ${r.metros >= 1000 ? `${(r.metros / 1000).toFixed(1)} km` : `${r.metros} m`} do ${nome}. Tente de novo quando estiver lá.`);
      } else {
        setFeito(true); setAberto(false); aoEnviar?.();
      }
    } catch (e: any) {
      Alert.alert('Não deu', e?.message || 'Tente de novo.');
    } finally { setEnviando(false); }
  };

  if (!user) {
    return (
      <TouchableOpacity style={[s.botao, compacto && s.botaoCompacto]} onPress={() => router.push('/(tabs)/profile' as any)} accessibilityRole="button">
        <Feather name="map-pin" size={15} color="#FFF" /><Text style={s.botaoTxt}>Entre para dizer que está aqui</Text>
      </TouchableOpacity>
    );
  }
  if (feito) {
    return (
      <View style={s.feito}>
        <Feather name="check-circle" size={16} color="#34D399" />
        <Text style={s.feitoTxt}>Valeu! Você está no termômetro do {nome}.</Text>
        <TouchableOpacity onPress={() => router.push('/seguranca' as any)}><Text style={s.link}>Segurança</Text></TouchableOpacity>
      </View>
    );
  }
  return (
    <View>
      {!aberto ? (
        <TouchableOpacity style={[s.botao, compacto && s.botaoCompacto]} onPress={() => setAberto(true)} accessibilityRole="button">
          <Feather name="map-pin" size={15} color="#FFF" /><Text style={s.botaoTxt}>Estou aqui agora</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.painel}>
          <Text style={s.painelTit}>Como está o {nome} agora? <Text style={s.opcional}>(opcional)</Text></Text>
          {GRUPOS.map((g) => (
            <View key={g.k} style={{ marginTop: 8 }}>
              <Text style={s.grupoTit}>{g.tit}</Text>
              <View style={s.chips}>
                {[1, 2, 3].map((n) => {
                  const on = sinais[g.k] === n;
                  return (
                    <TouchableOpacity key={n} style={[s.chip, on && s.chipOn]} onPress={() => setSinais({ ...sinais, [g.k]: on ? undefined : n })} accessibilityState={{ selected: on }}>
                      <Text style={[s.chipTxt, on && { color: '#0B0A10' }]}>{ROTULO[g.k][n]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={[s.botao, { flex: 1, marginTop: 0 }]} onPress={enviar} disabled={enviando} accessibilityRole="button">
              {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={s.botaoTxt}>Confirmar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelar} onPress={() => setAberto(false)}><Text style={s.cancelarTxt}>Voltar</Text></TouchableOpacity>
          </View>
          <Text style={s.nota}>Usamos sua localização só agora, para confirmar que você está na casa. Ninguém vê quem está lá, só o movimento.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 12, marginTop: 10 },
  botaoCompacto: { paddingVertical: 9 },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  painel: { backgroundColor: '#0F0E16', borderWidth: 1, borderColor: '#2A2840', borderRadius: 14, padding: 12, marginTop: 10 },
  painelTit: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  opcional: { color: '#8E8BA3', fontWeight: '600' },
  grupoTit: { color: '#A0A0B2', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#2A2840', borderRadius: 999, paddingVertical: 7 },
  chipOn: { backgroundColor: '#C4B5FD', borderColor: '#C4B5FD' },
  chipTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  cancelar: { justifyContent: 'center', paddingHorizontal: 14 },
  cancelarTxt: { color: '#A0A0B2', fontSize: 14, fontWeight: '700' },
  nota: { color: '#626274', fontSize: 11.5, lineHeight: 16, marginTop: 10 },
  feito: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: '#34D39918', borderRadius: 12, padding: 10 },
  feitoTxt: { color: '#D1FAE5', fontSize: 13, flex: 1, fontWeight: '600' },
  link: { color: '#C4B5FD', fontSize: 13, fontWeight: '800' },
});
