// "Estou aqui" da ação de marca (migração 128): confirmar presença = ganhar o brinde da marca.
// 1 por pessoa por ação. Confere a localização (perto da casa) e, se a ação tiver limite, a fila ("primeiros N").
// Se o brinde tiver opções (sabores…), a pessoa escolhe antes. Depois mostra o "vale" para mostrar no balcão.
// Usado no cartão da casa (AcaoNaCasa) e na página da ação (/marca/[id]).
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';
import EscolhaBrinde from './EscolhaBrinde';

type AcaoPresenca = {
  id: string; marca: string; brinde?: string | null; chamada?: string | null; nome: string;
  brinde_pergunta?: string | null; brinde_opcoes?: string[] | null; restam?: number | null;
};
type Ganho = { numero: number; opcao: string | null; quando: string };

// Texto escuro em cor clara (amarelo), branco nas demais.
export function textoSobre(hex: string) {
  const n = parseInt((hex || '#000000').slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? '#0B0B0E' : '#FFFFFF';
}

async function posicao(): Promise<{ lat: number; lng: number } | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((r) => setTimeout(() => r(null), 12000)),
    ]);
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
  } catch {
    return null;
  }
}

const hora = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function PresencaMarca({ acao, localId, cor, foto, aoGanhar }: {
  acao: AcaoPresenca; localId: string; cor: string; foto?: ReactNode; aoGanhar?: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [ganho, setGanho] = useState<Ganho | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [escolher, setEscolher] = useState(false);
  const esgotado = acao.restam != null && acao.restam <= 0;
  const brinde = acao.brinde || acao.chamada || acao.nome;

  useEffect(() => {
    if (!user) return;
    supabase.rpc('minha_presenca_marca', { p_acao: acao.id }).then(({ data }) => {
      if (data && typeof data === 'object' && (data as any).numero) setGanho(data as Ganho);
    }, () => {});
  }, [acao.id, user?.id]);

  async function confirmar(opcao?: string) {
    if (enviando) return;
    if (!user) {
      return Alert.alert('Entre na sua conta', 'Para ganhar o brinde, entre ou crie sua conta (é rapidinho).', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Entrar', onPress: () => router.push('/(tabs)/profile' as any) },
      ]);
    }
    setEnviando(true);
    try {
      const p = await posicao();
      const { data, error } = await supabase.rpc('registrar_presenca_marca', {
        p_acao: acao.id, p_local: localId, p_lat: p?.lat ?? null, p_lng: p?.lng ?? null, p_opcao: opcao ?? null,
      });
      if (error) return Alert.alert('Estou aqui', error.message);
      const r = (data || {}) as { status: string; numero?: number; opcao?: string | null };
      if (r.status === 'ok' || r.status === 'ja') {
        setGanho({ numero: r.numero || 0, opcao: r.opcao ?? opcao ?? null, quando: new Date().toISOString() });
        aoGanhar?.();
        return;
      }
      if (r.status === 'escolha') return setEscolher(true);
      if (r.status === 'esgotado') { aoGanhar?.(); return Alert.alert('Acabou!', `Os brindes da ${acao.marca} já foram todos. Fique de olho nas próximas ações.`); }
      if (r.status === 'fora_do_horario') return Alert.alert('Ainda não', 'Esta ação vale só no horário da festa. Volte quando ela começar.');
      if (r.status === 'sem_local') return Alert.alert('Localização', 'Libere a localização para confirmar que você está na casa.');
      if (r.status === 'longe') return Alert.alert('Estou aqui', 'Parece que você ainda não está na casa. Tente quando chegar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {ganho ? (
        // O "vale": mostrar no balcão
        <View style={[s.vale, { borderColor: cor }]}>
          <View style={[s.valeTopo, { backgroundColor: `${cor}22` }]}>
            <Feather name="check-circle" size={16} color={cor} />
            <Text style={[s.valeTopoTxt, { color: cor }]}>Você ganhou! Mostre esta tela no balcão</Text>
          </View>
          <Text style={s.valeBrinde} numberOfLines={2}>{brinde}{ganho.opcao ? ` · ${ganho.opcao}` : ''}</Text>
          <Text style={s.valeInfo}>{acao.marca} · nº {ganho.numero} · {hora(ganho.quando)}</Text>
        </View>
      ) : null}
      <View style={s.linha}>
        {!ganho && (
          esgotado ? (
            <View style={[s.btn, s.btnAcabou]}><Text style={s.acabouTxt}>Acabou</Text></View>
          ) : (
            <TouchableOpacity style={[s.btn, { backgroundColor: cor }]} onPress={() => void confirmar()} disabled={enviando} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Estou aqui: ganhar ${brinde}`}>
              {enviando ? <ActivityIndicator color={textoSobre(cor)} /> : <><Feather name="map-pin" size={14} color={textoSobre(cor)} /><Text style={[s.btnTxt, { color: textoSobre(cor) }]} numberOfLines={1}>Estou aqui</Text></>}
            </TouchableOpacity>
          )
        )}
        {foto}
      </View>
      {escolher && (
        <EscolhaBrinde
          visivel
          marca={acao.marca}
          pergunta={acao.brinde_pergunta}
          opcoes={acao.brinde_opcoes || []}
          cor={cor}
          aoEscolher={(o) => { setEscolher(false); void confirmar(o); }}
          aoFechar={() => setEscolher(false)}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, minHeight: 38 },
  btnTxt: { fontSize: 13, fontWeight: '800' },
  btnAcabou: { backgroundColor: '#232230' },
  acabouTxt: { color: '#A0A0B2', fontSize: 13, fontWeight: '800' },
  vale: { marginTop: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, overflow: 'hidden', paddingBottom: 10 },
  valeTopo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  valeTopoTxt: { fontSize: 12, fontWeight: '800', flex: 1 },
  valeBrinde: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', paddingHorizontal: 12, marginTop: 8 },
  valeInfo: { color: '#A0A0B2', fontSize: 12, paddingHorizontal: 12, marginTop: 2 },
});
