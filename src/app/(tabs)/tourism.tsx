// Aba "Trip" — Dicas Trip (modo viagem) da nova versão estilo Uber.
//
// Antes esta rota só redirecionava pra /category/turismo. Agora é a aba
// própria do turismo, com dados reais:
//   • locais aprovados de categoria 'turismo' (atalhos de Hospedagem,
//     Agências, Passeios, Roteiros filtram /category/turismo por subcategoria)
//   • pacotes_turismo (migration 034) dos parceiros aprovados
//   • "Dicas úteis sobre o Brasil" (tela /dicas-brasil, conteúdo editorial)
//
// App Store: nada é vendido aqui dentro. Pacote/reserva é feito direto com
// o parceiro (serviço consumido fora do app — 3.1.3(e)), por isso não há
// checkout nem compra in-app. E nada de marca "Copa do Mundo" (FIFA, 5.2).
import { Feather } from '@expo/vector-icons';
import CarrosselAnuncios from '../../components/CarrosselAnuncios';
import FundoCaixaDegrade from '../../components/FundoCaixaDegrade';
import { BotaoVoltar, TituloTela } from '../../components/CabecalhoTela';
import BannerMaster from '../../components/BannerMaster';
import MarcaApp from '../../components/MarcaApp';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSlotHora } from '../../hooks/useSlotHora';
import { useAuth } from '../../lib/authContext';
import { registrarAviso } from '../../lib/avisos';
import { CATEGORIAS } from '../../lib/categorias';
import { IDIOMAS, useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { carregarDestinos, Destino, DESTINOS_PADRAO } from '../../lib/destinos';
import { useRastrearTela } from '../../lib/usoTelas';

const C = {
  bg: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  text: '#F5F5F7',
  dim: '#A0A0B2',
  pink: '#E1306C',
  purple: '#7E57C2',
  tile: '#E8E0F6',
  tileText: '#0B0B0E',
  tileDim: '#55546A',
};

const CIDADES_SEDE = ['Rio de Janeiro', 'São Paulo', 'Belo Horizonte', 'Brasília', 'Salvador', 'Recife', 'Fortaleza', 'Porto Alegre'];

// Destinos em destaque = cidades já catalogadas (tabela `destinos`, com
// padrão em src/lib/destinos.ts). Cada card abre /destino/[slug].


// Atalhos → listagem real de turismo filtrada pela subcategoria (texto livre
// cadastrado pelo parceiro), via parâmetro `tipo` de /category/[id].
const SERVICOS: readonly { chave: string; icone: string; tipo: string; degrade: [string, string] }[] = [
  { chave: 'trip.roteiros', icone: 'map', tipo: 'roteiro|tour|guia', degrade: ['#E1306C', '#9B3CFF'] },
  { chave: 'trip.hospedagem', icone: 'home', tipo: 'hotel|pousada|hostel|hosped', degrade: ['#7E57C2', '#3B82F6'] },
  { chave: 'trip.pacotes', icone: 'package', tipo: 'pacote|agência|agencia', degrade: ['#FF8A3D', '#E1306C'] },
  { chave: 'trip.passeios', icone: 'compass', tipo: 'passeio|ponto|atração|atracao|museu', degrade: ['#10B981', '#0E7490'] },
  { chave: 'trip.agencias', icone: 'briefcase', tipo: 'agência|agencia|operadora', degrade: ['#E8A317', '#B45309'] },
  { chave: 'trip.eventos', icone: 'calendar', tipo: '', degrade: ['#C026A3', '#6D3FD1'] },
];

const DEGRADES_DESTINO: [string, string][] = [
  ['#0E9F6E', '#0E7490'],
  ['#2563EB', '#7E57C2'],
  ['#F59E0B', '#E1306C'],
  ['#E1306C', '#7E57C2'],
  ['#6366F1', '#EC4899'],
  ['#0EA5E9', '#4338CA'],
];

// Cores da bandeira do Brasil: verde, amarelo e azul. No amarelo o texto é escuro (leitura).
const DICAS: readonly { secao: string; icone: string; degrade: [string, string]; texto: string }[] = [
  { secao: 'seguranca', icone: 'shield', degrade: ['#00A63F', '#007A33'], texto: '#FFFFFF' },
  { secao: 'direitos', icone: 'heart', degrade: ['#FFE23A', '#F5B800'], texto: '#1A1405' },
  { secao: 'transporte', icone: 'navigation', degrade: ['#1D4FBF', '#002776'], texto: '#FFFFFF' },
  { secao: 'pagamentos', icone: 'credit-card', degrade: ['#009C3B', '#12337F'], texto: '#FFFFFF' },
];

const TITULO_DICA: Record<string, Record<string, string>> = {
  seguranca: { pt: 'Segurança e ajuda', en: 'Safety & help', es: 'Seguridad y ayuda' },
  direitos: { pt: 'Seus direitos LGBT+', en: 'Your LGBTQ+ rights', es: 'Tus derechos LGBT+' },
  transporte: { pt: 'Como se locomover', en: 'Getting around', es: 'Cómo moverse' },
  pagamentos: { pt: 'Pix e pagamentos', en: 'Pix & payments', es: 'Pix y pagos' },
};

interface Pacote {
  id: string;
  local_id: string;
  nome: string;
  descricao: string | null;
  preco_de: number | null;
  foto_url: string | null;
  locais: { nome: string; cidade: string | null; status: string } | null;
}

export default function TripScreen() {
  useRastrearTela('trip');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, idioma, proximoIdioma } = useI18n();
  const idiomaAtual = IDIOMAS.find((i) => i.code === idioma) || IDIOMAS[0];
  const [busca, setBusca] = useState('');
  const [destinos, setDestinos] = useState<Destino[]>(DESTINOS_PADRAO);
  // Com 3 estados ou mais, aparece o filtro por estado acima dos destinos.
  const slotDestino = useSlotHora(360);

  useEffect(() => {
    carregarDestinos().then(setDestinos);
  }, []);

  // Janela de até 6 destinos; avança de 6 em 6 a cada 6 horas.
  const destinosHora = useMemo(() => {
    if (destinos.length === 0) return [];
    const ord = destinos.slice().sort((a, b) => a.slug.localeCompare(b.slug));
    const inicio = (((slotDestino * 6) % ord.length) + ord.length) % ord.length;
    return [...ord.slice(inicio), ...ord.slice(0, inicio)].slice(0, 6);
  }, [destinos, slotDestino]);

  const abrirTurismo = (params: { title: string; search?: string; tipo?: string }) => {
    router.push({
      pathname: '/category/turismo' as any,
      params: {
        title: encodeURIComponent(params.title),
        ...(params.search ? { search: encodeURIComponent(params.search) } : {}),
        ...(params.tipo ? { tipo: encodeURIComponent(params.tipo) } : {}),
      },
    });
  };

  // Cartão da Copa (com as cidades-sede) usado dentro do carrossel de banners.
  const heroCopa = (
    <View style={[styles.hero, { marginHorizontal: 0 }]}>
          <Text style={styles.heroTag}>JUN–JUL 2027</Text>
          <Text style={styles.heroTitulo}>{t('trip.brasilTitulo')}</Text>
          <Text style={styles.heroSub}>{t('trip.brasilSub')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
            {CIDADES_SEDE.map((cidade) => (
              <TouchableOpacity key={cidade} style={styles.cidadeChip} onPress={() => abrirTurismo({ title: cidade, search: cidade })}>
                <Text style={styles.cidadeChipTxt}>{cidade}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.heroBtn}
            activeOpacity={0.85}
            onPress={() =>
              registrarAviso({
                userId: user?.id,
                alvo: 'brasil2027',
                alvoLabel: 'Brasil 2027',
                t,
                irParaLogin: () => router.push('/(tabs)/profile'),
              })
            }
          >
            <Text style={styles.heroBtnTxt}>{t('home.brasil2027Cta')}</Text>
          </TouchableOpacity>
        </View>
  );

  const buscar = () => {
    if (!busca.trim()) return;
    abrirTurismo({ title: busca.trim(), search: busca.trim() });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho igual ao de Início/Eventos/Conta: logo + frase à esquerda,
            idioma à direita; título da tela logo abaixo (mesmo tamanho de "Eventos"). */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BotaoVoltar />
            <View>
              <MarcaApp />
            </View>
          </View>
          <TouchableOpacity
            style={styles.idiomaBtn}
            onPress={proximoIdioma}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${t('conta.idioma')}: ${idiomaAtual.nome}`}
          >
            <Feather name="globe" size={14} color={C.text} />
            <Text style={styles.idiomaTxt}>{idiomaAtual.sigla}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tituloArea}>
          <TituloTela
            semMargem
            titulo={t('trip.titulo')}
            subtitulo={t('trip.sub')}
            tituloMenu="Ir para"
            opcoes={SERVICOS.map((s) => ({ id: s.chave, label: t(s.chave), icone: s.icone }))}
            onEscolher={(id) => {
              const s = SERVICOS.find((x) => x.chave === id);
              if (!s) return;
              if (s.chave === 'trip.eventos') router.push('/(tabs)/events');
              else if (s.chave === 'trip.roteiros') router.push('/roteiros' as any);
              else if (s.chave === 'trip.pacotes') router.push('/pacotes' as any);
              else abrirTurismo({ title: t(s.chave), tipo: s.tipo });
            }}
          />
        </View>

        {/* Busca */}
        <View style={styles.busca}>
          <Feather name="search" size={20} color={C.text} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={buscar}
            returnKeyType="search"
            placeholder={t('trip.busca')}
            placeholderTextColor={C.dim}
            style={styles.buscaInput}
            accessibilityLabel={t('trip.busca')}
          />
        </View>

        {/* Patrocinador master da Trip (categoria_patrocinio, slug 'trip'); sem patrocínio cadastrado, o Museu da Diversidade. */}
        <View style={{ paddingHorizontal: 16 }}>
          <BannerMaster
            slug="trip"
            padrao={{
              categoria: 'trip',
              local_id: null,
              tag: t('home.anuncioMuseuTag'),
              titulo: t('home.anuncioMuseuTitulo'),
              subtitulo: null,
              cta: t('home.anuncioMuseuCta'),
              destino: '/apoiador/museu-diversidade',
              imagem_url: null,
              cor1: '#6D28D9',
              cor2: '#DB2777',
            }}
          />
        </View>
        {/* Planeje sua viagem */}
        <View style={styles.iconesLinha}>
          {SERVICOS.map((s) => (
            <TouchableOpacity
              key={s.chave}
              style={styles.iconeItem}
              activeOpacity={0.75}
              onPress={() =>
                s.chave === 'trip.eventos'
                  ? router.push('/(tabs)/events')
                  : s.chave === 'trip.roteiros'
                  ? router.push('/roteiros' as any)
                  : s.chave === 'trip.pacotes'
                  ? router.push('/pacotes' as any)
                  : abrirTurismo({ title: t(s.chave), tipo: s.tipo })
              }
              accessibilityRole="button"
              accessibilityLabel={t(s.chave)}
            >
              <View style={styles.iconeCirculo}>
                <Feather name={s.icone as any} size={20} color={CATEGORIAS.turismo.color} />
              </View>
              <Text style={styles.iconeTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1}>{t(s.chave)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Destinos em destaque: até 6 por vez, no mesmo formato das ofertas, trocando a cada 6 horas. */}
        {destinosHora.length > 0 && (
          <View style={styles.gradeDestinos}>
            {destinosHora.map((d, idx) => (
              <TouchableOpacity
                key={d.slug}
                style={styles.destinoTile}
                activeOpacity={0.9}
                onPress={() => router.push(`/destino/${d.slug}` as any)}
                accessibilityRole="button"
                accessibilityLabel={`${d.cidade}, ${d.uf}`}
              >
                <FundoCaixaDegrade id={`dst-${d.slug}`} cores={DEGRADES_DESTINO[(idx + slotDestino) % DEGRADES_DESTINO.length]} />
                {!!d.foto_url && <Image source={{ uri: d.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                {!!d.foto_url && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,6,16,0.5)' }]} />}
                <Feather name="map-pin" size={22} color="#FFFFFF" />
                <Text style={styles.destinoTileTxt} numberOfLines={2}>{d.cidade}</Text>
                <Text style={styles.destinoTileUf}>{d.uf}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Dicas úteis sobre o Brasil */}
        <Text style={styles.secao}>{t('trip.dicasBrasil')}</Text>
        <View style={styles.gradeDicas}>
          {DICAS.map((d) => (
            <TouchableOpacity
              key={d.secao}
              style={styles.dica}
              onPress={() => router.push({ pathname: '/dicas-brasil' as any, params: { secao: d.secao } })}
              accessibilityRole="button"
            >
              <FundoCaixaDegrade id={`dica-${d.secao}`} cores={d.degrade} />
              <Feather name={d.icone as any} size={20} color={d.texto} />
              <Text style={[styles.dicaTxt, { color: d.texto }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1}>{TITULO_DICA[d.secao][idioma]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, marginBottom: 18 },
  logo: { width: 140, height: 34 },
  appSub: { fontSize: 11, fontWeight: '500', color: C.dim, marginTop: 2 },
  tituloArea: { paddingHorizontal: 16, marginTop: 0, marginBottom: 12 },
  titulo: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32, color: C.text },
  sub: { fontSize: 13, color: '#8A8A9E', marginTop: 6, lineHeight: 18 },
  idiomaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  idiomaTxt: { fontSize: 12, fontWeight: '800', color: C.text },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 14,
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.border,
  },
  buscaInput: { flex: 1, color: C.text, fontSize: 14, fontWeight: '700' },
  hero: { marginHorizontal: 16, borderRadius: 18, padding: 16, backgroundColor: C.tile, gap: 6 },
  heroTag: { fontSize: 11, fontWeight: '800', color: C.purple, letterSpacing: 0.6 },
  heroTitulo: { fontSize: 18, fontWeight: '800', color: C.tileText, lineHeight: 21 },
  heroSub: { fontSize: 13, color: C.tileDim },
  cidadeChip: { backgroundColor: '#F4F0FA', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  cidadeChipTxt: { fontSize: 12, fontWeight: '700', color: C.tileText },
  heroBtn: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: C.pink, borderRadius: 20, paddingHorizontal: 16, minHeight: 40, justifyContent: 'center' },
  heroBtnTxt: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  // Título de seção no mesmo padrão de todas as telas (17/800).
  secao: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 28, marginBottom: 12, paddingHorizontal: 16 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  tile: { width: '31.5%', height: 92, borderRadius: 14, backgroundColor: C.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 8 },
  gradeDestinos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 20 },
  destinoTile: { width: '31.5%', height: 92, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6, backgroundColor: C.card },
  destinoTileTxt: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  destinoTileUf: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.8)' },
  iconesLinha: { flexDirection: 'row', paddingHorizontal: 16, gap: 4 },
  iconeItem: { flex: 1, alignItems: 'center', gap: 5 },
  iconeCirculo: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  iconeTxt: { fontSize: 10, lineHeight: 12, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', alignSelf: 'stretch' },
  tileTxt: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  aviso: { fontSize: 12, color: C.dim, paddingHorizontal: 16, marginTop: 10 },
  ufChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  ufChipAtivo: { backgroundColor: C.purple, borderColor: C.purple },
  ufChipTxt: { color: C.dim, fontSize: 12, fontWeight: '800' },
  destino: { width: 168, height: 200, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 12, justifyContent: 'space-between', overflow: 'hidden' },
  destinoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  destinoUf: { fontSize: 11, fontWeight: '800', color: C.dim },
  destinoTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(126,87,194,0.25)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  destinoTagTxt: { fontSize: 9, fontWeight: '800', color: '#B39DDB', letterSpacing: 0.4 },
  destinoCta: { fontSize: 12, fontWeight: '800', color: '#4CAF7D', marginTop: 2 },
  destinoNome: { fontSize: 14, fontWeight: '800', color: C.text },
  destinoVibe: { fontSize: 12, color: C.dim },
  vazio: { fontSize: 13, color: C.dim, lineHeight: 19 },
  pacote: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  pacoteFoto: { width: 60, height: 60, borderRadius: 12, backgroundColor: C.card },
  pacoteNome: { fontSize: 14, fontWeight: '800', color: C.text },
  pacoteMeta: { fontSize: 12, color: C.dim, marginTop: 2 },
  pacotePreco: { fontSize: 12, fontWeight: '700', color: C.pink, marginTop: 2 },
  gradeDicas: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  dica: { flex: 1, height: 92, borderRadius: 14, backgroundColor: C.card, overflow: 'hidden', paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 8 },
  dicaTxt: { fontSize: 11, fontWeight: '800', color: C.text, textAlign: 'center' },
});
