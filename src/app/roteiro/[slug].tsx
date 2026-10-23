// Rodada 69 — página detalhada do roteiro / experiência (modelo "São Paulo
// LGBT+ em 1 dia"): topo com foto, duração · paradas · deslocamento, até 8
// tags principais, linha do tempo das paradas, sobre, todas as informações
// (tags por grupo), onde ficar perto do roteiro e os botões Salvar roteiro /
// Abrir no mapa.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/authContext';
import { distanciaMetros, formatarDistancia } from '../../lib/distancia';
import { buscarRoteiro, linkMapaRoteiro, Roteiro, tagsVisiveis } from '../../lib/roteiros';
import { supabase } from '../../lib/supabase';
import { GRUPOS_ROTEIRO, rotuloTag } from '../../lib/taxonomia';
import { useRastrearTela } from '../../lib/usoTelas';

const C = {
  bg: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  text: '#F5F5F7',
  dim: '#A0A0B2',
  pink: '#E1306C',
  purple: '#7E57C2',
  lilas: '#B39DDB',
  gold: '#FFD54F',
  green: '#4CAF7D',
};
const CORES_TAG = ['#E1306C', '#4CAF7D', '#B39DDB', '#FFB74D', '#4FC3F7', '#FFD54F', '#F48FB1', '#26C6DA'];
const ehUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

type Hospedagem = { id: string; nome: string; bairro: string | null; foto: string | null; rating: number; dist: number | null };

