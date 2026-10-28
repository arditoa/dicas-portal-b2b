// Abertura do app (primeira vez): 5 telas leves, no mesmo visual da Home (logo no topo, caixas com
// degradê, ícones em círculo), com a missão e o objetivo do Dicas LGBT+ e um resumo do que dá para fazer.
// Idioma PT/EN/ES no topo, "Saltar" sempre disponível. Quem já viu não vê de novo
// (chave em AsyncStorage); a Conta tem um atalho para rever.
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FundoCaixaDegrade from '../components/FundoCaixaDegrade';
import { IDIOMAS, Idioma, useI18n } from '../lib/i18n';

export const CHAVE_ONBOARDING = 'dicas_onboarding_v1';

type Slide = { tag: string; titulo: string; itens: string[] };
type Textos = { missaoRot: string; missao: string; objetivoRot: string; objetivo: string; saltar: string; proximo: string; comecar: string; voltar: string; slides: Slide[] };

const TEXTOS: Record<Idioma, Textos> = {
  pt: {
    missaoRot: 'Nossa missão',
    missao: 'Tornar a vida LGBTQIA+ mais livre, segura e conectada.',
    objetivoRot: 'Nosso objetivo',
    objetivo: 'Reunir lugares, eventos e destinos que acolhem de verdade e fortalecer quem apoia a causa.',
    saltar: 'Saltar', proximo: 'Próximo', comecar: 'Começar', voltar: 'Voltar',
    slides: [
      { tag: 'Bem-vinde', titulo: 'Olá! Que bom ter você aqui', itens: [] },
      { tag: 'Descubra', titulo: 'Tudo o que rola perto de você', itens: ['Bares, festas, gastronomia e cultura que acolhem', 'O que fazer hoje e os recomendados pela equipe', 'Mapa, agenda e busca num só lugar'] },
      { tag: 'Viaje', titulo: 'Viaje com segurança', itens: ['Destinos, roteiros e pacotes para a comunidade', 'Hospedagem acolhedora e passeios', 'Guia Brasil 2027 em PT, EN e ES'] },
      { tag: 'Apoie e ganhe', titulo: 'Apoie quem apoia a causa', itens: ['Selo Dicas LGBT+ em negócios verificados', 'Cupons e ofertas com check-in', 'Favoritos e avisos só do que você escolher'] },
      { tag: 'Você no controle', titulo: 'Sua segurança em primeiro lugar', itens: ['Denuncie e bloqueie com um toque', 'Nome social, foto e status são opcionais', 'Exclusivo para maiores de 18 anos'] },
    ],
  },
  en: {
    missaoRot: 'Our mission',
    missao: 'To make LGBTQIA+ life freer, safer and more connected.',
    objetivoRot: 'Our goal',
    objetivo: 'To bring together places, events and destinations that truly welcome us, and to strengthen those who support the cause.',
    saltar: 'Skip', proximo: 'Next', comecar: 'Get started', voltar: 'Back',
    slides: [
      { tag: 'Welcome', titulo: 'Hi! Glad to have you here', itens: [] },
      { tag: 'Discover', titulo: 'Everything happening near you', itens: ['Welcoming bars, parties, food and culture', 'What to do today and the team’s picks', 'Map, agenda and search in one place'] },
      { tag: 'Travel', titulo: 'Travel safely', itens: ['Destinations, itineraries and packages for the community', 'Welcoming stays and tours', 'Brazil 2027 guide in PT, EN and ES'] },
      { tag: 'Support and earn', titulo: 'Support those who support the cause', itens: ['Dicas LGBT+ seal on verified businesses', 'Coupons and offers with check-in', 'Favorites and alerts only for what you choose'] },
      { tag: 'You are in control', titulo: 'Your safety comes first', itens: ['Report and block with one tap', 'Chosen name, photo and status are optional', 'Only for people aged 18 or over'] },
    ],
  },
  es: {
    missaoRot: 'Nuestra misión',
    missao: 'Hacer la vida LGBTQIA+ más libre, segura y conectada.',
    objetivoRot: 'Nuestro objetivo',
    objetivo: 'Reunir lugares, eventos y destinos que acogen de verdad y fortalecer a quienes apoyan la causa.',
    saltar: 'Omitir', proximo: 'Siguiente', comecar: 'Empezar', voltar: 'Volver',
    slides: [
      { tag: 'Bienvenide', titulo: '¡Hola! Qué bueno tenerte aquí', itens: [] },
      { tag: 'Descubre', titulo: 'Todo lo que pasa cerca de ti', itens: ['Bares, fiestas, gastronomía y cultura que acogen', 'Qué hacer hoy y las recomendaciones del equipo', 'Mapa, agenda y búsqueda en un solo lugar'] },
      { tag: 'Viaja', titulo: 'Viaja con seguridad', itens: ['Destinos, itinerarios y paquetes para la comunidad', 'Alojamiento acogedor y paseos', 'Guía Brasil 2027 en PT, EN y ES'] },
      { tag: 'Apoya y gana', titulo: 'Apoya a quien apoya la causa', itens: ['Sello Dicas LGBT+ en negocios verificados', 'Cupones y ofertas con check-in', 'Favoritos y avisos solo de lo que elijas'] },
      { tag: 'Tú tienes el control', titulo: 'Tu seguridad primero', itens: ['Denuncia y bloquea con un toque', 'Nombre social, foto y estado son opcionales', 'Solo para mayores de 18 años'] },
    ],
  },
};

