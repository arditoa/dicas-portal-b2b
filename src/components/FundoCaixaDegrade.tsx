import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

// Degradê diagonal para as caixas da Home. Mede a própria caixa (onLayout) e
// desenha o SVG com tamanho em pixels: em % ele ficava preso ao tamanho inicial
// no iPhone e deixava uma faixa sem cor. Fica atrás do conteúdo, sem toques.
// `id` precisa ser único por caixa.
// `ondas` (design nov/2026, menu da Home): textura ondulada clara por cima do degradê.
function caminhoOnda(w: number, h: number, base: number, amp: number, fase: number): string {
  const y = h * base;
  const seg = w / 2;
  let d = `M0 ${y.toFixed(1)}`;
  for (let i = 0; i < 2; i++) {
    const x0 = i * seg;
    const sinal = (i + fase) % 2 === 0 ? -1 : 1;
    d += ` C${(x0 + seg * 0.35).toFixed(1)} ${(y + sinal * amp).toFixed(1)} ${(x0 + seg * 0.65).toFixed(1)} ${(y + sinal * amp).toFixed(1)} ${(x0 + seg).toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L${w.toFixed(1)} ${h.toFixed(1)} L0 ${h.toFixed(1)} Z`;
}

export default function FundoCaixaDegrade({ id, cores, ondas = false }: { id: string; cores: [string, string]; ondas?: boolean }) {
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
          {ondas && (
            <>
              <Path d={caminhoOnda(tam.w, tam.h, 0.58, tam.h * 0.12, 0)} fill="#FFFFFF" fillOpacity={0.08} />
              <Path d={caminhoOnda(tam.w, tam.h, 0.74, tam.h * 0.1, 1)} fill="#FFFFFF" fillOpacity={0.07} />
              <Path d={caminhoOnda(tam.w, tam.h, 0.9, tam.h * 0.07, 0)} fill="#000000" fillOpacity={0.08} />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}
