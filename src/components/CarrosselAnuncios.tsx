import { Feather } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useReduzirMovimento } from '../hooks/useReduzirMovimento';
import FundoCaixaDegrade from './FundoCaixaDegrade';

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
  logoUrl?: string; // logo do parceiro (substitui o ícone na faixa)
  rotulo?: string; // ex.: PARCEIRO INSTITUCIONAL / APOIO — deixa claro quem é quem
  degrade?: [string, string]; // cartão do Dicas (Museu, Recomendados): degradê + ícone grande, em vez do cartão claro de parceiro
  chave?: string; // chave do banner no painel (ex.: 'museu'), usada para evitar duplicar cartões
  custom?: ReactNode; // cartão próprio (ex.: o cartão da Copa na Trip, com as cidades-sede)
  // Rodada 136 — foto do parceiro (Fundador/Premium). Fica na metade direita do cartão; o texto fica na metade
  // esquerda, sobre o degradê, e nunca por cima da foto. Assim a foto nunca atrapalha a leitura dos dizeres.
  fotoUrl?: string | null;
};

const INTERVALO_MS = 5000;
// Cartões de anúncio (futebol feminino, comércio LGBT, Câmara, Embratur): roxo escuro, texto claro.
const COR_TILE = '#2B1259';
const COR_TEXTO = '#FFFFFF';
const FAIXA = 72;
// Altura única dos cartões em degradê (Museu, Viaje pelo Brasil, fundadores…): todos do mesmo tamanho,
// não importa se a chamada tem 1 ou 2 linhas.
const ALTURA_DEGRADE = 128;

