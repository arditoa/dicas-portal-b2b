// Modo equipe · Criar / editar banner (banners_app). Vale no app na hora — sem nova versão na Apple.
// Abre com ?id=<banner> (editar), ?tela=<lugar> (novo, já marcado naquele lugar) ou ?local=<casa> (novo, levando para a casa).
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { BarraSalvar, Campo, CampoData, Chips } from '../../components/parceiro/form';
import { BannerAdm, LUGARES } from '../../lib/admin';
import { CATEGORIA_ORDER, CATEGORIAS } from '../../lib/categorias';
import { supabase } from '../../lib/supabase';

const CORES = ['#E1306C', '#9B3CFF', '#4B5BD6', '#0EA5E9', '#34D399', '#F2C94C', '#F97316', '#E63935', '#7E57C2', '#111111'];
const ICONES = ['star', 'globe', 'map', 'briefcase', 'gift', 'music', 'heart', 'award', 'calendar', 'tag', 'zap', 'camera', 'flag', 'coffee'];
type TipoDestino = 'nenhum' | 'casa' | 'marca' | 'categoria' | 'tela' | 'site';
const VAZIO = { tag: '', titulo: '', cta: 'Conhecer', icone: 'star', cor: '#E1306C', logo_url: '' as string | null, destino: '', telas: [] as string[],
  parceria: 'proprio' as BannerAdm['parceria'], peso: 1, inicio: '', fim: '', ativo: true, acao_marca_id: null as string | null,
  estilo: 'info' as 'info' | 'foto', foto_url: null as string | null };

function tipoDe(d: string): TipoDestino {
  if (!d) return 'nenhum';
  if (d.startsWith('local:')) return 'casa';
  if (d.startsWith('/marca/')) return 'marca';
  if (d.startsWith('/category/')) return 'categoria';
  if (d.startsWith('/')) return 'tela';
  return 'site';
}
const diaDe = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10) : '');

