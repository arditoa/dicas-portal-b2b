// Modo equipe · Caixa da Home (nova ou editar). Tipos:
//   • Escolha da equipe (curadoria): as casas são marcadas na ficha da casa (aba Locais › "Aparece em").
//   • Abre uma categoria ou uma página do app (link): ex. categoria:bares, /termometro, /roteiros.
// As caixas automáticas (Em Alta, Hoje…) só mudam nome, cores e posição; não podem ser apagadas.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import FundoCaixaDegrade from '../../components/FundoCaixaDegrade';
import { CATEGORIA_ORDER, CATEGORIAS } from '../../lib/categorias';
import { supabase } from '../../lib/supabase';

const ICONES = ['star', 'heart', 'zap', 'trending-up', 'music', 'coffee', 'sun', 'moon', 'gift', 'map', 'camera', 'calendar', 'award', 'smile', 'shield', 'briefcase'];
const CORES: [string, string][] = [['#C026A3', '#6D3FD1'], ['#E1306C', '#F2692A'], ['#0DA372', '#0E7490'], ['#0A8FD0', '#7048B8'], ['#CC7A0A', '#9A4A0A'], ['#F2692A', '#C42660'], ['#0F9F90', '#5558E3'], ['#2A2840', '#111018']];
const PAGINAS: [string, string][] = [['/termometro', 'Termômetro da noite'], ['/roteiros', 'Roteiros'], ['/servicos', 'Serviços LGBT+'], ['/(tabs)/events', 'Eventos'], ['/(tabs)/tourism', 'Trip']];
type Tipo = 'padrao' | 'curadoria' | 'link';
const slug = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

