// Texto pintado em degradê (design nov/2026: botões brancos com o texto nas cores do logo — magenta, roxo e azul).
// React Native não pinta texto em degradê: um <Text> transparente mede o espaço (e fica para o leitor de tela)
// e um <Text> do SVG, por cima, desenha as letras com o degradê.
import { useId, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

// Cores do logo Dicas LGBT+ (magenta, roxo, azul).
export const CORES_MARCA = ['#E0197D', '#8B2FE0', '#2F6BFF'];

type Peso = '600' | '700' | '800' | '900';

export default function TextoDegrade({
  children,
  tamanho = 12,
  peso = '800',
  espacamento = 0.6,
  cores = CORES_MARCA,
}: {
  children: string;
  tamanho?: number;
  peso?: Peso;
  espacamento?: number;
  cores?: string[];
}) {
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const id = `txd${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View>
      <Text
        style={{ fontSize: tamanho, fontWeight: peso, letterSpacing: espacamento, color: 'transparent' }}
        numberOfLines={1}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setTam((a) => (Math.abs(a.w - width) < 0.5 && Math.abs(a.h - height) < 0.5 ? a : { w: width, h: height }));
        }}
      >
        {children}
      </Text>
      {tam.w > 0 && (
        <Svg style={StyleSheet.absoluteFill} width={tam.w} height={tam.h} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2={String(tam.w)} y2="0" gradientUnits="userSpaceOnUse">
              {cores.map((c, i) => (
                <Stop key={`${c}-${i}`} offset={String(cores.length === 1 ? 0 : i / (cores.length - 1))} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <SvgText
            x={tam.w / 2}
            y={tam.h / 2 + tamanho * 0.36}
            textAnchor="middle"
            fontSize={tamanho}
            fontWeight={peso}
            letterSpacing={espacamento}
            fill={`url(#${id})`}
          >
            {children}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
