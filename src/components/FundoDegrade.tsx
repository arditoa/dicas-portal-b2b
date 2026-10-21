import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Fundo da tela: preto que desce para um roxo bem escuro (cores da marca),
// sem imagem e sem biblioteca nova. Fica atrás do conteúdo e não recebe toques.
export default function FundoDegrade() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="fundoDegrade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0B0B0E" />
          <Stop offset="0.45" stopColor="#0E0B14" />
          <Stop offset="1" stopColor="#1A0D24" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#fundoDegrade)" />
    </Svg>
  );
}
