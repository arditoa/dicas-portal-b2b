// Vitrine da Home: banners grandes em forma de ARTE (2:1), logo abaixo da busca.
// Passam sozinhos a cada 5 s, deslizam com o dedo e mostram o próximo cartão espiando na lateral.
// Cada item usa a arte enviada pela equipe (locais.arte_destaque_url); sem arte, vira um cartão
// com a foto do local e o nome numa faixa escura. Só Membros Fundadores e patrocinados entram.
import { Feather, Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { useReduzirMovimento } from '../hooks/useReduzirMovimento';
import FundoCaixaDegrade from './FundoCaixaDegrade';

export type ItemArte = {
  id: string;
  nome: string;
  bairro?: string;
  tipo: 'fundador' | 'patrocinado' | 'outro';
  // Cartão de categoria de destaque (Em alta, Hoje…): degradê + foto suave + ícone + título.
  degrade?: [string, string];
  icone?: string;
  subtitulo?: string;
  verTudo?: string;
  arteUrl?: string | null;
  fotoUrl?: string | null;
  rotulo: string; // texto da pílula (ex.: MEMBRO FUNDADOR)
  onPress: () => void;
};

const INTERVALO_MS = 5000;
const GAP = 12;
const MARGEM = 16;
const ESPIADA = 28; // quanto do próximo cartão aparece

export default function CarrosselArtes({ itens, onExibir }: { itens: ItemArte[]; onExibir?: (id: string) => void }) {
  const reduzir = useReduzirMovimento();
  const { width } = useWindowDimensions();
  const ref = useRef<any>(null); // RN 0.88: ScrollView deixou de ser classe
  const [atual, setAtual] = useState(0);
  const tocando = useRef(false);

  const unico = itens.length === 1;
  const larguraCard = unico ? width - MARGEM * 2 : width - MARGEM - ESPIADA - GAP;
  const passo = larguraCard + GAP;
  const altura = Math.round(larguraCard / 2);

  useEffect(() => {
    if (reduzir || itens.length < 2) return;
    const id = setInterval(() => {
      if (tocando.current) return;
      setAtual((a) => {
        const prox = (a + 1) % itens.length;
        ref.current?.scrollTo({ x: prox * passo, animated: true });
        return prox;
      });
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [reduzir, itens.length, passo]);

  useEffect(() => {
    const a = itens[atual];
    if (a && onExibir) onExibir(a.id);
  }, [atual, itens, onExibir]);

  if (itens.length === 0) return null;

  const aoParar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    tocando.current = false;
    setAtual(Math.max(0, Math.min(itens.length - 1, Math.round(e.nativeEvent.contentOffset.x / passo))));
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={passo}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: MARGEM, gap: GAP }}
        onScrollBeginDrag={() => { tocando.current = true; }}
        onMomentumScrollEnd={aoParar}
        scrollEventThrottle={16}
      >
        {itens.map((i) => (
          <TouchableOpacity
            key={i.id}
            activeOpacity={0.9}
            onPress={i.onPress}
            style={[styles.card, { width: larguraCard, height: altura }]}
            accessibilityRole="button"
            accessibilityLabel={i.nome}
          >
            {i.arteUrl ? (
              <Image source={{ uri: i.arteUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : i.degrade ? (
              <>
                <FundoCaixaDegrade id={`dest-${i.id}`} cores={i.degrade} />
                {!!i.fotoUrl && <Image source={{ uri: i.fotoUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.4 }]} resizeMode="cover" />}
                <View style={styles.icone}>
                  <Feather name={(i.icone || 'star') as any} size={20} color="#FFFFFF" />
                </View>
                <View style={styles.faixaCat}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nomeCat} numberOfLines={1}>{i.nome}</Text>
                    {!!i.subtitulo && <Text style={styles.bairro} numberOfLines={1}>{i.subtitulo}</Text>}
                  </View>
                  {!!i.verTudo && (
                    <View style={styles.verTudo}>
                      <Text style={styles.verTudoTxt}>{i.verTudo}</Text>
                      <Feather name="chevron-right" size={14} color="#1A1020" />
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                {!!i.fotoUrl && <Image source={{ uri: i.fotoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                <View style={styles.faixa}>
                  <Text style={styles.nome} numberOfLines={1}>{i.nome}</Text>
                  {!!i.bairro && <Text style={styles.bairro} numberOfLines={1}>{i.bairro}</Text>}
                </View>
              </>
            )}
            {i.tipo !== 'outro' && (
              <View style={[styles.pilula, { backgroundColor: i.tipo === 'fundador' ? '#F2A900' : '#7E57C2' }]}>
                <Ionicons name={i.tipo === 'fundador' ? 'star' : 'flash'} size={10} color={i.tipo === 'fundador' ? '#1A1020' : '#FFF'} />
                <Text style={[styles.pilulaTxt, { color: i.tipo === 'fundador' ? '#1A1020' : '#FFF' }]}>{i.rotulo}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      {itens.length > 1 && (
        <View style={styles.pontos}>
          {itens.map((i, n) => (
            <View key={i.id} style={[styles.ponto, n === atual && styles.pontoAtivo]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  card: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#1C1B26', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  faixa: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,11,14,0.72)', paddingHorizontal: 14, paddingVertical: 10 },
  nome: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  bairro: { color: '#D6D3E0', fontSize: 12, fontWeight: '600', marginTop: 1 },
  icone: { position: 'absolute', top: 12, left: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  faixaCat: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(11,11,14,0.35)' },
  nomeCat: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  verTudo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 999, paddingLeft: 10, paddingRight: 6, paddingVertical: 5 },
  verTudoTxt: { color: '#1A1020', fontSize: 11, fontWeight: '800' },
  pilula: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pilulaTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A3950' },
  pontoAtivo: { width: 18, backgroundColor: '#E1306C' },
});
