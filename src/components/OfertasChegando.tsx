// Faixa "Ofertas chegando": cupons dos parceiros em quadradinhos (3 por linha), até 6 por vez, a janela avança
// a cada 6 horas. Mesma regra da vitrine das categorias: só plano Intermediário (e ofertas criadas pela equipe).
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import FundoCaixaDegrade from './FundoCaixaDegrade';
import { MODO_DEMONSTRACAO } from '../lib/demo';
import { useSlotHora } from '../hooks/useSlotHora';
import { buscarOfertas, OfertaVitrine, registrarVitrine } from '../lib/vitrine';

const POR_VEZ = 6;
const INTERVALO_MIN = 360;
const DEGRADES: [string, string][] = [
  ['#E1306C', '#7E57C2'],
  ['#7E57C2', '#2563EB'],
  ['#0E9F6E', '#0E7490'],
  ['#F59E0B', '#E1306C'],
  ['#6366F1', '#EC4899'],
  ['#2563EB', '#7E57C2'],
];

const planoComOferta = (o: OfertaVitrine) =>
  o.equipe || (o.plano_comercial === 'intermediario' && (o.plano_comercial_status ?? 'ativo') === 'ativo');

type Props = {
  slug: string; // nome da seção na medição (ex.: 'trip')
  categoriaReal: string | string[] | null;
  titulo?: string; // sem título = visual mais limpo
  rotuloLocal?: string; // nome da página nos espaços de demonstração (ex.: Dicas Trip)
  vazio?: string; // sem texto = não mostra nada quando não há ofertas
};

export default function OfertasChegando({ slug, categoriaReal, titulo, vazio, rotuloLocal = '' }: Props) {
  const router = useRouter();
  const slot = useSlotHora(INTERVALO_MIN);
  const [ofertas, setOfertas] = useState<OfertaVitrine[]>([]);

  useEffect(() => {
    let vivo = true;
    buscarOfertas({ categoriaReal }).then((o) => { if (vivo) setOfertas(o); });
    return () => { vivo = false; };
  }, [categoriaReal]);

  const naHora = useMemo(() => {
    const ord = ofertas.filter(planoComOferta).sort((a, b) => (a.equipe ? 0 : 1) - (b.equipe ? 0 : 1) || a.id.localeCompare(b.id));
    if (ord.length === 0) return [];
    const inicio = (((slot * POR_VEZ) % ord.length) + ord.length) % ord.length;
    return [...ord.slice(inicio), ...ord.slice(0, inicio)].slice(0, POR_VEZ);
  }, [ofertas, slot]);

  useEffect(() => {
    naHora.forEach((o) => registrarVitrine(o.local_id, `oferta:${slug}`, 'exibicao'));
  }, [naHora, slug]);

  return (
    <View style={{ marginTop: naHora.length > 0 || !!vazio || MODO_DEMONSTRACAO ? 20 : 0 }}>
      {!!titulo && <Text style={s.titulo}>{titulo}</Text>}
      {naHora.length > 0 || MODO_DEMONSTRACAO ? (
        <View style={s.grade}>
          {naHora.map((o, idx) => (
            <TouchableOpacity
              key={o.id}
              activeOpacity={0.9}
              style={s.card}
              onPress={() => {
                registrarVitrine(o.local_id, `oferta:${slug}`, 'clique');
                router.push(`/business/${o.local_id}` as any);
              }}
              accessibilityRole="button"
              accessibilityLabel={o.titulo}
            >
              <FundoCaixaDegrade id={`ofc-${slug}-${o.id}`} cores={DEGRADES[(idx + slot) % DEGRADES.length]} />
              {!!o.imagem_url && <Image source={{ uri: o.imagem_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
              {!!o.imagem_url && <View style={s.veu} />}
              <Feather name="tag" size={22} color="#FFFFFF" />
              <Text style={s.cardTxt} numberOfLines={2}>{o.titulo}</Text>
            </TouchableOpacity>
          ))}
          {/* Demonstração: vagas ainda sem anunciante, escritas como se estivesse tudo cheio. */}
          {MODO_DEMONSTRACAO && Array.from({ length: Math.max(0, POR_VEZ - naHora.length) }).map((_, k) => {
            const n = naHora.length + k + 1;
            const rotulo = `Banner ${n} Intermediário ${rotuloLocal}`;
            return (
              <View key={`demo-${n}`} style={s.card} accessibilityLabel={rotulo}>
                <FundoCaixaDegrade id={`ofcd-${slug}-${n}`} cores={DEGRADES[n % DEGRADES.length]} />
                <Feather name="tag" size={20} color="#FFFFFF" />
                <Text style={[s.cardTxt, { fontSize: 11 }]} numberOfLines={3}>{rotulo}</Text>
              </View>
            );
          })}
        </View>
      ) : !!vazio ? (
        <View style={s.vazio}>
          <Feather name="gift" size={14} color="#E1306C" />
          <Text style={s.vazioTxt}>{vazio}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  titulo: { fontSize: 15, fontWeight: '800', color: '#F5F5F7', marginTop: 28, marginBottom: 12, paddingHorizontal: 16 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  card: { width: '31.5%', height: 92, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6, backgroundColor: '#161520' },
  veu: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,16,0.5)' },
  cardTxt: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.28)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  vazio: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  vazioTxt: { flex: 1, fontSize: 11, color: '#A0A0B2' },
});
