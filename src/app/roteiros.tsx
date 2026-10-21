// Rodada 69 — "Experiências e roteiros" (Dicas Trip), na sequência pedida:
//   1. Roteiros e experiências em destaque (carrossel)
//   2. Campo de pesquisa
//   3. Filtros por destino, duração, estilo e público
//   4. Categorias de experiências ("Escolha sua experiência")
//   5. Roteiros em destaque (grade)
//   6. Experiências individuais
//   7. Cada card abre a página detalhada (/roteiro/[slug])
// Parâmetros opcionais: ?destino=<cidade>&tema=<slug>
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ehRoteiroCompleto, listarRoteiros, opcoesDoGrupo, Roteiro, tagsVisiveis, todasTags } from '../lib/roteiros';
import { rotuloTag, TEMAS_ATALHO } from '../lib/taxonomia';

const C = {
  bg: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  text: '#F5F5F7',
  dim: '#A0A0B2',
  pink: '#E1306C',
  purple: '#7E57C2',
  lilas: '#B39DDB',
  gold: '#FFD54F',
  green: '#4CAF7D',
};

type FiltroId = 'destino' | 'duracao' | 'tema' | 'publico';
const FILTROS: { id: FiltroId; label: string; icone: string }[] = [
  { id: 'destino', label: 'Destino', icone: 'map-pin' },
  { id: 'duracao', label: 'Duração', icone: 'calendar' },
  { id: 'tema', label: 'Estilo', icone: 'sliders' },
  { id: 'publico', label: 'Público', icone: 'users' },
];

const CORES_TAG = ['#E1306C', '#4CAF7D', '#B39DDB', '#FFB74D', '#4FC3F7'];

