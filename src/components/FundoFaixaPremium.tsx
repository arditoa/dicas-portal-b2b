import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Fundo da faixa de locais premium: degradê na horizontal do violeta escuro
// para um vinho quente (cores da marca, sem competir com os cards claros da
// Home) e esmaecendo para o fundo da tela em cima e embaixo, para a faixa
// parecer uma vitrine separada sem criar linhas duras. Sem imagem e sem
// biblioteca nova; não recebe toques.
export default function FundoFaixaPremium() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="faixaH" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#2A1347" />
          <Stop offset="0.55" stopColor="#40175A" />
          <Stop offset="1" stopColor="#5B1A45" />
        </LinearGradient>
        <LinearGradient id="faixaV" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0E0B14" stopOpacity="1" />
          <Stop offset="0.28" stopColor="#0E0B14" stopOpacity="0" />
          <Stop offset="0.72" stopColor="#0E0B14" stopOpacity="0" />
          <Stop offset="1" stopColor="#0E0B14" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#faixaH)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#faixaV)" />
    </Svg>
  );
}
