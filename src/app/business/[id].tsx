import { Feather } from '@expo/vector-icons';
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
  safe_space: boolean;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  rating_media: number;
  rating_total: number;
  horario_funcionamento: Record<string, { aberto: boolean; abre?: string; fecha?: string; musica_ao_vivo?: string }> | null;
  galeria_fotos: string[] | null;
  video_url: string | null;
  tags: string[] | null;
  plano_comercial: string;
  plano_comercial_status: string;
  classificacao_lgbt: string | null;
}

// Rodada 41 — "agenda da semana" (pedido da Andrea, Rodada 39: "Vamos
// criar a agenda da semana com fotos e links"). Uma linha por dia com
// programação (public.agenda_semanal, migration 023) — dia sem linha
// ativa simplesmente não aparece aqui. Mesma decisão de gating que
// tags/galeria/vídeo acima: é conteúdo promocional rico (foto + link),
// então segue publicaRecursosPremium — só Premium/Fundador ativo mostra
// pro usuário final no app. Se a Andrea preferir deixar isso visível pra
// todo mundo (mais parecido com horário de funcionamento do que com
// galeria), é só tirar o `publicaRecursosPremium(local) &&` abaixo.
interface AgendaDia {
  id: string;
  dia_semana: number;
  titulo: string;
  descricao: string | null;
  foto_url: string | null;
  link: string | null;
}

const DIAS_SEMANA_AGENDA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

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
}

interface CheckinAtivo {
  id: string;
  codigo: string;
  expira_em: string;
  cupom_id: string | null;
}

