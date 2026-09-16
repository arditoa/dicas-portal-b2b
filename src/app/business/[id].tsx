import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../lib/authContext';
import { registrarCliqueInstagram, registrarVisualizacaoPerfil } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';

// Precisam bater com o enum public.categoria_tipo real (só 6 valores —
// a taxonomia de 10 categorias desenhada nas Rodadas 1-8 nunca chegou a
// ser migrada pro banco real, ver `investigacao-tecnica-app.md`/Rodada 12).
const CATEGORIA_LABEL: Record<string, string> = {
  lugares: 'Bares & Vida Noturna',
  gastronomia: 'Gastronomia',
  cultura: 'Cultura & Lazer',
  eventos: 'Festas & Eventos',
  turismo: 'Turismo',
  servicos: 'Serviços Inclusivos',
};

const BADGE_COLORS: Record<string, string> = {
  dourado: '#FFD54F',
  verde: '#4CAF7D',
  rosa: '#E1306C',
};

interface LocalRow {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  descricao: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string;
  lat: number | null;
  lng: number | null;
  instagram: string | null;
  foto_capa_url: string | null;
  safe_space: boolean;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  rating_media: number;
  rating_total: number;
}

interface LocalBadge {
  id: string;
  rotulo: string;
  cor_tag: 'dourado' | 'verde' | 'rosa';
}

interface Avaliacao {
  id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  user_id: string | null;
  perfis_publicos: { display_name: string; avatar_url: string | null } | null;
}

