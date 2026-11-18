// Migração 130 — "Você esteve no Vezpa: responda e ganhe 1 caipirinha".
// Para quem fez check-in (ou "Estou aqui", ou entrou pela Lista VIP) numa casa nos últimos 3 dias e ainda não
// respondeu a enquete dela. Aparece na Home e na Conta; responde aqui mesmo e o prêmio sai na casa.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';
import EnqueteDaCasa from './EnqueteDaCasa';

type Pendente = { local_id: string; local: string; enquete_id: string; premio: string; titulo: string };

export default function EnquetePendente({ margem = 0 }: { margem?: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const [p, setP] = useState<Pendente | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user) { setP(null); return; }
    let vivo = true;
    supabase.rpc('enquete_pendente_para_mim').then(({ data, error }) => {
      if (vivo) setP(error || !data ? null : (data as Pendente));
    }, () => {});
    return () => { vivo = false; };
  }, [user?.id]));

  if (!p) return null;
  return (
    <View style={{ marginHorizontal: margem, marginTop: 16 }}>
      <TouchableOpacity style={s.topo} onPress={() => router.push(`/business/${p.local_id}` as any)} activeOpacity={0.8} accessibilityRole="button">
        <Feather name="map-pin" size={12} color="#34D399" />
        <Text style={s.topoTxt} numberOfLines={1}>Você esteve no {p.local}</Text>
        <Feather name="chevron-right" size={14} color="#8E8BA3" />
      </TouchableOpacity>
      <EnqueteDaCasa localId={p.local_id} />
    </View>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topoTxt: { flex: 1, color: '#D6D3E0', fontSize: 12.5, fontWeight: '700' },
});