// Degradê (os mesmos das caixas da Home), cor de destaque e ícones de cada tela.
const META: { degrade: [string, string]; cor: string; icone: string; itens: string[] }[] = [
  { degrade: ['#E1306C', '#7E57C2'], cor: '#E1306C', icone: 'heart', itens: [] },
  { degrade: ['#C026A3', '#6D3FD1'], cor: '#E879F9', icone: 'compass', itens: ['moon', 'zap', 'map'] },
  { degrade: ['#0F9F90', '#5558E3'], cor: '#2DD4BF', icone: 'globe', itens: ['map-pin', 'home', 'info'] },
  { degrade: ['#F2692A', '#C42660'], cor: '#FB923C', icone: 'gift', itens: ['check-circle', 'tag', 'bell'] },
  { degrade: ['#0A8FD0', '#7048B8'], cor: '#38BDF8', icone: 'shield', itens: ['flag', 'user', 'lock'] },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { idioma, setIdioma } = useI18n();
  const tx = TEXTOS[idioma] ?? TEXTOS.pt;
  const ref = useRef<any>(null); // RN 0.88: ScrollView deixou de ser classe
  const [atual, setAtual] = useState(0);
  const ultimo = tx.slides.length - 1;
  const cor = META[atual].cor;

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
      {/* topo igual ao da Home: logo à esquerda; idioma e Saltar à direita */}
      <View style={[styles.topo, { paddingTop: insets.top + 12 }]}>
        <Image source={require('../assets/images/logolinear-semfundo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Dicas LGBT+" />
        <View style={styles.topoDireita}>
          {IDIOMAS.map((i) => (
            <TouchableOpacity key={i.code} onPress={() => setIdioma(i.code)} style={[styles.idiomaChip, idioma === i.code && styles.idiomaAtivo]} accessibilityRole="button" accessibilityLabel={i.nome}>
              <Text style={[styles.idiomaTxt, idioma === i.code && { color: '#FFFFFF' }]}>{i.sigla}</Text>
            </TouchableOpacity>
          ))}
          {atual < ultimo && (
            <TouchableOpacity onPress={concluir} hitSlop={10} accessibilityRole="button" style={{ marginLeft: 6 }}>
              <Text style={styles.saltar}>{tx.saltar}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={aoParar} style={{ flex: 1 }}>
        {tx.slides.map((s, n) => (
          <ScrollView key={n} style={{ width }} contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
            {/* caixa grande com degradê, como as caixas da Home */}
            <View style={styles.hero}>
              <FundoCaixaDegrade id={`ob-${n}`} cores={META[n].degrade} />
              {n === 0 ? (
                <View style={styles.heroTexto}>
                  <Text style={styles.heroRotulo}>{tx.missaoRot}</Text>
                  <Text style={styles.heroMissao}>{tx.missao}</Text>
                </View>
              ) : (
                <>
                  <Feather name={META[n].icone as any} size={120} color="rgba(255,255,255,0.18)" style={styles.heroMarca} />
                  <View style={styles.heroIcone}>
                    <Feather name={META[n].icone as any} size={30} color="#FFFFFF" />
                  </View>
                  <View style={styles.heroPilula}>
                    <Text style={styles.heroPilulaTxt}>{s.tag}</Text>
                  </View>
                </>
              )}
            </View>

            <Text style={styles.titulo}>{s.titulo}</Text>

            {n === 0 ? (
              <View style={styles.cartao}>
                <Text style={[styles.rotulo, { color: cor }]}>{tx.objetivoRot}</Text>
                <Text style={styles.corpo}>{tx.objetivo}</Text>
              </View>
            ) : (
              s.itens.map((t, k) => (
                <View key={k} style={styles.item}>
                  <View style={styles.itemCirculo}>
                    <Feather name={META[n].itens[k] as any} size={18} color={cor} />
                  </View>
                  <Text style={styles.itemTxt}>{t}</Text>
                </View>
              ))
            )}
          </ScrollView>
        ))}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.pontos}>
          {tx.slides.map((_, i) => (
            <View key={i} style={[styles.ponto, i === atual && styles.pontoAtivo]} />
          ))}
        </View>
        <View style={styles.botoes}>
          {atual > 0 && (
            <TouchableOpacity style={styles.btnVoltar} onPress={() => ir(atual - 1)} accessibilityRole="button" accessibilityLabel={tx.voltar}>
              <Feather name="chevron-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnPrincipal} onPress={() => (atual < ultimo ? ir(atual + 1) : concluir())} accessibilityRole="button">
            <Text style={styles.btnTxt}>{atual < ultimo ? tx.proximo : tx.comecar}</Text>
            <Feather name={atual < ultimo ? 'arrow-right' : 'check'} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0B0E' },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  logo: { width: 128, height: 30 },
  topoDireita: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  idiomaChip: { minWidth: 38, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#1A1A22', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  idiomaAtivo: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  idiomaTxt: { color: '#C9C6DA', fontSize: 11, fontWeight: '800' },
  saltar: { color: '#A9A6BD', fontSize: 13, fontWeight: '700' },
  conteudo: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 150 },
  hero: { height: 170, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', marginBottom: 20 },
  heroTexto: { padding: 20, gap: 8 },
  heroRotulo: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroMissao: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  heroMarca: { position: 'absolute', right: -10, bottom: -16 },
  heroIcone: { position: 'absolute', top: 16, left: 16, width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroPilula: { position: 'absolute', left: 16, bottom: 16, backgroundColor: 'rgba(11,11,14,0.4)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  heroPilulaTxt: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  titulo: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 16 },
  cartao: { backgroundColor: '#1A1A22', borderRadius: 16, borderWidth: 1, borderColor: '#2E2E3D', padding: 16 },
  rotulo: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  corpo: { color: '#E4E1F0', fontSize: 16, lineHeight: 23, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A22', borderRadius: 16, borderWidth: 1, borderColor: '#2E2E3D', padding: 12, marginBottom: 10 },
  itemCirculo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#2E2E3D', alignItems: 'center', justifyContent: 'center' },
  itemTxt: { flex: 1, color: '#E4E1F0', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(11,11,14,0.94)' },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#35354A' },
  pontoAtivo: { width: 18, backgroundColor: '#E1306C' },
  botoes: { flexDirection: 'row', gap: 10 },
  btnVoltar: { width: 54, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#1A1A22', alignItems: 'center', justifyContent: 'center' },
  btnPrincipal: { flex: 1, height: 52, borderRadius: 16, backgroundColor: '#E1306C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
