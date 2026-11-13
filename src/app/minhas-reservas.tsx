// Reservas fase 2 — "Minhas reservas" do cliente (Conta › Minhas reservas; também abre pelo aviso de reserva confirmada).
// Mostra as reservas da pessoa (RLS: user_id = eu), com a situação: aguardando, confirmada, recusada, cancelada,
// compareceu, não veio. Dá para cancelar as que ainda vão acontecer (responder_reserva 'cancelada', migração 102)
// e abrir a página da casa ou fazer outra reserva.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';

const C = { bg: '#0B0B0E', card: '#161520', borda: '#232230', texto: '#FFFFFF', dim: '#A0A0B2', fraco: '#626274', rosa: '#E1306C', verde: '#4CAF7D' };
const SITUACAO: Record<string, { txt: string; cor: string; icone: keyof typeof Feather.glyphMap }> = {
  aguardando: { txt: 'Esperando a casa confirmar', cor: '#FFD54F', icone: 'clock' },
  confirmada: { txt: 'Confirmada', cor: '#4CAF7D', icone: 'check-circle' },
  recusada: { txt: 'A casa não conseguiu confirmar', cor: '#FF7A7A', icone: 'x-circle' },
  cancelada: { txt: 'Cancelada', cor: '#A0A0B2', icone: 'slash' },
  compareceu: { txt: 'Você foi. Que bom!', cor: '#4CAF7D', icone: 'smile' },
  nao_veio: { txt: 'Marcada como não compareceu', cor: '#A0A0B2', icone: 'user-x' },
};
const OCASIAO: Record<string, string> = { date: 'Date', aniversario: 'Aniversário', amigos: 'Amigos', trabalho: 'Trabalho', outro: 'Outro' };
type Reserva = { id: string; local_id: string; area_nome: string; data: string; horario: string; pessoas: number; ocasiao: string | null; status: string; resposta: string | null; locais: { nome: string } | null };

const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const quando = (r: Reserva) => {
  const d = new Date(`${r.data}T12:00:00`);
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} às ${r.horario.slice(0, 5)}`;
};

export default function MinhasReservas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const logado = !!session && !user?.is_anonymous;
  const [lista, setLista] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!logado || !user) { setCarregando(false); return; }
    const { data } = await supabase
      .from('reservas')
      .select('id, local_id, area_nome, data, horario, pessoas, ocasiao, status, resposta, locais(nome)')
      .eq('user_id', user.id)
      .order('data', { ascending: false })
      .order('horario', { ascending: false })
      .limit(60);
    setLista((data as unknown as Reserva[]) || []);
    setCarregando(false);
  }, [logado, user]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const cancelar = (r: Reserva) =>
    Alert.alert('Cancelar esta reserva?', `${r.locais?.nome || 'A casa'} · ${quando(r)}. A casa fica sabendo na hora.`, [
      { text: 'Manter', style: 'cancel' },
      {
        text: 'Cancelar reserva', style: 'destructive',
        onPress: async () => {
          setCancelando(r.id);
          const { error } = await supabase.rpc('responder_reserva', { p_reserva: r.id, p_status: 'cancelada', p_resposta: null });
          setCancelando(null);
          if (error) return Alert.alert('Reserva', error.message);
          void carregar();
        },
      },
    ]);

  const proximas = lista.filter((r) => r.data >= hoje() && ['aguardando', 'confirmada'].includes(r.status));
  const outras = lista.filter((r) => !proximas.includes(r));

  const cartao = (r: Reserva) => {
    const st = SITUACAO[r.status] || SITUACAO.aguardando;
    const podeCancelar = r.data >= hoje() && ['aguardando', 'confirmada'].includes(r.status);
    return (
      <View key={r.id} style={s.cartao}>
        <TouchableOpacity onPress={() => router.push(`/business/${r.local_id}` as any)} accessibilityRole="button">
          <Text style={s.casa}>{r.locais?.nome || 'Casa'}</Text>
          <Text style={s.linha}>{quando(r)} · {r.pessoas} pessoa{r.pessoas === 1 ? '' : 's'} · {r.area_nome}{r.ocasiao ? ` · ${OCASIAO[r.ocasiao] || r.ocasiao}` : ''}</Text>
        </TouchableOpacity>
        <View style={s.status}>
          <Feather name={st.icone} size={14} color={st.cor} />
          <Text style={[s.statusTxt, { color: st.cor }]}>{st.txt}</Text>
        </View>
        {!!r.resposta && <Text style={s.resposta}>“{r.resposta}”</Text>}
        <View style={s.acoes}>
          {podeCancelar && (
            <TouchableOpacity style={s.botao} onPress={() => cancelar(r)} disabled={cancelando === r.id} accessibilityRole="button">
              {cancelando === r.id ? <ActivityIndicator size="small" color={C.dim} /> : <Text style={s.botaoTxt}>Cancelar</Text>}
            </TouchableOpacity>
          )}
          {!podeCancelar && (
            <TouchableOpacity style={s.botao} onPress={() => router.push(`/reserva/${r.local_id}` as any)} accessibilityRole="button">
              <Text style={s.botaoTxt}>Reservar de novo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[s.tela, { paddingTop: insets.top }]}>
      <View style={s.topo}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))} style={s.voltar} accessibilityLabel="Voltar">
          <Feather name="chevron-left" size={22} color={C.texto} />
        </TouchableOpacity>
        <Text style={s.titulo}>Minhas reservas</Text>
      </View>
      {!logado ? (
        <Text style={s.vazio}>Entre na sua conta (aba Conta) para ver as suas reservas.</Text>
      ) : carregando ? (
        <ActivityIndicator color={C.rosa} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void carregar()} tintColor={C.rosa} />}>
          {lista.length === 0 && <Text style={s.vazio}>Você ainda não fez nenhuma reserva. Nas páginas das casas com reserva, toque em "Fazer reserva".</Text>}
          {proximas.length > 0 && <Text style={s.secao}>Próximas</Text>}
          {proximas.map(cartao)}
          {outras.length > 0 && <Text style={s.secao}>Anteriores</Text>}
          {outras.map(cartao)}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: C.bg },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, minHeight: 52 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: C.texto, fontSize: 20, fontWeight: '800' },
  secao: { color: '#B9B6CC', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 8 },
  vazio: { color: C.dim, fontSize: 14, lineHeight: 20, padding: 16 },
  cartao: { backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 16, padding: 14 },
  casa: { color: C.texto, fontSize: 16, fontWeight: '800' },
  linha: { color: C.dim, fontSize: 13, marginTop: 3, lineHeight: 18 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  statusTxt: { fontSize: 13, fontWeight: '700' },
  resposta: { color: C.dim, fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  acoes: { flexDirection: 'row', gap: 8, marginTop: 12 },
  botao: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.borda, alignItems: 'center', justifyContent: 'center' },
  botaoTxt: { color: C.dim, fontSize: 13, fontWeight: '700' },
});
