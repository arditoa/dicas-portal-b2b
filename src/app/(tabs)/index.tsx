import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FundoDegrade from '../../components/FundoDegrade';
import { useCidadeAtual } from '../../hooks/useCidadeAtual';
import { useSlotHora } from '../../hooks/useSlotHora';
import { chaveSemana, rodizioComPrioridade } from '../../lib/rodizio';
import { CONFIG_RODIZIO_PADRAO, ConfigRodizio, lerConfigRodizio } from '../../lib/rodizioConfig';
import { abertoAgora } from '../../lib/horario';
import { useAuth } from '../../lib/authContext';
import { registrarAviso } from '../../lib/avisos';
import { IDIOMAS, useI18n } from '../../lib/i18n';
import { CATEGORIA_ORDER, CATEGORIA_REAL_LABEL, CATEGORIAS, CategoriaConfig } from '../../lib/categorias';
import {
  compararDestaque,
  rodizioHorario,
  deveExibirGlow,
  deveIncluirEm,
  estaFixadoEm,
  estaFixadoParaHoje,
  EXPERIENCIAS_REAIS,
} from '../../lib/destaque';
import { supabase } from '../../lib/supabase';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
  safeSpace: '#4CAF7D',
  gold: '#FFD54F',
  // Rodada 56 (4ª rodada) — "Destaque da Semana" usava o mesmo dourado de
  // "Em Alta" (deveExibirGlow), o que reforçava a sensação de repetição
  // que já tinha motivado o card deitado. Cor própria, só pra essa seção.
  amber: '#FF9142',
};

// Nova versão (Home estilo Uber) — caixas lilás sobre o fundo preto.
const COR_TILE = '#E8E0F6';
const COR_TILE_TEXTO = '#0B0B0E';
const COR_TILE_APAGADO = '#55546A';
const GAP_GRADE = 8;

// Ordem das categorias na Home: Dicas Trip (tile largo) + as demais.
// Fonte dos dados continua sendo lib/categorias.ts.
// Pedido da Andrea (out/2026): uma linha só, com rolagem lateral; Lazer
// sai da Home; Serviços logo depois de Comer, e Beleza em seguida.
// Mesma ordem oficial de lib/categorias.ts (12 categorias, out/2026).
const ORDEM_GRADE = CATEGORIA_ORDER;
const LARGURA_TILE = 84;

// Seção "Selos e benefícios" (out/2026): 3 cartões do mesmo tamanho, cada
// um explicando em uma frase o que é. "Cadastre seu estabelecimento" saiu
// da Home (fica em Conta > Indicar Parceiro / site) — confundia o usuário
// final com uma chamada que é pra empresa.
// Experiências mostradas na Home, nesta ordem (pedido da Andrea, out/2026).
const EXPERIENCIAS_HOME = ['aniversario', 'dates', 'dancar', 'musica_ao_vivo', 'drag_show', 'karaoke'];

const BANNERS_PRINCIPAIS = [
  {
    id: 'b1',
    tag: 'banner.fundadorTag',
    titulo: 'banner.fundadorTitulo',
    sub: 'banner.fundadorSub',
    cta: 'banner.fundadorCta',
    cor: '#FFD54F',
    icone: 'award',
    route: '/experience/Membro%20Fundador',
  },
  {
    id: 'b2',
    tag: 'banner.seloTag',
    titulo: 'banner.seloTitulo',
    sub: 'banner.seloSub',
    cta: 'banner.seloCta',
    cor: '#E1306C',
    icone: 'check-circle',
    route: '/experience/Selo%20Dicas%20LGBT%2B',
  },
  {
    id: 'b3',
    tag: 'banner.cupomTag',
    titulo: 'banner.cupomTitulo',
    sub: 'banner.cupomSub',
    cta: 'banner.cupomCta',
    cor: '#B39DDB',
    icone: 'percent',
    route: '/coupons',
  },
];

interface LocalCard {
  id: string;
  nome: string;
  categoria: string;
  bairro: string | null;
  // Rodada 57 — "bairro para exibir" (portal, dashboard/perfil e admin):
  // texto opcional, só de apresentação, pra quando o bairro oficial não é
  // o nome que o público reconhece (exemplo da Andrea: "Augusta" em vez
  // de "Consolação"). NUNCA usado pra geocodificação — só troca o texto
  // mostrado. Ver bairroExibicao() abaixo.
  bairro_exibicao: string | null;
  cidade: string;
  instagram: string | null;
  foto_capa_url: string | null;
  // Rodada 56 — bug reportado pela Andrea: cards de destaque (Selo Dicas,
  // Em Alta) ficavam sem foto nenhuma quando o parceiro só tinha subido
  // fotos na galeria (recurso premium, dashboard/perfil) mas nunca
  // preencheu especificamente a "foto de capa" (foto_capa_url, campo
  // separado, opcional). Cai aqui pra servir de reserva — ver
  // fotoDestaqueUrl() abaixo.
  galeria_fotos: string[] | null;
  rating_media: number;
  rating_total: number;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  destaque_secao_fixada: string | null;
  destaque_secoes: string[] | null;
  destaque_ate: string | null;
  plano_comercial: string | null;
  plano_comercial_status: string | null;
  horario_funcionamento?: Record<string, any> | null;
}

// Rodada 56 — foto de capa com reserva na galeria: todo plano pode
// preencher foto_capa_url (é o campo "básico", sempre visível — ver
// comentário equivalente em business/[id].tsx), mas na prática muita
// gente só sobe fotos pela galeria (só Premium/Fundador tem esse upload,
// dashboard/perfil) e esquece de definir a capa separadamente. Sem essa
// reserva, o card de destaque fica com o fundo vazio mesmo o local tendo
// fotos de verdade cadastradas — foi exatamente o caso da "Vezpa Bar &
// Rooftop" depois do reset da Rodada 55. Não fura o limite de quem paga:
// galeria_fotos só vem preenchida pra quem já tem/teve o upload de
// galeria liberado (premium/fundador), então essa reserva nunca aparece
// pra local freemium que nunca teve acesso a esse upload.
function fotoDestaqueUrl(item: Pick<LocalCard, 'foto_capa_url' | 'galeria_fotos'>): string | null {
  return item.foto_capa_url || item.galeria_fotos?.[0] || null;
}

// Rodada 57 — mesmo padrão de fotoDestaqueUrl acima: "bairro para exibir"
// (bairro_exibicao) é opcional, então cai pro bairro oficial e, por
// último, pra cidade — igual o fallback que já existia inline em cada
// card (`item.bairro || item.cidade`), só que priorizando o texto de
// exibição quando o local tiver preenchido um.
function bairroExibicao(item: Pick<LocalCard, 'bairro_exibicao' | 'bairro' | 'cidade'>): string {
  return item.bairro_exibicao || item.bairro || item.cidade;
}

