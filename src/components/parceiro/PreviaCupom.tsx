// Prévia do cupom como o cliente vê na página da casa.
// ESPELHO do cartão "Cupom disponível" em src/app/business/[id].tsx (cupomCard, cupomTitulo, cupomDescricao,
// "Vale: …" em amarelo e o botão roxo de check-in). Se mudar lá, mude aqui.
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { dentroDaJanela, textoJanela } from '../../lib/janelaCupom';

export function PreviaCupom({ titulo, descricao, dias, horaInicio, horaFim }: {
  titulo: string; descricao: string; dias: number[]; horaInicio: string | null; horaFim: string | null;
}) {
  const janela = textoJanela(dias, horaInicio, horaFim);
  const vale = dentroDaJanela(dias, horaInicio, horaFim);
  return (
    <View style={s.cupomCard}>
      <View style={s.cupomHeaderRow}>
        <Feather name="tag" size={14} color="#FFD54F" />
        <Text style={s.cupomHeaderText}>Cupom disponível</Text>
      </View>
      <Text style={s.cupomTitulo}>{titulo.trim() || 'O que o cliente ganha'}</Text>
      {!!descricao.trim() && <Text style={s.cupomDescricao}>{descricao.trim()}</Text>}
      {!!janela && <Text style={[s.cupomDescricao, { color: '#FFD54F', fontWeight: '700' }]}>Vale: {janela}</Text>}
      <View style={[s.actionBtn, s.cupomBtn, !vale && { opacity: 0.5 }]}>
        <Feather name="check-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={s.actionBtnText}>{vale ? 'Fazer check-in pra resgatar' : 'Fora do dia/horário deste cupom'}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cupomCard: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#FFD54F30', borderRadius: 18, padding: 16 },
  cupomHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cupomHeaderText: { fontSize: 11, fontWeight: '800', color: '#FFD54F', textTransform: 'uppercase', letterSpacing: 0.5 },
  cupomTitulo: { fontSize: 14, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  cupomDescricao: { fontSize: 12, color: '#A0A0B2', lineHeight: 17, marginBottom: 10 },
  actionBtn: { flexDirection: 'row', height: 48, backgroundColor: '#E1306C', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cupomBtn: { backgroundColor: '#7E57C2' },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