export default function BusinessDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<LocalRow | null>(null);
  const [badges, setBadges] = useState<LocalBadge[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [minhaAvaliacao, setMinhaAvaliacao] = useState<Avaliacao | null>(null);
  const [isFavorito, setIsFavorito] = useState(false);
  const [favoritoLoading, setFavoritoLoading] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [notaEscolhida, setNotaEscolhida] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviandoReview, setEnviandoReview] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [localRes, badgesRes, avaliacoesRes] = await Promise.all([
        supabase
          .from('locais')
          .select(
            'id, nome, categoria, subcategoria, descricao, endereco, bairro, cidade, lat, lng, instagram, foto_capa_url, safe_space, plano_destaque, rating_media, rating_total'
          )
          .eq('id', id)
          .single(),
        supabase
          .from('local_badges')
          .select('id, rotulo, cor_tag')
          .eq('local_id', id)
          .eq('ativo', true),
        supabase
          .from('avaliacoes')
          .select('id, nota, comentario, created_at, user_id, perfis_publicos(display_name, avatar_url)')
          .eq('local_id', id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (localRes.error) throw localRes.error;
      setLocal(localRes.data as unknown as LocalRow);
      // ANALYTICS: 1 visualização por local/dispositivo/dia (dedupe em
      // registrarVisualizacaoPerfil) — alimenta o dashboard do parceiro.
      registrarVisualizacaoPerfil((localRes.data as unknown as LocalRow).id);
      setBadges((badgesRes.data as any) || []);
      setAvaliacoes((avaliacoesRes.data as any) || []);

      if (user?.id) {
        const [favRes, minhaRes] = await Promise.all([
          supabase
            .from('favoritos_locais')
            .select('local_id')
            .eq('local_id', id)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('avaliacoes')
            .select('id, nota, comentario, created_at, user_id')
            .eq('local_id', id)
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);
        setIsFavorito(!!favRes.data);
        setMinhaAvaliacao((minhaRes.data as any) || null);
      } else {
        setIsFavorito(false);
        setMinhaAvaliacao(null);
      }
    } catch (err) {
      console.error('Erro ao carregar local:', err);
      setLocal(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const exigirLogin = (mensagem: string) => {
    Alert.alert('Acesso Restrito', mensagem, [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Entrar / Criar Conta', onPress: () => router.push('/(tabs)/profile') },
    ]);
  };

  const handleToggleFavorito = async () => {
    if (!local) return;
    if (!session || !user) {
      exigirLogin('Crie sua conta ou entre no app para salvar locais favoritos.');
      return;
    }

    setFavoritoLoading(true);
    try {
      if (isFavorito) {
        const { error } = await supabase
          .from('favoritos_locais')
          .delete()
          .eq('local_id', local.id)
          .eq('user_id', user.id);
        if (error) throw error;
        setIsFavorito(false);
      } else {
        const { error } = await supabase
          .from('favoritos_locais')
          .insert({ local_id: local.id, user_id: user.id });
        if (error) throw error;
        setIsFavorito(true);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível atualizar seus favoritos.');
    } finally {
      setFavoritoLoading(false);
    }
  };

  const handleAbrirReview = () => {
    if (!session || !user) {
      exigirLogin('Crie sua conta ou entre no app para avaliar este local.');
      return;
    }
    setNotaEscolhida(minhaAvaliacao?.nota || 5);
    setComentario(minhaAvaliacao?.comentario || '');
    setShowReviewModal(true);
  };

  const handleEnviarReview = async () => {
    if (!local || !user) return;

    setEnviandoReview(true);
    try {
      if (minhaAvaliacao) {
        const { error } = await supabase
          .from('avaliacoes')
          .update({ nota: notaEscolhida, comentario: comentario.trim() || null })
          .eq('id', minhaAvaliacao.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('avaliacoes').insert({
          local_id: local.id,
          nota: notaEscolhida,
          comentario: comentario.trim() || null,
        });
        if (error) throw error;
      }

      setShowReviewModal(false);
      carregarDados();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível salvar sua avaliação.');
    } finally {
      setEnviandoReview(false);
    }
  };

  const handleAbrirInstagram = () => {
    if (!local?.instagram) {
      Alert.alert('Instagram não informado', 'Este local ainda não cadastrou um Instagram.');
      return;
    }
    // ANALYTICS: dispara e não espera — nunca atrasa a abertura do link.
    registrarCliqueInstagram(local.id);
    let handle = local.instagram.trim();
    if (handle.startsWith('http')) {
      Linking.openURL(handle);
      return;
    }
    handle = handle.replace(/^@/, '');
    Linking.openURL(`https://instagram.com/${handle}`);
  };

  const handleAbrirMapa = () => {
    if (local?.lat != null && local?.lng != null) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${local.lat},${local.lng}`);
    } else {
      Alert.alert('Localização não disponível', 'Este local ainda não informou coordenadas no mapa.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#E1306C" />
      </View>
    );
  }

  if (!local) {
    return (
      <View style={[styles.container, styles.center, { padding: 30 }]}>
        <Feather name="alert-circle" size={32} color="#626274" />
        <Text style={styles.notFoundText}>
          Não encontramos este local. Ele pode ter sido removido ou ainda está em análise.
        </Text>
        <TouchableOpacity style={styles.backBtnInline} onPress={() => router.back()}>
          <Text style={styles.backBtnInlineText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollDetail}>
          <TouchableOpacity style={styles.backBtnAbsolute} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.favBtnAbsolute}
            onPress={handleToggleFavorito}
            disabled={favoritoLoading}
          >
            {favoritoLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Feather
                name="bookmark"
                size={20}
                color={isFavorito ? '#E1306C' : '#FFF'}
                style={isFavorito ? { opacity: 1 } : { opacity: 0.85 }}
              />
            )}
          </TouchableOpacity>

          <View style={styles.heroBanner}>
            {local.foto_capa_url && (
              <Image source={{ uri: local.foto_capa_url }} style={styles.heroImage} resizeMode="cover" />
            )}
            <View style={styles.badgesRow}>
              {local.safe_space && (
                <View style={styles.safeBadge}>
                  <Feather name="shield" size={12} color="#4CAF7D" style={{ marginRight: 4 }} />
                  <Text style={styles.safeBadgeText}>Espaço Seguro LGBT+</Text>
                </View>
              )}
              {badges.map((b) => (
                <View
                  key={b.id}
                  style={[styles.genericBadge, { borderColor: BADGE_COLORS[b.cor_tag] || '#FFD54F' }]}
                >
                  <Feather name="award" size={12} color={BADGE_COLORS[b.cor_tag] || '#FFD54F'} style={{ marginRight: 4 }} />
                  <Text style={[styles.genericBadgeText, { color: BADGE_COLORS[b.cor_tag] || '#FFD54F' }]}>
                    {b.rotulo}
                  </Text>
                </View>
              ))}
              {local.plano_destaque !== 'basico' && (
                <View style={styles.genericBadge}>
                  <Feather name="star" size={12} color="#FFD54F" style={{ marginRight: 4 }} />
                  <Text style={[styles.genericBadgeText, { color: '#FFD54F' }]}>Em destaque</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.detailBody}>
            <Text style={styles.detailTitle}>{local.nome}</Text>
            <Text style={styles.detailSubtext}>
              {CATEGORIA_LABEL[local.categoria] || local.categoria}
              {local.subcategoria ? ` • ${local.subcategoria}` : ''} • {local.bairro || local.cidade}
            </Text>

            <View style={styles.ratingRow}>
              <Feather name="star" size={16} color="#FFD54F" />
              <Text style={styles.ratingText}>
                {local.rating_total > 0 ? local.rating_media.toFixed(1) : 'Sem notas ainda'}
              </Text>
              {local.rating_total > 0 && (
                <Text style={styles.ratingCount}>({local.rating_total} avaliações)</Text>
              )}
            </View>

            {local.descricao && <Text style={styles.description}>{local.descricao}</Text>}

            <TouchableOpacity style={styles.actionBtn} onPress={handleAbrirInstagram}>
              <Feather name="instagram" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Ver no Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.mapBtn]} onPress={handleAbrirMapa}>
              <Feather name="map-pin" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Ver no Mapa</Text>
            </TouchableOpacity>

            {/* AVALIAÇÕES */}
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Avaliações</Text>
              <TouchableOpacity onPress={handleAbrirReview} activeOpacity={0.8}>
                <Text style={styles.reviewCta}>
                  {minhaAvaliacao ? 'Editar minha avaliação' : 'Avaliar este local'}
                </Text>
              </TouchableOpacity>
            </View>

            {avaliacoes.length === 0 ? (
              <View style={styles.emptyReviewsBox}>
                <Feather name="message-circle" size={20} color="#626274" />
                <Text style={styles.emptyReviewsText}>
                  Ainda não há avaliações. Seja a primeira pessoa a avaliar!
                </Text>
              </View>
            ) : (
              avaliacoes.map((av) => (
                <View key={av.id} style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <Text style={styles.reviewAuthor}>
                      {av.perfis_publicos?.display_name || 'Usuário Dicas LGBT+'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Feather
                          key={n}
                          name="star"
                          size={11}
                          color={n <= av.nota ? '#FFD54F' : '#2D2B3D'}
                        />
                      ))}
                    </View>
                  </View>
                  {av.comentario && <Text style={styles.reviewComment}>{av.comentario}</Text>}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL DE AVALIAÇÃO */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReviewModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.reviewModalContent}>
            <Text style={styles.modalTitle}>
              {minhaAvaliacao ? 'Editar avaliação' : 'Avaliar'} {local.nome}
            </Text>

            <View style={styles.starsPickerRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setNotaEscolhida(n)} activeOpacity={0.7}>
                  <Feather
                    name="star"
                    size={30}
                    color={n <= notaEscolhida ? '#FFD54F' : '#2D2B3D'}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Conte como foi sua experiência (opcional)"
              placeholderTextColor="#626274"
              multiline
              numberOfLines={4}
              value={comentario}
              onChangeText={setComentario}
              editable={!enviandoReview}
            />

            <TouchableOpacity
              style={[styles.actionBtn, enviandoReview && { opacity: 0.6 }]}
              onPress={handleEnviarReview}
              disabled={enviandoReview}
            >
              {enviandoReview ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.actionBtnText}>Enviar Avaliação</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  center: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },

  notFoundText: { color: '#A0A0B2', fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  backBtnInline: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  backBtnInlineText: { color: '#FFF', fontWeight: '700' },

  backBtnAbsolute: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  favBtnAbsolute: { position: 'absolute', top: 16, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  scrollDetail: { paddingBottom: 40 },
  heroBanner: { height: 200, backgroundColor: '#1A1926', justifyContent: 'flex-end', padding: 16, overflow: 'hidden' },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 175, 125, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  safeBadgeText: { fontSize: 11, fontWeight: '700', color: '#4CAF7D' },
  genericBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: '#FFD54F', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  genericBadgeText: { fontSize: 11, fontWeight: '700' },

  detailBody: { padding: 20 },
  detailTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  detailSubtext: { fontSize: 13, color: '#A0A0B2', marginBottom: 10 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  ratingCount: { fontSize: 12, color: '#A0A0B2' },

  description: { fontSize: 13, color: '#C0C0D0', lineHeight: 20, marginBottom: 18 },

  actionBtn: { flexDirection: 'row', height: 48, backgroundColor: '#E1306C', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  mapBtn: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  reviewCta: { fontSize: 12, fontWeight: '700', color: '#7E57C2' },

  emptyReviewsBox: { alignItems: 'center', gap: 8, backgroundColor: '#161520', borderRadius: 16, borderWidth: 1, borderColor: '#232230', padding: 24 },
  emptyReviewsText: { fontSize: 12, color: '#A0A0B2', textAlign: 'center' },

  reviewCard: { backgroundColor: '#161520', borderRadius: 14, borderWidth: 1, borderColor: '#232230', padding: 12, marginBottom: 8 },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  reviewComment: { fontSize: 12, color: '#A0A0B2', lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  reviewModalContent: { width: '100%', backgroundColor: '#161520', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#232230' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 16, textAlign: 'center' },
  starsPickerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  reviewInput: { minHeight: 90, borderRadius: 12, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#232230', padding: 14, color: '#FFF', fontSize: 13, textAlignVertical: 'top', marginBottom: 16 },
});
