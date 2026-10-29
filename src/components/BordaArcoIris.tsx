import React, { ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Borda de arco-íris (Membros Fundadores). React Native não tem borda em degradê: o componente pinta um
// degradê de 6 cores atrás do conteúdo e deixa só a espessura da borda aparecer. O conteúdo precisa ter
// fundo sólido próprio e cantos arredondados com raio = raio - espessura.
const CORES = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#24408E', '#732982'];

export default function BordaArcoIris({
  children,
  raio = 18,
  espessura = 2,
  style,
}: {
  children: ReactNode;
  raio?: number;
  espessura?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const aoMedir = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setTam((a) => (Math.abs(a.w - width) < 0.5 && Math.abs(a.h - height) < 0.5 ? a : { w: width, h: height }));
  };
  return (
    <View style={[{ borderRadius: raio, padding: espessura, overflow: 'hidden' }, style]} onLayout={aoMedir}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        {tam.w > 0 && tam.h > 0 && (
          <Svg width={tam.w} height={tam.h} viewBox={`0 0 ${tam.w} ${tam.h}`}>
            <Defs>
              <LinearGradient id="arcoiris" x1="0" y1="0" x2={String(tam.w)} y2={String(tam.h)} gradientUnits="userSpaceOnUse">
                {CORES.map((c, i) => (
                  <Stop key={c} offset={String(i / (CORES.length - 1))} stopColor={c} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={tam.w} height={tam.h} fill="url(#arcoiris)" />
          </Svg>
        )}
      </View>
      {children}
    </View>
  );
}
