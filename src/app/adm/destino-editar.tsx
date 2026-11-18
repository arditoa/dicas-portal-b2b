// Modo equipe · Criar / editar um destino da Dicas Trip (tabela destinos, migrations 036/038/149).
//   ?slug=<destino> edita; sem slug cria. Aberto = página no ar; Em breve = aparece apagado com "avise-me".
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { normTxt } from '../../lib/subcategorias';
import { supabase } from '../../lib/supabase';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const slugDe = (cidade: string) => normTxt(cidade).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function DestinoEditar() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();
  const [carregando, setCarregando] = useState(!!slug);
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');
  const [vibe, setVibe] = useState('');
  const [descricao, setDescricao] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [credito, setCredito] = useState('');
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [evento, setEvento] = useState(false); // 156: evento especial (Carnaval, Copa…)
  const [selo, setSelo] = useState('');
  const [ordem, setOrdem] = useState(99);
  const [subindo, setSubindo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from('destinos').select('*').eq('slug', slug).maybeSingle();
      const d = data as any;
      if (d) {
        setCidade(d.cidade || ''); setUf(d.uf || 'SP'); setVibe(d.vibe || ''); setDescricao(d.descricao || '');
        setFoto(d.foto_url || null); setCredito(d.foto_credito || ''); setAberto(!!d.aberto); setAtivo(d.ativo !== false); setOrdem(d.ordem ?? 99); setEvento(!!d.evento); setSelo(d.selo || '');
      }
      setCarregando(false);
    })();
  }, [slug]);

  const subirFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Fotos', 'Libere o acesso às fotos nos Ajustes do celular.');
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    setSubindo(true);
    try {
      const buf = await (await fetch(r.assets[0].uri)).arrayBuffer();
      const caminho = `destinos/${slugDe(cidade) || 'destino'}-${Date.now()}.jpg`;
      const up = await supabase.storage.from('fotos-destinos').upload(caminho, buf, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw new Error(up.error.message);
      setFoto(supabase.storage.from('fotos-destinos').getPublicUrl(caminho).data.publicUrl);
    } catch (e: any) { Alert.alert('Foto', e?.message || 'Não deu para subir agora.'); } finally { setSubindo(false); }
  };

  const salvar = async () => {
    if (cidade.trim().length < 2) return Alert.alert('Destino', 'Escreva a cidade.');
    const s = slug || slugDe(cidade);
    setSalvando(true);
    const dados: any = { slug: s, cidade: cidade.trim(), uf, vibe: vibe.trim() || null, descricao: descricao.trim() || null, foto_url: foto, foto_credito: credito.trim() || null, aberto, ativo, ordem, evento, selo: evento ? selo.trim() || null : null };
    let r = slug ? await supabase.from('destinos').update(dados).eq('slug', slug) : await supabase.from('destinos').insert(dados);
    if (r.error && /evento|selo/.test(r.error.message)) {
      delete dados.evento; delete dados.selo; // sem a migration 156
      r = slug ? await supabase.from('destinos').update(dados).eq('slug', slug) : await supabase.from('destinos').insert(dados);
    }
    if (r.error && /aberto/.test(r.error.message)) {
      delete dados.aberto;
      r = slug ? await supabase.from('destinos').update(dados).eq('slug', slug) : await supabase.from('destinos').insert(dados);
      if (!r.error) Alert.alert('Destino', 'Salvo. Para marcar Aberto/Em breve, rode a migração 149.');
    }
    setSalvando(false);
    if (r.error) return Alert.alert('Destino', r.error.message.includes('duplicate') ? 'Já existe um destino com essa cidade.' : r.error.message);
    router.back();
  };

  if (carregando) return <TelaAdm titulo="Destino" voltar><ActivityIndicator color={CA.rosa} /></TelaAdm>;
  return (
    <TelaAdm titulo={slug ? `Editar · ${cidade}` : 'Novo destino'} subtitulo="Dicas Trip › Destinos" voltar>
      <View style={c.foto}>
        {foto ? <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Feather name="image" size={26} color={CA.fraco} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        <Text style={c.fotoTit}>{cidade || 'Cidade'}</Text>
        <Text style={c.fotoUf}>{uf}{aberto ? '' : ' · EM BREVE'}</Text>
      </View>
      <TouchableOpacity style={[sa.botaoSec, { alignSelf: 'flex-start', marginBottom: 6 }]} onPress={() => void subirFoto()} disabled={subindo}>
        {subindo ? <ActivityIndicator color={CA.rosa} /> : <><Feather name="upload" size={14} color={CA.texto} /><Text style={sa.botaoSecTxt}>{foto ? 'Trocar foto' : 'Subir foto'}</Text></>}
      </TouchableOpacity>

      <View style={[sa.card, { gap: 12 }]}>
        <View style={c.linha}><View style={{ flex: 1 }}><Text style={sa.tit}>Aberto</Text><Text style={sa.sub}>{aberto ? 'Página no ar com as casas da cidade' : 'Em breve: aparece apagado, com "avise-me"'}</Text></View>
          <Switch value={aberto} onValueChange={setAberto} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" /></View>
        <View style={c.linha}><View style={{ flex: 1 }}><Text style={sa.tit}>Aparece na Trip</Text><Text style={sa.sub}>Desligado: some da lista de destinos</Text></View>
          <Switch value={ativo} onValueChange={setAtivo} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" /></View>
        <View style={c.linha}><View style={{ flex: 1 }}><Text style={sa.tit}>Evento especial</Text><Text style={sa.sub}>{evento ? 'Ex.: Carnaval, Parada SP, Copa: vem primeiro em Próximas viagens' : 'Cidade (destino normal)'}</Text></View>
          <Switch value={evento} onValueChange={setEvento} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" /></View>
        {evento && (
          <View>
            <Text style={[sa.sub, { marginBottom: 6 }]}>Selo de data no cartão</Text>
            <TextInput value={selo} onChangeText={setSelo} placeholder="Ex.: FEV 2027" placeholderTextColor={CA.fraco} maxLength={16} autoCapitalize="characters" style={sa.campoBusca} />
          </View>
        )}
      </View>

      <Text style={c.rot}>Cidade *</Text>
      <TextInput value={cidade} onChangeText={setCidade} editable={!slug} placeholder="Ex.: Florianópolis" placeholderTextColor={CA.fraco} style={[sa.campoBusca, !!slug && { opacity: 0.6 }]} />
      <Text style={c.rot}>Estado</Text>
      <View style={c.ufs}>{UFS.map((u) => <TouchableOpacity key={u} style={[c.uf, uf === u && c.ufOn]} onPress={() => setUf(u)}><Text style={[c.ufTxt, uf === u && { color: '#0B0B0E' }]}>{u}</Text></TouchableOpacity>)}</View>
      <Text style={c.rot}>Frase (vibe)</Text>
      <TextInput value={vibe} onChangeText={setVibe} placeholder="Ex.: praia, sol e a noite mais animada do sul" placeholderTextColor={CA.fraco} maxLength={80} style={sa.campoBusca} />
      <Text style={c.rot}>Descrição (opcional)</Text>
      <TextInput value={descricao} onChangeText={setDescricao} multiline placeholderTextColor={CA.fraco} maxLength={400} style={[sa.campoBusca, { height: 90, paddingTop: 10, textAlignVertical: 'top' }]} />
      <Text style={c.rot}>Crédito da foto (opcional)</Text>
      <TextInput value={credito} onChangeText={setCredito} placeholderTextColor={CA.fraco} maxLength={80} style={sa.campoBusca} />
      <Text style={c.rot}>Ordem na lista</Text>
      <TextInput value={String(ordem)} onChangeText={(v) => setOrdem(Number(v.replace(/\D/g, '')) || 0)} keyboardType="number-pad" style={[sa.campoBusca, { width: 90 }]} />

      <TouchableOpacity style={[sa.botao, { marginTop: 18 }, salvando && { opacity: 0.6 }]} onPress={() => void salvar()} disabled={salvando}>
        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={sa.botaoTxt}>{slug ? 'Salvar' : 'Criar destino'}</Text>}
      </TouchableOpacity>
      <Text style={[sa.vazio, { marginTop: 10 }]}>Roteiros e temas da cidade: no portal (Destinos).</Text>
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  foto: { height: 150, borderRadius: 16, overflow: 'hidden', backgroundColor: CA.card, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  fotoTit: { position: 'absolute', bottom: 30, left: 14, color: '#FFF', fontSize: 18, fontWeight: '800' },
  fotoUf: { position: 'absolute', bottom: 12, left: 14, color: '#FFF', fontSize: 11, fontWeight: '700', opacity: 0.85 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rot: { color: CA.dim, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  ufs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  uf: { borderWidth: 1, borderColor: CA.borda, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  ufOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  ufTxt: { color: CA.texto, fontSize: 11, fontWeight: '700' },
});
