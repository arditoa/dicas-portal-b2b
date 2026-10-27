// Rodada 82 — tela de lista única do app. Páginas de seção (Hoje, Destaques da
// semana, Em Alta, Dicas Trip), "Indicados pela equipe", Membros Fundadores e
// a escolha de experiências usam o MESMO layout da página de categoria:
// voltar + logo, título grande, busca, chips (Em Alta / Todas) e cartões.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIA_REAL_LABEL, SeloCategoria, seloDaCategoria } from '../lib/categorias';
import { deveIncluirEm } from '../lib/destaque';
import { textoLocalizacao } from '../lib/localizacao';
import { formatarNome } from '../lib/texto';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  gold: '#FFD54F',
  safeSpace: '#4CAF7D',
};

// Campos de `locais` que as listas precisam (inclui o que deveIncluirEm/abertoAgora leem).
export const CAMPOS_LOCAL =
  'id, nome, categoria, subcategoria, descricao, bairro, bairro_exibicao, cidade, foto_capa_url, galeria_fotos, logo_url, rating_media, rating_total, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, plano_comercial, plano_comercial_status, horario_funcionamento';

export interface ItemLista {
  chave: string;
  rota: string;
  titulo: string;
  // 1ª linha: tipo do local (subcategoria / categoria) ou horário do evento
  linha1: string;
  // 2ª linha: onde fica (bairro, cidade)
  linha2?: string;
  // 3ª linha, à esquerda do rating: "Aberto agora · até 02h" etc.
  linha3?: string;
  linha3Cor?: string;
  foto: string | null;
  logo?: string | null;
  nota?: number | null; // undefined = não mostra rating (eventos)
  destaque?: boolean; // selo DESTAQUE
  emAlta?: boolean; // entra no chip "Em Alta"
  grupo?: string; // categoria (chip de filtro): Bares, Gastronomia, Serviços…
  selo?: { texto: string; cor: string; textoCor: string };
  seloCategoria?: SeloCategoria;
  iconeVazio?: string;
}

export function fotoDoLocal(l: any): string | null {
  return l.foto_capa_url || l.galeria_fotos?.[0] || null;
}

// Nome do grupo (chip) de cada categoria real do banco.
export const GRUPO_CATEGORIA: Record<string, string> = {
  lugares: 'Bares & Noite',
  gastronomia: 'Gastronomia',
  cultura: 'Cultura',
  eventos: 'Festas',
  turismo: 'Turismo',
  servicos: 'Serviços',
  beleza: 'Beleza',
  lojas: 'Lojas',
  produtos: 'Produtos',
  educacao: 'Educação',
  lazer: 'Lazer',
};

// Converte uma linha de `locais` no item da lista padrão.
export function localParaItem(l: any, extra: Partial<ItemLista> = {}): ItemLista {
  return {
    chave: `l-${l.id}`,
    rota: `/business/${l.id}`,
    titulo: formatarNome(l.nome),
    linha1: l.subcategoria || CATEGORIA_REAL_LABEL[l.categoria] || l.categoria || '',
    linha2: textoLocalizacao(l),
    foto: fotoDoLocal(l),
    logo: l.logo_url || null,
    nota: l.rating_total > 0 ? Number(l.rating_media) : null,
    emAlta: deveIncluirEm(l, 'em_alta'),
    grupo: GRUPO_CATEGORIA[l.categoria] || undefined,
    seloCategoria: seloDaCategoria(l),
    iconeVazio: 'map-pin',
    ...extra,
  };
}

