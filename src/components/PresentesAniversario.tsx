// Migração 141 — "Feliz aniversário!": presentes das casas onde a pessoa já esteve. Toca em "Pegar" e mostra o vale na casa.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';

type Presente = { local_id: string; casa: string; presente: string; regra: string | null; ate: string; pego_em: string | null };
const dataCurta = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function PresentesAniversario({ margem = 0 }: { margem?: number }) {
  const { user } = useAuth();
  const [lista, setLista] = useState<Presente[]>([]);
  const [vale, setVale] = useState<{ casa: string; presente: string; nome: string; pego_em: string } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user) { setLista([]); return; }
    let vivo = true;
    supabase.rpc('meus_presentes_aniversario').then(({ data, error }) => { if (vivo) setLista(error ? [] : ((data as Presente[]) || [])); }, () => {});
    return () => { vivo = false; };
  }, [user?.id]));

  const pegar = async (p: Presente) => {
    setOcupado(p.local_id);
    const { data, error } = await supabase.rpc('pegar_presente_aniversario', { p_local: p.local_id });
    setOcupado(null);
    if (error) return Alert.alert('Presente', error.message);
    const r = data as { pego_em: string; nome: string };
    setVale({ casa: p.casa, presente: p.presente, nome: r.nome, pego_em: r.pego_em });
    setLista(lista.map((x) => (x.local_id === p.local_id ? { ...x, pego_em: r.pego_em } : x)));
  };

  if (!lista.length) return null;
  return (
    <View style={[s.card, { marginHorizontal: margem }]}>
      <View style={s.topo}><Text style={s.emoji}>🎂</Text><Text style={s.tit}>Feliz aniversário! Presentes para você</Text></View>
      {vale && (
        <View style={s.vale} accessibilityRole="summary">
          <Text style={s.valeTit}>Mostre na casa</Text>
          <Text style={s.valeCasa}>{vale.presente}</Text>
          <Text style={s.valeTxt}>{vale.nome} · {vale.casa}</Text>
          <Text style={s.valeTxt}>Vale aberto em {quando(vale.pego_em)}</Text>
          <TouchableOpacity onPress={() => setVale(null)}><Text style={s.fechar}>Fechar</Text></TouchableOpacity>
        </View>
      )}
      {lista.map((p) => (
        <View key={p.local_id} style={s.linha}>
          <View style={{ flex: 1 }}>
            <Text style={s.presente}>{p.presente}</Text>
            <Text style={s.sub}>{p.casa} · até {dataCurta(p.ate)}{p.regra ? ` · ${p.regra}` : ''}</Text>
          </View>
          <TouchableOpacity style={s.botao} onPress={() => (p.pego_em ? setVale({ casa: p.casa, presente: p.presente, nome: '', pego_em: p.pego_em }) : pegar(p))} disabled={!!ocupado} accessibilityRole="button">
            {ocupado === p.local_id ? <ActivityIndicator color="#0B0A10" /> : <Text style={s.botaoTxt}>{p.pego_em ? 'Ver vale' : 'Pegar'}</Text>}
          </TouchableOpacity>
        </View>
      ))}
      <Text style={s.nota}>Toque em "Pegar" só quando estiver na casa: o vale mostra a hora em que foi aberto.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#1C1430', borderWidth: 1, borderColor: '#C084FC66', borderRadius: 16, padding: 14, marginTop: 16 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  emoji: { fontSize: 18 },
  tit: { color: '#FFF', fontSize: 15, fontWeight: '800', flex: 1 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  presente: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  sub: { color: '#C4B5FD', fontSize: 12, marginTop: 2 },
  botao: { backgroundColor: '#C084FC', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  botaoTxt: { color: '#0B0A10', fontSize: 13, fontWeight: '900' },
  vale: { backgroundColor: '#C084FC', borderRadius: 14, padding: 16, alignItems: 'center', marginVertical: 6 },
  valeTit: { color: '#2E1065', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  valeCasa: { color: '#0B0A10', fontSize: 22, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  valeTxt: { color: '#2E1065', fontSize: 13, fontWeight: '700', marginTop: 2 },
  fechar: { color: '#2E1065', fontSize: 12, fontWeight: '800', marginTop: 8, textDecorationLine: 'underline' },
  nota: { color: '#8E8BA3', fontSize: 11.5, marginTop: 4 },
});
