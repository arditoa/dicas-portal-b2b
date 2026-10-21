// Página de seção aberta pelas 4 caixas da Home (out/2026):
//   /secao/trip    → Dicas Trip (destaques de turismo)
//   /secao/em-alta → Em Alta (rotação dos planos Intermediário/Premium e manuais)
//   /secao/hoje    → O que fazer hoje (eventos de hoje, locais fixados e abertos agora)
//   /secao/semana  → Destaques da semana (selo DESTAQUE: premium/fundador ou manual)
//   /secao/experiencia → Escolha pela experiência (tags → locais com aquela experiência)
// Mesmas regras de seleção/ordem que a Home usava (lib/destaque.ts), agora
// numa lista vertical completa, em vez de carrosséis na Home.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIA_REAL_LABEL, SELO_FESTA, SeloCategoria, seloDaCategoria } from '../../lib/categorias';
import { compararDestaque, deveExibirGlow, deveIncluirEm, estaFixadoEm, estaFixadoParaHoje, EXPERIENCIAS_REAIS, rodizioHorario } from '../../lib/destaque';
import { useSlotHora } from '../../hooks/useSlotHora';
import { CONFIG_RODIZIO_PADRAO, lerConfigRodizio } from '../../lib/rodizioConfig';
import { abertoAgora, fechaAs } from '../../lib/horario';
import { useI18n } from '../../lib/i18n';
import { textoLocalizacao } from '../../lib/localizacao';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  text: '#F5F5F7',
  dim: '#A0A0B2',
  pink: '#E1306C',
  purple: '#7E57C2',
  gold: '#FFD54F',
  amber: '#FF9142',
  green: '#4CAF7D',
};

type Tipo = 'trip' | 'em-alta' | 'hoje' | 'semana' | 'experiencia';

// Experiências mostradas, nesta ordem (pedido da Andrea, out/2026).
const EXPERIENCIAS: { slug: string; icone: string; cor: string }[] = [
  { slug: 'aniversario', icone: 'gift', cor: '#FFD54F' },
  { slug: 'dates', icone: 'heart', cor: '#E1306C' },
  { slug: 'dancar', icone: 'music', cor: '#FFB74D' },
  { slug: 'musica_ao_vivo', icone: 'mic', cor: '#4FC3F7' },
  { slug: 'drag_show', icone: 'star', cor: '#B39DDB' },
  { slug: 'karaoke', icone: 'radio', cor: '#4CAF7D' },
];

const CONFIG: Record<Tipo, { titulo: string; sub: string; icone: string; cor: string }> = {
  trip: { titulo: 'home.boxTrip', sub: 'secao.subTrip', icone: 'compass', cor: '#81C784' },
  'em-alta': { titulo: 'home.emAlta', sub: 'secao.subEmAlta', icone: 'trending-up', cor: C.gold },
  hoje: { titulo: 'home.hojeTitulo', sub: 'secao.subHoje', icone: 'zap', cor: C.pink },
  semana: { titulo: 'home.destaqueSemana', sub: 'secao.subSemana', icone: 'star', cor: C.amber },
  experiencia: { titulo: 'home.experiencia', sub: 'secao.subExperiencia', icone: 'heart', cor: C.purple },
};

const CAMPOS_LOCAL =
  'id, nome, categoria, subcategoria, descricao, bairro, bairro_exibicao, cidade, foto_capa_url, galeria_fotos, rating_media, rating_total, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, plano_comercial, plano_comercial_status, horario_funcionamento';

interface Item {
  chave: string;
  rota: string;
  titulo: string;
  linha1: string;
  linha2?: string;
  linha2Cor?: string;
  foto: string | null;
  selo?: { texto: string; cor: string; textoCor: string };
  // Rodada 66 — selo colorido da categoria (BAR, FESTA, GASTRONOMIA…)
  seloCategoria?: SeloCategoria;
  iconeVazio: string;
}

function foto(l: any): string | null {
  return l.foto_capa_url || l.galeria_fotos?.[0] || null;
}
function bairro(l: any): string {
  // Rodada 77 — endereço (bairro) só em bares, festas/eventos, gastronomia e cultura; demais mostram a cidade.
  return textoLocalizacao(l);
}

