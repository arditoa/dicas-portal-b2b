// Selo "Lugar seguro" (migração 136): dado por quem esteve na casa (acolhimento, saída, equipe), não pela casa.
// Selo: 10+ respostas em 12 meses, média 4,3+ e nenhuma nota abaixo de 4,0. As médias aparecem com 5+ respostas.
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Selo, seloDaCasa } from '../lib/seguranca';

export function SeloPequeno() {
  return (
    <View style={s.mini} accessibilityLabel="Lugar seguro">
      <Feather name="shield" size={11} color="#34D399" /><Text style={s.miniTxt}>Lugar seguro</Text>
    </View>
  );
}

export default function SeloLugarSeguro({ localId }: { localId: string }) {
  const [selo, setSelo] = useState<Selo | null>(null);
  useEffect(() => { let vivo = true; seloDaCasa(localId).then((x) => { if (vivo) setSelo(x); }); return () => { vivo = false; }; }, [localId]);
  if (!selo || selo.respostas < 5) return null;
  return (
    <View style={[s.card, selo.tem_selo && { borderColor: '#34D39966' }]}>
      <View style={s.topo}>
        <Feather name="shield" size={18} color={selo.tem_selo ? '#34D399' : '#A0A0B2'} />
        <Text style={s.tit}>{selo.tem_selo ? 'Lugar seguro' : 'Segurança segundo quem foi'}</Text>
        <Text style={s.media}>{selo.media?.toFixed(1)}</Text>
      </View>
      <Text style={s.sub}>{selo.respostas} avaliações de quem esteve aqui nos últimos 12 meses.</Text>
      <View style={s.notas}>
        {([['Acolhimento', selo.acolhimento], ['Segurança na saída', selo.saida], ['Respeito da equipe', selo.equipe]] as const).map(([r, v]) => (
          <View key={r} style={s.nota}><Text style={s.notaV}>{v?.toFixed(1) ?? '–'}</Text><Text style={s.notaR}>{r}</Text></View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  mini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#34D3991F', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  miniTxt: { color: '#34D399', fontSize: 11, fontWeight: '800' },
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 16, padding: 14, marginTop: 14 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tit: { color: '#FFF', fontSize: 15, fontWeight: '800', flex: 1 },
  media: { color: '#34D399', fontSize: 18, fontWeight: '900' },
  sub: { color: '#A0A0B2', fontSize: 12.5, marginTop: 4 },
  notas: { flexDirection: 'row', gap: 8, marginTop: 10 },
  nota: { flex: 1, backgroundColor: '#0F0E16', borderRadius: 12, padding: 10 },
  notaV: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  notaR: { color: '#8E8BA3', fontSize: 11, marginTop: 2 },
});
