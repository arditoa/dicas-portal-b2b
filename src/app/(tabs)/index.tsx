import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
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

import CarrosselAnuncios, { Anuncio } from '../../components/CarrosselAnuncios';
import { MODO_DEMONSTRACAO } from '../../lib/demo';
import FundadoresMini from '../../components/FundadoresMini';
import FundoCaixaDegrade from '../../components/FundoCaixaDegrade';
import MarcaApp from '../../components/MarcaApp';
import DestaqueHora, { ParceiroHora } from '../../components/DestaqueHora';
import FundoDegrade from '../../components/FundoDegrade';
import FundoFaixaPremium from '../../components/FundoFaixaPremium';
import { useCidadeAtual } from '../../hooks/useCidadeAtual';
import { useSlotHora } from '../../hooks/useSlotHora';
import { blocoFixoDiario, inicioDoSlot, temImagemParaFaixa } from '../../lib/rodizio';
import { formatarNome } from '../../lib/texto';
import { categoriaMostraEndereco, textoLocalizacao } from '../../lib/localizacao';
import { CONFIG_RODIZIO_PADRAO, ConfigRodizio, lerConfigRodizio } from '../../lib/rodizioConfig';
import { abertoAgora } from '../../lib/horario';
import { useAuth } from '../../lib/authContext';
import { registrarAviso } from '../../lib/avisos';
import { useAnunciosApp } from '../../lib/banners';
import { IDIOMAS, useI18n } from '../../lib/i18n';
import { CATEGORIA_ORDER, CATEGORIA_REAL_LABEL, CATEGORIAS, CategoriaConfig } from '../../lib/categorias';
import { buscarComunicacao, Comunicacao, registrarVitrine } from '../../lib/vitrine';
import {
  compararDestaque,
  ehPremiumAtivo,
  rodizioHorario,
  deveExibirGlow,
  deveIncluirEm,
  estaFixadoEm,
  estaFixadoParaHoje,
  EXPERIENCIAS_REAIS,
  ehServico,
} from '../../lib/destaque';
import { supabase } from '../../lib/supabase';
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
// Categorias ativas primeiro; as "em breve" vão para o fim da fila (ordem oficial mantida dentro de cada grupo).
const ORDEM_GRADE = [
  'destaques' as (typeof CATEGORIA_ORDER)[number],
  ...CATEGORIA_ORDER.filter((slug) => !CATEGORIAS[slug].emBreve),
  ...CATEGORIA_ORDER.filter((slug) => CATEGORIAS[slug].emBreve),
];
const LARGURA_TILE = 84;
// Rótulos curtos da barra de categorias (cabem 6 por linha); o nome completo continua no leitor de tela e na página.
const ROTULO_CURTO: Record<string, string> = {
  destaques: 'Destaques', turismo: 'Dicas Trip', bares: 'Bares & Noite', festas: 'Festas', gastronomia: 'Gastronomia',
  lazer: 'Lazer', cultura: 'Cultura', saude: 'Saúde', beleza: 'Beleza', servicos: 'Serviços', educacao: 'Educação',
  produtos: 'Produtos', comunidade: 'Comunidade', mais18: '18+', lojas: 'Lojas',
};

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

// Quadrados do topo (Membros Fundadores e patrocinados).
const TOPO_TILE = 148;
const TOPO_GAP = 10;

const AVATAR = 54;
const AVATAR_ANEL = 62;
const AVATAR_GAP = 12;
const VELOCIDADE_PX_S = 28;

