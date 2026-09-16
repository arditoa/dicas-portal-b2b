import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/authContext';
import { CATEGORIA_REAL_LABEL, CATEGORIAS, CATEGORIA_ORDER, CategoriaConfig } from '../../lib/categorias';
import { supabase } from '../../lib/supabase';

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

const PLANO_PRIORIDADE: Record<string, number> = { vip: 0, destaque: 1, basico: 2 };

const EXPERIENCIAS = [
  'Aniversário',
  'Predominância lésbica',
  'Predominância Gay',
  'Date',
  'Rolê com amigos',
  'Dançar',
  'Música ao vivo',
  'Karaokê',
  'Drag show',
  'Comer bem',
  'Happy hour',
  'Cultura',
  'Relaxar',
  'Conhecer pessoas',
  'Aula de dança',
  'Aula de forró',
];

const BANNERS_PRINCIPAIS = [
  {
    id: 'b1',
    tag: 'MEMBRO FUNDADOR',
    titulo: 'Conheça os selos oficiais',
    sub: 'Locais que constroem nossa comunidade desde o início',
    cor: '#FFD54F',
    route: '/experience/Membro%20Fundador',
  },
  {
    id: 'b2',
    tag: 'DESTAQUE DA SEMANA',
    titulo: 'Espaços em destaque',
    sub: 'Experiências exclusivas e atendimento acolhedor',
    cor: '#E1306C',
    route: '/experience/Destaque',
  },
  {
    id: 'b3',
    tag: 'CUPONS EXCLUSIVOS',
    titulo: 'Economize nos seus Rolês',
    sub: 'Crie sua conta e garanta seus cupons com os parceiros',
    cor: '#7E57C2',
    route: '/(tabs)/profile',
  },
  {
    id: 'b4',
    tag: 'SEJA UM PARCEIRO',
    titulo: 'Cadastre seu Estabelecimento',
    sub: 'Divulgue seu espaço para a nossa comunidade',
    cor: '#4CAF7D',
    route: '/(tabs)/profile',
  },
];

interface LocalCard {
  id: string;
  nome: string;
  categoria: string;
  bairro: string | null;
  cidade: string;
  instagram: string | null;
  foto_capa_url: string | null;
  rating_media: number;
  rating_total: number;
  plano_destaque: 'basico' | 'destaque' | 'vip';
}

interface EventoHoje {
  id: string;
  titulo: string;
  data_inicio: string;
  locais: { nome: string; bairro: string | null } | null;
}

interface LocalTurismo {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  descricao: string | null;
  plano_destaque: 'basico' | 'destaque' | 'vip';
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();

  const [busca, setBusca] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const [emAlta, setEmAlta] = useState<LocalCard[]>([]);
  const [agendaHoje, setAgendaHoje] = useState<EventoHoje[]>([]);
  const [dicasTrip, setDicasTrip] = useState<LocalTurismo[]>([]);
  const [loading, setLoading] = useState(true);

  const isUserLogged = !!session;