export default function RoteiroScreen() {
  useRastrearTela('roteiro', { detalheParam: 'slug' });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user, session } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [r, setR] = useState<Roteiro | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [hospedagens, setHospedagens] = useState<Hospedagem[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const rot = await buscarRoteiro(String(slug));
      setR(rot);
      setCarregando(false);
      if (!rot) return;
      if (user?.id && ehUuid(rot.id)) {
        const { data } = await supabase.from('roteiros_salvos').select('roteiro_id').eq('user_id', user.id).eq('roteiro_id', rot.id).maybeSingle();
        setSalvo(!!data);
      }
      // Onde ficar: hospedagens da cidade, das mais próximas do roteiro
      const pts = (rot.paradas || []).filter((p) => p.lat != null && p.lng != null);
      const centro = pts.length
        ? { lat: pts.reduce((s, p) => s + p.lat!, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng!, 0) / pts.length }
        : null;
      const base = 'id, nome, categoria, subcategoria, bairro, bairro_exibicao, foto_capa_url, galeria_fotos, rating_media, lat, lng';
      let res: any = await supabase.from('locais').select(`${base}, tipo_hospedagem`).eq('status', 'aprovado').eq('cidade', rot.cidade).limit(200);
      if (res.error) res = await supabase.from('locais').select(base).eq('status', 'aprovado').eq('cidade', rot.cidade).limit(200);
      const lista: Hospedagem[] = ((res.data as any[]) || [])
        .filter((l) => l.tipo_hospedagem || (l.categoria === 'turismo' && /hotel|pousada|hostel|hosped|resort|flat/i.test(l.subcategoria || '')))
        .map((l) => ({
          id: l.id,
          nome: l.nome,
          bairro: l.bairro_exibicao || l.bairro,
          foto: l.foto_capa_url || l.galeria_fotos?.[0] || null,
          rating: Number(l.rating_media) || 0,
          dist: centro && l.lat != null ? distanciaMetros(centro.lat, centro.lng, l.lat, l.lng) : null,
        }))
        .sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9))
        .slice(0, 3);
      setHospedagens(lista);
    })();
  }, [slug, user?.id]);

  const alternarSalvo = async () => {
    if (!r) return;
    if (!session || !user) {
      Alert.alert('Entre na sua conta', 'Crie sua conta ou entre para salvar roteiros.', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Entrar', onPress: () => router.push('/(tabs)/profile') },
      ]);
      return;
    }
    if (!ehUuid(r.id)) {
      setSalvo((v) => !v);
      return;
    }
    const q = supabase.from('roteiros_salvos');
    const { error } = salvo
      ? await q.delete().eq('user_id', user.id).eq('roteiro_id', r.id)
      : await q.insert({ user_id: user.id, roteiro_id: r.id });
    if (!error) setSalvo(!salvo);
  };

  const abrirMapa = () => {
    const url = r?.paradas ? linkMapaRoteiro(r.paradas) : null;
    if (url) Linking.openURL(url);
    else Alert.alert('Mapa', 'Este roteiro ainda não tem paradas com localização.');
  };

  if (carregando) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator color={C.pink} />
      </View>
    );
  }
  if (!r) {
    return (
      <View style={[styles.container, styles.centro, { paddingTop: insets.top }]}>
        <Feather name="map" size={26} color={C.dim} />
        <Text style={[styles.dim, { marginTop: 10 }]}>Roteiro não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={styles.link}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const visiveis = tagsVisiveis(r);
  const grupos = GRUPOS_ROTEIRO.filter((g) => g.id !== 'comercial')
    .map((g) => ({ titulo: g.titulo, tags: (r.tags?.[g.id] || []) as string[] }))
    .filter((g) => g.tags.length > 0);
  const paradas = r.paradas || [];
  const deslocamento = (r.tags?.deslocamento || []).filter((t) => t !== 'sem_carro').slice(0, 2).map(rotuloTag).join(' + ');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        {/* Topo */}
        <View style={styles.hero}>
          {r.foto_url ? <Image source={{ uri: r.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#21173A' }]} />}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
          <View style={[styles.topoBotoes, { top: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.redondo} accessibilityLabel="Voltar">
              <Feather name="chevron-left" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Share.share({ message: `${r.titulo} — roteiro no app Dicas LGBT+ 🏳️‍🌈` }).catch(() => {})}
              style={styles.redondo}
              accessibilityLabel="Compartilhar"
            >
              <Feather name="share-2" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.heroTexto}>
            <Text style={styles.heroRotulo}>Dicas Trip · {r.cidade}</Text>
            <Text style={styles.heroTitulo}>{r.titulo}</Text>
            {!!r.subtitulo && <Text style={styles.heroSub}>{r.subtitulo}</Text>}
          </View>
          {!!r.foto_url && !!r.foto_credito && <Text style={styles.credito}>{r.foto_credito}</Text>}
        </View>

        {/* Duração · paradas · deslocamento */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Feather name="calendar" size={18} color={C.pink} />
            <View>
              <Text style={styles.statValor}>{r.duracao_texto || (r.duracao ? rotuloTag(r.duracao) : '—')}</Text>
              <Text style={styles.statRot}>Duração</Text>
            </View>
          </View>
          <View style={styles.statDivisor} />
          <View style={styles.statItem}>
            <Feather name="map-pin" size={18} color={C.lilas} />
            <View>
              <Text style={styles.statValor}>{paradas.length || r.paradas_qtd || 0} paradas</Text>
              <Text style={styles.statRot}>Experiências</Text>
            </View>
          </View>
          {!!deslocamento && (
            <>
              <View style={styles.statDivisor} />
              <View style={[styles.statItem, { flexShrink: 1 }]}>
                <Feather name="navigation" size={18} color="#4FC3F7" />
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.statValor} numberOfLines={1}>{deslocamento}</Text>
                  <Text style={styles.statRot}>Como se locomover</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Tags principais (máx. 8) */}
        {visiveis.length > 0 && (
          <View style={styles.tagsLinha}>
            {visiveis.map((t, i) => (
              <View key={t} style={[styles.tag, { borderColor: CORES_TAG[i % CORES_TAG.length] }]}>
                <Text style={[styles.tagTxt, { color: CORES_TAG[i % CORES_TAG.length] }]}>{rotuloTag(t)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Linha do tempo */}
        {paradas.length > 0 && (
          <View style={styles.bloco}>
            <Text style={styles.secao}>Seu roteiro em detalhes</Text>
            <Text style={styles.dim}>Uma experiência completa por {r.cidade}, passo a passo.</Text>
            <View style={{ marginTop: 14 }}>
              {paradas.map((p, i) => {
                const ultima = i === paradas.length - 1;
                const acao = p.local_id
                  ? () => router.push(`/business/${p.local_id}` as any)
                  : p.lat != null
                  ? () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`)
                  : undefined;
                return (
                  <View key={p.id} style={styles.paradaLinha}>
                    <View style={styles.trilho}>
                      <View style={styles.ponto} />
                      {!ultima && <View style={styles.linha} />}
                    </View>
                    <TouchableOpacity style={styles.paradaCard} activeOpacity={acao ? 0.85 : 1} onPress={acao} disabled={!acao}>
                      <View style={{ flex: 1, padding: 12 }}>
                        {!!p.horario && <Text style={styles.horario}>{p.horario}</Text>}
                        <Text style={styles.paradaTitulo}>{p.titulo}</Text>
                        {!!p.descricao && <Text style={styles.paradaDesc}>{p.descricao}</Text>}
                        {!!p.endereco && (
                          <Text style={styles.paradaEnd} numberOfLines={1}>
                            <Feather name="map-pin" size={11} color={C.dim} /> {p.endereco}
                          </Text>
                        )}
                      </View>
                      {!!p.foto_url && <Image source={{ uri: p.foto_url }} style={styles.paradaFoto} resizeMode="cover" />}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Sobre + reserva */}
        {(!!r.descricao || !!r.preco_texto || !!r.link_reserva) && (
          <View style={styles.bloco}>
            <Text style={styles.secao}>Sobre</Text>
            {!!r.descricao && <Text style={styles.texto}>{r.descricao}</Text>}
            {!!r.preco_texto && (
              <View style={styles.preco}>
                <Feather name="tag" size={14} color={C.green} />
                <Text style={styles.precoTxt}>{r.preco_texto}</Text>
              </View>
            )}
            {!!r.link_reserva && (
              <TouchableOpacity style={styles.btnReserva} onPress={() => Linking.openURL(r.link_reserva!)}>
                <Feather name="calendar" size={16} color="#FFF" />
                <Text style={styles.btnTxt}>Reservar</Text>
                <Feather name="external-link" size={14} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Todas as informações */}
        {grupos.length > 0 && (
          <View style={styles.bloco}>
            <Text style={styles.secao}>Mais informações</Text>
            {grupos.map((g) => (
              <View key={g.titulo} style={{ marginTop: 10 }}>
                <Text style={styles.grupoTitulo}>{g.titulo}</Text>
                <View style={styles.tagsLinhaSemMargem}>
                  {g.tags.map((t) => (
                    <View key={t} style={styles.chip}>
                      <Text style={styles.chipTxt}>{rotuloTag(t)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Onde ficar */}
        {hospedagens.length > 0 && (
          <View style={styles.bloco}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.secao}>Onde ficar perto do roteiro</Text>
              {!!r.destino_slug && (
                <TouchableOpacity onPress={() => router.push(`/destino/${r.destino_slug}` as any)}>
                  <Text style={styles.link}>Ver mais</Text>
                </TouchableOpacity>
              )}
            </View>
            {hospedagens.map((h) => (
              <TouchableOpacity key={h.id} style={styles.hotel} onPress={() => router.push(`/business/${h.id}` as any)} activeOpacity={0.85}>
                {h.foto ? (
                  <Image source={{ uri: h.foto }} style={styles.hotelFoto} />
                ) : (
                  <View style={[styles.hotelFoto, styles.centro, { backgroundColor: '#21173A' }]}>
                    <Feather name="home" size={20} color={C.lilas} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={[styles.seloPeq, { backgroundColor: '#4CAF7D' }]}>
                    <Text style={[styles.seloPeqTxt, { color: '#06200F' }]}>HOSPEDAGEM</Text>
                  </View>
                  <Text style={styles.paradaTitulo} numberOfLines={1}>{h.nome}</Text>
                  <Text style={styles.paradaEnd} numberOfLines={1}>
                    {[h.bairro, h.dist != null ? `a ${formatarDistancia(h.dist)} do roteiro` : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {h.rating > 0 && <Text style={styles.rating}>★ {h.rating.toFixed(1)}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Ações fixas */}
      <View style={[styles.rodape, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.btnSalvar} onPress={alternarSalvo}>
          <Feather name="heart" size={18} color={C.pink} />
          <Text style={[styles.btnTxt, { color: C.pink }]}>{salvo ? 'Roteiro salvo' : 'Salvar roteiro'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnMapa} onPress={abrirMapa}>
          <Feather name="map" size={18} color="#FFF" />
          <Text style={styles.btnTxt}>Abrir no mapa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  dim: { color: C.dim, fontSize: 12, lineHeight: 17 },
  link: { color: C.pink, fontSize: 13, fontWeight: '800' },
  hero: { height: 340, justifyContent: 'flex-end', overflow: 'hidden' },
  topoBotoes: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  redondo: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  heroTexto: { padding: 18 },
  heroRotulo: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  heroTitulo: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 2 },
  heroSub: { color: '#E6E3EF', fontSize: 13, lineHeight: 18, marginTop: 6 },
  credito: { position: 'absolute', right: 10, bottom: 6, color: 'rgba(255,255,255,0.6)', fontSize: 9 },
  stats: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: -6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, gap: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statValor: { color: C.text, fontSize: 13, fontWeight: '800' },
  statRot: { color: C.dim, fontSize: 10 },
  statDivisor: { width: 1, alignSelf: 'stretch', backgroundColor: C.border },
  tagsLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginTop: 14 },
  tagsLinhaSemMargem: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagTxt: { fontSize: 11, fontWeight: '800' },
  bloco: { paddingHorizontal: 16, marginTop: 22 },
  secao: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 2 },
  texto: { color: '#C8C8D6', fontSize: 13, lineHeight: 20, marginTop: 6 },
  paradaLinha: { flexDirection: 'row', gap: 10 },
  trilho: { width: 18, alignItems: 'center' },
  ponto: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: C.purple, backgroundColor: C.bg, marginTop: 14 },
  linha: { width: 2, flex: 1, backgroundColor: C.purple, marginTop: 2 },
  paradaCard: { flex: 1, flexDirection: 'row', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  horario: { color: C.pink, fontSize: 14, fontWeight: '900' },
  paradaTitulo: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 2 },
  paradaDesc: { color: C.dim, fontSize: 12, lineHeight: 17, marginTop: 3 },
  paradaEnd: { color: C.dim, fontSize: 11, marginTop: 4 },
  paradaFoto: { width: 110 },
  preco: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  precoTxt: { color: C.green, fontSize: 13, fontWeight: '800' },
  btnReserva: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.purple, borderRadius: 12, height: 46, marginTop: 12 },
  grupoTitulo: { color: C.dim, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  chip: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipTxt: { color: '#D0D0E0', fontSize: 11, fontWeight: '700' },
  hotel: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 10, marginTop: 10 },
  hotelFoto: { width: 70, height: 70, borderRadius: 10 },
  seloPeq: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 3 },
  seloPeqTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  rating: { color: C.gold, fontSize: 13, fontWeight: '800' },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: 'rgba(11,11,14,0.96)', borderTopWidth: 1, borderTopColor: C.border },
  btnSalvar: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: C.pink },
  btnMapa: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, backgroundColor: C.purple },
  btnTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
