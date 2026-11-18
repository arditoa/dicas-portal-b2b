// Nov/2026 (18/11) — cartão de destino da Dicas Trip (cidade ou evento especial), usado na grade de Roteiros
// e na faixa "Próximas viagens" da aba Trip. Evento especial ganha o selo de data (ex.: "FEV 2027").
import { Feather } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FundoCaixaDegrade from './FundoCaixaDegrade';
import { Destino, estaAberto } from '../lib/destinos';

const DEGRADES: [string, string][] = [
  ['#0E9F6E', '#0E7490'], ['#2563EB', '#7E57C2'], ['#F59E0B', '#E1306C'], ['#E1306C', '#7E57C2'], ['#6366F1', '#EC4899'], ['#0EA5E9', '#4338CA'],
];

export default function CartaoDestino({ d, idx, largura, altura = 92, emBreveTxt, onAbrir, onBreve }: {
  d: Destino; idx: number; largura: number | `${number}%`; altura?: number; emBreveTxt: string;
  onAbrir: () => void; onBreve: () => void;
}) {
  const aberto = estaAberto(d);
  return (
    <TouchableOpacity
      style={[s.tile, { width: largura, height: altura }]}
      activeOpacity={0.9}
      onPress={() => (aberto ? onAbrir() : onBreve())}
      accessibilityRole="button"
      accessibilityLabel={`${d.cidade}${d.uf ? `, ${d.uf}` : ''}${aberto ? '' : `, ${emBreveTxt}`}`}
    >
      <FundoCaixaDegrade id={`cd-${d.slug}`} cores={DEGRADES[idx % DEGRADES.length]} />
      {!!d.foto_url && <Image source={{ uri: d.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
      {!!d.foto_url && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,6,16,0.5)' }]} />}
      {d.evento && !!d.selo && <View style={s.selo}><Text style={s.seloTxt}>{d.selo}</Text></View>}
      <Feather name={d.evento ? 'star' : 'map-pin'} size={22} color="#FFFFFF" />
      <Text style={s.nome} numberOfLines={2}>{d.cidade}</Text>
      {!!d.uf && <Text style={s.uf}>{d.uf}</Text>}
      {!aberto && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,6,16,0.55)' }]} pointerEvents="none" />}
      {!aberto && <View style={s.breve}><Text style={s.breveTxt}>{emBreveTxt}</Text></View>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  tile: { borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6, backgroundColor: '#161520' },
  nome: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  uf: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.8)' },
  selo: { position: 'absolute', top: 6, left: 6, backgroundColor: '#E1306C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  seloTxt: { fontSize: 8, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  breve: { position: 'absolute', bottom: 6, backgroundColor: '#7E57C2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  breveTxt: { fontSize: 7, fontWeight: '800', color: '#FFF' },
});