export default function BusinessDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<LocalRow | null>(null);
  const [agendaSemana, setAgendaSemana] = useState<AgendaDia[]>([]);
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

  const carregarDados = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const agora = new Date().toISOString();
      const [localRes, badgesRes, avaliacoesRes, agendaRes, cuponsRes] = await Promise.all([
        supabase
          .from('locais')
          .select(
            'id, nome, categoria, subcategoria, descricao, endereco, bairro, cidade, lat, lng, instagram, foto_capa_url, safe_space, plano_destaque, rating_media, rating_total, horario_funcionamento, galeria_fotos, video_url, tags, plano_comercial, plano_comercial_status, classificacao_lgbt'
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
        supabase
          .from('agenda_semanal')
          .select('id, dia_semana, titulo, descricao, foto_url, link')
          .eq('local_id', id)
          .eq('ativo', true)
          .order('dia_semana', { ascending: true }),
        // Rodada 59 (parte 8) — cupons ativos deste local (ver interface
        // CupomLocal acima). valido_de/valido_ate são opcionais — só
        // filtra quando preenchidos.
        supabase
          .from('cupons')
          .select('id, titulo, descricao, valido_de, valido_ate')
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
      setAgendaSemana((agendaRes.data as any) || []);
      setCupons((cuponsRes.data as any) || []);

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
            .select('id, codigo, expira_em, cupom_id')
            .eq('local_id', id)
            .eq('user_id', user.id)
            .is('validado_em', null)
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
  const handleFazerCheckin = async (cupomId: string) => {
    if (!user) {
      exigirLogin('Crie sua conta ou entre para fazer check-in e resgatar este cupom.');
      return;
    }
    setFazendoCheckin(true);
    try {
      const { data, error } = await supabase
        .from('checkins')
        .insert({ local_id: id, cupom_id: cupomId })
        .select('id, codigo, expira_em, cupom_id')
        .single();

      if (error) throw error;
      setMeuCheckin(data as unknown as CheckinAtivo);
    } catch (err: any) {
      const mensagem = (err?.message || '').includes('últimas 12 horas')
        ? 'Você já fez check-in nesse local nas últimas 12 horas — tente de novo mais tarde.'
        : err?.message || 'Não foi possível fazer o check-in. Tente novamente.';
      Alert.alert('Check-in', mensagem);
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
            <View style={styles.badgesRow}>
              {local.safe_space && (
                <View style={styles.safeBadge}>
                  <Feather name="shield" size={12} color="#4CAF7D" style={{ marginRight: 4 }} />
                  <Text style={styles.safeBadgeText}>Espaço Seguro LGBT+</Text>
                </View>
              )}
              {badges.map((b) => (
                <View
                  key={b.id}
                  style={[styles.genericBadge, { borderColor: BADGE_COLORS[b.cor_tag] || '#FFD54F' }]}
                >
                  <Feather name="award" size={12} color={BADGE_COLORS[b.cor_tag] || '#FFD54F'} style={{ marginRight: 4 }} />
                  <Text style={[styles.genericBadgeText, { color: BADGE_COLORS[b.cor_tag] || '#FFD54F' }]}>
                    {b.rotulo}
                  </Text>
                </View>
              ))}
              {local.plano_destaque !== 'basico' && (
                <View style={styles.genericBadge}>
                  <Feather name="star" size={12} color="#FFD54F" style={{ marginRight: 4 }} />
                  <Text style={[styles.genericBadgeText, { color: '#FFD54F' }]}>Em destaque</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.detailBody}>
            <Text style={styles.detailTitle}>{local.nome}</Text>
            <Text style={styles.detailSubtext}>
              {CATEGORIA_LABEL[local.categoria] || local.categoria}
              {local.subcategoria ? ` • ${local.subcategoria}` : ''} • {local.bairro || local.cidade}
            </Text>

            <View style={styles.ratingRow}>
              <Feather name="star" size={16} color="#FFD54F" />
              <Text style={styles.ratingText}>
                {local.rating_total > 0 ? local.rating_media.toFixed(1) : 'Sem notas ainda'}
              </Text>
              {local.rating_total > 0 && (
                <Text style={styles.ratingCount}>({local.rating_total} avaliações)</Text>
              )}
            </View>

            {local.descricao && <Text style={styles.description}>{local.descricao}</Text>}

            <TouchableOpacity style={styles.actionBtn} onPress={handleAbrirInstagram}>
              <Feather name="instagram" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Ver no Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.mapBtn]} onPress={handleAbrirMapa}>
              <Feather name="map-pin" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Ver no Mapa</Text>
            </TouchableOpacity>

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
              const checkinExpirado = meuCheckin ? new Date(meuCheckin.expira_em).getTime() < Date.now() : false;
              const horaExpira = meuCheckin
                ? new Date(meuCheckin.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <View style={styles.cupomCard}>
                  <View style={styles.cupomHeaderRow}>
                    <Feather name="tag" size={14} color="#FFD54F" />
                    <Text style={styles.cupomHeaderText}>Cupom disponível</Text>
                  </View>

                  {meuCheckin && !checkinExpirado ? (
                    <>
                      <Text style={styles.cupomTitulo}>{cupomAtivoDoCheckin?.titulo || 'Seu check-in'}</Text>
                      <View style={styles.codigoBox}>
                        <Text style={styles.codigoLabel}>Mostre este código no caixa</Text>
                        <Text style={styles.codigoTexto}>{meuCheckin.codigo}</Text>
                        <Text style={styles.codigoValidade}>Válido até {horaExpira}</Text>
                      </View>
                    </>
                  ) : (
                    cupons.map((cupom) => (
                      <View key={cupom.id} style={{ marginBottom: 8 }}>
                        <Text style={styles.cupomTitulo}>{cupom.titulo}</Text>
                        {cupom.descricao && <Text style={styles.cupomDescricao}>{cupom.descricao}</Text>}
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.cupomBtn, fazendoCheckin && { opacity: 0.6 }]}
                          onPress={() => handleFazerCheckin(cupom.id)}
                          disabled={fazendoCheckin}
                        >
                          <Feather name="check-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                          <Text style={styles.actionBtnText}>
                            {fazendoCheckin ? 'Fazendo check-in...' : 'Fazer check-in pra resgatar'}
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

            {publicaRecursosPremium(local) && local.tags && local.tags.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Tags de experiência</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {local.tags.map((tag, idx) => (
                    <View key={idx} style={styles.tagExperienciaChip}>
                      <Text style={styles.tagExperienciaTexto}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {publicaRecursosPremium(local) && local.galeria_fotos && local.galeria_fotos.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Fotos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
                  {local.galeria_fotos.map((url, idx) => (
                    <Image key={idx} source={{ uri: url }} style={styles.galeriaFoto} resizeMode="cover" />
                  ))}
                </ScrollView>
              </View>
            )}

            {publicaRecursosPremium(local) && local.video_url && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.videoBtn]}
                onPress={() => Linking.openURL(local.video_url!)}
              >
                <Feather name="play-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Ver vídeo</Text>
              </TouchableOpacity>
            )}

            {publicaRecursosPremium(local) && agendaSemana.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Agenda da semana</Text>
                <View style={{ marginTop: 8, gap: 10 }}>
                  {agendaSemana.map((dia) => (
                    <View key={dia.id} style={styles.agendaDiaBox}>
                      {dia.foto_url && (
                        <Image source={{ uri: dia.foto_url }} style={styles.agendaDiaFoto} resizeMode="cover" />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.agendaDiaSemana}>{DIAS_SEMANA_AGENDA[dia.dia_semana]}</Text>
                        <Text style={styles.agendaDiaTitulo}>{dia.titulo}</Text>
                        {dia.descricao && <Text style={styles.agendaDiaDescricao}>{dia.descricao}</Text>}
                        {dia.link && (
                          <TouchableOpacity onPress={() => Linking.openURL(dia.link!)}>
                            <Text style={styles.agendaDiaLink}>Ver mais</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {local.horario_funcionamento && DIAS_SEMANA.some((d) => local.horario_funcionamento?.[d.chave]?.aberto) && (
              <View style={styles.horarioBox}>
                <Text style={styles.sectionTitle}>Horário de funcionamento</Text>
                {DIAS_SEMANA.map((d) => {
                  const dia = local.horario_funcionamento?.[d.chave];
                  if (!dia?.aberto) return null;
                  return (
                    <View key={d.chave} style={styles.horarioLinha}>
                      <Text style={styles.horarioDia}>{d.label}</Text>
                      <Text style={styles.horarioValor}>
                        {dia.abre && dia.fecha ? `${dia.abre} – ${dia.fecha}` : 'Aberto'}
                        {dia.musica_ao_vivo ? `  •  música ao vivo ${dia.musica_ao_vivo}` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* AVALIAÇÕES */}
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Avaliações</Text>
              <TouchableOpacity onPress={handleAbrirReview} activeOpacity={0.8}>
                <Text style={styles.reviewCta}>
                  {minhaAvaliacao ? 'Editar minha avaliação' : 'Avaliar este local'}
                </Text>
              </TouchableOpacity>
            </View>

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
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Feather
                          key={n}
                          name="star"
                          size={11}
                          color={n <= av.nota ? '#FFD54F' : '#2D2B3D'}
                        />
                      ))}
                    </View>
                  </View>
                  {av.comentario && <Text style={styles.reviewComment}>{av.comentario}</Text>}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

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

  notFoundText: { color: '#A0A0B2', fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  backBtnInline: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  backBtnInlineText: { color: '#FFF', fontWeight: '700' },

  backBtnAbsolute: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  favBtnAbsolute: { position: 'absolute', top: 16, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  scrollDetail: { paddingBottom: 40 },
  heroBanner: { height: 200, backgroundColor: '#1A1926', justifyContent: 'flex-end', padding: 16, overflow: 'hidden' },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 175, 125, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  safeBadgeText: { fontSize: 11, fontWeight: '700', color: '#4CAF7D' },
  genericBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: '#FFD54F', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  genericBadgeText: { fontSize: 11, fontWeight: '700' },

  detailBody: { padding: 20 },
  detailTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  detailSubtext: { fontSize: 13, color: '#A0A0B2', marginBottom: 10 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  ratingCount: { fontSize: 12, color: '#A0A0B2' },

  description: { fontSize: 13, color: '#C0C0D0', lineHeight: 20, marginBottom: 18 },

  actionBtn: { flexDirection: 'row', height: 48, backgroundColor: '#E1306C', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  mapBtn: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  // Rodada 59 (parte 8) — card de cupom ativo/check-in.
  cupomCard: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#FFD54F30', borderRadius: 16, padding: 16, marginBottom: 18 },
  // Rodada 60 — selo de classificação da relação com a comunidade LGBT+
  // (Câmara de Comércio LGBT+), pedido pra ficar visível perto do cupom.
  classificacaoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#161520', borderWidth: 1, borderColor: '#7E57C230', borderRadius: 14, padding: 12, marginBottom: 18 },
  classificacaoEmoji: { fontSize: 20 },
  classificacaoLabel: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  classificacaoDescricao: { fontSize: 11, color: '#A0A0B2', marginTop: 2, lineHeight: 15 },
  cupomHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cupomHeaderText: { fontSize: 11, fontWeight: '800', color: '#FFD54F', textTransform: 'uppercase', letterSpacing: 0.5 },
  cupomTitulo: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  cupomDescricao: { fontSize: 12, color: '#A0A0B2', lineHeight: 17, marginBottom: 10 },
  cupomBtn: { backgroundColor: '#7E57C2', marginBottom: 0 },
  codigoBox: { backgroundColor: '#0B0B0E', borderRadius: 12, borderWidth: 1, borderColor: '#232230', padding: 14, alignItems: 'center', marginTop: 4 },
  codigoLabel: { fontSize: 11, color: '#A0A0B2', marginBottom: 6 },
  codigoTexto: { fontSize: 26, fontWeight: '900', color: '#FFD54F', letterSpacing: 4 },
  codigoValidade: { fontSize: 11, color: '#A0A0B2', marginTop: 6 },
  cupomExpiradoTexto: { fontSize: 12, color: '#A0A0B2', marginTop: 4 },
  videoBtn: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  galeriaFoto: { width: 140, height: 100, borderRadius: 12, backgroundColor: '#161520' },

  tagExperienciaChip: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  tagExperienciaTexto: { color: '#D0D0E0', fontSize: 12, fontWeight: '700' },

  agendaDiaBox: { flexDirection: 'row', gap: 12, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 14, padding: 12, alignItems: 'center' },
  agendaDiaFoto: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#0B0B0E' },
  agendaDiaSemana: { fontSize: 11, fontWeight: '800', color: '#E1306C', textTransform: 'uppercase' },
  agendaDiaTitulo: { fontSize: 14, fontWeight: '700', color: '#FFF', marginTop: 2 },
  agendaDiaDescricao: { fontSize: 12, color: '#A0A0B2', marginTop: 2 },
  agendaDiaLink: { fontSize: 12, fontWeight: '700', color: '#E1306C', marginTop: 4, textDecorationLine: 'underline' },

  horarioBox: { marginTop: 16, marginBottom: 8, padding: 14, borderRadius: 14, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230' },
  horarioLinha: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  horarioDia: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  horarioValor: { fontSize: 12, color: '#A0A0B2', flexShrink: 1, textAlign: 'right', marginLeft: 8 },

  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  reviewCta: { fontSize: 12, fontWeight: '700', color: '#7E57C2' },

  emptyReviewsBox: { alignItems: 'center', gap: 8, backgroundColor: '#161520', borderRadius: 16, borderWidth: 1, borderColor: '#232230', padding: 24 },
  emptyReviewsText: { fontSize: 12, color: '#A0A0B2', textAlign: 'center' },

  reviewCard: { backgroundColor: '#161520', borderRadius: 14, borderWidth: 1, borderColor: '#232230', padding: 12, marginBottom: 8 },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  reviewComment: { fontSize: 12, color: '#A0A0B2', lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  reviewModalContent: { width: '100%', backgroundColor: '#161520', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#232230' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 16, textAlign: 'center' },
  starsPickerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  reviewInput: { minHeight: 90, borderRadius: 12, backgroundColor: '#0B0B0E', borderWidth: 1, borderColor: '#232230', padding: 14, color: '#FFF', fontSize: 13, textAlignVertical: 'top', marginBottom: 16 },
});
