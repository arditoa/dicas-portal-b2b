// Liga/desliga com uma linha explicando o que muda para o público.
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO } from '../TelaParceiro';

export function Interruptor({ titulo, explicacao, valor, aoMudar, desabilitado }: {
  titulo: string; explicacao?: string; valor: boolean; aoMudar: (v: boolean) => void; desabilitado?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[i.caixa, desabilitado && { opacity: 0.5 }]}
      activeOpacity={0.85}
      onPress={() => !desabilitado && aoMudar(!valor)}
      accessibilityRole="switch"
      accessibilityState={{ checked: valor, disabled: desabilitado }}
      accessibilityLabel={titulo}
    >
      <View style={{ flex: 1 }}>
        <Text style={i.titulo}>{titulo}</Text>
        {!!explicacao && <Text style={i.expl}>{explicacao}</Text>}
      </View>
      <Switch value={valor} onValueChange={aoMudar} disabled={desabilitado} trackColor={{ true: CP.rosa }} />
    </TouchableOpacity>
  );
}

const i = StyleSheet.create({
  caixa: {
    flexDirection: 'row', alignItems: 'center', gap: ESP.m, marginTop: ESP.m, backgroundColor: CP.card,
    borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, padding: ESP.m, minHeight: 56,
  },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '700' },
  expl: { color: CP.dim, fontSize: 12, lineHeight: 16, marginTop: 2 },
});
