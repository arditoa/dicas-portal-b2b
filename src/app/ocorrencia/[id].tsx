// Rodada 76 — acompanhamento de uma ocorrência: situação, linha do tempo,
// conversa com a equipe e resumo para o Boletim de Ocorrência.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../lib/authContext';
import {
  CANAIS,
  OcorrenciaResumo,
  STATUS_COR,
  STATUS_ROTULO,
  dataHoraBr,
  resumoParaBO,
  rotuloCategoria,
} from '../../lib/ocorrencias';
import { supabase } from '../../lib/supabase';

type Evento = {
  id: string;
  autor_papel: 'usuario' | 'equipe' | 'sistema';
  acao: string;
  status_novo: string | null;
  texto: string | null;
  created_at: string;
};

export default function DetalheOcorrencia() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [o, setO] = useState<(OcorrenciaResumo & { encaminhamento: string | null }) | null>(null);
  const [anexos, setAnexos] = useState(0);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    if (!id || !user) return;
    const [a, b, c] = await Promise.all([
      supabase.from('ocorrencias').select('*').eq('id', id).maybeSingle(),
      supabase.from('ocorrencia_anexos').select('id', { count: 'exact', head: true }).eq('ocorrencia_id', id),
      supabase
        .from('ocorrencia_historico')
        .select('id, autor_papel, acao, status_novo, texto, created_at')
        .eq('ocorrencia_id', id)
        .order('created_at', { ascending: true }),
    ]);
    setO((a.data as any) ?? null);
    setAnexos(b.count ?? 0);
    setEventos((c.data as Evento[]) ?? []);
    setCarregando(false);
  }, [id, user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const enviarMensagem = async () => {
    const texto = msg.trim();
    if (!texto || !id || !user) return;
    setEnviando(true);
    const { error } = await supabase.from('ocorrencia_historico').insert({
      ocorrencia_id: id,
      autor_id: user.id,
      autor_papel: 'usuario',
      acao: 'mensagem_usuario',
      texto,
    });
    setEnviando(false);
    if (error) {
      Alert.alert('Não foi possível enviar', error.message);
      return;
    }
    setMsg('');
    carregar();
  };

  const compartilhar = async () => {
    if (!o) return;
    try {
      await Share.share({ message: resumoParaBO(o, anexos) });
    } catch {
      // usuário cancelou
    }
  };

  if (carregando) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color="#E1306C" />
      </View>
    );
  }

  if (!o) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="chevron-left" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Ocorrência</Text>
          </View>
          <Text style={[styles.texto, { padding: 20 }]}>Não encontramos esta ocorrência na sua conta.</Text>
        </SafeAreaView>
      </View>
    );
  }

  const cor = STATUS_COR[o.status] ?? '#8A8AA0';

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{o.protocolo}</Text>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={[styles.status, { borderColor: cor }]}>
              <Text style={[styles.statusTxt, { color: cor }]}>{STATUS_ROTULO[o.status] ?? o.status}</Text>
              <Text style={styles.statusSub}>{rotuloCategoria(o.categoria)}</Text>
            </View>

            {o.status === 'aguardando_informacoes' && (
              <View style={styles.alerta}>
                <Text style={styles.alertaTxt}>
                  A equipe pediu mais informações. Responda na conversa abaixo.
                </Text>
              </View>
            )}

            {!!o.encaminhamento && (
              <View style={styles.caixa}>
                <Text style={styles.caixaT}>Encaminhamento da equipe</Text>
                <Text style={styles.texto}>{o.encaminhamento}</Text>
              </View>
            )}

            <View style={styles.caixa}>
              <Text style={styles.caixaT}>Resumo para o Boletim de Ocorrência</Text>
              <Text style={styles.dica}>
                Copie ou compartilhe este texto ao registrar o B.O. na delegacia ou no serviço online da
                Polícia Civil. Ele organiza as informações; não é um documento oficial.
              </Text>
              <TouchableOpacity style={styles.btn} onPress={compartilhar}>
                <Feather name="share-2" size={14} color="#FFF" />
                <Text style={styles.btnTxt}>Compartilhar resumo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL(CANAIS.disque100)}>
                <Text style={styles.link}>Precisa de apoio agora? Disque 100</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.caixaT}>Linha do tempo</Text>
            {eventos.map((e) => (
              <View key={e.id} style={[styles.evento, e.autor_papel === 'usuario' && styles.eventoUsuario]}>
                <Text style={styles.eventoQuem}>
                  {e.autor_papel === 'usuario' ? 'Você' : e.autor_papel === 'equipe' ? 'Equipe Dicas LGBT+' : 'Sistema'} ·{' '}
                  {dataHoraBr(e.created_at)}
                </Text>
                {e.acao === 'status' && e.status_novo && (
                  <Text style={styles.eventoTxt}>Situação alterada para: {STATUS_ROTULO[e.status_novo] ?? e.status_novo}</Text>
                )}
                {!!e.texto && <Text style={styles.eventoTxt}>{e.texto}</Text>}
              </View>
            ))}

            <Text style={styles.caixaT}>Acrescentar informação ou responder</Text>
            <TextInput
              style={styles.input}
              placeholder="Escreva aqui..."
              placeholderTextColor="#606070"
              multiline
              value={msg}
              onChangeText={setMsg}
              maxLength={3000}
            />
            <TouchableOpacity
              style={[styles.btnPrimario, (!msg.trim() || enviando) && { opacity: 0.5 }]}
              onPress={enviarMensagem}
              disabled={!msg.trim() || enviando}
            >
              {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTxt}>Enviar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  texto: { color: '#C8C8D6', fontSize: 13, lineHeight: 19 },
  dica: { color: '#8A8AA0', fontSize: 12, lineHeight: 17 },
  status: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 3, backgroundColor: '#1C1B26' },
  statusTxt: { fontSize: 16, fontWeight: '800' },
  statusSub: { color: '#A0A0B2', fontSize: 12 },
  alerta: { backgroundColor: '#2A1B2A', borderRadius: 12, borderWidth: 1, borderColor: '#E1306C', padding: 12 },
  alertaTxt: { color: '#FFD0E0', fontSize: 12, lineHeight: 17 },
  caixa: { backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', padding: 14, gap: 8 },
  caixaT: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: '#2D2B3D', height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnPrimario: { backgroundColor: '#E1306C', height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  link: { color: '#FF9DB8', fontSize: 12, fontWeight: '700' },
  evento: { backgroundColor: '#1C1B26', borderRadius: 12, padding: 12, gap: 4, borderLeftWidth: 3, borderLeftColor: '#6C8CFF' },
  eventoUsuario: { borderLeftColor: '#E1306C' },
  eventoQuem: { color: '#8A8AA0', fontSize: 11, fontWeight: '700' },
  eventoTxt: { color: '#E6E6F0', fontSize: 13, lineHeight: 19 },
  input: { backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', padding: 14, color: '#FFF', minHeight: 90, textAlignVertical: 'top', fontSize: 14 },
});
