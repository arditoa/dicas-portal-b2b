// Rodada 63 — página do destino (Dicas Trip → Destinos em destaque →
// "Ver guia completo"), no modelo da referência "Rio de Janeiro LGBT+":
//   • topo com foto (destinos.foto_url) + tags gerais do destino
//   • Explore o destino: Onde ficar | Praias e passeios | Experiências LGBT+ |
//     Eventos e Paradas — cada um abre a lista daquela cidade com as tags
//     oficiais (src/lib/taxonomia.ts) como filtro
//   • Roteiro em destaque e Melhor época
//
// Tudo vem de dados reais da cidade (locais, pacotes_turismo, eventos).
// Se a migration 036 ainda não rodou, cai no modo básico sem as tags novas.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIA_REAL_LABEL, SELO_FESTA, SeloCategoria, seloDaCategoria } from '../../lib/categorias';
import { carregarDestinos, Destino, DESTINOS_PADRAO } from '../../lib/destinos';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { GRUPOS_DESTINO, rotuloTag, slugTag } from '../../lib/taxonomia';
import { listarRoteiros, Roteiro } from '../../lib/roteiros';
import { useRastrearTela } from '../../lib/usoTelas';

const C = {
  bg: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  text: '#F5F5F7',
  dim: '#A0A0B2',
  pink: '#E1306C',
  purple: '#7E57C2',
  lilas: '#B39DDB',
  green: '#4CAF7D',
};

type Aba = 'onde_ficar' | 'praias_passeios' | 'experiencias' | 'eventos_paradas';

const TILES: { id: Aba; titulo: string; sub: string; icone: string; cor: string }[] = [
  { id: 'onde_ficar', titulo: 'Onde ficar', sub: 'Hotéis, pousadas e regiões LGBT+ friendly', icone: 'home', cor: C.lilas },
  { id: 'praias_passeios', titulo: 'Praias e passeios', sub: 'Praias, atrações e roteiros', icone: 'sun', cor: '#FFD54F' },
  { id: 'experiencias', titulo: 'Experiências LGBT+', sub: 'Bares, festas, saunas, arte e cultura', icone: 'heart', cor: C.pink },
  { id: 'eventos_paradas', titulo: 'Eventos e Paradas', sub: 'Datas, festas e Parada LGBT+', icone: 'calendar', cor: '#4FC3F7' },
];

type Item = {
  chave: string;
  titulo: string;
  linha1: string;
  linha2?: string;
  foto: string | null;
  rota?: string;
  slugs: string[]; // tudo que serve pra filtrar por tag
  selo?: SeloCategoria;
};

const BASE_LOCAL = 'id, nome, categoria, subcategoria, descricao, bairro, bairro_exibicao, cidade, foto_capa_url, galeria_fotos, tags';

// Texto livre (subcategoria, tags de experiência) também vira slug, pra
// que "Sauna" cadastrado como subcategoria bata com a tag "Saunas".
function slugsDoTexto(...partes: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const p of partes) {
    if (!p) continue;
    const s = slugTag(p);
    out.push(s);
    for (const w of s.split('_')) if (w.length >= 4) out.push(w.replace(/s$/, ''));
  }
  return out;
}

function combina(item: Item, tag: string): boolean {
  if (item.slugs.includes(tag)) return true;
  const raiz = tag.split('_').find((w) => w.length >= 4)?.replace(/s$/, '');
  return !!raiz && item.slugs.includes(raiz);
}

// Tags de "Onde ficar" que são atalhos de outras tags da hospedagem
const ALIAS_ONDE_FICAR: Record<string, string[]> = {
  acessivel: ['elevador', 'rampa_de_acesso', 'quarto_adaptado', 'acesso_para_cadeirantes', 'banheiro_adaptado'],
  vida_noturna_proxima: ['proximo_a_vida_noturna', 'vida_noturna'],
  praia_proxima: ['pe_na_areia', 'beira_mar'],
  transporte_proximo: ['proximo_ao_metro', 'proximo_ao_aeroporto'],
};