  const carregarHome = useCallback(async () => {
    setLoading(true);
    try {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const fimHoje = new Date();
      fimHoje.setHours(23, 59, 59, 999);

      const [emAltaRes, agendaRes, tripRes] = await Promise.all([
        supabase
          .from('locais')
          .select('id, nome, categoria, bairro, cidade, instagram, foto_capa_url, rating_media, rating_total, plano_destaque')
          .eq('status', 'aprovado')
          .limit(20),
        supabase
          .from('eventos')
          .select('id, titulo, data_inicio, locais(nome, bairro)')
          .eq('status', 'aprovado')
          .gte('data_inicio', inicioHoje.toISOString())
          .lte('data_inicio', fimHoje.toISOString())
          .order('data_inicio', { ascending: true })
          .limit(5),
        supabase
          .from('locais')
          .select('id, nome, categoria, subcategoria, descricao, plano_destaque')
          .eq('status', 'aprovado')
          .eq('categoria', 'turismo')
          .limit(10),
      ]);

      let listaEmAlta = ((emAltaRes.data as any) || []) as LocalCard[];
      listaEmAlta.sort((a, b) => (PLANO_PRIORIDADE[a.plano_destaque] ?? 2) - (PLANO_PRIORIDADE[b.plano_destaque] ?? 2));
      setEmAlta(listaEmAlta.slice(0, 8));

      setAgendaHoje(((agendaRes.data as any) || []) as EventoHoje[]);

      let listaTrip = ((tripRes.data as any) || []) as LocalTurismo[];
      listaTrip.sort((a, b) => (PLANO_PRIORIDADE[a.plano_destaque] ?? 2) - (PLANO_PRIORIDADE[b.plano_destaque] ?? 2));
      setDicasTrip(listaTrip.slice(0, 8));

      if (user?.id) {
        const idsParaChecar = [...listaEmAlta.map((i) => i.id), ...listaTrip.map((i) => i.id)];
        if (idsParaChecar.length > 0) {
          const { data: favs } = await supabase
            .from('favoritos_locais')
            .select('local_id')
            .eq('user_id', user.id)
            .in('local_id', idsParaChecar);
          setFavoritos((favs || []).map((f: any) => f.local_id));
        }
      } else {
        setFavoritos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar Home:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregarHome();
  }, [carregarHome]);

  const handleToggleFavorito = async (localId: string) => {
    if (!isUserLogged || !user) {
      Alert.alert(
        'Salvar nos Favoritos',
        'Crie sua conta ou entre em poucos segundos para salvar seus locais favoritos.',
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

  const handleOpenInstagram = (handle: string) => {
    const limpo = handle.replace(/^@/, '');
    Linking.openURL(`https://instagram.com/${limpo}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o Instagram.');
    });
  };

  const handleCategoryPress = (cat: CategoriaConfig) => {
    if (cat.emBreve) return;

    if (cat.slug === 'festas') {
      router.push('/(tabs)/events');
      return;
    }

    router.push({
      pathname: `/category/${cat.slug}` as any,
      params: { title: encodeURIComponent(cat.label) },
    });
  };

  const openExperienceScreen = (exp: string) => {
    router.push({
      pathname: '/category/todos' as any,
      params: { title: encodeURIComponent(exp) },
    });
  };

  const handleBuscar = () => {
    if (!busca.trim()) return;
    router.push({
      pathname: '/category/todos' as any,
      params: { title: encodeURIComponent('Resultados da busca'), search: encodeURIComponent(busca.trim()) },
    });
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerEsquerda}>
          <Image
            source={require('../../assets/images/logolinear-semfundo.png')}
            style={styles.logoLinear}
            resizeMode="contain"
          />
          <Text style={styles.appSubtitulo}>Conexões e Experiências LGBT+</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <Feather name="user" size={18} color="#D0D0E0" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BUSCA */}
        <View style={styles.buscaContainer}>
          <Feather name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={handleBuscar}
            returnKeyType="search"
            placeholder="Buscar por nome, bairro ou local (ex: São Paulo)..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.buscaInput}
          />
        </View>

        {/* BANNERS PRINCIPAIS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bannerScrollView}
          contentContainerStyle={styles.bannerScrollContent}
          decelerationRate="fast"
          snapToInterval={332}
          snapToAlignment="start"
        >
          {BANNERS_PRINCIPAIS.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.bannerCard}
              activeOpacity={0.85}
              onPress={() => router.push(b.route as any)}
            >
              <View style={[styles.bannerTag, { backgroundColor: b.cor }]}>
                <Text style={styles.bannerTagText}>{b.tag}</Text>
              </View>
              <Text style={styles.bannerTitle}>{b.titulo}</Text>
              <Text style={styles.bannerSub}>{b.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CATEGORIAS */}
        <View style={styles.secaoBloco}>
          <Text style={styles.sectionTituloPadrao}>Categorias</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriaScrollContent}>
            {CATEGORIA_ORDER.map((slug) => {
              const cat = CATEGORIAS[slug];
              return (
                <TouchableOpacity
                  key={slug}
                  style={styles.categoriaHorizontalItem}
                  onPress={() => handleCategoryPress(cat)}
                  activeOpacity={cat.emBreve ? 1 : 0.7}
                >
                  <View style={[styles.categoriaCircle, cat.emBreve && styles.categoriaDisabled]}>
                    <Feather name={cat.icon as any} size={22} color={cat.emBreve ? COLORS.purple : cat.color} />
                    {cat.emBreve && (
                      <View style={styles.emBreveBadge}>
                        <Text style={styles.emBreveTexto}>Em breve</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.categoriaLabel, cat.emBreve && { color: COLORS.textMuted }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* EM ALTA */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="trending-up" size={16} color={COLORS.gold} />
              <Text style={styles.sectionTitulo}>Em Alta</Text>
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/category/todos' as any, params: { title: encodeURIComponent('Em Alta') } })}>
              <Text style={styles.sectionVerTudo}>Ver mais</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.pink} style={{ marginLeft: 16 }} />
          ) : emAlta.length === 0 ? (
            <View style={styles.emptyInlineBox}>
              <Text style={styles.emptyInlineText}>
                Ainda não há locais aprovados. Assim que os primeiros cadastros forem aprovados
                pelo portal, eles aparecem aqui.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
              {emAlta.map((item) => {
                const isFavorited = favoritos.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.emAltaCard}
                    onPress={() => router.push(`/business/${item.id}` as any)}
                    activeOpacity={0.88}
                  >
                    {item.foto_capa_url && (
                      <>
                        <Image
                          source={{ uri: item.foto_capa_url }}
                          style={StyleSheet.absoluteFillObject}
                          resizeMode="cover"
                        />
                        <View style={styles.emAltaOverlay} />
                      </>
                    )}
                    <View style={styles.emAltaHeaderRow}>
                      <View style={styles.emAltaCategoryBadge}>
                        <Text style={styles.emAltaCategoryText}>{CATEGORIA_REAL_LABEL[item.categoria] || item.categoria}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleFavorito(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="heart" size={16} color={isFavorited ? COLORS.pink : COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.emAltaTitle}>{item.nome}</Text>
                    <Text style={styles.emAltaMeta}>
                      {item.bairro || item.cidade} • ★ {item.rating_total > 0 ? item.rating_media.toFixed(1) : '—'}
                    </Text>

                    <View style={styles.emAltaFooterRow}>
                      {item.instagram ? (
                        <TouchableOpacity
                          style={styles.instaBtn}
                          onPress={() => handleOpenInstagram(item.instagram!)}
                          activeOpacity={0.8}
                        >
                          <Feather name="instagram" size={12} color={COLORS.pink} />
                          <Text style={styles.instaBtnText}>@{item.instagram.replace(/^@/, '')}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View />
                      )}
                      <Feather name="chevron-right" size={16} color={COLORS.safeSpace} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* O QUE FAZER HOJE */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitulo}>O que fazer hoje</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.sectionVerTudo}>Ver agenda</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.pink} style={{ marginLeft: 16 }} />
          ) : agendaHoje.length === 0 ? (
            <View style={styles.emptyInlineBox}>
              <Text style={styles.emptyInlineText}>Nenhum evento aprovado pra hoje ainda.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
              {agendaHoje.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.agendaCard}
                  onPress={() => router.push('/(tabs)/events')}
                  activeOpacity={0.85}
                >
                  <View style={styles.agendaImageArea}>
                    <Feather name="calendar" size={24} color={COLORS.pink} />
                  </View>
                  <View style={styles.agendaContent}>
                    <Text style={styles.agendaHorario}>
                      {new Date(item.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {item.locais?.bairro || 'Local a confirmar'}
                    </Text>
                    <Text style={styles.agendaTitulo}>{item.titulo}</Text>
                    <Text style={styles.agendaDiferencial}>{item.locais?.nome || ''}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* DICAS TRIP */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitulo}>Dicas Trip</Text>
              <Text style={styles.sectionSubtitulo}>Destinos, hospedagens e roteiros LGBT+</Text>
            </View>
            <TouchableOpacity onPress={() => handleCategoryPress(CATEGORIAS.turismo)}>
              <Text style={styles.sectionVerTudo}>Ver catálogo</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.pink} style={{ marginLeft: 16 }} />
          ) : dicasTrip.length === 0 ? (
            <View style={styles.emptyInlineBox}>
              <Text style={styles.emptyInlineText}>Ainda não há dicas de turismo aprovadas.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
              {dicasTrip.map((item) => {
                const isFavorited = favoritos.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.turismoPropagandaCard}
                    onPress={() => router.push(`/business/${item.id}` as any)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.turismoHeaderRow}>
                      <Text style={styles.turismoCategoryBadge}>{item.subcategoria || 'Turismo'}</Text>
                      <View style={styles.cardHeaderRightRow}>
                        {item.plano_destaque !== 'basico' && (
                          <View style={styles.turismoPromoBadge}>
                            <Text style={styles.turismoPromoText}>DESTAQUE</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={{ marginLeft: 6 }}
                          onPress={() => handleToggleFavorito(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="heart" size={16} color={isFavorited ? COLORS.pink : COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.turismoTitle}>{item.nome}</Text>
                    <Text style={styles.turismoDesc} numberOfLines={2}>
                      {item.descricao || 'Sem descrição cadastrada ainda.'}
                    </Text>

                    <View style={styles.turismoFooterRow}>
                      <Text style={styles.turismoBtnText}>Ver detalhes do local</Text>
                      <Feather name="arrow-right" size={14} color={COLORS.safeSpace} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ESCOLHA PELA EXPERIÊNCIA */}
        <View style={styles.secaoBloco}>
          <Text style={styles.sectionTituloPadrao}>Escolha pela experiência</Text>
          <View style={styles.experienciasGrid}>
            {EXPERIENCIAS.map((exp) => (
              <TouchableOpacity
                key={exp}
                style={styles.expChip}
                onPress={() => openExperienceScreen(exp)}
                activeOpacity={0.8}
              >
                <Text style={styles.expChipText}>{exp}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CARD CARNAVAL 2027 */}
        <View style={styles.carnavalCard}>
          <View style={styles.carnavalBadge}>
            <Text style={styles.carnavalBadgeText}>EM BREVE</Text>
          </View>
          <Text style={styles.carnavalTitle}>Carnaval LGBT+ 2027</Text>
          <Text style={styles.carnavalSub}>Guias, agenda de blocos e ativação oficial de notificações.</Text>
          <TouchableOpacity
            style={styles.carnavalBtn}
            onPress={() => Alert.alert('Notificações', 'Você receberá as novidades do Carnaval 2027!')}
          >
            <Text style={styles.carnavalBtnText}>Quero receber novidades</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerEsquerda: { justifyContent: 'center' },
  logoLinear: { width: 150, height: 36 },
  appSubtitulo: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, marginTop: 2 },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buscaInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },

  bannerScrollView: { marginBottom: 24 },
  bannerScrollContent: { paddingLeft: 16, paddingRight: 4 },
  bannerCard: {
    width: 320,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bannerTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  bannerTagText: { fontSize: 10, fontWeight: '800', color: '#000' },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  bannerSub: { fontSize: 12, color: COLORS.textSecondary },

  secaoBloco: { marginBottom: 24 },
  sectionTituloPadrao: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: 16, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitulo: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sectionSubtitulo: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sectionVerTudo: { fontSize: 12, fontWeight: '600', color: COLORS.pink },

  emptyInlineBox: { marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  emptyInlineText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  categoriaScrollContent: { paddingHorizontal: 16, gap: 12 },
  categoriaHorizontalItem: { alignItems: 'center', width: 84 },
  categoriaCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoriaDisabled: { opacity: 0.5 },
  emBreveBadge: { position: 'absolute', bottom: -4, backgroundColor: COLORS.purple, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  emBreveTexto: { fontSize: 6, fontWeight: '800', color: '#FFF' },
  categoriaLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },

  carrosselPadding: { paddingHorizontal: 16, gap: 12 },

  emAltaCard: {
    width: 220,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
    gap: 6,
    overflow: 'hidden',
  },
  emAltaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 11, 14, 0.55)',
  },
  emAltaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emAltaCategoryBadge: { backgroundColor: 'rgba(255, 213, 79, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  emAltaCategoryText: { fontSize: 10, fontWeight: '800', color: COLORS.gold },
  emAltaTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  emAltaMeta: { fontSize: 11, color: COLORS.textSecondary },
  emAltaFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  instaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#232230', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  instaBtnText: { fontSize: 10, color: COLORS.textPrimary, fontWeight: '600' },

  agendaCard: { width: 170, borderRadius: 14, backgroundColor: COLORS.card, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  agendaImageArea: { height: 80, backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  agendaContent: { padding: 10 },
  agendaHorario: { fontSize: 11, fontWeight: '700', color: COLORS.pink, marginBottom: 2 },
  agendaTitulo: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  agendaDiferencial: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  turismoPropagandaCard: {
    width: 230,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
    gap: 6,
  },
  turismoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderRightRow: { flexDirection: 'row', alignItems: 'center' },
  turismoCategoryBadge: { fontSize: 10, fontWeight: '700', color: COLORS.safeSpace },
  turismoPromoBadge: { backgroundColor: 'rgba(76, 175, 125, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  turismoPromoText: { fontSize: 9, fontWeight: '800', color: COLORS.safeSpace },
  turismoTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  turismoDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15 },
  turismoFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  turismoBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.safeSpace },

  experienciasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  expChip: { backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  expChipText: { fontSize: 12, fontWeight: '600', color: COLORS.purple },

  carnavalCard: { marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  carnavalBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(126, 87, 194, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  carnavalBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.purple },
  carnavalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  carnavalSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  carnavalBtn: { height: 40, backgroundColor: COLORS.purple, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  carnavalBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