// Rodada 79 — faixa de locais premium: avatares redondos com anel dourado
// passando devagar, em círculo contínuo (a lista se repete até preencher a
// largura, então nunca sobra espaço vazio). Sem texto. Toque abre o local; o
// nome fica só como rótulo de acessibilidade.
function FaixaPremium({
  itens,
  onAbrir,
}: {
  itens: { id: string; nome: string; imagem: string; ehLogo: boolean }[];
  onAbrir: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const passo = AVATAR_ANEL + AVATAR_GAP;
  const larguraLista = itens.length * passo;
  // A faixa vai de borda a borda da tela; os avatares começam 16 px da borda esquerda.
  const disponivel = Math.min(width, 600);
  const copias = Math.max(2, Math.ceil((disponivel + larguraLista + 16) / larguraLista));
  const x = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    x.setValue(16);
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: 16 - larguraLista,
        duration: Math.round((larguraLista / VELOCIDADE_PX_S) * 1000),
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [larguraLista, x]);

  const lista = Array.from({ length: copias }, () => itens).flat();
  return (
    <View style={styles.faixaPremiumFundo}>
      <FundoFaixaPremium />
      <Animated.View style={{ flexDirection: 'row', width: lista.length * passo, transform: [{ translateX: x }] }}>
        {lista.map((l, i) => (
          <TouchableOpacity
            key={`${l.id}-${i}`}
            activeOpacity={0.85}
            onPress={() => onAbrir(l.id)}
            accessibilityRole="button"
            accessibilityLabel={l.nome}
            style={styles.avatarAnel}
          >
            <View style={[styles.avatarMiolo, l.ehLogo && { backgroundColor: '#FFFFFF' }]}>
              <Image
                source={{ uri: l.imagem }}
                style={l.ehLogo ? { width: '78%', height: '78%' } : { width: '100%', height: '100%' }}
                resizeMode={l.ehLogo ? 'contain' : 'cover'}
              />
            </View>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
}

// Faixa "Hoje · 14h · …" da Home: desligada a pedido da Andrea (out/2026). Para voltar, troque para true.
const MOSTRAR_FAIXA_HOJE = false;

// Enquanto não há premium suficiente: faixa fina com o que acontece hoje,
// trocando sozinha a cada 4 s (esmaece de um item para o outro).
function FaixaHoje({
  itens,
  onAbrir,
}: {
  itens: { chave: string; rota: string; texto: string }[];
  onAbrir: (rota: string) => void;
}) {
  const [i, setI] = useState(0);
  const opac = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    setI(0);
    if (itens.length < 2) return;
    const timer = setInterval(() => {
      Animated.timing(opac, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setI((a) => (a + 1) % itens.length);
        Animated.timing(opac, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [itens, opac]);
  const atual = itens[i % itens.length];
  if (!atual) return null;
  return (
    <TouchableOpacity
      style={styles.faixaHoje}
      activeOpacity={0.85}
      onPress={() => onAbrir(atual.rota)}
      accessibilityRole="button"
      accessibilityLabel={atual.texto}
    >
      <Feather name="zap" size={15} color={COLORS.pink} />
      <Animated.Text style={[styles.faixaHojeTexto, { opacity: opac }]} numberOfLines={1}>{atual.texto}</Animated.Text>
      <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

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
  logo_url?: string | null;
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
  useRastrearTela('home');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const { t, idioma, proximoIdioma } = useI18n();
  const { anuncios: anunciosApp, aoExibir: aoExibirBanner } = useAnunciosApp('home');
  const idiomaAtual = IDIOMAS.find((i) => i.code === idioma) || IDIOMAS[0];
  const { width: larguraTela } = useWindowDimensions();
  // 6 categorias cabem inteiras e a 7ª aparece pela metade (+ seta): fica claro que há mais ao lado.
  const larguraCat = Math.floor((larguraTela - 16 - 5 * 4) / 6.35);
  const [catRolou, setCatRolou] = useState(false);
  const local = useCidadeAtual();

  const [busca, setBusca] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const [emAltaPool, setEmAltaPool] = useState<LocalCard[]>([]);
  const [aprovadosHome, setAprovadosHome] = useState<LocalCard[]>([]);
  const [servicosPool, setServicosPool] = useState<LocalCard[]>([]);
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
  type DestaqueTopo = { id: string; nome: string; foto: string | null; bairro: string; tipo: 'fundador' | 'patrocinado' | 'outro'; ehLogo?: boolean };
  // Fixos do topo: Membros Fundadores + patrocinados (destaque_secoes 'patrocinado').
  const [topoPrioritarios, setTopoPrioritarios] = useState<DestaqueTopo[]>([]);
  // Rodízio por horário: a cada intervalo (padrão 1 h) aparece um novo grupo de 6.
  const slotRodizio = useSlotHora(cfgRodizio.intervaloMin);
  // Rodada 77 — o topo é FIXO: fundadores sempre aparecem (ordem muda uma vez
  // por dia; se passarem do limite, o grupo avança por dia) e os patrocinados
  // marcados no /admin ficam depois. Quem não paga não entra aqui: vai para o
  // bloco "Em alta agora", logo abaixo, que gira por horário.
  const destaquesTopo = useMemo(() => {
    const fundadores = topoPrioritarios.filter((d) => d.tipo === 'fundador');
    const patrocinados = topoPrioritarios.filter((d) => d.tipo !== 'fundador');
    return [...blocoFixoDiario(fundadores, cfgRodizio.fundadoresMax), ...patrocinados];
    // slotRodizio entra na lista só para recalcular quando o dia virar com o app aberto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topoPrioritarios, cfgRodizio.fundadoresMax, slotRodizio]);
  const [ofertasHora, setOfertasHora] = useState<Record<string, { oferta: string; botao: string }>>({});
  // Ofertas do bloco "Destaques" (RLS já esconde as vencidas). Falha = sem oferta.
  useEffect(() => {
    let vivo = true;
    supabase
      .from('destaque_hora_ofertas')
      .select('local_id, oferta, botao, oferta_ate')
      .then(({ data, error }) => {
        if (!vivo || error || !data) return;
        const agora = Date.now();
        const mapa: Record<string, { oferta: string; botao: string }> = {};
        for (const r of data as any[]) {
          if (new Date(r.oferta_ate).getTime() > agora) mapa[r.local_id] = { oferta: r.oferta, botao: r.botao };
        }
        setOfertasHora(mapa);
      });
    return () => { vivo = false; };
  }, [slotRodizio]);
  // Logos dos Membros Fundadores para a faixa do pé da Home.
  const fundadoresFaixa = useMemo(
    () =>
      fundadorLogos
        .filter((f) => f.logo_url || f.foto_capa_url)
        .map((f) => ({ id: f.id, nome: formatarNome(f.nome), imagem: (f.logo_url || f.foto_capa_url) as string, ehLogo: !!f.logo_url })),
    [fundadorLogos]
  );
  // Bloco "Destaques": 1 parceiro pago por hora. Quem tem oferta válida
  // (destaque_hora_ofertas) tem prioridade; sem oferta, entra o rodízio dos
  // locais premium com imagem, fora do topo fixo (fundadores/patrocinados).
  const parceiroHora = useMemo<ParceiroHora | null>(() => {
    const fixos = new Set(topoPrioritarios.map((d) => d.id));
    const premium = aprovadosHome.filter((p) => !fixos.has(p.id) && ehPremiumAtivo(p) && temImagemParaFaixa(p));
    const comOferta = premium.filter((p) => ofertasHora[p.id]);
    const pool = (comOferta.length > 0 ? comOferta : premium).slice().sort((x, y) => x.id.localeCompare(y.id));
    if (pool.length === 0) return null;
    const l = pool[((slotRodizio % pool.length) + pool.length) % pool.length];
    const of = ofertasHora[l.id];
    const slugCat = l.categoria as keyof typeof CATEGORIAS;
    const rotulo = t(`cat.${l.categoria}`) === `cat.${l.categoria}` ? CATEGORIAS[slugCat]?.label ?? '' : t(`cat.${l.categoria}`);
    return {
      id: l.id,
      nome: formatarNome(l.nome),
      foto: (l.logo_url || fotoDestaqueUrl(l)) as string | null,
      ehLogo: !!l.logo_url,
      bairro: bairroExibicao(l),
      categoria: rotulo,
      oferta: of ? of.oferta : null,
      botao: of ? of.botao : 'ver_local',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aprovadosHome, topoPrioritarios, slotRodizio, ofertasHora, t]);
  // Sem premium suficiente: "o que acontece hoje" (eventos de hoje, locais fixados
  // para hoje e lugares abertos agora), numa faixa fina.
  const itensHoje = useMemo(() => {
    const hora = (iso: string) => {
      const d = new Date(iso);
      const m = d.getMinutes();
      return `${d.getHours()}h${m ? String(m).padStart(2, '0') : ''}`;
    };
    const lista = [
      ...agendaHoje.map((e) => ({ chave: `e-${e.id}`, rota: `/evento/${e.id}`, texto: `${t('home.hojeLabel')} · ${hora(e.data_inicio)} · ${e.titulo}` })),
      ...locaisHoje.map((l) => ({ chave: `l-${l.id}`, rota: `/business/${l.id}`, texto: `${t('home.hojeLabel')} · ${formatarNome(l.nome)}` })),
      ...abertosAgora
        .filter((l) => categoriaMostraEndereco(l.categoria))
        .map((l) => ({ chave: `a-${l.id}`, rota: `/business/${l.id}`, texto: `${t('home.abertoAgora')} · ${formatarNome(l.nome)}` })),
    ];
    const vistos = new Set<string>();
    return lista.filter((i) => (vistos.has(i.chave) ? false : (vistos.add(i.chave), true))).slice(0, 6);
  }, [agendaHoje, locaisHoje, abertosAgora, t]);
  const emAlta = useMemo(
    () => rodizioHorario(emAltaPool, 'em_alta', slotRodizio, cfgRodizio.tamanho),
    [emAltaPool, slotRodizio, cfgRodizio.tamanho]
  );
  // Serviços em destaque: mesmo rodízio por horário, só entre serviços/beleza/lojas.
  const servicosHora = useMemo(
    () => rodizioHorario(servicosPool, 'em_alta', slotRodizio, 6),
    [servicosPool, slotRodizio]
  );
  // Quadradinhos pequenos de fundadores/patrocinados, logo abaixo da busca.
  const fundadoresMini = useMemo(
    () =>
      destaquesTopo.map((d) => ({
        id: `${d.tipo}-${d.id}`,
        nome: d.nome,
        foto: d.foto,
        ehLogo: d.ehLogo,
        tipo: d.tipo,
        onPress: () => router.push(`/business/${d.id}` as any),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destaquesTopo]
  );
  // Vitrine logo abaixo dos fundadores: o Museu e o Dicas Trip, no mesmo tamanho
  // dos banners de parceiros. O resto dos destaques (Em alta, Hoje, Top da semana…) já está nas
  // caixas mais abaixo, então não se repete aqui.
  // Comunicação dos Membros Fundadores (escrita pela equipe no /admin; migration 059).
  const [comFundadores, setComFundadores] = useState<Record<string, Comunicacao>>({});
  // 12 vagas "Banner Fundador N Home": os Membros Fundadores em ordem fixa; a Home mostra 4 por vez e troca a cada hora.
  const fundadoresBanner = useMemo(
    () => topoPrioritarios.filter((d) => d.tipo === 'fundador').slice().sort((a, b) => a.id.localeCompare(b.id)).slice(0, 12),
    [topoPrioritarios]
  );
  const slotFundador = useSlotHora(60);
  const idsFundTopo = useMemo(() => fundadoresBanner.map((d) => d.id).join(','), [fundadoresBanner]);
  useEffect(() => {
    let vivo = true;
    if (!idsFundTopo) { setComFundadores({}); return; }
    buscarComunicacao(idsFundTopo.split(',')).then((m) => { if (vivo) setComFundadores(m); });
    return () => { vivo = false; };
  }, [idsFundTopo]);

  // Destaques do topo (mesmo tamanho dos banners de parceiros): Museu, Dicas Trip e os Membros
  // Fundadores girando — cada fundador com a frase que a equipe de comunicação escreveu para ele.
  // Institucionais que também são Membros Fundadores: o Museu da Diversidade e o "Viaje pelo Brasil" (Dicas Trip).
  // Ficam sempre no começo do banner do topo.
  const anunciosInstitucionais = useMemo<Anuncio[]>(
    () => [
      {
        id: 'museu', chave: 'museu', tag: t('home.anuncioMuseuTag'), titulo: t('home.anuncioMuseuTitulo'), cta: t('home.anuncioMuseuCta'),
        icone: 'book-open', cor: '#6D28D9', degrade: ['#6D28D9', '#DB2777'], onPress: () => router.push('/apoiador/museu-diversidade' as any),
      },
      {
        id: 'trip', chave: 'trip', tag: t('home.anuncioTripTag'), titulo: t('home.anuncioTripTitulo'), cta: t('home.anuncioTripCta'),
        icone: 'compass', cor: '#10B981', degrade: ['#10B981', '#0E7490'], onPress: () => router.push('/(tabs)/tourism' as any),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  // Banners dos Fundadores na Home: 12 vagas, 4 por vez, a janela avança a cada hora. Vaga sem fundador aparece escrita
  // ("Banner Fundador 5 Home") só em demonstração (lib/demo.ts).
  const bannersFundadorHora = useMemo<Anuncio[]>(() => {
    const total = MODO_DEMONSTRACAO ? 12 : fundadoresBanner.length;
    if (total === 0) return [];
    const ini = (((slotFundador * 4) % total) + total) % total;
    return Array.from({ length: Math.min(4, total) }, (_, k) => {
      const pos = (ini + k) % total;
      const d = fundadoresBanner[pos];
      if (!d) {
        return {
          id: `fund-demo-${pos}`, chave: `fund-demo-${pos}`, tag: 'BANNER FUNDADOR', titulo: `Banner Fundador ${pos + 1} Home`, cta: 'Conhecer',
          icone: 'star', cor: '#F59E0B', degrade: ['#B45309', '#9D174D'] as [string, string],
          onPress: () => Linking.openURL('https://www.dicaslgbt.com.br/parceiro-fundador').catch(() => {}),
        } as Anuncio;
      }
      const com = comFundadores[d.id];
      return {
        id: `fund-${d.id}`,
        chave: `fund-${d.id}`,
        tag: formatarNome(d.nome).toUpperCase(),
        titulo: com?.headline || com?.oferta || `Conheça ${formatarNome(d.nome)}`,
        cta: com?.cta || 'Conhecer',
        icone: 'star',
        cor: '#F59E0B',
        degrade: ['#B45309', '#9D174D'] as [string, string],
        onPress: () => {
          registrarVitrine(d.id, 'home:destaques', 'clique');
          router.push(`/business/${d.id}` as any);
        },
      } as Anuncio;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundadoresBanner, slotFundador, comFundadores]);

  // Topo da Home: banner rotativo que GERA DESEJO — Museu, Dicas Trip e os Membros Fundadores (chamada escrita pela equipe).
  // Dentro das categorias o mesmo cartão gira fundadores + premium.
  const anunciosVitrine = useMemo<Anuncio[]>(
    () => [
      ...anunciosInstitucionais,
      ...bannersFundadorHora,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, bannersFundadorHora, anunciosInstitucionais]
  );

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
            'id, nome, categoria, bairro, bairro_exibicao, cidade, instagram, foto_capa_url, logo_url, galeria_fotos, rating_media, rating_total, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, plano_comercial, plano_comercial_status, horario_funcionamento'
          )
          .eq('status', 'aprovado')
          .limit(1000),
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
          .limit(300),
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
          .select('locais!inner(id, nome, categoria, foto_capa_url, logo_url, galeria_fotos, bairro, bairro_exibicao, cidade, status)')
          .ilike('rotulo', '%fundador%')
          .eq('ativo', true)
          .eq('locais.status', 'aprovado')
          .limit(100),
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
      // Serviços (fotógrafo, beleza, lojas) ficam fora do Em Alta: têm bloco próprio.
      const soLugares = todosAprovados.filter((i) => !ehServico(i));
      const poolSemDestaque = soLugares.filter((i) => !idsDestaque.has(i.id));
      setEmAltaPool(poolSemDestaque.length > 0 ? poolSemDestaque : soLugares);
      setServicosPool(todosAprovados.filter((i) => ehServico(i)));
      setAprovadosHome(todosAprovados);
      lerConfigRodizio().then(setCfgRodizio);
      setDestaqueSemana(listaDestaqueSemana.slice(0, 8));

      // Abertos agora (O que fazer hoje), sem repetir quem já foi fixado.
      const idsHoje = new Set(listaLocaisHoje.map((i) => i.id));
      setAbertosAgora(
        (((emAltaRes.data as any) || []) as LocalCard[])
          .filter((i) => !idsHoje.has(i.id) && !ehServico(i) && abertoAgora(i))
          .slice(0, 8)
      );

      // Rodada 56 (4ª rodada) — logos pro banner "Membro Fundador" (mesmo
      // formato de linha aninhada de experience/[tag].tsx: local_badges
      // trazendo locais!inner, precisa "desembrulhar" .locais de cada row).
      const listaFundadorLogos = (((fundadorRes.data as any) || []) as { locais: any }[])
        .map((row) => row.locais)
        .filter(Boolean) as { id: string; nome: string; foto_capa_url: string | null; logo_url: string | null }[];
      setFundadorLogos(listaFundadorLogos);

      // Topo fixo: fundadores + patrocinados (destaque_secoes 'patrocinado').
      const topo: DestaqueTopo[] = [];
      const vistosTopo = new Set<string>();
      for (const f of listaFundadorLogos as any[]) {
        if (vistosTopo.has(f.id)) continue;
        vistosTopo.add(f.id);
        topo.push({ id: f.id, nome: formatarNome(f.nome), foto: f.foto_capa_url || f.galeria_fotos?.[0] || f.logo_url || null, ehLogo: !f.foto_capa_url && !f.galeria_fotos?.[0] && !!f.logo_url, bairro: textoLocalizacao(f), tipo: 'fundador' });
      }
      for (const p of ((emAltaRes.data as any) || []) as LocalCard[]) {
        if (vistosTopo.has(p.id) || !estaFixadoEm(p, 'patrocinado')) continue;
        vistosTopo.add(p.id);
        topo.push({ id: p.id, nome: formatarNome(p.nome), foto: fotoDestaqueUrl(p), bairro: textoLocalizacao(p), tipo: 'patrocinado' });
      }
      setTopoPrioritarios(topo);
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
          <MarcaApp />
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

        {/* FUNDADORES (pequenos) + VITRINE DE DESTAQUES — abaixo dos quadradinhos giram, a cada 5 s,
            banners do Museu e dos Recomendados (mesmo tamanho dos de parceiros). */}
        <CarrosselAnuncios anuncios={anunciosVitrine} />

        {/* ANÚNCIOS (acima das categorias) — carrossel que passa sozinho (Copa 2027, Embratur, Câmara LGBT).
            Para trocar os anúncios (ex.: durante a Copa), mude só esta lista. */}
        <CarrosselAnuncios
          onExibir={aoExibirBanner}
          anuncios={[...(anunciosApp ? anunciosApp.filter((a) => a.chave !== 'museu' && a.chave !== 'trip') : [
            {
              id: 'brasil2027',
              tag: t('home.brasil2027Tag'),
              titulo: t('home.brasil2027Titulo'),
              cta: t('home.brasil2027Cta'),
              icone: 'globe',
              cor: COLORS.pink,
              onPress: () =>
                registrarAviso({
                  userId: user?.id,
                  alvo: 'brasil2027',
                  alvoLabel: 'Brasil 2027',
                  t,
                  irParaLogin: () => router.push('/(tabs)/profile'),
                }),
            },
            {
              id: 'embratur',
              tag: t('home.anuncioEmbraturTag'),
              titulo: t('home.anuncioEmbraturTitulo'),
              cta: t('home.anuncioConhecer'),
              icone: 'map',
              cor: '#1E8A3F',
              onPress: () => Linking.openURL('https://embratur.com.br/').catch(() => {}),
            },
            {
              id: 'camaralgbt',
              tag: t('home.anuncioCamaraTag'),
              titulo: t('home.anuncioCamaraTitulo'),
              cta: t('home.anuncioConhecer'),
              icone: 'briefcase',
              cor: COLORS.purple,
              onPress: () => Linking.openURL('https://camaralgbt.com.br/').catch(() => {}),
            },
          ])]}
        />

        {/* CATEGORIAS — ícones redondos de sempre (cor própria por categoria,
            vinda de lib/categorias.ts), numa linha com rolagem lateral. Dicas
            Trip segue o mesmo formato das demais. Em breve = "avise-me" real
            (avisos_interesse, migration 035). */}
        <View style={styles.secaoBloco}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriaScrollContent}
            scrollEventThrottle={32}
            onScroll={(e) => { const rolou = e.nativeEvent.contentOffset.x > 12; if (rolou !== catRolou) setCatRolou(rolou); }}
          >
            {ORDEM_GRADE.map((slug) => {
              const cat = CATEGORIAS[slug];
              const completo = t(`cat.${slug}`) === `cat.${slug}` ? cat.label : t(`cat.${slug}`);
              const label = idioma === 'pt' && ROTULO_CURTO[slug] ? ROTULO_CURTO[slug] : completo;
              return (
                <TouchableOpacity
                  key={slug}
                  style={[styles.categoriaHorizontalItem, { width: larguraCat }]}
                  onPress={() => (slug === 'turismo' ? router.push('/(tabs)/tourism') : handleCategoryPress(cat))}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={cat.emBreve ? `${completo}, ${t('home.emBreve')}` : completo}
                >
                  <View style={[styles.categoriaCircle, cat.emBreve && styles.categoriaDisabled, slug === 'destaques' && styles.categoriaCircleDestaque]}>
                    <Feather name={cat.icon as any} size={20} color={cat.emBreve ? COLORS.purple : cat.color} />
                    {cat.emBreve && (
                      <View style={styles.emBreveBadge}>
                        <Text style={styles.emBreveTexto}>{t('home.emBreve')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.categoriaLabelBox}>
                    <Text style={[styles.categoriaLabel, cat.emBreve && { color: COLORS.textMuted }]} numberOfLines={label.includes(' ') ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1}>
                      {label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {!catRolou && (
            <View style={styles.categoriaMais} pointerEvents="none">
              <Feather name="chevron-right" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
        {/* ACONTECIMENTO RÁPIDO — pílula "Hoje · 14h · ..." (abre /secao/hoje) */}
        {MOSTRAR_FAIXA_HOJE && itensHoje.length > 0 && <FaixaHoje itens={itensHoje} onAbrir={(rota) => router.push(rota as any)} />}

        {/* DESTAQUES — um parceiro patrocinado por vez, troca a cada hora.
            Some se não houver parceiro pago com imagem; a oferta só aparece
            com validade (tabela destaque_hora_ofertas, migration 047). */}
        {parceiroHora && (
          <View>
            <Text style={styles.tituloSecaoHome}>{t('home.destaquesTitulo')}</Text>
            <DestaqueHora
              parceiro={parceiroHora}
              inicioDoSlot={inicioDoSlot(slotRodizio, cfgRodizio.intervaloMin).getTime()}
              fimDoSlot={inicioDoSlot(slotRodizio + 1, cfgRodizio.intervaloMin).getTime()}
              tagTexto={t('home.patrocinado')}
              rotulos={{
                rotacionaEm: t('home.rotacionaEm'),
                ativoAgora: t('home.ativoAgora'),
                botao: t(
                  parceiroHora.botao === 'garantir' ? 'home.btnGarantir'
                    : parceiroHora.botao === 'como_chegar' ? 'home.btnComoChegar'
                    : parceiroHora.botao === 'ver_beneficio' ? 'home.btnVerBeneficio'
                    : 'home.btnVerLocal'
                ),
              }}
              onAbrir={() => router.push(`/business/${parceiroHora.id}` as any)}
            />
          </View>
        )}

        {/* 4 CAIXAS LADO A LADO — cada uma abre uma página com os slots
            relacionados (src/app/secao/[tipo].tsx). Na Home fica só o atalho
            com a contagem; as listas completas ficam nas páginas. */}
        <View style={styles.gradeSecoes}>
          {[
            { tipo: 'em-alta', titulo: t('home.tile.emAlta'), icone: 'trending-up', degrade: ['#CC7A0A', '#9A4A0A'] as [string, string], qtd: emAlta.length, rota: '/secao/em-alta' },
            { tipo: 'recomendados', titulo: t('home.tile.recomendados'), icone: 'check-circle', degrade: ['#0DA372', '#0E7490'] as [string, string], qtd: 0, rota: '/experience/Selo%20Dicas%20LGBT%2B' },
            { tipo: 'hoje', titulo: t('home.tile.hoje'), icone: 'zap', degrade: ['#C026A3', '#6D3FD1'] as [string, string], qtd: agendaHoje.length + locaisHoje.length + abertosAgora.length, rota: '/secao/hoje' },
            { tipo: 'semana', titulo: t('home.tile.semana'), icone: 'star', degrade: ['#F2692A', '#C42660'] as [string, string], qtd: destaqueSemana.length, rota: '/secao/semana' },
            { tipo: 'experiencia', titulo: t('home.tile.experiencia'), icone: 'heart', degrade: ['#0A8FD0', '#7048B8'] as [string, string], qtd: EXPERIENCIAS_HOME.length, rota: '/secao/experiencia' },
            ...(servicosPool.length > 0
              ? [{ tipo: 'servicos', titulo: t('home.tile.servicos'), icone: 'briefcase', degrade: ['#0F9F90', '#5558E3'] as [string, string], qtd: servicosPool.length, rota: '/secao/servicos' }]
              : []),
          ].map((b) => (
            <TouchableOpacity
              key={b.tipo}
              style={styles.secaoBoxTouch}
              activeOpacity={0.85}
              onPress={() => router.push(b.rota as any)}
              accessibilityRole="button"
              accessibilityLabel={b.titulo}
            >
              <View style={styles.secaoBox}>
                <FundoCaixaDegrade id={`cx-${b.tipo}`} cores={b.degrade} />
                <Feather name={b.icone as any} size={22} color="#FFFFFF" />
                <Text style={styles.secaoBoxTitulo} numberOfLines={2}>{b.titulo}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* MEMBROS FUNDADORES — logos passando devagar, no pé da Home (reforço do topo).
            Só aparece com 3 ou mais fundadores com imagem. */}
        {fundadoresFaixa.length >= 3 && (
          <View style={styles.secaoBloco}>
            <TouchableOpacity
              style={styles.fundadoresCabecalho}
              activeOpacity={0.8}
              onPress={() => router.push('/experience/Membro%20Fundador' as any)}
              accessibilityRole="button"
              accessibilityLabel={t('banner.fundadorTitulo')}
            >
              <Text style={styles.tituloSecaoHomeInline}>{t('banner.fundadorTitulo')}</Text>
              <Text style={styles.fundadoresVer}>{t('banner.fundadorCta')} →</Text>
            </TouchableOpacity>
            <FaixaPremium itens={fundadoresFaixa} onAbrir={(id) => router.push(`/business/${id}` as any)} />
          </View>
        )}
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
  topoTitulo: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginHorizontal: 16, marginBottom: 8 },
  topoCard: { width: TOPO_TILE, height: 112, borderRadius: 16, backgroundColor: '#1C1B26', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  topoImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  topoPilula: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  topoPilulaTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  topoFaixa: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,11,14,0.72)', paddingHorizontal: 10, paddingVertical: 7 },
  topoNome: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  topoBairro: { fontSize: 10, fontWeight: '600', color: '#D6D3E0', marginTop: 1 },
  slide: { height: 92, borderRadius: 16, padding: 12, justifyContent: 'space-between', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  slideTag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  slideTagTexto: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 0.4 },
  fundadoresCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 10 },
  tituloSecaoHomeInline: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  fundadoresVer: { fontSize: 13, fontWeight: '700', color: COLORS.gold },
  tituloSecaoHome: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginHorizontal: 16, marginBottom: 10 },
  slideNome: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  slideBairro: { fontSize: 12, color: '#E0E0EA', marginTop: 2 },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  pontoAtivo: { width: 18, backgroundColor: COLORS.pink },
  altaBox: { width: 112 },
  emAltaCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  faixaPremiumFundo: { marginBottom: 16, paddingVertical: 14, overflow: 'hidden' },
  avatarAnel: { width: AVATAR_ANEL, height: AVATAR_ANEL, borderRadius: AVATAR_ANEL / 2, borderWidth: 2, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', marginRight: AVATAR_GAP },
  avatarMiolo: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  faixaHoje: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 14, height: 44, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  faixaHojeTexto: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  emAltaTituloBloco: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  emAltaVerTodos: { fontSize: 12, fontWeight: '700', color: COLORS.pink },
  altaFoto: {
    width: 112,
    height: 112,
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
  gradeSecoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 18 },
  secaoBoxTouch: { width: '31.5%' },
  secaoBox: { height: 92, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6 },
  secaoBoxTitulo: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.28)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  recomendadosCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.card },
  recomendadosIcone: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  recomendadosTitulo: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  recomendadosSub: { fontSize: 12, color: 'rgba(255,255,255,0.92)', lineHeight: 16, marginTop: 2 },
  recomendadosCta: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', marginTop: 6 },
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
  secaoBloco: { marginBottom: 18, position: 'relative' },
  // Mesmo padrão de título de seção em todas as telas (igual Eventos): 17/800.
  sectionTituloPadrao: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, paddingHorizontal: 16, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitulo: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sectionSubtitulo: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sectionVerTudo: { fontSize: 12, fontWeight: '600', color: COLORS.pink },

  emptyInlineBox: { marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  emptyInlineText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  categoriaScrollContent: { paddingHorizontal: 16, gap: 4 },
  categoriaHorizontalItem: { alignItems: 'center', width: 56 },
  categoriaCircleDestaque: { borderColor: 'rgba(255,213,79,0.7)', backgroundColor: 'rgba(255,213,79,0.12)' },
  categoriaMais: { position: 'absolute', right: 4, top: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(225,48,108,0.9)', alignItems: 'center', justifyContent: 'center' },
  categoriaCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoriaDisabled: { opacity: 0.5 },
  emBreveBadge: { position: 'absolute', bottom: -4, backgroundColor: COLORS.purple, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  emBreveTexto: { fontSize: 7, fontWeight: '800', color: '#FFF' },
  // Nomes de 2 palavras ("Bares & Vida Noturna") quebram em até 2 linhas.
  // Caixa da legenda com altura de 2 linhas e texto centralizado na vertical: nomes de uma linha
  // (Gastronomia, Cultura) ficam alinhados ao centro dos de duas (Festas & Eventos).
  categoriaLabelBox: { height: 30, marginTop: 8, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  categoriaLabel: { fontSize: 10, lineHeight: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },

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