export default function CaixaEditar() {
  const router = useRouter();
  const { chave } = useLocalSearchParams<{ chave?: string }>();
  const nova = !chave;
  const [carregando, setCarregando] = useState(!nova);
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [tipo, setTipo] = useState<Tipo>('curadoria');
  const [destino, setDestino] = useState('');
  const [icone, setIcone] = useState('star');
  const [cor, setCor] = useState<[string, string]>(CORES[0]);
  const [posicao, setPosicao] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      if (nova) {
        const { data } = await supabase.from('home_caixas').select('ordem').order('ordem', { ascending: false }).limit(1);
        setPosicao(String(((data as any)?.[0]?.ordem ?? 0) + 1));
        return;
      }
      const { data } = await supabase.from('home_caixas').select('*').eq('chave', chave).maybeSingle();
      const c = data as any;
      if (c) {
        setTitulo(c.titulo || ''); setSubtitulo(c.subtitulo || ''); setTipo(c.tipo); setDestino(c.destino || '');
        setIcone(c.icone || 'star'); setCor([c.cor1, c.cor2]); setPosicao(String(c.ordem ?? ''));
      }
      setCarregando(false);
    })();
  }, [chave]);

  const salvar = async () => {
    if (!titulo.trim()) return Alert.alert('Caixa', 'Dê um nome para a caixa.');
    if (tipo === 'link' && !destino.trim()) return Alert.alert('Caixa', 'Escolha para onde a caixa leva.');
    const dados: any = {
      titulo: titulo.trim().slice(0, 40), subtitulo: subtitulo.trim().slice(0, 80) || null, icone, cor1: cor[0], cor2: cor[1],
      ordem: parseInt(posicao, 10) || 99, updated_at: new Date().toISOString(),
      ...(tipo !== 'padrao' ? { tipo, destino: tipo === 'link' ? destino.trim() : null } : {}),
    };
    setSalvando(true);
    const r = nova
      ? await (supabase.from('home_caixas') as any).insert({ chave: `${slug(titulo) || 'caixa'}-${Date.now().toString(36).slice(-4)}`, ativo: true, ...dados })
      : await (supabase.from('home_caixas') as any).update(dados).eq('chave', chave);
    setSalvando(false);
    if (r.error) return Alert.alert('Caixa', r.error.message);
    if (nova && tipo === 'curadoria') Alert.alert('Caixa criada', 'Agora marque as casas dela: aba Locais › ficha da casa › "Aparece em".');
    router.back();
  };

  const apagar = () => Alert.alert('Apagar esta caixa?', 'Ela some da Home. As casas marcadas nela não são afetadas.', [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('home_caixas').delete().eq('chave', chave);
      if (error) return Alert.alert('Caixa', error.message);
      router.back();
    } },
  ]);

  if (carregando) return <TelaAdm titulo="Caixa da Home" voltar><ActivityIndicator color={CA.rosa} /></TelaAdm>;

  return (
    <TelaAdm titulo={nova ? 'Nova caixa' : 'Editar caixa'} subtitulo="Caixa colorida da Home" voltar>
      <View style={c.previa}>
        <FundoCaixaDegrade id="caixa-previa" cores={cor} />
        <Feather name={icone as any} size={20} color="#FFF" />
        <Text style={c.previaTit} numberOfLines={2}>{titulo || 'Nome da caixa'}</Text>
      </View>

      <Text style={c.rot}>Nome</Text>
      <TextInput value={titulo} onChangeText={setTitulo} placeholder="Ex.: Brunch de domingo" placeholderTextColor={CA.fraco} maxLength={40} style={sa.campoBusca} />
      <Text style={c.rot}>Frase embaixo (opcional)</Text>
      <TextInput value={subtitulo} onChangeText={setSubtitulo} placeholder="Ex.: Os melhores para começar o dia" placeholderTextColor={CA.fraco} maxLength={80} style={sa.campoBusca} />

      {tipo === 'padrao' ? (
        <Text style={[sa.sub, { marginTop: 12 }]}>Caixa automática: a lista é montada pelo app. Aqui muda só nome, ícone, cores e posição.</Text>
      ) : (
        <>
          <Text style={c.rot}>O que a caixa mostra</Text>
          <View style={c.chips}>
            {([['curadoria', 'Casas escolhidas pela equipe'], ['link', 'Abre uma categoria ou página']] as [Tipo, string][]).map(([t, r]) => (
              <TouchableOpacity key={t} style={[c.chip, tipo === t && c.chipOn]} onPress={() => setTipo(t)} accessibilityRole="button"><Text style={[c.chipTxt, tipo === t && { color: '#0B0B0E' }]}>{r}</Text></TouchableOpacity>
            ))}
          </View>
          {tipo === 'link' && (
            <>
              <Text style={c.rot}>Leva para</Text>
              <View style={c.chips}>
                {(['destaques', ...CATEGORIA_ORDER] as const).map((k) => {
                  const d = `categoria:${k}`;
                  return <TouchableOpacity key={d} style={[c.chip, destino === d && c.chipOn]} onPress={() => setDestino(d)}><Text style={[c.chipTxt, destino === d && { color: '#0B0B0E' }]}>{CATEGORIAS[k]?.label || k}</Text></TouchableOpacity>;
                })}
                {PAGINAS.map(([d, r]) => (
                  <TouchableOpacity key={d} style={[c.chip, destino === d && c.chipOn]} onPress={() => setDestino(d)}><Text style={[c.chipTxt, destino === d && { color: '#0B0B0E' }]}>{r}</Text></TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </>
      )}

      <Text style={c.rot}>Ícone</Text>
      <View style={c.chips}>
        {ICONES.map((i) => (
          <TouchableOpacity key={i} style={[c.ic, icone === i && c.icOn]} onPress={() => setIcone(i)} accessibilityLabel={i}><Feather name={i as any} size={16} color={icone === i ? '#0B0B0E' : '#FFF'} /></TouchableOpacity>
        ))}
      </View>
      <Text style={c.rot}>Cores</Text>
      <View style={c.chips}>
        {CORES.map((k) => (
          <TouchableOpacity key={k.join()} onPress={() => setCor(k)} accessibilityRole="button">
            <View style={[c.cor, cor.join() === k.join() && c.corOn]}><FundoCaixaDegrade id={`cor-${k.join('')}`} cores={k} /></View>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={c.rot}>Posição na Home (1 = primeira)</Text>
      <TextInput value={posicao} onChangeText={(t) => setPosicao(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" style={[sa.campoBusca, { width: 90 }]} />

      <TouchableOpacity style={[sa.botao, { marginTop: 18 }, salvando && { opacity: 0.6 }]} onPress={salvar} disabled={salvando} accessibilityRole="button">
        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={sa.botaoTxt}>{nova ? 'Criar caixa' : 'Salvar'}</Text>}
      </TouchableOpacity>
      {!nova && tipo !== 'padrao' && (
        <TouchableOpacity style={[sa.botaoSec, { marginTop: 10 }]} onPress={apagar} accessibilityRole="button"><Text style={[sa.botaoSecTxt, { color: '#F87171' }]}>Apagar caixa</Text></TouchableOpacity>
      )}
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  previa: { width: 150, height: 90, borderRadius: 16, padding: 12, justifyContent: 'space-between', marginBottom: 6, overflow: 'hidden' },
  previaTit: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  rot: { color: CA.dim, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipTxt: { color: CA.texto, fontSize: 12.5, fontWeight: '700' },
  ic: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: CA.borda, alignItems: 'center', justifyContent: 'center' },
  icOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  cor: { width: 44, height: 30, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  corOn: { borderColor: '#FFF' },
});