// Tenta com os dados de hospedagem (036) e o % de cadastro completo (037);
// se o banco ainda não tiver essas colunas, cai pro básico.
async function buscarLocais(cidade: string, nivel = 2): Promise<any[]> {
  const campos =
    nivel === 2 ? `${BASE_LOCAL}, tipo_hospedagem, atributos, hospedagem_perfil(completude)` : nivel === 1 ? `${BASE_LOCAL}, tipo_hospedagem, atributos` : BASE_LOCAL;
  const r = await supabase.from('locais').select(campos).eq('status', 'aprovado').eq('cidade', cidade).limit(300);
  if (r.error && nivel > 0) return buscarLocais(cidade, nivel - 1);
  return ((r.data as any[]) || []) as any[];
}

function completudeDe(l: any): number {
  const p = l.hospedagem_perfil;
  return (Array.isArray(p) ? p[0]?.completude : p?.completude) || 0;
}

export default function DestinoScreen() {
  useRastrearTela('destino', { detalheParam: 'slug' });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { idioma } = useI18n();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [destino, setDestino] = useState<Destino | null>(DESTINOS_PADRAO.find((d) => d.slug === slug) || null);
  const [aba, setAba] = useState<Aba | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [locais, setLocais] = useState<any[]>([]);
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [roteirosCidade, setRoteirosCidade] = useState<Roteiro[]>([]);

  useEffect(() => {
    carregarDestinos().then((lista) => {
      const d = lista.find((x) => x.slug === slug);
      if (d) setDestino(d);
    });
  }, [slug]);

  // Rodada 69 — roteiros/experiências cadastrados para esta cidade
  useEffect(() => {
    if (!destino) return;
    listarRoteiros().then(({ roteiros }) => setRoteirosCidade(roteiros.filter((r) => r.cidade === destino.cidade)));
  }, [destino?.cidade]);

  useEffect(() => {
    if (!destino) return;
    let ativo = true;
    (async () => {
      setCarregando(true);
      try {
        const cidade = destino.cidade;
        const [ls, pc, ev] = await Promise.all([
          buscarLocais(cidade),
          (async () => {
            let r: any = await supabase.from('pacotes_turismo').select('id, nome, descricao, foto_url, tags, local_id, locais(cidade, nome)').eq('ativo', true).limit(100);
            if (r.error) r = await supabase.from('pacotes_turismo').select('id, nome, descricao, foto_url, local_id, locais(cidade, nome)').eq('ativo', true).limit(100);
            return ((r.data as any[]) || []).filter((p) => p.locais?.cidade === cidade);
          })(),
          (async () => {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const campos = 'id, titulo, data_inicio, foto_capa_url, estilos_musicais, publico_tags, locais(nome, bairro, cidade)';
            let r: any = await supabase.from('eventos').select(`${campos}, tags`).eq('status', 'aprovado').gte('data_inicio', hoje.toISOString()).order('data_inicio').limit(120);
            if (r.error) r = await supabase.from('eventos').select(campos).eq('status', 'aprovado').gte('data_inicio', hoje.toISOString()).order('data_inicio').limit(120);
            return ((r.data as any[]) || []).filter((e) => e.locais?.cidade === cidade);
          })(),
        ]);
        if (!ativo) return;
        setLocais(ls);
        setPacotes(pc);
        setEventos(ev);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [destino?.cidade]);

  const itensPorAba = useMemo<Record<Aba, Item[]>>(() => {
    const paraItem = (l: any, linha1?: string): Item => {
      const atr: string[] = Object.values((l.atributos as Record<string, string[]>) || {}).flat();
      return {
        chave: `l-${l.id}`,
        titulo: l.nome,
        linha1: linha1 || `${CATEGORIA_REAL_LABEL[l.categoria] || l.categoria} • ${l.bairro_exibicao || l.bairro || l.cidade}`,
        linha2: l.descricao || undefined,
        foto: l.foto_capa_url || l.galeria_fotos?.[0] || null,
        rota: `/business/${l.id}`,
        selo: seloDaCategoria(l),
        slugs: [...atr, ...(l.tipo_hospedagem ? [l.tipo_hospedagem] : []), ...slugsDoTexto(l.subcategoria, l.categoria, ...(l.tags || []))],
      };
    };
    const ehHosp = (l: any) => !!l.tipo_hospedagem || (l.categoria === 'turismo' && /hotel|pousada|hostel|hosped|resort|flat/i.test(l.subcategoria || ''));
    // Cadastro mais completo aparece antes (Rodada 64)
    const ondeFicar = [...locais.filter(ehHosp)].sort((a, b) => completudeDe(b) - completudeDe(a)).map((l) => {
      const it = paraItem(l, `${l.tipo_hospedagem ? rotuloTag(l.tipo_hospedagem) : l.subcategoria || 'Hospedagem'} • ${l.bairro_exibicao || l.bairro || ''}`);
      for (const [alias, origem] of Object.entries(ALIAS_ONDE_FICAR)) if (origem.some((o) => it.slugs.includes(o))) it.slugs.push(alias);
      return it;
    });
    const passeios: Item[] = [
      ...pacotes.map((p) => ({
        chave: `p-${p.id}`,
        titulo: p.nome,
        linha1: p.locais?.nome || 'Passeio',
        linha2: p.descricao || undefined,
        foto: p.foto_url || null,
        rota: `/business/${p.local_id}`,
        slugs: [...(p.tags || []), ...slugsDoTexto(p.nome)],
      })),
      ...locais.filter((l) => (l.categoria === 'turismo' || l.categoria === 'lazer') && !ehHosp(l)).map((l) => paraItem(l)),
    ];
    const experiencias = locais
      .filter((l) => ['lugares', 'eventos', 'gastronomia', 'cultura', 'beleza', 'lazer'].includes(l.categoria))
      .map((l) => {
        const it = paraItem(l);
        if (l.categoria === 'lugares') it.slugs.push('bares_lgbt', 'bare');
        if (l.categoria === 'eventos') it.slugs.push('festas_lgbt', 'baladas');
        if (l.categoria === 'gastronomia') it.slugs.push('restaurantes', 'experiencias_gastronomicas');
        if (l.categoria === 'cultura') it.slugs.push('arte', 'cultura_queer');
        return it;
      });
    const evs: Item[] = eventos.map((e) => {
      const d = new Date(e.data_inicio);
      return {
        chave: `e-${e.id}`,
        titulo: e.titulo,
        linha1: `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • ${e.locais?.nome || ''}`,
        foto: e.foto_capa_url || null,
        rota: `/evento/${e.id}`,
        selo: SELO_FESTA,
        slugs: [...(e.tags || []), ...slugsDoTexto(e.titulo, ...(e.estilos_musicais || []))],
      };
    });
    return { onde_ficar: ondeFicar, praias_passeios: passeios, experiencias, eventos_paradas: evs };
  }, [locais, pacotes, eventos]);

  if (!destino) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.vazioTxt}>Destino não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.link}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const grupoAba = aba ? GRUPOS_DESTINO.find((g) => g.id === aba) : null;
  const itensAba = aba ? itensPorAba[aba] : [];
  const itensFiltrados = filtro ? itensAba.filter((i) => combina(i, filtro)) : itensAba;
  // Só mostra como filtro as tags que têm pelo menos um resultado
  const tagsComResultado = grupoAba ? grupoAba.tags.map(slugTag).filter((t) => itensAba.some((i) => combina(i, t))) : [];
  const roteiro = destino.roteiro_titulo
    ? { titulo: destino.roteiro_titulo, resumo: destino.roteiro_resumo, link: destino.roteiro_link }
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Topo */}
        <View style={styles.hero}>
          {destino.foto_url ? <Image source={{ uri: destino.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: destino.foto_url ? 'rgba(0,0,0,0.45)' : '#21173A' }]} />
          <TouchableOpacity onPress={() => router.back()} style={styles.voltar} accessibilityRole="button" accessibilityLabel="Voltar">
            <Feather name="chevron-left" size={24} color="#FFF" />
          </TouchableOpacity>
          {!destino.foto_url && (
            <View style={styles.heroIcone}>
              <Feather name="map-pin" size={34} color={C.pink} />
            </View>
          )}
          <View style={styles.heroTexto}>
            <View style={styles.tagTrip}><Text style={styles.tagTripTxt}>DICAS TRIP · {destino.uf}</Text></View>
            <Text style={styles.heroTitulo}>{destino.cidade}</Text>
            <Text style={styles.heroVibe}>{destino.vibe[idioma] || destino.vibe.pt}</Text>
          </View>
          {!!destino.foto_url && !!destino.foto_credito && <Text style={styles.credito}>{destino.foto_credito}</Text>}
        </View>

        {destino.tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {destino.tags.map((t) => (
              <View key={t} style={styles.pill}><Text style={styles.pillTxt}>{rotuloTag(t)}</Text></View>
            ))}
          </ScrollView>
        )}

        {!!destino.descricao && <Text style={styles.descricao}>{destino.descricao}</Text>}

        {/* Explore o destino */}
        <Text style={styles.secao}>Explore o destino</Text>
        <View style={styles.grade}>
          {TILES.map((tile) => {
            const ativo = aba === tile.id;
            const qtd = itensPorAba[tile.id].length;
            return (
              <TouchableOpacity
                key={tile.id}
                style={[styles.tile, ativo && { borderColor: tile.cor }]}
                activeOpacity={0.85}
                onPress={() => {
                  setFiltro(null);
                  setAba(ativo ? null : tile.id);
                }}
                accessibilityRole="button"
              >
                <Feather name={tile.icone as any} size={22} color={tile.cor} />
                <Text style={styles.tileTitulo}>{tile.titulo}</Text>
                <Text style={styles.tileSub} numberOfLines={2}>{tile.sub}</Text>
                <View style={styles.tileRodape}>
                  <Text style={styles.tileQtd}>{carregando ? '…' : qtd === 0 ? 'Em breve' : qtd === 1 ? '1 opção' : `${qtd} opções`}</Text>
                  <Feather name={ativo ? 'chevron-up' : 'chevron-right'} size={16} color={tile.cor} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {aba && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.secao}>{TILES.find((t) => t.id === aba)!.titulo}</Text>
            {tagsComResultado.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                <TouchableOpacity onPress={() => setFiltro(null)} style={[styles.filtro, !filtro && styles.filtroAtivo]}>
                  <Text style={[styles.filtroTxt, !filtro && { color: '#FFF' }]}>Todos</Text>
                </TouchableOpacity>
                {tagsComResultado.map((t) => (
                  <TouchableOpacity key={t} onPress={() => setFiltro(filtro === t ? null : t)} style={[styles.filtro, filtro === t && styles.filtroAtivo]}>
                    <Text style={[styles.filtroTxt, filtro === t && { color: '#FFF' }]}>{rotuloTag(t)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {carregando ? (
                <ActivityIndicator color={C.pink} style={{ marginTop: 20 }} />
              ) : itensFiltrados.length === 0 ? (
                <View style={styles.vazio}>
                  <Feather name="compass" size={20} color={C.dim} />
                  <Text style={styles.vazioTxt}>
                    Ainda estamos catalogando {destino.cidade}. Em breve novas opções por aqui.
                  </Text>
                </View>
              ) : (
                itensFiltrados.map((it) => (
                  <TouchableOpacity key={it.chave} style={styles.item} activeOpacity={0.85} onPress={() => it.rota && router.push(it.rota as any)}>
                    <View style={styles.foto}>
                      {it.foto ? <Image source={{ uri: it.foto }} style={{ width: '100%', height: '100%' }} /> : <Feather name="map-pin" size={18} color={C.dim} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      {it.selo && (
                        <View style={[styles.selo, { backgroundColor: it.selo.cor }]}>
                          <Text style={[styles.seloTxt, { color: it.selo.textoCor }]}>{it.selo.texto}</Text>
                        </View>
                      )}
                      <Text style={styles.nome} numberOfLines={1}>{it.titulo}</Text>
                      <Text style={styles.linha1} numberOfLines={1}>{it.linha1}</Text>
                      {!!it.linha2 && <Text style={styles.linha2} numberOfLines={2}>{it.linha2}</Text>}
                    </View>
                    <Feather name="chevron-right" size={18} color={C.dim} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {/* Rodada 69 — Experiências e roteiros da cidade */}
        {roteirosCidade.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 }}>
              <Text style={styles.secao}>Roteiros e experiências</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/roteiros' as any, params: { destino: destino.cidade } })}>
                <Text style={styles.link}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
              {roteirosCidade.map((rt) => (
                <TouchableOpacity key={rt.id} style={styles.roteiroCard} onPress={() => router.push(`/roteiro/${rt.slug}` as any)} activeOpacity={0.85}>
                  {rt.foto_url ? (
                    <Image source={{ uri: rt.foto_url }} style={styles.roteiroFoto} />
                  ) : (
                    <View style={[styles.roteiroFoto, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#21173A' }]}>
                      <Feather name="map" size={22} color={C.pink} />
                    </View>
                  )}
                  <View style={{ padding: 10 }}>
                    <Text style={styles.nome} numberOfLines={2}>{rt.titulo}</Text>
                    <Text style={styles.linha2}>{[rt.duracao_texto, rt.paradas_qtd ? `${rt.paradas_qtd} paradas` : null].filter(Boolean).join(' · ')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Roteiro em destaque */}
        {roteiro && (
          <>
            <Text style={styles.secao}>Roteiro em destaque</Text>
            <View style={[styles.cardLargo, { marginHorizontal: 16 }]}>
              <View style={styles.tagRoteiro}><Text style={styles.tagRoteiroTxt}>ROTEIRO</Text></View>
              <Text style={styles.nome}>{roteiro.titulo}</Text>
              {!!roteiro.resumo && <Text style={[styles.linha2, { marginTop: 4 }]}>{roteiro.resumo}</Text>}
              {!!roteiro.link && (
                <TouchableOpacity style={styles.btnRoxo} onPress={() => Linking.openURL(roteiro.link!)}>
                  <Text style={styles.btnRoxoTxt}>Ver roteiro</Text>
                  <Feather name="chevron-right" size={16} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Melhor época */}
        {(destino.melhor_epoca.length > 0 || !!destino.melhor_epoca_texto) && (
          <View style={[styles.cardLargo, { marginHorizontal: 16, marginTop: 18, flexDirection: 'row', gap: 12 }]}>
            <Feather name="calendar" size={22} color={C.pink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>Melhor época</Text>
              {!!destino.melhor_epoca_texto && <Text style={[styles.linha2, { marginTop: 2 }]}>{destino.melhor_epoca_texto}</Text>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {destino.melhor_epoca.map((t) => (
                  <View key={t} style={styles.pillPeq}><Text style={styles.pillPeqTxt}>{rotuloTag(t)}</Text></View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: { height: 240, justifyContent: 'flex-end', overflow: 'hidden', marginHorizontal: 12, marginTop: 8, borderRadius: 20 },
  voltar: { position: 'absolute', top: 10, left: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  heroIcone: { position: 'absolute', top: 40, right: 24, width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  heroTexto: { padding: 18, gap: 4 },
  tagTrip: { alignSelf: 'flex-start', backgroundColor: C.purple, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagTripTxt: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  heroTitulo: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  heroVibe: { color: '#E6E3EF', fontSize: 14 },
  credito: { position: 'absolute', right: 10, bottom: 6, color: 'rgba(255,255,255,0.6)', fontSize: 9 },
  pills: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  pill: { borderWidth: 1, borderColor: C.purple, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#1B1430' },
  pillTxt: { color: C.lilas, fontSize: 12, fontWeight: '800' },
  descricao: { color: '#C0C0D0', fontSize: 13, lineHeight: 19, paddingHorizontal: 16, marginBottom: 4 },
  secao: { color: C.text, fontSize: 17, fontWeight: '800', paddingHorizontal: 16, marginTop: 12, marginBottom: 10 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  tile: { width: '48.5%', minHeight: 140, borderRadius: 16, padding: 14, gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tileTitulo: { color: C.text, fontSize: 15, fontWeight: '800' },
  tileSub: { color: C.dim, fontSize: 12, lineHeight: 16 },
  tileRodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  tileQtd: { color: C.dim, fontSize: 12, fontWeight: '700' },
  filtro: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.card },
  filtroAtivo: { backgroundColor: C.purple, borderColor: C.purple },
  filtroTxt: { color: C.dim, fontSize: 12, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  foto: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#1A1926', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  selo: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 3 },
  seloTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  nome: { fontSize: 14, fontWeight: '800', color: C.text },
  linha1: { fontSize: 12, fontWeight: '600', color: C.pink },
  linha2: { fontSize: 12, color: C.dim },
  vazio: { alignItems: 'center', gap: 10, padding: 20, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  vazioTxt: { fontSize: 12, color: C.dim, textAlign: 'center', lineHeight: 18 },
  link: { color: C.pink, fontWeight: '800' },
  cardLargo: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14 },
  tagRoteiro: { alignSelf: 'flex-start', backgroundColor: C.purple, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  tagRoteiroTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  btnRoxo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.purple, borderRadius: 12, paddingVertical: 11, marginTop: 12 },
  btnRoxoTxt: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  roteiroCard: { width: 200, borderRadius: 14, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  roteiroFoto: { width: '100%', height: 100 },
  pillPeq: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillPeqTxt: { color: '#D0D0E0', fontSize: 11, fontWeight: '700' },
});
