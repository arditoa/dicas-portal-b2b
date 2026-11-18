// Termômetro da noite (migração 136): onde está movimentado agora, com lotação, fila e clima de quem está lá.
// Conta pessoas por faixa (nunca quem é). Atualiza a cada minuto.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EstouAquiAgora from '../components/EstouAquiAgora';
import { SeloPequeno } from '../components/SeloLugarSeguro';
import TopoApp from '../components/TopoApp';
import { TituloTela } from '../components/CabecalhoTela';
import { CasaTermometro, ROTULO, termometro, textoPessoas } from '../lib/seguranca';

const CALOR = ['#3B3A4F', '#60A5FA', '#F59E0B', '#EF4444']; // frio → quente
const haQuanto = (iso: string | null) => {
  if (!iso) return null;
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)}h`;
};
const nivel = (c: CasaTermometro) => (c.clima ?? 0) >= 3 || (c.lotacao ?? 0) >= 3 || c.pessoas >= 30 ? 3 : (c.clima ?? 0) >= 2 || c.pessoas >= 10 ? 2 : c.pessoas > 0 ? 1 : 0;

export default function Termometro() {
  const router = useRouter();
  const [lista, setLista] = useState<CasaTermometro[] | null>(null);
  const [erro, setErro] = useState('');
  const [cidade, setCidade] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try { setLista(await termometro()); setErro(''); } catch (e: any) { setErro(e?.message || 'Não deu para carregar.'); setLista([]); }
  }, []);
  useFocusEffect(useCallback(() => {
    void carregar();
    const t = setInterval(() => { void carregar(); }, 60000);
    return () => clearInterval(t);
  }, [carregar]));

  const cidades = useMemo(() => Array.from(new Set((lista || []).map((c) => c.cidade))).sort(), [lista]);
  const visiveis = (lista || []).filter((c) => !cidade || c.cidade === cidade);

  return (
    <View style={s.tela}>
      <TopoApp voltar />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={atualizando} tintColor="#E1306C" onRefresh={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }} />}>
        <View style={{ marginBottom: 12 }}><TituloTela titulo="Termômetro da noite" subtitulo="Onde está movimentado agora, contado por quem está lá." discreto semMargem /></View>

        {cidades.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {[null, ...cidades].map((c) => (
              <TouchableOpacity key={c || 'todas'} style={[s.filtro, cidade === c && s.filtroOn]} onPress={() => setCidade(c)}>
                <Text style={[s.filtroTxt, cidade === c && { color: '#0B0A10' }]}>{c || 'Todas'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {lista === null ? <ActivityIndicator color="#E1306C" style={{ marginTop: 30 }} /> : !!erro ? <Text style={s.lead}>{erro}</Text> : visiveis.length === 0 ? (
          <View style={s.vazio}>
            <Feather name="moon" size={28} color="#626274" />
            <Text style={s.vazioTit}>A noite ainda não começou</Text>
            <Text style={s.vazioSub}>Está numa casa? Abra a página dela e toque em "Estou aqui agora".</Text>
          </View>
        ) : visiveis.map((c) => {
          const n = nivel(c);
          return (
            <View key={c.id} style={[s.card, { borderLeftColor: CALOR[n] }]}>
              <TouchableOpacity style={s.linha} onPress={() => router.push(`/business/${c.id}` as any)} activeOpacity={0.8} accessibilityRole="button">
                {c.foto_capa_url ? <Image source={{ uri: c.foto_capa_url }} style={s.foto} /> : <View style={[s.foto, { backgroundColor: '#232230' }]} />}
                <View style={{ flex: 1 }}>
                  <Text style={s.nome} numberOfLines={1}>{c.nome}</Text>
                  <Text style={s.onde} numberOfLines={1}>{[c.bairro, c.cidade].filter(Boolean).join(' · ')}</Text>
                  {c.selo && <View style={{ marginTop: 4 }}><SeloPequeno /></View>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.pessoas, { color: CALOR[n] === '#3B3A4F' ? '#A0A0B2' : CALOR[n] }]}>{textoPessoas(c.pessoas)}</Text>
                  {!!c.atualizado && <Text style={s.quando}>{haQuanto(c.atualizado)}</Text>}
                </View>
              </TouchableOpacity>
              {!!c.festa && (
                <TouchableOpacity onPress={() => c.evento_id && router.push(`/evento/${c.evento_id}` as any)} style={s.festa}>
                  <Feather name="music" size={12} color="#F9A8D4" /><Text style={s.festaTxt} numberOfLines={1}>Hoje: {c.festa}</Text>
                </TouchableOpacity>
              )}
              {(c.lotacao || c.fila || c.clima) ? (
                <View style={s.sinais}>
                  {!!c.lotacao && <Text style={s.sinal}>{ROTULO.lotacao[c.lotacao]}</Text>}
                  {!!c.fila && <Text style={s.sinal}>{ROTULO.fila[c.fila]}</Text>}
                  {!!c.clima && <Text style={s.sinal}>{ROTULO.clima[c.clima]}</Text>}
                </View>
              ) : null}
              <EstouAquiAgora localId={c.id} nome={c.nome} compacto aoEnviar={carregar} />
            </View>
          );
        })}

        <TouchableOpacity style={s.seg} onPress={() => router.push('/seguranca' as any)} accessibilityRole="button">
          <Feather name="shield" size={16} color="#34D399" />
          <View style={{ flex: 1 }}><Text style={s.segTxt}>Cheguei bem</Text><Text style={s.segSub}>Vai sair hoje? Avise seus contatos quando chegar.</Text></View>
          <Feather name="chevron-right" size={16} color="#626274" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0A10' },
  titulo: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  lead: { color: '#A0A0B2', fontSize: 13.5, lineHeight: 19, marginTop: 4, marginBottom: 14 },
  filtro: { borderWidth: 1, borderColor: '#2A2840', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  filtroOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  filtroTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderLeftWidth: 4, borderRadius: 16, padding: 12, marginBottom: 10 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foto: { width: 48, height: 48, borderRadius: 12 },
  nome: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  onde: { color: '#8E8BA3', fontSize: 12, marginTop: 2 },
  pessoas: { fontSize: 13, fontWeight: '900' },
  quando: { color: '#626274', fontSize: 11, marginTop: 2 },
  festa: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  festaTxt: { color: '#F9A8D4', fontSize: 12.5, fontWeight: '700', flex: 1 },
  sinais: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  sinal: { color: '#E9E7F3', fontSize: 12, fontWeight: '700', backgroundColor: '#24223A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  vazio: { alignItems: 'center', backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 16, padding: 20, gap: 6 },
  vazioTit: { color: '#FFF', fontSize: 14, fontWeight: '700', marginTop: 6 },
  vazioSub: { color: '#A0A0B2', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginTop: 8 },
  segTxt: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  segSub: { color: '#A0A0B2', fontSize: 10, marginTop: 1 },
});
