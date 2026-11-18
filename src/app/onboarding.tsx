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
type Textos = { encontreRot: string; missaoRot: string; missao: string; objetivoRot: string; objetivo: string; proximo: string; comecar: string; voltar: string; slides: Slide[] };

const TEXTOS: Record<Idioma, Textos> = {
  pt: {
    encontreRot: 'No app você encontra',
    missaoRot: 'Nossa missão',
    missao: 'Tornar a vida LGBTQIA+ mais livre, segura e conectada.',
    objetivoRot: 'Nosso objetivo',
    objetivo: 'Ser o guia da comunidade: num só app, os lugares, festas, viagens, serviços e marcas que acolhem de verdade — e dar visibilidade a quem apoia a causa.',
    proximo: 'Próximo', comecar: 'Começar', voltar: 'Voltar',
    slides: [
      { tag: 'Bem-vinde', titulo: 'Olá! Que bom ter você aqui', itens: [], icones: ['Bares', 'Gastronomia', 'Festas', 'Artistas', 'Cultura', 'Trip', 'Beleza', 'Moda', 'Lojas', 'Serviços', 'Saúde', 'Lazer', 'Educação', 'Comunidade', '18+'] },
      { tag: 'Descubra', titulo: 'Tudo o que rola perto de você', itens: ['Bares, festas, gastronomia, cultura e artistas que acolhem', 'Beleza, moda, lojas, saúde e serviços de quem apoia a causa', 'O que fazer hoje, agenda, mapa e cupons num só lugar'], icones: ['Bares', 'Gastronomia', 'Festas', 'Cultura', 'Mapa'] },
      { tag: 'Viaje', titulo: 'Viaje com segurança', itens: ['Destinos, roteiros e pacotes para a comunidade', 'Hospedagem acolhedora e passeios', 'Guia Brasil 2027 em PT, EN e ES'], icones: ['Hospedagem', 'Passeios', 'Roteiros', 'Agências', 'Eventos'] },
      { tag: 'Você no controle', titulo: 'Sua segurança em primeiro lugar', itens: ['Denuncie e bloqueie com um toque', 'Nome social, foto e status são opcionais', 'Exclusivo para maiores de 18 anos'], icones: ['Denunciar', 'Bloquear', 'Nome social', 'Privacidade', '18+'] },
    ],
  },
  en: {
    encontreRot: 'In the app you’ll find',
    missaoRot: 'Our mission',
    missao: 'To make LGBTQIA+ life freer, safer and more connected.',
    objetivoRot: 'Our goal',
    objetivo: 'To be the community’s guide: in one app, the places, parties, trips, services and brands that truly welcome us — giving visibility to those who support the cause.',
    proximo: 'Next', comecar: 'Get started', voltar: 'Back',
    slides: [
      { tag: 'Welcome', titulo: 'Hi! Glad to have you here', itens: [], icones: ['Bars', 'Food', 'Parties', 'Artists', 'Culture', 'Trip', 'Beauty', 'Fashion', 'Shops', 'Services', 'Health', 'Leisure', 'Education', 'Community', '18+'] },
      { tag: 'Discover', titulo: 'Everything happening near you', itens: ['Welcoming bars, parties, food, culture and artists', 'Beauty, fashion, shops, health and services from allies', 'What to do today, agenda, map and coupons in one place'], icones: ['Bars', 'Food', 'Parties', 'Culture', 'Map'] },
      { tag: 'Travel', titulo: 'Travel safely', itens: ['Destinations, itineraries and packages for the community', 'Welcoming stays and tours', 'Brazil 2027 guide in PT, EN and ES'], icones: ['Stays', 'Tours', 'Itineraries', 'Agencies', 'Events'] },
      { tag: 'You are in control', titulo: 'Your safety comes first', itens: ['Report and block with one tap', 'Chosen name, photo and status are optional', 'Only for people aged 18 or over'], icones: ['Report', 'Block', 'Chosen name', 'Privacy', '18+'] },
    ],
  },
  es: {
    encontreRot: 'En la app encuentras',
    missaoRot: 'Nuestra misión',
    missao: 'Hacer la vida LGBTQIA+ más libre, segura y conectada.',
    objetivoRot: 'Nuestro objetivo',
    objetivo: 'Ser la guía de la comunidad: en una sola app, los lugares, fiestas, viajes, servicios y marcas que acogen de verdad — y dar visibilidad a quienes apoyan la causa.',
    proximo: 'Siguiente', comecar: 'Empezar', voltar: 'Volver',
    slides: [
      { tag: 'Bienvenide', titulo: '¡Hola! Qué bueno tenerte aquí', itens: [], icones: ['Bares', 'Gastronomía', 'Fiestas', 'Artistas', 'Cultura', 'Trip', 'Belleza', 'Moda', 'Tiendas', 'Servicios', 'Salud', 'Ocio', 'Educación', 'Comunidad', '18+'] },
      { tag: 'Descubre', titulo: 'Todo lo que pasa cerca de ti', itens: ['Bares, fiestas, gastronomía, cultura y artistas que acogen', 'Belleza, moda, tiendas, salud y servicios de quienes apoyan', 'Qué hacer hoy, agenda, mapa y cupones en un solo lugar'], icones: ['Bares', 'Gastronomía', 'Fiestas', 'Cultura', 'Mapa'] },
      { tag: 'Viaja', titulo: 'Viaja con seguridad', itens: ['Destinos, itinerarios y paquetes para la comunidad', 'Alojamiento acogedor y paseos', 'Guía Brasil 2027 en PT, EN y ES'], icones: ['Alojamiento', 'Paseos', 'Rutas', 'Agencias', 'Eventos'] },
      { tag: 'Tú tienes el control', titulo: 'Tu seguridad primero', itens: ['Denuncia y bloquea con un toque', 'Nombre social, foto y estado son opcionales', 'Solo para mayores de 18 años'], icones: ['Denunciar', 'Bloquear', 'Nombre social', 'Privacidad', '18+'] },
    ],
  },
};