function semAcento(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function Foto({ r, style, icone = 'map', semIcone = false }: { r: Roteiro; style: any; icone?: string; semIcone?: boolean }) {
  return r.foto_url ? (
    <Image source={{ uri: r.foto_url }} style={style} resizeMode="cover" />
  ) : (
    <View style={[style, styles.semFoto]}>
      {!semIcone && <Feather name={icone as any} size={26} color={C.pink} />}
    </View>
  );
}

export default function RoteirosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ destino?: string; tema?: string }>();
  const [carregando, setCarregando] = useState(true);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<Partial<Record<FiltroId, string>>>({
    ...(params.destino ? { destino: String(params.destino) } : {}),
    ...(params.tema ? { tema: String(params.tema) } : {}),
  });
  const [abrindo, setAbrindo] = useState<FiltroId | null>(null);

  useEffect(() => {
    listarRoteiros().then(({ roteiros }) => {
      setRoteiros(roteiros);
      setCarregando(false);
    });
  }, []);

  const filtrados = useMemo(() => {
    const q = semAcento(busca.trim());
    return roteiros.filter((r) => {
      const tags = todasTags(r);
      if (filtros.destino && r.cidade !== filtros.destino) return false;
      if (filtros.duracao && r.duracao !== filtros.duracao && !tags.includes(filtros.duracao)) return false;
      if (filtros.tema && !tags.includes(filtros.tema)) return false;
      if (filtros.publico && !tags.includes(filtros.publico)) return false;
      if (q) {
        const texto = semAcento([r.titulo, r.subtitulo, r.cidade, ...tags.map(rotuloTag)].join(' '));
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [roteiros, busca, filtros]);

  const destaques = filtrados.filter((r) => r.destaque);
  const completos = filtrados.filter(ehRoteiroCompleto);
  const experiencias = filtrados.filter((r) => !ehRoteiroCompleto(r));

  // Opções de cada filtro: só as que existem nos roteiros cadastrados
  const opcoes = (id: FiltroId): string[] => {
    if (id === 'destino') return Array.from(new Set(roteiros.map((r) => r.cidade))).sort();
    const grupo = id === 'tema' ? [...opcoesDoGrupo('tema'), ...opcoesDoGrupo('lgbt')] : opcoesDoGrupo(id);
    const usadas = new Set(roteiros.flatMap((r) => [...todasTags(r), r.duracao || '']));
    return grupo.filter((t) => usadas.has(t));
  };

  const rotuloFiltro = (id: FiltroId) => {
    const v = filtros[id];
    if (!v) return FILTROS.find((f) => f.id === id)!.label;
    return id === 'destino' ? v : rotuloTag(v);
  };

  const abrir = (r: Roteiro) => router.push(`/roteiro/${r.slug}` as any);
  const temFiltro = Object.values(filtros).some(Boolean) || !!busca.trim();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.topo}>
          <TouchableOpacity onPress={() => router.back()} style={styles.voltar} accessibilityLabel="Voltar">
            <Feather name="chevron-left" size={24} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>Experiências e roteiros</Text>
            <Text style={styles.sub}>Descubra roteiros e experiências para viver cada destino do seu jeito.</Text>
          </View>
        </View>

        {carregando ? (
          <ActivityIndicator color={C.pink} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* 1. Destaques */}
            {destaques.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }} snapToInterval={312} decelerationRate="fast">
                {destaques.map((r) => (
                  <TouchableOpacity key={r.id} style={styles.hero} activeOpacity={0.9} onPress={() => abrir(r)}>
                    <Foto r={r} style={StyleSheet.absoluteFill} semIcone />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
                    <View style={styles.heroConteudo}>
                      <View style={[styles.selo, { backgroundColor: C.gold }]}>
                        <Text style={[styles.seloTxt, { color: '#000' }]}>DESTAQUE</Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.heroTitulo} numberOfLines={2}>{r.titulo}</Text>
                      {!!r.subtitulo && <Text style={styles.heroSub} numberOfLines={2}>{r.subtitulo}</Text>}
                      <View style={styles.heroStats}>
                        {!!r.duracao_texto && (
                          <View style={styles.stat}><Feather name="calendar" size={13} color={C.pink} /><Text style={styles.statTxt}>{r.duracao_texto}</Text></View>
                        )}
                        {!!r.paradas_qtd && (
                          <View style={styles.stat}><Feather name="map-pin" size={13} color={C.lilas} /><Text style={styles.statTxt}>{r.paradas_qtd} paradas</Text></View>
                        )}
                        {!!r.tags.deslocamento?.length && (
                          <View style={styles.stat}><Feather name="navigation" size={13} color="#4FC3F7" /><Text style={styles.statTxt} numberOfLines={1}>{r.tags.deslocamento.slice(0, 2).map(rotuloTag).join(' + ')}</Text></View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* 2. Pesquisa */}
            <View style={styles.busca}>
              <Feather name="search" size={18} color={C.dim} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar destino, experiência ou roteiro"
                placeholderTextColor="#626274"
                style={styles.buscaInput}
                returnKeyType="search"
              />
              {!!busca && (
                <TouchableOpacity onPress={() => setBusca('')} accessibilityLabel="Limpar busca">
                  <Feather name="x" size={18} color={C.dim} />
                </TouchableOpacity>
              )}
            </View>

            {/* 3. Filtros */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {FILTROS.map((f) => {
                const ativo = !!filtros[f.id];
                return (
                  <TouchableOpacity key={f.id} style={[styles.filtro, ativo && styles.filtroAtivo]} onPress={() => setAbrindo(f.id)}>
                    <Feather name={f.icone as any} size={14} color={ativo ? '#FFF' : C.pink} />
                    <Text style={[styles.filtroTxt, ativo && { color: '#FFF' }]}>{rotuloFiltro(f.id)}</Text>
                    <Feather name="chevron-down" size={14} color={ativo ? '#FFF' : C.dim} />
                  </TouchableOpacity>
                );
              })}
              {temFiltro && (
                <TouchableOpacity style={styles.filtro} onPress={() => { setFiltros({}); setBusca(''); }}>
                  <Feather name="x" size={14} color={C.dim} />
                  <Text style={styles.filtroTxt}>Limpar</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* 4. Categorias */}
            <Text style={styles.secao}>Escolha sua experiência</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {TEMAS_ATALHO.map((t) => {
                const ativo = filtros.tema === t.slug;
                return (
                  <TouchableOpacity
                    key={t.slug}
                    style={[styles.tema, ativo && { borderColor: t.cor, backgroundColor: t.cor + '22' }]}
                    onPress={() => setFiltros((f) => ({ ...f, tema: ativo ? undefined : t.slug }))}
                  >
                    <Feather name={t.icone as any} size={22} color={t.cor} />
                    <Text style={styles.temaTxt}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 5. Roteiros em destaque */}
            {completos.length > 0 && (
              <>
                <Text style={styles.secao}>Roteiros em destaque</Text>
                <View style={styles.grade}>
                  {completos.map((r) => (
                    <TouchableOpacity key={r.id} style={styles.card} activeOpacity={0.9} onPress={() => abrir(r)}>
                      <Foto r={r} style={styles.cardFoto} />
                      <View style={styles.cardCorpo}>
                        <Text style={styles.cardTitulo} numberOfLines={2}>{r.titulo}</Text>
                        <Text style={styles.cardMeta}>
                          {[r.duracao_texto, r.paradas_qtd ? `${r.paradas_qtd} paradas` : null].filter(Boolean).join(' · ')}
                        </Text>
                        <View style={styles.chips}>
                          {tagsVisiveis(r)
                            .filter((t) => t !== r.duracao)
                            .slice(0, 2)
                            .map((t, i) => (
                              <View key={t} style={[styles.chipPeq, { borderColor: CORES_TAG[i % CORES_TAG.length] }]}>
                                <Text style={[styles.chipPeqTxt, { color: CORES_TAG[i % CORES_TAG.length] }]} numberOfLines={1}>{rotuloTag(t)}</Text>
                              </View>
                            ))}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* 6. Experiências individuais */}
            {experiencias.length > 0 && (
              <>
                <Text style={styles.secao}>Experiências para você</Text>
                <View style={styles.grade}>
                  {experiencias.map((r) => (
                    <TouchableOpacity key={r.id} style={styles.card} activeOpacity={0.9} onPress={() => abrir(r)}>
                      <Foto r={r} style={styles.cardFotoBaixa} icone="star" />
                      <View style={styles.cardCorpo}>
                        <Text style={styles.cardTitulo} numberOfLines={2}>{r.titulo}</Text>
                        <Text style={styles.cardMeta} numberOfLines={1}>
                          {[r.cidade, r.duracao_texto].filter(Boolean).join(' · ')}
                        </Text>
                        {!!r.preco_texto && (
                          <View style={[styles.chipPeq, { borderColor: C.green, alignSelf: 'flex-start', marginTop: 6 }]}>
                            <Text style={[styles.chipPeqTxt, { color: C.green }]} numberOfLines={1}>{r.preco_texto}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {filtrados.length === 0 && (
              <View style={styles.vazio}>
                <Feather name="compass" size={22} color={C.dim} />
                <Text style={styles.vazioTxt}>Nenhum roteiro com esses filtros ainda. Estamos catalogando novas experiências.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Seletor do filtro */}
      <Modal visible={!!abrindo} transparent animationType="fade" onRequestClose={() => setAbrindo(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAbrindo(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            {abrindo && (
              <>
                <Text style={styles.sheetTitulo}>{FILTROS.find((f) => f.id === abrindo)!.label}</Text>
                <ScrollView style={{ maxHeight: 380 }}>
                  {[undefined, ...opcoes(abrindo)].map((v) => {
                    const ativo = filtros[abrindo] === v;
                    return (
                      <TouchableOpacity
                        key={v || 'todos'}
                        style={styles.opcao}
                        onPress={() => {
                          setFiltros((f) => ({ ...f, [abrindo]: v }));
                          setAbrindo(null);
                        }}
                      >
                        <Text style={[styles.opcaoTxt, ativo && { color: C.pink, fontWeight: '800' }]}>
                          {v === undefined ? 'Todos' : abrindo === 'destino' ? v : rotuloTag(v)}
                        </Text>
                        {ativo && <Feather name="check" size={16} color={C.pink} />}
                      </TouchableOpacity>
                    );
                  })}
                  {opcoes(abrindo).length === 0 && <Text style={[styles.sub, { padding: 12 }]}>Ainda não há opções cadastradas.</Text>}
                </ScrollView>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12 },
  voltar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: C.text, fontSize: 20, fontWeight: '900' },
  sub: { color: C.dim, fontSize: 12, marginTop: 2, lineHeight: 17 },
  semFoto: { backgroundColor: '#21173A', alignItems: 'center', justifyContent: 'center' },
  hero: { width: 300, height: 200, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  heroConteudo: { flex: 1, padding: 14 },
  heroTitulo: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  heroSub: { color: '#E6E3EF', fontSize: 12, marginTop: 2, lineHeight: 16 },
  heroStats: { flexDirection: 'row', gap: 12, marginTop: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  statTxt: { color: '#FFF', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  selo: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  seloTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 10, height: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14 },
  buscaInput: { flex: 1, color: C.text, fontSize: 14, outlineStyle: 'none' } as any,
  filtro: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, height: 38 },
  filtroAtivo: { backgroundColor: C.pink, borderColor: C.pink },
  filtroTxt: { color: C.text, fontSize: 12, fontWeight: '700' },
  secao: { color: C.text, fontSize: 17, fontWeight: '800', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  tema: { width: 92, height: 76, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', gap: 6 },
  temaTxt: { color: C.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  card: { width: '48.5%', borderRadius: 14, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  cardFoto: { width: '100%', height: 100 },
  cardFotoBaixa: { width: '100%', height: 80 },
  cardCorpo: { padding: 10 },
  cardTitulo: { color: C.text, fontSize: 14, fontWeight: '800' },
  cardMeta: { color: C.dim, fontSize: 11, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chipPeq: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, maxWidth: '100%' },
  chipPeqTxt: { fontSize: 10, fontWeight: '700' },
  vazio: { alignItems: 'center', gap: 10, margin: 16, padding: 20, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  vazioTxt: { color: C.dim, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  sheetTitulo: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  opcao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  opcaoTxt: { color: C.text, fontSize: 14 },
});
