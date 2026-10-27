// Abertura do app (primeira vez): 5 telas com a missão e o objetivo do Dicas LGBT+ e um resumo do
// que dá para fazer. Idioma PT/EN/ES no topo, "Saltar" sempre disponível. Quem já viu não vê de novo
// (chave em AsyncStorage); a Conta tem um atalho para rever.
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IDIOMAS, Idioma, useI18n } from '../lib/i18n';

export const CHAVE_ONBOARDING = 'dicas_onboarding_v1';

type Slide = { tag: string; titulo: string; itens: string[] };
type Textos = { missaoRot: string; missao: string; objetivoRot: string; objetivo: string; subtitulo: string; saltar: string; proximo: string; comecar: string; voltar: string; slides: Slide[] };

const TEXTOS: Record<Idioma, Textos> = {
  pt: {
    subtitulo: 'Conexões e Experiências LGBT+',
    missaoRot: 'Nossa missão',
    missao: 'Tornar a vida LGBTQIA+ mais livre, segura e conectada: da balada da esquina às viagens pelo Brasil.',
    objetivoRot: 'Nosso objetivo',
    objetivo: 'Reunir num só lugar os locais, eventos e destinos que acolhem de verdade e fortalecer os negócios que apoiam a causa.',
    saltar: 'Saltar', proximo: 'Próximo', comecar: 'Começar', voltar: 'Voltar',
    slides: [
      { tag: 'Bem-vinde', titulo: 'Olá! Que bom ter você aqui', itens: [] },
      { tag: 'Descubra', titulo: 'Tudo o que acontece perto de você', itens: [
        'Bares, festas, gastronomia e cultura que acolhem, no mapa e na agenda',
        'O que fazer hoje, o que está em alta e os recomendados pela equipe',
        'Filtre por estilo, público e distância',
        'Busque lugares, eventos e roteiros em um só lugar',
      ] },
      { tag: 'Viaje', titulo: 'Dicas Trip: viaje com segurança', itens: [
        'Destinos, roteiros e pacotes pensados para a comunidade',
        'Hospedagem acolhedora e passeios',
        'Brasil 2027: guia da Copa do Mundo Feminina',
        'Dicas úteis do Brasil em português, inglês e espanhol',
      ] },
      { tag: 'Apoie e ganhe', titulo: 'Apoie quem apoia a causa', itens: [
        'Selo Dicas LGBT+ para negócios verificados',
        'Cupons e ofertas com check-in no local',
        'Favoritos e avisos só do que você escolher',
        'Membros Fundadores e apoiadores institucionais',
      ] },
      { tag: 'Viva', titulo: 'Você no controle', itens: [
        'Denuncie e bloqueie com um toque',
        'Avalie o espaço e a segurança do lugar',
        'Nome social, foto e status são opcionais: você escolhe o que mostrar',
        'Exclusivo para maiores de 18 anos',
      ] },
    ],
  },
  en: {
    subtitulo: 'LGBT+ Connections & Experiences',
    missaoRot: 'Our mission',
    missao: 'To make LGBTQIA+ life freer, safer and more connected: from the club around the corner to trips across Brazil.',
    objetivoRot: 'Our goal',
    objetivo: 'To bring together, in one place, the venues, events and destinations that truly welcome us, and to strengthen the businesses that support the cause.',
    saltar: 'Skip', proximo: 'Next', comecar: 'Get started', voltar: 'Back',
    slides: [
      { tag: 'Welcome', titulo: 'Hi! Glad to have you here', itens: [] },
      { tag: 'Discover', titulo: 'Everything happening near you', itens: [
        'Welcoming bars, parties, food and culture, on the map and in the agenda',
        'What to do today, what is trending and the team’s picks',
        'Filter by style, audience and distance',
        'Search places, events and itineraries in one place',
      ] },
      { tag: 'Travel', titulo: 'Dicas Trip: travel safely', itens: [
        'Destinations, itineraries and packages made for the community',
        'Welcoming stays and tours',
        'Brazil 2027: Women’s World Cup guide',
        'Useful tips about Brazil in Portuguese, English and Spanish',
      ] },
      { tag: 'Support and earn', titulo: 'Support those who support the cause', itens: [
        'Dicas LGBT+ seal for verified businesses',
        'Coupons and offers with check-in on site',
        'Favorites and alerts only for what you choose',
        'Founding Members and institutional supporters',
      ] },
      { tag: 'Live', titulo: 'You are in control', itens: [
        'Report and block with one tap',
        'Rate the venue and how safe it feels',
        'Chosen name, photo and status are optional: you choose what to show',
        'Only for people aged 18 or over',
      ] },
    ],
  },
  es: {
    subtitulo: 'Conexiones y Experiencias LGBT+',
    missaoRot: 'Nuestra misión',
    missao: 'Hacer la vida LGBTQIA+ más libre, segura y conectada: del bar de la esquina a los viajes por Brasil.',
    objetivoRot: 'Nuestro objetivo',
    objetivo: 'Reunir en un solo lugar los locales, eventos y destinos que acogen de verdad, y fortalecer los negocios que apoyan la causa.',
    saltar: 'Omitir', proximo: 'Siguiente', comecar: 'Empezar', voltar: 'Volver',
    slides: [
      { tag: 'Bienvenide', titulo: '¡Hola! Qué bueno tenerte aquí', itens: [] },
      { tag: 'Descubre', titulo: 'Todo lo que pasa cerca de ti', itens: [
        'Bares, fiestas, gastronomía y cultura que acogen, en el mapa y en la agenda',
        'Qué hacer hoy, lo que está en alza y las recomendaciones del equipo',
        'Filtra por estilo, público y distancia',
        'Busca lugares, eventos e itinerarios en un solo lugar',
      ] },
      { tag: 'Viaja', titulo: 'Dicas Trip: viaja con seguridad', itens: [
        'Destinos, itinerarios y paquetes pensados para la comunidad',
        'Alojamiento acogedor y paseos',
        'Brasil 2027: guía del Mundial Femenino',
        'Consejos útiles de Brasil en portugués, inglés y español',
      ] },
      { tag: 'Apoya y gana', titulo: 'Apoya a quien apoya la causa', itens: [
        'Sello Dicas LGBT+ para negocios verificados',
        'Cupones y ofertas con check-in en el lugar',
        'Favoritos y avisos solo de lo que elijas',
        'Miembros Fundadores y apoyadores institucionales',
      ] },
      { tag: 'Vive', titulo: 'Tú tienes el control', itens: [
        'Denuncia y bloquea con un toque',
        'Valora el espacio y la seguridad del lugar',
        'Nombre social, foto y estado son opcionales: tú eliges qué mostrar',
        'Solo para mayores de 18 años',
      ] },
    ],
  },
};

