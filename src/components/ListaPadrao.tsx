// Rodada 82 — tela de lista única do app. Páginas de seção (Hoje, Destaques da
// semana, Em Alta, Dicas Trip), "Indicados pela equipe", Membros Fundadores e
// a escolha de experiências usam o MESMO layout da página de categoria:
// voltar + logo, título grande, busca, chips (Em Alta / Todas) e cartões.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIA_REAL_LABEL, SeloCategoria, seloDaCategoria } from '../lib/categorias';
import { deveIncluirEm } from '../lib/destaque';
import { textoLocalizacao } from '../lib/localizacao';
import { formatarNome } from '../lib/texto';
import { useLocation } from '../hooks/useLocation';
import { distanciaKm, PUBLICOS, RAIOS_KM } from '../lib/filtrosLocais';
import CabecalhoTela, { OpcaoTitulo } from './CabecalhoTela';
import FiltrosPilulas, { FiltroDef } from './FiltrosPilulas';
import IconesCategoria, { IconeFiltro, iconesPadraoCategorias } from './IconesCategoria';

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

import { TIPOS_SERVICO } from '../lib/servicosTipos';
// Campos de `locais` que as listas precisam (inclui o que deveIncluirEm/abertoAgora leem).
export const CAMPOS_LOCAL =
  'id, nome, categoria, subcategoria, descricao, bairro, bairro_exibicao, cidade, foto_capa_url, galeria_fotos, logo_url, rating_media, rating_total, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, plano_comercial, plano_comercial_status, horario_funcionamento, lat, lng, publico_tags';

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
  // Usados pelo modo Home (Perto, Público e ícones de categoria).
  categoriaReal?: string;
  iconeIds?: string[]; // ids dos ícones de filtro a que o item pertence (padrão: a categoria)
  lat?: number | null;
  lng?: number | null;
  publicoTags?: string[];
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
    categoriaReal: l.categoria || undefined,
    lat: l.lat ?? null,
    lng: l.lng ?? null,
    publicoTags: Array.isArray(l.publico_tags) ? l.publico_tags : [],
    ...extra,
  };
}

// Cabeçalho comum: botão voltar + logo, e título grande.
export function CabecalhoPadrao(props: { titulo: string; subtitulo?: string; opcoesTitulo?: OpcaoTitulo[]; valorTitulo?: string; onTrocarTitulo?: (id: string) => void; tituloSeletor?: string }) {
  return <CabecalhoTela {...props} />;
}

// Chips mais "fofos": cada categoria com ícone e cor próprios (sem contagem).
const CHIP_ESTILO: Record<string, { icone: string; cor: string }> = {
  ...Object.fromEntries(TIPOS_SERVICO.map((t) => [t.rotulo, { icone: t.icone, cor: t.cor }])),
  'Em Alta': { icone: 'trending-up', cor: '#FFD54F' },
  Todas: { icone: 'grid', cor: '#A78BFA' },
  'Bares & Noite': { icone: 'moon', cor: '#F472B6' },
  Gastronomia: { icone: 'coffee', cor: '#FBBF24' },
  Cultura: { icone: 'book-open', cor: '#38BDF8' },
  Festas: { icone: 'music', cor: '#FB923C' },
  Turismo: { icone: 'compass', cor: '#34D399' },
  Serviços: { icone: 'briefcase', cor: '#60A5FA' },
  Beleza: { icone: 'scissors', cor: '#F0ABFC' },
  Lojas: { icone: 'shopping-bag', cor: '#FCA5A5' },
  Produtos: { icone: 'package', cor: '#FDBA74' },
  Educação: { icone: 'book-open', cor: '#FF8A65' },
  Lazer: { icone: 'sun', cor: '#FDE047' },
};

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
  // Slot fixo no topo da lista para o patrocínio de um local (some se não houver patrocinador).
  patrocinado?: ItemLista | null;
  patrocinadoRotulo?: string;
  // Linha de filtros própria da tela (ex.: "O que fazer hoje"), logo abaixo da busca.
  filtros?: ReactNode;
  // Bloco padrão do topo da lista (Destaques, patrocínio da categoria e ofertas): ver VitrineCategoria.
  topo?: ReactNode;
  // Modo Home (Em Alta etc.): sem busca; filtros Perto + Público, banner master, ícones das categorias e a lista.
  modoHome?: boolean;
  bannerMaster?: ReactNode;
  // Ícones de filtro próprios da tela (ex.: tipos de serviço, experiências). Padrão: categorias.
  iconesFiltro?: IconeFiltro[];
  // Filtros extras da tela (ex.: gostos do "O que fazer hoje") na mesma linha de Perto/Público.
  filtrosExtras?: FiltroDef[];
  onFiltroExtra?: (id: string, valor?: string) => void;
  onLimparExtras?: () => void;
  iconesSempre?: boolean; // mostra todos os ícones, mesmo os sem locais ainda
  semPublico?: boolean; // a tela já traz o seu próprio filtro "Público"
  // Título com setinha ∨ (seletor de período, ex.: Hoje / Amanhã / Fim de semana).
  opcoesTitulo?: OpcaoTitulo[];
  valorTitulo?: string;
  onTrocarTitulo?: (id: string) => void;
  tituloSeletor?: string;
}

