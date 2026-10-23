// Página de seção aberta pelas caixas da Home (out/2026):
//   /secao/trip    → Dicas Trip (destaques de turismo)
//   /secao/em-alta → Em Alta (rotação dos planos Intermediário/Premium e manuais)
//   /secao/hoje    → O que fazer hoje (eventos de hoje, locais fixados e abertos agora)
//   /secao/semana  → Destaques da semana (selo DESTAQUE: premium/fundador ou manual)
//   /secao/experiencia → Escolha pela experiência (tags → locais com aquela experiência)
// Rodada 82 — todas usam o layout padrão da página de categoria (ListaPadrao):
// voltar + logo, título, busca, chips Em Alta / Todas e cartões iguais.
// Mesmas regras de seleção/ordem da Home (lib/destaque.ts).
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ListaPadrao, { CabecalhoPadrao, CAMPOS_LOCAL, ItemLista, localParaItem } from '../../components/ListaPadrao';
import { SELO_FESTA } from '../../lib/categorias';
import { compararDestaque, deveExibirGlow, deveIncluirEm, emAltaDaHora, estaFixadoEm, estaFixadoParaHoje, EXPERIENCIAS_REAIS } from '../../lib/destaque';
import { useSlotHora } from '../../hooks/useSlotHora';
import { CONFIG_RODIZIO_PADRAO, lerConfigRodizio } from '../../lib/rodizioConfig';
import { abertoAgora, fechaAs } from '../../lib/horario';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { useRastrearTela } from '../../lib/usoTelas';

