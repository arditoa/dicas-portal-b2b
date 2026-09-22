import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/authContext';
import { CATEGORIA_REAL_LABEL, CATEGORIAS, CATEGORIA_ORDER, CategoriaConfig } from '../../lib/categorias';
import {
  compararDestaque,
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

const BANNERS_PRINCIPAIS = [
  {
    id: 'b1',
    tag: 'MEMBRO FUNDADOR',
    titulo: 'Conheça os selos oficiais',
    sub: 'Locais que constroem nossa comunidade desde o início',
    cor: '#FFD54F',
    route: '/experience/Membro%20Fundador',
  },
  {
    // Rodada 56 (3ª rodada de ajuste) — Andrea pediu pra trocar esse
    // banner: "Selo Dicas" sobe pro topo, ao lado de "Membro Fundador"
    // (mesmo padrão dos dois: um selo/conquista, não um plano pago —
    // abre uma tela dedicada em /experience/[tag].tsx, sem CTA de venda
    // pro Selo Dicas, ver comentário lá). "Destaque da Semana" desceu
    // pro lugar que era do carrossel "Selo Dicas LGBT+" (ver seção
    // abaixo de Categorias).
    id: 'b2',
    tag: 'SELO DICAS LGBT+',
    titulo: 'Conheça o Selo Dicas',
    sub: 'Curadoria editorial nossa — nunca é espaço pago',
    cor: '#E1306C',
    route: '/experience/Selo%20Dicas%20LGBT%2B',
  },
  {
    id: 'b3',
    tag: 'CUPONS EXCLUSIVOS',
    titulo: 'Economize nos seus Rolês',
    sub: 'Crie sua conta e garanta seus cupons com os parceiros',
    cor: '#7E57C2',
    route: '/(tabs)/profile',
  },
  {
    id: 'b4',
    tag: 'SEJA UM PARCEIRO',
    titulo: 'Cadastre seu Estabelecimento',
    sub: 'Divulgue seu espaço para a nossa comunidade',
    cor: '#4CAF7D',
    route: '/(tabs)/profile',
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

  const [busca, setBusca] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const [emAlta, setEmAlta] = useState<LocalCard[]>([]);
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
            'id, nome, categoria, bairro, bairro_exibicao, cidade, instagram, foto_capa_url, galeria_fotos, rating_media, rating_total, plano_destaque, destaque_secao_fixada, destaque_secoes, destaque_ate, plano_comercial, plano_comercial_status'
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
          .select('locais!inner(id, nome, foto_capa_url, logo_url, status)')
          .ilike('rotulo', '%fundador%')
          .eq('ativo', true)
          .eq('locais.status', 'aprovado')
          .limit(12),
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
      setEmAlta(listaEmAlta.slice(0, 8));

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
      setDestaqueSemana(listaDestaqueSemana.slice(0, 8));

      // Rodada 56 (4ª rodada) — logos pro banner "Membro Fundador" (mesmo
      // formato de linha aninhada de experience/[tag].tsx: local_badges
      // trazendo locais!inner, precisa "desembrulhar" .locais de cada row).
      const listaFundadorLogos = (((fundadorRes.data as any) || []) as { locais: any }[])
        .map((row) => row.locais)
        .filter(Boolean) as { id: string; nome: string; foto_capa_url: string | null; logo_url: string | null }[];
      setFundadorLogos(listaFundadorLogos);
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
    if (cat.emBreve) return;

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
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerEsquerda}>
          <Image
            source={require('../../assets/images/logolinear-semfundo.png')}
            style={styles.logoLinear}
            resizeMode="contain"
          />
          <Text style={styles.appSubtitulo}>Conexões e Experiências LGBT+</Text>
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
        {/* BUSCA */}
        <View style={styles.buscaContainer}>
          <Feather name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={handleBuscar}
            returnKeyType="search"
            placeholder="Buscar por nome, bairro ou local (ex: São Paulo)..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.buscaInput}
          />
        </View>

        {/* BANNERS PRINCIPAIS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bannerScrollView}
          contentContainerStyle={styles.bannerScrollContent}
          decelerationRate="fast"
          snapToInterval={332}
          snapToAlignment="start"
        >
          {BANNERS_PRINCIPAIS.map((b) => {
            // Rodada 56 (4ª rodada) — Andrea pediu pra "reduzir as imagens e
            // deixar talvez o logo dos locais" no banner "Membro Fundador",
            // clicando num logo abrindo direto as informações do local
            // ("assim ficam os logos dos locais aparente"). Só o card b1
            // (Membro Fundador) ganha essa fileira de avatares pequenos —
            // o b2 (Selo Dicas) continua igual. Se ainda não existe nenhum
            // local com o selo fundador (fundadorLogos vazio), cai no
            // banner estático de sempre — fallback pra não mostrar um card
            // quebrado/vazio antes de existir conteúdo real.
            const ehBannerFundador = b.id === 'b1';
            const mostrarLogos = ehBannerFundador && fundadorLogos.length > 0;
            const LOGOS_VISIVEIS = 6;
            // Rodada 57 — "arte especial" do banner Membro Fundador, que a
            // própria Andrea vai criar e subir pelo /admin (ver
            // bannerFundadorArteUrl acima). Só troca o VISUAL de fundo —
            // tag/título/subtítulo/logos continuam os mesmos por cima,
            // com um escurecido (mesmo padrão dos cards de foto de Em
            // Alta/Destaque da Semana) pra manter o texto branco legível
            // em qualquer arte. Sem arte enviada, cai no card de sempre
            // (cor sólida, sem imagem) — não é preciso esperar nada.
            const temArteFundador = ehBannerFundador && !!bannerFundadorArteUrl;
            const BannerContainer = temArteFundador ? ImageBackground : View;
            const bannerContainerProps = temArteFundador
              ? { source: { uri: bannerFundadorArteUrl! }, imageStyle: { borderRadius: 16 }, resizeMode: 'cover' as const }
              : {};
            return (
              <TouchableOpacity
                key={b.id}
                activeOpacity={0.85}
                onPress={() => router.push(b.route as any)}
              >
                <BannerContainer style={styles.bannerCard} {...bannerContainerProps}>
                {temArteFundador && (
                  <>
                    <View style={styles.emAltaOverlayTop} />
                    <View style={styles.emAltaOverlayBottom} />
                  </>
                )}
                <View style={[styles.bannerTag, { backgroundColor: b.cor }]}>
                  <Text style={styles.bannerTagText}>{b.tag}</Text>
                </View>
                <Text style={styles.bannerTitle}>{b.titulo}</Text>
                <Text style={styles.bannerSub}>{b.sub}</Text>

                {mostrarLogos && (
                  <View style={styles.bannerLogosRow}>
                    {fundadorLogos.slice(0, LOGOS_VISIVEIS).map((loc) => {
                      // Rodada 57 — agora prioriza o logo de verdade
                      // (logo_url, upload dedicado no portal/admin) e só
                      // cai pra foto de capa quando o local ainda não subiu
                      // um logo próprio.
                      const avatarUrl = loc.logo_url || loc.foto_capa_url;
                      return (
                        <TouchableOpacity
                          key={loc.id}
                          style={styles.bannerLogoAvatar}
                          activeOpacity={0.8}
                          onPress={() => router.push(`/business/${loc.id}` as any)}
                        >
                          {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.bannerLogoImg} />
                          ) : (
                            <View style={[styles.bannerLogoImg, styles.bannerLogoImgVazio]}>
                              <Feather name="award" size={12} color={COLORS.gold} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    {fundadorLogos.length > LOGOS_VISIVEIS && (
                      <View style={styles.bannerLogoMais}>
                        <Text style={styles.bannerLogoMaisTexto}>+{fundadorLogos.length - LOGOS_VISIVEIS}</Text>
                      </View>
                    )}
                  </View>
                )}
                </BannerContainer>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CATEGORIAS */}
        <View style={styles.secaoBloco}>
          <Text style={styles.sectionTituloPadrao}>Categorias</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriaScrollContent}>
            {CATEGORIA_ORDER.map((slug) => {
              const cat = CATEGORIAS[slug];
              return (
                <TouchableOpacity
                  key={slug}
                  style={styles.categoriaHorizontalItem}
                  onPress={() => handleCategoryPress(cat)}
                  activeOpacity={cat.emBreve ? 1 : 0.7}
                >
                  <View style={[styles.categoriaCircle, cat.emBreve && styles.categoriaDisabled]}>
                    <Feather name={cat.icon as any} size={22} color={cat.emBreve ? COLORS.purple : cat.color} />
                    {cat.emBreve && (
                      <View style={styles.emBreveBadge}>
                        <Text style={styles.emBreveTexto}>Em breve</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.categoriaLabel, cat.emBreve && { color: COLORS.textMuted }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* DESTAQUE DA SEMANA — Rodada 56 (3ª rodada de ajuste): aqui era o
            carrossel "Selo Dicas LGBT+" (Rodada 47). Andrea pediu pra
            trocar os dois de lugar — Selo Dicas virou banner no topo (ao
            lado de Membro Fundador) e "Destaque da Semana" ocupou este
            espaço, ANTES de "Em Alta". Usa o dourado (mesma cor do selo
            "DESTAQUE" que já aparece nos cards de Em Alta — deveExibirGlow,
            é literalmente o mesmo critério).
            Rodada 56 (4ª rodada) — cards em pé (retrato), do mesmo tamanho
            de "Em Alta" logo abaixo, ficavam estranhos um em cima do outro
            (mesma pessoa/mesmo selo "DESTAQUE" duas vezes, em dois formatos
            diferentes). Andrea sugeriu deixar "mais retangular e ir
            passando pro lado" — trocado pra cards DEITADOS (paisagem, tipo
            fita horizontal), formato bem diferente de Em Alta de propósito,
            pra não parecer repetição do mesmo carrossel duas vezes. */}
        {destaqueSemana.length > 0 && (
          <View style={styles.secaoBloco}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="star" size={16} color={COLORS.amber} />
                <Text style={styles.sectionTitulo}>Destaque da Semana</Text>
              </View>
            </View>
            <Text style={styles.seloDicasSubtitulo}>Espaços em evidência essa semana.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
              {destaqueSemana.map((item) => {
                const isFavorited = favoritos.includes(item.id);
                const fotoUrl = fotoDestaqueUrl(item);
                // Rodada 56c — mesma troca de <Image absoluteFillObject> por
                // <ImageBackground> do card Em Alta (ver comentário lá).
                // Aqui a altura já é FIXA (destaqueSemanaCard: height), sem
                // o risco de dependência circular do Yoga/Flexbox — ainda
                // assim mantido o mesmo componente por consistência.
                const CardContainer = fotoUrl ? ImageBackground : View;
                const cardContainerProps = fotoUrl
                  ? { source: { uri: fotoUrl }, imageStyle: { borderRadius: 14 }, resizeMode: 'cover' as const }
                  : {};
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(`/business/${item.id}` as any)}
                    activeOpacity={0.88}
                  >
                    <CardContainer style={[styles.destaqueSemanaCard, styles.destaqueSemanaCardDestacado]} {...cardContainerProps}>
                      {fotoUrl && (
                        <>
                          <View style={styles.emAltaOverlayTop} />
                          <View style={styles.emAltaOverlayBottom} />
                        </>
                      )}
                      <View style={styles.emAltaHeaderRow}>
                        <View style={styles.destaqueSemanaBadge}>
                          <Feather name="star" size={9} color="#000" />
                          <Text style={styles.emAltaDestaqueBadgeText}>DESTAQUE</Text>
                        </View>
                        {/* Rodada 57 (2ª rodada) — Andrea: "colocar fundo no
                            coração". Diferente do Em Alta (emAltaFavBtn já
                            tinha fundo circular escuro), este coração aqui
                            ficava solto, sem nenhum fundo — some em cima de
                            foto clara. Reaproveita o mesmo estilo do Em
                            Alta pra ficar consistente. */}
                        <TouchableOpacity
                          style={styles.emAltaFavBtn}
                          onPress={() => handleToggleFavorito(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="heart" size={14} color={isFavorited ? COLORS.pink : '#FFFFFF'} />
                        </TouchableOpacity>
                      </View>

                      <View>
                        <Text style={styles.emAltaTitle} numberOfLines={1}>{item.nome}</Text>
                        <Text style={styles.emAltaMeta} numberOfLines={1}>
                          {bairroExibicao(item)} • ★ {item.rating_total > 0 ? item.rating_media.toFixed(1) : '—'}
                        </Text>
                      </View>
                    </CardContainer>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* EM ALTA */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="trending-up" size={16} color={COLORS.gold} />
              <Text style={styles.sectionTitulo}>Em Alta</Text>
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/category/todos' as any, params: { title: encodeURIComponent('Em Alta') } })}>
              <Text style={styles.sectionVerTudo}>Ver mais</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.pink} style={{ marginLeft: 16 }} />
          ) : emAlta.length === 0 ? (
            <View style={styles.emptyInlineBox}>
              <Text style={styles.emptyInlineText}>
                Ainda não há locais aprovados. Assim que os primeiros cadastros forem aprovados
                pelo portal, eles aparecem aqui.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
              {emAlta.map((item) => {
                const isFavorited = favoritos.includes(item.id);
                // Rodada 43 — pedido da Andrea: locais que não são
                // freemium (pagam premium/fundador, ou ela marcou
                // manualmente "destaque" no /admin) ganham uma borda
                // brilhante + o logo/foto do local em destaque no card.
                const destacado = deveExibirGlow(item);
                const fotoUrl = fotoDestaqueUrl(item);
                // Rodada 56c — mesma troca de <Image absoluteFillObject> por
                // <ImageBackground> do card Selo Dicas acima (ver comentário lá).
                const CardContainer = fotoUrl ? ImageBackground : View;
                // Rodada 56 (4ª rodada) — só arredonda os cantos DE CIMA da
                // foto (borderTopLeftRadius/borderTopRightRadius) porque
                // agora ela só ocupa a metade de cima do card (ver
                // emAltaCardFotoWrap) — cantos de baixo ficam retos, encaixando
                // com o bloco de conteúdo (fundo sólido) logo abaixo.
                const cardContainerProps = fotoUrl
                  ? { source: { uri: fotoUrl }, imageStyle: { borderTopLeftRadius: 16, borderTopRightRadius: 16 }, resizeMode: 'cover' as const }
                  : {};
                // Rodada 56 (4ª rodada) — Andrea pediu pra "deixar a foto na
                // metade, e aonde escrevemos o Instagram e bairro, deixar com
                // fundo para aparecer melhor": card deixa de ser foto de
                // fundo full-bleed (com gradiente por cima do texto) e passa
                // a ter duas metades bem separadas — foto fixa em cima
                // (emAltaCardFotoWrap) e um bloco com fundo sólido embaixo
                // (emAltaCardConteudo) pra nome/bairro/Instagram ficarem
                // sempre legíveis, com qualquer foto. emAltaOverlayTop/Bottom
                // (gradiente escurecido) não são mais usados aqui — seguem em
                // uso no card de "Destaque da Semana" acima, que continua
                // full-bleed.
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(`/business/${item.id}` as any)}
                    activeOpacity={0.88}
                  >
                    <View style={[styles.emAltaCard, destacado && styles.emAltaCardDestacado]}>
                      <CardContainer style={styles.emAltaCardFotoWrap} {...cardContainerProps}>
                        <View style={styles.emAltaHeaderRow}>
                          <View style={styles.emAltaHeaderLeftRow}>
                            {/* Rodada 56 (2ª rodada de ajuste) — Andrea pediu pra
                                tirar o avatar/logo circular do card "Em Alta"
                                ("tirar o logo do em alta né?"). emAltaLogoAvatar
                                fica sem uso — deixado no styles por segurança,
                                não removido pra não arriscar quebrar outra
                                referência não vista. */}
                            <View style={styles.emAltaCategoryBadge}>
                              <Text style={styles.emAltaCategoryText}>{CATEGORIA_REAL_LABEL[item.categoria] || item.categoria}</Text>
                            </View>
                            {/* Rodada 46 — selo "Patrocinado" (destaque_secoes,
                                migration 026): monetização avulsa por local,
                                independente do plano comercial. */}
                            {estaFixadoEm(item, 'patrocinado') && (
                              <View style={styles.patrocinadoBadge}>
                                <Text style={styles.patrocinadoBadgeText}>Patrocinado</Text>
                              </View>
                            )}
                          </View>
                          <TouchableOpacity
                            style={styles.emAltaFavBtn}
                            onPress={() => handleToggleFavorito(item.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="heart" size={14} color={isFavorited ? COLORS.pink : '#FFFFFF'} />
                          </TouchableOpacity>
                        </View>
                      </CardContainer>

                      <View style={styles.emAltaCardConteudo}>
                        {destacado && (
                          <View style={styles.emAltaDestaqueBadge}>
                            <Feather name="star" size={9} color="#000" />
                            <Text style={styles.emAltaDestaqueBadgeText}>DESTAQUE</Text>
                          </View>
                        )}

                        <Text style={styles.emAltaTitle} numberOfLines={1}>{item.nome}</Text>
                        <Text style={styles.emAltaMeta} numberOfLines={1}>
                          {bairroExibicao(item)} • ★ {item.rating_total > 0 ? item.rating_media.toFixed(1) : '—'}
                        </Text>

                        <View style={styles.emAltaFooterRow}>
                          {item.instagram ? (
                            <TouchableOpacity
                              style={styles.instaBtn}
                              onPress={() => handleOpenInstagram(item.instagram!)}
                              activeOpacity={0.8}
                            >
                              <Feather name="instagram" size={12} color={COLORS.pink} />
                              <Text style={styles.instaBtnText} numberOfLines={1}>@{item.instagram.replace(/^@/, '')}</Text>
                            </TouchableOpacity>
                          ) : (
                            <View />
                          )}
                          <Feather name="chevron-right" size={16} color={COLORS.safeSpace} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* O QUE FAZER HOJE */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitulo}>O que fazer hoje</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.sectionVerTudo}>Ver agenda</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.pink} style={{ marginLeft: 16 }} />
          ) : agendaHoje.length === 0 && locaisHoje.length === 0 ? (
            <View style={styles.emptyInlineBox}>
              <Text style={styles.emptyInlineText}>Nenhum evento aprovado pra hoje ainda.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
              {agendaHoje.map((item) => (
                <TouchableOpacity
                  key={`evento-${item.id}`}
                  style={styles.agendaCard}
                  onPress={() => router.push('/(tabs)/events')}
                  activeOpacity={0.85}
                >
                  <View style={styles.agendaImageArea}>
                    <Feather name="calendar" size={24} color={COLORS.pink} />
                  </View>
                  <View style={styles.agendaContent}>
                    <Text style={styles.agendaHorario}>
                      {new Date(item.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {(item.locais && (item.locais.bairro_exibicao || item.locais.bairro)) || 'Local a confirmar'}
                    </Text>
                    <Text style={styles.agendaTitulo}>{item.titulo}</Text>
                    <Text style={styles.agendaDiferencial}>{item.locais?.nome || ''}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {/* Rodada 44 — locais fixados manualmente em "hoje" pelo
                  /admin, sem precisar de um evento cadastrado. */}
              {locaisHoje.map((item) => (
                <TouchableOpacity
                  key={`local-${item.id}`}
                  style={styles.agendaCard}
                  onPress={() => router.push(`/business/${item.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.agendaImageArea}>
                    {fotoDestaqueUrl(item) ? (
                      <Image source={{ uri: fotoDestaqueUrl(item)! }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    ) : (
                      <Feather name="map-pin" size={24} color={COLORS.pink} />
                    )}
                  </View>
                  <View style={styles.agendaContent}>
                    <Text style={styles.agendaHorario}>
                      {CATEGORIA_REAL_LABEL[item.categoria] || item.categoria} • {bairroExibicao(item)}
                    </Text>
                    <Text style={styles.agendaTitulo}>{item.nome}</Text>
                    <Text style={styles.agendaDiferencial}>Aberto hoje</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* DICAS TRIP */}
        <View style={styles.secaoBloco}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitulo}>Dicas Trip</Text>
              <Text style={styles.sectionSubtitulo}>Destinos, hospedagens e roteiros LGBT+</Text>
            </View>
            <TouchableOpacity onPress={() => handleCategoryPress(CATEGORIAS.turismo)}>
              <Text style={styles.sectionVerTudo}>Ver catálogo</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.pink} style={{ marginLeft: 16 }} />
          ) : dicasTrip.length === 0 ? (
            <View style={styles.emptyInlineBox}>
              <Text style={styles.emptyInlineText}>Ainda não há dicas de turismo aprovadas.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselPadding}>
              {dicasTrip.map((item) => {
                const isFavorited = favoritos.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.turismoPropagandaCard}
                    onPress={() => router.push(`/business/${item.id}` as any)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.turismoHeaderRow}>
                      <Text style={styles.turismoCategoryBadge}>{item.subcategoria || 'Turismo'}</Text>
                      <View style={styles.cardHeaderRightRow}>
                        {item.plano_destaque !== 'basico' && (
                          <View style={styles.turismoPromoBadge}>
                            <Text style={styles.turismoPromoText}>DESTAQUE</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={{ marginLeft: 6 }}
                          onPress={() => handleToggleFavorito(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="heart" size={16} color={isFavorited ? COLORS.pink : COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.turismoTitle}>{item.nome}</Text>
                    <Text style={styles.turismoDesc} numberOfLines={2}>
                      {item.descricao || 'Sem descrição cadastrada ainda.'}
                    </Text>

                    <View style={styles.turismoFooterRow}>
                      <Text style={styles.turismoBtnText}>Ver detalhes do local</Text>
                      <Feather name="arrow-right" size={14} color={COLORS.safeSpace} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ESCOLHA PELA EXPERIÊNCIA */}
        <View style={styles.secaoBloco}>
          <Text style={styles.sectionTituloPadrao}>Escolha pela experiência</Text>
          <View style={styles.experienciasGrid}>
            {EXPERIENCIAS_REAIS.map((exp) => (
              <TouchableOpacity
                key={exp.slug}
                style={styles.expChip}
                onPress={() => openExperienceScreen(exp)}
                activeOpacity={0.8}
              >
                <Text style={styles.expChipText}>{exp.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CARD CARNAVAL 2027 */}
        <View style={styles.carnavalCard}>
          <View style={styles.carnavalBadge}>
            <Text style={styles.carnavalBadgeText}>EM BREVE</Text>
          </View>
          <Text style={styles.carnavalTitle}>Carnaval LGBT+ 2027</Text>
          <Text style={styles.carnavalSub}>Guias, agenda de blocos e ativação oficial de notificações.</Text>
          <TouchableOpacity
            style={styles.carnavalBtn}
            onPress={() => Alert.alert('Notificações', 'Você receberá as novidades do Carnaval 2027!')}
          >
            <Text style={styles.carnavalBtnText}>Quero receber novidades</Text>
          </TouchableOpacity>
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
    marginBottom: 16,
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
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buscaInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },

  bannerScrollView: { marginBottom: 24 },
  bannerScrollContent: { paddingLeft: 16, paddingRight: 4 },
  bannerCard: {
    width: 320,
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
  bannerTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  bannerTagText: { fontSize: 10, fontWeight: '800', color: '#000' },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  bannerSub: { fontSize: 12, color: COLORS.textSecondary },
  // Rodada 56 (4ª rodada) — fileira de logos dos locais com selo "Membro
  // Fundador" dentro do banner (ver fundadorLogos/mostrarLogos no JSX).
  // Avatares pequenos de propósito ("reduzir as imagens", pedido da
  // Andrea) — bem diferente dos cards grandes de Em Alta/Destaque.
  bannerLogosRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
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

  secaoBloco: { marginBottom: 24 },
  sectionTituloPadrao: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: 16, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitulo: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sectionSubtitulo: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sectionVerTudo: { fontSize: 12, fontWeight: '600', color: COLORS.pink },

  emptyInlineBox: { marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  emptyInlineText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  categoriaScrollContent: { paddingHorizontal: 16, gap: 12 },
  categoriaHorizontalItem: { alignItems: 'center', width: 84 },
  categoriaCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoriaDisabled: { opacity: 0.5 },
  emBreveBadge: { position: 'absolute', bottom: -4, backgroundColor: COLORS.purple, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  emBreveTexto: { fontSize: 6, fontWeight: '800', color: '#FFF' },
  categoriaLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },

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
  emAltaTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  emAltaMeta: { fontSize: 11, color: COLORS.textSecondary },
  emAltaFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  instaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#232230', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  instaBtnText: { fontSize: 10, color: COLORS.textPrimary, fontWeight: '600' },

  agendaCard: { width: 170, borderRadius: 14, backgroundColor: COLORS.card, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  agendaImageArea: { height: 80, backgroundColor: '#1A1926', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  agendaContent: { padding: 10 },
  agendaHorario: { fontSize: 11, fontWeight: '700', color: COLORS.pink, marginBottom: 2 },
  agendaTitulo: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  agendaDiferencial: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  turismoPropagandaCard: {
    width: 230,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
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
  turismoTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  turismoDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15 },
  turismoFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  turismoBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.safeSpace },

  experienciasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  expChip: { backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  expChipText: { fontSize: 12, fontWeight: '600', color: COLORS.purple },

  carnavalCard: { marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  carnavalBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(126, 87, 194, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  carnavalBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.purple },
  carnavalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  carnavalSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  carnavalBtn: { height: 40, backgroundColor: COLORS.purple, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  carnavalBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
