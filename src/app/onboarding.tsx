// Abertura do app (primeira vez): 4 telas com foto grande da equipe (fade para o fundo escuro), logo no topo,
// a missão e o objetivo do Dicas LGBT+ e um resumo do que dá para fazer.
// Idioma PT/EN/ES num botão só no topo (igual à Home). Quem já viu não vê de novo
// (chave em AsyncStorage); a Conta tem um atalho para rever.
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import FundoDegrade from '../components/FundoDegrade';
import MarcaApp from '../components/MarcaApp';
import { IDIOMAS, Idioma, useI18n } from '../lib/i18n';

export const CHAVE_ONBOARDING = 'dicas_onboarding_v1';

type Slide = { tag: string; titulo: string; itens: string[]; icones: string[] };
type Textos = { missaoRot: string; missao: string; objetivoRot: string; objetivo: string; proximo: string; comecar: string; voltar: string; slides: Slide[] };

const TEXTOS: Record<Idioma, Textos> = {
  pt: {
    missaoRot: 'Nossa missão',
    missao: 'Tornar a vida LGBTQIA+ mais livre, segura e conectada.',
    objetivoRot: 'Nosso objetivo',
    objetivo: 'Reunir lugares, eventos e destinos que acolhem de verdade e fortalecer quem apoia a causa.',
    proximo: 'Próximo', comecar: 'Começar', voltar: 'Voltar',
    slides: [
      { tag: 'Bem-vinde', titulo: 'Olá! Que bom ter você aqui', itens: [], icones: ['Bares', 'Gastronomia', 'Festas', 'Cultura', 'Trip', 'Serviços'] },
      { tag: 'Descubra', titulo: 'Tudo o que rola perto de você', itens: ['Bares, festas, gastronomia e cultura que acolhem', 'O que fazer hoje e os recomendados pela equipe', 'Mapa, agenda e busca num só lugar'], icones: ['Bares', 'Gastronomia', 'Festas', 'Cultura', 'Mapa'] },
      { tag: 'Viaje', titulo: 'Viaje com segurança', itens: ['Destinos, roteiros e pacotes para a comunidade', 'Hospedagem acolhedora e passeios', 'Guia Brasil 2027 em PT, EN e ES'], icones: ['Hospedagem', 'Passeios', 'Roteiros', 'Agências', 'Eventos'] },
      { tag: 'Você no controle', titulo: 'Sua segurança em primeiro lugar', itens: ['Denuncie e bloqueie com um toque', 'Nome social, foto e status são opcionais', 'Exclusivo para maiores de 18 anos'], icones: ['Denunciar', 'Bloquear', 'Nome social', 'Privacidade', '18+'] },
    ],
  },
  en: {
    missaoRot: 'Our mission',
    missao: 'To make LGBTQIA+ life freer, safer and more connected.',
    objetivoRot: 'Our goal',
    objetivo: 'To bring together places, events and destinations that truly welcome us, and to strengthen those who support the cause.',
    proximo: 'Next', comecar: 'Get started', voltar: 'Back',
    slides: [
      { tag: 'Welcome', titulo: 'Hi! Glad to have you here', itens: [], icones: ['Bars', 'Food', 'Parties', 'Culture', 'Trip', 'Services'] },
      { tag: 'Discover', titulo: 'Everything happening near you', itens: ['Welcoming bars, parties, food and culture', 'What to do today and the team’s picks', 'Map, agenda and search in one place'], icones: ['Bars', 'Food', 'Parties', 'Culture', 'Map'] },
      { tag: 'Travel', titulo: 'Travel safely', itens: ['Destinations, itineraries and packages for the community', 'Welcoming stays and tours', 'Brazil 2027 guide in PT, EN and ES'], icones: ['Stays', 'Tours', 'Itineraries', 'Agencies', 'Events'] },
      { tag: 'You are in control', titulo: 'Your safety comes first', itens: ['Report and block with one tap', 'Chosen name, photo and status are optional', 'Only for people aged 18 or over'], icones: ['Report', 'Block', 'Chosen name', 'Privacy', '18+'] },
    ],
  },
  es: {
    missaoRot: 'Nuestra misión',
    missao: 'Hacer la vida LGBTQIA+ más libre, segura y conectada.',
    objetivoRot: 'Nuestro objetivo',
    objetivo: 'Reunir lugares, eventos y destinos que acogen de verdad y fortalecer a quienes apoyan la causa.',
    proximo: 'Siguiente', comecar: 'Empezar', voltar: 'Volver',
    slides: [
      { tag: 'Bienvenide', titulo: '¡Hola! Qué bueno tenerte aquí', itens: [], icones: ['Bares', 'Gastronomía', 'Fiestas', 'Cultura', 'Trip', 'Servicios'] },
      { tag: 'Descubre', titulo: 'Todo lo que pasa cerca de ti', itens: ['Bares, fiestas, gastronomía y cultura que acogen', 'Qué hacer hoy y las recomendaciones del equipo', 'Mapa, agenda y búsqueda en un solo lugar'], icones: ['Bares', 'Gastronomía', 'Fiestas', 'Cultura', 'Mapa'] },
      { tag: 'Viaja', titulo: 'Viaja con seguridad', itens: ['Destinos, itinerarios y paquetes para la comunidad', 'Alojamiento acogedor y paseos', 'Guía Brasil 2027 en PT, EN y ES'], icones: ['Alojamiento', 'Paseos', 'Rutas', 'Agencias', 'Eventos'] },
      { tag: 'Tú tienes el control', titulo: 'Tu seguridad primero', itens: ['Denuncia y bloquea con un toque', 'Nombre social, foto y estado son opcionales', 'Solo para mayores de 18 años'], icones: ['Denunciar', 'Bloquear', 'Nombre social', 'Privacidad', '18+'] },
    ],
  },
};