const C = {
  bg: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  text: '#F5F5F7',
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

const CONFIG: Record<Tipo, { titulo: string; sub: string; icone: string }> = {
  trip: { titulo: 'home.boxTrip', sub: 'secao.subTrip', icone: 'compass' },
  'em-alta': { titulo: 'home.emAlta', sub: 'secao.subEmAlta', icone: 'trending-up' },
  hoje: { titulo: 'home.hojeTitulo', sub: 'secao.subHoje', icone: 'zap' },
  semana: { titulo: 'home.destaqueSemana', sub: 'secao.subSemana', icone: 'star' },
  experiencia: { titulo: 'home.experiencia', sub: 'secao.subExperiencia', icone: 'heart' },
};

export default function SecaoScreen() {
  useRastrearTela('secao', { detalheParam: 'tipo' });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { tipo: tipoParam } = useLocalSearchParams<{ tipo: string }>();
  const tipo: Tipo = (['trip', 'em-alta', 'hoje', 'semana', 'experiencia'] as Tipo[]).includes(tipoParam as Tipo) ? (tipoParam as Tipo) : 'em-alta';
  const cfg = CONFIG[tipo];
  const [itens, setItens] = useState<ItemLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  // Rodízio por horário (Em Alta): a lista troca a cada intervalo, como na Home.
  const [cfgRodizio, setCfgRodizio] = useState(CONFIG_RODIZIO_PADRAO);
  useEffect(() => {
    lerConfigRodizio().then(setCfgRodizio);
  }, []);
  const slotRodizio = useSlotHora(cfgRodizio.intervaloMin);

  useEffect(() => {
    if (tipo === 'experiencia') {
      setCarregando(false);
      return;
    }
    let ativo = true;
    (async () => {
      setCarregando(true);
      let lista: ItemLista[] = [];
      try {
        if (tipo === 'trip') {
          const { data } = await supabase.from('locais').select(CAMPOS_LOCAL).eq('status', 'aprovado').eq('categoria', 'turismo').limit(500);
          const l = ((data as any[]) || []).filter((i) => deveIncluirEm(i, 'dicas_trip')).sort(compararDestaque('dicas_trip'));
          lista = l.map((i) =>
            localParaItem(i, {
              linha1: i.subcategoria || 'Turismo',
              destaque: i.plano_destaque !== 'basico',
              iconeVazio: 'compass',
            })
          );
        } else if (tipo === 'em-alta' || tipo === 'semana') {
          const { data } = await supabase.from('locais').select(CAMPOS_LOCAL).eq('status', 'aprovado').limit(1000);
          const todos = (data as any[]) || [];
          const destaque = todos.filter((i) => deveExibirGlow(i)).sort(compararDestaque('destaque'));
          if (tipo === 'semana') {
            lista = destaque.map((i) => localParaItem(i, { destaque: true }));
          } else {
            const ids = new Set(destaque.map((i) => i.id));
            const poolSemDestaque = todos.filter((i) => !ids.has(i.id));
            const base = poolSemDestaque.length > 0 ? poolSemDestaque : todos;
            lista = emAltaDaHora(base, slotRodizio, cfgRodizio.tamanho, cfgRodizio.completarEmAlta).map((i) =>
              localParaItem(i, {
                emAlta: true,
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
            supabase.from('locais').select(CAMPOS_LOCAL).eq('status', 'aprovado').limit(1000),
          ]);
          const auto = (evHoje.data as any[]) || [];
          const idsEv = new Set(auto.map((e) => e.id));
          const fixados = ((evFixados.data as any[]) || []).filter(
            (e) => !idsEv.has(e.id) && estaFixadoParaHoje({ id: e.id, plano_destaque: 'basico', destaque_secoes: e.destaque_secoes, destaque_ate: e.destaque_ate })
          );
          const eventos: ItemLista[] = [...auto, ...fixados].map((e) => ({
            chave: `e-${e.id}`,
            // Rodada 66 — abre a página da festa (antes ia pra aba Eventos)
            rota: `/evento/${e.id}`,
            titulo: e.titulo,
            linha1: new Date(e.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            linha2: [e.locais?.nome, e.locais && (e.locais.bairro_exibicao || e.locais.bairro)].filter(Boolean).join(' • ') || undefined,
            foto: e.foto_capa_url || null,
            iconeVazio: 'calendar',
            seloCategoria: SELO_FESTA,
          }));
          const locaisFix = ((locFix.data as any[]) || []).filter((l) => estaFixadoParaHoje(l));
          const idsLoc = new Set(locaisFix.map((l) => l.id));
          const abertos = ((locTodos.data as any[]) || []).filter((l) => !idsLoc.has(l.id) && abertoAgora(l));
          lista = [
            ...eventos,
            ...locaisFix.map((l) => localParaItem(l, { linha3: 'Aberto hoje', linha3Cor: C.green })),
            ...abertos.map((l) =>
              localParaItem(l, {
                linha3: `Aberto agora${fechaAs(l) ? ` · até ${fechaAs(l)}` : ''}`,
                linha3Cor: C.green,
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

  if (tipo === 'experiencia') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <CabecalhoPadrao titulo={t(cfg.titulo)} subtitulo={t(cfg.sub)} />
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
      </View>
    );
  }

  return (
    <ListaPadrao
      titulo={t(cfg.titulo)}
      subtitulo={t(cfg.sub)}
      itens={itens}
      carregando={carregando}
      vazioTexto={t('secao.vazio')}
      vazioIcone={cfg.icone}
      rodape={
        tipo === 'trip' ? (
          <TouchableOpacity style={styles.maisBtn} onPress={() => router.push('/(tabs)/tourism')}>
            <Text style={styles.maisTxt}>{t('secao.abrirTrip')}</Text>
            <Feather name="arrow-right" size={16} color={C.pink} />
          </TouchableOpacity>
        ) : tipo === 'hoje' ? (
          <TouchableOpacity style={styles.maisBtn} onPress={() => router.push('/(tabs)/events')}>
            <Text style={styles.maisTxt}>{t('secao.abrirAgenda')}</Text>
            <Feather name="arrow-right" size={16} color={C.pink} />
          </TouchableOpacity>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  maisBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  maisTxt: { fontSize: 13, fontWeight: '800', color: C.pink },
  expGrade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  expTile: { width: '48.5%', minHeight: 110, borderRadius: 14, padding: 14, gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, justifyContent: 'space-between' },
  expIcone: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  expTxt: { fontSize: 14, fontWeight: '800', color: C.text },
});
