// "Cheguei bem" visto por quem acompanha (link que a pessoa mandou). Quem tem o app pode receber notificação se ela atrasar.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TopoApp from '../../components/TopoApp';
import { useAuth } from '../../lib/authContext';
import { ativarPushNesteAparelho } from '../../lib/push';
import { linkMapa, NUMEROS } from '../../lib/seguranca';
import { supabase } from '../../lib/supabase';

type Publica = { nome: string; status: 'a_caminho' | 'atrasada' | 'chegou' | 'cancelada'; previsao: string; chegou_em: string | null; saiu_de: string | null; lat: number | null; lng: number | null; loc_em: string | null };
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function AcompanharVolta() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [v, setV] = useState<Publica | null | undefined>(undefined);
  const [seguindo, setSeguindo] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('volta_publica', { p_token: String(token || '') });
    setV(error ? null : ((data as Publica) || null));
  }, [token]);
  useEffect(() => {
    void carregar();
    const t = setInterval(() => { void carregar(); }, 30000);
    return () => clearInterval(t);
  }, [carregar]);

  const seguir = async () => {
    if (!user) { router.push('/(tabs)/profile' as any); return; }
    setOcupado(true);
    const push = await ativarPushNesteAparelho();
    const { data, error } = await supabase.rpc('acompanhar_volta', { p_token: String(token || '') });
    setOcupado(false);
    if (error || !data) { Alert.alert('Não deu', 'Este link expirou ou é seu.'); return; }
    setSeguindo(true);
    Alert.alert('Combinado', push === 'ok' ? 'Você recebe uma notificação se a pessoa atrasar e quando ela chegar.' : 'Libere as notificações do app nos Ajustes para receber o alerta.');
  };

  const cor = v?.status === 'chegou' ? '#34D399' : v?.status === 'atrasada' ? '#F2C94C' : v?.status === 'cancelada' ? '#626274' : '#A78BFA';
  const titulo = !v ? '' : v.status === 'chegou' ? `${v.nome} chegou bem 💚` : v.status === 'atrasada' ? `${v.nome} ainda não confirmou que chegou`
    : v.status === 'cancelada' ? `${v.nome} cancelou o aviso` : `${v.nome} está voltando para casa`;

  return (
    <View style={s.tela}>
      <TopoApp voltar />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {v === undefined ? <ActivityIndicator color="#E1306C" style={{ marginTop: 40 }} /> : !v ? (
          <View style={s.card}><Text style={s.tit}>Link expirado</Text><Text style={s.sub}>Este aviso some 12 horas depois do horário combinado.</Text></View>
        ) : (
          <>
            <View style={[s.card, { borderColor: cor + '88' }]}>
              <Feather name={v.status === 'chegou' ? 'check-circle' : v.status === 'atrasada' ? 'alert-triangle' : 'navigation'} size={26} color={cor} />
              <Text style={[s.tit, { marginTop: 10 }]}>{titulo}</Text>
              <Text style={s.sub}>
                {v.status === 'chegou' && v.chegou_em ? `Confirmou às ${hhmm(v.chegou_em)}.` : `Combinou de chegar até ${hhmm(v.previsao)}${v.saiu_de ? `, saindo do ${v.saiu_de}` : ''}.`}
              </Text>
              {v.status === 'atrasada' && <Text style={[s.sub, { color: '#F2C94C', marginTop: 8 }]}>Tente falar com ela(e). Se não conseguir e achar que é grave, ligue 190.</Text>}
            </View>
            {v.lat != null && v.lng != null && (
              <TouchableOpacity style={s.btnSec} onPress={() => Linking.openURL(linkMapa(v.lat!, v.lng!))}>
                <Feather name="map-pin" size={16} color="#FFF" />
                <Text style={s.btnSecTxt}>Última localização{v.loc_em ? ` (${hhmm(v.loc_em)})` : ''}</Text>
              </TouchableOpacity>
            )}
            {(v.status === 'a_caminho' || v.status === 'atrasada') && !seguindo && (
              <TouchableOpacity style={s.btn} onPress={seguir} disabled={ocupado}>
                {ocupado ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnTxt}>Me avise se ela(e) atrasar</Text>}
              </TouchableOpacity>
            )}
            {seguindo && <Text style={[s.sub, { textAlign: 'center', marginTop: 12 }]}>Você vai receber o aviso neste celular.</Text>}
            {v.status === 'atrasada' && (
              <TouchableOpacity style={[s.btn, { backgroundColor: '#EF4444' }]} onPress={() => Linking.openURL(NUMEROS.policia)}><Text style={s.btnTxt}>Ligar 190</Text></TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0A10' },
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 18, padding: 18, marginBottom: 12 },
  tit: { color: '#FFF', fontSize: 19, fontWeight: '900' },
  sub: { color: '#A0A0B2', fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  btn: { backgroundColor: '#E1306C', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  btnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  btnSec: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#232230', backgroundColor: '#1D1C29', borderRadius: 14, paddingVertical: 13 },
  btnSecTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
