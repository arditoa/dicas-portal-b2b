import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../lib/authContext';
import {
  PREFS_VAZIAS,
  PrefsPush,
  TipoPush,
  ativarPushNesteAparelho,
  ativarTodosAvisos,
  desativarPushNesteAparelho,
  lerPreferencias,
  salvarPreferencias,
} from '../lib/push';

const ITENS: { tipo: TipoPush; titulo: string; texto: string }[] = [
  { tipo: 'festas', titulo: 'Festas e agenda', texto: 'Festas em destaque e eventos do dia ou do fim de semana.' },
  { tipo: 'cupons', titulo: 'Cupons e ofertas', texto: 'Cupons de bares, festas e parceiros. Mensagens promocionais.' },
  { tipo: 'lembretes', titulo: 'Lembretes', texto: 'Lembretes dos seus eventos salvos, Lista VIP e cupons perto de vencer.' },
  { tipo: 'novidades', titulo: 'Novidades do app', texto: 'Lançamentos, novas categorias e avisos gerais do Dicas LGBT+.' },
];

export default function NotificacoesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<PrefsPush>(PREFS_VAZIAS);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setCarregando(false);
      return;
    }
    lerPreferencias(user.id)
      .then(setPrefs)
      .finally(() => setCarregando(false));
  }, [user?.id]);

  const alternar = useCallback(
    async (tipo: TipoPush, ligado: boolean) => {
      if (!user?.id || salvando) return;
      setSalvando(true);
      try {
        const novo = { ...prefs, [tipo]: ligado };
        if (ligado) {
          const r = await ativarPushNesteAparelho();
          if (r === 'negado') {
            Alert.alert(
              'Permissão necessária',
              'Para receber avisos, permita notificações do Dicas LGBT+ nos Ajustes do seu celular.',
              [
                { text: 'Agora não', style: 'cancel' },
                { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
              ]
            );
            return;
          }
          if (r === 'indisponivel') {
            Alert.alert('Não foi possível ativar', 'Os avisos não estão disponíveis neste aparelho agora. Tente de novo mais tarde.');
            return;
          }
        }
        const ok = await salvarPreferencias(user.id, novo);
        if (!ok) {
          Alert.alert('Ops', 'Não foi possível salvar sua escolha. Tente novamente.');
          return;
        }
        setPrefs(novo);
        if (!Object.values(novo).some(Boolean)) await desativarPushNesteAparelho();
      } finally {
        setSalvando(false);
      }
    },
    [prefs, salvando, user?.id]
  );

  const ativarTudo = useCallback(async () => {
    if (!user?.id || salvando) return;
    setSalvando(true);
    try {
      const r = await ativarTodosAvisos(user.id);
      if (r === 'ok') {
        setPrefs({ festas: true, cupons: true, lembretes: true, novidades: true });
      } else if (r === 'negado') {
        Alert.alert('Permissão necessária', 'Para receber avisos, permita notificações do Dicas LGBT+ nos Ajustes do seu celular.', [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
        ]);
      } else {
        Alert.alert('Não foi possível ativar', 'Os avisos não estão disponíveis neste aparelho agora. Tente de novo mais tarde.');
      }
    } finally {
      setSalvando(false);
    }
  }, [salvando, user?.id]);

  const todosLigados = Object.values(prefs).every(Boolean);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Voltar">
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Notificações</Text>
        </View>

        <View style={{ padding: 20, gap: 14 }}>
          {!user ? (
            <View style={styles.aviso}>
              <Feather name="lock" size={14} color="#A0A0B2" />
              <Text style={styles.avisoTexto}>Entre na sua conta (aba Conta) para escolher quais avisos quer receber.</Text>
            </View>
          ) : carregando ? (
            <ActivityIndicator color="#E1306C" />
          ) : (
            <>
              <Text style={styles.intro}>
                Escolha quais avisos quer receber. Você pode ligar ou desligar cada um quando quiser.
              </Text>
              {!todosLigados && (
                <TouchableOpacity style={styles.btnTodos} onPress={ativarTudo} disabled={salvando} activeOpacity={0.85}>
                  <Feather name="bell" size={16} color="#FFF" />
                  <Text style={styles.btnTodosTexto}>Ativar todos os avisos</Text>
                </TouchableOpacity>
              )}
              {ITENS.map((it) => (
                <View key={it.tipo} style={styles.linha}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linhaTitulo}>{it.titulo}</Text>
                    <Text style={styles.linhaTexto}>{it.texto}</Text>
                  </View>
                  <Switch
                    value={prefs[it.tipo]}
                    onValueChange={(v) => alternar(it.tipo, v)}
                    disabled={salvando}
                    trackColor={{ false: '#2D2B3D', true: '#E1306C' }}
                    thumbColor="#FFF"
                    accessibilityLabel={it.titulo}
                  />
                </View>
              ))}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  btnTodos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E1306C', height: 46, borderRadius: 12 },
  btnTodosTexto: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  intro: { fontSize: 13, color: '#A0A0B2', lineHeight: 19 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1C1B26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2B3D',
    padding: 14,
  },
  linhaTitulo: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  linhaTexto: { fontSize: 12, color: '#A0A0B2', marginTop: 2, lineHeight: 17 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1C1B26',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2B3D',
    padding: 12,
  },
  avisoTexto: { color: '#A0A0B2', fontSize: 12, flex: 1 },
});
