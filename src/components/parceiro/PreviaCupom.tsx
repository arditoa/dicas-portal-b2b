// Prévia do cupom "Na sua página": a linha de ticket da página da casa.
// ESPELHO do bloco de cupons de src/app/business/[id].tsx (cupomCard + ticket, ticketTitulo, ticketDesc, ticketJanela,
// botão "Usar" ou "Hoje não"). Se mudar lá, mude aqui. A faixa de Ofertas usa CartaoCupomVitrine.
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
        <Text style={s.cupomHeaderText}>Cupom da casa</Text>
      </View>
      <View style={s.ticket}>
        <View style={{ flex: 1 }}>
          <Text style={s.ticketTitulo} numberOfLines={2}>{titulo.trim() || 'O que o cliente ganha'}</Text>
          {!!descricao.trim() && <Text style={s.ticketDesc} numberOfLines={2}>{descricao.trim()}</Text>}
          <Text style={[s.ticketJanela, vale && { color: '#5BD69A' }]}>{vale ? 'Vale agora' : janela ? `Vale ${janela}` : 'Hoje não'}</Text>
        </View>
        {vale ? (
          <View style={s.ticketBtn}><Text style={s.ticketBtnTxt}>Usar</Text></View>
        ) : (
          <View style={s.ticketFora}><Text style={s.ticketForaTxt}>Hoje não</Text></View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cupomCard: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#FFD54F30', borderRadius: 18, padding: 16 },
  cupomHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cupomHeaderText: { fontSize: 11, fontWeight: '800', color: '#FFD54F', textTransform: 'uppercase', letterSpacing: 0.5 },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  ticketTitulo: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  ticketDesc: { fontSize: 12, color: '#A0A0B2', marginTop: 1, lineHeight: 16 },
  ticketJanela: { fontSize: 12, fontWeight: '700', color: '#FFD54F', marginTop: 3 },
  ticketBtn: { backgroundColor: '#7E57C2', borderRadius: 12, paddingHorizontal: 16, height: 38, justifyContent: 'center' },
  ticketBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  ticketFora: { borderRadius: 12, paddingHorizontal: 10, height: 30, justifyContent: 'center', backgroundColor: '#232230' },
  ticketForaTxt: { color: '#8A8AA0', fontSize: 11, fontWeight: '700' },
});
