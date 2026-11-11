import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../lib/authContext';
import { registrarCliqueInstagram, registrarVisualizacaoPerfil } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';
import { CLASSIFICACOES_LGBT } from '../../lib/classificacaoLgbt';
import HospedagemDetalhes from '../../components/HospedagemDetalhes';
import { useRastrearTela } from '../../lib/usoTelas';
import { dentroDaJanela, textoJanela } from '../../lib/janelaCupom';

// Precisam bater com o enum public.categoria_tipo real (só 6 valores —
// a taxonomia de 10 categorias desenhada nas Rodadas 1-8 nunca chegou a
// ser migrada pro banco real, ver `investigacao-tecnica-app.md`/Rodada 12).
const CATEGORIA_LABEL: Record<string, string> = {
  lugares: 'Bares',
  gastronomia: 'Gastronomia',
  cultura: 'Cultura & Lazer',
  eventos: 'Festas & Eventos',
  turismo: 'Turismo',
  servicos: 'Serviços Inclusivos',
};

const BADGE_COLORS: Record<string, string> = {
  dourado: '#FFD54F',
  verde: '#4CAF7D',
  rosa: '#E1306C',
};


// Rodada 123 — "aberto agora" a partir do horário_funcionamento do local.
// Aceita virada de noite (ex.: abre 22:00, fecha 04:00) e olha também o
// expediente de ontem que ainda esteja em andamento depois da meia-noite.
const CHAVES_POR_DIA_JS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function minutosDe(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):?(\d{2})?/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2] || 0);
}

function statusAgora(horario: any): { aberto: boolean; texto: string } | null {
  if (!horario) return null;
  const agora = new Date();
  const hoje = CHAVES_POR_DIA_JS[agora.getDay()];
  const ontem = CHAVES_POR_DIA_JS[(agora.getDay() + 6) % 7];
  const min = agora.getHours() * 60 + agora.getMinutes();
  const h = horario[hoje];
  const o = horario[ontem];

  // expediente de ontem que atravessa a meia-noite e ainda não acabou
  if (o?.aberto) {
    const ab = minutosDe(o.abre);
    const fe = minutosDe(o.fecha);
    if (ab !== null && fe !== null && fe < ab && min < fe) {
      return { aberto: true, texto: `Aberto agora • fecha às ${o.fecha}` };
    }
  }
  if (h?.aberto) {
    const ab = minutosDe(h.abre);
    const fe = minutosDe(h.fecha);
    if (ab === null || fe === null) return { aberto: true, texto: 'Aberto hoje' };
    const noite = fe < ab;
    const dentro = noite ? min >= ab : min >= ab && min < fe;
    if (dentro) return { aberto: true, texto: `Aberto agora • fecha às ${h.fecha}` };
    if (min < ab) return { aberto: false, texto: `Fechado agora • abre às ${h.abre}` };
  }
  return { aberto: false, texto: 'Fechado agora' };
}

const DIAS_CURTOS = /^\s*(seg(unda)?|ter(ça|ca)?|qua(rta)?|qui(nta)?|sex(ta)?|s[áa]b(ado)?|dom(ingo)?)\b/i;

function SecaoTitulo({ icone, titulo, direita }: { icone: any; titulo: string; direita?: React.ReactNode }) {
  return (
    <View style={styles.secaoHeader}>
      <View style={styles.secaoIcone}>
        <Feather name={icone} size={14} color="#E1306C" />
      </View>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      <View style={{ flex: 1 }} />
      {direita}
    </View>
  );
}

function LinhaProgramacao({ linha }: { linha: string }) {
  const m = /^(.{2,22}?)\s*[:\-–—]\s*(.+)$/.exec(linha);
  if (m && DIAS_CURTOS.test(m[1])) {
    return (
      <View style={styles.progLinha}>
        <Text style={styles.progDia}>{m[1].trim()}</Text>
        <Text style={styles.progTexto}>{m[2].trim()}</Text>
      </View>
    );
  }
  return (
    <View style={styles.progLinha}>
      <Text style={styles.progTexto}>{linha}</Text>
    </View>
  );
}

// Mesmas chaves/ordem do portal (src/lib/horarios.ts) — nunca renomear
// sem migrar os dados já salvos em locais.horario_funcionamento.
const DIAS_SEMANA: { chave: string; label: string }[] = [
  { chave: 'segunda', label: 'Segunda' },
  { chave: 'terca', label: 'Terça' },
  { chave: 'quarta', label: 'Quarta' },
  { chave: 'quinta', label: 'Quinta' },
  { chave: 'sexta', label: 'Sexta' },
  { chave: 'sabado', label: 'Sábado' },
  { chave: 'domingo', label: 'Domingo' },
];

// Rodada 38 — a Andrea decidiu inverter a lógica antiga: agora QUALQUER
// plano pode preencher tags de experiência, galeria e vídeo no portal
// (dashboard/perfil), pra chegar com o cadastro completo desde o início.
// O que continua exclusivo de quem paga é aparecer AQUI pro usuário
// final — só locais Premium/Fundador com plano_comercial_status='ativo'
// mostram esses 3 campos; espelha `publicaRecursosNoApp` do portal
// (dashboard/perfil/page.tsx). Horário de funcionamento e as fotos
// básicas (foto_capa_url) continuam sempre visíveis pra todo mundo —
// nunca foram parte do que os planos pagos vendem.
function publicaRecursosPremium(local: Pick<LocalRow, 'plano_comercial' | 'plano_comercial_status'>): boolean {
  if (local.plano_comercial_status !== 'ativo') return false;
  return local.plano_comercial === 'premium' || local.plano_comercial === 'fundador';
}

interface LocalRow {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  descricao: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string;
  lat: number | null;
  lng: number | null;
  instagram: string | null;
  foto_capa_url: string | null;
  logo_url: string | null;
  safe_space: boolean;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  rating_media: number;
  rating_total: number;
  horario_funcionamento: Record<string, { aberto: boolean; abre?: string; fecha?: string; musica_ao_vivo?: string }> | null;
  galeria_fotos: string[] | null;
  video_url: string | null;
  programacao_texto: string | null;
  programacao_imagem_url: string | null;
  tags: string[] | null;
  plano_comercial: string;
  plano_comercial_status: string;
  classificacao_lgbt: string | null;
}