export default function ListaPadrao({ titulo, subtitulo, itens, carregando, vazioTexto, vazioIcone = 'map-pin', chipInicial = 'Todas', rodape, patrocinado, patrocinadoRotulo = 'PATROCINADO', filtros, topo, opcoesTitulo, valorTitulo, onTrocarTitulo, tituloSeletor, modoHome, bannerMaster, iconesFiltro, filtrosExtras, onFiltroExtra, onLimparExtras, semPublico, iconesSempre }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busca, setBusca] = useState('');
  const [chip, setChip] = useState<string | null>(null);
  // Modo Home: filtros Perto/Público e categoria escolhida nos ícones.
  const [perto, setPerto] = useState<string | undefined>();
  const [publico, setPublico] = useState<string | undefined>();
  const [catSel, setCatSel] = useState<string | null>(null);
  const raioKm = modoHome && perto ? RAIOS_KM[perto] ?? 999 : 999;
  const { coords, errorMsg: erroLocal } = useLocation(raioKm !== 999);
  useEffect(() => {
    if (!erroLocal) return;
    Alert.alert('Localização', 'Não conseguimos acessar sua localização. Mostrando todas as distâncias.');
    setPerto(undefined);
  }, [erroLocal]);

  const qtdEmAlta = useMemo(() => itens.filter((i) => i.emAlta).length, [itens]);
  // O chip só aparece quando a lista mistura os dois grupos; se tudo é Em Alta
  // (ou nada é), o filtro não serve pra nada.
  const temChips = !modoHome && qtdEmAlta > 0 && qtdEmAlta < itens.length;
  // Chips por categoria: aparecem quando a lista mistura 2+ categorias, pra
  // ninguém confundir um fotógrafo com um bar.
  const grupos = useMemo(() => {
    const cont = new Map<string, number>();
    for (const i of itens) if (i.grupo) cont.set(i.grupo, (cont.get(i.grupo) || 0) + 1);
    return Array.from(cont.entries()).sort((a, b) => b[1] - a[1]);
  }, [itens]);
  const temGrupos = !modoHome && grupos.length > 1;
  const opcoes = [...(temChips ? ['Em Alta'] : []), 'Todas', ...(temGrupos ? grupos.map(([g]) => g) : [])];
  const mostrarChips = temChips || temGrupos;
  const ativo = !mostrarChips ? 'Todas' : chip && opcoes.includes(chip) ? chip : temChips ? chipInicial : 'Todas';

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const tagPublico = publico ? PUBLICOS.find((p) => p.rotulo === publico)?.slug : undefined;
    return itens.filter((i) => {
      if (modoHome) {
        if (catSel && !(i.iconeIds ?? [i.categoriaReal]).includes(catSel)) return false;
        if (tagPublico && !(i.publicoTags || []).includes(tagPublico)) return false;
        if (raioKm !== 999 && coords && i.lat != null && i.lng != null && distanciaKm(coords.latitude, coords.longitude, i.lat, i.lng) > raioKm) return false;
        return true;
      }
      if (ativo === 'Em Alta' && !i.emAlta) return false;
      if (ativo !== 'Todas' && ativo !== 'Em Alta' && i.grupo !== ativo) return false;
      if (!q) return true;
      return [i.titulo, i.linha1, i.linha2].some((t) => (t || '').toLowerCase().includes(q));
    });
  }, [itens, ativo, busca, modoHome, catSel, publico, raioKm, coords]);

  // Filtros do modo Home: só aparece "Perto" se há locais com coordenadas e "Público" se algum local tem a tag.
  const filtrosHome = useMemo<FiltroDef[]>(() => {
    if (!modoHome) return [];
    const publicosPresentes = PUBLICOS.filter((p) => itens.some((i) => (i.publicoTags || []).includes(p.slug))).map((p) => p.rotulo);
    return [
      { id: 'perto', label: 'Perto de mim', curto: 'Perto', icone: 'navigation', opcoes: itens.some((i) => i.lat != null && i.lng != null) ? Object.keys(RAIOS_KM) : [], valor: perto },
      ...(semPublico ? [] : [{ id: 'publico', label: 'Público', titulo: 'Predominância de público', icone: 'users', opcoes: publicosPresentes, valor: publico }]),
      ...(filtrosExtras || []),
    ];
  }, [modoHome, itens, perto, publico, semPublico, filtrosExtras]);
  // Só aparecem os ícones que têm locais na lista.
  const iconesVisiveis = useMemo(() => {
    if (!modoHome) return [];
    const base = iconesFiltro ?? iconesPadraoCategorias();
    const presentes = new Set(itens.flatMap((i) => i.iconeIds ?? (i.categoriaReal ? [i.categoriaReal] : [])));
    return iconesSempre ? base : base.filter((c) => presentes.has(c.id));
  }, [modoHome, iconesFiltro, itens, iconesSempre]);

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <CabecalhoPadrao titulo={titulo} subtitulo={subtitulo} opcoesTitulo={opcoesTitulo} valorTitulo={valorTitulo} onTrocarTitulo={onTrocarTitulo} tituloSeletor={tituloSeletor} />

        {modoHome ? (
          filtrosHome.some((f) => f.opcoes.length > 0 || f.valor) ? (
            <View style={{ marginBottom: 10 }}>
              <FiltrosPilulas
                compacto
                filtros={filtrosHome}
                onSelecionar={(id, valor) => (id === 'perto' ? setPerto(valor) : id === 'publico' && !semPublico ? setPublico(valor) : onFiltroExtra?.(id, valor))}
                onLimpar={() => { setPerto(undefined); setPublico(undefined); setCatSel(null); onLimparExtras?.(); }}
              />
            </View>
          ) : null
        ) : (
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={COLORS.textPrimary} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Buscar em ${titulo}...`}
              placeholderTextColor={COLORS.textSecondary}
              value={busca}
              onChangeText={setBusca}
            />
          </View>
        )}

        {!!filtros && <View style={{ marginBottom: 8 }}>{filtros}</View>}

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
                const est = CHIP_ESTILO[item] || { icone: 'tag', cor: '#A78BFA' };
                return (
                  <TouchableOpacity
                    style={[styles.chipFofo, { backgroundColor: sel ? est.cor : est.cor + '1A', borderColor: sel ? est.cor : est.cor + '55' }]}
                    onPress={() => setChip(item)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                  >
                    <Feather name={est.icone as any} size={14} color={sel ? '#0B0B0E' : est.cor} />
                    <Text style={[styles.chipFofoTxt, { color: sel ? '#0B0B0E' : '#E9E7F3' }]}>{item}</Text>
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
            ListHeaderComponent={
              <>
              {topo && !busca.trim() ? topo : null}
              {modoHome && bannerMaster ? bannerMaster : null}
              {modoHome ? <IconesCategoria icones={iconesVisiveis} selecionada={catSel} onSelecionar={setCatSel} /> : null}
              {patrocinado && !busca.trim() && !modoHome ? (
                <TouchableOpacity style={styles.slotPatr} activeOpacity={0.9} onPress={() => router.push(patrocinado.rota as any)} accessibilityRole="button" accessibilityLabel={`${patrocinadoRotulo}: ${patrocinado.titulo}`}>
                  {patrocinado.foto ? (
                    <Image source={{ uri: patrocinado.foto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : patrocinado.logo ? (
                    <Image source={{ uri: patrocinado.logo }} style={[StyleSheet.absoluteFill, { margin: 16, marginBottom: 56 }]} resizeMode="contain" />
                  ) : (
                    <Feather name="star" size={34} color={COLORS.pink} style={{ alignSelf: 'center', marginTop: 34 }} />
                  )}
                  <View style={styles.slotPatrPilula}>
                    <Feather name="zap" size={10} color="#FFF" />
                    <Text style={styles.slotPatrPilulaTxt}>{patrocinadoRotulo}</Text>
                  </View>
                  <View style={styles.slotPatrFaixa}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slotPatrNome} numberOfLines={1}>{patrocinado.titulo}</Text>
                      {!!patrocinado.linha2 && <Text style={styles.slotPatrSub} numberOfLines={1}>{patrocinado.linha2}</Text>}
                    </View>
                    <Feather name="chevron-right" size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>
              ) : null}
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name={vazioIcone as any} size={24} color={COLORS.textMuted} />
                <Text style={styles.emptySub}>{vazioTexto}</Text>
              </View>
            }
            ListFooterComponent={rodape ? <View>{rodape}</View> : undefined}
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

  // Mesma pílula da busca da Home: 46 de altura, borda totalmente arredondada, fundo #232230.
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 18, height: 46, borderRadius: 23, backgroundColor: '#232230' },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },

  filterSection: { marginBottom: 10 },
  chipsContainer: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  chipEmAltaInactive: { borderColor: 'rgba(255, 213, 79, 0.4)', backgroundColor: 'rgba(255, 213, 79, 0.08)' },
  chipFofo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1 },
  chipFofoTxt: { fontSize: 13, fontWeight: '700' },
  slotPatr: { height: 150, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1C1B26', borderWidth: 1, borderColor: 'rgba(126,87,194,0.55)', marginBottom: 14 },
  slotPatrPilula: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7E57C2', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  slotPatrPilulaTxt: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  slotPatrFaixa: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(11,11,14,0.72)', paddingHorizontal: 14, paddingVertical: 10 },
  slotPatrNome: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  slotPatrSub: { color: '#D6D3E0', fontSize: 12, marginTop: 1 },
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
