// Página de seção aberta pelas caixas da Home (out/2026):
//   /secao/trip    → Dicas Trip (destaques de turismo)
//   /secao/em-alta → Em Alta (rotação dos planos Intermediário/Premium e manuais)
//   /secao/hoje    → O que fazer hoje (eventos de hoje, locais fixados e abertos agora)
//   /secao/semana  → Top da semana (selo DESTAQUE: premium/fundador ou manual)
//   /secao/experiencia → Escolha pela experiência (tags → locais com aquela experiência)
// Rodada 82 — todas usam o layout padrão da página de categoria (ListaPadrao):
// voltar + logo, título, busca, chips Em Alta / Todas e cartões iguais.
// Mesmas regras de seleção/ordem da Home (lib/destaque.ts).
import { Feather } from '@expo/vector-icons';
import FundoCaixaDegrade from '../../components/FundoCaixaDegrade';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FiltrosPilulas, { FiltroDef } from '../../components/FiltrosPilulas';
import ListaPadrao, { CabecalhoPadrao, CAMPOS_LOCAL, ItemLista, localParaItem } from '../../components/ListaPadrao';
import { SELO_FESTA } from '../../lib/categorias';
import { compararDestaque, CATEGORIAS_SERVICO, ehServico, deveExibirGlow, deveIncluirEm, emAltaDaHora, estaFixadoEm, estaFixadoParaHoje, EXPERIENCIAS_REAIS } from '../../lib/destaque';
import { useSlotHora } from '../../hooks/useSlotHora';
import { CONFIG_RODIZIO_PADRAO, lerConfigRodizio } from '../../lib/rodizioConfig';
import { abertoAgora, fechaAs } from '../../lib/horario';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { useRastrearTela } from '../../lib/usoTelas';
import { TIPOS_SERVICO, tipoDoServico } from '../../lib/servicosTipos';
import BannersHome from '../../components/BannersHome';
import VitrineCategoria from '../../components/VitrineCategoria';
import { GRUPOS_EVENTO, LEGADO_EVENTO, rotuloTag, slugTag } from '../../lib/taxonomia';

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

// "O que fazer hoje": atributos de cada item para filtrar pelos gostos da pessoa.
type MetaHoje = { tipo: string; quando: string[]; musica: string[]; publico: string[]; clima: string[]; ingresso: string[]; estrutura: string[]; classificacao: string[] };
const CHAVE_GOSTOS_HOJE = 'dicas_hoje_gostos_v1';
const TIPO_FESTA = 'Festas e eventos';
const TIPO_LUGAR = 'Lugares';

function eventoTemTag(ev: any, slug: string): boolean {
  if (ev.tags?.includes(slug)) return true;
  const legado = LEGADO_EVENTO[slug];
  return !!legado && legado.some((l) => ev.estilos_musicais?.includes(l) || ev.publico_tags?.includes(l));
}
function tagsDoGrupo(ev: any, grupo: string): string[] {
  const g = GRUPOS_EVENTO.find((x) => x.id === grupo);
  return g ? g.tags.filter((label) => label !== 'Todos os públicos' && eventoTemTag(ev, slugTag(label))) : [];
}

type Tipo = 'servicos' | 'trip' | 'em-alta' | 'hoje' | 'semana' | 'experiencia';

// Experiências mostradas, nesta ordem (pedido da Andrea, out/2026).
const EXPERIENCIAS: { slug: string; icone: string; cor: string; degrade: [string, string] }[] = [
  { slug: 'aniversario', icone: 'gift', cor: '#FFD54F', degrade: ['#F2A900', '#C2410C'] },
  { slug: 'dates', icone: 'heart', cor: '#E1306C', degrade: ['#F0436F', '#8E24AA'] },
  { slug: 'dancar', icone: 'music', cor: '#FFB74D', degrade: ['#FF8A3D', '#E1306C'] },
  { slug: 'musica_ao_vivo', icone: 'mic', cor: '#4FC3F7', degrade: ['#0EA5E9', '#4338CA'] },
  { slug: 'drag_show', icone: 'star', cor: '#B39DDB', degrade: ['#9B6BFF', '#C026A3'] },
  { slug: 'karaoke', icone: 'radio', cor: '#4CAF7D', degrade: ['#10B981', '#0E7490'] },
];

