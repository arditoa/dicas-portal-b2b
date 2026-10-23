// Rodada 66 — página de detalhes da festa/evento.
//
// Antes, tocar numa festa (no "O que fazer hoje" ou na aba Eventos) levava
// pra aba Eventos inteira ou abria direto o modal da Lista VIP. Agora abre
// esta página: flier grande, selo FESTA, data e horário, local (com link
// pra página do local e "Como chegar"), descrição, tags e a Lista VIP com o
// mesmo fluxo de antes (enviar nome, acompanhar status, check-in na
// portaria, cancelar, avaliar o local depois).
//
// A descrição cadastrada pelo portal traz no final "Contato: nome —
// WhatsApp" do organizador (uso interno da equipe) — essas linhas são
// removidas aqui pra não expor o telefone do organizador.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/authContext';
import { SELO_FESTA } from '../../lib/categorias';
import { estaFixadoEm, deveExibirGlow } from '../../lib/destaque';
import { supabase } from '../../lib/supabase';
import { GRUPOS_EVENTO, LEGADO_EVENTO, rotuloTag, slugTag } from '../../lib/taxonomia';
import { useRastrearTela } from '../../lib/usoTelas';

const C = {
  bg: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  text: '#F5F5F7',
  dim: '#A0A0B2',
  muted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
  lilas: '#B39DDB',
  green: '#4CAF7D',
  gold: '#FFD54F',
};

const STATUS_LABEL: Record<string, { texto: string; cor: string; icone: string }> = {
  solicitada: { texto: 'Nome enviado — aguardando aprovação do organizador', cor: C.gold, icone: 'clock' },
  aprovada: { texto: 'Aprovado! Seu nome está confirmado na lista', cor: C.green, icone: 'check-circle' },
  rejeitada: { texto: 'Solicitação não aprovada', cor: C.pink, icone: 'x-circle' },
  cancelada: { texto: 'Solicitação cancelada', cor: C.dim, icone: 'slash' },
  check_in: { texto: 'Check-in feito na portaria. Boa festa!', cor: C.green, icone: 'check-circle' },
};

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

type ListaVip = { id: string; titulo: string; vagas_limite: number | null; vagas_ocupadas: number; ativa: boolean };
type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  estilos_musicais: string[] | null;
  publico_tags: string[] | null;
  tags?: string[] | null;
  foto_capa_url: string | null;
  plano_destaque: string;
  destaque_secoes: string[] | null;
  destaque_ate: string | null;
  local_id: string | null;
  locais: { id: string; nome: string; bairro: string | null; bairro_exibicao?: string | null; cidade: string | null; endereco: string | null; lat: number | null; lng: number | null } | null;
  listas_vip: ListaVip[] | null;
};

const CAMPOS =
  'id, titulo, descricao, data_inicio, data_fim, estilos_musicais, publico_tags, foto_capa_url, plano_destaque, destaque_secoes, destaque_ate, local_id, locais(id, nome, bairro, bairro_exibicao, cidade, endereco, lat, lng), listas_vip(id, titulo, vagas_limite, vagas_ocupadas, ativa)';

function limparDescricao(texto: string | null): string | null {
  if (!texto) return null;
  const partes = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^contato:/i.test(p) && !/^local:/i.test(p) && !/^cidade:/i.test(p));
  return partes.length ? partes.join('\n\n') : null;
}

