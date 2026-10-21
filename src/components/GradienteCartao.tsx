import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Esmaecido escuro na parte de baixo dos cartões de Em Alta: o nome fica legível
// sobre qualquer foto, sem a faixa chapada de antes. Não recebe toques.
export default function GradienteCartao() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="gradCartaoAlta" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.4" stopColor="#0B0B0E" stopOpacity="0" />
          <Stop offset="1" stopColor="#0B0B0E" stopOpacity="0.92" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#gradCartaoAlta)" />
    </Svg>
  );
}