// "O que fazer hoje": ícones de vontade, abaixo do patrocinador. Cada item (festa ou lugar) entra em um ou mais.
const ICONES_HOJE = [
  { id: 'dancar', label: 'Dançar', icone: 'music', cor: '#FFB74D' },
  { id: 'musica_ao_vivo', label: 'Música ao vivo', icone: 'mic', cor: '#4FC3F7' },
  { id: 'drag_show', label: 'Drag show', icone: 'star', cor: '#B39DDB' },
  { id: 'karaoke', label: 'Karaokê', icone: 'radio', cor: '#4CAF7D' },
  { id: 'dates', label: 'Date', icone: 'heart', cor: '#E1306C' },
  { id: 'aniversario', label: 'Aniversário', icone: 'gift', cor: '#FFD54F' },
  { id: 'conhecer', label: 'Conhecer gente', icone: 'users', cor: '#F472B6' },
  { id: 'arlivre', label: 'Ao ar livre', icone: 'sun', cor: '#FDE047' },
];
const MUSICAS_DANCA = ['pop', 'funk', 'eletronica', 'tribal', 'house', 'techno', 'disco', 'reggaeton', 'hip_hop', 'trap', 'k_pop', 'dj', 'open_format'];
function iconesDoEvento(ev: any): string[] {
  const tem = (label: string) => eventoTemTag(ev, slugTag(label));
  const ids: string[] = [];
  if (tem('Para dançar') || tem('Balada') || MUSICAS_DANCA.some((m) => eventoTemTag(ev, m))) ids.push('dancar');
  if (tem('Música ao vivo') || tem('Show')) ids.push('musica_ao_vivo');
  if (tem('Drag show') || /drag/i.test(ev.titulo || '')) ids.push('drag_show');
  if (/karaok/i.test(ev.titulo || '')) ids.push('karaoke');
  if (tem('Romântico')) ids.push('dates');
  if (/anivers/i.test(ev.titulo || '')) ids.push('aniversario');
  if (tem('Para conhecer pessoas') || tem('Para ir com amigos')) ids.push('conhecer');
  if (tem('Ao ar livre') || tem('Rooftop') || tem('Pé na areia')) ids.push('arlivre');
  return ids;
}

const CONFIG: Record<Tipo, { titulo: string; sub: string; icone: string }> = {
  servicos: { titulo: 'home.servicosDestaque', sub: 'secao.subServicos', icone: 'briefcase' },
  trip: { titulo: 'home.boxTrip', sub: 'secao.subTrip', icone: 'compass' },
  'em-alta': { titulo: 'home.emAlta', sub: 'secao.subEmAlta', icone: 'trending-up' },
  hoje: { titulo: 'home.hojeTitulo', sub: 'secao.subHoje', icone: 'zap' },
  semana: { titulo: 'home.tile.semana', sub: 'secao.subSemana', icone: 'star' },
  experiencia: { titulo: 'home.experiencia', sub: 'secao.subExperiencia', icone: 'heart' },
};