function dataPorExtenso(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmoDia(d, hoje)) return 'Hoje';
  if (mesmoDia(d, amanha)) return 'Amanhã';
  const dia = DIAS[d.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`;
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Tags do evento agrupadas pela taxonomia oficial (+ equivalentes dos campos antigos)
function tagsAgrupadas(ev: Evento) {
  const slugs = new Set<string>(ev.tags || []);
  for (const [slug, legado] of Object.entries(LEGADO_EVENTO)) {
    if (legado.some((l) => ev.estilos_musicais?.includes(l) || ev.publico_tags?.includes(l))) slugs.add(slug);
  }
  slugs.delete('todos_os_publicos');
  return GRUPOS_EVENTO.map((g) => ({ titulo: g.titulo, tags: g.tags.map(slugTag).filter((t) => slugs.has(t)) })).filter((g) => g.tags.length > 0);
}

export default function EventoScreen() {
  useRastrearTela('evento');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, session } = useAuth();

  const [carregando, setCarregando] = useState(true);
  const [ev, setEv] = useState<Evento | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [acompanhantes, setAcompanhantes] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const lista = ev?.listas_vip?.find((l) => l.ativa) || null;

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    try {
      // `tags` vem da migration 036; sem ela, segue com os campos antigos.
      let r: any = await supabase.from('eventos').select(`${CAMPOS}, tags`).eq('id', id).maybeSingle();
      if (r.error) r = await supabase.from('eventos').select(CAMPOS).eq('id', id).maybeSingle();
      const dado = (r.data as Evento) || null;
      setEv(dado);
      const listaAtiva = dado?.listas_vip?.find((l) => l.ativa);
      if (user?.id && listaAtiva) {
        const { data: minha } = await supabase
          .from('listas_vip_solicitacoes')
          .select('status')
          .eq('lista_vip_id', listaAtiva.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setStatus((minha as any)?.status || null);
      } else {
        setStatus(null);
      }
    } finally {
      setCarregando(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const exigirLogin = () => {
    Alert.alert('Entre na sua conta', 'Crie sua conta ou entre no app para colocar seu nome na lista VIP.', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Entrar / Criar conta', onPress: () => router.push('/(tabs)/profile') },
    ]);
  };

  const enviarNome = async () => {
    if (!lista) return;
    if (!session || !user) return exigirLogin();
    setEnviando(true);
    try {
      const { error } = await supabase.from('listas_vip_solicitacoes').insert({ lista_vip_id: lista.id, acompanhantes });
      if (error && error.code !== '23505') throw error;
      Alert.alert('Nome enviado!', `Seu nome foi para a lista VIP de ${ev?.titulo}. Leve um documento com foto na portaria.`);
      await carregar();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível enviar seu nome. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const atualizarStatus = async (acao: 'cancelar' | 'checkin') => {
    if (!lista || !user) return;
    setEnviando(true);
    try {
      const q = supabase.from('listas_vip_solicitacoes');
      const { error } =
        acao === 'cancelar'
          ? await q.delete().eq('lista_vip_id', lista.id).eq('user_id', user.id)
          : await q.update({ status: 'check_in' }).eq('lista_vip_id', lista.id).eq('user_id', user.id);
      if (error) throw error;
      await carregar();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível concluir. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const comoChegar = () => {
    const l = ev?.locais;
    if (!l) return;
    const destino = l.lat != null && l.lng != null ? `${l.lat},${l.lng}` : encodeURIComponent([l.endereco || l.nome, l.cidade].filter(Boolean).join(', '));
    const url = Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${destino}` : `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
    Linking.openURL(url);
  };

  const compartilhar = () => {
    if (!ev) return;
    Share.share({ message: `${ev.titulo} — ${dataPorExtenso(ev.data_inicio)}, ${hora(ev.data_inicio)}${ev.locais ? ` no ${ev.locais.nome}` : ''}. Vi no app Dicas LGBT+ 🏳️‍🌈` }).catch(() => {});
  };

  if (carregando) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator color={C.pink} />
      </View>
    );
  }

  if (!ev) {
    return (
      <View style={[styles.container, styles.centro, { paddingTop: insets.top }]}>
        <Feather name="calendar" size={28} color={C.dim} />
        <Text style={[styles.dim, { marginTop: 10 }]}>Evento não encontrado ou já encerrado.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={styles.link}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const descricao = limparDescricao(ev.descricao);
  const grupos = tagsAgrupadas(ev);
  const vagas = lista?.vagas_limite != null ? Math.max(0, lista.vagas_limite - lista.vagas_ocupadas) : null;
  const destaque = ev.plano_destaque !== 'basico' || deveExibirGlow(ev as any);
  const st = status ? STATUS_LABEL[status] : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Flier */}
        <View style={styles.flierBox}>
          {ev.foto_capa_url ? (
            <>
              <Image source={{ uri: ev.foto_capa_url }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={30} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11,11,14,0.55)' }]} />
              <Image source={{ uri: ev.foto_capa_url }} style={styles.flier} resizeMode="contain" />
            </>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.centro, { backgroundColor: '#2A1530' }]}>
              <Feather name="music" size={42} color={C.pink} />
            </View>
          )}
          <View style={[styles.topoBotoes, { top: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.botaoRedondo} accessibilityLabel="Voltar">
              <Feather name="chevron-left" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={compartilhar} style={styles.botaoRedondo} accessibilityLabel="Compartilhar">
              <Feather name="share-2" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.corpo}>
          <View style={styles.selosLinha}>
            <View style={[styles.selo, { backgroundColor: SELO_FESTA.cor }]}>
              <Text style={[styles.seloTxt, { color: SELO_FESTA.textoCor }]}>{SELO_FESTA.texto}</Text>
            </View>
            {destaque && (
              <View style={[styles.selo, { backgroundColor: '#FF9142' }]}>
                <Text style={[styles.seloTxt, { color: '#000' }]}>DESTAQUE</Text>
              </View>
            )}
            {estaFixadoEm(ev as any, 'patrocinado') && (
              <View style={[styles.selo, { backgroundColor: C.purple }]}>
                <Text style={[styles.seloTxt, { color: '#FFF' }]}>PATROCINADO</Text>
              </View>
            )}
            {lista && (
              <View style={[styles.selo, { backgroundColor: 'rgba(76,175,125,0.18)' }]}>
                <Text style={[styles.seloTxt, { color: C.green }]}>NOME NA LISTA</Text>
              </View>
            )}
          </View>

          <Text style={styles.titulo}>{ev.titulo}</Text>

          {/* Quando */}
          <View style={styles.infoLinha}>
            <View style={styles.infoIcone}>
              <Feather name="calendar" size={16} color={C.pink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitulo}>{dataPorExtenso(ev.data_inicio)}</Text>
              <Text style={styles.dim}>
                {hora(ev.data_inicio)}
                {ev.data_fim ? ` até ${hora(ev.data_fim)}${new Date(ev.data_fim).toDateString() !== new Date(ev.data_inicio).toDateString() ? ' (dia seguinte)' : ''}` : ''}
              </Text>
            </View>
          </View>

          {/* Onde */}
          {ev.locais && (
            <View style={styles.infoLinha}>
              <View style={styles.infoIcone}>
                <Feather name="map-pin" size={16} color={C.pink} />
              </View>
              <TouchableOpacity
                style={{ flex: 1 }}
                disabled={!ev.local_id}
                onPress={() => ev.local_id && router.push(`/business/${ev.local_id}` as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.infoTitulo, ev.local_id ? { color: C.lilas } : null]}>{ev.locais.nome}</Text>
                <Text style={styles.dim}>
                  {[ev.locais.endereco, ev.locais.bairro_exibicao || ev.locais.bairro, ev.locais.cidade].filter(Boolean).join(' · ')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={comoChegar} style={styles.btnPequeno}>
                <Feather name="navigation" size={14} color="#FFF" />
                <Text style={styles.btnPequenoTxt}>Como chegar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista VIP */}
          {lista && (
            <View style={styles.vipCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="user-check" size={18} color={C.green} />
                <Text style={styles.vipTitulo}>{lista.titulo || 'Lista VIP'}</Text>
              </View>
              {vagas != null && <Text style={[styles.dim, { marginTop: 4 }]}>{vagas > 0 ? `${vagas} vagas disponíveis` : 'Lista lotada'}</Text>}

              {st ? (
                <View style={{ marginTop: 12, gap: 10 }}>
                  <View style={styles.statusLinha}>
                    <Feather name={st.icone as any} size={16} color={st.cor} />
                    <Text style={[styles.statusTxt, { color: st.cor }]}>{st.texto}</Text>
                  </View>
                  {status === 'aprovada' && (
                    <TouchableOpacity style={styles.btnPrincipal} onPress={() => atualizarStatus('checkin')} disabled={enviando}>
                      <Text style={styles.btnPrincipalTxt}>{enviando ? 'Confirmando...' : 'Cheguei — confirmar check-in'}</Text>
                    </TouchableOpacity>
                  )}
                  {status === 'check_in' && ev.local_id && (
                    <TouchableOpacity style={styles.btnPrincipal} onPress={() => router.push(`/business/${ev.local_id}` as any)}>
                      <Text style={styles.btnPrincipalTxt}>Avaliar {ev.locais?.nome || 'o local'}</Text>
                    </TouchableOpacity>
                  )}
                  {(status === 'solicitada' || status === 'aprovada') && (
                    <TouchableOpacity style={styles.btnSecundario} onPress={() => atualizarStatus('cancelar')} disabled={enviando}>
                      <Text style={styles.btnSecundarioTxt}>{enviando ? 'Cancelando...' : 'Cancelar meu nome'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : vagas === 0 ? null : (
                <View style={{ marginTop: 12, gap: 12 }}>
                  <View style={styles.acompRow}>
                    <Text style={styles.infoTitulo}>Acompanhantes</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity onPress={() => setAcompanhantes((n) => Math.max(0, n - 1))} style={styles.stepBtn} accessibilityLabel="Menos">
                        <Feather name="minus" size={16} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={styles.stepValor}>{acompanhantes}</Text>
                      <TouchableOpacity onPress={() => setAcompanhantes((n) => Math.min(5, n + 1))} style={styles.stepBtn} accessibilityLabel="Mais">
                        <Feather name="plus" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.btnPrincipal} onPress={enviarNome} disabled={enviando}>
                    <Feather name="edit-3" size={16} color="#FFF" />
                    <Text style={styles.btnPrincipalTxt}>{enviando ? 'Enviando...' : 'Colocar meu nome na lista'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.dim, { fontSize: 11 }]}>Usamos o nome do seu perfil. Leve um documento com foto na portaria.</Text>
                </View>
              )}
            </View>
          )}

          {/* Sobre */}
          {descricao && (
            <View style={{ marginTop: 22 }}>
              <Text style={styles.secao}>Sobre a festa</Text>
              <Text style={styles.descricao}>{descricao}</Text>
            </View>
          )}

          {/* Tags */}
          {grupos.map((g) => (
            <View key={g.titulo} style={{ marginTop: 18 }}>
              <Text style={styles.secaoPeq}>{g.titulo}</Text>
              <View style={styles.chips}>
                {g.tags.map((t) => (
                  <View key={t} style={styles.chip}>
                    <Text style={styles.chipTxt}>{rotuloTag(t)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity onPress={() => router.push('/(tabs)/events')} style={styles.verAgenda}>
            <Text style={styles.link}>Ver a agenda completa</Text>
            <Feather name="arrow-right" size={16} color={C.pink} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  flierBox: { height: 420, backgroundColor: '#1A1926', overflow: 'hidden' },
  flier: { position: 'absolute', top: 60, bottom: 10, left: 16, right: 16 },
  topoBotoes: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  botaoRedondo: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  corpo: { padding: 20 },
  selosLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  selo: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  seloTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  titulo: { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 14 },
  infoLinha: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, marginBottom: 10 },
  infoIcone: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0B0B0E', alignItems: 'center', justifyContent: 'center' },
  infoTitulo: { color: C.text, fontSize: 14, fontWeight: '800' },
  dim: { color: C.dim, fontSize: 12, lineHeight: 17 },
  link: { color: C.pink, fontSize: 14, fontWeight: '800' },
  btnPequeno: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.purple, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  btnPequenoTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  vipCard: { backgroundColor: C.card, borderWidth: 1, borderColor: 'rgba(76,175,125,0.35)', borderRadius: 16, padding: 16, marginTop: 6 },
  vipTitulo: { color: C.text, fontSize: 15, fontWeight: '800' },
  statusLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  statusTxt: { fontSize: 13, fontWeight: '700', flex: 1, lineHeight: 18 },
  acompRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#232230', alignItems: 'center', justifyContent: 'center' },
  stepValor: { color: C.text, fontSize: 16, fontWeight: '800', minWidth: 16, textAlign: 'center' },
  btnPrincipal: { flexDirection: 'row', gap: 8, height: 50, borderRadius: 14, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  btnPrincipalTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  btnSecundario: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  btnSecundarioTxt: { color: C.dim, fontSize: 13, fontWeight: '700' },
  secao: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  secaoPeq: { color: C.dim, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  descricao: { color: '#C8C8D6', fontSize: 13, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipTxt: { color: '#D0D0E0', fontSize: 12, fontWeight: '700' },
  verAgenda: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28 },
});
