// Rodada 69 — tela de busca (aberta pela barra "Pra onde vamos hoje?" da Home).
//   Sem texto: buscas recentes (salvas no aparelho), sugestões, buscas
//   populares e a cidade da busca ("Buscando em São Paulo · Alterar").
//   Com texto: resultados por tipo — Todos | Lugares | Eventos | Roteiros —
//   com "Ver todos" em cada bloco.
// A busca roda no próprio app sobre os locais aprovados da cidade, os
// eventos dos próximos dias e os roteiros publicados (nome, categoria,
// subcategoria, bairro, descrição e tags), sem acento e sem maiúsculas.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIA_REAL_LABEL, SELO_FESTA, seloDaCategoria } from '../lib/categorias';
import { carregarDestinos } from '../lib/destinos';
import { abertoAgora, fechaAs } from '../lib/horario';
import { listarRoteiros, Roteiro, todasTags } from '../lib/roteiros';
import { supabase } from '../lib/supabase';
import { rotuloTag } from '../lib/taxonomia';

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

const CHAVE_RECENTES = 'dicas_buscas_recentes';
const POPULARES = [
  { texto: 'Karaokê', cor: '#E1306C' },
  { texto: 'Happy hour', cor: '#B39DDB' },
  { texto: 'Drag show', cor: '#FFD54F' },
  { texto: 'Rooftop', cor: '#4CAF7D' },
  { texto: 'Praia LGBT+', cor: '#E1306C' },
  { texto: 'Gastronomia', cor: '#B39DDB' },
];
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
type Aba = 'todos' | 'lugares' | 'eventos' | 'roteiros';

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function combina(q: string, ...campos: (string | null | undefined)[]) {
  const alvo = norm(campos.filter(Boolean).join(' '));
  return norm(q).split(/\s+/).filter(Boolean).every((p) => alvo.includes(p.replace(/s$/, '')));
}