// Foto, cor de destaque e ícones de cada tela. As fotos ficam em src/assets/images/onboarding.
const META: { foto: any; cor: string; itens: string[] }[] = [
  { foto: require('../assets/images/onboarding/ob-1-boas-vindas.jpg'), cor: '#E1306C', itens: [] },
  { foto: require('../assets/images/onboarding/ob-2-descubra.jpg'), cor: '#E879F9', itens: ['moon', 'zap', 'map'] },
  { foto: require('../assets/images/onboarding/ob-3-viaje.jpg'), cor: '#38BDF8', itens: ['map-pin', 'home', 'info'] },
  // Segurança: verde (cor de "espaço seguro").
  { foto: require('../assets/images/onboarding/ob-4-seguranca.jpg'), cor: '#34D399', itens: ['flag', 'user', 'lock'] },
];

const FUNDO = '#0B0B0E';

// Fade vertical (SVG, sem biblioteca extra): transparente no alto, fundo escuro embaixo.
function Fade({ w, h, de, ate, op0, op1 }: { w: number; h: number; de: string; ate?: string; op0: number; op1: number }) {
  const id = `f-${de}-${op0}-${op1}-${h}`.replace(/[^a-zA-Z0-9-]/g, '');
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', left: 0, right: 0 }} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={de} stopOpacity={op0} />
          <Stop offset="1" stopColor={ate || de} stopOpacity={op1} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={w} height={h} fill={`url(#${id})`} />
    </Svg>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { idioma, proximoIdioma, t } = useI18n();
  const idiomaAtual = IDIOMAS.find((i) => i.code === idioma) || IDIOMAS[0];
  const tx = TEXTOS[idioma] ?? TEXTOS.pt;
  const ref = useRef<any>(null); // RN 0.88: ScrollView deixou de ser classe
  const [atual, setAtual] = useState(0);
  const ultimo = tx.slides.length - 1;
  const cor = META[atual].cor;
  // Bloco da foto: altura proporcional à largura; o texto começa sobre o fade.
  const alturaFoto = Math.round(width * 1.18);
  const alturaImg = Math.round(width * 1.34);

  const concluir = () => {
    AsyncStorage.setItem(CHAVE_ONBOARDING, '1').catch(() => {});
    router.replace('/(tabs)' as any);
  };
  const ir = (i: number) => {
    const n = Math.max(0, Math.min(ultimo, i));
    ref.current?.scrollTo({ x: n * width, animated: true });
    setAtual(n);
  };
  const aoParar = (e: NativeSyntheticEvent<NativeScrollEvent>) => setAtual(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={styles.tela}>
      <FundoDegrade />
      {/* topo igual ao da Home: logo + frase à esquerda; idioma (um botão só) à direita */}
      <View style={[styles.topo, { paddingTop: insets.top + 8 }]}>
        <MarcaApp />
        <TouchableOpacity
          style={styles.idiomaBtn}
          onPress={proximoIdioma}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${t('conta.idioma')}: ${idiomaAtual.nome}`}
        >
          <Feather name="globe" size={14} color="#FFFFFF" />
          <Text style={styles.idiomaTxt}>{idiomaAtual.sigla}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={aoParar} style={{ flex: 1 }}>
        {tx.slides.map((s, n) => (
          <ScrollView key={n} style={{ width }} contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
            {/* foto da equipe, com fade para o fundo escuro (em cima e embaixo) */}
            <View style={{ width, height: alturaFoto, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
              <Image source={META[n].foto} style={{ width, height: alturaImg, marginTop: -Math.round(width * 0.04) }} resizeMode="cover" />
              <Fade w={width} h={46} de={FUNDO} op0={1} op1={0} />
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(alturaFoto * 0.62) }}>
                <Fade w={width} h={Math.round(alturaFoto * 0.62)} de={FUNDO} op0={0} op1={1} />
              </View>
              {/* um toque da cor da tela no fundo da foto */}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(alturaFoto * 0.35), opacity: 0.22 }}>
                <Fade w={width} h={Math.round(alturaFoto * 0.35)} de={META[n].cor} op0={0} op1={1} />
              </View>
            </View>

            <View style={[styles.conteudo, { paddingTop: Math.round(alturaFoto * 0.58) }]}>
              <View style={[styles.pilula, { borderColor: META[n].cor }]}>
                <View style={[styles.pilulaPonto, { backgroundColor: META[n].cor }]} />
                <Text style={styles.pilulaTxt}>{s.tag}</Text>
              </View>
              <Text style={styles.titulo}>{s.titulo}</Text>

              {n === 0 ? (
                <View style={styles.cartao}>
                  <Text style={[styles.rotulo, { color: META[0].cor }]}>{tx.missaoRot}</Text>
                  <Text style={styles.missao}>{tx.missao}</Text>
                  <View style={styles.divisor} />
                  <Text style={[styles.rotulo, { color: META[0].cor }]}>{tx.objetivoRot}</Text>
                  <Text style={styles.corpo}>{tx.objetivo}</Text>
                </View>
              ) : (
                s.itens.map((txt, k) => (
                  <View key={k} style={styles.item}>
                    <View style={[styles.itemCirculo, { borderColor: META[n].cor }]}>
                      <Feather name={META[n].itens[k] as any} size={18} color={META[n].cor} />
                    </View>
                    <Text style={styles.itemTxt}>{txt}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.pontos}>
          {tx.slides.map((_, i) => (
            <View key={i} style={[styles.ponto, i === atual && [styles.pontoAtivo, { backgroundColor: cor }]]} />
          ))}
        </View>
        <View style={styles.botoes}>
          {atual > 0 && (
            <TouchableOpacity style={styles.btnVoltar} onPress={() => ir(atual - 1)} accessibilityRole="button" accessibilityLabel={tx.voltar}>
              <Feather name="chevron-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btnPrincipal, { backgroundColor: '#E1306C' }]} onPress={() => (atual < ultimo ? ir(atual + 1) : concluir())} accessibilityRole="button">
            <Text style={styles.btnTxt}>{atual < ultimo ? tx.proximo : tx.comecar}</Text>
            <Feather name={atual < ultimo ? 'arrow-right' : 'check'} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: FUNDO },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: FUNDO, zIndex: 2 },
  idiomaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  idiomaTxt: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  conteudo: { paddingHorizontal: 16 },
  pilula: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(11,11,14,0.72)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 10 },
  pilulaPonto: { width: 7, height: 7, borderRadius: 4 },
  pilulaTxt: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  titulo: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', lineHeight: 36, marginBottom: 14, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  cartao: { backgroundColor: 'rgba(26,26,34,0.88)', borderRadius: 18, borderWidth: 1, borderColor: '#2E2E3D', padding: 16 },
  rotulo: { fontSize: 11, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 4 },
  missao: { color: '#FFFFFF', fontSize: 17, lineHeight: 23, fontWeight: '800' },
  divisor: { height: 1, backgroundColor: '#2E2E3D', marginVertical: 12 },
  corpo: { color: '#E4E1F0', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(26,26,34,0.88)', borderRadius: 16, borderWidth: 1, borderColor: '#2E2E3D', padding: 12, marginBottom: 10 },
  itemCirculo: { width: 40, height: 40, borderRadius: 20, backgroundColor: FUNDO, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  itemTxt: { flex: 1, color: '#E4E1F0', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(11,11,14,0.94)' },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#35354A' },
  pontoAtivo: { width: 18 },
  botoes: { flexDirection: 'row', gap: 10 },
  btnVoltar: { width: 54, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#1A1A22', alignItems: 'center', justifyContent: 'center' },
  btnPrincipal: { flex: 1, height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