export default function SecaoScreen() {
  useRastrearTela('secao', { detalheParam: 'tipo' });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { tipo: tipoParam } = useLocalSearchParams<{ tipo: string }>();
  const tipo: Tipo = (['servicos', 'trip', 'em-alta', 'hoje', 'semana', 'experiencia'] as Tipo[]).includes(tipoParam as Tipo) ? (tipoParam as Tipo) : 'em-alta';
  const cfg = CONFIG[tipo];
  const [itens, setItens] = useState<ItemLista[]>([]);
  const [patrocinado, setPatrocinado] = useState<ItemLista | null>(null);
  const [locaisServ, setLocaisServ] = useState<any[]>([]);
  const [meta, setMeta] = useState<Record<string, MetaHoje>>({});
  const [gostos, setGostos] = useState<Record<string, string | undefined>>({});
  const [gostosLidos, setGostosLidos] = useState(false);
  // Lembra as escolhas da pessoa (só neste aparelho): amanhã a tela já abre do jeito que ela gosta.
  useEffect(() => {
    if (tipo !== 'hoje') return;
    AsyncStorage.getItem(CHAVE_GOSTOS_HOJE)
      .then((v) => { if (v) { const g = JSON.parse(v); delete g.quando; delete g.clima; delete g.tipo; setGostos(g); } })
      .catch(() => {})
      .finally(() => setGostosLidos(true));
  }, [tipo]);
  useEffect(() => {
    if (tipo !== 'hoje' || !gostosLidos) return;
    AsyncStorage.setItem(CHAVE_GOSTOS_HOJE, JSON.stringify(gostos)).catch(() => {});
  }, [gostos, gostosLidos, tipo]);
  const [carregando, setCarregando] = useState(true);
  // Período do "O que fazer hoje": o título vira seletor (∨).
  const [periodo, setPeriodo] = useState<'hoje' | 'amanha' | 'fim'>('hoje');
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
      let lista: ItemLista[] = [];
      let patr: ItemLista | null = null;
      const metaTmp: Record<string, MetaHoje> = {};
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
        } else if (tipo === 'experiencia') {
          // Locais que têm alguma das experiências em destaque; os ícones redondos filtram por experiência.
          const consultar = (c: string): any => (supabase.from('locais') as any).select(c).eq('status', 'aprovado').limit(1000);
          const r = await consultar(`${CAMPOS_LOCAL}, experiencias`);
          const slugs = EXPERIENCIAS.map((e) => e.slug);
          const l = (((r.data as any[]) || []) as any[])
            .filter((i) => !ehServico(i) && ((i.experiencias as string[]) || []).some((x) => slugs.includes(x)))
            .sort(compararDestaque('em_alta'));
          lista = l.map((i) =>
            localParaItem(i, {
              iconeIds: ((i.experiencias as string[]) || []).filter((x) => slugs.includes(x)),
              destaque: deveExibirGlow(i),
            })
          );
        } else if (tipo === 'servicos') {
          // `especialidade` vem da migration 034; sem ela, segue só com o básico.
          const consultar = (c: string): any => (supabase.from('locais') as any).select(c).eq('status', 'aprovado').in('categoria', CATEGORIAS_SERVICO).limit(1000);
          let r = await consultar(`${CAMPOS_LOCAL}, especialidade`);
          if (r.error) r = await consultar(CAMPOS_LOCAL);
          const l = ((r.data as any[]) || []).slice().sort(compararDestaque('em_alta'));
          setLocaisServ(l);
          // Cada serviço entra num tipo (Beleza, Saúde, Fotografia, Seguros…) para filtrar pelos chips.
          lista = l.map((i) => {
            const tipoServ = tipoDoServico(i);
            return localParaItem(i, { destaque: deveExibirGlow(i), grupo: tipoServ, iconeIds: [tipoServ], linha1: i.especialidade || i.subcategoria || tipoServ });
          });
        } else if (tipo === 'em-alta' || tipo === 'semana') {
          const { data } = await supabase.from('locais').select(CAMPOS_LOCAL).eq('status', 'aprovado').limit(1000);
          // Serviços (fotógrafo, beleza, lojas) têm página própria; o Em Alta fica só com lugares.
          let todos = ((data as any[]) || []).filter((i) => tipo === 'semana' || !ehServico(i));
          // Em Alta: o patrocínio agora é o banner master da página (BannerMaster); locais VIP entram na lista com o selo.
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
          if (periodo === 'amanha') {
            inicio.setDate(inicio.getDate() + 1);
            fim.setDate(fim.getDate() + 1);
          } else if (periodo === 'fim') {
            // Fim de semana = sábado e domingo; se já é fim de semana, vale de hoje até domingo.
            const dow = inicio.getDay(); // 0 dom … 6 sáb
            if (dow >= 1 && dow <= 5) inicio.setDate(inicio.getDate() + (6 - dow));
            const ateDom = dow === 0 ? 0 : 7 - dow;
            fim.setDate(fim.getDate() + ateDom);
          }
          const CAMPOS_EV = 'id, titulo, data_inicio, data_fim, foto_capa_url, estilos_musicais, publico_tags, locais(nome, bairro, bairro_exibicao)';
          const evHojeQ = (c: string): any =>
            (supabase.from('eventos') as any).select(c).eq('status', 'aprovado').gte('data_inicio', inicio.toISOString()).lte('data_inicio', fim.toISOString()).order('data_inicio', { ascending: true });
          const evFixQ = (c: string): any =>
            (supabase.from('eventos') as any).select(`${c}, destaque_secoes, destaque_ate`).eq('status', 'aprovado').contains('destaque_secoes', ['hoje']);
          // `tags` (eventos) e `experiencias` (locais) vêm de migrations mais novas: sem elas, segue só com o básico.
          const comFallback = async (q: (c: string) => any) => {
            const r = await q(`${CAMPOS_EV}, tags`);
            return r.error ? q(CAMPOS_EV) : r;
          };
          const locQ = (c: string, fixados: boolean): any => {
            const q = (supabase.from('locais') as any).select(c).eq('status', 'aprovado');
            return fixados ? q.contains('destaque_secoes', ['hoje']) : q.limit(1000);
          };
          const locFallback = async (fixados: boolean) => {
            const r = await locQ(`${CAMPOS_LOCAL}, experiencias`, fixados);
            return r.error ? locQ(CAMPOS_LOCAL, fixados) : r;
          };
          const [evHoje, evFixados, locFix, locTodos] = await Promise.all([comFallback(evHojeQ), comFallback(evFixQ), locFallback(true), locFallback(false)]);
          const auto = (evHoje.data as any[]) || [];
          const idsEv = new Set(auto.map((e) => e.id));
          const fixados = ((evFixados.data as any[]) || []).filter(
            (e) => !idsEv.has(e.id) && periodo === 'hoje' && estaFixadoParaHoje({ id: e.id, plano_destaque: 'basico', destaque_secoes: e.destaque_secoes, destaque_ate: e.destaque_ate })
          );
          const agoraMs = Date.now();
          const eventos: ItemLista[] = [...auto, ...fixados].map((e) => {
            const item: ItemLista = {
              chave: `e-${e.id}`,
              // Rodada 66 — abre a página da festa (antes ia pra aba Eventos)
              rota: `/evento/${e.id}`,
              titulo: e.titulo,
              linha1: new Date(e.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              linha2: [e.locais?.nome, e.locais && (e.locais.bairro_exibicao || e.locais.bairro)].filter(Boolean).join(' • ') || undefined,
              foto: e.foto_capa_url || null,
              categoriaReal: 'eventos',
              iconeIds: iconesDoEvento(e),
              iconeVazio: 'calendar',
              seloCategoria: SELO_FESTA,
            };
            const d = new Date(e.data_inicio);
            const h = d.getHours();
            const periodo = h < 5 ? 'Madrugada' : h < 12 ? 'Manhã' : h < 18 ? 'Tarde' : 'Noite';
            const fimMs = e.data_fim ? new Date(e.data_fim).getTime() : d.getTime() + 4 * 3600 * 1000;
            const quando = agoraMs >= d.getTime() - 3600 * 1000 && agoraMs <= fimMs ? ['Agora', periodo] : [periodo];
            metaTmp[item.chave] = { tipo: TIPO_FESTA, quando, musica: tagsDoGrupo(e, 'musica'), publico: tagsDoGrupo(e, 'publico'), clima: tagsDoGrupo(e, 'ambiente'), ingresso: tagsDoGrupo(e, 'ingresso'), estrutura: tagsDoGrupo(e, 'estrutura'), classificacao: tagsDoGrupo(e, 'classificacao').filter((c) => ['Livre', '16+', '18+'].includes(c)) };
            return item;
          });
          const metaLocal = (l: any, item: ItemLista): ItemLista => {
            item.iconeIds = ((l.experiencias as string[]) || []).filter((x) => ICONES_HOJE.some((i) => i.id === x));
            metaTmp[item.chave] = {
              tipo: TIPO_LUGAR,
              quando: abertoAgora(l) ? ['Agora'] : [],
              musica: [], publico: [], ingresso: [], estrutura: [], classificacao: [],
              clima: ((l.experiencias as string[]) || []).map((sl) => EXPERIENCIAS_REAIS.find((x) => x.slug === sl)?.label || rotuloTag(sl)),
            };
            return item;
          };
          // Lugares abertos/fixados só fazem sentido para hoje; amanhã e fim de semana mostram as festas.
          const locaisFix = periodo !== 'hoje' ? [] : ((locFix.data as any[]) || []).filter((l) => estaFixadoParaHoje(l));
          const idsLoc = new Set(locaisFix.map((l) => l.id));
          const abertos = periodo !== 'hoje' ? [] : ((locTodos.data as any[]) || []).filter((l) => !idsLoc.has(l.id) && abertoAgora(l));
          lista = [
            ...eventos,
            ...locaisFix.map((l) => metaLocal(l, localParaItem(l, { linha3: 'Aberto hoje', linha3Cor: C.green }))),
            ...abertos.map((l) =>
              metaLocal(
                l,
                localParaItem(l, {
                  linha3: `Aberto agora${fechaAs(l) ? ` · até ${fechaAs(l)}` : ''}`,
                  linha3Cor: C.green,
                  iconeVazio: 'clock',
                })
              )
            ),
          ];
        }
      } catch (err) {
        console.error('Erro ao carregar seção:', err);
      }
      if (!ativo) return;
      setItens(lista);
      setPatrocinado(patr);
      setMeta(metaTmp);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [tipo, slotRodizio, cfgRodizio.tamanho, periodo]);

  // Filtros do "O que fazer hoje": só aparecem as opções que existem de verdade na lista de hoje.
  const filtrosHoje = useMemo<FiltroDef[]>(() => {
    if (tipo !== 'hoje') return [];
    const todas = Object.values(meta);
    const unicas = (pega: (m: MetaHoje) => string[]) => Array.from(new Set(todas.flatMap(pega)));
    // Filtros de catálogo (Público, Estilo, Experiência…) ficam SEMPRE visíveis, mesmo que hoje
    // nenhum item tenha a tag: quem tem resultado vem primeiro na lista, o resto logo depois.
    const catalogo = (grupo: string, pega: (m: MetaHoje) => string[], so?: string[]) => {
      const existentes = unicas(pega);
      const todos = (GRUPOS_EVENTO.find((g) => g.id === grupo)?.tags || []).filter((x) => x !== 'Todos os públicos' && (!so || so.includes(x)));
      return [...todos.filter((x) => existentes.includes(x)), ...todos.filter((x) => !existentes.includes(x))];
    };
    return [
      { id: 'publico', label: 'Público', icone: 'users', opcoes: catalogo('publico', (m) => m.publico), valor: gostos.publico },
      { id: 'musica', label: 'Estilo musical', icone: 'music', opcoes: catalogo('musica', (m) => m.musica), valor: gostos.musica },
      { id: 'ingresso', label: 'Entrada', icone: 'tag', opcoes: catalogo('ingresso', (m) => m.ingresso, ['Gratuito', 'Pago', 'Lista gratuita', 'Lista VIP', 'Open bar', 'Desconto no app', 'Cupom disponível']), valor: gostos.ingresso },
      { id: 'classificacao', label: 'Idade', icone: 'shield', opcoes: ['Livre', '16+', '18+'], valor: gostos.classificacao },
      { id: 'estrutura', label: 'Estrutura', icone: 'check-circle', opcoes: catalogo('estrutura', (m) => m.estrutura, ['Acessibilidade', 'Atendimento em Libras', 'Banheiro adaptado', 'Banheiro sem gênero', 'Área externa', 'Pet friendly', 'Estacionamento', 'Próximo ao metrô']), valor: gostos.estrutura },
    ];
  }, [tipo, meta, gostos]);
  const itensVisiveis = useMemo(() => {
    if (tipo !== 'hoje') return itens;
    return itens.filter((i) => {
      const m = meta[i.chave];
      if (!m) return !Object.values(gostos).some(Boolean);
      if (gostos.musica && !m.musica.includes(gostos.musica)) return false;
      if (gostos.publico && !m.publico.includes(gostos.publico)) return false;
      if (gostos.ingresso && !m.ingresso.includes(gostos.ingresso)) return false;
      if (gostos.classificacao && !m.classificacao.includes(gostos.classificacao)) return false;
      if (gostos.estrutura && !m.estrutura.includes(gostos.estrutura)) return false;
      return true;
    });
  }, [tipo, itens, meta, gostos]);
  const algumGosto = Object.values(gostos).some(Boolean);

  return (
    <ListaPadrao
      titulo={tipo === 'hoje' && periodo !== 'hoje' ? t(periodo === 'amanha' ? 'hoje.tAmanha' : 'hoje.tFim') : t(cfg.titulo)}
      subtitulo={tipo === 'hoje' && periodo !== 'hoje' ? t(periodo === 'amanha' ? 'hoje.subAmanha' : 'hoje.subFim') : t(cfg.sub)}
      opcoesTitulo={tipo === 'hoje' ? [{ id: 'hoje', label: t('hoje.oHoje') }, { id: 'amanha', label: t('hoje.oAmanha') }, { id: 'fim', label: t('hoje.oFim') }] : undefined}
      valorTitulo={periodo}
      onTrocarTitulo={(id) => setPeriodo(id as 'hoje' | 'amanha' | 'fim')}
      tituloSeletor={t('hoje.quando')}
      itens={itensVisiveis}
      carregando={carregando}
      vazioTexto={tipo === 'hoje' && algumGosto ? 'Nada hoje com esses gostos. Toque em "Limpar" para ver tudo.' : t('secao.vazio')}
      filtrosExtras={tipo === 'hoje' ? filtrosHoje : undefined}
      onFiltroExtra={(id, valor) => setGostos((g) => ({ ...g, [id]: valor }))}
      onLimparExtras={() => setGostos({})}
      semPublico={tipo === 'hoje'}
      iconesSempre={tipo === 'experiencia' || tipo === 'semana' || tipo === 'hoje'}
      iconesFiltro={
        tipo === 'hoje'
          ? ICONES_HOJE.map((i) => ({ id: i.id, label: i.label, icone: i.icone, cor: i.cor }))
          : tipo === 'servicos'
          ? TIPOS_SERVICO.map((t) => ({ id: t.rotulo, label: t.rotulo.replace(' e ', ' & '), icone: t.icone, cor: t.cor }))
          : tipo === 'experiencia'
          ? EXPERIENCIAS.map((e) => ({ id: e.slug, label: EXPERIENCIAS_REAIS.find((x) => x.slug === e.slug)?.label || e.slug, icone: e.icone, cor: e.cor }))
          : undefined
      }
      vazioIcone={cfg.icone}
      modoHome={tipo !== 'trip'}
      bannerMaster={tipo !== 'trip' ? <BannersHome slug={tipo} nome={t(cfg.titulo)} /> : undefined}
      patrocinado={null}
      patrocinadoRotulo={t('home.patrocinado')}
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
  expGrade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  expTile: { width: '31.5%', height: 92, borderRadius: 14, backgroundColor: C.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6 },
  expTxt: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
});