// Cor e ícones de cada tela (iguais nos três idiomas).
const META = [
  { cor: '#E1306C', icone: 'heart', itens: [] as string[] },
  { cor: '#F5B301', icone: 'compass', itens: ['map-pin', 'zap', 'sliders', 'search'] },
  { cor: '#19C37D', icone: 'globe', itens: ['map', 'home', 'award', 'info'] },
  { cor: '#3B82F6', icone: 'gift', itens: ['check-circle', 'tag', 'bell', 'star'] },
  { cor: '#C026D3', icone: 'shield', itens: ['flag', 'star', 'user', 'lock'] },
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
      {/* manchas de cor ao fundo, na cor da tela atual */}
      <View style={[styles.mancha1, { backgroundColor: cor }]} pointerEvents="none" />
      <View style={[styles.mancha2, { backgroundColor: cor }]} pointerEvents="none" />

      <View style={[styles.topo, { paddingTop: insets.top + 10 }]}>
        <View style={styles.idiomas}>
          {IDIOMAS.map((i) => (
            <TouchableOpacity key={i.code} onPress={() => setIdioma(i.code)} style={[styles.idiomaChip, idioma === i.code && { backgroundColor: cor, borderColor: cor }]} accessibilityRole="button" accessibilityLabel={i.nome}>
              <Text style={[styles.idiomaTxt, idioma === i.code && { color: '#0B0B0E' }]}>{i.sigla}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {atual < ultimo && (
          <TouchableOpacity onPress={concluir} hitSlop={10} accessibilityRole="button">
            <Text style={styles.saltar}>{tx.saltar}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={aoParar} style={{ flex: 1 }}>
        {tx.slides.map((s, n) => (
          <ScrollView key={n} style={{ width }} contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
            {n === 0 ? (
              <>
                <Image source={require('../assets/images/logolinear-semfundo.png')} style={styles.logo} resizeMode="contain" />
                <Text style={[styles.subtitulo, { color: cor }]}>{tx.subtitulo}</Text>
                <View style={[styles.pilula, { borderColor: cor + '88', backgroundColor: cor + '22' }]}>
                  <Text style={[styles.pilulaTxt, { color: cor }]}>{s.tag}</Text>
                </View>
                <Text style={styles.titulo}>{s.titulo}</Text>
                <View style={[styles.caixaMissao, { borderColor: cor + '66' }]}>
                  <Text style={[styles.rotulo, { color: cor }]}>{tx.missaoRot}</Text>
                  <Text style={styles.corpoMissao}>{tx.missao}</Text>
                </View>
                <View style={[styles.caixaMissao, { borderColor: cor + '66' }]}>
                  <Text style={[styles.rotulo, { color: cor }]}>{tx.objetivoRot}</Text>
                  <Text style={styles.corpoMissao}>{tx.objetivo}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.iconeBox, { borderColor: META[n].cor + '66', backgroundColor: META[n].cor + '1F' }]}>
                  <Feather name={META[n].icone as any} size={34} color={META[n].cor} />
                </View>
                <View style={[styles.pilula, { borderColor: META[n].cor + '88', backgroundColor: META[n].cor + '22' }]}>
                  <Text style={[styles.pilulaTxt, { color: META[n].cor }]}>{s.tag}</Text>
                </View>
                <Text style={styles.titulo}>{s.titulo}</Text>
                <View style={styles.linha} />
                {s.itens.map((t, k) => (
                  <View key={k} style={styles.item}>
                    <View style={[styles.itemIcone, { borderColor: META[n].cor + '55', backgroundColor: META[n].cor + '1A' }]}>
                      <Feather name={META[n].itens[k] as any} size={17} color={META[n].cor} />
                    </View>
                    <Text style={styles.itemTxt}>{t}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        ))}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.pontos}>
          {tx.slides.map((_, i) => (
            <View key={i} style={[styles.ponto, i === atual && { width: 28, backgroundColor: cor }]} />
          ))}
        </View>
        <View style={styles.botoes}>
          {atual > 0 && (
            <TouchableOpacity style={styles.btnVoltar} onPress={() => ir(atual - 1)} accessibilityRole="button" accessibilityLabel={tx.voltar}>
              <Feather name="chevron-left" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btnPrincipal, { backgroundColor: cor }]} onPress={() => (atual < ultimo ? ir(atual + 1) : concluir())} accessibilityRole="button">
            <Text style={styles.btnTxt}>{atual < ultimo ? tx.proximo : tx.comecar}</Text>
            <Feather name={atual < ultimo ? 'arrow-right' : 'check'} size={18} color="#0B0B0E" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0B0E' },
  mancha1: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: -150, right: -170, opacity: 0.22 },
  mancha2: { position: 'absolute', width: 520, height: 520, borderRadius: 260, bottom: -230, left: -200, opacity: 0.16 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingBottom: 6 },
  idiomas: { flexDirection: 'row', gap: 8 },
  idiomaChip: { minWidth: 44, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#14141B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  idiomaTxt: { color: '#D6D3E0', fontSize: 12, fontWeight: '800' },
  saltar: { color: '#A9A6BD', fontSize: 15, fontWeight: '700' },
  conteudo: { paddingHorizontal: 26, paddingTop: 18, paddingBottom: 170 },
  logo: { width: 220, height: 56, marginBottom: 6, marginLeft: -4 },
  subtitulo: { fontSize: 14, fontWeight: '700', marginBottom: 20 },
  iconeBox: { width: 76, height: 76, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 22, marginTop: 14 },
  pilula: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 7, marginBottom: 14 },
  pilulaTxt: { fontSize: 15, fontWeight: '800' },
  titulo: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', lineHeight: 38, marginBottom: 16 },
  caixaMissao: { borderWidth: 1, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', padding: 16, marginBottom: 12 },
  rotulo: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  corpoMissao: { color: '#ECEAF5', fontSize: 17, lineHeight: 25, fontWeight: '600' },
  linha: { height: 1, backgroundColor: '#2A2A3A', marginBottom: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  itemIcone: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  itemTxt: { flex: 1, color: '#BDBAD0', fontSize: 16, lineHeight: 23 },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 14, backgroundColor: 'rgba(11,11,14,0.92)' },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  ponto: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#35354A' },
  botoes: { flexDirection: 'row', gap: 12 },
  btnVoltar: { width: 60, height: 58, borderRadius: 18, borderWidth: 1, borderColor: '#2E2E3D', backgroundColor: '#14141B', alignItems: 'center', justifyContent: 'center' },
  btnPrincipal: { flex: 1, height: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnTxt: { color: '#0B0B0E', fontSize: 18, fontWeight: '900' },
});