export default function EditarBanner() {
  const { id, tela, local } = useLocalSearchParams<{ id?: string; tela?: string; local?: string }>();
  const router = useRouter();
  const [f, setF] = useState({ ...VAZIO, telas: tela ? [String(tela)] : [] });
  const [chave, setChave] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(!!id);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [tipo, setTipo] = useState<TipoDestino>('nenhum');
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<{ id: string; nome: string; bairro: string | null }[]>([]);
  const [nomeCasa, setNomeCasa] = useState('');
  const [acoes, setAcoes] = useState<{ id: string; marca: string; nome: string }[]>([]);

  // Vindo da ficha da casa: já leva para ela.
  useEffect(() => {
    if (id || !local) return;
    setTipo('casa');
    setF((x) => ({ ...x, destino: `local:${local}` }));
    supabase.from('locais').select('nome').eq('id', local).maybeSingle().then(({ data: l }) => setNomeCasa((l as any)?.nome || ''));
  }, [local, id]);

  useEffect(() => {
    if (!id) return;
    supabase.from('banners_app').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      const b = data as BannerAdm | null;
      if (b) {
        setF({ tag: b.tag, titulo: b.titulo, cta: b.cta, icone: b.icone || 'star', cor: b.cor || '#E1306C', logo_url: b.logo_url, destino: b.destino || '', telas: b.telas || [],
          parceria: b.parceria, peso: b.peso || 1, inicio: diaDe(b.inicio), fim: diaDe(b.fim), ativo: b.ativo, acao_marca_id: b.acao_marca_id ?? null,
          estilo: (b as any).estilo === 'foto' ? 'foto' : 'info', foto_url: (b as any).foto_url ?? null });
        setChave(b.chave);
        setTipo(tipoDe(b.destino || ''));
        if ((b.destino || '').startsWith('local:')) {
          supabase.from('locais').select('nome').eq('id', b.destino.slice(6)).maybeSingle().then(({ data: l }) => setNomeCasa((l as any)?.nome || ''));
        }
      }
      setCarregando(false);
    });
  }, [id]);

  useEffect(() => {
    if (tipo !== 'marca' || acoes.length) return;
    const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    supabase.from('acoes_marca').select('id, marca, nome').eq('ativa', true).gte('fim', hoje).then(({ data }) => setAcoes((data as any[]) || []));
  }, [tipo]);

  useEffect(() => {
    if (tipo !== 'casa' || busca.trim().length < 2) { setAchados([]); return; }
    const t = setTimeout(() => {
      supabase.from('locais').select('id, nome, bairro').eq('status', 'aprovado').ilike('nome', `%${busca.trim()}%`).limit(8).then(({ data }) => setAchados((data as any[]) || []));
    }, 300);
    return () => clearTimeout(t);
  }, [busca, tipo]);

  async function subirLogo(alvo: 'logo' | 'fundo' = 'logo') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Fotos', 'Libere o acesso às fotos nos Ajustes do celular.');
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: alvo === 'fundo' ? [16, 7] : [1, 1] });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    setSubindo(true);
    try {
      const buf = await (await fetch(r.assets[0].uri)).arrayBuffer();
      const caminho = `banners/app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
      const up = await supabase.storage.from('fotos-destinos').upload(caminho, buf, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw new Error(up.error.message);
      const url = supabase.storage.from('fotos-destinos').getPublicUrl(caminho).data.publicUrl;
      setF((x) => (alvo === 'fundo' ? { ...x, foto_url: url } : { ...x, logo_url: url }));
    } catch (e: any) {
      Alert.alert('Foto', e?.message || 'Não deu para subir agora.');
    } finally {
      setSubindo(false);
    }
  }

  function mudarTipo(t: TipoDestino) {
    setTipo(t);
    setF({ ...f, destino: t === 'nenhum' ? '' : t === 'site' ? 'https://' : t === 'tela' ? '/' : '', acao_marca_id: t === 'marca' ? f.acao_marca_id : null });
  }

  async function salvar() {
    if (f.titulo.trim().length < 2) return Alert.alert('Banner', 'Escreva o título.');
    if (!f.telas.length) return Alert.alert('Banner', 'Escolha pelo menos um lugar onde o banner aparece.');
    if (tipo === 'site' && !/^https:\/\/.+\..+/.test(f.destino)) return Alert.alert('Banner', 'O link do site começa com https://');
    if ((tipo === 'casa' || tipo === 'marca' || tipo === 'categoria') && !f.destino) return Alert.alert('Banner', 'Escolha para onde o banner leva.');
    if (f.inicio && f.fim && f.fim < f.inicio) return Alert.alert('Banner', 'O fim vem antes do início.');
    if (f.estilo === 'foto' && !f.foto_url) return Alert.alert('Banner', 'Suba a foto de fundo ou escolha Informativo.');
    setSalvando(true);
    const dados = {
      tag: f.tag.trim() || 'Dicas LGBT+', titulo: f.titulo.trim(), cta: f.cta.trim() || 'Conhecer', icone: f.icone, cor: f.cor, logo_url: f.logo_url || null,
      destino: f.destino.trim(), telas: f.telas, parceria: f.parceria, peso: f.peso, ativo: f.ativo, acao_marca_id: f.acao_marca_id,
      estilo: f.estilo, foto_url: f.estilo === 'foto' ? f.foto_url : null,
      inicio: f.inicio ? `${f.inicio}T00:00:00-03:00` : null, fim: f.fim ? `${f.fim}T23:59:59-03:00` : null, updated_at: new Date().toISOString(),
    };
    const { error } = id ? await supabase.from('banners_app').update(dados).eq('id', id) : await supabase.from('banners_app').insert(dados);
    setSalvando(false);
    if (error) return Alert.alert('Banner', error.message);
    Alert.alert('Salvo!', 'O banner já vale no app (quem estiver com o app aberto vê ao voltar para a tela).', [{ text: 'OK', onPress: () => router.back() }]);
  }

  function apagar() {
    if (!id) return;
    if (chave && ['topo_museu', 'topo_trip'].includes(chave)) return Alert.alert('Banner', 'Este cartão é fixo do topo. Desligue em "Aparece no app" em vez de apagar.');
    Alert.alert('Apagar banner?', 'Ele sai do app na hora. Para só pausar, desligue "Aparece no app".', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('banners_app').delete().eq('id', id);
        if (error) return Alert.alert('Banner', error.message);
        router.back();
      } },
    ]);
  }

  if (carregando) return <TelaAdm titulo="Banner" voltar><ActivityIndicator color={CA.rosa} /></TelaAdm>;

  return (
    <TelaAdm titulo={id ? 'Editar banner' : 'Novo banner'} subtitulo="Aparece no app assim que salvar." voltar>
      {/* Prévia */}
      {f.estilo === 'foto' ? (
      <View style={[e.previaFoto, { borderColor: `${f.cor}66` }]}>
        {f.foto_url ? <Image source={{ uri: f.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: f.cor }]} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        <Text style={[e.tag, { color: '#FFF' }]} numberOfLines={1}>{(f.tag || 'ETIQUETA').toUpperCase()}</Text>
        <Text style={[e.titulo, { color: '#FFF', maxWidth: '70%' }]} numberOfLines={2}>{f.titulo || 'Título do banner'}</Text>
        <View style={[e.cta, { backgroundColor: '#FFF' }]}><Text style={[e.ctaTxt, { color: '#1A1020' }]}>{f.cta || 'Conhecer'}</Text></View>
      </View>
      ) : (
      <View style={[e.previa, { borderColor: `${f.cor}66` }]}>
        <View style={[e.faixa, { backgroundColor: f.cor }]}>
          {f.logo_url ? <Image source={{ uri: f.logo_url }} style={e.logo} resizeMode="cover" /> : <Feather name={f.icone as any} size={26} color="#FFF" />}
        </View>
        <View style={{ flex: 1, padding: 12 }}>
          <Text style={[e.tag, { color: f.cor }]} numberOfLines={1}>{(f.tag || 'ETIQUETA').toUpperCase()}</Text>
          <Text style={e.titulo} numberOfLines={2}>{f.titulo || 'Título do banner'}</Text>
          <View style={[e.cta, { backgroundColor: f.cor }]}><Text style={e.ctaTxt}>{f.cta || 'Conhecer'}</Text></View>
        </View>
      </View>

      )}

      <View style={{ gap: 14 }}>
        <Chips rotulo="Formato" opcoes={[{ valor: 'info', rotulo: 'Informativo (cor + ícone)' }, { valor: 'foto', rotulo: 'Foto de fundo' }] as any}
          valor={f.estilo} aoMudar={(v) => setF({ ...f, estilo: v as 'info' | 'foto' })} />
        {f.estilo === 'foto' && (
          <View>
            <Text style={e.rot}>Foto de fundo (larga)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={sa.botaoSec} onPress={() => void subirLogo('fundo')} disabled={subindo} accessibilityRole="button">
                {subindo ? <ActivityIndicator color={CA.rosa} /> : <><Feather name="image" size={14} color={CA.texto} /><Text style={sa.botaoSecTxt}>{f.foto_url ? 'Trocar foto' : 'Subir foto'}</Text></>}
              </TouchableOpacity>
              {!!f.foto_url && <TouchableOpacity style={sa.botaoSec} onPress={() => setF({ ...f, foto_url: null })} accessibilityRole="button"><Text style={sa.botaoSecTxt}>Tirar</Text></TouchableOpacity>}
            </View>
          </View>
        )}
        <Campo rotulo="Etiqueta" valor={f.tag} aoMudar={(v) => setF({ ...f, tag: v })} exemplo="Ex.: Parceiro · Copa 2027" />
        <Campo rotulo="Título" valor={f.titulo} aoMudar={(v) => setF({ ...f, titulo: v })} exemplo="Ex.: Sorvete Kibon grátis no Vezpa" />
        <Campo rotulo="Botão" valor={f.cta} aoMudar={(v) => setF({ ...f, cta: v })} exemplo="Ex.: Quero" />

        <View>
          <Text style={e.rot}>Cor</Text>
          <View style={e.cores}>
            {CORES.map((c) => (
              <TouchableOpacity key={c} style={[e.cor, { backgroundColor: c }, f.cor === c && e.corOn]} onPress={() => setF({ ...f, cor: c })} accessibilityRole="button" accessibilityLabel={`Cor ${c}`} />
            ))}
            <TextInput style={e.hex} value={f.cor} onChangeText={(v) => /^#[0-9A-Fa-f]{0,6}$/.test(v) && setF({ ...f, cor: v })} autoCapitalize="characters" maxLength={7} />
          </View>
        </View>

        {f.estilo === 'info' && <View>
          <Text style={e.rot}>Logo ou foto (quadrada)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={sa.botaoSec} onPress={() => void subirLogo('logo')} disabled={subindo} accessibilityRole="button">
              {subindo ? <ActivityIndicator color={CA.rosa} /> : <><Feather name="upload" size={14} color={CA.texto} /><Text style={sa.botaoSecTxt}>{f.logo_url ? 'Trocar' : 'Subir foto'}</Text></>}
            </TouchableOpacity>
            {!!f.logo_url && <TouchableOpacity style={sa.botaoSec} onPress={() => setF({ ...f, logo_url: null })} accessibilityRole="button"><Text style={sa.botaoSecTxt}>Tirar</Text></TouchableOpacity>}
          </View>
        </View>}
        {f.estilo === 'info' && !f.logo_url && <Chips rotulo="Ícone (sem foto)" opcoes={ICONES.map((i) => ({ valor: i, rotulo: i })) as any} valor={f.icone} aoMudar={(v) => setF({ ...f, icone: String(v) })} />}

        <Chips rotulo="Onde aparece (pode marcar vários)" multiplo opcoes={LUGARES.map((l) => ({ valor: l.tela, rotulo: l.rotulo })) as any}
          valor={f.telas} aoMudar={(v) => setF({ ...f, telas: v as string[] })} />

        <Chips rotulo="Ao tocar, leva para" opcoes={[
          { valor: 'nenhum', rotulo: 'Nada' }, { valor: 'casa', rotulo: 'Uma casa' }, { valor: 'marca', rotulo: 'Ação de marca' },
          { valor: 'categoria', rotulo: 'Categoria' }, { valor: 'tela', rotulo: 'Tela do app' }, { valor: 'site', rotulo: 'Site' },
        ] as any} valor={tipo} aoMudar={(v) => mudarTipo(v as TipoDestino)} />
        {tipo === 'casa' && (
          <View style={{ gap: 6 }}>
            {f.destino ? (
              <View style={[sa.card, { flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={[sa.tit, { flex: 1 }]}>{nomeCasa || 'Casa escolhida'}</Text>
                <TouchableOpacity onPress={() => setF({ ...f, destino: '' })} accessibilityRole="button"><Text style={e.trocar}>Trocar</Text></TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput style={sa.campoBusca} value={busca} onChangeText={setBusca} placeholder="Nome da casa" placeholderTextColor={CA.fraco} />
                {achados.map((l) => (
                  <TouchableOpacity key={l.id} style={sa.card} onPress={() => { setF({ ...f, destino: `local:${l.id}` }); setNomeCasa(l.nome); setBusca(''); }} accessibilityRole="button">
                    <Text style={sa.tit}>{l.nome}</Text>{!!l.bairro && <Text style={sa.sub}>{l.bairro}</Text>}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}
        {tipo === 'marca' && (
          acoes.length ? <Chips rotulo="Qual ação" opcoes={acoes.map((a) => ({ valor: a.id, rotulo: `${a.marca} · ${a.nome}` })) as any}
            valor={f.acao_marca_id || ''} aoMudar={(v) => setF({ ...f, destino: `/marca/${v}`, acao_marca_id: String(v) })} />
            : <Text style={sa.vazio}>Nenhuma ação de marca no período.</Text>
        )}
        {tipo === 'categoria' && (
          <Chips rotulo="Qual categoria" opcoes={(['destaques', ...CATEGORIA_ORDER] as const).map((s) => ({ valor: `/category/${s}`, rotulo: CATEGORIAS[s]?.label || s })) as any}
            valor={f.destino} aoMudar={(v) => setF({ ...f, destino: String(v) })} />
        )}
        {(tipo === 'tela' || tipo === 'site') && (
          <Campo rotulo={tipo === 'site' ? 'Link (https://)' : 'Tela do app'} valor={f.destino} aoMudar={(v) => setF({ ...f, destino: v.trim() })}
            exemplo={tipo === 'site' ? 'https://…' : 'Ex.: /roteiros, /eventos, /secao/hoje'} />
        )}

        <Chips rotulo="Tipo" opcoes={[{ valor: 'proprio', rotulo: 'Do Dicas' }, { valor: 'patrocinio', rotulo: 'Patrocínio' }, { valor: 'institucional', rotulo: 'Institucional' }] as any}
          valor={f.parceria} aoMudar={(v) => setF({ ...f, parceria: v as BannerAdm['parceria'] })} />
        <Chips rotulo="Chance de abrir primeiro" opcoes={[1, 2, 3, 4, 5].map((n) => ({ valor: n, rotulo: n === 1 ? '1 (normal)' : String(n) })) as any}
          valor={f.peso} aoMudar={(v) => setF({ ...f, peso: Number(v) })} />
        <CampoData rotulo="Começa em (opcional)" valor={f.inicio || null} aoMudar={(v) => setF({ ...f, inicio: v })} ajuda="Em branco: já entra no ar." />
        <CampoData rotulo="Termina em (opcional)" valor={f.fim || null} aoMudar={(v) => setF({ ...f, fim: v })} min={f.inicio || undefined} ajuda="Em branco: fica até desligar." />
        <View style={[sa.card, { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}><Text style={sa.tit}>Aparece no app</Text><Text style={sa.sub}>Desligue para pausar sem apagar.</Text></View>
          <Switch value={f.ativo} onValueChange={(v) => setF({ ...f, ativo: v })} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
        </View>

        <BarraSalvar rotulo={id ? 'Salvar banner' : 'Criar banner'} salvando={salvando} aoSalvar={() => void salvar()}
          secundario={id ? { rotulo: 'Apagar', aoTocar: apagar, perigo: true } : undefined} />
      </View>
    </TelaAdm>
  );
}

const e = StyleSheet.create({
  previaFoto: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 16, minHeight: 130, padding: 14, justifyContent: 'flex-end', gap: 4 },
  previa: { flexDirection: 'row', backgroundColor: CA.card, borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 16, minHeight: 104 },
  faixa: { width: 84, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 84, height: '100%' },
  tag: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 },
  titulo: { color: CA.texto, fontSize: 16, fontWeight: '900', marginTop: 3 },
  cta: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8 },
  ctaTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  rot: { color: CA.texto, fontSize: 13.5, fontWeight: '700', marginBottom: 8 },
  cores: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  cor: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  corOn: { borderColor: '#FFF' },
  hex: { borderWidth: 1, borderColor: CA.borda, borderRadius: 10, color: CA.texto, paddingHorizontal: 10, height: 34, minWidth: 92, fontSize: 13 },
  trocar: { color: CA.rosa, fontSize: 13, fontWeight: '800' },
});