export default function BuscaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ cidade?: string; q?: string }>();
  const inputRef = useRef<TextInput>(null);

  const [texto, setTexto] = useState(params.q ? String(params.q) : '');
  const [buscado, setBuscado] = useState(params.q ? String(params.q) : '');
  const [cidade, setCidade] = useState<string>(params.cidade ? String(params.cidade) : 'São Paulo');
  const [cidades, setCidades] = useState<string[]>(['São Paulo']);
  const [escolhendoCidade, setEscolhendoCidade] = useState(false);
  const [recentes, setRecentes] = useState<string[]>([]);
  const [aba, setAba] = useState<Aba>('todos');

  const [carregando, setCarregando] = useState(false);
  const [locais, setLocais] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [baseCidade, setBaseCidade] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_RECENTES)
      .then((v) => v && setRecentes(JSON.parse(v)))
      .catch(() => {});
    carregarDestinos().then((d) => setCidades(Array.from(new Set(['São Paulo', ...d.map((x) => x.cidade)]))));
    setTimeout(() => inputRef.current?.focus(), 250);
  }, []);

  const salvarRecentes = (lista: string[]) => {
    setRecentes(lista);
    AsyncStorage.setItem(CHAVE_RECENTES, JSON.stringify(lista)).catch(() => {});
  };

  // Carrega a base da cidade uma vez por cidade (busca roda no aparelho)
  const carregarBase = async (c: string) => {
    if (baseCidade === c) return;
    setCarregando(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const campos =
        'id, nome, categoria, subcategoria, descricao, bairro, bairro_exibicao, cidade, foto_capa_url, galeria_fotos, rating_media, rating_total, horario_funcionamento, tags';
      const [ls, ev, rt] = await Promise.all([
        supabase.from('locais').select(campos).eq('status', 'aprovado').eq('cidade', c).limit(400),
        (async () => {
          const base = 'id, titulo, descricao, data_inicio, foto_capa_url, estilos_musicais, locais(nome, bairro, cidade)';
          let r: any = await supabase.from('eventos').select(`${base}, tags`).eq('status', 'aprovado').gte('data_inicio', hoje.toISOString()).order('data_inicio').limit(150);
          if (r.error) r = await supabase.from('eventos').select(base).eq('status', 'aprovado').gte('data_inicio', hoje.toISOString()).order('data_inicio').limit(150);
          return r;
        })(),
        listarRoteiros(),
      ]);
      setLocais((ls.data as any[]) || []);
      setEventos(((ev.data as any[]) || []).filter((e) => !e.locais?.cidade || e.locais.cidade === c));
      setRoteiros(rt.roteiros.filter((r) => r.cidade === c));
      setBaseCidade(c);
    } finally {
      setCarregando(false);
    }
  };

  const buscar = (q: string) => {
    const t = q.trim();
    setTexto(t);
    setBuscado(t);
    setAba('todos');
    if (!t) return;
    salvarRecentes([t, ...recentes.filter((r) => norm(r) !== norm(t))].slice(0, 6));
    carregarBase(cidade);
  };

  useEffect(() => {
    if (buscado) {
      setBaseCidade(null);
      carregarBase(cidade);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidade]);

  const resultados = useMemo(() => {
    if (!buscado) return { lugares: [], eventos: [], roteiros: [] };
    return {
      lugares: locais.filter((l) =>
        combina(buscado, l.nome, l.subcategoria, CATEGORIA_REAL_LABEL[l.categoria], l.bairro, l.bairro_exibicao, l.descricao, ...(l.tags || []))
      ),
      eventos: eventos.filter((e) =>
        combina(buscado, e.titulo, e.descricao, e.locais?.nome, ...(e.tags || []).map(rotuloTag), ...(e.estilos_musicais || []))
      ),
      roteiros: roteiros.filter((r) => combina(buscado, r.titulo, r.subtitulo, r.descricao, ...todasTags(r).map(rotuloTag))),
    };
  }, [buscado, locais, eventos, roteiros]);
  const total = resultados.lugares.length + resultados.eventos.length + resultados.roteiros.length;

  const Cabecalho = ({ titulo, tipo, qtd }: { titulo: string; tipo: Aba; qtd: number }) => (
    <View style={styles.blocoTopo}>
      <Text style={styles.secao}>{titulo}</Text>
      {aba === 'todos' && qtd > 2 && (
        <TouchableOpacity onPress={() => setAba(tipo)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={styles.link}>Ver todos</Text>
          <Feather name="chevron-right" size={14} color={C.pink} />
        </TouchableOpacity>
      )}
    </View>
  );

  const limite = (n: number) => (aba === 'todos' ? n : 999);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Barra de busca */}
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => router.back()} style={styles.voltar} accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={[styles.busca, !buscado && styles.buscaAtiva]}>
          <Feather name="search" size={18} color={C.pink} />
          <TextInput
            ref={inputRef}
            value={texto}
            onChangeText={(v) => {
              setTexto(v);
              if (!v) setBuscado('');
            }}
            onSubmitEditing={() => buscar(texto)}
            placeholder="Pra onde vamos hoje?"
            placeholderTextColor="#626274"
            style={styles.buscaInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!texto && (
            <TouchableOpacity onPress={() => { setTexto(''); setBuscado(''); inputRef.current?.focus(); }} accessibilityLabel="Limpar">
              <Feather name="x" size={18} color={C.dim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!buscado ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
          {recentes.length > 0 && (
            <>
              <View style={styles.blocoTopo}>
                <Text style={styles.secao}>Buscas recentes</Text>
                <TouchableOpacity onPress={() => salvarRecentes([])}>
                  <Text style={styles.link}>Limpar tudo</Text>
                </TouchableOpacity>
              </View>
              {recentes.map((r) => (
                <TouchableOpacity key={r} style={styles.linha} onPress={() => buscar(r)}>
                  <View style={styles.linhaIcone}><Feather name="clock" size={15} color={C.dim} /></View>
                  <Text style={styles.linhaTxt}>{r}</Text>
                  <TouchableOpacity onPress={() => salvarRecentes(recentes.filter((x) => x !== r))} hitSlop={10} accessibilityLabel={`Remover ${r}`}>
                    <Feather name="x" size={16} color="#626274" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={[styles.secao, { marginTop: 18 }]}>Sugestões para você</Text>
          {[
            { txt: 'O que fazer hoje', icone: 'calendar', cor: C.pink, ir: () => router.push('/secao/hoje' as any) },
            { txt: 'Lugares perto de você', icone: 'map-pin', cor: C.green, ir: () => router.push('/(tabs)/explore') },
            { txt: 'Eventos neste fim de semana', icone: 'music', cor: C.gold, ir: () => router.push('/(tabs)/events') },
            { txt: 'Roteiros LGBT+', icone: 'map', cor: C.lilas, ir: () => router.push({ pathname: '/roteiros' as any, params: { destino: cidade } }) },
          ].map((s) => (
            <TouchableOpacity key={s.txt} style={styles.linha} onPress={s.ir}>
              <View style={[styles.linhaIcone, { backgroundColor: s.cor + '22' }]}><Feather name={s.icone as any} size={15} color={s.cor} /></View>
              <Text style={styles.linhaTxt}>{s.txt}</Text>
              <Feather name="chevron-right" size={18} color={C.dim} />
            </TouchableOpacity>
          ))}

          <Text style={[styles.secao, { marginTop: 18 }]}>Buscas populares</Text>
          <View style={styles.chips}>
            {POPULARES.map((p) => (
              <TouchableOpacity key={p.texto} style={styles.chipPop} onPress={() => buscar(p.texto)}>
                <Text style={[styles.chipPopTxt, { color: p.cor }]}>{p.texto}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cidadeBox}>
            <Feather name="map-pin" size={18} color={C.pink} />
            <Text style={styles.cidadeTxt}>
              Buscando em <Text style={{ fontWeight: '800', color: C.text }}>{cidade}</Text>
            </Text>
            <TouchableOpacity onPress={() => setEscolhendoCidade(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.link}>Alterar</Text>
              <Feather name="chevron-right" size={14} color={C.pink} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.blocoTopo, { paddingHorizontal: 16, marginTop: 4 }]}>
            <Text style={styles.resTitulo} numberOfLines={1}>Resultados para “{buscado}”</Text>
            {!carregando && <Text style={styles.dim}>{total} resultado{total === 1 ? '' : 's'}</Text>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
            {([
              ['todos', 'Todos'],
              ['lugares', `Lugares${resultados.lugares.length ? ` (${resultados.lugares.length})` : ''}`],
              ['eventos', `Eventos${resultados.eventos.length ? ` (${resultados.eventos.length})` : ''}`],
              ['roteiros', `Roteiros${resultados.roteiros.length ? ` (${resultados.roteiros.length})` : ''}`],
            ] as [Aba, string][]).map(([id, rot]) => (
              <TouchableOpacity key={id} style={[styles.aba, aba === id && styles.abaAtiva]} onPress={() => setAba(id)}>
                <Text style={[styles.abaTxt, aba === id && { color: '#FFF' }]}>{rot}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.aba} onPress={() => router.push('/(tabs)/explore')}>
              <Feather name="map" size={13} color={C.text} />
              <Text style={styles.abaTxt}>Mapa</Text>
            </TouchableOpacity>
          </ScrollView>

          {carregando ? (
            <ActivityIndicator color={C.pink} style={{ marginTop: 30 }} />
          ) : total === 0 ? (
            <View style={styles.vazio}>
              <Feather name="search" size={22} color={C.dim} />
              <Text style={styles.vazioTxt}>Nada encontrado para “{buscado}” em {cidade}. Tente outra palavra ou outra cidade.</Text>
            </View>
          ) : (
            <>
              {(aba === 'todos' || aba === 'lugares') && resultados.lugares.length > 0 && (
                <View style={styles.bloco}>
                  <Cabecalho titulo="Lugares" tipo="lugares" qtd={resultados.lugares.length} />
                  <View style={styles.grade}>
                    {resultados.lugares.slice(0, limite(4)).map((l) => {
                      const selo = seloDaCategoria(l);
                      const aberto = abertoAgora(l);
                      const foto = l.foto_capa_url || l.galeria_fotos?.[0];
                      return (
                        <TouchableOpacity key={l.id} style={styles.card} onPress={() => router.push(`/business/${l.id}` as any)} activeOpacity={0.88}>
                          {foto ? <Image source={{ uri: foto }} style={styles.cardFoto} /> : <View style={[styles.cardFoto, styles.semFoto]}><Feather name="map-pin" size={20} color={C.pink} /></View>}
                          <View style={{ padding: 10, gap: 3 }}>
                            {selo && (
                              <View style={[styles.selo, { backgroundColor: selo.cor }]}><Text style={[styles.seloTxt, { color: selo.textoCor }]}>{selo.texto}</Text></View>
                            )}
                            <Text style={styles.cardTitulo} numberOfLines={1}>{l.nome}</Text>
                            {l.rating_total > 0 && (
                              <Text style={styles.cardMeta}><Text style={{ color: C.gold }}>★</Text> {Number(l.rating_media).toFixed(1)} ({l.rating_total})</Text>
                            )}
                            <Text style={styles.cardMeta} numberOfLines={1}>{[l.bairro_exibicao || l.bairro, l.cidade].filter(Boolean).join(', ')}</Text>
                            {aberto && (
                              <Text style={[styles.cardMeta, { color: C.green }]} numberOfLines={1}>● Aberto agora{fechaAs(l) ? ` · Até ${fechaAs(l)}` : ''}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {(aba === 'todos' || aba === 'eventos') && resultados.eventos.length > 0 && (
                <View style={styles.bloco}>
                  <Cabecalho titulo="Eventos" tipo="eventos" qtd={resultados.eventos.length} />
                  {resultados.eventos.slice(0, limite(3)).map((e) => {
                    const d = new Date(e.data_inicio);
                    return (
                      <TouchableOpacity key={e.id} style={styles.evento} onPress={() => router.push(`/evento/${e.id}` as any)} activeOpacity={0.88}>
                        <View style={styles.data}>
                          <Text style={styles.dataDia}>{DIAS[d.getDay()]}</Text>
                          <Text style={styles.dataNum}>{String(d.getDate()).padStart(2, '0')}</Text>
                          <Text style={styles.dataMes}>{MESES[d.getMonth()]}</Text>
                        </View>
                        {e.foto_capa_url ? <Image source={{ uri: e.foto_capa_url }} style={styles.eventoFoto} /> : <View style={[styles.eventoFoto, styles.semFoto]}><Feather name="music" size={18} color={C.pink} /></View>}
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={[styles.selo, { backgroundColor: SELO_FESTA.cor }]}><Text style={[styles.seloTxt, { color: SELO_FESTA.textoCor }]}>FESTA</Text></View>
                          <Text style={styles.cardTitulo} numberOfLines={2}>{e.titulo}</Text>
                          <Text style={styles.cardMeta} numberOfLines={1}>
                            {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {e.locais?.nome ? ` · ${e.locais.nome}` : ''}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {(aba === 'todos' || aba === 'roteiros') && resultados.roteiros.length > 0 && (
                <View style={styles.bloco}>
                  <Cabecalho titulo="Experiências e roteiros" tipo="roteiros" qtd={resultados.roteiros.length} />
                  <View style={styles.grade}>
                    {resultados.roteiros.slice(0, limite(4)).map((r) => (
                      <TouchableOpacity key={r.id} style={styles.card} onPress={() => router.push(`/roteiro/${r.slug}` as any)} activeOpacity={0.88}>
                        {r.foto_url ? <Image source={{ uri: r.foto_url }} style={styles.cardFoto} /> : <View style={[styles.cardFoto, styles.semFoto]}><Feather name="map" size={20} color={C.pink} /></View>}
                        <View style={{ padding: 10, gap: 3 }}>
                          <Text style={styles.cardTitulo} numberOfLines={2}>{r.titulo}</Text>
                          <Text style={styles.cardMeta} numberOfLines={1}>{[r.cidade, r.duracao_texto].filter(Boolean).join(' · ')}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={escolhendoCidade} transparent animationType="fade" onRequestClose={() => setEscolhendoCidade(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEscolhendoCidade(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <Text style={styles.secao}>Buscar em qual cidade?</Text>
            <ScrollView style={{ maxHeight: 360, marginTop: 8 }}>
              {cidades.map((c) => (
                <TouchableOpacity key={c} style={styles.opcao} onPress={() => { setCidade(c); setEscolhendoCidade(false); }}>
                  <Text style={[styles.linhaTxt, c === cidade && { color: C.pink, fontWeight: '800' }]}>{c}</Text>
                  {c === cidade && <Feather name="check" size={16} color={C.pink} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  voltar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  busca: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14 },
  buscaAtiva: { borderColor: C.pink, borderWidth: 1.5 },
  buscaInput: { flex: 1, color: C.text, fontSize: 15, outlineStyle: 'none' } as any,
  secao: { color: C.text, fontSize: 16, fontWeight: '800' },
  link: { color: C.pink, fontSize: 13, fontWeight: '800' },
  dim: { color: C.dim, fontSize: 12 },
  blocoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 12, height: 52, marginTop: 8 },
  linhaIcone: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0B0B0E', alignItems: 'center', justifyContent: 'center' },
  linhaTxt: { flex: 1, color: C.text, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chipPop: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  chipPopTxt: { fontSize: 13, fontWeight: '800' },
  cidadeBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  cidadeTxt: { flex: 1, color: C.dim, fontSize: 13 },
  resTitulo: { color: C.text, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  aba: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, height: 34 },
  abaAtiva: { backgroundColor: C.pink, borderColor: C.pink },
  abaTxt: { color: C.text, fontSize: 12, fontWeight: '700' },
  bloco: { paddingHorizontal: 16, marginTop: 14 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48.5%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  cardFoto: { width: '100%', height: 96 },
  semFoto: { backgroundColor: '#21173A', alignItems: 'center', justifyContent: 'center' },
  cardTitulo: { color: C.text, fontSize: 14, fontWeight: '800' },
  cardMeta: { color: C.dim, fontSize: 11 },
  selo: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  seloTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  evento: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 10, marginBottom: 10 },
  data: { width: 46, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingVertical: 6 },
  dataDia: { color: C.pink, fontSize: 10, fontWeight: '800' },
  dataNum: { color: C.pink, fontSize: 18, fontWeight: '900' },
  dataMes: { color: C.dim, fontSize: 10, fontWeight: '700' },
  eventoFoto: { width: 60, height: 60, borderRadius: 10 },
  vazio: { alignItems: 'center', gap: 10, margin: 16, padding: 20, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  vazioTxt: { color: C.dim, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  opcao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
});
