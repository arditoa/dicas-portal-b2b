// Modo equipe · Nova ação de marca (para a faixa "Ações da semana"). Nasce no ar; pausar é na Vitrine.
// O detalhe fino (questionário, moldura, escolha de sabor, cupons ligados) continua no portal /admin.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { supabase } from '../../lib/supabase';

const CORES = ['#E1306C', '#9B3CFF', '#2F80ED', '#34D399', '#F2C94C', '#F2994A', '#111111'];
const dia = (d: Date) => d.toISOString().slice(0, 10);
const br = (iso: string) => iso.split('-').reverse().join('/');
const deBr = (t: string) => { const m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/); if (!m) return null; const y = m[3] || String(new Date().getFullYear()); return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };

type Casa = { id: string; nome: string; bairro: string | null };

export default function AcaoNova() {
  const router = useRouter();
  const hoje = new Date(Date.now() - 3 * 3600e3);
  const [marca, setMarca] = useState('');
  const [nome, setNome] = useState('');
  const [chamada, setChamada] = useState('');
  const [brinde, setBrinde] = useState('');
  const [limite, setLimite] = useState('');
  const [regra, setRegra] = useState('');
  const [de, setDe] = useState(br(dia(hoje)));
  const [ate, setAte] = useState(br(dia(new Date(hoje.getTime() + 6 * 864e5))));
  const [cor, setCor] = useState(CORES[0]);
  const [busca, setBusca] = useState('');
  const [achadas, setAchadas] = useState<Casa[]>([]);
  const [casa, setCasa] = useState<Casa | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (casa || busca.trim().length < 2) { setAchadas([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('locais').select('id, nome, bairro').eq('status', 'aprovado').ilike('nome', `%${busca.trim()}%`).limit(6);
      setAchadas((data as Casa[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [busca, casa]);

  const salvar = async () => {
    const ini = deBr(de.trim()); const fim = deBr(ate.trim());
    if (!marca.trim() || !nome.trim()) return Alert.alert('Nova ação', 'Preencha a marca e o nome da ação.');
    if (!casa) return Alert.alert('Nova ação', 'Escolha a casa onde a ação acontece.');
    if (!ini || !fim || fim < ini) return Alert.alert('Nova ação', 'Confira as datas (dia/mês). O fim não pode ser antes do início.');
    const lim = limite.trim() ? parseInt(limite.replace(/\D/g, ''), 10) : null;
    setSalvando(true);
    const { error } = await (supabase.from('acoes_marca') as any).insert({
      local_id: casa.id, marca: marca.trim(), nome: nome.trim(), inicio: ini, fim, cor,
      chamada: chamada.trim() || null, brinde: brinde.trim().slice(0, 80) || null, limite_total: lim || null,
      regra: regra.trim().slice(0, 120) || null, participacao: 'ambos', mostrar_no_app: true, ativa: true,
    });
    setSalvando(false);
    if (error) return Alert.alert('Nova ação', error.message);
    Alert.alert('Ação no ar', `${marca.trim()} já aparece em Ações da semana. Para pausar, use a chave na Vitrine.`);
    router.back();
  };

  const Campo = ({ rot, v, set, ph, max, num }: { rot: string; v: string; set: (t: string) => void; ph?: string; max?: number; num?: boolean }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={c.rot}>{rot}</Text>
      <TextInput value={v} onChangeText={set} placeholder={ph} placeholderTextColor={CA.fraco} maxLength={max} keyboardType={num ? 'number-pad' : 'default'} style={sa.campoBusca} />
    </View>
  );

  return (
    <TelaAdm titulo="Nova ação" subtitulo="Entra em Ações da semana na hora" voltar>
      {Campo({ rot: 'Marca *', v: marca, set: setMarca, ph: 'Ex.: Amstel', max: 60 })}
      {Campo({ rot: 'Nome da ação *', v: nome, set: setNome, ph: 'Ex.: Happy hour do lançamento', max: 80 })}
      {Campo({ rot: 'Chamada no app', v: chamada, set: setChamada, ph: 'Ex.: Prove grátis no Vezpa', max: 60 })}
      {Campo({ rot: 'Brinde', v: brinde, set: setBrinde, ph: 'Ex.: 1 long neck', max: 80 })}
      <View style={c.linha2}>
        <View style={{ flex: 1 }}>{Campo({ rot: 'Para os primeiros', v: limite, set: setLimite, ph: 'Sem limite', num: true, max: 6 })}</View>
        <View style={{ flex: 1 }}>{Campo({ rot: 'Regra', v: regra, set: setRegra, ph: 'Ex.: das 18h às 21h', max: 120 })}</View>
      </View>
      <View style={c.linha2}>
        <View style={{ flex: 1 }}>{Campo({ rot: 'Começa (dia/mês)', v: de, set: setDe, max: 10 })}</View>
        <View style={{ flex: 1 }}>{Campo({ rot: 'Termina (dia/mês)', v: ate, set: setAte, max: 10 })}</View>
      </View>

      <Text style={c.rot}>Casa *</Text>
      {casa ? (
        <View style={[sa.card, c.casaSel]}>
          <Feather name="map-pin" size={15} color={CA.verde} />
          <Text style={[sa.tit, { flex: 1 }]}>{casa.nome}</Text>
          <TouchableOpacity onPress={() => { setCasa(null); setBusca(''); }} accessibilityRole="button"><Text style={c.trocar}>Trocar</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar casa pelo nome" placeholderTextColor={CA.fraco} style={sa.campoBusca} />
          {achadas.length > 0 && (
            <View style={[sa.lista, { marginTop: 6 }]}>
              {achadas.map((k, i) => (
                <TouchableOpacity key={k.id} style={[sa.linha, i < achadas.length - 1 && sa.borda]} onPress={() => setCasa(k)} accessibilityRole="button">
                  <View style={{ flex: 1 }}><Text style={sa.tit}>{k.nome}</Text>{!!k.bairro && <Text style={sa.sub}>{k.bairro}</Text>}</View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      <Text style={[c.rot, { marginTop: 12 }]}>Cor da marca</Text>
      <View style={c.cores}>
        {CORES.map((k) => (
          <TouchableOpacity key={k} onPress={() => setCor(k)} style={[c.cor, { backgroundColor: k }, cor === k && c.corOn]} accessibilityRole="button" accessibilityState={{ selected: cor === k }} />
        ))}
      </View>

      <TouchableOpacity style={[sa.botao, { marginTop: 18 }, salvando && { opacity: 0.6 }]} onPress={salvar} disabled={salvando} accessibilityRole="button">
        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={sa.botaoTxt}>Pôr no ar</Text>}
      </TouchableOpacity>
      <Text style={[sa.vazio, { marginTop: 10 }]}>Questionário, moldura de foto e escolha de sabor: no portal (/admin › Ações de marca).</Text>
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  rot: { color: CA.dim, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  linha2: { flexDirection: 'row', gap: 10 },
  casaSel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trocar: { color: CA.rosa, fontSize: 13, fontWeight: '800' },
  cores: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  cor: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  corOn: { borderColor: '#FFF' },
});
