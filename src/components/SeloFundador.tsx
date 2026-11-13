// Selo de Membro Fundador (design nov/2026): o selo redondo oficial (arte da marca) colado no canto da foto
// do fundador. Substitui o contorno neon/arco-íris em volta dos cartões.
// Uso: envolva a foto com <ComSeloFundador ativo={ehFundador}> — o selo fica no canto de baixo à direita,
// um pouco para fora da foto, como um adesivo. <SeloFundador /> sozinho desenha só o selo.
import { ReactNode } from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';

const SELO = require('../assets/images/selo-membro-fundador.png');

export default function SeloFundador({ tamanho = 26, style }: { tamanho?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 }, style]}
      accessible
      accessibilityLabel="Membro Fundador"
    >
      <Image source={SELO} style={{ width: tamanho, height: tamanho }} resizeMode="contain" />
    </View>
  );
}

// Foto + selo no canto. "canto" escolhe o lado; "sobra" é quanto o selo passa da borda da foto.
export function ComSeloFundador({
  ativo,
  children,
  tamanho = 26,
  canto = 'baixoDireita',
  sobra = 6,
}: {
  ativo: boolean;
  children: ReactNode;
  tamanho?: number;
  canto?: 'baixoDireita' | 'cimaDireita' | 'cimaEsquerda';
  sobra?: number;
}) {
  if (!ativo) return <>{children}</>;
  const pos: ViewStyle =
    canto === 'cimaEsquerda' ? { top: -sobra, left: -sobra } : canto === 'cimaDireita' ? { top: -sobra, right: -sobra } : { bottom: -sobra, right: -sobra };
  return (
    <View style={{ position: 'relative' }}>
      {children}
      <SeloFundador tamanho={tamanho} style={{ position: 'absolute', zIndex: 2, ...pos }} />
    </View>
  );
}
