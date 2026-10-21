import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useReduzirMovimento } from '../hooks/useReduzirMovimento';

// Carrossel de anúncios da Home (no lugar do antigo cartão único da Copa):
// cartão claro com etiqueta, título, botão e uma faixa colorida com ícone.
// Passa sozinho a cada INTERVALO_MS; com "Reduzir movimento" fica parado e
// se desliza com o dedo. Para trocar anúncios (ex.: durante a Copa), basta
// mudar a lista passada pela Home.
export type Anuncio = {
  id: string;
  tag: string;
  titulo: string;
  cta: string;
  icone: keyof typeof Feather.glyphMap;
  cor: string;
  onPress: () => void;
};

const INTERVALO_MS = 5000;
const COR_TILE = '#E8E0F6';
const COR_TEXTO = '#0B0B0E';
const FAIXA = 72;

export default function CarrosselAnuncios({ anuncios }: { anuncios: Anuncio[] }) {
  const reduzir = useReduzirMovimento();
  const ref = useRef<ScrollView>(null);
  const [largura, setLargura] = useState(0);
  const [atual, setAtual] = useState(0);
  const tocando = useRef(false);

  useEffect(() => {
    if (reduzir || largura <= 0 || anuncios.length < 2) return;
    const id = setInterval(() => {
      if (tocando.current) return;
      setAtual((a) => {
        const prox = (a + 1) % anuncios.length;
        ref.current?.scrollTo({ x: prox * largura, animated: true });
        return prox;
      });
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [reduzir, largura, anuncios.length]);

  if (anuncios.length === 0) return null;

  const aoParar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    tocando.current = false;
    if (largura > 0) setAtual(Math.round(e.nativeEvent.contentOffset.x / largura));
  };

  return (
    <View style={styles.wrap} onLayout={(e) => setLargura(Math.round(e.nativeEvent.layout.width))}>
      {largura > 0 && (
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => { tocando.current = true; }}
        onMomentumScrollEnd={aoParar}
        scrollEventThrottle={16}
      >
        {anuncios.map((a) => (
          <View key={a.id} style={[styles.card, { width: largura }]}>
            <View style={[styles.corpo, { width: largura - FAIXA }]}>
              <Text style={styles.tag} numberOfLines={1}>{a.tag}</Text>
              <Text style={styles.titulo} numberOfLines={2}>{a.titulo}</Text>
              <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={`${a.cta}: ${a.titulo}`}>
                <Text style={styles.btnTexto}>{a.cta}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.faixa, { backgroundColor: a.cor }]} activeOpacity={0.85} onPress={a.onPress} accessibilityElementsHidden importantForAccessibility="no">
              <Feather name={a.icone} size={34} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      )}
      {anuncios.length > 1 && (
        <View style={styles.pontos}>
          {anuncios.map((a, i) => (
            <View key={a.id} style={[styles.ponto, i === atual && styles.pontoAtivo]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 18, minHeight: 112 },
  card: { flexDirection: 'row', borderRadius: 14, overflow: 'hidden', backgroundColor: COR_TILE, minHeight: 112 },
  corpo: { padding: 14, gap: 4, justifyContent: 'center' },
  tag: { fontSize: 11, fontWeight: '800', color: '#7E57C2', letterSpacing: 0.6 },
  titulo: { fontSize: 14, fontWeight: '800', color: COR_TEXTO, lineHeight: 18, flexShrink: 1 },
  btn: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: COR_TEXTO, borderRadius: 18, paddingHorizontal: 14, minHeight: 32, justifyContent: 'center' },
  btnTexto: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  faixa: { width: FAIXA, alignItems: 'center', justifyContent: 'center' },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  pontoAtivo: { width: 16, backgroundColor: '#FF4D94' },
});