// Foto, cor de destaque e ícones de cada tela. As fotos ficam em src/assets/images/onboarding.
const META: { foto: any; cor: string; itens: string[] }[] = [
  // 18/11 — visual mais "fofo": bolhas com emoji no lugar dos ícones de linha.
  { foto: require('../assets/images/onboarding/ob-1-boas-vindas.jpg'), cor: '#F472B6', itens: [] },
  { foto: require('../assets/images/onboarding/ob-2-descubra.jpg'), cor: '#E879F9', itens: ['🌙', '🛍️', '🗺️'] },
  { foto: require('../assets/images/onboarding/ob-3-viaje.jpg'), cor: '#38BDF8', itens: ['📍', '🏡', '🌎'] },
  // Segurança: verde (cor de "espaço seguro").
  { foto: require('../assets/images/onboarding/ob-4-seguranca.jpg'), cor: '#34D399', itens: ['🚩', '🙂', '🔒'] },
];
// Emoji e cor pastel de cada categoria da 1ª tela (mesma ordem nos 3 idiomas).
const EMOJI_CAT = ['🍹', '🍽️', '🎉', '🎤', '🎭', '✈️', '💅', '👗', '🛍️', '🧰', '🩺', '🎡', '📚', '🤝', '🔞'];
const PASTEIS = ['#F472B6', '#FB923C', '#FACC15', '#4ADE80', '#38BDF8', '#A78BFA'];
const EMOJI_TAG = ['', '✨', '🧳', '💚'];

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
        <MarcaApp semFrase />
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
              {/* Rodada 141 — sem a etiqueta "Bem-vinde" na 1ª tela (pedido da Andrea); as demais mantêm. */}
              {n > 0 && (
                <View style={[styles.pilula, { backgroundColor: `${META[n].cor}33` }]}>
                  <Text style={styles.pilulaEmoji}>{EMOJI_TAG[n]}</Text>
                  <Text style={[styles.pilulaTxt, { color: META[n].cor }]}>{s.tag}</Text>
                </View>
              )}
              <Text style={styles.titulo}>{s.titulo}</Text>

              {n === 0 ? (
                <View style={[styles.cartao, { backgroundColor: 'rgba(36,26,44,0.9)' }]}>
                  <Text style={[styles.rotulo, { color: META[0].cor }]}>{tx.missaoRot}</Text>
                  <Text style={styles.missao}>{tx.missao}</Text>
                  <View style={styles.divisor} />
                  <Text style={[styles.rotulo, { color: META[0].cor }]}>{tx.objetivoRot}</Text>
                  <Text style={styles.corpo}>{tx.objetivo}</Text>
                  {/* Rodada 142 — todas as categorias do app, para a missão falar mais do app. */}
                  <View style={styles.divisor} />
                  <Text style={[styles.rotulo, { color: META[0].cor }]}>{tx.encontreRot}</Text>
                  <View style={styles.catChips}>
                    {s.icones.map((c, k) => {
                      const pc = PASTEIS[k % PASTEIS.length];
                      return (
                        <View key={c} style={[styles.catChip, { backgroundColor: `${pc}22`, borderColor: `${pc}55` }]}>
                          <Text style={styles.catChipEmoji}>{EMOJI_CAT[k] || '✨'}</Text>
                          <Text style={styles.catChipTxt}>{c}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : (
                s.itens.map((txt, k) => (
                  <View key={k} style={[styles.item, { backgroundColor: `${META[n].cor}1F` }]}>
                    <View style={[styles.itemCirculo, { backgroundColor: `${META[n].cor}38` }]}>
                      <Text style={styles.itemEmoji}>{META[n].itens[k]}</Text>
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
          <TouchableOpacity style={[styles.btnPrincipal, { backgroundColor: '#EC4899', shadowColor: '#EC4899' }]} onPress={() => (atual < ultimo ? ir(atual + 1) : concluir())} accessibilityRole="button">
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
  pilula: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 12 },
  pilulaPonto: { width: 7, height: 7, borderRadius: 4 },
  pilulaEmoji: { fontSize: 13 },
  pilulaTxt: { fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  titulo: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', lineHeight: 31, letterSpacing: -0.2, marginBottom: 16, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  cartao: { borderRadius: 26, padding: 18 },
  rotulo: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, marginBottom: 4 },
  missao: { color: '#FFFFFF', fontSize: 17, lineHeight: 24, fontWeight: '700' },
  divisor: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 14 },
  corpo: { color: '#EDE9F6', fontSize: 14.5, lineHeight: 21, fontWeight: '500' },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  catChipEmoji: { fontSize: 12 },
  catChipTxt: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 10 },
  itemCirculo: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  itemEmoji: { fontSize: 22 },
  itemTxt: { flex: 1, color: '#FFFFFF', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(11,11,14,0.94)' },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 14 },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3A3550' },
  pontoAtivo: { width: 22 },
  botoes: { flexDirection: 'row', gap: 10 },
  btnVoltar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#221E2E', alignItems: 'center', justifyContent: 'center' },
  btnPrincipal: { flex: 1, height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  btnTxt: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '800' },
});
