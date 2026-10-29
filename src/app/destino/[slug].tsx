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

import FundoCaixaDegrade from '../../components/FundoCaixaDegrade';
import SubcategoriaBanners, { GrupoSub } from '../../components/SubcategoriaBanners';
import VitrineCategoria, { LocalVitrine } from '../../components/VitrineCategoria';
import { SubDef } from '../../lib/subcategorias';
import { CATEGORIAS, CATEGORIA_REAL_LABEL, SELO_FESTA, SeloCategoria, seloDaCategoria } from '../../lib/categorias';
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

// Cores das pílulas de tema (mesma família dos degradês das caixas).
const CORES_PILULA = ['#9B3CFF', '#E1306C', '#0EA5E9', '#10B981', '#F2692A', '#7048B8'];

const TILES: { id: Aba; titulo: string; sub: string; icone: string; cor: string; degrade: [string, string] }[] = [
  { id: 'onde_ficar', titulo: 'Onde ficar', sub: 'Hotéis, pousadas e regiões LGBT+ friendly', icone: 'home', cor: C.lilas, degrade: ['#7E57C2', '#3B82F6'] },
  { id: 'praias_passeios', titulo: 'Passeios', sub: 'Atrações, trilhas e roteiros', icone: 'compass', cor: '#FFD54F', degrade: ['#F2A900', '#E8590C'] },
  { id: 'experiencias', titulo: 'Experiências LGBT+', sub: 'Bares, festas, saunas, arte e cultura', icone: 'heart', cor: C.pink, degrade: ['#E1306C', '#9B3CFF'] },
  { id: 'eventos_paradas', titulo: 'Eventos e Paradas', sub: 'Datas, festas e Parada LGBT+', icone: 'calendar', cor: '#4FC3F7', degrade: ['#0EA5E9', '#4338CA'] },
];

type Item = {
  chave: string;
  titulo: string;
  linha1: string;
  linha2?: string;
  foto: string | null;
  rota?: string;
  slugs: string[]; // tudo que serve pra filtrar por tag
  rank?: number; // 0 = Premium/Fundador, 1 = Intermediário, 2 = demais (aparecem primeiro nas caixas)
  selo?: SeloCategoria;
};

const BASE_LOCAL = 'id, nome, categoria, subcategoria, descricao, bairro, bairro_exibicao, cidade, foto_capa_url, galeria_fotos, tags, plano_destaque, plano_comercial, plano_comercial_status, destaque_secao_fixada, destaque_secoes, destaque_ate';

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

function rankPlano(l: any): number {
  const ativo = (l.plano_comercial_status ?? 'ativo') === 'ativo';
  if (ativo && (l.plano_comercial === 'premium' || l.plano_comercial === 'fundador')) return 0;
  if (ativo && l.plano_comercial === 'intermediario') return 1;
  return 2;
}

// Temas do destino em ícones (tags gerais do destino): aparecem os que a cidade tem cadastrados em `destinos.tags`.
const TEMAS: SubDef[] = [
  { chave: 'romance', rotulo: 'Romance', curto: 'Romance', icone: 'heart', palavras: [] },
  { chave: 'natureza', rotulo: 'Natureza', curto: 'Natureza', icone: 'sun', palavras: [] },
  { chave: 'gastronomia', rotulo: 'Gastronomia', curto: 'Gastronomia', icone: 'coffee', palavras: [] },
  { chave: 'bem_estar', rotulo: 'Bem-estar', curto: 'Bem-estar', icone: 'smile', palavras: [] },
  { chave: 'vida_noturna', rotulo: 'Vida noturna', curto: 'Vida noturna', icone: 'moon', palavras: [] },
  { chave: 'cultura', rotulo: 'Cultura', curto: 'Cultura', icone: 'book-open', palavras: [] },
  { chave: 'praia', rotulo: 'Praia', curto: 'Praia', icone: 'umbrella', palavras: [] },
  { chave: 'aventura', rotulo: 'Aventura', curto: 'Aventura', icone: 'compass', palavras: [] },
  { chave: 'compras', rotulo: 'Compras', curto: 'Compras', icone: 'shopping-bag', palavras: [] },
  { chave: 'historia', rotulo: 'História', curto: 'História', icone: 'clock', palavras: [] },
  { chave: 'amigos', rotulo: 'Amigos', curto: 'Amigos', icone: 'users', palavras: [] },
  { chave: 'familia', rotulo: 'Família', curto: 'Família', icone: 'home', palavras: [] },
];

function completudeDe(l: any): number {
  const p = l.hospedagem_perfil;
  return (Array.isArray(p) ? p[0]?.completude : p?.completude) || 0;
}

