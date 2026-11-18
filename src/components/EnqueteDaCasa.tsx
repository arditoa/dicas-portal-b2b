// Enquete da casa com prêmio (migração 129): "Responda e ganhe 1 drink".
// Casas Premium/Fundador. A pessoa responde no app (pode ser de casa); o prêmio só sai na casa:
// "Estou aqui · pegar meu prêmio" confere a localização e a fila. Mostra só quanto ainda resta ("Restam 12").
// Verde = vantagem (mesma cor do cupom da casa).
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';

const VERDE = '#34D399';
type Pergunta = { id: string; texto: string; tipo: 'escolha' | 'nota' | 'aberta'; opcoes?: string[] };
type Enquete = { id: string; titulo: string; premio: string; regra: string | null; perguntas: Pergunta[]; fim: string; restam: number | null };
type Minha = { respondeu: boolean; premio_em: string | null; numero: number | null } | null;

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

export default function EnqueteDaCasa({ localId }: { localId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [e, setE] = useState<Enquete | null>(null);
  const [minha, setMinha] = useState<Minha>(null);
  const [aberta, setAberta] = useState(false);
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string | number>>({});
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('enquete_da_casa', { p_local: localId });
    if (error || !data) return setE(null);
    const x = data as Enquete;
    setE(x);
    if (user) {
      const m = await supabase.rpc('minha_enquete_casa', { p_enquete: x.id });
      setMinha((m.data as Minha) || null);
    }
  }, [localId, user?.id]);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => { void carregar(); }, 30 * 1000);
    return () => clearInterval(t);
  }, [carregar]);

  if (!e) return null;
  const acabou = e.restam != null && e.restam <= 0;
  const restamTxt = e.restam != null ? (e.restam > 0 ? `Restam ${e.restam}` : 'Acabou') : null;
  const q = e.perguntas[passo];
  const fim = e.fim.split('-').reverse().slice(0, 2).join('/');

  const pedirLogin = () => Alert.alert('Entre na sua conta', 'Para responder e ganhar o prêmio, entre ou crie sua conta (é rapidinho).', [
    { text: 'Agora não', style: 'cancel' },
    { text: 'Entrar', onPress: () => router.push('/(tabs)/profile' as any) },
  ]);

  async function enviar(finais: Record<string, string | number>) {
    if (!Object.keys(finais).length) {
      setPasso(0);
      return Alert.alert('Enquete', 'Responda pelo menos uma pergunta para ganhar o prêmio.');
    }
    setEnviando(true);
    const { error } = await supabase.rpc('responder_enquete_casa', { p_enquete: e!.id, p_respostas: finais });
    setEnviando(false);
    if (error) return Alert.alert('Enquete', error.message);
    setAberta(false);
    setMinha({ respondeu: true, premio_em: null, numero: null });
  }

  const responder = (valor: string | number | null) => {
    const novas = { ...respostas };
    if (valor !== null && valor !== '') novas[q.id] = valor;
    setRespostas(novas); setTexto('');
    if (passo + 1 < e.perguntas.length) setPasso(passo + 1);
    else void enviar(novas);
  };

  async function pegarPremio() {
    setEnviando(true);
    try {
      const p = await posicao();
      const { data, error } = await supabase.rpc('pegar_premio_enquete', { p_enquete: e!.id, p_lat: p?.lat ?? null, p_lng: p?.lng ?? null });
      if (error) return Alert.alert('Prêmio', error.message);
      const r = (data || {}) as { status: string; numero?: number; quando?: string };
      if (r.status === 'ok' || r.status === 'ja') return setMinha({ respondeu: true, premio_em: r.quando || new Date().toISOString(), numero: r.numero || null });
      if (r.status === 'esgotado') { void carregar(); return Alert.alert('Acabou!', 'Os prêmios desta enquete já foram todos. Obrigado por responder!'); }
      if (r.status === 'sem_local') return Alert.alert('Localização', 'Libere a localização para confirmar que você está na casa.');
      if (r.status === 'longe') return Alert.alert('Ainda não', 'O prêmio sai na casa. Toque aqui de novo quando chegar.');
      if (r.status === 'nao_respondeu') return setMinha(null);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={s.card}>
      <View style={s.topo}>
        <View style={s.icone}><Feather name="message-square" size={16} color={VERDE} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.tag}>RESPONDA E GANHE</Text>
          <Text style={s.titulo} numberOfLines={2}>{e.premio}</Text>
          <Text style={s.sub} numberOfLines={2}>{[`${e.perguntas.length} ${e.perguntas.length === 1 ? 'pergunta' : 'perguntas'}`, `até ${fim}`, e.regra].filter(Boolean).join(' · ')}</Text>
        </View>
        {!!restamTxt && <View style={s.restam}><Text style={s.restamTxt}>{restamTxt}</Text></View>}
      </View>

      {minha?.premio_em ? (
        <View style={s.vale}>
          <View style={s.valeTopo}><Feather name="check-circle" size={16} color={VERDE} /><Text style={s.valeTopoTxt}>Você ganhou! Mostre esta tela no balcão</Text></View>
          <Text style={s.valeBrinde} numberOfLines={2}>{e.premio}</Text>
          <Text style={s.valeInfo}>{minha.numero ? `nº ${minha.numero} · ` : ''}{hora(minha.premio_em)}</Text>
        </View>
      ) : minha?.respondeu ? (
        <>
          <Text style={s.feito}>Respondido, obrigado! Seu prêmio sai na casa: quando chegar, toque abaixo.</Text>
          {acabou ? (
            <View style={[s.btn, s.btnAcabou]}><Text style={s.acabouTxt}>Os prêmios acabaram</Text></View>
          ) : (
            <TouchableOpacity style={s.btn} onPress={() => void pegarPremio()} disabled={enviando} accessibilityRole="button">
              {enviando ? <ActivityIndicator color="#0B0B0E" /> : <><Feather name="map-pin" size={14} color="#0B0B0E" /><Text style={s.btnTxt}>Estou aqui · pegar meu prêmio</Text></>}
            </TouchableOpacity>
          )}
        </>
      ) : acabou ? (
        <View style={[s.btn, s.btnAcabou]}><Text style={s.acabouTxt}>Os prêmios acabaram</Text></View>
      ) : !aberta ? (
        <TouchableOpacity style={s.btn} onPress={() => (user ? setAberta(true) : pedirLogin())} accessibilityRole="button">
          <Feather name="edit-3" size={14} color="#0B0B0E" /><Text style={s.btnTxt}>Responder e ganhar</Text>
        </TouchableOpacity>
      ) : q ? (
        <View style={s.perguntaBox}>
          <Text style={s.passo}>{passo + 1} de {e.perguntas.length}</Text>
          <Text style={s.pergunta}>{q.texto}</Text>
          {q.tipo === 'escolha' && (
            <View style={s.opcoes}>
              {(q.opcoes || []).map((o) => (
                <TouchableOpacity key={o} style={s.opcao} onPress={() => responder(o)} disabled={enviando} activeOpacity={0.8} accessibilityRole="button">
                  <Text style={s.opcaoTxt}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {q.tipo === 'nota' && (
            <>
              <View style={s.opcoes}>
                {Array.from({ length: 11 }, (_, n) => (
                  <TouchableOpacity key={n} style={s.nota} onPress={() => responder(n)} disabled={enviando} accessibilityRole="button" accessibilityLabel={`Nota ${n}`}>
                    <Text style={s.opcaoTxt}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.legenda}><Text style={s.legTxt}>Nada</Text><Text style={s.legTxt}>Muito</Text></View>
            </>
          )}
          {q.tipo === 'aberta' && (
            <>
              <TextInput style={s.campo} value={texto} onChangeText={setTexto} placeholder="Escreva aqui" placeholderTextColor="#6E6B80" maxLength={280} multiline />
              <TouchableOpacity style={s.btn} onPress={() => responder(texto.trim())} disabled={enviando} accessibilityRole="button">
                {enviando ? <ActivityIndicator color="#0B0B0E" /> : <Text style={s.btnTxt}>{passo + 1 < e.perguntas.length ? 'Próxima' : 'Enviar'}</Text>}
              </TouchableOpacity>
            </>
          )}
          {q.tipo !== 'aberta' && enviando && <ActivityIndicator color={VERDE} style={{ marginTop: 10 }} />}
          <TouchableOpacity onPress={() => responder(null)} disabled={enviando} style={s.pular} accessibilityRole="button">
            <Text style={s.pularTxt}>Pular esta</Text>
          </TouchableOpacity>
          <Text style={s.rodape}>A casa vê as respostas somadas, sem o seu nome.</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#34D39940', borderRadius: 16, padding: 12, marginTop: 12 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icone: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#34D3991F', alignItems: 'center', justifyContent: 'center' },
  tag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: VERDE },
  titulo: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginTop: 1 },
  sub: { color: '#A0A0B2', fontSize: 11.5, marginTop: 1 },
  restam: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: '#34D39922' },
  restamTxt: { fontSize: 11.5, fontWeight: '900', color: VERDE },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, minHeight: 38, marginTop: 10, backgroundColor: VERDE },
  btnTxt: { color: '#0B0B0E', fontSize: 13, fontWeight: '800' },
  btnAcabou: { backgroundColor: '#232230' },
  acabouTxt: { color: '#A0A0B2', fontSize: 13, fontWeight: '800' },
  feito: { color: '#D6D3E0', fontSize: 12.5, marginTop: 10, lineHeight: 17 },
  perguntaBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#232230', paddingTop: 10 },
  passo: { color: VERDE, fontSize: 11, fontWeight: '800' },
  pergunta: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 4, lineHeight: 20 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  opcao: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#2E4A3F', backgroundColor: '#1B2421', justifyContent: 'center' },
  opcaoTxt: { color: '#F5F5F7', fontSize: 13, fontWeight: '700' },
  nota: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#2E4A3F', backgroundColor: '#1B2421', alignItems: 'center', justifyContent: 'center' },
  legenda: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  legTxt: { color: '#8E8BA3', fontSize: 11 },
  campo: { marginTop: 10, minHeight: 70, borderRadius: 12, borderWidth: 1, borderColor: '#2E4A3F', backgroundColor: '#1B2421', color: '#FFF', fontSize: 14, padding: 10, textAlignVertical: 'top' },
  pular: { alignSelf: 'flex-start', paddingVertical: 10 },
  pularTxt: { color: '#8E8BA3', fontSize: 12, fontWeight: '600' },
  rodape: { color: '#6E6B80', fontSize: 11 },
  vale: { marginTop: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: VERDE, borderRadius: 14, overflow: 'hidden', paddingBottom: 10 },
  valeTopo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#34D39922' },
  valeTopoTxt: { fontSize: 12, fontWeight: '800', flex: 1, color: VERDE },
  valeBrinde: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', paddingHorizontal: 12, marginTop: 8 },
  valeInfo: { color: '#A0A0B2', fontSize: 12, paddingHorizontal: 12, marginTop: 2 },
});
