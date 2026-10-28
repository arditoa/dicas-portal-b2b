import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIAS, CATEGORIA_REAL_LABEL, CategoriaSlugUI } from '../../lib/categorias';
import { useAuth } from '../../lib/authContext';
import { compararDestaque, deveExibirGlow, deveIncluirEm, emAltaDaHora } from '../../lib/destaque';
import { CONFIG_RODIZIO_PADRAO, ConfigRodizio, lerConfigRodizio } from '../../lib/rodizioConfig';
import { useSlotHora } from '../../hooks/useSlotHora';
import { textoLocalizacao } from '../../lib/localizacao';
import { formatarNome } from '../../lib/texto';
import { abertoAgora } from '../../lib/horario';
import { rotuloTag } from '../../lib/taxonomia';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';
import { useRastrearTela } from '../../lib/usoTelas';
import FiltrosPilulas, { FiltroDef } from '../../components/FiltrosPilulas';
import CabecalhoTela from '../../components/CabecalhoTela';
import VitrineCategoria from '../../components/VitrineCategoria';
import { Anuncio } from '../../components/CarrosselAnuncios';
import { buscarIdsFundadores } from '../../lib/vitrine';

// Rodada 41 — mapeia o categoria_tipo real (enum do banco) pra o mesmo
// slug de seção usado em destaque_secao_fixada (ver /admin), pra fixação
// manual de destaque funcionar também nas páginas de categoria. Sem
// entrada aqui (ex.: a página "Todos") = essa página nunca casa com uma
// fixação — só segue prioridade de plano + rotação semanal.
const SECAO_POR_CATEGORIA_REAL: Record<string, string> = {
  lugares: 'bares',
  gastronomia: 'gastronomia',
  cultura: 'cultura',
  turismo: 'turismo',
};

// Prioridade de plano na lista (menor = aparece antes). Só conta plano com status ativo.
function ordemPlano(l: { plano_comercial?: string | null; plano_comercial_status?: string | null }): number {
  if ((l.plano_comercial_status ?? 'ativo') !== 'ativo') return 3;
  switch (l.plano_comercial) {
    case 'fundador':
    case 'premium':
      return 0;
    case 'intermediario':
      return 1;
    case 'starter':
      return 2;
    default:
      return 3;
  }
}

// Filtros mostrados nas páginas de categoria (Trip mantém os seus). Lista provisória — a Andrea ainda vai definir.
const FILTROS_CATEGORIA = ['perto', 'aberto', 'bairro'];

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
  safeSpace: '#4CAF7D',
  gold: '#FFD54F',
};

// Filtro "Perto de mim": rótulo mostrado -> raio em km.
const RAIOS_KM: Record<string, number> = {
  'Até 1 km': 1,
  'Até 3 km': 3,
  'Até 5 km': 5,
  'Até 10 km': 10,
  'Até 25 km': 25,
};

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface LocalItem {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  bairro: string | null;
  bairro_exibicao?: string | null;
  cidade: string;
  foto_capa_url: string | null;
  safe_space: boolean;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  destaque_secao_fixada: string | null;
  destaque_secoes: string[] | null;
  destaque_ate: string | null;
  plano_comercial?: string | null;
  plano_comercial_status?: string | null;
  experiencias: string[] | null;
  rating_media: number;
  rating_total: number;
  lat: number | null;
  lng: number | null;
  logo_url?: string | null;
  galeria_fotos?: string[] | null;
  atributos?: { comodidades?: string[] } | null;
  tipo_hospedagem?: string | null;
  horario_funcionamento?: any;
}

