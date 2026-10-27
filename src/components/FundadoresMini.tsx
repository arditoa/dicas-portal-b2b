// Membros Fundadores e patrocinados: quadradinhos pequenos logo abaixo da busca.
// Foto cobrindo o quadrado, nome DENTRO do quadrado numa faixa escura embaixo, sem degradê atrás
// de logos (logo entra inteiro sobre fundo liso). Passam sozinhos devagar quando não cabem na tela.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { useReduzirMovimento } from '../hooks/useReduzirMovimento';

export type FundadorMini = {
  id: string;
  nome: string;
  foto: string | null;
  ehLogo?: boolean;
  tipo: 'fundador' | 'patrocinado' | 'outro';
  onPress: () => void;
};

const TILE = 82;
const GAP = 8;
const INTERVALO_MS = 3500;

export default function FundadoresMini({ itens, titulo }: { itens: FundadorMini[]; titulo: string }) {
  const reduzir = useReduzirMovimento();
  const { width } = useWindowDimensions();
  const ref = useRef<any>(null); // RN 0.88: ScrollView deixou de ser classe
  const idx = useRef(0);
  const tocando = useRef(false);
  const passo = TILE + GAP;
  const cabe = itens.length * passo + 24 <= width;

  useEffect(() => {
    if (reduzir || cabe || itens.length < 2) return;
    const max = Math.max(0, Math.ceil((itens.length * passo + 32 - width) / passo));
    const id = setInterval(() => {
      if (tocando.current) return;
      idx.current = idx.current >= max ? 0 : idx.current + 1;
      ref.current?.scrollTo({ x: idx.current * passo, animated: true });
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [reduzir, cabe, itens.length, passo, width]);

  if (itens.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.cabecalho}>
        <Ionicons name="star" size={11} color="#F2A900" />
        <Text style={styles.titulo}>{titulo}</Text>
      </View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: GAP }}
        onScrollBeginDrag={() => { tocando.current = true; }}
        onMomentumScrollEnd={(e) => {
          tocando.current = false;
          idx.current = Math.round(e.nativeEvent.contentOffset.x / passo);
        }}
      >
        {itens.map((i) => (
          <TouchableOpacity key={i.id} activeOpacity={0.9} onPress={i.onPress} style={styles.tile} accessibilityRole="button" accessibilityLabel={i.nome}>
            {!!i.foto && <Image source={{ uri: i.foto }} style={[StyleSheet.absoluteFill, i.ehLogo && { margin: 10, marginBottom: 26 }]} resizeMode={i.ehLogo ? 'contain' : 'cover'} />}
            <View style={[styles.estrela, { backgroundColor: i.tipo === 'patrocinado' ? '#7E57C2' : '#F2A900' }]}>
              <Ionicons name={i.tipo === 'patrocinado' ? 'flash' : 'star'} size={8} color={i.tipo === 'patrocinado' ? '#FFF' : '#1A1020'} />
            </View>
            <View style={styles.faixa}>
              <Text style={styles.nome} numberOfLines={1}>{i.nome}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, marginBottom: 6 },
  titulo: { color: '#A9A6BD', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  tile: { width: TILE, height: TILE, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1C1B26', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  estrela: { position: 'absolute', top: 5, left: 5, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  faixa: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,11,14,0.78)', paddingHorizontal: 5, paddingVertical: 4 },
  nome: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '800', textAlign: 'center' },
});
