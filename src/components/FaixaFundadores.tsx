import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useReduzirMovimento } from '../hooks/useReduzirMovimento';

// Neon do logo "LGBT+": azul-ciano → violeta → rosa.
const CIANO = '#19B8FF';
const VIOLETA = '#9B3CFF';
const ROSA = '#FF3DA8';
const VELOCIDADE_PX_S = 26;
const RAIO = 22;

// "@usuario" a partir do que estiver cadastrado (com ou sem @, ou link do Instagram).
export function handleInstagram(v?: string | null): string | null {
  if (!v) return null;
  const h = v
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#\s]/)[0];
  return h ? `@${h}` : null;
}

type Item = { id: string; nome: string; instagram: string | null };

// Faixa dos Membros Fundadores: "FUNDADORES" escrito em cima e, embaixo, nomes e @ do
// Instagram passando devagar, em círculo
// contínuo. Toque no nome abre o local; toque no rótulo abre a lista de fundadores. Com
// "Reduzir movimento" ligado no aparelho, fica parada e se desliza com o dedo.
export default function FaixaFundadores({
  itens,
  rotulo,
  onAbrir,
  onVerTodos,
}: {
  itens: Item[];
  rotulo: string;
  onAbrir: (id: string) => void;
  onVerTodos: () => void;
}) {
  const reduzir = useReduzirMovimento();
  const [larguraArea, setLarguraArea] = useState(0);
  const [larguraLista, setLarguraLista] = useState(0);
  const [caixa, setCaixa] = useState({ w: 0, h: 0 });
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    x.setValue(0);
    if (reduzir || larguraLista <= 0 || larguraArea <= 0) return;
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: -larguraLista,
        duration: Math.round((larguraLista / VELOCIDADE_PX_S) * 1000),
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [reduzir, larguraLista, larguraArea, x, itens]);

  if (itens.length === 0) return null;

  const copias = larguraLista > 0 ? Math.max(2, Math.ceil(larguraArea / larguraLista) + 1) : 1;
  const lista = (chave: string) =>
    itens.map((it) => {
      const ig = handleInstagram(it.instagram);
      return (
        <TouchableOpacity
          key={`${chave}-${it.id}`}
          style={styles.item}
          activeOpacity={0.8}
          onPress={() => onAbrir(it.id)}
          accessibilityRole="button"
          accessibilityLabel={ig ? `${it.nome}, ${ig}` : it.nome}
        >
          <Text style={styles.nome} numberOfLines={1}>{it.nome}</Text>
          {!!ig && <Text style={styles.ig} numberOfLines={1}>{ig}</Text>}
          <Text style={styles.sep}>•</Text>
        </TouchableOpacity>
      );
    });

  return (
    <View style={styles.brilho}>
    <View style={styles.caixa} onLayout={(e) => setCaixa({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <TouchableOpacity style={styles.rotulo} activeOpacity={0.8} onPress={onVerTodos} accessibilityRole="button" accessibilityLabel={rotulo}>
        <Feather name="award" size={14} color={CIANO} />
        <Text style={styles.rotuloTexto}>{rotulo}</Text>
        <Feather name="chevron-right" size={13} color={ROSA} />
      </TouchableOpacity>
      <View style={styles.area} onLayout={(e) => setLarguraArea(Math.round(e.nativeEvent.layout.width))}>
        {reduzir ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 12, alignItems: 'center' }}>
            {lista('r')}
          </ScrollView>
        ) : (
          <Animated.View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              height: '100%',
              paddingLeft: 12,
              width: larguraLista > 0 ? copias * larguraLista + 12 : undefined,
              transform: [{ translateX: x }],
            }}
          >
            {Array.from({ length: copias }, (_, c) => (
              <View
                key={c}
                style={styles.lista}
                onLayout={c === 0 ? (e) => setLarguraLista(Math.round(e.nativeEvent.layout.width)) : undefined}
              >
                {lista(`c${c}`)}
              </View>
            ))}
          </Animated.View>
        )}
      </View>
      {caixa.w > 0 && (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none" width={caixa.w} height={caixa.h}>
          <Defs>
            <LinearGradient id="gradNeonFundadores" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={CIANO} />
              <Stop offset="0.55" stopColor={VIOLETA} />
              <Stop offset="1" stopColor={ROSA} />
            </LinearGradient>
          </Defs>
          <Rect x={0.75} y={0.75} width={caixa.w - 1.5} height={caixa.h - 1.5} rx={RAIO - 0.75} ry={RAIO - 0.75} fill="none" stroke="url(#gradNeonFundadores)" strokeWidth={1.5} />
        </Svg>
      )}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Brilho neon em volta (iOS); no Android fica só a borda em degradê.
  brilho: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: RAIO,
    shadowColor: VIOLETA,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  caixa: {
    flexDirection: 'column',
    borderRadius: RAIO,
    overflow: 'hidden',
    backgroundColor: '#12101C',
  },
  rotulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(155,60,255,0.20)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(155,60,255,0.45)',
  },
  rotuloTexto: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, color: '#7FD8FF' },
  area: { height: 38, overflow: 'hidden', justifyContent: 'center' },
  lista: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10, height: 38 },
  nome: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  ig: { fontSize: 12, fontWeight: '700', color: '#FF6EC0' },
  sep: { fontSize: 12, color: '#626274' },
});
