// Banner master (patrocínio) das páginas da Home: Em Alta, Recomendados, Top da semana etc.
// Lê categoria_patrocinio pelo `slug` (ex.: 'em-alta'); sem linha ativa, mostra o patrocinador master padrão
// (Vezpa Bar & Rooftop). Mesmo visual do banner principal das categorias.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MODO_DEMONSTRACAO } from '../lib/demo';
import FundoCaixaDegrade from './FundoCaixaDegrade';
import { buscarPatrocinio, Patrocinio, registrarVitrine } from '../lib/vitrine';

// Em demonstração, o espaço aparece escrito "Patrocínio Master"; fora dela, o patrocinador master padrão (Vezpa).
const PADRAO: Patrocinio = MODO_DEMONSTRACAO ? {
  categoria: 'master',
  local_id: null,
  tag: 'ESPAÇO DO PATROCINADOR',
  titulo: 'Patrocínio Master',
  subtitulo: null,
  cta: 'Quero este espaço',
  destino: 'https://www.dicaslgbt.com.br/parceiro-fundador',
  imagem_url: null,
  cor1: '#E1306C',
  cor2: '#7E57C2',
} : {
  categoria: 'master',
  local_id: null,
  tag: 'PATROCINADOR MASTER',
  titulo: 'Vezpa Bar & Rooftop',
  subtitulo: null,
  cta: 'Conhecer',
  destino: '',
  imagem_url: null,
  cor1: '#E1306C',
  cor2: '#7E57C2',
};

function abrir(router: ReturnType<typeof useRouter>, destino: string) {
  if (!destino) return;
  if (destino.startsWith('http')) Linking.openURL(destino).catch(() => {});
  else if (destino.startsWith('local:')) router.push(`/business/${destino.slice(6)}` as any);
  else router.push(destino as any);
}

export default function BannerMaster({ slug, padrao }: { slug: string; padrao?: Patrocinio }) {
  const router = useRouter();
  const [p, setP] = useState<Patrocinio | null>(null);
  const [lido, setLido] = useState(false);

  useEffect(() => {
    let vivo = true;
    buscarPatrocinio(slug).then((r) => { if (vivo) { setP(r); setLido(true); } });
    return () => { vivo = false; };
  }, [slug]);

  const patrocinio = p ?? (lido ? padrao ?? PADRAO : null);
  useEffect(() => {
    if (patrocinio && lido) registrarVitrine(patrocinio.local_id, `patrocinio:${slug}`, 'exibicao');
  }, [patrocinio?.titulo, lido, slug]);
  if (!patrocinio) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={s.patroc}
      onPress={() => {
        registrarVitrine(patrocinio.local_id, `patrocinio:${slug}`, 'clique');
        abrir(router, patrocinio.destino);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${patrocinio.titulo}. ${patrocinio.tag}`}
    >
      <FundoCaixaDegrade id={`bm-${slug}`} cores={[patrocinio.cor1, patrocinio.cor2]} />
      {!!patrocinio.imagem_url && <Image source={{ uri: patrocinio.imagem_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
      {!!patrocinio.imagem_url && <View style={s.veu} />}
      <View style={s.corpo}>
        <View style={s.pilula}>
          <Text style={s.tag} numberOfLines={1}>{patrocinio.tag}</Text>
        </View>
        <Text style={s.titulo} numberOfLines={2}>{patrocinio.titulo}</Text>
        <View style={s.btn}>
          <Text style={s.btnTxt}>{patrocinio.cta}</Text>
          <Feather name="arrow-right" size={14} color="#1A1020" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  patroc: { marginBottom: 14, height: 112, borderRadius: 14, overflow: 'hidden', justifyContent: 'center', backgroundColor: '#161520' },
  veu: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,16,0.45)' },
  corpo: { padding: 14, gap: 6, paddingRight: 24 },
  pilula: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tag: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6 },
  titulo: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', lineHeight: 19 },
  btn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 13, minHeight: 30 },
  btnTxt: { fontSize: 12, fontWeight: '800', color: '#1A1020' },
});