export default function DestinoScreen() {
  useRastrearTela('destino', { detalheParam: 'slug' });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { idioma, t } = useI18n();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [destino, setDestino] = useState<Destino | null>(DESTINOS_PADRAO.find((d) => d.slug === slug) || null);
  const [aba, setAba] = useState<Aba | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [tema, setTema] = useState<string | null>(null);
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
        rank: rankPlano(l),
        slugs: [...atr, ...(l.tipo_hospedagem ? [l.tipo_hospedagem] : []), ...slugsDoTexto(l.subcategoria, l.categoria, ...(l.tags || []))],
      };
    };
    const ehHosp = (l: any) => !!l.tipo_hospedagem || (l.categoria === 'turismo' && /hotel|pousada|hostel|hosped|resort|flat/i.test(l.subcategoria || ''));
    // Cadastro mais completo aparece antes (Rodada 64)
    const ondeFicar = [...locais.filter(ehHosp)].sort((a, b) => rankPlano(a) - rankPlano(b) || completudeDe(b) - completudeDe(a)).map((l) => {
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
    const porRank = (lista: Item[]) => lista.slice().sort((a, b) => (a.rank ?? 2) - (b.rank ?? 2));
    return { onde_ficar: ondeFicar, praias_passeios: porRank(passeios), experiencias: porRank(experiencias), eventos_paradas: evs };
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

  const idsLocaisCidade = locais.map((l) => l.id as string);
  const temasDoDestino = TEMAS.filter((tm) => destino.tags.includes(tm.chave));
  const gruposTema: GrupoSub[] = temasDoDestino.map((tm) => ({ chave: tm.chave, rotulo: tm.rotulo, qtd: 1, foto: null }));
  // Lista do tema escolhido: tudo da cidade (hospedagem, passeios, experiências, eventos) que combina com a tag.
  const itensTema = tema
    ? (() => {
        const vistos = new Set<string>();
        return Object.values(itensPorAba).flat().filter((i) => combina(i, tema) && !vistos.has(i.chave) && !!vistos.add(i.chave));
      })()
    : [];
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
          {destino.foto_url ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
          ) : (
            <FundoCaixaDegrade id="dest-hero" cores={['#4A1D7A', '#B02A6B']} />
          )}
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

        {/* Vitrine do destino (mesma lógica das categorias): patrocinador master, banner Premium rotativo (até 12 vagas) e temas em ícones. */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <VitrineCategoria
            slug={`destino-${destino.slug}`}
            titulo={destino.cidade}
            locais={locais as LocalVitrine[]}
            idsLocaisOfertas={idsLocaisCidade}
            tituloLista={null}
            aposOfertas={
              gruposTema.length > 0 ? (
                <SubcategoriaBanners
                  grupos={gruposTema}
                  defs={TEMAS}
                  selecionada={tema}
                  cor={CATEGORIAS.turismo.color}
                  onAbrir={(chave) => { setAba(null); setTema((atual) => (atual === chave ? null : chave)); }}
                />
              ) : undefined
            }
          />
        </View>

        {tema && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.secao}>{`${rotuloTag(tema)} em ${destino.cidade}`}</Text>
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {carregando ? (
                <ActivityIndicator color={C.pink} style={{ marginTop: 20 }} />
              ) : itensTema.length === 0 ? (
                <View style={styles.vazio}>
                  <Feather name="compass" size={20} color={C.dim} />
                  <Text style={styles.vazioTxt}>Ainda estamos catalogando {rotuloTag(tema).toLowerCase()} em {destino.cidade}. Em breve novas opções por aqui.</Text>
                </View>
              ) : (
                itensTema.map((it) => (
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
                    </View>
                    <Feather name="chevron-right" size={18} color={C.dim} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {!!destino.descricao && <Text style={styles.descricao}>{destino.descricao}</Text>}

        {/* Caixas do destino */}
        <View style={[styles.grade, { marginTop: 14 }]}>
          {TILES.map((tile) => {
            const ativo = aba === tile.id;
            const qtd = itensPorAba[tile.id].length;
            return (
              <TouchableOpacity
                key={tile.id}
                style={[styles.tile, ativo && styles.tileAtivo]}
                activeOpacity={0.85}
                onPress={() => {
                  setFiltro(null);
                  setTema(null);
                  setAba(ativo ? null : tile.id);
                }}
                accessibilityRole="button"
              >
                <FundoCaixaDegrade id={`dest-${tile.id}`} cores={tile.degrade} />
                <Feather name={tile.icone as any} size={22} color="#FFFFFF" />
                <Text style={styles.tileTitulo}>{tile.titulo}</Text>
                <Text style={styles.tileSub} numberOfLines={2}>{tile.sub}</Text>
                <View style={styles.tileRodape}>
                  <Text style={styles.tileQtd}>{carregando ? '…' : qtd === 0 ? 'Em breve' : qtd === 1 ? '1 opção' : `${qtd} opções`}</Text>
                  <Feather name={ativo ? 'chevron-up' : 'chevron-right'} size={16} color="#FFFFFF" />
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
          <View style={[styles.cardLargo, { marginHorizontal: 16, marginTop: 18, flexDirection: 'row', gap: 12, overflow: 'hidden', borderColor: 'transparent' }]}>
            <FundoCaixaDegrade id="dest-epoca" cores={['#C026A3', '#6D3FD1']} />
            <Feather name="calendar" size={22} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nome, { color: '#FFFFFF' }]}>Melhor época</Text>
              {!!destino.melhor_epoca_texto && <Text style={[styles.linha2, { marginTop: 2, color: 'rgba(255,255,255,0.9)' }]}>{destino.melhor_epoca_texto}</Text>}
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
  pillTxt: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  descricao: { color: '#C0C0D0', fontSize: 13, lineHeight: 19, paddingHorizontal: 16, marginBottom: 4 },
  secao: { color: C.text, fontSize: 17, fontWeight: '800', paddingHorizontal: 16, marginTop: 12, marginBottom: 10 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  tile: { width: '48.5%', minHeight: 132, borderRadius: 16, padding: 14, gap: 6, backgroundColor: C.card, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  tileAtivo: { borderColor: '#FFFFFF' },
  tileTitulo: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  tileSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, lineHeight: 16 },
  tileRodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  tileQtd: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
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
  pillPeq: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillPeqTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
