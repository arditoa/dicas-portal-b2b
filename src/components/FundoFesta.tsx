// Fundo da festa no app cliente (Etapa 3): degradê com as cores que o parceiro escolheu (eventos.cor1/cor2)
// e, por cima, o desenho da textura (eventos.textura: glitter, neon, holográfico, papel, tijolo — migração 099).
// Fica atrás do conteúdo, sem toques. Mede a caixa como o FundoCaixaDegrade (SVG em pixels).
import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';
import FundoCaixaDegrade from './FundoCaixaDegrade';

export type TexturaFesta = 'glitter' | 'neon' | 'holografico' | 'papel' | 'tijolo';
const HEX = /^#[0-9A-Fa-f]{6}$/;
export const coresDaFesta = (c1?: string | null, c2?: string | null): [string, string] | null =>
  c1 && c2 && HEX.test(c1) && HEX.test(c2) ? [c1, c2] : null;

// Pontinhos fixos (sempre no mesmo lugar) para o glitter.
const BRILHOS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 37.3) % 100, y: (i * 61.7) % 100, r: 0.6 + ((i * 13) % 10) / 10 }));

function Textura({ id, tipo, w, h }: { id: string; tipo: TexturaFesta; w: number; h: number }) {
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <LinearGradient id={`${id}-holo`} x1="0" y1="0" x2={String(w)} y2={String(h)} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FF7AD9" stopOpacity="0.35" />
          <Stop offset="0.25" stopColor="#7AF0FF" stopOpacity="0.3" />
          <Stop offset="0.5" stopColor="#FFF27A" stopOpacity="0.3" />
          <Stop offset="0.75" stopColor="#9C7AFF" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#7AFFB0" stopOpacity="0.35" />
        </LinearGradient>
        <Pattern id={`${id}-tijolo`} patternUnits="userSpaceOnUse" width="40" height="20">
          <Line x1="0" y1="0" x2="40" y2="0" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1.5" />
          <Line x1="0" y1="10" x2="40" y2="10" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1.5" />
          <Line x1="10" y1="0" x2="10" y2="10" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1.5" />
          <Line x1="30" y1="10" x2="30" y2="20" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1.5" />
        </Pattern>
        <Pattern id={`${id}-papel`} patternUnits="userSpaceOnUse" width="6" height="6">
          <Line x1="0" y1="5" x2="6" y2="5" stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="1" />
          <Circle cx="2" cy="2" r="0.6" fill="#000000" fillOpacity="0.12" />
        </Pattern>
      </Defs>
      {tipo === 'glitter' && BRILHOS.map((b, i) => <Circle key={i} cx={(b.x / 100) * w} cy={(b.y / 100) * h} r={b.r} fill="#FFFFFF" fillOpacity={0.55} />)}
      {tipo === 'holografico' && <Rect x="0" y="0" width={w} height={h} fill={`url(#${id}-holo)`} />}
      {tipo === 'tijolo' && <Rect x="0" y="0" width={w} height={h} fill={`url(#${id}-tijolo)`} />}
      {tipo === 'papel' && <Rect x="0" y="0" width={w} height={h} fill={`url(#${id}-papel)`} />}
      {tipo === 'neon' && (
        <>
          <Rect x="3" y="3" width={w - 6} height={h - 6} rx="14" fill="none" stroke="#FF4FD8" strokeOpacity="0.35" strokeWidth="8" />
          <Rect x="5" y="5" width={w - 10} height={h - 10} rx="12" fill="none" stroke="#FF9BEA" strokeWidth="2" />
        </>
      )}
    </Svg>
  );
}

export default function FundoFesta({ id, cores, textura, opacidade = 1 }: {
  id: string; cores: [string, string] | null; textura?: string | null; opacidade?: number;
}) {
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const aoMedir = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setTam((a) => (Math.abs(a.w - width) < 0.5 && Math.abs(a.h - height) < 0.5 ? a : { w: width, h: height }));
  };
  const tipo = (['glitter', 'neon', 'holografico', 'papel', 'tijolo'] as const).find((t) => t === textura) || null;
  if (!cores && !tipo) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: opacidade }} pointerEvents="none" onLayout={aoMedir}>
      {cores && <FundoCaixaDegrade id={`${id}-cor`} cores={cores} />}
      {tipo && tam.w > 0 && tam.h > 0 && (
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <Textura id={id} tipo={tipo} w={tam.w} h={tam.h} />
        </View>
      )}
    </View>
  );
}
