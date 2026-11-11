import { BotaoVoltar, TituloTela } from '../../components/CabecalhoTela';
import SubcategoriaBanners, { GrupoSub } from '../../components/SubcategoriaBanners';
import VitrineCategoria, { LocalVitrine } from '../../components/VitrineCategoria';
import { CAMPOS_LOCAL } from '../../components/ListaPadrao';
import { normTxt, SUBCATEGORIAS } from '../../lib/subcategorias';
import { EstadoSubcategorias, buscarEstadoSubcategorias, buscarSubcategoriasDesligadas, buscarVagas } from '../../lib/vitrine';
import MarcaApp from '../../components/MarcaApp';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/authContext';
import { CATEGORIAS, SUBTITULO_CATEGORIA } from '../../lib/categorias';
import { deveExibirGlow, estaFixadoEm } from '../../lib/destaque';
import { supabase } from '../../lib/supabase';
import { GRUPOS_EVENTO, LEGADO_EVENTO, TAGS_EVENTO_AUTOMATICAS, rotuloTag, slugTag } from '../../lib/taxonomia';
import { useRastrearTela } from '../../lib/usoTelas';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
  gold: '#FFD54F',
  green: '#4CAF7D',
};

// Rodada 63 — filtros com a taxonomia oficial (src/lib/taxonomia.ts).
// Eventos antigos (só com estilos_musicais/publico_tags do enum antigo)
// continuam aparecendo pelos equivalentes em LEGADO_EVENTO.
const GRUPO = (id: string) => GRUPOS_EVENTO.find((g) => g.id === id)!;
const GRUPOS_EXTRAS = ['ingresso', 'quando', 'estrutura', 'ambiente', 'classificacao'];

// Chips de TIPO de evento no topo da aba (pedido do time, nov/2026). Cada chip junta tags do cadastro.
const TIPOS_EVENTO_CHIPS: { id: string; rotulo: string; tags: string[]; musica: boolean }[] = [
  { id: 'festas', rotulo: 'Festas e baladas', tags: ['festa', 'balada', 'pool_party', 'pre_festa', 'after', 'bloco', 'carnaval'], musica: true },
  { id: 'teatro', rotulo: 'Teatro', tags: ['teatro', 'stand_up', 'performance'], musica: false },
  { id: 'danca', rotulo: 'Aulas de dança', tags: ['aula_de_danca', 'workshop'], musica: false },
  { id: 'shows', rotulo: 'Shows', tags: ['show', 'drag_show', 'festival'], musica: true },
  { id: 'cultura', rotulo: 'Cultura e encontros', tags: ['exposicao', 'cinema', 'feira', 'parada', 'encontro', 'networking', 'congresso', 'conferencia', 'gastronomia'], musica: false },
];

function eventoTem(ev: { tags?: string[] | null; estilos_musicais?: string[] | null; publico_tags?: string[] | null; listaVipAtiva?: any }, slug: string): boolean {
  if (ev.tags?.includes(slug)) return true;
  if (slug === 'lista_vip' && ev.listaVipAtiva) return true;
  const legado = LEGADO_EVENTO[slug];
  return !!legado && legado.some((l) => ev.estilos_musicais?.includes(l) || ev.publico_tags?.includes(l));
}

// Rodada 39 — bug real encontrado: `calcularDateTag` sempre soube gerar a
// tag 'outro' (qualquer evento além do próximo fim de semana), mas
// NENHUM lugar da UI (nem os botões rápidos, nem esse modal) tinha uma
// opção que setasse `dateFilter` pra 'outro' — um evento aprovado com
// data futura "normal" (ex.: dentro de 3 semanas) ficava
// PERMANENTEMENTE inalcançável na tela, mesmo aparecendo certinho no
// banco. Reportado pela Andrea ("testei datas futuras mas não aparece no
// app, no Supabase aparecem os eventos"). Adicionada a opção que faltava.
const CALENDAR_DATES = [
  { id: 'hoje', label: 'Hoje', sub: 'Eventos acontecendo agora' },
  { id: 'amanha', label: 'Amanhã', sub: 'Agenda de amanhã' },
  { id: 'semana', label: 'Essa semana', sub: 'Eventos e agenda dos bares até domingo' },
  { id: 'fds', label: 'Este Fim de Semana', sub: 'Sábado & Domingo' },
  { id: 'proximo_fds', label: 'Próximo Fim de Semana', sub: 'Destaques futuros' },
  { id: 'outro', label: 'Mais pra Frente', sub: 'Depois do próximo fim de semana' },
];

const STATUS_SOLICITACAO_LABEL: Record<string, string> = {
  solicitada: 'Solicitação enviada — aguardando aprovação',
  aprovada: 'Aprovada! Seu nome está confirmado na lista',
  rejeitada: 'Solicitação não aprovada',
  cancelada: 'Solicitação cancelada',
  check_in: 'Check-in já feito na portaria',
};

const DIAS_SEMANA = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

type DateTag = 'hoje' | 'amanha' | 'fds' | 'proximo_fds' | 'outro';
// Rodada 126 — "Essa semana": de hoje até domingo. Junta os eventos da semana com a
// agenda que os bares sobem no portal B2B (public.agenda_semanal, migration 073).
// A agenda NÃO aparece no perfil do local — só aqui.
type FiltroData = DateTag | 'semana';

interface AgendaBar {
  id: string;
  local_id: string;
  dia_semana: number;
  data?: string | null; // YYYY-MM-DD; null = repete toda semana
  tipo?: string | null; // 'dia' | 'semana' (cartaz da semana inteira)
  titulo: string;
  descricao: string | null;
  horario?: string | null;
  foto_url: string | null;
  link: string | null;
  locais: { nome: string; bairro: string | null; cidade: string; plano_comercial?: string | null; plano_comercial_status?: string | null } | null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const chaveDia = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Hoje até o domingo desta semana (se hoje é domingo, só hoje). */
function diasDaSemanaAteDomingo(): Date[] {
  const h = new Date();
  const base = new Date(h.getFullYear(), h.getMonth(), h.getDate());
  const ate = (7 - base.getDay()) % 7;
  return Array.from({ length: ate + 1 }, (_, i) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));
}

