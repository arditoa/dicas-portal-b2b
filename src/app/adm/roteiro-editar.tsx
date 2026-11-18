// Modo equipe · Editar roteiro (18/11): texto do roteiro, publicar, e as paradas (mudar, reordenar, acrescentar, tirar).
//   Tabelas roteiros / roteiro_paradas (migração 039). Fotos e tags completas: portal (Admin › Roteiros).
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { supabase } from '../../lib/supabase';

type Rot = { id: string; titulo: string; subtitulo: string | null; descricao: string | null; duracao_texto: string | null; preco_texto: string | null; status: string; destaque: boolean; foto_url: string | null; cidade: string; patrocinador_id?: string | null };
type Casa = { id: string; nome: string };
type Par = { id: string | null; ordem: number; horario: string; titulo: string; descricao: string; endereco: string; local_id: string | null; local_nome?: string };

// Busca de casas do app (patrocinador do roteiro ou casa da parada).
function BuscaCasa({ rotulo, valor, aoMudar, cidade }: { rotulo: string; valor: Casa | null; aoMudar: (c: Casa | null) => void; cidade?: string }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Casa[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const t = setTimeout(async () => {
      let qb = (supabase.from('locais') as any).select('id, nome').eq('status', 'aprovado').ilike('nome', `%${q.trim()}%`).limit(6);
      if (cidade) qb = qb.eq('cidade', cidade);
      const { data } = await qb;
      setRes((data as Casa[]) || []);
    }, 300);
    return () => clearTimeout(t);
  }, [q, cidade]);
  return (
    <View>
      <Text style={c.rot}>{rotulo}</Text>
      {valor ? (
        <View style={[sa.card, { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0 }]}>
          <Feather name="home" size={14} color={CA.verde} /><Text style={[sa.tit, { flex: 1 }]} numberOfLines={1}>{valor.nome}</Text>
          <TouchableOpacity onPress={() => aoMudar(null)} hitSlop={8} accessibilityLabel="Tirar casa"><Feather name="x" size={16} color="#F87171" /></TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput value={q} onChangeText={setQ} placeholder="Buscar casa pelo nome" placeholderTextColor={CA.fraco} style={sa.campoBusca} />
          {res.map((x) => (
            <TouchableOpacity key={x.id} style={{ paddingVertical: 8 }} onPress={() => { aoMudar(x); setQ(''); }}><Text style={sa.tit}>{x.nome}</Text></TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}

export default function RoteiroEditar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [r, setR] = useState<Rot | null>(null);
  const [paradas, setParadas] = useState<Par[]>([]);
  const [forma, setForma] = useState<Par | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [patroc, setPatroc] = useState<Casa | null>(null);

  const carregar = useCallback(async () => {
    const [a, b] = await Promise.all([
      (supabase.from('roteiros') as any).select('id, titulo, subtitulo, descricao, duracao_texto, preco_texto, status, destaque, foto_url, cidade').eq('id', id).maybeSingle(),
      (supabase.from('roteiro_paradas') as any).select('id, ordem, horario, titulo, descricao, endereco, local_id, locais(nome)').eq('roteiro_id', id).order('ordem'),
    ]);
    setR((a.data as Rot) || null);
    setParadas(((b.data as any[]) || []).map((p) => ({ id: p.id, ordem: p.ordem, horario: p.horario || '', titulo: p.titulo, descricao: p.descricao || '', endereco: p.endereco || '', local_id: p.local_id || null, local_nome: p.locais?.nome })));
    // 158: patrocinador do roteiro (sem a migração, segue sem)
    const pt: any = await (supabase.from('roteiros') as any).select('patrocinador_id, locais:patrocinador_id(id, nome)').eq('id', id).maybeSingle();
    if (!pt.error) setPatroc(pt.data?.locais || null);
  }, [id]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async () => {
    if (!r) return;
    if (r.titulo.trim().length < 3) return Alert.alert('Roteiro', 'Escreva o título.');
    setSalvando(true);
    const { error } = await (supabase.from('roteiros') as any).update({
      titulo: r.titulo.trim(), subtitulo: r.subtitulo?.trim() || null, descricao: r.descricao?.trim() || null,
      duracao_texto: r.duracao_texto?.trim() || null, preco_texto: r.preco_texto?.trim() || null, status: r.status, destaque: r.destaque, foto_url: r.foto_url, updated_at: new Date().toISOString(),
    }).eq('id', r.id);
    if (!error) {
      const p = await (supabase.from('roteiros') as any).update({ patrocinador_id: patroc?.id || null }).eq('id', r.id);
      if (p.error && patroc) Alert.alert('Patrocínio', 'Rode a migração 158 para ligar o patrocínio do roteiro.');
    }
    setSalvando(false);
    if (error) return Alert.alert('Roteiro', error.message);
    Alert.alert('Pronto', 'Roteiro salvo.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const gravarOrdem = async (l: Par[]) => {
    setParadas(l);
    for (let i = 0; i < l.length; i++) if (l[i].id) await (supabase.from('roteiro_paradas') as any).update({ ordem: i }).eq('id', l[i].id);
  };
  const mover = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= paradas.length) return; const l = paradas.slice(); [l[i], l[j]] = [l[j], l[i]]; void gravarOrdem(l); };
  const salvarParada = async () => {
    if (!forma) return;
    if (forma.titulo.trim().length < 2) return Alert.alert('Parada', 'Escreva o nome da parada.');
    const dados = { roteiro_id: id, ordem: forma.id ? forma.ordem : paradas.length, horario: forma.horario.trim() || null, titulo: forma.titulo.trim(), descricao: forma.descricao.trim() || null, endereco: forma.endereco.trim() || null, local_id: forma.local_id };
    const res = forma.id ? await (supabase.from('roteiro_paradas') as any).update(dados).eq('id', forma.id) : await (supabase.from('roteiro_paradas') as any).insert(dados);
    if (res.error) return Alert.alert('Parada', res.error.message);
    setForma(null); void carregar();
  };
  const tirarParada = () => {
    if (!forma?.id) return;
    Alert.alert('Tirar esta parada?', forma.titulo, [{ text: 'Voltar', style: 'cancel' }, { text: 'Tirar', style: 'destructive', onPress: async () => {
      const { error } = await (supabase.from('roteiro_paradas') as any).delete().eq('id', forma.id);
      if (error) return Alert.alert('Parada', error.message);
      setForma(null); void carregar();
    } }]);
  };

  const subirFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Fotos', 'Libere o acesso às fotos nos Ajustes do celular.');
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] });
    if (res.canceled || !res.assets?.[0]?.uri || !r) return;
    setSubindo(true);
    try {
      const buf = await (await fetch(res.assets[0].uri)).arrayBuffer();
      const caminho = `roteiros/${r.id}-${Date.now()}.jpg`;
      const up = await supabase.storage.from('fotos-destinos').upload(caminho, buf, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw new Error(up.error.message);
      setR({ ...r, foto_url: supabase.storage.from('fotos-destinos').getPublicUrl(caminho).data.publicUrl });
    } catch (e: any) { Alert.alert('Foto', e?.message || 'Não deu para subir agora.'); } finally { setSubindo(false); }
  };

  if (!r) return <TelaAdm titulo="Roteiro" voltar><ActivityIndicator color={CA.rosa} /></TelaAdm>;
  const campo = (rot: string, v: string | null, mudar: (x: string) => void, extra?: object) => (
    <><Text style={c.rot}>{rot}</Text><TextInput value={v || ''} onChangeText={mudar} placeholderTextColor={CA.fraco} style={[sa.campoBusca, extra]} multiline={!!extra} /></>
  );

  return (
    <TelaAdm titulo="Editar roteiro" subtitulo={r.status === 'publicado' ? 'No ar na página da cidade' : 'Rascunho: só a equipe vê'} voltar>
      <View style={[sa.card, { gap: 10 }]}>
        <View style={c.linha}><View style={{ flex: 1 }}><Text style={sa.tit}>No ar</Text><Text style={sa.sub}>Desligado: rascunho</Text></View>
          <Switch value={r.status === 'publicado'} onValueChange={(v) => setR({ ...r, status: v ? 'publicado' : 'rascunho' })} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" /></View>
        <View style={c.linha}><View style={{ flex: 1 }}><Text style={sa.tit}>Destaque</Text><Text style={sa.sub}>Vem primeiro na cidade</Text></View>
          <Switch value={r.destaque} onValueChange={(v) => setR({ ...r, destaque: v })} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" /></View>
      </View>
      <TouchableOpacity style={c.foto} onPress={() => void subirFoto()} accessibilityRole="button" accessibilityLabel="Trocar foto do roteiro">
        {r.foto_url ? <Image source={{ uri: r.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={c.fotoBotao}>{subindo ? <ActivityIndicator color="#FFF" /> : <><Feather name="camera" size={14} color="#FFF" /><Text style={c.fotoTxt}>{r.foto_url ? 'Trocar foto' : 'Pôr foto (sem foto, usa a da cidade)'}</Text></>}</View>
      </TouchableOpacity>
      <BuscaCasa rotulo="Patrocínio: casa que oferece o roteiro (opcional)" valor={patroc} aoMudar={setPatroc} cidade={r.cidade} />
      <Text style={[sa.vazio, { marginTop: 4 }]}>Aparece "Oferecido por" no roteiro. Bares e casas podem patrocinar e entrar como parada.</Text>
      {campo('Título *', r.titulo, (v) => setR({ ...r, titulo: v }))}
      {campo('Subtítulo', r.subtitulo, (v) => setR({ ...r, subtitulo: v }))}
      {campo('Descrição', r.descricao, (v) => setR({ ...r, descricao: v }), { height: 90, paddingTop: 10, textAlignVertical: 'top' })}
      {campo('Duração (ex.: 1 dia)', r.duracao_texto, (v) => setR({ ...r, duracao_texto: v }))}
      {campo('Preço (ex.: Grátis, consumo à parte)', r.preco_texto, (v) => setR({ ...r, preco_texto: v }))}

      <Text style={sa.secao}>PARADAS · {paradas.length}</Text>
      <View style={sa.lista}>
        {paradas.length === 0 && <Text style={[sa.vazio, { padding: 14 }]}>Nenhuma parada. Acrescente abaixo.</Text>}
        {paradas.map((p, i) => (
          <View key={p.id || i} style={[sa.linha, i < paradas.length - 1 && sa.borda]}>
            <View style={{ gap: 2 }}>
              <TouchableOpacity onPress={() => mover(i, -1)} disabled={i === 0} hitSlop={6}><Feather name="chevron-up" size={16} color={i === 0 ? '#3A3950' : CA.dim} /></TouchableOpacity>
              <TouchableOpacity onPress={() => mover(i, 1)} disabled={i === paradas.length - 1} hitSlop={6}><Feather name="chevron-down" size={16} color={i === paradas.length - 1 ? '#3A3950' : CA.dim} /></TouchableOpacity>
            </View>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setForma({ ...p })} accessibilityRole="button">
              <Text style={sa.tit} numberOfLines={1}>{i + 1}. {p.titulo}</Text>
              <Text style={sa.sub} numberOfLines={1}>{[p.horario, p.local_nome, p.endereco].filter(Boolean).join(' · ') || 'Toque para editar'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TouchableOpacity style={sa.botaoSec} onPress={() => setForma({ id: null, ordem: paradas.length, horario: '', titulo: '', descricao: '', endereco: '', local_id: null })}>
        <Feather name="plus" size={14} color={CA.texto} /><Text style={sa.botaoSecTxt}>Acrescentar parada</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[sa.botao, { marginTop: 16 }, salvando && { opacity: 0.6 }]} onPress={() => void salvar()} disabled={salvando}>
        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={sa.botaoTxt}>Salvar roteiro</Text>}
      </TouchableOpacity>

      <Modal visible={!!forma} transparent animationType="slide" onRequestClose={() => setForma(null)}>
        <KeyboardAvoidingView style={c.fundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={c.folha}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[sa.tit, { fontSize: 15 }]}>{forma?.id ? 'Editar parada' : 'Nova parada'}</Text>
              {forma && campo('Nome da parada *', forma.titulo, (v) => setForma({ ...forma, titulo: v }))}
              {forma && campo('Horário (ex.: 10h)', forma.horario, (v) => setForma({ ...forma, horario: v }))}
              {forma && campo('Endereço', forma.endereco, (v) => setForma({ ...forma, endereco: v }))}
              {forma && <BuscaCasa rotulo="Casa do app nesta parada (opcional)" valor={forma.local_id ? { id: forma.local_id, nome: forma.local_nome || 'Casa' } : null} aoMudar={(x) => setForma({ ...forma, local_id: x?.id || null, local_nome: x?.nome })} cidade={r.cidade} />}
              {forma && campo('O que fazer ali', forma.descricao, (v) => setForma({ ...forma, descricao: v }), { height: 80, paddingTop: 10, textAlignVertical: 'top' })}
              <TouchableOpacity style={[sa.botao, { marginTop: 16 }]} onPress={() => void salvarParada()}><Text style={sa.botaoTxt}>Salvar parada</Text></TouchableOpacity>
              {!!forma?.id && <TouchableOpacity style={[sa.botaoSec, { marginTop: 10 }]} onPress={tirarParada}><Text style={[sa.botaoSecTxt, { color: '#F87171' }]}>Tirar parada</Text></TouchableOpacity>}
              <TouchableOpacity style={[sa.botaoSec, { marginTop: 10 }]} onPress={() => setForma(null)}><Text style={sa.botaoSecTxt}>Cancelar</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foto: { height: 150, borderRadius: 16, overflow: 'hidden', backgroundColor: '#21173A', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 },
  fotoBotao: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginBottom: 10 },
  fotoTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  rot: { color: CA.dim, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '88%' },
});
