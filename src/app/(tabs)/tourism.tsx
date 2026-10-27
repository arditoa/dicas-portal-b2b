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
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/authContext';
import { registrarAviso } from '../../lib/avisos';
import { useAnunciosApp } from '../../lib/banners';
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
  const { t, idioma, setIdioma } = useI18n();
  const [busca, setBusca] = useState('');
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [destinos, setDestinos] = useState<Destino[]>(DESTINOS_PADRAO);
  // Com 3 estados ou mais, aparece o filtro por estado acima dos destinos.
  const [ufFiltro, setUfFiltro] = useState<string | null>(null);

  useEffect(() => {
    carregarDestinos().then(setDestinos);
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from('pacotes_turismo')
        .select('id, local_id, nome, descricao, preco_de, foto_url, locais!inner(nome, cidade, status)')
        .eq('ativo', true)
        .eq('locais.status', 'aprovado')
        .order('ordem', { ascending: true })
        .limit(10);
      if (!ativo) return;
      setPacotes(((data as any) || []) as Pacote[]);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

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
  const { anuncios: anunciosApp, aoExibir: aoExibirBanner } = useAnunciosApp('trip', { custom: { brasil2027: heroCopa } });

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
          <View>
            <Image source={require('../../assets/images/logolinear-semfundo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Dicas LGBT+" />
            <Text style={styles.appSub}>{t('app.subtitulo')}</Text>
          </View>
          <View style={styles.idiomas}>
            {IDIOMAS.map((i) => (
              <TouchableOpacity
                key={i.code}
                onPress={() => setIdioma(i.code)}
                style={[styles.idiomaBtn, idioma === i.code && styles.idiomaBtnAtivo]}
                accessibilityRole="button"
                accessibilityState={{ selected: idioma === i.code }}
                accessibilityLabel={i.nome}
              >
                <Text style={[styles.idiomaTxt, idioma === i.code && { color: '#FFFFFF' }]}>{i.sigla}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.tituloArea}>
          <Text style={styles.titulo}>{t('trip.titulo')}</Text>
          <Text style={styles.sub}>{t('trip.sub')}</Text>
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

        {/* Brasil 2027 + banners (museu, Embratur, Câmara…) em carrossel. O cartão da Copa
            mantém as cidades-sede; os outros vêm da tabela banners_app (painel /admin). */}
        <CarrosselAnuncios
          onExibir={aoExibirBanner}
          anuncios={anunciosApp ? anunciosApp : [
            { id: 'brasil2027', tag: '', titulo: '', cta: '', icone: 'globe', cor: '#E1306C', onPress: () => {}, custom: heroCopa },
            { id: 'museu', chave: 'museu', tag: t('home.anuncioMuseuTag'), titulo: t('home.anuncioMuseuTitulo'), cta: t('home.anuncioMuseuCta'), icone: 'book-open', cor: '#6D28D9', degrade: ['#6D28D9', '#DB2777'], onPress: () => router.push('/apoiador/museu-diversidade' as any) },
          ]}
        />
        {/* Planeje sua viagem */}
        <Text style={styles.secao}>{t('trip.planeje')}</Text>
        <View style={styles.grade}>
          {SERVICOS.map((s) => (
            <TouchableOpacity
              key={s.chave}
              style={styles.tile}
              activeOpacity={0.85}
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
              <FundoCaixaDegrade id={`trip-${s.chave}`} cores={s.degrade} />
              <Feather name={s.icone as any} size={22} color="#FFFFFF" />
              <Text style={styles.tileTxt}>{t(s.chave)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.aviso}>{t('trip.parceiroAviso')}</Text>

        {/* Destinos */}
        <Text style={styles.secao}>{t('trip.destinos')}</Text>
        {(() => {
          const ufs = Array.from(new Set(destinos.map((d) => d.uf))).sort();
          if (ufs.length < 3) return null;
          return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
              {[null, ...ufs].map((uf) => {
                const ativo = ufFiltro === uf;
                return (
                  <TouchableOpacity key={uf || 'todos'} onPress={() => setUfFiltro(uf)} style={[styles.ufChip, ativo && styles.ufChipAtivo]}>
                    <Text style={[styles.ufChipTxt, ativo && { color: '#FFF' }]}>{uf || 'Todos'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          );
        })()}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {destinos.filter((d) => !ufFiltro || d.uf === ufFiltro).map((d) => (
            <TouchableOpacity key={d.slug} style={styles.destino} onPress={() => router.push(`/destino/${d.slug}` as any)}>
              {d.foto_url ? (
                <>
                  <Image source={{ uri: d.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
                </>
              ) : null}
              <View style={styles.destinoTopo}>
                <Feather name="map-pin" size={22} color={C.pink} />
                <Text style={styles.destinoUf}>{d.uf}</Text>
              </View>
              <View style={{ gap: 4 }}>
                <View style={styles.destinoTag}><Text style={styles.destinoTagTxt}>{t('trip.tagDestino')}</Text></View>
                <Text style={styles.destinoNome} numberOfLines={2}>{d.cidade}</Text>
                <Text style={styles.destinoVibe} numberOfLines={2}>{d.vibe[idioma]}</Text>
                <Text style={styles.destinoCta}>{t('trip.verGuia')} →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Pacotes dos parceiros (dados reais) */}
        <Text style={styles.secao}>{t('trip.pacotesDestaque')}</Text>
        <View style={{ paddingHorizontal: 16 }}>
          {!carregando && pacotes.length === 0 ? (
            <Text style={styles.vazio}>{t('trip.semPacotes')}</Text>
          ) : (
            pacotes.map((p) => (
              <TouchableOpacity key={p.id} style={styles.pacote} onPress={() => router.push(`/business/${p.local_id}` as any)}>
                {p.foto_url ? (
                  <Image source={{ uri: p.foto_url }} style={styles.pacoteFoto} />
                ) : (
                  <View style={[styles.pacoteFoto, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Feather name="map" size={20} color={C.dim} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.pacoteNome} numberOfLines={1}>{p.nome}</Text>
                  <Text style={styles.pacoteMeta} numberOfLines={1}>
                    {[p.locais?.nome, p.locais?.cidade].filter(Boolean).join(' · ')}
                  </Text>
                  {p.preco_de != null && (
                    <Text style={styles.pacotePreco}>
                      {t('trip.aPartirDe')} R$ {Number(p.preco_de).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={C.dim} />
              </TouchableOpacity>
            ))
          )}
        </View>

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
              <Text style={[styles.dicaTxt, { color: d.texto }]}>{TITULO_DICA[d.secao][idioma]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, marginBottom: 16 },
  logo: { width: 140, height: 34 },
  appSub: { fontSize: 11, fontWeight: '500', color: C.dim, marginTop: 2 },
  tituloArea: { paddingHorizontal: 16 },
  titulo: { fontSize: 20, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.dim, marginTop: 4 },
  idiomas: { flexDirection: 'row', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 3 },
  idiomaBtn: { minWidth: 34, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  idiomaBtnAtivo: { backgroundColor: C.pink },
  idiomaTxt: { fontSize: 11, fontWeight: '800', color: C.text },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    paddingHorizontal: 18,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.border,
  },
  buscaInput: { flex: 1, color: C.text, fontSize: 15, fontWeight: '700' },
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
  gradeDicas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  dica: { width: '48.5%', minHeight: 84, borderRadius: 14, backgroundColor: C.card, overflow: 'hidden', padding: 14, gap: 8 },
  dicaTxt: { fontSize: 13, fontWeight: '800', color: C.text },
});