function segundaDestaSemana(): Date {
  const h = new Date();
  const base = new Date(h.getFullYear(), h.getMonth(), h.getDate());
  base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  return base;
}

// Fundador e Premium (ativos) aparecem primeiro dentro do dia.
function rankPlanoAgenda(a: AgendaBar): number {
  if (a.locais?.plano_comercial_status !== 'ativo') return 2;
  if (a.locais?.plano_comercial === 'fundador') return 0;
  if (a.locais?.plano_comercial === 'premium') return 1;
  return 2;
}

function rotuloDiaSemana(d: Date, indice: number): string {
  const dm = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  if (indice === 0) return `Hoje · ${DIAS_SEMANA[d.getDay()]}, ${dm}`;
  if (indice === 1) return `Amanhã · ${DIAS_SEMANA[d.getDay()]}, ${dm}`;
  return `${DIAS_SEMANA[d.getDay()]}, ${dm}`;
}

const urlSegura = (l: string) => (/^https?:\/\//i.test(l) ? l : `https://${l}`);

interface ListaVip {
  id: string;
  titulo: string;
  vagas_limite: number | null;
  vagas_ocupadas: number;
  ativa: boolean;
}

interface EventoRow {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  estilos_musicais: string[];
  publico_tags: string[];
  tags?: string[] | null;
  foto_capa_url: string | null;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  destaque_secao_fixada: string | null;
  destaque_secoes: string[] | null;
  destaque_ate: string | null;
  local_id: string | null;
  locais: { nome: string; bairro: string | null; cidade: string } | null;
  listas_vip: ListaVip[] | null;
}

interface EventItem extends EventoRow {
  dateTag: DateTag;
  listaVipAtiva: ListaVip | null;
}

function calcularDateTag(dataInicioISO: string): DateTag {
  const agora = new Date();
  const data = new Date(dataInicioISO);

  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diffDias = Math.round((inicioData.getTime() - inicioHoje.getTime()) / 86400000);

  if (diffDias === 0) return 'hoje';
  if (diffDias === 1) return 'amanha';

  const diaSemanaHoje = agora.getDay(); // 0 = domingo, 6 = sábado
  const diasAteSabado = (6 - diaSemanaHoje + 7) % 7;
  const diasAteDomingo = diasAteSabado + 1;

  if (diffDias >= diasAteSabado && diffDias <= diasAteDomingo) return 'fds';
  if (diffDias >= diasAteSabado + 7 && diffDias <= diasAteDomingo + 7) return 'proximo_fds';

  return 'outro';
}

function formatarDataEvento(dataInicioISO: string, tag: DateTag): string {
  const data = new Date(dataInicioISO);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (tag === 'hoje') return `Hoje • ${hora}`;
  if (tag === 'amanha') return `Amanhã • ${hora}`;
  return `${DIAS_SEMANA[data.getDay()]} • ${hora}`;
}

export default function EventsScreen() {
  useRastrearTela('eventos');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const isUserLogged = !!session;

  const [dateFilter, setDateFilter] = useState<FiltroData>('hoje');
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [tipoChip, setTipoChip] = useState<string | null>(null);
  const [selectedPublic, setSelectedPublic] = useState<string | null>(null);
  const [filtrosExtras, setFiltrosExtras] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [selectedBairro, setSelectedBairro] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  // Locais de festa/noite: alimentam o banner rotativo Premium da vitrine.
  const [locaisVitrine, setLocaisVitrine] = useState<LocalVitrine[]>([]);
  const [subDesligadas, setSubDesligadas] = useState<Set<string>>(new Set());
  const [estadoSub, setEstadoSub] = useState<EstadoSubcategorias>({ breve: new Set(), ativas: new Set() });
  useEffect(() => {
    let vivo = true;
    (supabase.from('locais') as any)
      .select(CAMPOS_LOCAL)
      .eq('status', 'aprovado')
      .eq('categoria', 'eventos')
      .limit(500)
      .then(async (r: any) => {
        if (!vivo || !r?.data) return;
        const lista = r.data as LocalVitrine[];
        // Local de outra categoria que a equipe FIXOU numa vaga de banner de Festas (portal admin) também entra: fixar é escolha deliberada.
        try {
          const v = await buscarVagas('festas');
          const faltam = Object.values(v.premium).filter((id) => id && !lista.some((l) => l.id === id));
          if (faltam.length) {
            const { data: extras } = await (supabase.from('locais') as any).select(CAMPOS_LOCAL).eq('status', 'aprovado').in('id', faltam);
            if (extras) lista.push(...(extras as LocalVitrine[]));
          }
        } catch { /* segue só com os locais de Festas */ }
        if (vivo) setLocaisVitrine(lista);
      });
    buscarSubcategoriasDesligadas('festas').then((x) => { if (vivo) setSubDesligadas(x); });
    buscarEstadoSubcategorias('festas').then((x) => { if (vivo) setEstadoSub(x); });
    return () => { vivo = false; };
  }, []);
  const [showFiltrosModal, setShowFiltrosModal] = useState(false);

  // Agenda dos bares (portal B2B) — só alimenta o filtro "Essa semana".
  const [agendaBares, setAgendaBares] = useState<AgendaBar[]>([]);
  const [cartazAberto, setCartazAberto] = useState<AgendaBar | null>(null);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const seg = segundaDestaSemana();
      const dom = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);
      const BASE = 'id, local_id, dia_semana, titulo, descricao, foto_url, link, locais(nome, bairro, cidade, plano_comercial, plano_comercial_status)';
      const tabela = () => supabase.from('agenda_semanal') as any;
      let { data, error } = await tabela()
        .select(`${BASE}, data, tipo, horario`)
        .eq('ativo', true)
        .or(`data.is.null,and(data.gte.${chaveDia(seg)},data.lte.${chaveDia(dom)})`)
        .limit(400);
      // Sem a migration 073, cai nas colunas antigas (tudo vira "toda semana").
      if (error) ({ data, error } = await tabela().select(BASE).eq('ativo', true).limit(400));
      if (vivo && !error && data) setAgendaBares(data as AgendaBar[]);
    })();
    return () => { vivo = false; };
  }, []);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<Record<string, string>>({});

  // Modais
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEventForList, setSelectedEventForList] = useState<EventItem | null>(null);
  const [acompanhantes, setAcompanhantes] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const carregarEventos = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);

      const CAMPOS =
        'id, titulo, descricao, data_inicio, data_fim, estilos_musicais, publico_tags, foto_capa_url, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, local_id, locais(nome, bairro, cidade), listas_vip(id, titulo, vagas_limite, vagas_ocupadas, ativa)';
      const consultar = (campos: string) =>
        supabase
          .from('eventos')
          .select(campos)
          .eq('status', 'aprovado')
          .gte('data_inicio', inicioHoje.toISOString())
          .order('data_inicio', { ascending: true })
          .limit(60);
      // Coluna `tags` vem da migration 036; sem ela, segue com os campos antigos.
      let { data, error } = await consultar(`${CAMPOS}, tags`);
      if (error) ({ data, error } = await consultar(CAMPOS));

      if (error) throw error;

      const linhas = (data || []) as unknown as EventoRow[];
      const itens: EventItem[] = linhas.map((ev) => ({
        ...ev,
        dateTag: calcularDateTag(ev.data_inicio),
        listaVipAtiva: (ev.listas_vip || []).find((l) => l.ativa) || null,
      }));

      setEvents(itens);

      // Carrega o status das minhas próprias solicitações, se estiver logado
      if (user?.id) {
        const listaIds = itens.map((ev) => ev.listaVipAtiva?.id).filter(Boolean) as string[];
        if (listaIds.length > 0) {
          const { data: minhas, error: errMinhas } = await supabase
            .from('listas_vip_solicitacoes')
            .select('lista_vip_id, status')
            .eq('user_id', user.id)
            .in('lista_vip_id', listaIds);

          if (!errMinhas && minhas) {
            const mapa: Record<string, string> = {};
            minhas.forEach((s: any) => {
              mapa[s.lista_vip_id] = s.status;
            });
            setMinhasSolicitacoes(mapa);
          }
        } else {
          setMinhasSolicitacoes({});
        }
      } else {
        setMinhasSolicitacoes({});
      }
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregarEventos();
  }, [carregarEventos]);

  // Rodada 41 — a agenda é cronológica por natureza (não faz sentido um
  // evento da semana que vem furar na frente do de hoje só porque
  // paga), então a única coisa que a fixação manual do /admin
  // ("evento_destaque") faz aqui é furar a fila DENTRO do mesmo filtro
  // de data já selecionado — o resto continua ordenado por data/hora
  // como sempre foi (.filter preserva a ordem, e o sort abaixo é
  // estável: só separa fixados do resto, sem embaralhar o restante).
  // Evento sem nenhuma etiqueta de tipo (cadastro antigo) conta como "Festas e baladas".
  const eventoDoTipoChip = (ev: EventItem, chipId: string): boolean => {
    const chip = TIPOS_EVENTO_CHIPS.find((c) => c.id === chipId);
    if (!chip) return true;
    if (chip.tags.some((t) => eventoTem(ev, t))) return true;
    if (chipId !== 'festas') return false;
    return !TIPOS_EVENTO_CHIPS.some((c) => c.tags.some((t) => eventoTem(ev, t)));
  };
  const diasSemana = diasDaSemanaAteDomingo();
  const chavesSemana = diasSemana.map(chaveDia);
  const filteredEvents = events
    .filter((ev) => {
      if (dateFilter === 'semana') {
        if (!chavesSemana.includes(chaveDia(new Date(ev.data_inicio)))) return false;
      } else if (ev.dateTag !== dateFilter) return false;
      if (tipoChip && !eventoDoTipoChip(ev, tipoChip)) return false;
      if (selectedTipo && !eventoTem(ev, selectedTipo)) return false;
      if (selectedMusic && !eventoTem(ev, selectedMusic)) return false;
      if (selectedPublic && !eventoTem(ev, selectedPublic)) return false;
      if (selectedBairro && ev.locais?.bairro !== selectedBairro) return false;
      if (selectedSub && !subsDoEvento(ev).includes(selectedSub)) return false;
      const q = busca.trim().toLowerCase();
      if (q && ![ev.titulo, ev.locais?.nome, ev.locais?.bairro, ev.locais?.cidade].some((t) => (t || '').toLowerCase().includes(q))) return false;
      if (filtrosExtras.some((t) => !eventoTem(ev, t))) return false;
      return true;
    })
    .sort((a, b) => {
      const aFixado = estaFixadoEm(a, 'evento_destaque') || estaFixadoEm(a, 'patrocinado');
      const bFixado = estaFixadoEm(b, 'evento_destaque') || estaFixadoEm(b, 'patrocinado');
      return aFixado === bFixado ? 0 : aFixado ? -1 : 1;
    });

  // Ícones de subcategoria de festa: cada evento entra nas que combinam com título, tags, estilos e público.
  const defsFestas = SUBCATEGORIAS.festas;
  const subsDoEvento = (ev: EventItem): string[] => {
    const texto = normTxt([ev.titulo, ...(ev.tags || []).map(rotuloTag), ...(ev.estilos_musicais || []), ...(ev.publico_tags || [])].join(' '));
    const partes = texto.split(/[^a-z0-9]+/).filter(Boolean);
    return defsFestas.filter((d) => d.palavras.some((p) => (p.includes(' ') ? texto.includes(p) : partes.includes(p)))).map((d) => d.chave);
  };
  // Festas pagas (divulgação avulsa, R$ 89): rodam do começo do dia anterior até 6h depois do fim. Máx. 24.
  const festasPagas = useMemo(() => {
    const agora = Date.now();
    return events
      .filter((ev) => {
        if (!(ev.destaque_secoes || []).includes('patrocinado')) return false;
        const ini = new Date(ev.data_inicio);
        const abre = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() - 1).getTime();
        const fecha = new Date(ev.data_fim || ev.data_inicio).getTime() + 6 * 3600 * 1000;
        return agora >= abre && agora <= fecha;
      })
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
      .slice(0, 24);
  }, [events]);

  const gruposSub = useMemo<GrupoSub[]>(
    () => defsFestas
      .filter((d) => !subDesligadas.has(d.chave))
      .map((d) => ({ chave: d.chave, rotulo: d.rotulo, qtd: events.filter((ev) => subsDoEvento(ev).includes(d.chave)).length, foto: null })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, subDesligadas]
  );

  // Botão único "Filtrar": estilo musical, formato (open bar, sunset...) e bairro. Só aparecem opções que têm evento carregado.
  const [showFiltrar, setShowFiltrar] = useState(false);
  const opcoesFiltrar = useMemo(() => {
    const tem = (t: string) => events.some((ev) => eventoTem(ev, t));
    const estilos = GRUPO('musica').tags.map(slugTag).filter(tem);
    const FORMATOS = ['open_bar', 'sunset_parties', 'pool_party', 'pre_festa', 'after', 'balada', 'drag_show', 'karaoke', 'gogo_dancer'];
    const formatos = FORMATOS.filter(tem);
    const bairros = Array.from(new Set(events.map((ev) => ev.locais?.bairro).filter(Boolean) as string[])).sort((x, y) => x.localeCompare(y, 'pt-BR'));
    return { estilos, formatos, bairros };
  }, [events]);
  const totalFiltros = (selectedTipo ? 1 : 0) + (selectedBairro ? 1 : 0);

  const handleEventClick = (eventItem: EventItem) => {
    if (!eventItem.listaVipAtiva) {
      Alert.alert('Evento sem Lista', 'Este evento não possui opção de envio de nome na lista VIP.');
      return;
    }

    if (!isUserLogged) {
      Alert.alert(
        'Acesso Restrito',
        'Crie sua conta ou entre no app para colocar seu nome na lista VIP do evento.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Entrar / Criar Conta', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    setAcompanhantes('0');
    setSelectedEventForList(eventItem);
  };

  const statusAtual = selectedEventForList?.listaVipAtiva
    ? minhasSolicitacoes[selectedEventForList.listaVipAtiva.id]
    : undefined;

  const handleSendToList = async () => {
    if (!selectedEventForList?.listaVipAtiva || !user) return;

    const numAcompanhantes = Math.max(0, Math.min(5, parseInt(acompanhantes, 10) || 0));

    setSubmitting(true);
    try {
      const { error } = await supabase.from('listas_vip_solicitacoes').insert({
        lista_vip_id: selectedEventForList.listaVipAtiva.id,
        acompanhantes: numAcompanhantes,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Você já está na lista', 'Seu nome já foi enviado para esta lista VIP.');
        } else {
          throw error;
        }
      } else {
        Alert.alert(
          'Nome enviado!',
          `Seu nome foi inserido na lista VIP de ${selectedEventForList.titulo}. Apresente um documento na portaria.`
        );
      }

      setSelectedEventForList(null);
      carregarEventos();
    } catch (err: any) {
      console.error('Erro ao enviar solicitação de lista VIP:', err);
      Alert.alert('Erro', err?.message || 'Não foi possível salvar seu nome na lista VIP. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelarSolicitacao = async () => {
    if (!selectedEventForList?.listaVipAtiva || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('listas_vip_solicitacoes')
        .delete()
        .eq('lista_vip_id', selectedEventForList.listaVipAtiva.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSelectedEventForList(null);
      carregarEventos();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível cancelar a solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  // Rodada 59 (parte 7) — pedido da Andrea depois de revisar o app final:
  // faltava o próprio usuário confirmar que chegou (check-in self-service,
  // sem depender da portaria digitar nada no portal — decisão consciente
  // dela, diferente do check-in de cupom que continua exigindo o
  // estabelecimento). Ver migration 031 (protect_status_listas_vip_solicitacoes)
  // — só esse UM caminho extra de status foi liberado, o resto continua
  // travado pra usuário comum.
  const handleCheckIn = async () => {
    if (!selectedEventForList?.listaVipAtiva || !user) return;

    const listaId = selectedEventForList.listaVipAtiva.id;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('listas_vip_solicitacoes')
        .update({ status: 'check_in' })
        .eq('lista_vip_id', listaId)
        .eq('user_id', user.id);

      if (error) throw error;

      setMinhasSolicitacoes((prev) => ({ ...prev, [listaId]: 'check_in' }));
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível confirmar seu check-in. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Depois do check-in, o check_in é o próprio gatilho pra liberar a
  // avaliação do local (Rodada 59/7) — leva direto pra tela do
  // estabelecimento, que já tem a avaliação corrigida (Rodada 59/6).
  const handleIrAvaliar = () => {
    const localId = selectedEventForList?.local_id;
    setSelectedEventForList(null);
    if (localId) {
      router.push(`/business/${localId}` as any);
    }
  };

  const renderEventCard = (item: EventItem) => (
              <TouchableOpacity
                key={item.id}
                style={styles.eventCard}
                // Rodada 66 — o card abre a página da festa (flier, horário,
                // local, descrição, tags e a Lista VIP lá dentro).
                onPress={() => router.push(`/evento/${item.id}` as any)}
                activeOpacity={0.85}
              >
                <View style={styles.eventThumb}>
                  {item.foto_capa_url ? (
                    <Image source={{ uri: item.foto_capa_url }} style={styles.eventThumbImg} />
                  ) : (
                    <Feather name="calendar" size={20} color={COLORS.pink} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.eventHeaderRow}>
                    <Text style={styles.eventDate}>{formatarDataEvento(item.data_inicio, item.dateTag)}</Text>
                    {item.listaVipAtiva && (
                      <View style={styles.guestListBadge}>
                        <Feather name="edit-3" size={9} color={COLORS.green} />
                        <Text style={styles.guestListBadgeText}>NOME NA LISTA</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.eventTitle}>{item.titulo}</Text>
                  {item.locais && item.local_id ? (
                    <TouchableOpacity
                      onPress={() => router.push(`/business/${item.local_id}` as any)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text style={[styles.eventLocation, styles.eventLocationLink]}>
                        {item.locais.nome} • {item.locais.bairro || item.locais.cidade}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.eventLocation}>
                      {item.locais ? `${item.locais.nome} • ${item.locais.bairro || item.locais.cidade}` : 'Local a confirmar'}
                    </Text>
                  )}
                  {/* Rodada 45 — bug real reportado pela Andrea ("testei festa do
                      founders no destaque e não foi"): o checkbox "Destaque (selo
                      no card)" do /admin grava em destaque_secoes, mas esse selo
                      aqui só reagia ao SELECT separado Básico/Destaque/VIP
                      (plano_destaque) — a marcação da Andrea nunca tinha efeito
                      visual nenhum. deveExibirGlow (mesma função que já vale pra
                      locais) cobre os dois mecanismos. */}
                  {(item.plano_destaque !== 'basico' || deveExibirGlow(item)) && (
                    <Text style={styles.eventPrice}>★ Evento em destaque</Text>
                  )}
                  {/* Rodada 46 — selo novo "Patrocinado" (destaque_secoes,
                      migration 026): monetização avulsa, sem depender de
                      plano_destaque — qualquer evento pode comprar. */}
                  {estaFixadoEm(item, 'patrocinado') && (
                    <Text style={styles.patrocinadoBadge}>Patrocinado</Text>
                  )}
                </View>

                <Feather
                  name={item.listaVipAtiva ? 'user-plus' : 'chevron-right'}
                  size={18}
                  color={item.listaVipAtiva ? COLORS.pink : '#606070'}
                />
              </TouchableOpacity>
  );

  // ---- "Essa semana" ----
  const filtroSoDeEvento = !!(selectedTipo || selectedMusic || selectedPublic || selectedSub || tipoChip || filtrosExtras.length);
  const passaFiltroAgenda = (a: AgendaBar) => {
    if (selectedBairro && a.locais?.bairro !== selectedBairro) return false;
    const q = busca.trim().toLowerCase();
    if (q && ![a.titulo, a.locais?.nome, a.locais?.bairro].some((t) => (t || '').toLowerCase().includes(q))) return false;
    return true;
  };
  const agendaDoDia = (d: Date): AgendaBar[] => {
    if (filtroSoDeEvento) return [];
    const chave = chaveDia(d);
    const dow = d.getDay();
    const doDia = agendaBares.filter((a) => a.tipo !== 'semana');
    const datados = doDia.filter((a) => a.data === chave);
    const fixos = doDia.filter((a) => !a.data && a.dia_semana === dow && !datados.some((x) => x.local_id === a.local_id));
    return [...datados, ...fixos].filter(passaFiltroAgenda).sort((a, b) => rankPlanoAgenda(a) - rankPlanoAgenda(b));
  };
  const cartazesSemana: AgendaBar[] = filtroSoDeEvento
    ? []
    : agendaBares
        .filter((a) => a.tipo === 'semana' && a.data === chaveDia(segundaDestaSemana()))
        .filter(passaFiltroAgenda)
        .sort((a, b) => rankPlanoAgenda(a) - rankPlanoAgenda(b));
  const blocosSemana = diasSemana
    .map((d, i) => ({
      d,
      i,
      evs: filteredEvents.filter((ev) => chaveDia(new Date(ev.data_inicio)) === chaveDia(d)),
      ag: agendaDoDia(d),
    }))
    .filter((b) => b.evs.length + b.ag.length > 0);
  const totalSemana = blocosSemana.reduce((n, b) => n + b.evs.length + b.ag.length, 0) + cartazesSemana.length;

  const renderAgendaBar = (a: AgendaBar) => (
    <TouchableOpacity
      key={a.id}
      style={styles.eventCard}
      onPress={() => router.push(`/business/${a.local_id}` as any)}
      activeOpacity={0.85}
    >
      <View style={styles.eventThumb}>
        {a.foto_url ? (
          <Image source={{ uri: a.foto_url }} style={styles.eventThumbImg} />
        ) : (
          <Feather name="music" size={20} color={COLORS.purple} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.eventHeaderRow}>
          <Text style={styles.eventDate}>{a.horario || 'Programação do dia'}</Text>
          <View style={styles.agendaBadge}>
            <Text style={styles.agendaBadgeText}>AGENDA DO BAR</Text>
          </View>
        </View>
        <Text style={styles.eventTitle}>{a.titulo}</Text>
        <Text style={styles.eventLocation}>
          {a.locais ? `${a.locais.nome} • ${a.locais.bairro || a.locais.cidade}` : 'Local a confirmar'}
        </Text>
        {!!a.descricao && <Text style={styles.agendaDesc} numberOfLines={2}>{a.descricao}</Text>}
        {!!a.link && (
          <TouchableOpacity onPress={() => Linking.openURL(urlSegura(a.link!))} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Text style={styles.agendaLink}>Ver mais</Text>
          </TouchableOpacity>
        )}
      </View>
      <Feather name="chevron-right" size={18} color="#606070" />
    </TouchableOpacity>
  );

  const renderCartaz = (c: AgendaBar) => (
    <TouchableOpacity key={c.id} style={styles.cartazCard} onPress={() => setCartazAberto(c)} activeOpacity={0.9}>
      {!!c.foto_url && <Image source={{ uri: c.foto_url }} style={styles.cartazImg} resizeMode="cover" />}
      <View style={{ padding: 12 }}>
        <View style={styles.eventHeaderRow}>
          <Text style={styles.eventDate}>PROGRAMAÇÃO DA SEMANA</Text>
          <View style={styles.agendaBadge}>
            <Text style={styles.agendaBadgeText}>AGENDA DO BAR</Text>
          </View>
        </View>
        <Text style={styles.eventTitle}>{c.locais?.nome || 'Bar'}</Text>
        <Text style={styles.eventLocation}>{c.locais ? c.locais.bairro || c.locais.cidade : ''}</Text>
        {!!c.descricao && !c.foto_url && <Text style={styles.agendaDesc} numberOfLines={4}>{c.descricao}</Text>}
        <Text style={styles.agendaLink}>Toque para ver a programação completa</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSemana = () => {
    if (totalSemana === 0) {
      return (
        <View style={styles.emptyBox}>
          <Feather name="calendar" size={32} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            Ainda não há programação para o restante desta semana. Os bares publicam a agenda aqui
            durante a semana — volte em breve.
          </Text>
        </View>
      );
    }
    return (
      <>
        {cartazesSemana.map(renderCartaz)}
        {blocosSemana.map((b) => (
          <View key={chaveDia(b.d)} style={{ marginBottom: 6 }}>
            <Text style={styles.diaSemanaTitulo}>{rotuloDiaSemana(b.d, b.i)}</Text>
            {b.evs.map(renderEventCard)}
            {b.ag.map(renderAgendaBar)}
          </View>
        ))}
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BotaoVoltar />
          <View style={styles.headerEsquerda}>
            <MarcaApp />
          </View>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <Feather name="user" size={18} color="#D0D0E0" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TÍTULO + FRASE (mesmo modelo das categorias) */}
        <View style={styles.titleArea}>
          <TituloTela
            semMargem
            titulo="Eventos"
            subtitulo={SUBTITULO_CATEGORIA.festas}
            tituloMenu="Quando?"
            opcoes={CALENDAR_DATES.map((d) => ({ id: d.id, label: d.label }))}
            valor={dateFilter}
            onEscolher={(id) => setDateFilter(id as FiltroData)}
          />
        </View>

        {/* BUSCA — pílula igual à da Home */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color={COLORS.textPrimary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar em Eventos..."
            placeholderTextColor={COLORS.textSecondary}
            value={busca}
            onChangeText={setBusca}
          />
        </View>

        {/* QUANDO: Hoje / Fim de semana / calendário + Mais filtros */}
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity
            style={[styles.dateBtn, dateFilter === 'hoje' && styles.dateBtnActive]}
            onPress={() => setDateFilter('hoje')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dateBtnText, dateFilter === 'hoje' && styles.dateBtnTextActive]}>Hoje</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateBtn, dateFilter === 'semana' && styles.dateBtnActive]}
            onPress={() => setDateFilter('semana')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dateBtnText, dateFilter === 'semana' && styles.dateBtnTextActive]}>Essa semana</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.calendarIconBtn} onPress={() => setShowCalendarModal(true)} activeOpacity={0.8} accessibilityLabel="Escolher data">
            <Feather name="calendar" size={16} color={COLORS.pink} />
          </TouchableOpacity>
        </View>

        {/* Um botão só: Filtrar (estilo, formato, bairro). "Para quem" é a fileira de ícones logo abaixo. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrarLinha} style={{ flexGrow: 0 }}>
          <TouchableOpacity style={[styles.filtrarBtn, totalFiltros > 0 && { backgroundColor: COLORS.pink, borderColor: COLORS.pink }]} onPress={() => setShowFiltrar(true)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Mais filtros">
            <Feather name="sliders" size={14} color={totalFiltros > 0 ? '#FFF' : COLORS.pink} />
            <Text style={[styles.filtrarTxt, totalFiltros > 0 && { color: '#FFF' }]}>{totalFiltros > 0 ? `Filtros · ${totalFiltros}` : 'Filtros'}</Text>
          </TouchableOpacity>
          {[{ id: null as string | null, rotulo: 'Todos' }, ...TIPOS_EVENTO_CHIPS].map((c) => {
            const ativo = tipoChip === c.id;
            return (
              <TouchableOpacity key={c.id || 'todos'} style={[styles.chip, ativo && styles.chipAtivo]} onPress={() => { setTipoChip(c.id); setSelectedMusic(null); }} accessibilityRole="button">
                <Text style={[styles.chipTxt, ativo && { color: '#FFF' }]}>{c.rotulo}</Text>
              </TouchableOpacity>
            );
          })}
          {(totalFiltros > 0 || selectedSub || tipoChip) && (
            <TouchableOpacity onPress={() => { setSelectedSub(null); setSelectedBairro(null); setSelectedTipo(null); setSelectedMusic(null); setSelectedPublic(null); setTipoChip(null); }} accessibilityRole="button" style={{ justifyContent: 'center' }}>
              <Text style={styles.filtrarLimpar}>Limpar</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Modal visible={showFiltrar} transparent animationType="fade" onRequestClose={() => setShowFiltrar(false)}>
          <TouchableOpacity style={styles.filtrarOverlay} activeOpacity={1} onPress={() => setShowFiltrar(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.filtrarSheet}>
              <Text style={styles.filtrarTitulo}>Mais filtros</Text>
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {opcoesFiltrar.formatos.length + opcoesFiltrar.bairros.length === 0 && (
                  <Text style={styles.filtrarVazio}>Ainda não há o que filtrar. As opções aparecem conforme as festas forem cadastradas.</Text>
                )}
                {opcoesFiltrar.formatos.length > 0 && (<>
                  <Text style={styles.filtrarSecao}>Formato</Text>
                  <View style={styles.filtrarChips}>
                    {opcoesFiltrar.formatos.map((t) => (
                      <TouchableOpacity key={t} style={[styles.chip, selectedTipo === t && styles.chipAtivo]} onPress={() => setSelectedTipo((a) => (a === t ? null : t))}>
                        <Text style={[styles.chipTxt, selectedTipo === t && { color: '#FFF' }]}>{rotuloTag(t)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>)}
                {opcoesFiltrar.bairros.length > 0 && (<>
                  <Text style={styles.filtrarSecao}>Bairro</Text>
                  <View style={styles.filtrarChips}>
                    {opcoesFiltrar.bairros.map((b) => (
                      <TouchableOpacity key={b} style={[styles.chip, selectedBairro === b && styles.chipAtivo]} onPress={() => setSelectedBairro((a) => (a === b ? null : b))}>
                        <Text style={[styles.chipTxt, selectedBairro === b && { color: '#FFF' }]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>)}
              </ScrollView>
              <TouchableOpacity style={styles.filtrarOk} onPress={() => setShowFiltrar(false)} activeOpacity={0.9}>
                <Text style={styles.filtrarOkTxt}>Ver eventos</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* VITRINE (mesma lógica das categorias): patrocinador master, banner Premium rotativo, subcategorias em ícones e até 6 ofertas. */}
        {!busca.trim() && (
          <View style={{ paddingHorizontal: 16 }}>
            <VitrineCategoria
              slug="festas"
              titulo="Eventos"
              categoriaReal={['eventos']}
              semOfertas
              locais={locaisVitrine}
              tituloLista={null}
              aposOfertas={
                <View>
                  {gruposSub.length > 0 && (
                    <SubcategoriaBanners
                      grupos={gruposSub}
                      defs={defsFestas}
                      estado={estadoSub}
                      selecionada={selectedSub}
                      compacto
                      cor={CATEGORIAS.festas.color}
                      onAbrir={(chave) => setSelectedSub((atual) => (atual === chave ? null : chave))}
                    />
                  )}
                  {opcoesFiltrar.estilos.length > 0 && (!tipoChip || TIPOS_EVENTO_CHIPS.find((c) => c.id === tipoChip)?.musica) && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.festasPagasTitulo}>Estilo musical</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {opcoesFiltrar.estilos.map((t) => (
                          <TouchableOpacity key={t} style={[styles.chip, selectedMusic === t && styles.chipAtivo]} onPress={() => setSelectedMusic((a) => (a === t ? null : t))}>
                            <Text style={[styles.chipTxt, selectedMusic === t && { color: '#FFF' }]}>{rotuloTag(t)}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {festasPagas.length > 0 && !subDesligadas.has('__festas') && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.festasPagasTitulo}>Festas em destaque</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {festasPagas.map((ev) => (
                          <TouchableOpacity key={ev.id} activeOpacity={0.9} style={styles.festaPagaCard} onPress={() => router.push(`/evento/${ev.id}` as any)} accessibilityRole="button" accessibilityLabel={ev.titulo}>
                            {!!ev.foto_capa_url && <Image source={{ uri: ev.foto_capa_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                            <View style={styles.festaPagaVeu} />
                            <Text style={styles.festaPagaData}>{formatarDataEvento(ev.data_inicio, ev.dateTag)}</Text>
                            <Text style={styles.festaPagaNome} numberOfLines={3}>{ev.titulo}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              }
            />
          </View>
        )}

        {/* LISTA DE EVENTOS */}
        <View style={styles.listArea}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>
              {(CALENDAR_DATES.find((d) => d.id === dateFilter)?.label) || 'Próximos Eventos'}
            </Text>
            <Text style={styles.eventCount}>{dateFilter === 'semana' ? `${totalSemana} programações` : `${filteredEvents.length} eventos`}</Text>
          </View>

          {loadingEvents ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator color={COLORS.pink} />
            </View>
          ) : dateFilter === 'semana' ? (
            renderSemana()
          ) : filteredEvents.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="calendar" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                Nenhum evento aprovado encontrado para esse filtro ainda. Novos eventos aparecem
                aqui assim que forem aprovados.
              </Text>
            </View>
          ) : (
            filteredEvents.map(renderEventCard)
          )}
        </View>

      </ScrollView>

      {/* MODAL: CARTAZ DA SEMANA (agenda do bar) */}
      <Modal visible={!!cartazAberto} transparent animationType="fade" onRequestClose={() => setCartazAberto(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCartazAberto(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.cartazModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {!!cartazAberto?.foto_url && (
                <Image source={{ uri: cartazAberto.foto_url }} style={styles.cartazModalImg} resizeMode="contain" />
              )}
              <Text style={styles.eventTitle}>{cartazAberto?.locais?.nome}</Text>
              {!!cartazAberto?.descricao && <Text style={[styles.agendaDesc, { marginTop: 8 }]}>{cartazAberto.descricao}</Text>}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  style={styles.cartazBtn}
                  onPress={() => {
                    const id = cartazAberto?.local_id;
                    setCartazAberto(null);
                    if (id) router.push(`/business/${id}` as any);
                  }}
                >
                  <Text style={styles.cartazBtnTxt}>Ver o local</Text>
                </TouchableOpacity>
                {!!cartazAberto?.link && (
                  <TouchableOpacity style={styles.cartazBtn} onPress={() => Linking.openURL(urlSegura(cartazAberto.link!))}>
                    <Text style={styles.cartazBtnTxt}>Ver mais</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.cartazBtn, { backgroundColor: COLORS.card }]} onPress={() => setCartazAberto(null)}>
                  <Text style={[styles.cartazBtnTxt, { color: COLORS.textSecondary }]}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL: CALENDÁRIO */}
      <Modal
        visible={showCalendarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="calendar" size={18} color={COLORS.pink} />
                <Text style={styles.modalTitle}>Filtrar por Data</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Feather name="x" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptionsList}>
              {CALENDAR_DATES.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.modalOptionCard,
                    dateFilter === opt.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setDateFilter(opt.id as FiltroData);
                    setShowCalendarModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionTitle}>{opt.label}</Text>
                  <Text style={styles.modalOptionSub}>{opt.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 2: NOME NA LISTA VIP (listas_vip_solicitacoes de verdade) */}
      <Modal
        visible={selectedEventForList !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEventForList(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedEventForList(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.listModalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="user-check" size={20} color={COLORS.pink} />
                <Text style={styles.modalTitle}>Lista VIP do Evento</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedEventForList(null)}>
                <Feather name="x" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedEventForList && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.listEventName}>{selectedEventForList.titulo}</Text>
                <Text style={styles.listEventSub}>
                  {selectedEventForList.locais?.nome} •{' '}
                  {formatarDataEvento(selectedEventForList.data_inicio, selectedEventForList.dateTag)}
                </Text>
                {selectedEventForList.listaVipAtiva?.vagas_limite != null && (
                  <Text style={styles.listEventSub}>
                    {Math.max(
                      0,
                      selectedEventForList.listaVipAtiva.vagas_limite -
                        selectedEventForList.listaVipAtiva.vagas_ocupadas
                    )}{' '}
                    vagas disponíveis
                  </Text>
                )}
              </View>
            )}

            {statusAtual ? (
              <View style={{ gap: 14 }}>
                <Text style={styles.statusText}>
                  {STATUS_SOLICITACAO_LABEL[statusAtual] || statusAtual}
                </Text>
                {statusAtual === 'aprovada' && (
                  <TouchableOpacity
                    style={[styles.submitListBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleCheckIn}
                    activeOpacity={0.88}
                    disabled={submitting}
                  >
                    <Text style={styles.submitListBtnText}>
                      {submitting ? 'Confirmando...' : 'Cheguei — Confirmar Check-in'}
                    </Text>
                  </TouchableOpacity>
                )}
                {statusAtual === 'check_in' && (
                  <TouchableOpacity
                    style={[styles.submitListBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleIrAvaliar}
                    activeOpacity={0.88}
                    disabled={submitting}
                  >
                    <Text style={styles.submitListBtnText}>
                      Avaliar {selectedEventForList?.locais?.nome || 'o local'}
                    </Text>
                  </TouchableOpacity>
                )}
                {(statusAtual === 'solicitada' || statusAtual === 'aprovada') && (
                  <TouchableOpacity
                    style={[styles.submitListBtn, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border }, submitting && { opacity: 0.6 }]}
                    onPress={handleCancelarSolicitacao}
                    disabled={submitting}
                  >
                    <Text style={[styles.submitListBtnText, { color: COLORS.textSecondary }]}>
                      {submitting ? 'Cancelando...' : 'Cancelar Solicitação'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Quantos acompanhantes? (0 a 5)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    value={acompanhantes}
                    onChangeText={(v) => setAcompanhantes(v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                  />
                </View>

                <Text style={styles.listEventSub}>
                  Seu nome (do perfil) e sua conta serão usados para confirmar entrada na portaria.
                </Text>

                <TouchableOpacity
                  style={[styles.submitListBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSendToList}
                  activeOpacity={0.88}
                  disabled={submitting}
                >
                  <Text style={styles.submitListBtnText}>
                    {submitting ? 'Enviando...' : 'Enviar Nome para a Lista'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerEsquerda: { justifyContent: 'center' },
  logoLinear: { width: 140, height: 34 },
  appSubtitulo: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, marginTop: 2 },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleArea: { paddingHorizontal: 16, marginTop: 0, marginBottom: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 18, height: 46, borderRadius: 23, backgroundColor: '#232230' },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  mainTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32, color: COLORS.textPrimary },

  dateSelectorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  dateBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  dateBtnActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  dateBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  dateBtnTextActive: { color: '#FFF', fontWeight: '700' },
  diaSemanaTitulo: { fontSize: 13, fontWeight: '800', color: COLORS.pink, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10, marginBottom: 8 },
  agendaBadge: { backgroundColor: 'rgba(126,87,194,0.22)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  agendaBadgeText: { fontSize: 8, fontWeight: '800', color: '#B39DDB', letterSpacing: 0.5 },
  agendaDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  agendaLink: { fontSize: 12, fontWeight: '700', color: COLORS.pink, marginTop: 6 },
  cartazCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  cartazImg: { width: '100%', height: 190, backgroundColor: '#0B0B0E' },
  cartazModal: { width: '92%', maxHeight: '86%', backgroundColor: COLORS.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cartazModalImg: { width: '100%', height: 420, backgroundColor: '#0B0B0E', borderRadius: 12, marginBottom: 10 },
  cartazBtn: { flex: 1, backgroundColor: COLORS.pink, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  cartazBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  calendarIconBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },

  filterSection: { marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, paddingHorizontal: 16, marginBottom: 6 },
  chipsRow: { paddingHorizontal: 16, gap: 8 },
  maisFiltrosBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  maisFiltrosTxt: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  maisFiltrosSub: { fontSize: 11, color: COLORS.textSecondary, flexShrink: 1 },

  musicChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  musicChipActive: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },

  publicChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  publicChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },

  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '700' },

  listArea: { paddingHorizontal: 16, marginTop: 8 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  eventCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, gap: 12, marginBottom: 10 },
  eventCardDisabled: { opacity: 0.6 },
  eventThumb: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(225, 48, 108, 0.12)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  eventThumbImg: { width: 48, height: 48 },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  eventDate: { fontSize: 11, fontWeight: '700', color: COLORS.pink },
  guestListBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(76, 175, 125, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  guestListBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.green },
  eventTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  eventLocation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  eventLocationLink: { textDecorationLine: 'underline', color: COLORS.pink },
  eventPrice: { fontSize: 11, fontWeight: '700', color: COLORS.gold, marginTop: 4 },
  festasPagasTitulo: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  festaPagaCard: { width: 118, height: 118, borderRadius: 14, overflow: 'hidden', backgroundColor: '#2A1B3D', justifyContent: 'flex-end', padding: 8, gap: 2 },
  festaPagaVeu: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,16,0.5)' },
  festaPagaData: { fontSize: 10, fontWeight: '800', color: '#F6C453' },
  festaPagaNome: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  filtrarLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  filtrarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, height: 32 },
  filtrarTxt: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  filtrarLimpar: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  filtrarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  filtrarSheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  filtrarTitulo: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  filtrarSecao: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  filtrarChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filtrarVazio: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#0B0B0E', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipAtivo: { backgroundColor: COLORS.pink, borderColor: COLORS.pink },
  chipTxt: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  filtrarOk: { marginTop: 16, backgroundColor: COLORS.pink, borderRadius: 14, height: 46, alignItems: 'center', justifyContent: 'center' },
  filtrarOkTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  patrocinadoBadge: { fontSize: 10, fontWeight: '700', color: COLORS.purple, marginTop: 2 },

  emptyBox: { padding: 30, alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 },
  emptyText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { width: '100%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  modalOptionsList: { gap: 10 },
  modalOptionCard: { padding: 14, borderRadius: 14, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: COLORS.border },
  modalOptionActive: { borderColor: COLORS.pink, backgroundColor: 'rgba(225, 48, 108, 0.12)' },
  modalOptionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  modalOptionSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Modal Nome na Lista VIP
  listModalContent: { width: '100%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  listEventName: { fontSize: 15, fontWeight: '800', color: COLORS.pink },
  listEventSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18 },
  formGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  textInput: { height: 44, borderRadius: 12, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, color: COLORS.textPrimary, fontSize: 12 },
  submitListBtn: { height: 46, backgroundColor: COLORS.pink, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitListBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
});
