// "Me ajuda aqui" (migração 136): pedidos de ajuda de clientes que estão na casa. Aparece no topo do Início do
// Modo parceiro para o dono e a equipe com acesso à porta ou aos check-ins. Atualiza a cada 20 segundos.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

type Alerta = { id: string; nome: string; mensagem: string | null; status: 'aberto' | 'indo' | 'resolvido'; criado_em: string; atendido_por: string | null };
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function AlertasDeAjuda({ localId }: { localId: string | null | undefined }) {
  const [lista, setLista] = useState<Alerta[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!localId) return;
    const { data, error } = await supabase.rpc('alertas_da_casa', { p_local: localId });
    if (!error) setLista((data as Alerta[]) || []);
  }, [localId]);

  useFocusEffect(useCallback(() => {
    void carregar();
    const t = setInterval(() => { void carregar(); }, 20000);
    return () => clearInterval(t);
  }, [carregar]));

  const atender = async (a: Alerta, status: 'indo' | 'resolvido') => {
    setOcupado(a.id + status);
    await supabase.rpc('atender_alerta', { p_alerta: a.id, p_status: status });
    await carregar();
    setOcupado(null);
  };

  const ativos = lista.filter((a) => a.status !== 'resolvido');
  if (ativos.length === 0) return null;
  return (
    <View style={{ marginBottom: 14 }}>
      {ativos.map((a) => (
        <View key={a.id} style={s.card} accessibilityRole="alert">
          <View style={s.topo}>
            <Feather name="alert-triangle" size={18} color="#FFF" />
            <Text style={s.tit}>{a.nome} pediu ajuda · {hhmm(a.criado_em)}</Text>
          </View>
          <Text style={s.msg}>{a.mensagem ? `"${a.mensagem}"` : 'Sem mensagem. Procure a pessoa pelo nome e pergunte com discrição.'}</Text>
          {a.status === 'indo' && <Text style={s.indo}>{a.atendido_por || 'Alguém da equipe'} está indo até a pessoa.</Text>}
          <View style={s.botoes}>
            {a.status === 'aberto' && (
              <TouchableOpacity style={[s.btn, { backgroundColor: '#FFF' }]} onPress={() => atender(a, 'indo')} disabled={!!ocupado} accessibilityRole="button">
                {ocupado === a.id + 'indo' ? <ActivityIndicator color="#B91C1C" /> : <Text style={[s.btnTxt, { color: '#B91C1C' }]}>Estou indo</Text>}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btn, { borderWidth: 1, borderColor: '#FFFFFF88' }]} onPress={() => atender(a, 'resolvido')} disabled={!!ocupado} accessibilityRole="button">
              {ocupado === a.id + 'resolvido' ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnTxt}>Resolvido</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#B91C1C', borderRadius: 16, padding: 14, marginBottom: 8 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tit: { color: '#FFF', fontSize: 15, fontWeight: '900', flex: 1 },
  msg: { color: '#FFE4E6', fontSize: 13.5, lineHeight: 19, marginTop: 6 },
  indo: { color: '#FFF', fontSize: 12.5, fontWeight: '700', marginTop: 6 },
  botoes: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 10 },
  btnTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