export default function SecaoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { tipo: tipoParam } = useLocalSearchParams<{ tipo: string }>();
  const tipo: Tipo = (['trip', 'em-alta', 'hoje', 'semana', 'experiencia'] as Tipo[]).includes(tipoParam as Tipo) ? (tipoParam as Tipo) : 'em-alta';
  const cfg = CONFIG[tipo];
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  // Rodízio por horário (Em Alta): a lista troca a cada intervalo, como na Home.
  const [cfgRodizio, setCfgRodizio] = useState(CONFIG_RODIZIO_PADRAO);
  useEffect(() => {
    lerConfigRodizio().then(setCfgRodizio);
  }, []);
  const slotRodizio = useSlotHora(cfgRodizio.intervaloMin);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      let lista: Item[] = [];
      const paraItem = (l: any, extra: Partial<Item> = {}): Item => ({
        chave: `l-${l.id}`,
        rota: `/business/${l.id}`,
        titulo: l.nome,
        linha1: [l.subcategoria || CATEGORIA_REAL_LABEL[l.categoria] || l.categoria, bairro(l)].filter(Boolean).join(' • '),
        foto: foto(l),
        seloCategoria: seloDaCategoria(l),
        iconeVazio: 'map-pin',
        ...extra,
      });

      try {
        if (tipo === 'experiencia') {
          lista = [];
        } else if (tipo === 'trip') {
          const { data } = await supabase.from('locais').select(CAMPOS_LOCAL).eq('status', 'aprovado').eq('categoria', 'turismo').limit(80);
          const l = ((data as any[]) || []).filter((i) => deveIncluirEm(i, 'dicas_trip')).sort(compararDestaque('dicas_trip'));
          lista = l.map((i) =>
            paraItem(i, {
              linha1: `${i.subcategoria || 'Turismo'} • ${bairro(i)}`,
              linha2: i.descricao || undefined,
              iconeVazio: 'compass',
              selo: i.plano_destaque !== 'basico' ? { texto: 'DESTAQUE', cor: 'rgba(76,175,125,0.2)', textoCor: C.green } : undefined,
            })
          );
        } else if (tipo === 'em-alta' || tipo === 'semana') {
          const { data } = await supabase.from('locais').select(CAMPOS_LOCAL).eq('status', 'aprovado').limit(120);
          const todos = (data as any[]) || [];
          const destaque = todos.filter((i) => deveExibirGlow(i)).sort(compararDestaque('destaque'));
          if (tipo === 'semana') {
            lista = destaque.map((i) =>
              paraItem(i, {
                linha2: `★ ${i.rating_total > 0 ? Number(i.rating_media).toFixed(1) : '—'}`,
                selo: { texto: 'DESTAQUE', cor: C.amber, textoCor: '#000' },
              })
            );
          } else {
            const ids = new Set(destaque.map((i) => i.id));
            const poolSemDestaque = todos.filter((i) => !ids.has(i.id));
            const base = poolSemDestaque.length > 0 ? poolSemDestaque : todos;
            lista = rodizioHorario(base, 'em_alta', slotRodizio, cfgRodizio.tamanho).map((i) =>
              paraItem(i, {
                linha2: `★ ${i.rating_total > 0 ? Number(i.rating_media).toFixed(1) : '—'}`,
                selo: estaFixadoEm(i, 'patrocinado') ? { texto: 'VIP', cor: C.purple, textoCor: '#FFF' } : undefined,
              })
            );
          }
        } else {
          const inicio = new Date();
          inicio.setHours(0, 0, 0, 0);
          const fim = new Date();
          fim.setHours(23, 59, 59, 999);
          const [evHoje, evFixados, locFix, locTodos] = await Promise.all([
            supabase
              .from('eventos')
              .select('id, titulo, data_inicio, foto_capa_url, locais(nome, bairro, bairro_exibicao)')
              .eq('status', 'aprovado')
              .gte('data_inicio', inicio.toISOString())
              .lte('data_inicio', fim.toISOString())
              .order('data_inicio', { ascending: true }),
            supabase
              .from('eventos')
              .select('id, titulo, data_inicio, foto_capa_url, destaque_secoes, destaque_ate, locais(nome, bairro, bairro_exibicao)')
              .eq('status', 'aprovado')
              .contains('destaque_secoes', ['hoje']),
            supabase.from('locais').select(CAMPOS_LOCAL).eq('status', 'aprovado').contains('destaque_secoes', ['hoje']),
            supabase.from('locais').select(CAMPOS_LOCAL).eq('status', 'aprovado').limit(200),
          ]);
          const auto = (evHoje.data as any[]) || [];
          const idsEv = new Set(auto.map((e) => e.id));
          const fixados = ((evFixados.data as any[]) || []).filter(
            (e) => !idsEv.has(e.id) && estaFixadoParaHoje({ id: e.id, plano_destaque: 'basico', destaque_secoes: e.destaque_secoes, destaque_ate: e.destaque_ate })
          );
          const eventos: Item[] = [...auto, ...fixados].map((e) => ({
            chave: `e-${e.id}`,
            // Rodada 66 — abre a página da festa (antes ia pra aba Eventos)
            rota: `/evento/${e.id}`,
            titulo: e.titulo,
            linha1: [
              new Date(e.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              e.locais && (e.locais.bairro_exibicao || e.locais.bairro),
            ]
              .filter(Boolean)
              .join(' • '),
            linha2: e.locais?.nome || undefined,
            foto: e.foto_capa_url || null,
            iconeVazio: 'calendar',
            seloCategoria: SELO_FESTA,
          }));
          const locaisFix = ((locFix.data as any[]) || []).filter((l) => estaFixadoParaHoje(l));
          const idsLoc = new Set(locaisFix.map((l) => l.id));
          const abertos = ((locTodos.data as any[]) || []).filter((l) => !idsLoc.has(l.id) && abertoAgora(l));
          lista = [
            ...eventos,
            ...locaisFix.map((l) => paraItem(l, { linha2: 'Aberto hoje', linha2Cor: C.green })),
            ...abertos.map((l) =>
              paraItem(l, {
                linha2: `Aberto agora${fechaAs(l) ? ` · até ${fechaAs(l)}` : ''}`,
                linha2Cor: C.green,
                iconeVazio: 'clock',
              })
            ),
          ];
        }
      } catch (err) {
        console.error('Erro ao carregar seção:', err);
      }
      if (!ativo) return;
      setItens(lista);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [tipo, slotRodizio, cfgRodizio.tamanho]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => router.back()} style={styles.voltar} accessibilityRole="button" accessibilityLabel="Voltar">
          <Feather name="chevron-left" size={26} color={C.text} />
        </TouchableOpacity>
        <View style={[styles.iconeTopo, { borderColor: cfg.cor }]}>
          <Feather name={cfg.icone as any} size={18} color={cfg.cor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>{t(cfg.titulo)}</Text>
          <Text style={styles.sub}>{t(cfg.sub)}</Text>
        </View>
      </View>

      {tipo === 'experiencia' ? (
        <ScrollView contentContainerStyle={styles.expGrade}>
          {EXPERIENCIAS.map((e) => {
            const label = EXPERIENCIAS_REAIS.find((x) => x.slug === e.slug)?.label || e.slug;
            return (
              <TouchableOpacity
                key={e.slug}
                style={styles.expTile}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({ pathname: '/category/todos' as any, params: { title: encodeURIComponent(label), experiencia: e.slug } })
                }
                accessibilityRole="button"
              >
                <View style={[styles.expIcone, { borderColor: e.cor }]}>
                  <Feather name={e.icone as any} size={22} color={e.cor} />
                </View>
                <Text style={styles.expTxt}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : carregando ? (
        <ActivityIndicator color={C.pink} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
          {itens.length === 0 ? (
            <View style={styles.vazio}>
              <Feather name={cfg.icone as any} size={22} color={C.dim} />
              <Text style={styles.vazioTxt}>{t('secao.vazio')}</Text>
            </View>
          ) : (
            itens.map((it) => (
              <TouchableOpacity key={it.chave} style={styles.item} activeOpacity={0.85} onPress={() => router.push(it.rota as any)}>
                <View style={styles.foto}>
                  {it.foto ? (
                    <Image source={{ uri: it.foto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <Feather name={it.iconeVazio as any} size={22} color={cfg.cor} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  {(it.seloCategoria || it.selo) && (
                    <View style={styles.selosLinha}>
                      {[it.seloCategoria, it.selo].filter(Boolean).map((sl) => (
                        <View key={sl!.texto} style={[styles.selo, { backgroundColor: sl!.cor }]}>
                          <Text style={[styles.seloTxt, { color: sl!.textoCor }]}>{sl!.texto}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={styles.nome} numberOfLines={1}>{it.titulo}</Text>
                  <Text style={styles.linha1} numberOfLines={1}>{it.linha1}</Text>
                  {!!it.linha2 && (
                    <Text style={[styles.linha2, it.linha2Cor ? { color: it.linha2Cor } : null]} numberOfLines={1}>
                      {it.linha2}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={C.dim} />
              </TouchableOpacity>
            ))
          )}
          {tipo === 'trip' && (
            <TouchableOpacity style={styles.maisBtn} onPress={() => router.push('/(tabs)/tourism')}>
              <Text style={styles.maisTxt}>{t('secao.abrirTrip')}</Text>
              <Feather name="arrow-right" size={16} color={C.pink} />
            </TouchableOpacity>
          )}
          {tipo === 'hoje' && (
            <TouchableOpacity style={styles.maisBtn} onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.maisTxt}>{t('secao.abrirAgenda')}</Text>
              <Feather name="arrow-right" size={16} color={C.pink} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8 },
  voltar: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconeTopo: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  titulo: { fontSize: 18, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.dim, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  foto: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#1A1926', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  selosLinha: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  selo: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  seloTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  nome: { fontSize: 14, fontWeight: '800', color: C.text },
  linha1: { fontSize: 12, fontWeight: '600', color: C.pink },
  linha2: { fontSize: 12, color: C.dim },
  vazio: { alignItems: 'center', gap: 10, padding: 24, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  vazioTxt: { fontSize: 13, color: C.dim, textAlign: 'center', lineHeight: 19 },
  maisBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  maisTxt: { fontSize: 13, fontWeight: '800', color: C.pink },
  expGrade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  expTile: { width: '48.5%', minHeight: 110, borderRadius: 14, padding: 14, gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, justifyContent: 'space-between' },
  expIcone: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  expTxt: { fontSize: 14, fontWeight: '800', color: C.text },
});