// `compacto`: cartão baixo (páginas de categoria) — etiqueta + chamada e uma setinha, sem botão, para a lista de locais subir na tela.
export default function CarrosselAnuncios({ anuncios, onExibir, compacto = false, altura }: { anuncios: Anuncio[]; onExibir?: (id: string) => void; compacto?: boolean; altura?: number }) {
  const reduzir = useReduzirMovimento();
  const ref = useRef<any>(null); // RN 0.88: ScrollView deixou de ser classe
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

  // Avisa quando um cartão aparece (medição de exibições; a tela decide se registra).
  useEffect(() => {
    const a = anuncios[atual];
    if (a && onExibir) onExibir(a.id);
  }, [atual, anuncios, onExibir]);

  if (anuncios.length === 0) return null;

  const aoParar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    tocando.current = false;
    if (largura > 0) setAtual(Math.round(e.nativeEvent.contentOffset.x / largura));
  };

  return (
    <View style={[styles.wrap, compacto && styles.wrapCompacto]} onLayout={(e) => setLargura(Math.round(e.nativeEvent.layout.width))}>
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
        {anuncios.map((a) => a.custom ? (
          <View key={a.id} style={{ width: largura }}>{a.custom}</View>
        ) : a.degrade ? (
          <TouchableOpacity key={a.id} activeOpacity={0.9} onPress={a.onPress} style={{ width: largura }} accessibilityRole="button" accessibilityLabel={`${a.cta}: ${a.titulo}`}>
            {compacto ? (
              <View style={styles.cardCompacto}>
                <FundoCaixaDegrade id={`anc-${a.id}`} cores={a.degrade} />
                <View style={styles.corpoCompacto}>
                  <View style={styles.pilulaDegrade}>
                    <Feather name={a.icone} size={10} color="#FFFFFF" />
                    <Text style={styles.pilulaDegradeTxt} numberOfLines={1}>{a.tag}</Text>
                  </View>
                  <Text style={styles.tituloCompacto} numberOfLines={2}>{a.titulo}</Text>
                </View>
                {a.fotoUrl ? (
                  <View style={styles.fotoCompacto}>
                    <Image source={{ uri: a.fotoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  </View>
                ) : (
                <View style={styles.setaCompacto}>
                  <Feather name="arrow-right" size={16} color="#1A1020" />
                </View>
                )}
              </View>
            ) : (
            <View style={[styles.cardDegrade, altura ? { height: altura } : null, a.fotoUrl ? styles.cardComFoto : null]}>
              <FundoCaixaDegrade id={`anc-${a.id}`} cores={a.degrade} />
              {a.fotoUrl ? (
                <View style={styles.fotoMetade}>
                  <Image source={{ uri: a.fotoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                </View>
              ) : (
              <Feather name={a.icone} size={132} color="rgba(255,255,255,0.16)" style={styles.marcaDagua} />
              )}
              <View style={[styles.corpoDegrade, altura ? { paddingVertical: 10, gap: 4 } : null, a.fotoUrl ? styles.corpoComFoto : null]}>
                <View style={styles.pilulaDegrade}>
                  <Feather name={a.icone} size={11} color="#FFFFFF" />
                  <Text style={styles.pilulaDegradeTxt} numberOfLines={1}>{a.tag}</Text>
                </View>
                <Text style={[styles.tituloDegrade, a.fotoUrl ? styles.tituloComFoto : null]} numberOfLines={a.fotoUrl ? 3 : 2}>{a.titulo}</Text>
                <View style={styles.btnDegrade}>
                  <Text style={styles.btnDegradeTxt}>{a.cta}</Text>
                  <Feather name="arrow-right" size={14} color="#1A1020" />
                </View>
              </View>
            </View>
            )}
          </TouchableOpacity>
        ) : (
          <View key={a.id} style={[styles.card, { width: largura }]}>
            <View style={[styles.corpo, { width: largura - FAIXA }]}>
              <Text style={styles.tag} numberOfLines={1}>{a.tag}</Text>
              {!!a.rotulo && <Text style={styles.rotulo} numberOfLines={1}>{a.rotulo}</Text>}
              <Text style={styles.titulo} numberOfLines={2}>{a.titulo}</Text>
              <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={`${a.cta}: ${a.titulo}`}>
                <Text style={styles.btnTexto}>{a.cta}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.faixa, { backgroundColor: a.cor }]} activeOpacity={0.85} onPress={a.onPress} accessibilityElementsHidden importantForAccessibility="no">
              {a.logoUrl ? (
                <View style={styles.logoBox}>
                  <Image source={{ uri: a.logoUrl }} style={styles.logoImg} resizeMode="contain" />
                </View>
              ) : (
                <Feather name={a.icone} size={34} color="#FFFFFF" />
              )}
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
  cardDegrade: { borderRadius: 14, overflow: 'hidden', height: ALTURA_DEGRADE, backgroundColor: '#2A1B4A', justifyContent: 'center' },
  wrapCompacto: { marginBottom: 8, minHeight: 0 },
  cardCompacto: { height: 80, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1C1B26', flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 12, gap: 10 },
  corpoCompacto: { flex: 1, gap: 5 },
  tituloCompacto: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', lineHeight: 17 },
  setaCompacto: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  marcaDagua: { position: 'absolute', right: -14, bottom: -18 },
  cardComFoto: {},
  fotoMetade: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '45%', backgroundColor: '#1C1B26' },
  corpoComFoto: { width: '55%', paddingRight: 12 },
  tituloComFoto: { fontSize: 13, lineHeight: 17 },
  fotoCompacto: { width: 96, alignSelf: 'stretch', marginRight: -12, overflow: 'hidden', backgroundColor: '#1C1B26' },
  corpoDegrade: { padding: 14, gap: 6, paddingRight: 96 },
  pilulaDegrade: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pilulaDegradeTxt: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6 },
  tituloDegrade: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', lineHeight: 19 },
  btnDegrade: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 13, minHeight: 30 },
  btnDegradeTxt: { fontSize: 12, fontWeight: '800', color: '#1A1020' },
  corpo: { padding: 14, gap: 4, justifyContent: 'center' },
  tag: { fontSize: 11, fontWeight: '800', color: '#C4B5FD', letterSpacing: 0.6 },
  titulo: { fontSize: 14, fontWeight: '800', color: COR_TEXTO, lineHeight: 18, flexShrink: 1 },
  rotulo: { fontSize: 9, fontWeight: '800', color: '#A99BD0', letterSpacing: 0.5 },
  logoBox: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 4 },
  logoImg: { width: '100%', height: '100%' },
  btn: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 14, minHeight: 32, justifyContent: 'center' },
  btnTexto: { fontSize: 12, fontWeight: '800', color: '#1A1020' },
  faixa: { width: FAIXA, alignItems: 'center', justifyContent: 'center' },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  pontoAtivo: { width: 16, backgroundColor: '#FF4D94' },
});
