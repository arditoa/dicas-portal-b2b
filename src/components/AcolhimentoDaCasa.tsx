// Migração 142 — o que a casa oferece de acolhimento e acessibilidade, na página da casa (informado pela casa).
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ACOLHIMENTO } from '../lib/acolhimento';
import { supabase } from '../lib/supabase';

export default function AcolhimentoDaCasa({ localId }: { localId: string }) {
  const [lista, setLista] = useState<string[]>([]);
  const [treinada, setTreinada] = useState(false); // 143 — selo Equipe treinada
  useEffect(() => {
    let vivo = true;
    supabase.from('locais').select('acolhimento').eq('id', localId).maybeSingle().then(({ data, error }) => {
      if (vivo && !error) setLista(((data as { acolhimento: string[] | null } | null)?.acolhimento) || []);
    }, () => {});
    supabase.rpc('equipe_treinada', { p_local: localId }).then(({ data, error }) => {
      if (vivo && !error) setTreinada(!!(data as { tem_selo: boolean } | null)?.tem_selo);
    }, () => {});
    return () => { vivo = false; };
  }, [localId]);
  const itens = ACOLHIMENTO.filter((a) => lista.includes(a.slug));
  if (!itens.length && !treinada) return null;
  return (
    <View style={s.caixa}>
      <Text style={s.tit}>Acolhimento e acessibilidade</Text>
      <View style={s.chips}>
        {treinada && <View style={[s.chip, { backgroundColor: '#34D3991F' }]}><Feather name="award" size={12} color="#34D399" /><Text style={[s.chipTxt, { color: '#34D399' }]}>Equipe treinada em acolhimento</Text></View>}
        {itens.map((a) => (
          <View key={a.slug} style={s.chip}><Feather name={a.icone as any} size={12} color="#C4B5FD" /><Text style={s.chipTxt}>{a.rotulo}</Text></View>
        ))}
      </View>
      {itens.length > 0 && <Text style={s.nota}>Itens informados pela casa{treinada ? '; o selo de equipe é do curso Dicas' : ''}.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { marginTop: 14 },
  tit: { color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#24223A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipTxt: { color: '#E9E7F3', fontSize: 12, fontWeight: '700' },
  nota: { color: '#626274', fontSize: 11, marginTop: 6 },
});
