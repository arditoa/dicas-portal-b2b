// Prévia do cartão fidelidade como o cliente vê na página da casa (cartão aberto).
// ESPELHO de fidCard / fidRegra / fidBolinhas / fidBarra / fidVip em src/app/business/[id].tsx. Se mudar lá, mude aqui.
// Mostra o cartão com 2 visitas feitas, só para dar a ideia do progresso.
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export function PreviaFidelidade({ nome, visitas, recompensa, descricao, noMes, vipVisitas, vipBeneficio }: {
  nome: string; visitas: number; recompensa: string; descricao: string; noMes: boolean; vipVisitas: number | null; vipBeneficio: string;
}) {
  const n = Math.max(1, visitas || 1);
  const v = Math.min(2, n);
  return (
    <View style={s.fidCard}>
      <View style={s.cupomHeaderRow}>
        <Feather name="gift" size={14} color="#FFD54F" />
        <Text style={s.cupomHeaderText}>{nome.trim() || 'Cartão fidelidade'}</Text>
      </View>
      <Text style={s.fidRegra}>
        A cada {n} visita{n === 1 ? '' : 's'}{noMes ? ' no mês' : ''}, ganhe: <Text style={{ color: '#FFD54F' }}>{recompensa.trim() || '…'}</Text>
      </Text>
      {!!descricao.trim() && <Text style={s.cupomDescricao}>{descricao.trim()}</Text>}
      {n <= 12 ? (
        <View style={s.fidBolinhas}>
          {Array.from({ length: n }).map((_, i) => (
            <View key={i} style={[s.fidBolinha, i < v && s.fidBolinhaOn]}>{i < v && <Feather name="check" size={11} color="#0B0B0E" />}</View>
          ))}
        </View>
      ) : (
        <View style={s.fidBarra}><View style={[s.fidBarraOn, { width: `${Math.round((v / n) * 100)}%` }]} /></View>
      )}
      <Text style={s.fidProgresso}>{v} de {n} visitas{noMes ? ' neste mês' : ''}</Text>
      {!!vipVisitas && vipVisitas >= 2 && (
        <View style={s.fidVip}>
          <Feather name="award" size={14} color="#FFD54F" />
          <Text style={s.fidVipTexto}>Com {vipVisitas} visitas{noMes ? ' no mês' : ''} você vira VIP: {vipBeneficio.trim() || '…'}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fidCard: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#FFD54F30', borderRadius: 16, padding: 14 },
  cupomHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cupomHeaderText: { fontSize: 11, fontWeight: '800', color: '#FFD54F', textTransform: 'uppercase', letterSpacing: 0.5 },
  cupomDescricao: { fontSize: 12, color: '#A0A0B2', lineHeight: 17, marginTop: 4 },
  fidRegra: { fontSize: 14, fontWeight: '800', color: '#FFF', lineHeight: 19, marginBottom: 2 },
  fidBolinhas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 4 },
  fidBolinha: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#3A3950', alignItems: 'center', justifyContent: 'center' },
  fidBolinhaOn: { backgroundColor: '#FFD54F', borderColor: '#FFD54F' },
  fidBarra: { height: 8, borderRadius: 4, backgroundColor: '#232230', overflow: 'hidden', marginTop: 12, marginBottom: 4 },
  fidBarraOn: { height: 8, backgroundColor: '#FFD54F' },
  fidProgresso: { fontSize: 12, color: '#D0D0E0', marginTop: 6 },
  fidVip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,213,79,0.35)', backgroundColor: 'rgba(255,213,79,0.08)' },
  fidVipTexto: { flex: 1, color: '#FFD54F', fontSize: 12, fontWeight: '700' },
});
