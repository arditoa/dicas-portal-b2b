// Moldura de prévia: "Assim o cliente vê", com o caminho de onde aparece no app (ex.: Eventos › Essa semana).
// Dentro vai o cartão desenhado igual ao do app cliente (ver src/components/parceiro/PreviaAgenda.tsx).
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CP, ESP, RAIO } from '../TelaParceiro';

export function Previa({ onde, children, vazio }: { onde: string; children?: React.ReactNode; vazio?: string }) {
  const temConteudo = React.Children.toArray(children).length > 0;
  return (
    <View style={p.caixa}>
      <View style={p.topo}>
        <Feather name="smartphone" size={13} color={CP.dim} />
        <Text style={p.topoTxt}>Assim o cliente vê · <Text style={{ color: CP.texto }}>{onde}</Text></Text>
      </View>
      <View style={p.tela}>
        {temConteudo ? children : <Text style={p.vazio}>{vazio || 'Nada para mostrar ainda.'}</Text>}
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  caixa: { borderRadius: RAIO.m, borderWidth: 1, borderColor: CP.borda, overflow: 'hidden' },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: ESP.m, paddingVertical: ESP.s, backgroundColor: CP.card },
  topoTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  tela: { backgroundColor: '#0B0B0E', padding: ESP.m },
  vazio: { color: CP.fraco, fontSize: 13, textAlign: 'center', paddingVertical: ESP.l },
});
