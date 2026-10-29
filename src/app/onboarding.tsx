// Abertura do app (primeira vez): 5 telas leves, no mesmo visual da Home (logo no topo, caixas com
// degradê, ícones em círculo), com a missão e o objetivo do Dicas LGBT+ e um resumo do que dá para fazer.
// Idioma PT/EN/ES num botão só no topo (igual à Home). Quem já viu não vê de novo
// (chave em AsyncStorage); a Conta tem um atalho para rever.
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FundoCaixaDegrade from '../components/FundoCaixaDegrade';
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

// Degradê (os mesmos das caixas da Home), cor de destaque e ícones de cada tela.
const META: { degrade: [string, string]; cor: string; icone: string; itens: string[]; icones: { icone: string; cor?: string }[] }[] = [
  { degrade: ['#E1306C', '#7E57C2'], cor: '#E1306C', icone: 'heart', itens: [],
    icones: [{ icone: 'moon', cor: '#E1306C' }, { icone: 'coffee', cor: '#FBBF24' }, { icone: 'music', cor: '#FFB74D' }, { icone: 'book-open', cor: '#38BDF8' }, { icone: 'compass', cor: '#81C784' }, { icone: 'briefcase', cor: '#60A5FA' }] },
  { degrade: ['#C026A3', '#6D3FD1'], cor: '#E879F9', icone: 'compass', itens: ['moon', 'zap', 'map'],
    icones: [{ icone: 'moon' }, { icone: 'coffee' }, { icone: 'music' }, { icone: 'book-open' }, { icone: 'map' }] },
  { degrade: ['#0EA5E9', '#4338CA'], cor: '#38BDF8', icone: 'globe', itens: ['map-pin', 'home', 'info'],
    icones: [{ icone: 'home' }, { icone: 'compass' }, { icone: 'map' }, { icone: 'briefcase' }, { icone: 'calendar' }] },
  // Segurança: verde (cor de "espaço seguro"), diferente do azul de antes.
  { degrade: ['#10B981', '#047857'], cor: '#34D399', icone: 'shield', itens: ['flag', 'user', 'lock'],
    icones: [{ icone: 'shield' }, { icone: 'slash' }, { icone: 'user' }, { icone: 'lock' }, { icone: 'check-circle' }] },
];

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
          <ScrollView key={n} style={{ width }} contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
            <Text style={[styles.titulo, n === 0 && { marginTop: 4 }]}>{s.titulo}</Text>

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
                  <Feather name={META[n].icone as any} size={130} color="rgba(255,255,255,0.12)" style={styles.heroMarca} />
                  <View style={styles.heroPilula}>
                    <Text style={styles.heroPilulaTxt}>{s.tag}</Text>
                  </View>
                  <View style={styles.heroIcones}>
                    {META[n].icones.map((ic, k) => (
                      <View key={k} style={styles.heroIconeItem}>
                        <View style={styles.heroIconeCirculo}>
                          <Feather name={ic.icone as any} size={19} color="#FFFFFF" />
                        </View>
                        <Text style={styles.heroIconeTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1}>{s.icones[k]}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {n === 0 ? (
              <View style={styles.cartao}>
                <Text style={[styles.rotulo, { color: cor }]}>{tx.objetivoRot}</Text>
                <Text style={styles.corpo}>{tx.objetivo}</Text>
              </View>
            ) : null}
            {n === 0 ? (
              <View style={styles.categoriasLinha}>
                {META[0].icones.map((ic, k) => (
                  <View key={k} style={styles.catItem}>
                    <View style={styles.catCirculo}>
                      <Feather name={ic.icone as any} size={20} color={ic.cor} />
                    </View>
                    <Text style={styles.catTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1}>{s.icones[k]}</Text>
                  </View>
                ))}
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
  idiomaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  idiomaTxt: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  conteudo: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 150 },
  hero: { height: 170, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', marginBottom: 16 },
  heroTexto: { padding: 20, gap: 8 },
  heroRotulo: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroMissao: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  heroMarca: { position: 'absolute', right: -10, bottom: -16 },
  heroIcone: { position: 'absolute', top: 16, left: 16, width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroPilula: { position: 'absolute', left: 16, top: 16, backgroundColor: 'rgba(11,11,14,0.4)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  heroPilulaTxt: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  heroIcones: { position: 'absolute', left: 10, right: 10, bottom: 14, flexDirection: 'row', justifyContent: 'space-between' },
  heroIconeItem: { flex: 1, alignItems: 'center', gap: 5 },
  heroIconeCirculo: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  heroIconeTxt: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '600', textAlign: 'center', alignSelf: 'stretch' },
  categoriasLinha: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  catItem: { flex: 1, alignItems: 'center', gap: 5 },
  catCirculo: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', alignItems: 'center', justifyContent: 'center' },
  catTxt: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '600', textAlign: 'center', alignSelf: 'stretch' },
  titulo: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 14 },
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
