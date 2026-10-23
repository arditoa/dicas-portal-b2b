import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Degradê diagonal para as caixas da Home. Mede a própria caixa (onLayout) e
// desenha o SVG com tamanho em pixels: em % ele ficava preso ao tamanho inicial
// no iPhone e deixava uma faixa sem cor. Fica atrás do conteúdo, sem toques.
// `id` precisa ser único por caixa.
export default function FundoCaixaDegrade({ id, cores }: { id: string; cores: [string, string] }) {
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const aoMedir = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setTam((a) => (Math.abs(a.w - width) < 0.5 && Math.abs(a.h - height) < 0.5 ? a : { w: width, h: height }));
  };
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none" onLayout={aoMedir}>
      {tam.w > 0 && tam.h > 0 && (
        <Svg width={tam.w} height={tam.h} viewBox={`0 0 ${tam.w} ${tam.h}`}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2={String(tam.w)} y2={String(tam.h)} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={cores[0]} />
              <Stop offset="1" stopColor={cores[1]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={tam.w} height={tam.h} fill={`url(#${id})`} />
        </Svg>
      )}
    </View>
  );
}