export default function CategoryListScreen() {
  useRastrearTela('categoria', { detalheParam: 'id' });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();

  const { id, title, search, experiencia, tipo } = useLocalSearchParams<{
    id: string;
    title?: string;
    search?: string;
    experiencia?: string;
    // Nova versão (Dicas Trip): atalhos "Hospedagem", "Agências" etc.
    // mandam palavras-chave separadas por "|" pra filtrar pela
    // subcategoria (texto livre) — ex.: "hotel|pousada|hostel".
    tipo?: string;
  }>();
  const palavrasTipo = (tipo ? decodeURIComponent(tipo.toString()) : '')
    .toLowerCase()
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
  const slug = (id || '').toString().toLowerCase();
  const isTodos = slug === 'todos';
  // Rodada 44 — chips "Escolha pela experiência" da Home agora mandam o
  // slug real (locais.experiencias, migration 025) pra filtrar de
  // verdade aqui, em vez de só um título decorativo (era o bug que a
  // Andrea pediu pra corrigir).
  const experienciaSlug = experiencia ? decodeURIComponent(experiencia) : null;

  const categoriaConfig = CATEGORIAS[slug as CategoriaSlugUI];
  const categoriaReal = isTodos ? null : categoriaConfig?.categoriaReal ?? slug;
  const decodedTitle = title
    ? decodeURIComponent(title)
    : categoriaConfig?.label || (categoriaReal ? CATEGORIA_REAL_LABEL[categoriaReal] : 'Todos os Locais');

  const [loading, setLoading] = useState(true);
  const [locais, setLocais] = useState<LocalItem[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);

  // null = ainda não escolheu: abre em "Em Alta" só se houver quem entre ali (e não veio de busca, tag ou atalho).
  const [selectedSubcat, setSelectedSubcat] = useState<string | null>(null);
  // Filtros em pílulas (todas as categorias): id do filtro -> opção escolhida.
  const [filtros, setFiltros] = useState<Record<string, string | undefined>>({});
  const maxDistance = filtros.perto ? RAIOS_KM[filtros.perto] ?? 999 : 999;
  const [searchQuery, setSearchQuery] = useState(search ? decodeURIComponent(search) : '');

  const { coords, loading: loadingLocation, errorMsg: locationError } = useLocation(maxDistance !== 999);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('locais')
        .select(
          'id, nome, categoria, subcategoria, bairro, bairro_exibicao, cidade, foto_capa_url, safe_space, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, plano_comercial, plano_comercial_status, experiencias, rating_media, rating_total, lat, lng, logo_url, galeria_fotos, atributos, tipo_hospedagem, horario_funcionamento'
        )
        .eq('status', 'aprovado')
        .limit(1000);

      if (categoriaReal) query = query.eq('categoria', categoriaReal);
      // "Destaques" = Membros Fundadores (selo real em local_badges).
      if (slug === 'destaques') {
        const idsFund = await buscarIdsFundadores();
        query = query.in('id', idsFund.length > 0 ? idsFund : ['00000000-0000-0000-0000-000000000000']);
      }
      if (experienciaSlug) query = query.contains('experiencias', [experienciaSlug]);

      const { data, error } = await query;
      if (error) throw error;

      const itens = ((data as any) || []) as LocalItem[];
      const secaoDestaque = categoriaReal ? SECAO_POR_CATEGORIA_REAL[categoriaReal] || 'nenhuma' : 'nenhuma';
      // Quem paga (selo DESTAQUE) ou foi fixado vem primeiro; depois a ordem de sempre.
      const cmp = compararDestaque<LocalItem>(secaoDestaque);
      // Ordem da lista: Premium/Fundador primeiro, depois Intermediário, depois os demais (Starter, Freemium).
      // Dentro de cada grupo vale a ordem de sempre (fixados no /admin, rotação, nome).
      itens.sort((a, b) => ordemPlano(a) - ordemPlano(b) || Number(deveExibirGlow(b)) - Number(deveExibirGlow(a)) || cmp(a, b));
      setLocais(itens);

      if (user?.id && itens.length > 0) {
        const { data: favs } = await supabase
          .from('favoritos_locais')
          .select('local_id')
          .eq('user_id', user.id)
          .in('local_id', itens.map((i) => i.id));
        setFavoritos((favs || []).map((f: any) => f.local_id));
      } else {
        setFavoritos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar categoria:', err);
      setLocais([]);
    } finally {
      setLoading(false);
    }
  }, [categoriaReal, experienciaSlug, user?.id, slug]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (locationError) {
      Alert.alert('Localização', 'Não conseguimos acessar sua localização. Mostrando todas as distâncias.');
      setFiltros((f) => ({ ...f, perto: undefined }));
    }
  }, [locationError]);

  // Páginas de experiência (Dates, Dançar, Drag Show, Karaokê…) usam a MESMA regra de Em Alta
  // da Home (emAltaDaHora): pagantes/fixados primeiro e, com "completar" ligado no /admin, as
  // vagas que sobram em rodízio com locais que têm foto. Assim toda experiência tem Em Alta.
  // Categorias seguem a regra antiga: plano pago ativo ou fixado no /admin.
  const [cfgRodizio, setCfgRodizio] = useState<ConfigRodizio>(CONFIG_RODIZIO_PADRAO);
  useEffect(() => {
    if (!experienciaSlug) return;
    let vivo = true;
    lerConfigRodizio().then((c) => { if (vivo) setCfgRodizio(c); }).catch(() => {});
    return () => { vivo = false; };
  }, [experienciaSlug]);
  const slotRodizio = useSlotHora(cfgRodizio.intervaloMin);
  const idsEmAlta = useMemo(() => {
    if (experienciaSlug) {
      return new Set(emAltaDaHora(locais, slotRodizio, cfgRodizio.tamanho, cfgRodizio.completarEmAlta).map((l) => l.id));
    }
    return new Set(locais.filter((l) => deveIncluirEm(l, 'em_alta')).map((l) => l.id));
  }, [locais, experienciaSlug, slotRodizio, cfgRodizio]);
  const qtdEmAlta = idsEmAlta.size;
  const temEmAlta = qtdEmAlta > 0;
  // Páginas de experiência (Dates, Dançar, Drag Show, Música ao vivo, Karaokê) seguem o
  // modelo de Em Alta: abrem em "Em Alta" quando há ao menos 3; senão, em "Todas".
  const abrirEmAlta = experienciaSlug ? qtdEmAlta >= 3 : temEmAlta;
  // Páginas de experiência mantêm Em Alta/Todas. Categorias usam banners de subcategoria: selectedSubcat guarda a chave
  // da subcategoria aberta ('' = Outros) e null = ainda na tela de banners.
  const subcatAtiva = experienciaSlug ? (selectedSubcat ?? (abrirEmAlta && !search && !tipo ? 'Em Alta' : 'Todas')) : (selectedSubcat ?? 'Todas');

  // Atalhos da Trip (Hospedagem, Passeios, Agências...): filtros em pílulas, no mesmo padrão
  // dos Roteiros. As opções saem só dos locais DESSE atalho (antes saíam de tudo e apareciam
  // pílulas sem resultado, como "Agência on-line" em Hospedagem).
  const modoTrip = palavrasTipo.length > 0;
  const locaisDoTipo = useMemo(
    () => (modoTrip ? locais.filter((l) => palavrasTipo.some((p) => (l.subcategoria || '').toLowerCase().includes(p))) : locais),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locais, tipo]
  );
  // Pílulas de filtro de TODAS as categorias. Cada categoria mostra só o que faz sentido
  // para ela, e cada pílula só aparece se existir ao menos uma opção com resultado.
  const filtrosDef = useMemo<FiltroDef[]>(() => {
    const unicos = (xs: (string | null | undefined)[]) =>
      Array.from(new Set(xs.filter((x): x is string => !!x && x.trim().length > 0))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const base = modoTrip ? locaisDoTipo : locais;
    const cidades = unicos(base.map((l) => l.cidade));
    const bairros = unicos(base.map((l) => l.bairro_exibicao || l.bairro));
    const comNota = base.some((l) => (l.rating_total || 0) > 0 && (l.rating_media || 0) >= 4);
    const lista: FiltroDef[] = [];
    // "Perto de mim": útil em tudo — em casa (bares, comida) e em viagem (hotel, passeio).
    lista.push({ id: 'perto', label: 'Perto de mim', icone: 'navigation', opcoes: base.some((l) => l.lat != null && l.lng != null) ? Object.keys(RAIOS_KM) : [], valor: filtros.perto });
    if (modoTrip) {
      lista.push({ id: 'cidade', label: 'Destino', icone: 'map-pin', opcoes: cidades, valor: filtros.cidade });
      lista.push({ id: 'tipo', label: 'Tipo', icone: 'sliders', opcoes: unicos(base.map((l) => l.subcategoria)), valor: filtros.tipo });
      lista.push({ id: 'comodidade', label: 'Comodidades', icone: 'check-circle', opcoes: unicos(base.flatMap((l) => l.atributos?.comodidades || [])), valor: filtros.comodidade });
    } else {
      lista.push({ id: 'aberto', label: 'Aberto agora', icone: 'clock', opcoes: base.some((l) => abertoAgora(l)) ? ['Aberto agora'] : [], valor: filtros.aberto });
      lista.push({ id: 'experiencia', label: 'Experiência', icone: 'star', opcoes: unicos(base.flatMap((l) => (l.experiencias || []).map(rotuloTag))), valor: filtros.experiencia });
      lista.push({ id: 'cidade', label: 'Cidade', icone: 'map-pin', opcoes: cidades.length > 1 ? cidades : [], valor: filtros.cidade });
      lista.push({ id: 'bairro', label: 'Bairro', icone: 'home', opcoes: bairros.length > 1 && bairros.length <= 40 ? bairros : [], valor: filtros.bairro });
    }
    lista.push({ id: 'nota', label: 'Avaliação', icone: 'thumbs-up', opcoes: comNota ? ['4+ estrelas', '4,5+ estrelas'] : [], valor: filtros.nota });
    lista.push({ id: 'selo', label: 'Selo', icone: 'shield', opcoes: base.some((l) => l.safe_space) ? ['Safe Space'] : [], valor: filtros.selo });
    // Categorias: poucos filtros (a lista exata ainda será definida). Para mudar, ajuste FILTROS_CATEGORIA.
    return modoTrip ? lista : lista.filter((f) => FILTROS_CATEGORIA.includes(f.id));
  }, [locais, locaisDoTipo, modoTrip, filtros]);

  const subcategoriasList = useMemo(() => {
    const reais = Array.from(
      new Set(locais.map((l) => l.subcategoria).filter((s): s is string => !!s && s.trim().length > 0))
    );
    return [...(temEmAlta ? ['Em Alta'] : []), 'Todas', ...reais];
  }, [locais, temEmAlta]);

  const handleToggleFavorito = async (localId: string) => {
    if (!session || !user) {
      Alert.alert(
        'Salvar nos Favoritos',
        'Crie sua conta ou entre em poucos segundos para guardar seus locais preferidos.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Entrar / Criar Conta', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    const jaFavoritado = favoritos.includes(localId);
    try {
      if (jaFavoritado) {
        await supabase.from('favoritos_locais').delete().eq('local_id', localId).eq('user_id', user.id);
        setFavoritos(favoritos.filter((id) => id !== localId));
      } else {
        await supabase.from('favoritos_locais').insert({ local_id: localId, user_id: user.id });
        setFavoritos([...favoritos, localId]);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível atualizar seus favoritos.');
    }
  };

  // Em "Destaques" o espaço fixo de patrocínio mostra o Dicas Trip enquanto não houver patrocinador.
  const bannerTrip: Anuncio = {
    id: 'trip',
    chave: 'trip',
    tag: 'DICAS TRIP',
    titulo: 'Viaje pelo Brasil com quem entende a comunidade',
    cta: 'Explorar a Trip',
    icone: 'compass',
    cor: '#10B981',
    degrade: ['#10B981', '#0E7490'],
    onPress: () => router.push('/(tabs)/tourism' as any),
  };

  const filteredPlaces = locais
    .map((item) => {
      const distanceKm =
        coords && item.lat != null && item.lng != null
          ? distanciaKm(coords.latitude, coords.longitude, item.lat, item.lng)
          : null;
      return { ...item, distanceKm };
    })
    .filter((item) => {
      const matchesFiltros =
        (!filtros.cidade || item.cidade === filtros.cidade) &&
        (!filtros.tipo || item.subcategoria === filtros.tipo) &&
        (!filtros.comodidade || (item.atributos?.comodidades || []).includes(filtros.comodidade)) &&
        (!filtros.bairro || (item.bairro_exibicao || item.bairro) === filtros.bairro) &&
        (!filtros.aberto || abertoAgora(item)) &&
        (!filtros.experiencia || (item.experiencias || []).some((e) => rotuloTag(e) === filtros.experiencia)) &&
        (!filtros.nota || ((item.rating_total || 0) > 0 && (item.rating_media || 0) >= (filtros.nota.startsWith('4,5') ? 4.5 : 4))) &&
        (!filtros.selo || item.safe_space);

      const matchesSubcat = modoTrip
        ? true
        : experienciaSlug
        ? subcatAtiva === 'Em Alta'
          ? idsEmAlta.has(item.id)
          : subcatAtiva === 'Todas' || item.subcategoria === subcatAtiva
        : true;

      const matchesTipo =
        palavrasTipo.length === 0 ||
        palavrasTipo.some((p) => (item.subcategoria || '').toLowerCase().includes(p));

      const matchesDistance = maxDistance === 999 || (item.distanceKm != null && item.distanceKm <= maxDistance) || (item.distanceKm == null && !coords);

      const matchesSearch =
        !searchQuery.trim() ||
        item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.bairro || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cidade.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFiltros && matchesSubcat && matchesTipo && matchesDistance && matchesSearch;
    });

  // Filtros: ficam logo depois do patrocínio fixo (ou das ofertas, se não houver patrocínio), dentro do cabeçalho
  // da lista. Com busca ativa ou subcategoria aberta (sem vitrine), aparecem no topo da lista.
  const filtrosNode = (
    <View style={styles.filterSection}>
      <FiltrosPilulas
        filtros={filtrosDef}
        onSelecionar={(id, v) => setFiltros((f) => ({ ...f, [id]: v }))}
        onLimpar={() => setFiltros({})}
      />
      {loadingLocation && maxDistance !== 999 && <ActivityIndicator size="small" color={COLORS.pink} style={{ marginTop: 6 }} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <CabecalhoTela titulo={decodedTitle} />

        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Buscar em ${decodedTitle}...`}
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {!modoTrip && !!experienciaSlug && subcategoriasList.length > 1 && (
          <View style={styles.filterSection}>
            <FlatList
              horizontal
              data={subcategoriasList}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
              renderItem={({ item }) => {
                const isSelected = subcatAtiva === item;
                const isEmAlta = item === 'Em Alta';
                return (
                  <TouchableOpacity
                    style={[styles.chip, isSelected && styles.chipActive, isEmAlta && !isSelected && styles.chipEmAltaInactive]}
                    onPress={() => setSelectedSubcat(item)}
                    activeOpacity={0.8}
                  >
                    {isEmAlta && (
                      <Feather name="trending-up" size={12} color={isSelected ? '#FFF' : COLORS.gold} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive, isEmAlta && !isSelected && { color: COLORS.gold }]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={COLORS.pink} />
          </View>
        ) : (
          <FlatList
            data={filteredPlaces}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              searchQuery.trim() ? (
                <View style={{ marginHorizontal: -16 }}>{filtrosNode}</View>
              ) : (
                <>
                  <VitrineCategoria
                    slug={slug}
                    titulo={decodedTitle}
                    categoriaReal={categoriaReal}
                    locais={locais}
                    fundadores={slug === 'destaques'}
                    bannerPadrao={slug === 'destaques' ? bannerTrip : undefined}
                    aposPatrocinio={filtrosNode}
                  />
                </>
              )
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              (
              <View style={styles.emptyContainer}>
                <Feather name="compass" size={32} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>
                  {locais.length > 0
                    ? 'Nada encontrado com esses filtros'
                    : experienciaSlug
                    ? 'Ainda não temos locais com essa experiência'
                    : 'Nenhum local por aqui ainda'}
                </Text>
                <Text style={styles.emptySub}>
                  {locais.length > 0
                    ? 'Tente outra busca, outra distância ou a opção "Todas".'
                    : experienciaSlug
                    ? 'Estamos cadastrando novos lugares. Volte em breve ou explore as outras experiências.'
                    : 'Novos locais aparecem aqui assim que forem aprovados pelo time.'}
                </Text>
              </View>
              )
            }
            renderItem={({ item }) => {
              const isFavorited = favoritos.includes(item.id);
              return (
                <TouchableOpacity
                  style={styles.placeCard}
                  onPress={() => router.push(`/business/${item.id}` as any)}
                  activeOpacity={0.88}
                >
                  <View style={styles.placeThumb}>
                    {item.foto_capa_url ? (
                      <Image source={{ uri: item.foto_capa_url }} style={styles.placeThumbImg} />
                    ) : (
                      <Feather name="map-pin" size={20} color={COLORS.pink} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.placeHeaderRow}>
                      <Text style={styles.placeName} numberOfLines={1}>{formatarNome(item.nome)}</Text>
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.favBtn}
                          onPress={() => handleToggleFavorito(item.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Feather name="heart" size={16} color={isFavorited ? COLORS.pink : COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.placeSubcat}>{item.subcategoria || CATEGORIA_REAL_LABEL[item.categoria] || item.categoria}</Text>
                    <Text style={styles.placeAddress}>{textoLocalizacao(item)}</Text>

                    <View style={styles.placeFooterRow}>
                      {item.distanceKm != null ? (
                        <Text style={styles.placeDistance}>{`${item.distanceKm.toFixed(1)} km`}</Text>
                      ) : (
                        <View />
                      )}
                      <View style={styles.ratingBadge}>
                        <Feather name="star" size={12} color={COLORS.gold} />
                        <Text style={styles.ratingText}>
                          {item.rating_total > 0 ? item.rating_media.toFixed(1) : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },

  headerBlock: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerLogo: { width: 140, height: 34 },
  categoryTitleText: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 14, height: 42, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 12 },

  filterSection: { marginBottom: 10 },
  chipsContainer: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  chipEmAltaInactive: { borderColor: 'rgba(255, 213, 79, 0.4)', backgroundColor: 'rgba(255, 213, 79, 0.08)' },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  distanceSection: { paddingHorizontal: 16, marginBottom: 12 },
  distanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  distanceSectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  distanceRow: { flexDirection: 'row', gap: 8 },
  distChip: { flex: 1, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  distChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  distChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  distChipTextActive: { color: '#FFF', fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 12 },
  emptyContainer: { alignItems: 'center', gap: 8, paddingTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6 },
  emptySub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  placeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 12 },
  placeThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  placeThumbImg: { width: 48, height: 48 },
  placeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  placeName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vipBadge: { backgroundColor: 'rgba(225, 48, 108, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vipBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.pink },
  favBtn: { padding: 2 },
  placeSubcat: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  placeAddress: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  placeFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  placeDistance: { fontSize: 11, fontWeight: '700', color: COLORS.safeSpace },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
});
