// Nov/2026 (18/11) — Dicas Trip › Roteiros: a grade com todos os destinos (cidades) e os eventos especiais
// (Carnaval, Parada SP, Copa 2027…). Eventos primeiro, depois cidades abertas, depois as "em breve".
// Cada cartão abre /destino/[slug] (roteiro da cidade com banners próprios). Equipe edita em Modo equipe › Vitrine › Dicas Trip.
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CabecalhoTela from '../components/CabecalhoTela';
import CartaoDestino from '../components/CartaoDestino';
import { TITULO_SECAO } from '../constants/theme';
import { useAuth } from '../lib/authContext';
import { registrarAviso } from '../lib/avisos';
import { carregarDestinos, Destino, DESTINOS_PADRAO, ordenarDestinos } from '../lib/destinos';
import { useI18n } from '../lib/i18n';
import { useRastrearTela } from '../lib/usoTelas';


export default function DestinosTrip() {
  useRastrearTela('trip');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuth();
  const [destinos, setDestinos] = useState<Destino[]>(DESTINOS_PADRAO);
  useEffect(() => { void carregarDestinos().then(setDestinos); }, []);
  const lista = useMemo(() => ordenarDestinos(destinos), [destinos]);
  const eventos = lista.filter((d) => d.evento);
  const cidades = lista.filter((d) => !d.evento);
  const breve = (d: Destino) => registrarAviso({ userId: user?.id, alvo: `destino-${d.slug}`, alvoLabel: d.cidade, t, irParaLogin: () => router.push('/(tabs)/profile') });

  const grade = (itens: Destino[], base: number) => (
    <View style={s.grade}>
      {itens.map((d, i) => (
        <CartaoDestino key={d.slug} d={d} idx={base + i} largura="31.5%" emBreveTxt={t('home.emBreve')} onAbrir={() => router.push(`/destino/${d.slug}` as any)} onBreve={() => router.push(`/destino/${d.slug}` as any)} />
      ))}
    </View>
  );

  return (
    <View style={[s.tela, { paddingTop: insets.top }]}>
      <CabecalhoTela titulo="Destinos" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Text style={s.titulo}>Destinos e viagens</Text>
        <Text style={s.sub}>Escolha o destino: cada cidade tem seus roteiros LGBT+, a melhor época e as casas parceiras.</Text>
        {eventos.length > 0 && (<><Text style={s.secao}>Eventos especiais</Text>{grade(eventos, 0)}</>)}
        <Text style={s.secao}>Destinos</Text>
        {grade(cidades, eventos.length)}
        <TouchableOpacity style={s.mais} onPress={() => router.push('/roteiros' as any)} accessibilityRole="button">
          <Feather name="map" size={16} color="#E1306C" />
          <Text style={s.maisTxt}>Roteiros prontos e experiências</Text>
          <Feather name="chevron-right" size={16} color="#E1306C" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0B0E' },
  titulo: { ...TITULO_SECAO, marginTop: 8, marginLeft: 16 },
  sub: { color: '#A0A0B2', fontSize: 13, marginHorizontal: 16, marginTop: 6, lineHeight: 18 },
  secao: { color: '#F5F5F7', fontSize: 14, fontWeight: '800', marginLeft: 16, marginTop: 22, marginBottom: 10 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  mais: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#232230', backgroundColor: '#161520' },
  maisTxt: { flex: 1, color: '#F5F5F7', fontSize: 14, fontWeight: '700' },
});