// Cabeçalho comum: botão voltar + logo, e título grande.
export function CabecalhoPadrao({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  const router = useRouter();
  return (
    <View style={styles.headerBlock}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Feather name="arrow-left" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Image source={require('../assets/images/logolinear-semfundo.png')} style={styles.headerLogo} resizeMode="contain" />
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      {!!subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
    </View>
  );
}

interface Props {
  titulo: string;
  subtitulo?: string;
  itens: ItemLista[];
  carregando: boolean;
  vazioTexto: string;
  vazioIcone?: string;
  // Abre a lista já em "Em Alta" quando houver (padrão: "Todas").
  chipInicial?: 'Em Alta' | 'Todas';
  // Conteúdo extra no fim da lista (botões "ver mais", avisos).
  rodape?: ReactNode;
}

export default function ListaPadrao({ titulo, subtitulo, itens, carregando, vazioTexto, vazioIcone = 'map-pin', chipInicial = 'Todas', rodape }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busca, setBusca] = useState('');
  const [chip, setChip] = useState<string | null>(null);

  const qtdEmAlta = useMemo(() => itens.filter((i) => i.emAlta).length, [itens]);
  // O chip só aparece quando a lista mistura os dois grupos; se tudo é Em Alta
  // (ou nada é), o filtro não serve pra nada.
  const temChips = qtdEmAlta > 0 && qtdEmAlta < itens.length;
  // Chips por categoria: aparecem quando a lista mistura 2+ categorias, pra
  // ninguém confundir um fotógrafo com um bar.
  const grupos = useMemo(() => {
    const cont = new Map<string, number>();
    for (const i of itens) if (i.grupo) cont.set(i.grupo, (cont.get(i.grupo) || 0) + 1);
    return Array.from(cont.entries()).sort((a, b) => b[1] - a[1]);
  }, [itens]);
  const temGrupos = grupos.length > 1;
  const opcoes = [...(temChips ? ['Em Alta'] : []), 'Todas', ...(temGrupos ? grupos.map(([g]) => g) : [])];
  const mostrarChips = temChips || temGrupos;
  const ativo = !mostrarChips ? 'Todas' : chip && opcoes.includes(chip) ? chip : temChips ? chipInicial : 'Todas';

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((i) => {
      if (ativo === 'Em Alta' && !i.emAlta) return false;
      if (ativo !== 'Todas' && ativo !== 'Em Alta' && i.grupo !== ativo) return false;
      if (!q) return true;
      return [i.titulo, i.linha1, i.linha2].some((t) => (t || '').toLowerCase().includes(q));
    });
  }, [itens, ativo, busca]);

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <CabecalhoPadrao titulo={titulo} subtitulo={subtitulo} />

        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Buscar em ${titulo}...`}
            placeholderTextColor={COLORS.textMuted}
            value={busca}
            onChangeText={setBusca}
          />
        </View>

        {mostrarChips && (
          <View style={styles.filterSection}>
            <FlatList
              horizontal
              data={opcoes}
              keyExtractor={(i) => i}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
              renderItem={({ item }) => {
                const sel = ativo === item;
                const emAlta = item === 'Em Alta';
                return (
                  <TouchableOpacity
                    style={[styles.chip, sel && styles.chipActive, emAlta && !sel && styles.chipEmAltaInactive]}
                    onPress={() => setChip(item)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    {emAlta && <Feather name="trending-up" size={12} color={sel ? '#FFF' : COLORS.gold} style={{ marginRight: 4 }} />}
                    <Text style={[styles.chipText, sel && styles.chipTextActive, emAlta && !sel && { color: COLORS.gold }]}>{item}{grupos.find(([g]) => g === item) ? ` · ${grupos.find(([g]) => g === item)![1]}` : ''}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {carregando ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={COLORS.pink} />
          </View>
        ) : (
          <FlatList
            data={visiveis}
            keyExtractor={(i) => i.chave}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name={vazioIcone as any} size={24} color={COLORS.textMuted} />
                <Text style={styles.emptySub}>{vazioTexto}</Text>
              </View>
            }
            ListFooterComponent={rodape ? <View>{rodape}</View> : null}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.placeCard} activeOpacity={0.88} onPress={() => router.push(item.rota as any)}>
                <View style={[styles.placeThumb, !item.foto && !!item.logo && { backgroundColor: '#F4F1FA' }]}>
                  {item.foto ? (
                    <Image source={{ uri: item.foto }} style={styles.placeThumbImg} resizeMode="cover" />
                  ) : item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.placeLogoImg} resizeMode="contain" />
                  ) : (
                    <Feather name={(item.iconeVazio || 'map-pin') as any} size={20} color={COLORS.pink} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.placeHeaderRow}>
                    <Text style={styles.placeName} numberOfLines={1}>{item.titulo}</Text>
                    {(item.destaque || item.selo) && (
                      <View style={[styles.badge, item.selo && { backgroundColor: item.selo.cor }]}>
                        <Text style={[styles.badgeText, item.selo && { color: item.selo.textoCor }]}>{item.selo ? item.selo.texto : 'DESTAQUE'}</Text>
                      </View>
                    )}
                  </View>

                  {!!item.seloCategoria && (
                    <View style={[styles.badge, { alignSelf: 'flex-start', marginTop: 3, backgroundColor: item.seloCategoria.cor }]}>
                      <Text style={[styles.badgeText, { color: item.seloCategoria.textoCor }]}>{item.seloCategoria.texto}</Text>
                    </View>
                  )}
                  {!!item.linha1 && <Text style={styles.placeSubcat} numberOfLines={1}>{item.linha1}</Text>}
                  {!!item.linha2 && <Text style={styles.placeAddress} numberOfLines={1}>{item.linha2}</Text>}

                  {(!!item.linha3 || item.nota !== undefined) && (
                    <View style={styles.placeFooterRow}>
                      {item.linha3 ? (
                        <Text style={[styles.placeStatus, item.linha3Cor ? { color: item.linha3Cor } : null]} numberOfLines={1}>{item.linha3}</Text>
                      ) : (
                        <View />
                      )}
                      {item.nota !== undefined && (
                        <View style={styles.ratingBadge}>
                          <Feather name="star" size={12} color={COLORS.gold} />
                          <Text style={styles.ratingText}>{item.nota != null ? item.nota.toFixed(1) : '—'}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
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
  titulo: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  subtitulo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, lineHeight: 17 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 14, height: 42, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 12 },

  filterSection: { marginBottom: 10 },
  chipsContainer: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  chipEmAltaInactive: { borderColor: 'rgba(255, 213, 79, 0.4)', backgroundColor: 'rgba(255, 213, 79, 0.08)' },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  emptyContainer: { alignItems: 'center', gap: 8, paddingTop: 60, paddingHorizontal: 30 },
  emptySub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },

  placeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 12 },
  placeThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  placeThumbImg: { width: 48, height: 48 },
  placeLogoImg: { width: 40, height: 40 },
  placeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  placeName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  badge: { backgroundColor: 'rgba(225, 48, 108, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 8, fontWeight: '800', color: COLORS.pink },
  placeSubcat: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  placeAddress: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  placeFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 },
  placeStatus: { fontSize: 11, fontWeight: '700', color: COLORS.safeSpace, flexShrink: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
});