interface EventoHoje {
  id: string;
  titulo: string;
  data_inicio: string;
  locais: { nome: string; bairro: string | null; bairro_exibicao: string | null } | null;
}

interface LocalTurismo {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  descricao: string | null;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  destaque_secao_fixada: string | null;
  destaque_secoes: string[] | null;
  destaque_ate: string | null;
  plano_comercial: string | null;
  plano_comercial_status: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const { t, idioma, proximoIdioma } = useI18n();
  const idiomaAtual = IDIOMAS.find((i) => i.code === idioma) || IDIOMAS[0];
  const local = useCidadeAtual();

  const [busca, setBusca] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const [emAltaPool, setEmAltaPool] = useState<LocalCard[]>([]);
  const [cfgRodizio, setCfgRodizio] = useState<ConfigRodizio>(CONFIG_RODIZIO_PADRAO);
  // Rodada 47 — criado como "Selo Dicas LGBT+", seção própria com
  // curadoria editorial da Andrea. Rodada 56 (3ª rodada de ajuste) —
  // ela pediu pra trocar de lugar com "Destaque da Semana": o Selo
  // Dicas virou banner no topo (ao lado de Membro Fundador, mesmo
  // padrão de selo/conquista — ver BANNERS_PRINCIPAIS), e esta seção
  // (ANTES até de "Em Alta") passou a mostrar quem tem
  // deveExibirGlow(item) = true — exatamente quem já ganha a borda/selo
  // dourado "DESTAQUE" nos cards de "Em Alta" (quem paga premium/
  // fundador automaticamente, OU quem a Andrea marcou manualmente com
  // destaque_secoes: ['destaque'] no /admin) — não precisa de consulta
  // nova ao banco, é derivado dos mesmos dados já buscados pra "Em
  // Alta" (emAltaRes) logo abaixo.
  const [destaqueSemana, setDestaqueSemana] = useState<LocalCard[]>([]);
  const [agendaHoje, setAgendaHoje] = useState<EventoHoje[]>([]);
  // Rodada 44 — locais fixados manualmente em "O que fazer hoje" pelo
  // /admin (destaque_secoes contém 'hoje'), além dos eventos automáticos
  // de hoje já buscados acima. Ver estaFixadoParaHoje em lib/destaque.ts.
  const [locaisHoje, setLocaisHoje] = useState<LocalCard[]>([]);
  const [dicasTrip, setDicasTrip] = useState<LocalTurismo[]>([]);
  // Rodada 56 (4ª rodada) — logos dos locais com o selo "Membro Fundador"
  // (local_badges.rotulo ilike '%fundador%'), pro banner de topo (ver
  // comentário na renderização, seção BANNERS PRINCIPAIS). Mesmo
  // mecanismo/consulta já usado em experience/[tag].tsx (branch
  // ehFundador) — aqui só id/nome/foto pra desenhar avatares pequenos.
  const [fundadorLogos, setFundadorLogos] = useState<
    { id: string; nome: string; foto_capa_url: string | null; logo_url: string | null }[]
  >([]);
  // Rodada 57 — arte de marketing GLOBAL do banner "Membro Fundador"
  // (config chave/valor, migration 030 — ver admin/page.tsx, seção "Arte
  // de marketing"). Opcional: null enquanto a Andrea não subir nada, e o
  // banner continua no visual padrão de sempre (ver mostrarLogos/
  // BANNERS_PRINCIPAIS abaixo).
  const [bannerFundadorArteUrl, setBannerFundadorArteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [abertosAgora, setAbertosAgora] = useState<LocalCard[]>([]);
  type DestaqueTopo = { id: string; nome: string; foto: string | null; bairro: string; tipo: 'fundador' | 'patrocinado' | 'outro' };
  // Pagantes/fixados (prioridade) e, para completar as vagas, outros locais com foto.
  const [topoPrioritarios, setTopoPrioritarios] = useState<DestaqueTopo[]>([]);
  const [topoDemais, setTopoDemais] = useState<DestaqueTopo[]>([]);
  // Rodízio por horário: a cada intervalo (padrão 1 h) aparece um novo grupo de 6.
  const slotRodizio = useSlotHora(cfgRodizio.intervaloMin);
  const destaquesTopo = useMemo(
    () => rodizioComPrioridade(topoPrioritarios, topoDemais, slotRodizio, cfgRodizio.tamanho, chaveSemana()),
    [topoPrioritarios, topoDemais, slotRodizio, cfgRodizio.tamanho]
  );
  const emAlta = useMemo(
    () => rodizioHorario(emAltaPool, 'em_alta', slotRodizio, cfgRodizio.tamanho),
    [emAltaPool, slotRodizio, cfgRodizio.tamanho]
  );
  const [slide, setSlide] = useState(0);
  const carrosselRef = useRef<ScrollView>(null);
  const { width: larguraTela } = useWindowDimensions();
  const larguraSlide = Math.min(larguraTela, 600) - 32;

  // Carrossel do topo passa sozinho a cada 4 segundos.
  useEffect(() => {
    if (destaquesTopo.length < 2) return;
    const timer = setInterval(() => {
      setSlide((atual) => {
        const proximo = (atual + 1) % destaquesTopo.length;
        carrosselRef.current?.scrollTo({ x: proximo * (larguraSlide + 12), animated: true });
        return proximo;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [destaquesTopo.length, larguraSlide]);

  const isUserLogged = !!session;

  const carregarHome = useCallback(async () => {
    setLoading(true);
    try {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      const fimHoje = new Date();
      fimHoje.setHours(23, 59, 59, 999);

      // Rodada 43 — antes buscávamos só 20/10 e ORDENÁVAMOS por destaque,
      // sem nunca FILTRAR quem entra: todo aprovado acabava aparecendo em
      // "Em Alta"/"Dicas Trip". Agora buscamos um lote maior e usamos
      // deveIncluirEm (src/lib/destaque.ts) pra decidir quem realmente
      // entra — quem paga premium/fundador entra automático, e a Andrea
      // pode incluir manualmente qualquer outro pelo /admin
      // (destaque_secoes) quando o app estiver vazio.
      const [emAltaRes, agendaRes, hojeRes, tripRes, eventosHojeFixadosRes, fundadorRes, appConfigRes] = await Promise.all([
        supabase
          .from('locais')
          .select(
            'id, nome, categoria, bairro, bairro_exibicao, cidade, instagram, foto_capa_url, galeria_fotos, rating_media, rating_total, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, plano_comercial, plano_comercial_status, horario_funcionamento'
          )
          .eq('status', 'aprovado')
          .limit(60),
        supabase
          .from('eventos')
          .select('id, titulo, data_inicio, locais(nome, bairro, bairro_exibicao)')
          .eq('status', 'aprovado')
          .gte('data_inicio', inicioHoje.toISOString())
          .lte('data_inicio', fimHoje.toISOString())
          .order('data_inicio', { ascending: true })
          .limit(5),
        // Rodada 44 — locais fixados manualmente em "O que fazer hoje"
        // pelo /admin (novo valor 'hoje' em destaque_secoes, migration
        // 025). Antes só entravam eventos com data de hoje.
        supabase
          .from('locais')
          .select(
            'id, nome, categoria, bairro, bairro_exibicao, cidade, instagram, foto_capa_url, galeria_fotos, rating_media, rating_total, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, plano_comercial, plano_comercial_status'
          )
          .eq('status', 'aprovado')
          .contains('destaque_secoes', ['hoje'])
          .limit(20),
        supabase
          .from('locais')
          .select(
            'id, nome, categoria, subcategoria, descricao, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, plano_comercial, plano_comercial_status'
          )
          .eq('status', 'aprovado')
          .eq('categoria', 'turismo')
          .limit(40),
        // Rodada 46 — a Andrea reportou "eventos não sobem": a Home só
        // trazia evento pra "O que fazer hoje" quando data_inicio caía
        // EXATAMENTE hoje, sem jeito de fixar manualmente uma festa
        // recorrente ou promover um evento antes do dia (locais já
        // tinham essa opção desde a 025 — evento nunca teve, migration
        // 026 libera 'hoje' também pra destaque_secoes de eventos).
        supabase
          .from('eventos')
          .select('id, titulo, data_inicio, destaque_secoes, destaque_ate, locais(nome, bairro, bairro_exibicao)')
          .eq('status', 'aprovado')
          .contains('destaque_secoes', ['hoje'])
          .limit(10),
        // Rodada 56 (4ª rodada) — logos pro banner "Membro Fundador" (ver
        // fundadorLogos acima). Mesma consulta de experience/[tag].tsx
        // (branch ehFundador): local_badges é o selo REAL, não um campo
        // comercial — por isso não dá pra reaproveitar o lote de emAltaRes.
        supabase
          .from('local_badges')
          .select('locais!inner(id, nome, foto_capa_url, logo_url, galeria_fotos, bairro, bairro_exibicao, cidade, status)')
          .ilike('rotulo', '%fundador%')
          .eq('ativo', true)
          .eq('locais.status', 'aprovado')
          .limit(20),
        // Rodada 57 — arte de marketing global do banner "Membro Fundador"
        // (ver bannerFundadorArteUrl acima).
        supabase.from('app_config').select('valor').eq('chave', 'membro_fundador_banner_url').maybeSingle(),
      ]);
      // Rodada 47 — Selo Dicas LGBT+ tinha consulta própria aqui. Rodada 56
      // (3ª rodada) — não precisa mais: o carrossel do Selo Dicas saiu da
      // Home (virou banner + tela própria em /experience/[tag].tsx, que faz
      // sua própria consulta) e "Destaque da Semana" ocupou este lugar,
      // derivado do MESMO lote já buscado acima (emAltaRes) — ver
      // listaDestaqueSemana logo abaixo.

      let listaEmAlta = (((emAltaRes.data as any) || []) as LocalCard[]).filter((item) =>
        deveIncluirEm(item, 'em_alta')
      );
      listaEmAlta.sort(compararDestaque('em_alta'));

      // Rodada 46 — junta os eventos automáticos de hoje (data exata) com
      // os fixados manualmente (destaque_secoes 'hoje', qualquer data),
      // sem duplicar quem for as duas coisas ao mesmo tempo.
      const agendaAutomatica = ((agendaRes.data as any) || []) as EventoHoje[];
      const eventosFixados = (((eventosHojeFixadosRes.data as any) || []) as (EventoHoje & {
        destaque_secoes?: string[] | null;
        destaque_ate?: string | null;
      })[]).filter((ev) => estaFixadoParaHoje({ id: ev.id, plano_destaque: 'basico', destaque_secoes: ev.destaque_secoes, destaque_ate: ev.destaque_ate }));
      const idsJaNaAgenda = new Set(agendaAutomatica.map((ev) => ev.id));
      const agendaCombinada = [
        ...agendaAutomatica,
        ...eventosFixados.filter((ev) => !idsJaNaAgenda.has(ev.id)),
      ];
      setAgendaHoje(agendaCombinada);

      const listaLocaisHoje = (((hojeRes.data as any) || []) as LocalCard[]).filter((item) =>
        estaFixadoParaHoje(item)
      );
      setLocaisHoje(listaLocaisHoje);

      let listaTrip = (((tripRes.data as any) || []) as LocalTurismo[]).filter((item) =>
        deveIncluirEm(item, 'dicas_trip')
      );
      listaTrip.sort(compararDestaque('dicas_trip'));
      setDicasTrip(listaTrip.slice(0, 8));

      // Rodada 56 (3ª rodada) — "Destaque da Semana": mesmo critério que já
      // decide o brilho/selo dourado "DESTAQUE" nos cards de Em Alta
      // (deveExibirGlow — quem paga premium/fundador automaticamente, OU
      // quem a Andrea marcou manualmente com destaque_secoes: ['destaque']
      // no /admin). Derivado do lote já buscado pra Em Alta (emAltaRes),
      // não do listaEmAlta já filtrado — porque um local pode ter o selo
      // "destaque" sem necessariamente estar (ou entrar) em "Em Alta".
      const listaDestaqueSemana = (((emAltaRes.data as any) || []) as LocalCard[])
        .filter((item) => deveExibirGlow(item))
        .sort(compararDestaque('destaque'));
      // Out/2026 — "Destaque da Semana" e "Em Alta" mostravam praticamente os
      // mesmos locais (quem paga premium/fundador). Agora é UMA seção só,
      // "Em Alta": primeiro quem tem destaque (com o selo dourado DESTAQUE
      // no card), depois o restante da rotação. Ninguém que pagava perde
      // espaço — quem aparecia só no Destaque da Semana entra aqui também.
      // Nova Home (out/2026): "Em Alta" = rotação dos planos menores
      // (Intermediário/Premium e manuais), "Destaques da semana" = quem tem o
      // selo DESTAQUE. Se Em Alta ficar vazia sem quem já está no Destaque,
      // mostra a lista completa pra seção não sumir.
      const idsDestaque = new Set(listaDestaqueSemana.map((i) => i.id));
      const emAltaSemRepetir = listaEmAlta.filter((i) => !idsDestaque.has(i.id));
      // Rodízio por horário: o pool é TODO local aprovado (menos quem já está
      // em "Destaques da semana"); quem paga/está fixado tem prioridade e as
      // vagas que sobrarem são completadas com os demais (ver rodizioHorario).
      const todosAprovados = ((emAltaRes.data as any) || []) as LocalCard[];
      const poolSemDestaque = todosAprovados.filter((i) => !idsDestaque.has(i.id));
      setEmAltaPool(poolSemDestaque.length > 0 ? poolSemDestaque : todosAprovados);
      lerConfigRodizio().then(setCfgRodizio);
      setDestaqueSemana(listaDestaqueSemana.slice(0, 8));

      // Abertos agora (O que fazer hoje), sem repetir quem já foi fixado.
      const idsHoje = new Set(listaLocaisHoje.map((i) => i.id));
      setAbertosAgora(
        (((emAltaRes.data as any) || []) as LocalCard[])
          .filter((i) => !idsHoje.has(i.id) && abertoAgora(i))
          .slice(0, 8)
      );

      // Rodada 56 (4ª rodada) — logos pro banner "Membro Fundador" (mesmo
      // formato de linha aninhada de experience/[tag].tsx: local_badges
      // trazendo locais!inner, precisa "desembrulhar" .locais de cada row).
      const listaFundadorLogos = (((fundadorRes.data as any) || []) as { locais: any }[])
        .map((row) => row.locais)
        .filter(Boolean) as { id: string; nome: string; foto_capa_url: string | null; logo_url: string | null }[];
      setFundadorLogos(listaFundadorLogos);

      // Carrossel do topo: fundadores + patrocinados (destaque_secoes 'patrocinado').
      const topo: DestaqueTopo[] = [];
      const vistosTopo = new Set<string>();
      for (const f of listaFundadorLogos as any[]) {
        if (vistosTopo.has(f.id)) continue;
        vistosTopo.add(f.id);
        topo.push({ id: f.id, nome: f.nome, foto: f.foto_capa_url || f.galeria_fotos?.[0] || f.logo_url || null, bairro: f.bairro_exibicao || f.bairro || f.cidade || '', tipo: 'fundador' });
      }
      for (const p of ((emAltaRes.data as any) || []) as LocalCard[]) {
        if (vistosTopo.has(p.id) || !estaFixadoEm(p, 'patrocinado')) continue;
        vistosTopo.add(p.id);
        topo.push({ id: p.id, nome: p.nome, foto: fotoDestaqueUrl(p), bairro: bairroExibicao(p), tipo: 'patrocinado' });
      }
      setTopoPrioritarios(topo);
      // Para completar as vagas do carrossel: demais locais aprovados que tenham foto.
      setTopoDemais(
        (((emAltaRes.data as any) || []) as LocalCard[])
          .filter((p) => !vistosTopo.has(p.id) && !!fotoDestaqueUrl(p))
          .map((p) => ({ id: p.id, nome: p.nome, foto: fotoDestaqueUrl(p), bairro: bairroExibicao(p), tipo: 'outro' as const }))
      );
      setBannerFundadorArteUrl(((appConfigRes.data as any)?.valor as string | undefined) || null);

      if (user?.id) {
        const idsParaChecar = [...listaEmAlta.map((i) => i.id), ...listaTrip.map((i) => i.id), ...listaDestaqueSemana.map((i) => i.id)];
        if (idsParaChecar.length > 0) {
          const { data: favs } = await supabase
            .from('favoritos_locais')
            .select('local_id')
            .eq('user_id', user.id)
            .in('local_id', idsParaChecar);
          setFavoritos((favs || []).map((f: any) => f.local_id));
        }
      } else {
        setFavoritos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar Home:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    carregarHome();
  }, [carregarHome]);

  const handleToggleFavorito = async (localId: string) => {
    if (!isUserLogged || !user) {
      Alert.alert(
        'Salvar nos Favoritos',
        'Crie sua conta ou entre em poucos segundos para salvar seus locais favoritos.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Entrar / Criar Conta', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    const favoritosAnteriores = favoritos;
    const jaFavoritado = favoritosAnteriores.includes(localId);
    // Rodada 56 (4ª rodada) — bug reportado pela Andrea: "salvei o vezpa e
    // não apareceu nos favoritos" (o coração ficava rosa na hora, mas o
    // local nunca aparecia em "Locais Salvos" no Perfil). Causa: o código
    // atualizava a tela (otimista) sem nunca checar se o insert/delete no
    // Supabase realmente deu certo — um erro (RLS, rede, etc.) passava
    // batido, silencioso. Agora confere o retorno e, se falhar, desfaz o
    // coração e avisa, em vez de fingir que salvou.
    setFavoritos(jaFavoritado ? favoritosAnteriores.filter((id) => id !== localId) : [...favoritosAnteriores, localId]);
    try {
      const { error } = jaFavoritado
        ? await supabase.from('favoritos_locais').delete().eq('local_id', localId).eq('user_id', user.id)
        : await supabase.from('favoritos_locais').insert({ local_id: localId, user_id: user.id });
      if (error) throw error;
    } catch (err: any) {
      setFavoritos(favoritosAnteriores);
      Alert.alert('Erro', err?.message || 'Não foi possível atualizar seus favoritos. Tenta de novo em alguns segundos.');
    }
  };

  const handleOpenInstagram = (handle: string) => {
    const limpo = handle.replace(/^@/, '');
    Linking.openURL(`https://instagram.com/${limpo}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o Instagram.');
    });
  };

  const handleCategoryPress = (cat: CategoriaConfig) => {
    // Em breve: em vez de um toque que não faz nada (App Store 2.1), registra
    // o "avise-me" de verdade.
    if (cat.emBreve) {
      registrarAviso({
        userId: user?.id,
        alvo: cat.slug,
        alvoLabel: cat.label,
        t,
        irParaLogin: () => router.push('/(tabs)/profile'),
      });
      return;
    }

    if (cat.slug === 'festas') {
      router.push('/(tabs)/events');
      return;
    }

    router.push({
      pathname: `/category/${cat.slug}` as any,
      params: { title: encodeURIComponent(cat.label) },
    });
  };

  // Rodada 44 — antes esses chips eram decorativos: só mandavam um
  // título pra tela de categoria, que nunca filtrava por ele (a Andrea
  // confirmou que quer isso corrigido). Agora mandam o slug real
  // (locais.experiencias, migration 025) e a tela de categoria filtra
  // de verdade — ver src/app/category/[id].tsx.
  const openExperienceScreen = (exp: { slug: string; label: string }) => {
    router.push({
      pathname: '/category/todos' as any,
      params: { title: encodeURIComponent(exp.label), experiencia: exp.slug },
    });
  };

  const handleBuscar = () => {
    if (!busca.trim()) return;
    router.push({
      pathname: '/category/todos' as any,
      params: { title: encodeURIComponent('Resultados da busca'), search: encodeURIComponent(busca.trim()) },
    });
  };

  return (
    <View style={styles.container}>
      <FundoDegrade />
      {/* HEADER — logo + frase à esquerda; localização | idioma à direita.
          A localização só é lida se já foi autorizada; senão o botão pede a
          permissão no toque (nunca ao abrir o app — App Store 5.1.1). */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerEsquerda}>
          <Image
            source={require('../../assets/images/logolinear-semfundo.png')}
            style={styles.logoLinear}
            resizeMode="contain"
            accessibilityLabel="Dicas LGBT+"
          />
          <Text style={styles.appSubtitulo}>{t('app.subtitulo')}</Text>
        </View>
        <View style={styles.headerDireita}>
          <TouchableOpacity
            style={styles.localChip}
            activeOpacity={0.8}
            onPress={() => (local.autorizado ? router.push('/(tabs)/explore') : local.ativar())}
            accessibilityRole="button"
            accessibilityLabel={local.cidade ? `${t('home.voceEstaEm')} ${local.cidade}` : t('home.ativarLocalizacao')}
          >
            <Image source={require('../../assets/images/pin-localizacao.png')} style={styles.localPin} resizeMode="contain" />
            <Text style={styles.localChipTexto} numberOfLines={1}>{local.cidade || t('home.localizacao')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.idiomaBtn}
            onPress={proximoIdioma}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${t('conta.idioma')}: ${idiomaAtual.nome}`}
          >
            <Feather name="globe" size={14} color={COLORS.textPrimary} />
            <Text style={styles.idiomaBtnTexto}>{idiomaAtual.sigla}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* DESTAQUES DOS FUNDADORES E PATROCINADOS — passa sozinho a cada 4s.
            Cumpre a promessa do plano Fundador (presença fixa no topo da Home). */}
        {destaquesTopo.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <ScrollView
              ref={carrosselRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={larguraSlide + 12}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (larguraSlide + 12)))}
            >
              {destaquesTopo.map((d) => {
                const Container: any = d.foto ? ImageBackground : View;
                const props = d.foto ? { source: { uri: d.foto }, imageStyle: { borderRadius: 18 }, resizeMode: 'cover' as const } : {};
                return (
                  <TouchableOpacity key={`${d.tipo}-${d.id}`} activeOpacity={0.9} onPress={() => router.push(`/business/${d.id}` as any)}>
                    <Container style={[styles.slide, { width: larguraSlide }]} {...props}>
                      {d.foto && (
                        <>
                          <View style={styles.emAltaOverlayTop} />
                          <View style={styles.emAltaOverlayBottom} />
                        </>
                      )}
                      {d.tipo !== 'outro' && (
                        <View style={[styles.slideTag, { backgroundColor: d.tipo === 'fundador' ? COLORS.gold : COLORS.purple }]}>
                          <Text style={[styles.slideTagTexto, d.tipo === 'patrocinado' && { color: '#FFFFFF' }]}>
                            {d.tipo === 'fundador' ? t('banner.fundadorTag') : t('home.patrocinado')}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={styles.slideNome} numberOfLines={1}>{d.nome}</Text>
                        {!!d.bairro && <Text style={styles.slideBairro} numberOfLines={1}>{d.bairro}</Text>}
                      </View>
                    </Container>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {destaquesTopo.length > 1 && (
              <View style={styles.pontos}>
                {destaquesTopo.map((d, i) => (
                  <View key={`p-${d.tipo}-${d.id}`} style={[styles.ponto, i === slide && styles.pontoAtivo]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* BUSCA — pílula única, tipo o "Para onde?" do Uber */}
        {/* Rodada 69 — abre a tela de busca (recentes, sugestões, populares e
            resultados por tipo: lugares, eventos, roteiros). */}
        <TouchableOpacity
          style={styles.buscaContainer}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/busca' as any, params: local.cidade ? { cidade: local.cidade } : {} })}
          accessibilityRole="search"
          accessibilityLabel={t('home.busca')}
        >
          <Feather name="search" size={20} color={COLORS.textPrimary} />
          <Text style={[styles.buscaInput, { color: COLORS.textSecondary }]}>{t('home.busca')}</Text>
        </TouchableOpacity>

        <View style={{ height: 14 }} />

        {/* CATEGORIAS — ícones redondos de sempre (cor própria por categoria,
            vinda de lib/categorias.ts), numa linha com rolagem lateral. Dicas
            Trip segue o mesmo formato das demais. Em breve = "avise-me" real
            (avisos_interesse, migration 035). */}
        <View style={styles.secaoBloco}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriaScrollContent}>
            {ORDEM_GRADE.map((slug) => {
              const cat = CATEGORIAS[slug];
              const label = t(`cat.${slug}`) === `cat.${slug}` ? cat.label : t(`cat.${slug}`);
              return (
                <TouchableOpacity
                  key={slug}
                  style={styles.categoriaHorizontalItem}
                  onPress={() => (slug === 'turismo' ? router.push('/(tabs)/tourism') : handleCategoryPress(cat))}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={cat.emBreve ? `${label}, ${t('home.emBreve')}` : label}
                >
                  <View style={[styles.categoriaCircle, cat.emBreve && styles.categoriaDisabled]}>
                    <Feather name={cat.icon as any} size={20} color={cat.emBreve ? COLORS.purple : cat.color} />
                    {cat.emBreve && (
                      <View style={styles.emBreveBadge}>
                        <Text style={styles.emBreveTexto}>{t('home.emBreve')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.categoriaLabel, cat.emBreve && { color: COLORS.textMuted }]} numberOfLines={2}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {/* ATALHO ÚNICO — "Locais perto de você" abre o Mapa com todas as
            categorias (antes eram 2 atalhos, "Bares perto" + "Planejar
            viagem", que repetiam o que já tem nas categorias e na aba Trip). */}
        <TouchableOpacity style={styles.atalhoItem} activeOpacity={0.8} onPress={() => router.push('/(tabs)/explore')}>
          <View style={styles.atalhoIcone}><Feather name="map-pin" size={17} color={COLORS.pink} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.atalhoTitulo}>{t('home.encontreLugares')}</Text>
            <Text style={styles.atalhoSub}>{t('home.atalhoLocaisSub')}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {/* NEWS — notícia do momento (sem a marca "Copa do Mundo", FIFA/App Store 5.2) */}
        <View style={styles.brasilCard}>
          <View style={{ flex: 1, padding: 14, gap: 4 }}>
            <Text style={styles.brasilTag}>{t('home.brasil2027Tag')}</Text>
            <Text style={styles.brasilTitulo}>{t('home.brasil2027Titulo')}</Text>
            <TouchableOpacity
              style={styles.brasilBtn}
              activeOpacity={0.85}
              onPress={() =>
                registrarAviso({
                  userId: user?.id,
                  alvo: 'brasil2027',
                  alvoLabel: 'Brasil 2027',
                  t,
                  irParaLogin: () => router.push('/(tabs)/profile'),
                })
              }
            >
              <Text style={styles.brasilBtnTexto}>{t('home.brasil2027Cta')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.brasilFaixa}>
            <Feather name="globe" size={34} color="#FFFFFF" />
          </View>
        </View>


        {/* 4 CAIXAS LADO A LADO — cada uma abre uma página com os slots
            relacionados (src/app/secao/[tipo].tsx). Na Home fica só o atalho
            com a contagem; as listas completas ficam nas páginas. */}
        <View style={styles.gradeSecoes}>
          {[
            { tipo: 'em-alta', titulo: t('home.emAlta'), icone: 'trending-up', cor: COLORS.gold, qtd: emAlta.length },
            { tipo: 'hoje', titulo: t('home.hojeTitulo'), icone: 'zap', cor: COLORS.pink, qtd: agendaHoje.length + locaisHoje.length + abertosAgora.length },
            { tipo: 'semana', titulo: t('home.destaqueSemana'), icone: 'star', cor: COLORS.amber, qtd: destaqueSemana.length },
            { tipo: 'experiencia', titulo: t('home.experiencia'), icone: 'heart', cor: COLORS.purple, qtd: EXPERIENCIAS_HOME.length },
          ].map((b) => (
            <TouchableOpacity
              key={b.tipo}
              style={styles.secaoBox}
              activeOpacity={0.85}
              onPress={() => router.push(`/secao/${b.tipo}` as any)}
              accessibilityRole="button"
              accessibilityLabel={b.titulo}
            >
              <View style={[styles.secaoBoxIcone, { borderColor: b.cor }]}>
                <Feather name={b.icone as any} size={18} color={b.cor} />
              </View>
              <Text style={styles.secaoBoxTitulo} numberOfLines={2}>{b.titulo}</Text>
              <View style={styles.secaoBoxRodape}>
                <Text style={styles.secaoBoxQtd}>
                  {loading ? '…' : b.qtd === 1 ? t('home.boxQtd1') : b.qtd > 1 ? t('home.boxQtd', { n: String(b.qtd) }) : t('home.boxVer')}
                </Text>
                <Feather name="chevron-right" size={14} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* CONHEÇA NOSSOS SELOS — dois cartões iguais, lado a lado */}
        <View style={styles.secaoBloco}>
          <View style={styles.selosRow}>
            {BANNERS_PRINCIPAIS.filter((b) => b.id !== 'b3').map((b) => (
              <TouchableOpacity key={b.id} style={styles.seloCard} activeOpacity={0.85} onPress={() => router.push(b.route as any)}>
                <Feather name={b.icone as any} size={22} color={b.cor} />
                <Text style={styles.seloTitulo} numberOfLines={2}>{t(b.titulo)}</Text>
                <Text style={styles.seloSub} numberOfLines={3}>{t(b.sub)}</Text>
                <Text style={[styles.seloCta, { color: b.cor }]}>{t(b.cta)} →</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* RODAPÉ — canais oficiais */}
        <View style={styles.rodape}>
          {[
            { label: t('rodape.site'), icone: 'globe', onPress: () => Linking.openURL('https://www.dicaslgbt.com.br') },
            { label: t('rodape.produtos'), icone: 'shopping-bag', onPress: () => router.push({ pathname: '/category/produtos' as any, params: { title: encodeURIComponent(t('rodape.produtos')) } }) },
            { label: 'Instagram', icone: 'instagram', onPress: () => Linking.openURL('https://www.instagram.com/dicaslgbt/') },
            { label: t('rodape.parceiro'), icone: 'briefcase', onPress: () => Linking.openURL('https://www.dicaslgbt.com.br/parceiro-fundador') },
          ].map((l) => (
            <TouchableOpacity key={l.label} style={styles.rodapeLink} onPress={l.onPress} accessibilityRole="link">
              <Feather name={l.icone as any} size={16} color={COLORS.textSecondary} />
              <Text style={styles.rodapeTexto}>{l.label}</Text>
              <Feather name="external-link" size={13} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
          <Text style={styles.rodapeAssinatura}>Dicas LGBT+ · Vezpa Bar</Text>
        </View>
      </ScrollView>
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
    marginBottom: 14,
  },
  idiomaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  idiomaBtnTexto: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  localRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  localBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, flexShrink: 1 },
  localPin: { width: 18, height: 14 },
  headerDireita: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  localChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    maxWidth: 130,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  localChipTexto: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  slide: { height: 130, borderRadius: 16, padding: 14, justifyContent: 'space-between', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  slideTag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  slideTagTexto: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 0.4 },
  slideNome: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  slideBairro: { fontSize: 12, color: '#E0E0EA', marginTop: 2 },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  pontoAtivo: { width: 18, backgroundColor: COLORS.pink },
  altaBox: { width: 92 },
  altaFoto: {
    width: 92,
    height: 92,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  altaPatrocinado: { position: 'absolute', top: 6, left: 6, backgroundColor: COLORS.purple, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  altaPatrocinadoTexto: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  altaNome: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  altaMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  semanaCard: { width: 210, height: 92, borderRadius: 14, padding: 12, justifyContent: 'space-between', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.amber, overflow: 'hidden' },
  semanaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.amber, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  selosRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  rodape: { marginTop: 8, marginHorizontal: 16, paddingTop: 8 },
  rodapeLink: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  rodapeTexto: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  rodapeAssinatura: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 12 },
  gradeSecoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 18 },
  secaoBox: {
    width: '48.5%',
    minHeight: 104,
    borderRadius: 14,
    padding: 12,
    gap: 6,
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secaoBoxIcone: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secaoBoxTitulo: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  secaoBoxRodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secaoBoxQtd: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  seloCard: { flex: 1, minHeight: 140, borderRadius: 14, padding: 12, gap: 6, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  seloTitulo: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  seloSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, flexGrow: 1 },
  seloCta: { fontSize: 12, fontWeight: '800' },
  localLabel: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  localCidade: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  inboxBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEsquerda: { justifyContent: 'center' },
  // Rodada 40 — logo trocado (novo gradiente no "LGBT+"). Aproveitei
  // pra padronizar o tamanho do logo do header: cada tela tinha um
  // valor diferente (150x36, 130x32, 140x32...) e ficava visivelmente
  // maior/menor dependendo da tela. Agora as 5 telas com logo no
  // header (index, events, profile, explore, category) usam 140x34.
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

  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.border,
  },
  buscaInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },

  atalhoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 8,
  },
  hojeLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: 20, marginTop: 10, minHeight: 32 },
  hojeLinkTexto: { fontSize: 13, fontWeight: '700', color: COLORS.pink },
  atalhoIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atalhoTitulo: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  atalhoSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  catDica: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  catLinha: { gap: GAP_GRADE, paddingHorizontal: 16 },
  catTile: {
    height: 92,
    borderRadius: 14,
    backgroundColor: COR_TILE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  catTileLabel: { fontSize: 12, fontWeight: '700', color: COR_TILE_TEXTO },
  catEmBreve: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  catEmBreveTexto: { fontSize: 7, fontWeight: '800', color: COR_TILE, letterSpacing: 0.3 },
  catTileTrip: {
    backgroundColor: COLORS.pink,
    alignItems: 'stretch',
    justifyContent: 'space-between',
    padding: 12,
  },
  catTripTag: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  catTripTagTexto: { fontSize: 10, fontWeight: '800', color: '#C2185B', letterSpacing: 0.4 },
  catTripRodape: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  catTripTitulo: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  brasilCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COR_TILE,
  },
  brasilTag: { fontSize: 11, fontWeight: '800', color: COLORS.purple, letterSpacing: 0.6 },
  brasilTitulo: { fontSize: 14, fontWeight: '800', color: COR_TILE_TEXTO, lineHeight: 18 },
  brasilBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: COR_TILE_TEXTO,
    borderRadius: 18,
    paddingHorizontal: 14,
    minHeight: 32,
    justifyContent: 'center',
  },
  brasilBtnTexto: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  brasilFaixa: { width: 72, backgroundColor: COLORS.pink, alignItems: 'center', justifyContent: 'center' },

  bannerScrollView: { marginBottom: 24 },
  bannerScrollContent: { paddingLeft: 16, paddingRight: 4 },
  bannerCard: {
    width: 280,
    height: 168,
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    // Rodada 57 — adicionado pro banner "Membro Fundador" poder virar
    // ImageBackground (arte de marketing) sem o overlay escurecido
    // (emAltaOverlayTop/Bottom, absolute) vazar quadrado por cima dos
    // cantos arredondados do card.
    overflow: 'hidden',
  },
  bannerTopoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  bannerTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  bannerCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerCta: { fontSize: 12, fontWeight: '800' },
  bannerTagText: { fontSize: 10, fontWeight: '800', color: '#000' },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  bannerSub: { fontSize: 12, color: COLORS.textSecondary },
  // Rodada 56 (4ª rodada) — fileira de logos dos locais com selo "Membro
  // Fundador" dentro do banner (ver fundadorLogos/mostrarLogos no JSX).
  // Avatares pequenos de propósito ("reduzir as imagens", pedido da
  // Andrea) — bem diferente dos cards grandes de Em Alta/Destaque.
  bannerLogosRow: { flexDirection: 'row', alignItems: 'center' },
  bannerLogoAvatar: {
    marginRight: -8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  bannerLogoImg: { width: 30, height: 30, borderRadius: 15 },
  bannerLogoImgVazio: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  bannerLogoMais: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerLogoMaisTexto: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },

  // Out/2026 — Home mais compacta (cabe mais coisa na primeira tela).
  secaoBloco: { marginBottom: 18 },
  // Mesmo padrão de título de seção em todas as telas (igual Eventos): 17/800.
  sectionTituloPadrao: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, paddingHorizontal: 16, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitulo: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sectionSubtitulo: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sectionVerTudo: { fontSize: 12, fontWeight: '600', color: COLORS.pink },

  emptyInlineBox: { marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  emptyInlineText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  categoriaScrollContent: { paddingHorizontal: 16, gap: 12 },
  categoriaHorizontalItem: { alignItems: 'center', width: 80 },
  categoriaCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoriaDisabled: { opacity: 0.5 },
  emBreveBadge: { position: 'absolute', bottom: -4, backgroundColor: COLORS.purple, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  emBreveTexto: { fontSize: 7, fontWeight: '800', color: '#FFF' },
  // Nomes de 2 palavras ("Bares & Vida Noturna") quebram em até 2 linhas.
  categoriaLabel: { fontSize: 11, lineHeight: 13, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },

  carrosselPadding: { paddingHorizontal: 16, gap: 12 },

  emAltaCard: {
    // Rodada 47 tinha aumentado pra width 220/minHeight 260 ("deixar a
    // opção da foto um pouco maior") — Rodada 56 reduziu pra 172/188
    // (ainda grande demais pra Andrea) — Rodada 56 (2ª rodada de ajuste,
    // "vamos agora reduzir um pouco o tamanho") reduz mais uma vez.
    // Rodada 56 (4ª rodada) — card deixou de ser um único bloco com
    // padding uniforme (foto de fundo cobrindo tudo) e virou duas
    // metades empilhadas (emAltaCardFotoWrap + emAltaCardConteudo, ver
    // comentário no JSX) — por isso sem padding/gap aqui, cada metade
    // cuida do próprio espaçamento.
    width: 148,
    minHeight: 190,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  // Rodada 56 (4ª rodada) — metade de cima do card, só a foto (altura
  // fixa). backgroundColor é o fallback pra quando o local não tem foto
  // (CardContainer vira <View> nesse caso — ver fotoDestaqueUrl/CardContainer
  // no JSX) — mesmo sem foto, o cabeçalho (categoria/patrocinado/coração)
  // continua legível porque não depende mais de contraste em cima de
  // imagem.
  emAltaCardFotoWrap: {
    height: 84,
    backgroundColor: COLORS.border,
    padding: 8,
  },
  // Botão de favorito circular com fundo semi-transparente — antes o
  // coração ficava solto em cima do overlay escuro do card inteiro; sem
  // esse overlay (foto só ocupa a metade de cima agora), o próprio botão
  // precisa do fundo pra continuar legível em qualquer foto.
  emAltaFavBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 11, 14, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Metade de baixo — fundo sólido (COLORS.card, nada de foto/overlay),
  // é o "deixar com fundo pra aparecer melhor" que a Andrea pediu pro
  // bairro/Instagram.
  emAltaCardConteudo: {
    flex: 1,
    padding: 10,
    gap: 4,
    justifyContent: 'space-between',
  },
  // Rodada 47 — troca do overlay único e escuro (0.55 uniforme, "afogava"
  // a cor da foto) por dois blocos empilhados simulando um gradiente sem
  // precisar de lib nova (expo-linear-gradient não está instalada e a
  // prática já estabelecida aqui é não adicionar dependência nova pra
  // isso — ver comentário de emAltaCardDestacado): o topo fica quase
  // transparente (foto respira, mais colorida) e só o rodapé escurece o
  // suficiente pra manter nome/meta legíveis por cima.
  emAltaOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(11, 11, 14, 0.08)',
  },
  emAltaOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '62%',
    backgroundColor: 'rgba(11, 11, 14, 0.75)',
  },
  // Rodada 43 — "tela brilhante" pedida pela Andrea pra locais que não
  // são freemium (pagam de verdade, ou ela marcou "destaque" manual no
  // /admin). RN não tem borda com gradiente nativo sem lib nova, então
  // usamos borda dourada + sombra pra ler como "brilho" sem adicionar
  // dependência nenhuma ao app.
  emAltaCardDestacado: {
    borderColor: COLORS.gold,
    borderWidth: 1.5,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  emAltaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emAltaHeaderLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emAltaLogoAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  emAltaDestaqueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  emAltaDestaqueBadgeText: { fontSize: 8, fontWeight: '800', color: '#000' },
  // Rodada 56 (4ª rodada) — variante âmbar de emAltaCardDestacado/
  // emAltaDestaqueBadge, só pra "Destaque da Semana" (ver comentário do
  // COLORS.amber lá em cima): mesmo visual de "brilho" do Em Alta, mas
  // com cor própria pra não parecer o mesmo selo "DESTAQUE" duas vezes.
  destaqueSemanaCardDestacado: {
    borderColor: COLORS.amber,
    borderWidth: 1.5,
    shadowColor: COLORS.amber,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  destaqueSemanaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.amber,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  // Rodada 57 (2ª rodada) — Andrea: "como melhorar as cores do início pra
  // não atrapalhar com a foto? [...] colocar fundo [...] na descrição bar?"
  // Fundo era rgba(255,213,79,0.15) — quase transparente, some em cima de
  // foto clara/colorida. Trocado pelo mesmo fundo escuro semi-transparente
  // do emAltaFavBtn (coração), pra ficar consistente e legível em
  // qualquer foto, mantendo o texto dourado por cima.
  emAltaCategoryBadge: { backgroundColor: 'rgba(11, 11, 14, 0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  emAltaCategoryText: { fontSize: 10, fontWeight: '800', color: COLORS.gold },
  // Rodada 57 (2ª rodada) — mesmo ajuste do emAltaCategoryBadge acima (era
  // rgba(126,87,194,0.18), pouco contraste em cima de foto); texto roxo
  // continua legível sobre o fundo escuro.
  patrocinadoBadge: { backgroundColor: 'rgba(11, 11, 14, 0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 6 },
  patrocinadoBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.purple },
  // Rodada 47 — estilo criado pro Selo Dicas LGBT+ (borda/selo rosa,
  // "escolha editorial", nunca "espaço pago"). Rodada 56 (3ª rodada) —
  // o carrossel do Selo Dicas saiu da Home (virou banner + tela própria),
  // então seloDicasCard/seloDicasBadge/seloDicasBadgeText ficaram sem uso
  // aqui — deixados no styles por segurança (risco zero, é só CSS não
  // referenciado), não removidos. seloDicasSubtitulo continua em uso
  // (reaproveitado pelo subtítulo de "Destaque da Semana" — nome ficou
  // desatualizado, mas é só um estilo genérico de texto pequeno).
  seloDicasSubtitulo: { fontSize: 11, color: COLORS.textSecondary, paddingHorizontal: 16, marginTop: -6, marginBottom: 12 },
  seloDicasCard: {
    borderColor: COLORS.pink,
    borderWidth: 1.5,
    shadowColor: COLORS.pink,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  seloDicasBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.pink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seloDicasBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  // Rodada 56 (3ª rodada) — "talvez com um layout menor", pedido da
  // Andrea pro carrossel "Destaque da Semana" (que ocupou o lugar do
  // Selo Dicas). Só sobrescreve tamanho/padding em cima de emAltaCard —
  // resto do visual (cor dourada, badge, overlay) vem de
  // emAltaCardDestacado/emAltaDestaqueBadge, reaproveitados como estão.
  destaqueSemanaCard: {
    // Rodada 56 (4ª rodada) — card deitado (paisagem), tamanho FIXO
    // (não usa emAltaCard como base mais — self-contained), pra ficar
    // visualmente diferente dos cards em pé de "Em Alta" logo abaixo.
    // Reduzido de 260x104 pra 220x88 a pedido da Andrea ("reduzir um
    // pouco o tamanho") — texto continua com 1 linha (numberOfLines),
    // então cabe sem cortar nome/meta.
    width: 220,
    height: 88,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  emAltaTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  emAltaMeta: { fontSize: 11, color: COLORS.textSecondary },
  emAltaFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  instaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#232230', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  instaBtnText: { fontSize: 10, color: COLORS.textPrimary, fontWeight: '600' },

  agendaCard: { width: 150, borderRadius: 14, backgroundColor: COLORS.card, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  agendaImageArea: { height: 64, backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  agendaContent: { padding: 8 },
  agendaHorario: { fontSize: 11, fontWeight: '700', color: COLORS.pink, marginBottom: 2 },
  agendaTitulo: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  agendaDiferencial: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  turismoPropagandaCard: {
    width: 200,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
    gap: 6,
  },
  turismoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderRightRow: { flexDirection: 'row', alignItems: 'center' },
  turismoCategoryBadge: { fontSize: 10, fontWeight: '700', color: COLORS.safeSpace },
  turismoPromoBadge: { backgroundColor: 'rgba(76, 175, 125, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  turismoPromoText: { fontSize: 9, fontWeight: '800', color: COLORS.safeSpace },
  turismoTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  turismoDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15 },
  turismoFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  turismoBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.safeSpace },

  experienciasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  expChip: { backgroundColor: COLORS.card, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  expChipText: { fontSize: 12, fontWeight: '600', color: COLORS.purple },

  carnavalCard: { marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  carnavalBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(126, 87, 194, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  carnavalBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.purple },
  carnavalTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  carnavalSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  carnavalBtn: { height: 40, backgroundColor: COLORS.purple, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  carnavalBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
