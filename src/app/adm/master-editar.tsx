// Modo equipe · Topo 1 (Patrocinador da categoria / Banner Master). Uma vaga por categoria (categoria_patrocinio).
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import FundoCaixaDegrade from '../../components/FundoCaixaDegrade';
import { CATEGORIAS } from '../../lib/categorias';
import { supabase } from '../../lib/supabase';

const CORES: [string, string][] = [['#E1306C', '#7E57C2'], ['#6D28D9', '#DB2777'], ['#0DA372', '#0E7490'], ['#0A8FD0', '#7048B8'], ['#CC7A0A', '#9A4A0A'], ['#F2692A', '#C42660'], ['#111111', '#3A3950']];
type Casa = { id: string; nome: string };

export default function MasterEditar() {
  const router = useRouter();
  const { categoria } = useLocalSearchParams<{ categoria: string }>();
  const [carregando, setCarregando] = useState(true);
  const [id, setId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [tag, setTag] = useState('PATROCINADOR DA CATEGORIA');
  const [subtitulo, setSubtitulo] = useState('');
  const [cta, setCta] = useState('Conhecer');
  const [destino, setDestino] = useState('');
  const [casa, setCasa] = useState<Casa | null>(null);
  const [busca, setBusca] = useState('');
  const [achadas, setAchadas] = useState<Casa[]>([]);
  const [cor, setCor] = useState<[string, string]>(CORES[0]);
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const nomeCat = categoria === 'trip' ? 'Dicas Trip' : (categoria || '').includes('--') ? `${(CATEGORIAS as any)[(categoria || '').split('--')[0]]?.label || ''} › ${(categoria || '').split('--')[1]}` : (categoria || '').startsWith('destino-') ? `Trip · ${(categoria || '').slice(8).replace(/-/g, ' ')}` : (CATEGORIAS as any)[categoria || '']?.label || categoria;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categoria_patrocinio').select('*').eq('categoria', categoria).maybeSingle();
      const m = data as any;
      if (m) {
        setId(m.id); setTitulo(m.titulo || ''); setTag(m.tag || ''); setSubtitulo(m.subtitulo || ''); setCta(m.cta || 'Conhecer');
        setCor([m.cor1, m.cor2]); setAtivo(m.ativo);
        if ((m.destino || '').startsWith('local:') || m.local_id) {
          const lid = m.local_id || m.destino.slice(6);
          const { data: l } = await supabase.from('locais').select('id, nome').eq('id', lid).maybeSingle();
          if (l) setCasa(l as Casa);
        } else setDestino(m.destino || '');
      }
      setCarregando(false);
    })();
  }, [categoria]);

  useEffect(() => {
    if (casa || busca.trim().length < 2) { setAchadas([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('locais').select('id, nome').eq('status', 'aprovado').ilike('nome', `%${busca.trim()}%`).limit(6);
      setAchadas((data as Casa[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [busca, casa]);

  const salvar = async () => {
    if (!titulo.trim()) return Alert.alert('Patrocinador', 'Escreva o título (ex.: o nome da marca).');
    setSalvando(true);
    const dados = {
      categoria, titulo: titulo.trim(), tag: tag.trim() || 'PATROCINADOR DA CATEGORIA', subtitulo: subtitulo.trim() || null, cta: cta.trim() || 'Conhecer',
      local_id: casa?.id ?? null, destino: casa ? `local:${casa.id}` : destino.trim(), cor1: cor[0], cor2: cor[1], ativo, updated_at: new Date().toISOString(),
    };
    const r = id
      ? await (supabase.from('categoria_patrocinio') as any).update(dados).eq('id', id)
      : await (supabase.from('categoria_patrocinio') as any).insert(dados);
    setSalvando(false);
    if (r.error) return Alert.alert('Patrocinador', r.error.message);
    router.back();
  };
  const tirar = () => Alert.alert('Liberar a vaga?', 'O patrocinador sai e o app volta a mostrar “Sua marca aqui”.', [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Liberar', style: 'destructive', onPress: async () => { const { error } = await supabase.from('categoria_patrocinio').delete().eq('id', id); if (error) return Alert.alert('Patrocinador', error.message); router.back(); } },
  ]);

  if (carregando) return <TelaAdm titulo="Patrocinador" voltar><ActivityIndicator color={CA.rosa} /></TelaAdm>;
  return (
    <TelaAdm titulo={`Topo 1 · ${nomeCat}`} subtitulo="Patrocinador da categoria · fixo, 1 vaga" voltar>
      <View style={c.previa}>
        <FundoCaixaDegrade id="master-previa" cores={cor} />
        <Text style={c.previaTag}>{tag || 'PATROCINADOR DA CATEGORIA'}</Text>
        <Text style={c.previaTit} numberOfLines={2}>{titulo || 'Nome da marca'}</Text>
        <View style={c.previaBtn}><Text style={c.previaBtnTxt}>{cta || 'Conhecer'}</Text></View>
      </View>
      <View style={[sa.card, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={[sa.tit, { flex: 1 }]}>No ar</Text>
        <Switch value={ativo} onValueChange={setAtivo} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
      </View>
      <Text style={c.rot}>Título *</Text>
      <TextInput value={titulo} onChangeText={setTitulo} placeholder="Ex.: Bares by Amstel" placeholderTextColor={CA.fraco} maxLength={60} style={sa.campoBusca} />
      <Text style={c.rot}>Etiqueta</Text>
      <TextInput value={tag} onChangeText={setTag} autoCapitalize="characters" maxLength={30} style={sa.campoBusca} placeholderTextColor={CA.fraco} />
      <Text style={c.rot}>Frase (opcional)</Text>
      <TextInput value={subtitulo} onChangeText={setSubtitulo} maxLength={80} style={sa.campoBusca} placeholder="Ex.: A cerveja oficial da noite LGBT+" placeholderTextColor={CA.fraco} />
      <Text style={c.rot}>Botão</Text>
      <TextInput value={cta} onChangeText={setCta} maxLength={20} style={sa.campoBusca} placeholderTextColor={CA.fraco} />
      <Text style={c.rot}>Ao tocar, abre</Text>
      {casa ? (
        <View style={[sa.card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Feather name="map-pin" size={15} color={CA.verde} /><Text style={[sa.tit, { flex: 1 }]}>{casa.nome}</Text>
          <TouchableOpacity onPress={() => setCasa(null)}><Text style={c.trocar}>Trocar</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar uma casa…" placeholderTextColor={CA.fraco} style={sa.campoBusca} />
          {achadas.length > 0 && <View style={[sa.lista, { marginTop: 6 }]}>{achadas.map((k, i) => <TouchableOpacity key={k.id} style={[sa.linha, i < achadas.length - 1 && sa.borda]} onPress={() => setCasa(k)}><Text style={sa.tit}>{k.nome}</Text></TouchableOpacity>)}</View>}
          <TextInput value={destino} onChangeText={setDestino} placeholder="…ou um link (https://…)" placeholderTextColor={CA.fraco} autoCapitalize="none" style={[sa.campoBusca, { marginTop: 8 }]} />
        </>
      )}
      <Text style={c.rot}>Cores</Text>
      <View style={c.cores}>
        {CORES.map((k) => <TouchableOpacity key={k.join()} onPress={() => setCor(k)}><View style={[c.cor, cor.join() === k.join() && c.corOn]}><FundoCaixaDegrade id={`m-${k.join('')}`} cores={k} /></View></TouchableOpacity>)}
      </View>
      <TouchableOpacity style={[sa.botao, { marginTop: 18 }, salvando && { opacity: 0.6 }]} onPress={salvar} disabled={salvando}>
        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={sa.botaoTxt}>{id ? 'Salvar' : 'Pôr no ar'}</Text>}
      </TouchableOpacity>
      {!!id && <TouchableOpacity style={[sa.botaoSec, { marginTop: 10 }]} onPress={tirar}><Text style={[sa.botaoSecTxt, { color: '#F87171' }]}>Liberar a vaga</Text></TouchableOpacity>}
      <Text style={[sa.vazio, { marginTop: 10 }]}>Foto de fundo do banner: no portal (Categorias e vagas).</Text>
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  previa: { borderRadius: 16, padding: 14, overflow: 'hidden', marginBottom: 12, minHeight: 110, justifyContent: 'space-between' },
  previaTag: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, opacity: 0.9 },
  previaTit: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 6 },
  previaBtn: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  previaBtnTxt: { color: '#1A1020', fontSize: 11, fontWeight: '800' },
  rot: { color: CA.dim, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  trocar: { color: CA.rosa, fontSize: 12, fontWeight: '700' },
  cores: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cor: { width: 44, height: 30, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  corOn: { borderColor: '#FFF' },
});
