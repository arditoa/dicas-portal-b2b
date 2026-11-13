// Selo de Membro Fundador (design nov/2026): identifica o fundador nas listas, junto com o contorno de arco-íris.
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export default function SeloFundador({ texto = 'MEMBRO FUNDADOR' }: { texto?: string }) {
  return (
    <View style={s.selo} accessibilityLabel="Membro Fundador">
      <Feather name="star" size={9} color="#1A1405" />
      <Text style={s.txt} numberOfLines={1}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  selo: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD54F', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  txt: { fontSize: 9, fontWeight: '900', color: '#1A1405', letterSpacing: 0.5 },
});