// Rodada 126 — a programação da semana dos bares NÃO aparece mais no perfil:
// ela vive só na aba Eventos > "Essa semana" (public.agenda_semanal, migration 073).

interface LocalBadge {
  id: string;
  rotulo: string;
  cor_tag: 'dourado' | 'verde' | 'rosa';
}

interface Avaliacao {
  id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  user_id: string | null;
  perfis_publicos: { display_name: string; avatar_url: string | null } | null;
}

// Rodada 59 (parte 8) — bug real reportado pela Andrea: ativou um cupom
// "entrada gratis" pro Vezpa Bar no portal (tabela cupons já tinha o
// registro certinho) e ele nunca apareceu em lugar nenhum do app. Causa:
// o fluxo de resgate (check-in no local -> código de 5 min -> a casa
// valida no portal) foi desenhado no banco na migration 010, mas nunca
// foi construído em NENHUMA tela — nem aqui, nem no portal. Esta seção
// cobre o lado do app: mostrar o cupom ativo e deixar o usuário fazer o
// check-in que gera o código.
interface CupomLocal {
  id: string;
  titulo: string;
  descricao: string | null;
  // Migration 078: dias (0=dom..6=sáb) e horário em que o cupom vale; null = sempre.
  dias_semana?: number[] | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
}

// Rodada 127 — cartão fidelidade da casa (migration 074): "a cada N visitas no mês, ganhe X".
interface ProgressoFidelidade {
  programa_id: string;
  nome: string | null;
  descricao: string | null;
  visitas_necessarias: number;
  recompensa: string;
  janela: 'mes' | 'sempre';
  visitas: number;
  ja_ganhou: boolean;
  // Migration 081: visitas sem teto e nível VIP opcional da casa.
  visitas_periodo?: number;
  visitas_total?: number;
  visitas_vip?: number | null;
  beneficio_vip?: string | null;
}

interface CheckinAtivo {
  id: string;
  codigo: string;
  expira_em: string;
  cupom_id: string | null;
  // Migration 079: confirmado pela localização (gps), pela casa (codigo) ou no fim da noite (automatico).
  validado_em?: string | null;
  metodo_validacao?: string | null;
  created_at?: string | null;
}

