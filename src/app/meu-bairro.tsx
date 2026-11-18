// Onde você mora (migração 137): CEP → bairro pelo ViaCEP. Guardamos só bairro, cidade, UF e os 5 primeiros dígitos do CEP.
// Dois consentimentos separados, nunca pré-marcados: sugestões perto de casa e Mapa Dicas (anônimo, por bairro).
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TopoApp from '../components/TopoApp';
import { TituloTela } from '../components/CabecalhoTela';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';

type Regiao = { cep5: string | null; bairro: string | null; cidade: string; uf: string | null; mapa_consentido: boolean };
const mascara = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };

export default function MeuBairro() {
  const router = useRouter();
  const { user } = useAuth();
  const [salva, setSalva] = useState<Regiao | null | undefined>(undefined);
  const [cep, setCep] = useState('');
  const [achada, setAchada] = useState<Regiao | null>(null);
  const [mapa, setMapa] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) { setSalva(null); return; }
    supabase.from('perfil_regiao').select('cep5, bairro, cidade, uf, mapa_consentido').maybeSingle()
      .then(({ data }) => { setSalva((data as Regiao) || null); setMapa(!!(data as Regiao | null)?.mapa_consentido); });
  }, [user?.id]);

  const buscar = async (v: string) => {
    const d = v.replace(/\D/g, '');
    setAchada(null);
    if (d.length !== 8) return;
    setBuscando(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j?.erro || !j?.localidade) Alert.alert('CEP não encontrado', 'Confira os números.');
      else setAchada({ cep5: d.slice(0, 5), bairro: j.bairro || null, cidade: j.localidade, uf: j.uf || null, mapa_consentido: mapa });
    } catch { Alert.alert('Sem conexão', 'Não deu para consultar o CEP agora.'); }
    finally { setBuscando(false); }
  };

  const salvar = async () => {
    const r = achada || salva;
    if (!r || !user) return;
    setSalvando(true);
    const { error } = await supabase.from('perfil_regiao').upsert({ user_id: user.id, cep5: r.cep5, bairro: r.bairro, cidade: r.cidade, uf: r.uf, mapa_consentido: mapa });
    setSalvando(false);
    if (error) { Alert.alert('Não deu', error.message.includes('perfil_regiao') ? 'Esta função ainda não está ligada.' : error.message); return; }
    setSalva({ ...r, mapa_consentido: mapa }); setAchada(null); setCep('');
    Alert.alert('Pronto', 'Seu bairro foi salvo.');
  };

  const apagar = () => Alert.alert('Apagar seu bairro?', 'Ele sai das sugestões e do Mapa Dicas.', [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: async () => { await supabase.from('perfil_regiao').delete().eq('user_id', user!.id); setSalva(null); setMapa(false); } },
  ]);

  const mostrar = achada || salva;
  return (
    <View style={s.tela}>
      <TopoApp voltar />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: 12 }}><TituloTela titulo="Onde você mora" subtitulo="Opcional. Guardamos só o bairro, e você apaga quando quiser." discreto semMargem /></View>

        {!user ? (
          <TouchableOpacity style={s.btn} onPress={() => router.push('/(tabs)/profile' as any)}><Text style={s.btnTxt}>Entre na sua conta</Text></TouchableOpacity>
        ) : salva === undefined ? <ActivityIndicator color="#E1306C" /> : (
          <>
            <View style={s.card}>
              <Text style={s.rotulo}>CEP</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput value={cep} onChangeText={(v) => { const m = mascara(v); setCep(m); void buscar(m); }} placeholder="00000-000" placeholderTextColor="#626274"
                  keyboardType="number-pad" style={[s.input, { flex: 1 }]} maxLength={9} accessibilityLabel="CEP" />
                {buscando && <ActivityIndicator color="#E1306C" />}
              </View>
              {!!mostrar && (
                <View style={s.achado}>
                  <Feather name="map-pin" size={16} color="#34D399" />
                  <Text style={s.achadoTxt}>{[mostrar.bairro, `${mostrar.cidade}${mostrar.uf ? ` - ${mostrar.uf}` : ''}`].filter(Boolean).join(', ')}</Text>
                </View>
              )}
              <Text style={s.nota}>Guardamos só o bairro e a cidade (e os 5 primeiros números do CEP). O CEP completo não fica salvo.</Text>
            </View>

            <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTit}>Entrar no Mapa Dicas</Text>
                <Text style={s.sub}>Contamos quantas pessoas do app moram em cada bairro, sem nome e sem nada que identifique você. Bairro com menos de 20 pessoas não aparece. Ajuda a levar mais lugares seguros e políticas públicas para perto de quem precisa.</Text>
              </View>
              <Switch value={mapa} onValueChange={setMapa} trackColor={{ true: '#34D399', false: '#3A3950' }} accessibilityLabel="Entrar no Mapa Dicas" />
            </View>

            <TouchableOpacity style={[s.btn, !mostrar && { opacity: 0.4 }]} disabled={!mostrar || salvando} onPress={salvar} accessibilityRole="button">
              {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnTxt}>Salvar</Text>}
            </TouchableOpacity>
            {!!salva && <TouchableOpacity onPress={apagar} style={{ alignItems: 'center', paddingVertical: 14 }}><Text style={s.apagar}>Apagar meu bairro</Text></TouchableOpacity>}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0A10' },
  titulo: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  lead: { color: '#A0A0B2', fontSize: 13.5, lineHeight: 19, marginTop: 4, marginBottom: 14 },
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 16, padding: 14, marginBottom: 12 },
  cardTit: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  sub: { color: '#A0A0B2', fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  rotulo: { color: '#A0A0B2', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#2A2840', backgroundColor: '#0F0E16', borderRadius: 12, color: '#FFF', paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, letterSpacing: 1 },
  achado: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  achadoTxt: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1 },
  nota: { color: '#626274', fontSize: 11.5, lineHeight: 16, marginTop: 10 },
  btn: { alignItems: 'center', backgroundColor: '#E1306C', borderRadius: 14, paddingVertical: 14 },
  btnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  apagar: { color: '#8E8BA3', fontSize: 13, fontWeight: '700' },
});
