// Página interna de um Membro Apoiador (apoio cultural). Conteúdo em src/lib/apoiadores.ts.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FundoCaixaDegrade from '../../components/FundoCaixaDegrade';
import { APOIADORES } from '../../lib/apoiadores';
import { useI18n } from '../../lib/i18n';
import MarcaApp from '../../components/MarcaApp';

const L = {
  sobre: { pt: 'Sobre', en: 'About', es: 'Sobre' },
  prog: { pt: 'O que acontece lá', en: 'What happens there', es: 'Qué pasa allí' },
  rota: { pt: 'Traçar rota', en: 'Get directions', es: 'Cómo llegar' },
  site: { pt: 'Visitar o site', en: 'Visit website', es: 'Visitar el sitio' },
  insta: { pt: 'Instagram', en: 'Instagram', es: 'Instagram' },
  roteiros: { pt: 'Ver roteiros pelo centro', en: 'See downtown itineraries', es: 'Ver rutas por el centro' },
  horarios: { pt: 'Horários', en: 'Hours', es: 'Horarios' },
  nota: {
    pt: 'Apoio cultural: o museu apoia o Dicas LGBT+. Consulte a programação atualizada com a própria instituição.',
    en: 'Cultural supporter: the museum supports Dicas LGBT+. Check the current schedule with the institution.',
    es: 'Apoyo cultural: el museo apoya Dicas LGBT+. Consulta la programación actual con la institución.',
  },
  naoEncontrado: { pt: 'Página não encontrada.', en: 'Page not found.', es: 'Página no encontrada.' },
};

export default function ApoiadorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { idioma } = useI18n();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const a = slug ? APOIADORES[slug] : undefined;

  const topo = (
    <View style={styles.topo}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Voltar">
        <Feather name="arrow-left" size={18} color="#F5F5F7" />
      </TouchableOpacity>
      <MarcaApp />
    </View>
  );

  if (!a) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {topo}
        <Text style={styles.vazio}>{L.naoEncontrado[idioma]}</Text>
      </View>
    );
  }

  const abrir = (url: string) => Linking.openURL(url).catch(() => {});
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.endereco || a.buscaMapa)}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {topo}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}>
        <View style={styles.hero}>
          <FundoCaixaDegrade id={`apoio-${a.slug}`} cores={a.cores} />
          {!!a.fotoUrl && <Image source={{ uri: a.fotoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          {!!a.fotoUrl && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)' }]} />}
          <View style={styles.selo}>
            <Feather name="award" size={12} color="#0B0B0E" />
            <Text style={styles.seloTxt}>{a.tag[idioma]}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {a.logoUrl ? (
            <View style={styles.logoBox}>
              <Image source={{ uri: a.logoUrl }} style={styles.logo} resizeMode="contain" />
            </View>
          ) : !a.fotoUrl ? (
            <Feather name={a.icone as any} size={34} color="#FFFFFF" />
          ) : null}
          <Text style={styles.chamada}>{a.chamada[idioma]}</Text>
          <Text style={styles.nome}>{a.nome}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.p}>{a.resumo[idioma]}</Text>
          <Text style={styles.destaqueTxt}>{a.sobre[idioma]}</Text>
          {!!a.endereco && <Text style={styles.p}>{a.endereco}</Text>}
          {!!a.horarios && (
            <Text style={styles.p}>
              {L.horarios[idioma]}: {a.horarios[idioma]}
            </Text>
          )}
        </View>

        <View style={styles.acoes}>
          <TouchableOpacity style={[styles.btn, styles.btnPrim]} onPress={() => abrir(mapa)} accessibilityRole="button" accessibilityLabel={L.rota[idioma]}>
            <Feather name="navigation" size={16} color="#0B0B0E" />
            <Text style={styles.btnPrimTxt}>{L.rota[idioma]}</Text>
          </TouchableOpacity>
          {!!a.site && (
            <TouchableOpacity style={styles.btn} onPress={() => abrir(a.site!)} accessibilityRole="link" accessibilityLabel={L.site[idioma]}>
              <Feather name="globe" size={16} color="#F5F5F7" />
              <Text style={styles.btnTxt}>{L.site[idioma]}</Text>
            </TouchableOpacity>
          )}
          {!!a.instagram && (
            <TouchableOpacity style={styles.btn} onPress={() => abrir(a.instagram!)} accessibilityRole="link" accessibilityLabel={L.insta[idioma]}>
              <Feather name="instagram" size={16} color="#F5F5F7" />
              <Text style={styles.btnTxt}>{L.insta[idioma]}</Text>
            </TouchableOpacity>
          )}
        </View>

        {a.mostrarProgramas && (
          <>
            <Text style={styles.hSecao}>{L.prog[idioma]}</Text>
            {a.programas.map((p) => (
              <View key={p.titulo.pt} style={styles.prog}>
                <View style={styles.progIcone}>
                  <Feather name={p.icone as any} size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.progTitulo}>{p.titulo[idioma]}</Text>
                  <Text style={styles.progTxt}>{p.texto[idioma]}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={styles.nota}>{L.nota[idioma]}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#232230' },
  headerLogo: { width: 140, height: 34 },
  vazio: { color: '#C9C8D6', padding: 24, fontSize: 14 },
  hero: { borderRadius: 18, padding: 18, overflow: 'hidden', gap: 6, minHeight: 240 },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#FFD36A', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  seloTxt: { fontSize: 10, fontWeight: '800', color: '#0B0B0E', letterSpacing: 0.6 },
  logoBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 8, alignSelf: 'flex-start' },
  logo: { width: 120, height: 48 },
  chamada: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  nome: { fontSize: 14, fontWeight: '700', color: '#F5F0FF' },
  destaqueTxt: { fontSize: 15, lineHeight: 21, fontWeight: '800', color: '#4A1D7A' },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1C1B26', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 44 },
  btnPrim: { backgroundColor: '#FFD36A' },
  btnTxt: { color: '#F5F5F7', fontSize: 13, fontWeight: '700' },
  btnPrimTxt: { color: '#0B0B0E', fontSize: 13, fontWeight: '800' },
  card: { backgroundColor: '#E8E0F6', borderRadius: 14, padding: 14, gap: 8 },
  h: { fontSize: 15, fontWeight: '800', color: '#0B0B0E' },
  p: { fontSize: 13, lineHeight: 19, color: '#1C1B26' },
  hSecao: { fontSize: 16, fontWeight: '800', color: '#F5F5F7', marginTop: 4 },
  prog: { flexDirection: 'row', gap: 12, backgroundColor: '#15141C', borderRadius: 14, padding: 12, alignItems: 'center' },
  progIcone: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#6D28D9', alignItems: 'center', justifyContent: 'center' },
  progTitulo: { fontSize: 14, fontWeight: '800', color: '#F5F5F7' },
  progTxt: { fontSize: 12, lineHeight: 17, color: '#C9C8D6', marginTop: 2 },
  nota: { fontSize: 11, lineHeight: 16, color: '#8F8EA3', textAlign: 'center', marginTop: 4 },
});