export default function BusinessDetailScreen() {
  useRastrearTela('perfil_local', { localParam: 'id' });
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<LocalRow | null>(null);
  const [badges, setBadges] = useState<LocalBadge[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [minhaAvaliacao, setMinhaAvaliacao] = useState<Avaliacao | null>(null);
  const [isFavorito, setIsFavorito] = useState(false);
  const [favoritoLoading, setFavoritoLoading] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [notaEscolhida, setNotaEscolhida] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviandoReview, setEnviandoReview] = useState(false);

  const [cupons, setCupons] = useState<CupomLocal[]>([]);
  const [meuCheckin, setMeuCheckin] = useState<CheckinAtivo | null>(null);
  const [fazendoCheckin, setFazendoCheckin] = useState(false);
  const [fidelidade, setFidelidade] = useState<ProgressoFidelidade[]>([]);

  const carregarDados = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const agora = new Date().toISOString();
      const [localRes, badgesRes, avaliacoesRes, cuponsRes] = await Promise.all([
        supabase
          .from('locais')
          .select(
            'id, nome, categoria, subcategoria, descricao, endereco, bairro, cidade, lat, lng, instagram, foto_capa_url, logo_url, safe_space, plano_destaque, rating_media, rating_total, horario_funcionamento, galeria_fotos, video_url, programacao_texto, programacao_imagem_url, tags, plano_comercial, plano_comercial_status, classificacao_lgbt'
          )
          .eq('id', id)
          .single(),
        supabase
          .from('local_badges')
          .select('id, rotulo, cor_tag')
          .eq('local_id', id)
          .eq('ativo', true),
        supabase
          .from('avaliacoes')
          .select('id, nota, comentario, created_at, user_id, perfis_publicos(display_name, avatar_url)')
          .eq('local_id', id)
          .order('created_at', { ascending: false })
          .limit(5),
        // Rodada 59 (parte 8) — cupons ativos deste local (ver interface
        // CupomLocal acima). valido_de/valido_ate são opcionais — só
        // filtra quando preenchidos.
        supabase
          .from('cupons')
          .select('id, titulo, descricao, valido_de, valido_ate, dias_semana, hora_inicio, hora_fim')
          .eq('local_id', id)
          .eq('ativo', true)
          .or(`valido_de.is.null,valido_de.lte.${agora}`)
          .or(`valido_ate.is.null,valido_ate.gte.${agora}`),
      ]);

      if (localRes.error) throw localRes.error;
      setLocal(localRes.data as unknown as LocalRow);
      // ANALYTICS: 1 visualização por local/dispositivo/dia (dedupe em
      // registrarVisualizacaoPerfil) — alimenta o dashboard do parceiro.
      registrarVisualizacaoPerfil((localRes.data as unknown as LocalRow).id);
      setBadges((badgesRes.data as any) || []);
      setAvaliacoes((avaliacoesRes.data as any) || []);
      setCupons((cuponsRes.data as any) || []);
      // Fim de noite (migration 079): check-ins que a casa não confirmou entram sozinhos às 6h. Falha silenciosa.
      if (user?.id) {
        try { await supabase.rpc('confirmar_checkins_pendentes'); } catch {}
      }
      // Cartão fidelidade (só vem se a casa ligou "mostrar no app"). Sem a migration 074, segue sem o cartão.
      const fidRes = await supabase.rpc('progresso_fidelidade_local', { p_local_id: id });
      setFidelidade(fidRes.error ? [] : ((fidRes.data as any) || []));

      if (user?.id) {
        const [favRes, minhaRes, checkinRes] = await Promise.all([
          supabase
            .from('favoritos_locais')
            .select('local_id')
            .eq('local_id', id)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('avaliacoes')
            .select('id, nota, comentario, created_at, user_id')
            .eq('local_id', id)
            .eq('user_id', user.id)
            .maybeSingle(),
          // Rodada 59 (parte 8) — check-in pendente do usuário pra este
          // local (ainda não validado nem cancelado), pra mostrar o
          // código de novo se ele saiu da tela e voltou antes de usar.
          supabase
            .from('checkins')
            .select('id, codigo, expira_em, cupom_id, validado_em, metodo_validacao, created_at')
            .eq('local_id', id)
            .eq('user_id', user.id)
            .gte('created_at', new Date(Date.now() - 12 * 3600 * 1000).toISOString())
            .is('cancelado_em', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        setIsFavorito(!!favRes.data);
        setMinhaAvaliacao((minhaRes.data as any) || null);
        setMeuCheckin((checkinRes.data as any) || null);
      } else {
        setIsFavorito(false);
        setMinhaAvaliacao(null);
        setMeuCheckin(null);
      }
    } catch (err) {
      console.error('Erro ao carregar local:', err);
      setLocal(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const exigirLogin = (mensagem: string) => {
    Alert.alert('Acesso Restrito', mensagem, [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Entrar / Criar Conta', onPress: () => router.push('/(tabs)/profile') },
    ]);
  };

  // Rodada 59 (parte 8) — gera o check-in (código de 5 min, criado pelo
  // trigger enforce_checkin_seguro_insert no banco) pra resgatar o cupom.
  // A casa confirma esse código no portal (validar_checkin) — só isso
  // libera o cupom de verdade em cupons_resgatados.
  // Posição atual do celular (só quando a pessoa permite). null = sem permissão ou sem sinal.
  const obterPosicao = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return null;
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
      ]);
      if (!pos) return null;
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  };

  const handleFazerCheckin = async (cupomId: string | null, forcarCodigo = false) => {
    if (!user) {
      exigirLogin('Crie sua conta ou entre para fazer check-in neste local.');
      return;
    }
    setFazendoCheckin(true);
    try {
      // Migration 079: com a localização do celular perto do local, o check-in já nasce confirmado
      // (sem a casa precisar digitar nada). Sem localização, cai no código que a casa confirma.
      const posicao = forcarCodigo ? null : await obterPosicao();
      if (!forcarCodigo && !posicao) {
        Alert.alert(
          'Check-in',
          'Não conseguimos pegar a sua localização. Ative a localização do app nos ajustes do celular, ou faça o check-in com um código que a casa confirma.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Usar código', onPress: () => handleFazerCheckin(cupomId, true) },
          ]
        );
        return;
      }
      const { data, error } = await supabase
        .from('checkins')
        .insert({ local_id: id, cupom_id: cupomId, ...(posicao ? { lat: posicao.lat, lng: posicao.lng } : {}) })
        .select('id, codigo, expira_em, cupom_id, validado_em, metodo_validacao, created_at')
        .single();

      if (error) throw error;
      setMeuCheckin(data as unknown as CheckinAtivo);
      carregarDados(); // atualiza cupom e cartão fidelidade na hora
    } catch (err: any) {
      const texto = err?.message || '';
      if (texto.includes('Chegue mais perto')) {
        Alert.alert('Check-in', texto, [
          { text: 'Ok', style: 'cancel' },
          { text: 'Usar código da casa', onPress: () => handleFazerCheckin(cupomId, true) },
        ]);
        return;
      }
      const mensagem = texto.includes('últimas 12 horas')
        ? 'Você já fez check-in nesse local nas últimas 12 horas — tente de novo mais tarde.'
        : texto || 'Não foi possível fazer o check-in. Tente novamente.';
      Alert.alert('Check-in', mensagem);
    } finally {
      setFazendoCheckin(false);
    }
  };

  // Migration 081: o cliente já fez o check-in (que conta a visita da fidelidade) e escolhe o cupom depois.
  const handleUsarCupom = async (cupomId: string) => {
    if (!user) {
      exigirLogin('Crie sua conta ou entre para usar o cupom.');
      return;
    }
    setFazendoCheckin(true);
    try {
      const { error } = await supabase.rpc('usar_cupom_no_checkin', { p_cupom_id: cupomId });
      if (error) throw error;
      carregarDados();
    } catch (err: any) {
      Alert.alert('Cupom', err?.message || 'Não foi possível usar o cupom. Tente novamente.');
    } finally {
      setFazendoCheckin(false);
    }
  };

  const handleToggleFavorito = async () => {
    if (!local) return;
    if (!session || !user) {
      exigirLogin('Crie sua conta ou entre no app para salvar locais favoritos.');
      return;
    }

    setFavoritoLoading(true);
    try {
      if (isFavorito) {
        const { error } = await supabase
          .from('favoritos_locais')
          .delete()
          .eq('local_id', local.id)
          .eq('user_id', user.id);
        if (error) throw error;
        setIsFavorito(false);
      } else {
        const { error } = await supabase
          .from('favoritos_locais')
          .insert({ local_id: local.id, user_id: user.id });
        if (error) throw error;
        setIsFavorito(true);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível atualizar seus favoritos.');
    } finally {
      setFavoritoLoading(false);
    }
  };

  // App Store 1.2 (conteúdo gerado por usuário): toda avaliação de outra
  // pessoa pode ser denunciada (tabela denuncias, alvo 'avaliacao') e o
  // autor pode ser bloqueado (tabela bloqueios — a RLS
  // avaliacoes_select_visiveis já esconde avaliações de quem está bloqueado).
  const handleOpcoesAvaliacao = (av: Avaliacao) => {
    if (!session || !user) {
      Alert.alert('Entre na sua conta', 'Para denunciar ou bloquear, entre ou crie sua conta em Conta.');
      return;
    }
    if (!av.user_id || av.user_id === user.id) return;
    const nome = av.perfis_publicos?.display_name || 'esta pessoa';
    Alert.alert('Opções da avaliação', undefined, [
      {
        text: 'Denunciar avaliação',
        onPress: async () => {
          const { error } = await supabase.from('denuncias').insert({
            reporter_id: user.id,
            alvo_tipo: 'avaliacao',
            alvo_id: av.id,
            motivo: 'Avaliação imprópria (denunciada no perfil do local)',
          });
          Alert.alert(
            error ? 'Não foi possível enviar' : 'Denúncia enviada',
            error ? 'Tente novamente em alguns instantes.' : 'Obrigada! Nossa equipe analisa em até 24 horas.'
          );
        },
      },
      {
        text: `Bloquear ${nome}`,
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('bloqueios')
            .upsert({ bloqueador_id: user.id, bloqueado_id: av.user_id }, { onConflict: 'bloqueador_id,bloqueado_id', ignoreDuplicates: true });
          if (error) {
            Alert.alert('Não foi possível bloquear', 'Tente novamente em alguns instantes.');
            return;
          }
          setAvaliacoes((prev) => prev.filter((x) => x.user_id !== av.user_id));
          Alert.alert('Pessoa bloqueada', 'Você não verá mais o conteúdo dela no app.');
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const [sobreAberto, setSobreAberto] = useState(false);

  const handleAbrirReview = () => {
    if (!session || !user) {
      exigirLogin('Crie sua conta ou entre no app para avaliar este local.');
      return;
    }
    setNotaEscolhida(minhaAvaliacao?.nota || 5);
    setComentario(minhaAvaliacao?.comentario || '');
    setShowReviewModal(true);
  };

  const handleEnviarReview = async () => {
    if (!local || !user) return;

    setEnviandoReview(true);
    try {
      if (minhaAvaliacao) {
        const { error } = await supabase
          .from('avaliacoes')
          .update({ nota: notaEscolhida, comentario: comentario.trim() || null })
          .eq('id', minhaAvaliacao.id);
        if (error) throw error;
      } else {
        // Bug relatado pela Andrea (teste real como usuária): a avaliação
        // nunca salvava. Causa: este insert nunca mandava user_id, e a
        // policy de RLS "avaliacoes_insert_propria" exige
        // `auth.uid() = user_id` — sem user_id no payload, a comparação
        // é sempre falsa e o Supabase rejeita o insert (RLS violation).
        const { error } = await supabase.from('avaliacoes').insert({
          local_id: local.id,
          user_id: user.id,
          nota: notaEscolhida,
          comentario: comentario.trim() || null,
        });
        if (error) throw error;
      }

      setShowReviewModal(false);
      carregarDados();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível salvar sua avaliação.');
    } finally {
      setEnviandoReview(false);
    }
  };

  const handleAbrirInstagram = () => {
    if (!local?.instagram) {
      Alert.alert('Instagram não informado', 'Este local ainda não cadastrou um Instagram.');
      return;
    }
    // ANALYTICS: dispara e não espera — nunca atrasa a abertura do link.
    registrarCliqueInstagram(local.id);
    let handle = local.instagram.trim();
    if (handle.startsWith('http')) {
      Linking.openURL(handle);
      return;
    }
    handle = handle.replace(/^@/, '');
    Linking.openURL(`https://instagram.com/${handle}`);
  };

  const handleAbrirMapa = () => {
    if (local?.lat != null && local?.lng != null) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${local.lat},${local.lng}`);
    } else {
      Alert.alert('Localização não disponível', 'Este local ainda não informou coordenadas no mapa.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#E1306C" />
      </View>
    );
  }

  if (!local) {
    return (
      <View style={[styles.container, styles.center, { padding: 30 }]}>
        <Feather name="alert-circle" size={32} color="#626274" />
        <Text style={styles.notFoundText}>
          Não encontramos este local. Ele pode ter sido removido ou ainda está em análise.
        </Text>
        <TouchableOpacity style={styles.backBtnInline} onPress={() => router.back()}>
          <Text style={styles.backBtnInlineText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollDetail}>
          <TouchableOpacity style={styles.backBtnAbsolute} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.favBtnAbsolute}
            onPress={handleToggleFavorito}
            disabled={favoritoLoading}
          >
            {favoritoLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Feather
                name="bookmark"
                size={20}
                color={isFavorito ? '#E1306C' : '#FFF'}
                style={isFavorito ? { opacity: 1 } : { opacity: 0.85 }}
              />
            )}
          </TouchableOpacity>

          <View style={styles.heroBanner}>
            {local.foto_capa_url && (
              <Image source={{ uri: local.foto_capa_url }} style={styles.heroImage} resizeMode="cover" />
            )}
          </View>

          <View style={styles.detailBody}>
            <View style={styles.identidade}>
              <View style={styles.logoBola}>
                {local.logo_url ? (
                  <Image source={{ uri: local.logo_url }} style={styles.logoImg} resizeMode="contain" />
                ) : (
                  <Text style={styles.logoInicial}>{local.nome.trim().charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.identidadeTexto}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.detailTitle, { flexShrink: 1, marginBottom: 0 }]} numberOfLines={2}>{local.nome}</Text>
                  {local.safe_space && <Feather name="shield" size={15} color="#4CAF7D" />}
                  {(local.plano_comercial === 'fundador' || badges.some((b) => /fundador/i.test(b.rotulo))) && (
                    <Feather name="award" size={16} color="#FFD54F" />
                  )}
                </View>
                <Text style={styles.detailSubtext} numberOfLines={1}>
                  {local.subcategoria || CATEGORIA_LABEL[local.categoria] || local.categoria} • {local.bairro || local.cidade}
                </Text>
              </View>
            </View>

            <View style={styles.ratingRow}>
              <Feather name="star" size={16} color="#FFD54F" />
              <Text style={styles.ratingText}>
                {local.rating_total > 0 ? local.rating_media.toFixed(1) : 'Sem notas ainda'}
              </Text>
              {local.rating_total > 0 && (
                <Text style={styles.ratingCount}>({local.rating_total} avaliações)</Text>
              )}
            </View>

            {!!local.descricao?.trim() && (
              <View style={styles.cardSecao}>
                <SecaoTitulo icone="info" titulo="Sobre" />
                <Text style={styles.sobreTexto} numberOfLines={sobreAberto ? undefined : 5}>
                  {local.descricao.trim()}
                </Text>
                {local.descricao.trim().length > 220 && (
                  <TouchableOpacity onPress={() => setSobreAberto((v) => !v)} activeOpacity={0.7}>
                    <Text style={styles.verMais}>{sobreAberto ? 'Ver menos' : 'Ler mais'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.acoesRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.acaoMeia]} onPress={handleAbrirInstagram}>
                <Feather name="instagram" size={17} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.mapBtn, styles.acaoMeia]} onPress={handleAbrirMapa}>
                <Feather name="map-pin" size={17} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Ver no mapa</Text>
              </TouchableOpacity>
            </View>

            {local.classificacao_lgbt && (() => {
              const classificacao = CLASSIFICACOES_LGBT.find((c) => c.value === local.classificacao_lgbt);
              if (!classificacao) return null;
              return (
                <View style={styles.classificacaoCard}>
                  <Text style={styles.classificacaoEmoji}>{classificacao.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.classificacaoLabel}>{classificacao.label}</Text>
                    <Text style={styles.classificacaoDescricao}>{classificacao.descricao}</Text>
                  </View>
                </View>
              );
            })()}

            {cupons.length > 0 && (() => {
              const cupomAtivoDoCheckin = meuCheckin
                ? cupons.find((c) => c.id === meuCheckin.cupom_id) || cupons[0]
                : null;
              const confirmado = !!meuCheckin?.validado_em;
              const checkinExpirado = meuCheckin && !confirmado ? new Date(meuCheckin.expira_em).getTime() < Date.now() : false;
              // Check-in da fidelidade já feito (confirmado, ou com código ainda válido) e sem cupom: o cupom entra nele, sem novo check-in.
              const checkinSemCupom = !!meuCheckin && !meuCheckin.cupom_id && (confirmado || !checkinExpirado);
              const horaConfirmado = meuCheckin?.validado_em
                ? new Date(meuCheckin.validado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '';
              const nomeCliente = ((user as any)?.user_metadata?.display_name || (user as any)?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Cliente') as string;
              const horaExpira = meuCheckin
                ? new Date(meuCheckin.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <View style={styles.cupomCard}>
                  <View style={styles.cupomHeaderRow}>
                    <Feather name="tag" size={14} color="#FFD54F" />
                    <Text style={styles.cupomHeaderText}>Cupom disponível</Text>
                  </View>

                  {checkinSemCupom && (
                    <Text style={styles.fidDica}>Seu check-in de hoje já conta como visita. Escolha o cupom que quer usar:</Text>
                  )}

                  {confirmado && !checkinSemCupom ? (
                    <>
                      <Text style={styles.cupomTitulo}>{cupomAtivoDoCheckin?.titulo || 'Seu check-in'}</Text>
                      <View style={styles.codigoBox}>
                        <Feather name="check-circle" size={30} color="#4CAF7D" />
                        <Text style={styles.confirmadoTitulo}>Check-in confirmado</Text>
                        <Text style={styles.codigoLabel}>{nomeCliente} · {horaConfirmado}</Text>
                        <Text style={styles.codigoValidade}>Mostre esta tela ao atendente para usar seu cupom</Text>
                      </View>
                    </>
                  ) : meuCheckin && !checkinExpirado && !checkinSemCupom ? (
                    <>
                      <Text style={styles.cupomTitulo}>{cupomAtivoDoCheckin?.titulo || 'Seu check-in'}</Text>
                      <View style={styles.codigoBox}>
                        <Text style={styles.codigoLabel}>Mostre este código no caixa (a casa confirma, ou confirma sozinho no fim da noite)</Text>
                        <Text style={styles.codigoTexto}>{meuCheckin.codigo}</Text>
                        <Text style={styles.codigoValidade}>Válido até {horaExpira}</Text>
                      </View>
                    </>
                  ) : (
                    cupons.map((cupom) => (
                      <View key={cupom.id} style={{ marginBottom: 8 }}>
                        <Text style={styles.cupomTitulo}>{cupom.titulo}</Text>
                        {cupom.descricao && <Text style={styles.cupomDescricao}>{cupom.descricao}</Text>}
                        {!!textoJanela(cupom.dias_semana, cupom.hora_inicio, cupom.hora_fim) && (
                          <Text style={[styles.cupomDescricao, { color: '#FFD54F', fontWeight: '700' }]}>
                            Vale: {textoJanela(cupom.dias_semana, cupom.hora_inicio, cupom.hora_fim)}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.cupomBtn, (fazendoCheckin || !dentroDaJanela(cupom.dias_semana, cupom.hora_inicio, cupom.hora_fim)) && { opacity: 0.5 }]}
                          onPress={() => (checkinSemCupom ? handleUsarCupom(cupom.id) : handleFazerCheckin(cupom.id))}
                          disabled={fazendoCheckin || !dentroDaJanela(cupom.dias_semana, cupom.hora_inicio, cupom.hora_fim)}
                        >
                          <Feather name="check-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                          <Text style={styles.actionBtnText}>
                            {fazendoCheckin
                              ? 'Fazendo check-in...'
                              : dentroDaJanela(cupom.dias_semana, cupom.hora_inicio, cupom.hora_fim)
                                ? (checkinSemCupom ? 'Usar este cupom' : 'Fazer check-in pra resgatar')
                                : 'Fora do dia/horário deste cupom'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}

                  {meuCheckin && checkinExpirado && (
                    <Text style={styles.cupomExpiradoTexto}>
                      Seu código anterior expirou — faça check-in de novo pra gerar um código válido.
                    </Text>
                  )}
                </View>
              );
            })()}

            {fidelidade.slice(0, 1).map((f) => {
              const n = f.visitas_necessarias;
              const v = Math.min(f.visitas, n);
              const meta = f.visitas >= n;
              const noMes = f.janela === 'mes';
              const noPeriodo = f.visitas_periodo ?? f.visitas;
              const totalVisitas = Math.max(f.visitas_total ?? noPeriodo, noPeriodo);
              const vipN = f.visitas_vip ?? null;
              const ehVip = !!vipN && noPeriodo >= vipN;
              const checkinConfirmado = !!meuCheckin?.validado_em;
              const checkinAberto = !!meuCheckin && !checkinConfirmado && new Date(meuCheckin.expira_em).getTime() >= Date.now();
              return (
                <View key={f.programa_id} style={styles.fidCard}>
                  <View style={styles.cupomHeaderRow}>
                    <Feather name="gift" size={14} color="#FFD54F" />
                    <Text style={styles.cupomHeaderText}>{f.nome || 'Cartão fidelidade'}</Text>
                  </View>
                  <Text style={styles.fidRegra}>
                    A cada {n} visita{n === 1 ? '' : 's'}{noMes ? ' no mês' : ''}, ganhe:{' '}
                    <Text style={{ color: '#FFD54F' }}>{f.recompensa}</Text>
                  </Text>
                  {!!f.descricao && <Text style={styles.cupomDescricao}>{f.descricao}</Text>}

                  {n <= 12 ? (
                    <View style={styles.fidBolinhas}>
                      {Array.from({ length: n }).map((_, i) => (
                        <View key={i} style={[styles.fidBolinha, i < v && styles.fidBolinhaOn]}>
                          {i < v && <Feather name="check" size={11} color="#0B0B0E" />}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.fidBarra}>
                      <View style={[styles.fidBarraOn, { width: `${Math.round((v / n) * 100)}%` }]} />
                    </View>
                  )}

                  <Text style={styles.fidProgresso}>
                    {!user
                      ? 'Entre no app para acompanhar suas visitas.'
                      : f.ja_ganhou
                        ? noMes
                          ? 'Você já ganhou o brinde deste mês! A contagem recomeça no dia 1º.'
                          : 'Brinde conquistado! Uma nova contagem começou.'
                        : meta
                          ? 'Meta batida! Mostre esta tela ao atendente para ganhar seu brinde.'
                          : `Você tem ${f.visitas} de ${n} visitas${noMes ? ' neste mês' : ''}.`}
                  </Text>

                  {!!user && (
                    <Text style={styles.fidVezes}>
                      Você já foi {noPeriodo} {noPeriodo === 1 ? 'vez' : 'vezes'}{noMes ? ' neste mês' : ''} a esta casa
                      {totalVisitas > noPeriodo ? ` · ${totalVisitas} no total` : ''}.
                    </Text>
                  )}

                  {!!vipN && !!f.beneficio_vip && (
                    <View style={[styles.fidVip, ehVip && styles.fidVipOn]}>
                      <Feather name="star" size={14} color={ehVip ? '#0B0B0E' : '#FFD54F'} />
                      <Text style={[styles.fidVipTexto, ehVip && { color: '#0B0B0E' }]}>
                        {ehVip
                          ? `Cliente VIP! ${f.beneficio_vip}`
                          : `Nível VIP: com ${vipN} visitas${noMes ? ' no mês' : ''} você ganha ${f.beneficio_vip}${user ? ` (faltam ${Math.max(0, vipN - noPeriodo)})` : ''}`}
                      </Text>
                    </View>
                  )}

                  {user && checkinAberto && meuCheckin && !meuCheckin.cupom_id && (
                    <View style={styles.codigoBox}>
                      <Text style={styles.codigoLabel}>Mostre este código no caixa para contar a visita</Text>
                      <Text style={styles.codigoTexto}>{meuCheckin.codigo}</Text>
                      <Text style={styles.codigoValidade}>
                        Válido até {new Date(meuCheckin.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}

                  {user && checkinConfirmado && !!meuCheckin?.cupom_id && (
                    <Text style={styles.fidDica}>Visita de hoje contada neste check-in.</Text>
                  )}
                  {user && checkinConfirmado && !meuCheckin?.cupom_id && (
                    <View style={styles.codigoBox}>
                      <Feather name="check-circle" size={26} color="#4CAF7D" />
                      <Text style={styles.confirmadoTitulo}>Check-in confirmado</Text>
                      <Text style={styles.codigoValidade}>Visita contada. Mostre esta tela ao atendente.</Text>
                    </View>
                  )}

                  {!checkinAberto && !checkinConfirmado && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cupomBtn, { marginTop: 10 }, fazendoCheckin && { opacity: 0.6 }]}
                      onPress={() => handleFazerCheckin(null)}
                      disabled={fazendoCheckin}
                    >
                      <Feather name="check-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.actionBtnText}>{fazendoCheckin ? 'Fazendo check-in...' : cupons.length > 0 ? 'Fazer check-in (visita + cupons)' : 'Fazer check-in (conta 1 visita)'}</Text>
                    </TouchableOpacity>
                  )}
                  {cupons.length > 0 && !checkinAberto && !checkinConfirmado && (
                    <Text style={styles.fidDica}>Um check-in só: conta a visita aqui e libera o cupom que você escolher.</Text>
                  )}
                  {!!user && (
                    <TouchableOpacity onPress={carregarDados} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.fidAtualizar}>Atualizar minhas visitas</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {publicaRecursosPremium(local) && local.galeria_fotos && local.galeria_fotos.length > 0 && (
              <View style={styles.cardSecao}>
                <SecaoTitulo icone="image" titulo="Fotos" direita={<Text style={styles.secaoContagem}>{local.galeria_fotos.length}</Text>} />
                {local.galeria_fotos.length === 1 ? (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setFotoZoom(local.galeria_fotos![0])}>
                    <Image source={{ uri: local.galeria_fotos[0] }} style={styles.galeriaFotoUnica} resizeMode="cover" />
                  </TouchableOpacity>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {local.galeria_fotos.map((url, idx) => (
                      <TouchableOpacity key={idx} activeOpacity={0.9} onPress={() => setFotoZoom(url)}>
                        <Image source={{ uri: url }} style={styles.galeriaFoto} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {publicaRecursosPremium(local) && local.video_url && (
              <TouchableOpacity
                style={styles.videoCard}
                activeOpacity={0.85}
                onPress={() => Linking.openURL(local.video_url!)}
              >
                <View style={styles.videoPlay}>
                  <Feather name="play" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.videoTitulo}>Assista ao vídeo</Text>
                  <Text style={styles.videoSub}>Conheça o lugar por dentro</Text>
                </View>
                <Feather name="external-link" size={16} color="#A0A0B2" />
              </TouchableOpacity>
            )}

            {/* Rodada 63 — hospedagem: tipo, comodidades, quartos/áreas comuns/lazer e locais próximos */}
            <HospedagemDetalhes
              localId={local.id}
              lat={local.lat}
              lng={local.lng}
              cidade={local.cidade}
              premium={publicaRecursosPremium(local)}
            />

            {local.horario_funcionamento && DIAS_SEMANA.some((d) => local.horario_funcionamento?.[d.chave]?.aberto) && (() => {
              const status = statusAgora(local.horario_funcionamento);
              const chaveHoje = CHAVES_POR_DIA_JS[new Date().getDay()];
              return (
                <View style={styles.cardSecao}>
                  <SecaoTitulo
                    icone="clock"
                    titulo="Horário de funcionamento"
                  />
                  {status && (
                    <View style={[styles.statusPill, status.aberto ? styles.statusAberto : styles.statusFechado]}>
                      <View style={[styles.statusPonto, { backgroundColor: status.aberto ? '#4CAF7D' : '#E5484D' }]} />
                      <Text style={[styles.statusTxt, { color: status.aberto ? '#4CAF7D' : '#E5484D' }]}>{status.texto}</Text>
                    </View>
                  )}
                  {DIAS_SEMANA.map((d, i) => {
                    const dia = local.horario_funcionamento?.[d.chave];
                    const hoje = d.chave === chaveHoje;
                    const aberto = !!dia?.aberto;
                    return (
                      <View
                        key={d.chave}
                        style={[styles.horarioLinha, hoje && styles.horarioHoje, i === DIAS_SEMANA.length - 1 && { marginBottom: 0 }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.horarioDia, !aberto && { color: '#626274' }, hoje && { color: '#FFF' }]}>{d.label}</Text>
                          {hoje && <Text style={styles.horarioHojeTag}>HOJE</Text>}
                        </View>
                        {aberto ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
                            {!!dia.musica_ao_vivo && (
                              <View style={styles.musicaPill}>
                                <Feather name="music" size={10} color="#E1306C" />
                                <Text style={styles.musicaTxt}>ao vivo {dia.musica_ao_vivo}</Text>
                              </View>
                            )}
                            <Text style={[styles.horarioValor, hoje && { color: '#FFF', fontWeight: '700' }]}>
                              {dia.abre && dia.fecha ? `${dia.abre} – ${dia.fecha}` : 'Aberto'}
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.horarioValor, { color: '#626274' }]}>Fechado</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {/* AVALIAÇÕES — mesmo cartão e título das demais seções */}
            <View style={styles.cardSecao}>
              <SecaoTitulo
                icone="star"
                titulo="Avaliações"
                direita={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {local.rating_total > 0 && <Text style={styles.secaoContagem}>{local.rating_total}</Text>}
                    <TouchableOpacity onPress={handleAbrirReview} activeOpacity={0.8} style={styles.reviewCta}>
                      <Text style={styles.reviewCtaTxt}>{minhaAvaliacao ? 'Editar avaliação' : 'Avaliar'}</Text>
                    </TouchableOpacity>
                  </View>
                }
              />

              {avaliacoes.length === 0 ? (
                <View style={styles.emptyReviewsBox}>
                  <Feather name="message-circle" size={20} color="#626274" />
                  <Text style={styles.emptyReviewsText}>
                    Ainda não há avaliações. Seja a primeira pessoa a avaliar!
                  </Text>
                </View>
              ) : (
              avaliacoes.map((av) => (
                <View key={av.id} style={styles.reviewCard}>
                  <View style={styles.reviewCardHeader}>
                    <Text style={styles.reviewAuthor}>
                      {av.perfis_publicos?.display_name || 'Usuário Dicas LGBT+'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Feather
                          key={n}
                          name="star"
                          size={11}
                          color={n <= av.nota ? '#FFD54F' : '#2D2B3D'}
                        />
                      ))}
                      {av.user_id !== user?.id && (
                        <TouchableOpacity
                          onPress={() => handleOpcoesAvaliacao(av)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={{ marginLeft: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel="Denunciar ou bloquear"
                        >
                          <Feather name="more-horizontal" size={16} color="#A0A0B2" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {av.comentario && <Text style={styles.reviewComment}>{av.comentario}</Text>}
                </View>
              ))
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ZOOM DE FOTO / PROGRAMAÇÃO */}
      <Modal visible={!!fotoZoom} transparent animationType="fade" onRequestClose={() => setFotoZoom(null)}>
        <TouchableOpacity style={styles.zoomOverlay} activeOpacity={1} onPress={() => setFotoZoom(null)}>
          {!!fotoZoom && <Image source={{ uri: fotoZoom }} style={styles.zoomImagem} resizeMode="contain" />}
          <View style={styles.zoomFechar}>
            <Feather name="x" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DE AVALIAÇÃO */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReviewModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.reviewModalContent}>
            <Text style={styles.modalTitle}>
              {minhaAvaliacao ? 'Editar avaliação' : 'Avaliar'} {local.nome}
            </Text>

            <View style={styles.starsPickerRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setNotaEscolhida(n)} activeOpacity={0.7}>
                  <Feather
                    name="star"
                    size={30}
                    color={n <= notaEscolhida ? '#FFD54F' : '#2D2B3D'}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Conte como foi sua experiência (opcional)"
              placeholderTextColor="#626274"
              multiline
              numberOfLines={4}
              value={comentario}
              onChangeText={setComentario}
              editable={!enviandoReview}
            />

            <TouchableOpacity
              style={[styles.actionBtn, enviandoReview && { opacity: 0.6 }]}
              onPress={handleEnviarReview}
              disabled={enviandoReview}
            >
              {enviandoReview ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.actionBtnText}>Enviar Avaliação</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  center: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },

  notFoundText: { color: '#A0A0B2', fontSize: 13, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  backBtnInline: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  backBtnInlineText: { color: '#FFF', fontWeight: '700' },

  backBtnAbsolute: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  favBtnAbsolute: { position: 'absolute', top: 16, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  scrollDetail: { paddingBottom: 40 },
  heroBanner: { height: 190, backgroundColor: '#1A1926', justifyContent: 'flex-end', overflow: 'hidden' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 175, 125, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  safeBadgeText: { fontSize: 11, fontWeight: '700', color: '#4CAF7D' },
  genericBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: '#FFD54F', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  genericBadgeText: { fontSize: 11, fontWeight: '700' },

  detailBody: { padding: 20 },
  detailTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  detailSubtext: { fontSize: 12, color: '#A0A0B2', marginTop: 3 },
  identidade: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: -58, marginBottom: 14 },
  logoBola: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: '#0B0B0E', backgroundColor: '#FFFFFF', padding: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: '100%', height: '100%' },
  logoInicial: { fontSize: 30, fontWeight: '900', color: '#E1306C' },
  identidadeTexto: { flex: 1, paddingTop: 46 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  ratingText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  ratingCount: { fontSize: 12, color: '#A0A0B2' },

  description: { fontSize: 12, color: '#C0C0D0', lineHeight: 18, marginBottom: 18 },

  actionBtn: { flexDirection: 'row', height: 48, backgroundColor: '#E1306C', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  mapBtn: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  // Rodada 59 (parte 8) — card de cupom ativo/check-in.
  cupomCard: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#FFD54F30', borderRadius: 18, padding: 16, marginTop: 14 },
  // Rodada 60 — selo de classificação da relação com a comunidade LGBT+
  // (Câmara de Comércio LGBT+), pedido pra ficar visível perto do cupom.
  classificacaoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#161520', borderWidth: 1, borderColor: '#7E57C230', borderRadius: 18, padding: 16, marginTop: 14 },
  classificacaoEmoji: { fontSize: 17 },
  classificacaoLabel: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  classificacaoDescricao: { fontSize: 11, color: '#A0A0B2', marginTop: 2, lineHeight: 15 },
  cupomHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cupomHeaderText: { fontSize: 11, fontWeight: '800', color: '#FFD54F', textTransform: 'uppercase', letterSpacing: 0.5 },
  cupomTitulo: { fontSize: 14, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  cupomDescricao: { fontSize: 12, color: '#A0A0B2', lineHeight: 17, marginBottom: 10 },
  cupomBtn: { backgroundColor: '#7E57C2', marginBottom: 0 },
  codigoBox: { backgroundColor: '#0B0B0E', borderRadius: 12, borderWidth: 1, borderColor: '#232230', padding: 14, alignItems: 'center', marginTop: 4 },
  codigoLabel: { fontSize: 11, color: '#A0A0B2', marginBottom: 6 },
  codigoTexto: { fontSize: 22, fontWeight: '900', color: '#FFD54F', letterSpacing: 4 },
  codigoValidade: { fontSize: 11, color: '#A0A0B2', marginTop: 6, textAlign: 'center' },
  confirmadoTitulo: { fontSize: 18, fontWeight: '800', color: '#4CAF7D', marginTop: 6, marginBottom: 2 },
  cupomExpiradoTexto: { fontSize: 12, color: '#A0A0B2', marginTop: 4 },
  videoBtn: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  galeriaFoto: { width: 210, height: 150, borderRadius: 14, backgroundColor: '#0B0B0E' },
  galeriaFotoUnica: { width: '100%', height: 190, borderRadius: 14, backgroundColor: '#0B0B0E' },
  acoesRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  acaoMeia: { flex: 1, marginBottom: 0, paddingHorizontal: 8 },



  cardSecao: { marginTop: 14, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 18, padding: 16 },
  secaoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  secaoIcone: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E1306C1A', alignItems: 'center', justifyContent: 'center' },
  secaoTitulo: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  secaoContagem: { fontSize: 11, fontWeight: '800', color: '#A0A0B2', backgroundColor: '#0B0B0E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  sobreTexto: { fontSize: 13, color: '#D0D0E0', lineHeight: 20 },
  verMais: { marginTop: 8, fontSize: 12, fontWeight: '800', color: '#E1306C' },

  progImagem: { width: '100%', height: 240, borderRadius: 14, backgroundColor: '#0B0B0E' },
  progZoomDica: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  progZoomTxt: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  progLinha: { flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#232230' },
  progDia: { width: 74, fontSize: 12, fontWeight: '800', color: '#E1306C', textTransform: 'uppercase' },
  progTexto: { flex: 1, fontSize: 13, color: '#D0D0E0', lineHeight: 18 },
  fidCard: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#FFD54F30', borderRadius: 18, padding: 16, marginTop: 14 },
  fidRegra: { fontSize: 15, fontWeight: '800', color: '#FFF', lineHeight: 21, marginBottom: 4 },
  fidBolinhas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 4 },
  fidBolinha: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#3A3950', alignItems: 'center', justifyContent: 'center' },
  fidBolinhaOn: { backgroundColor: '#FFD54F', borderColor: '#FFD54F' },
  fidBarra: { height: 8, borderRadius: 4, backgroundColor: '#232230', overflow: 'hidden', marginTop: 12, marginBottom: 4 },
  fidBarraOn: { height: 8, backgroundColor: '#FFD54F' },
  fidProgresso: { fontSize: 13, color: '#D0D0E0', marginTop: 8 },
  fidDica: { fontSize: 11, color: '#A0A0B2', marginTop: 8 },
  fidVezes: { color: '#D0D0E0', fontSize: 12, fontWeight: '700', marginTop: 6 },
  fidVip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,213,79,0.35)', backgroundColor: 'rgba(255,213,79,0.08)' },
  fidVipOn: { backgroundColor: '#FFD54F', borderColor: '#FFD54F' },
  fidVipTexto: { flex: 1, color: '#FFD54F', fontSize: 12, fontWeight: '700' },
  fidAtualizar: { fontSize: 11, fontWeight: '700', color: '#E1306C', marginTop: 10, textDecorationLine: 'underline' },

  videoCard: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 18, padding: 16 },
  videoPlay: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E1306C', alignItems: 'center', justifyContent: 'center' },
  videoTitulo: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  videoSub: { fontSize: 11, color: '#A0A0B2', marginTop: 2 },

  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 10, borderWidth: 1 },
  statusAberto: { backgroundColor: '#4CAF7D18', borderColor: '#4CAF7D50' },
  statusFechado: { backgroundColor: '#E5484D14', borderColor: '#E5484D40' },
  statusPonto: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 12, fontWeight: '800' },
  horarioLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 2 },
  horarioHoje: { backgroundColor: '#E1306C14', borderWidth: 1, borderColor: '#E1306C40' },
  horarioHojeTag: { fontSize: 9, fontWeight: '900', color: '#E1306C', letterSpacing: 0.5 },
  horarioDia: { fontSize: 13, fontWeight: '700', color: '#D0D0E0' },
  horarioValor: { fontSize: 13, color: '#A0A0B2' },
  musicaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E1306C14', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  musicaTxt: { fontSize: 10, fontWeight: '700', color: '#E1306C' },

  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  zoomImagem: { width: '100%', height: '85%' },
  zoomFechar: { position: 'absolute', top: 54, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  reviewCta: { borderWidth: 1, borderColor: '#E1306C66', backgroundColor: '#E1306C14', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  reviewCtaTxt: { fontSize: 12, fontWeight: '800', color: '#E1306C' },

  emptyReviewsBox: { alignItems: 'center', gap: 8, backgroundColor: '#0B0B0E', borderRadius: 14, paddingVertical: 22, paddingHorizontal: 16 },
  emptyReviewsText: { fontSize: 12, color: '#A0A0B2', textAlign: 'center' },

  reviewCard: { borderTopWidth: 1, borderTopColor: '#232230', paddingVertical: 12 },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewAuthor: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  reviewComment: { fontSize: 12, color: '#A0A0B2', lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  reviewModalContent: { width: '100%', backgroundColor: '#161520', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#232230' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 16, textAlign: 'center' },
  starsPickerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  reviewInput: { minHeight: 90, borderRadius: 12, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#232230', padding: 14, color: '#FFF', fontSize: 12, textAlignVertical: 'top', marginBottom: 16 },
});
