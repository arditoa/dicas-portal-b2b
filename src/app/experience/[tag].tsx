import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CATEGORIA_REAL_LABEL } from '../../lib/categorias';
import { supabase } from '../../lib/supabase';

// Mesmo número/padrão já usado em profile.tsx (handleIndicarParceiroWhatsApp)
// pra qualquer contato comercial dentro do app.
const WHATSAPP_PARCEIROS = '5511942942028';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  pink: '#E1306C',
  purple: '#7E57C2',
  gold: '#FFD54F',
  safeSpace: '#4CAF7D',
};

const PLANO_PRIORIDADE: Record<string, number> = { vip: 0, destaque: 1, basico: 2 };

interface Parceiro {
  id: string;
  nome: string;
  categoria: string;
  bairro: string | null;
  cidade: string;
  foto_capa_url: string | null;
  rating_media: number;
  rating_total: number;
}

export default function FeaturedScreen() {
  const router = useRouter();
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const pageTitle = tag ? decodeURIComponent(tag) : 'Membro Fundador';
  const ehFundador = pageTitle.toLowerCase().includes('fundador');
  // Rodada 56 (3ª rodada de ajuste) — banner "Selo Dicas LGBT+" subiu pro
  // topo da Home (ao lado de Membro Fundador) e passou a abrir esta
  // mesma tela genérica, igual Fundador. Selo Dicas usa destaque_secoes
  // (mesmo mecanismo do Selo Dicas em todo o app — nunca plano_destaque,
  // que é o campo comercial usado no branch "else" abaixo pra Destaque/
  // VIP) — por isso precisa do próprio branch, não pode cair no "else".
  const ehSeloDicas = pageTitle.toLowerCase().includes('selo dicas');

  const [loading, setLoading] = useState(true);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (ehFundador) {
          // "Membro Fundador" é um selo real (local_badges.rotulo), não um
          // plano — ver Rodada 6/9 de `investigacao-tecnica-app.md`.
          const { data, error } = await supabase
            .from('local_badges')
            .select(
              'locais!inner(id, nome, categoria, bairro, cidade, foto_capa_url, rating_media, rating_total, status)'
            )
            .ilike('rotulo', '%fundador%')
            .eq('ativo', true)
            .eq('locais.status', 'aprovado');

          if (error) throw error;
          const locais = ((data as any) || []).map((row: any) => row.locais).filter(Boolean);
          setParceiros(locais);
        } else if (ehSeloDicas) {
          // Selo Dicas LGBT+: curadoria editorial da Andrea, nunca vendida
          // ("não se vende, apenas se conquista") — destaque_secoes contém
          // 'selo_dicas', igual o resto do app (ver lib/destaque.ts e a
          // Home). Sem ordenar por plano comercial (não é sobre quem paga).
          const { data, error } = await supabase
            .from('locais')
            .select('id, nome, categoria, bairro, cidade, foto_capa_url, rating_media, rating_total, plano_destaque')
            .eq('status', 'aprovado')
            .contains('destaque_secoes', ['selo_dicas'])
            .limit(20);

          if (error) throw error;
          setParceiros(((data as any) || []) as Parceiro[]);
        } else {
          const { data, error } = await supabase
            .from('locais')
            .select('id, nome, categoria, bairro, cidade, foto_capa_url, rating_media, rating_total, plano_destaque')
            .eq('status', 'aprovado')
            .in('plano_destaque', ['destaque', 'vip'])
            .limit(20);

          if (error) throw error;
          const locais = ((data as any) || []) as (Parceiro & { plano_destaque: string })[];
          locais.sort((a, b) => (PLANO_PRIORIDADE[a.plano_destaque] ?? 2) - (PLANO_PRIORIDADE[b.plano_destaque] ?? 2));
          setParceiros(locais);
        }
      } catch (err) {
        console.error('Erro ao carregar parceiros em destaque:', err);
        setParceiros([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ehFundador, ehSeloDicas]);

  const heroPartner = parceiros[0];
  const regularPartners = parceiros.slice(1);

  const handleSejaDestaqueWhatsApp = async () => {
    const mensagem = encodeURIComponent(
      `Olá! Vi a seção "${pageTitle}" no app Dicas LGBT+ e quero saber como colocar meu espaço em destaque.`
    );
    const url = `whatsapp://send?phone=${WHATSAPP_PARCEIROS}&text=${mensagem}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${WHATSAPP_PARCEIROS}&text=${mensagem}`);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Image
            source={require('../../assets/images/logo-icon.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroTitleArea}>
            <View
              style={[
                styles.vipBadge,
                ehSeloDicas && { backgroundColor: 'rgba(225, 48, 108, 0.12)', borderColor: 'rgba(225, 48, 108, 0.3)' },
              ]}
            >
              <Feather name={ehSeloDicas ? 'heart' : 'award'} size={12} color={ehSeloDicas ? COLORS.pink : COLORS.gold} />
              <Text style={[styles.vipBadgeText, ehSeloDicas && { color: COLORS.pink }]}>
                {ehSeloDicas ? 'CURADORIA EDITORIAL' : 'SELEÇÃO EXCLUSIVA'}
              </Text>
            </View>
            <Text style={styles.mainTitle}>{pageTitle}</Text>
            <Text style={styles.subTitle}>
              {ehSeloDicas
                ? 'Escolha editorial nossa — nunca é espaço pago, é conquistado.'
                : 'Locais parceiros de excelência que apoiam e constroem nossa comunidade.'}
            </Text>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.pink} />
            </View>
          ) : parceiros.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="award" size={28} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                Ainda não há locais aprovados nesta seleção. Assim que a Andrea aprovar os primeiros
                cadastros pelo portal, eles aparecem aqui.
              </Text>
            </View>
          ) : (
            <>
              {heroPartner && (
                <TouchableOpacity
                  style={styles.heroCard}
                  onPress={() => router.push(`/business/${heroPartner.id}` as any)}
                  activeOpacity={0.9}
                >
                  {heroPartner.foto_capa_url ? (
                    <ImageBackground
                      source={{ uri: heroPartner.foto_capa_url }}
                      style={styles.heroImage}
                      imageStyle={{ borderRadius: 20 }}
                    >
                      <HeroContent partner={heroPartner} ehSeloDicas={ehSeloDicas} />
                    </ImageBackground>
                  ) : (
                    <View style={[styles.heroImage, styles.heroImageFallback]}>
                      <HeroContent partner={heroPartner} ehSeloDicas={ehSeloDicas} />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {regularPartners.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.sectionHeaderTitle}>Parceiros Selecionados</Text>

                  {regularPartners.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.partnerCard}
                      onPress={() => router.push(`/business/${item.id}` as any)}
                      activeOpacity={0.88}
                    >
                      {item.foto_capa_url ? (
                        <Image source={{ uri: item.foto_capa_url }} style={styles.partnerThumb} />
                      ) : (
                        <View style={[styles.partnerThumb, styles.partnerThumbFallback]}>
                          <Feather name="map-pin" size={18} color={COLORS.pink} />
                        </View>
                      )}

                      <View style={styles.partnerInfo}>
                        <View style={styles.partnerRowTop}>
                          <Text style={styles.partnerCategory}>
                            {CATEGORIA_REAL_LABEL[item.categoria] || item.categoria}
                          </Text>
                          <View style={styles.smallRating}>
                            <Feather name="star" size={10} color={COLORS.gold} />
                            <Text style={styles.smallRatingText}>
                              {item.rating_total > 0 ? item.rating_media.toFixed(1) : '—'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.partnerTitle}>{item.nome}</Text>
                        <Text style={styles.partnerLocation}>{item.bairro || item.cidade}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {ehSeloDicas ? (
            // Rodada 56 (3ª rodada) — Selo Dicas "não se vende, apenas se
            // conquista" (regra repetida várias vezes pela Andrea ao longo
            // do projeto). O CTA padrão daqui embaixo ("Seja um Selo Dicas
            // LGBT+... Falar no WhatsApp") venderia exatamente o que ela
            // não quer — por isso troca pra um aviso neutro, sem botão de
            // contato nenhum.
            <View style={styles.ctaCard}>
              <Feather name="heart" size={24} color={COLORS.pink} />
              <Text style={styles.ctaTitle}>Como funciona o Selo Dicas LGBT+?</Text>
              <Text style={styles.ctaSub}>
                É uma escolha editorial da nossa curadoria — não pode ser comprado nem solicitado.
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.ctaCard} onPress={handleSejaDestaqueWhatsApp} activeOpacity={0.85}>
              <Feather name="shield" size={24} color={COLORS.purple} />
              <Text style={styles.ctaTitle}>Seja um {pageTitle}</Text>
              <Text style={styles.ctaSub}>
                Posicione sua marca em destaque máximo para milhares de pessoas na comunidade.
              </Text>
              <View style={styles.ctaBtn}>
                <Feather name="message-circle" size={14} color="#FFF" />
                <Text style={styles.ctaBtnText}>Falar no WhatsApp</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function HeroContent({ partner, ehSeloDicas }: { partner: Parceiro; ehSeloDicas?: boolean }) {
  return (
    <View style={styles.heroGradient}>
      <View style={styles.heroTopBadges}>
        <View style={[styles.masterTag, ehSeloDicas && { backgroundColor: COLORS.pink }]}>
          <Feather name={ehSeloDicas ? 'heart' : 'star'} size={10} color={ehSeloDicas ? '#FFF' : '#000'} />
          <Text style={[styles.masterTagText, ehSeloDicas && { color: '#FFF' }]}>
            {ehSeloDicas ? 'SELO DICAS' : 'DESTAQUE MASTER'}
          </Text>
        </View>
        <View style={styles.ratingTag}>
          <Feather name="star" size={10} color={COLORS.gold} />
          <Text style={styles.ratingTagText}>
            {partner.rating_total > 0 ? partner.rating_media.toFixed(1) : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.heroBottomContent}>
        <Text style={styles.heroCategory}>{CATEGORIA_REAL_LABEL[partner.categoria] || partner.categoria}</Text>
        <Text style={styles.heroTitle}>{partner.nome}</Text>
        <Text style={styles.heroTagline}>{partner.bairro || partner.cidade}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#161520', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#232230', marginRight: 12 },
  headerIcon: { width: 36, height: 36 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  heroTitleArea: { marginVertical: 14 },
  vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 213, 79, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 213, 79, 0.3)' },
  vipBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.gold, letterSpacing: 1 },
  mainTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  subTitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },

  emptyBox: { alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 30, marginBottom: 20 },
  emptyText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },

  heroCard: { width: '100%', height: 320, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroImageFallback: { backgroundColor: '#1A1926' },
  heroGradient: { flex: 1, backgroundColor: 'rgba(11, 11, 14, 0.55)', borderRadius: 20, padding: 16, justifyContent: 'space-between' },
  heroTopBadges: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  masterTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  masterTagText: { fontSize: 9, fontWeight: '900', color: '#000' },
  ratingTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0B0B0E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingTagText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  heroBottomContent: { gap: 4 },
  heroCategory: { fontSize: 11, fontWeight: '700', color: COLORS.pink, textTransform: 'uppercase' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  heroTagline: { fontSize: 12, color: '#D0D0E0', lineHeight: 17 },

  listSection: { gap: 12, marginBottom: 24 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },

  partnerCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  partnerThumb: { width: 90, height: 90, borderRadius: 12 },
  partnerThumbFallback: { backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center' },
  partnerInfo: { flex: 1, justifyContent: 'space-between' },
  partnerRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partnerCategory: { fontSize: 10, fontWeight: '700', color: COLORS.pink },
  smallRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  smallRatingText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  partnerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  partnerLocation: { fontSize: 11, color: COLORS.textSecondary },

  ctaCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  ctaTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  ctaSub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.purple, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  ctaBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
