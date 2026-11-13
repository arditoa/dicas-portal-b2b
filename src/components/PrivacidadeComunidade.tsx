// Conta › Privacidade e conta (LGPD): o que é da Comunidade e do Relatório de público (migrações 113 e 114).
//   • Consentimento NOVO e separado para a identidade de gênero entrar, anônima e somada, nos relatórios
//     para casas e marcas (perfil_privado.consentimento_relatorio_genero, padrão: não). Orientação sexual nunca entra.
//   • "Apagar meu histórico de presença": apaga todos os "Eu vou" da pessoa (apagar_historico_presenca).
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { apagarHistorico } from '../lib/euVou';
import { supabase } from '../lib/supabase';

export const TEXTO_CONSENTIMENTO_GENERO =
  'Autorizo usar minha identidade de gênero, de forma anônima e somada, em relatórios para casas e marcas parceiras.';

export default function PrivacidadeComunidade({ userId }: { userId: string }) {
  const [genero, setGenero] = useState<boolean | null>(null); // null = carregando ou sem a migração 114
  const [salvando, setSalvando] = useState(false);
  const [apagando, setApagando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.from('perfil_privado').select('consentimento_relatorio_genero').eq('user_id', userId).maybeSingle();
      if (!vivo) return;
      setGenero(error ? null : !!(data as { consentimento_relatorio_genero?: boolean } | null)?.consentimento_relatorio_genero);
    })();
    return () => { vivo = false; };
  }, [userId]);

  const mudarGenero = async (v: boolean) => {
    setSalvando(true);
    const antes = genero;
    setGenero(v);
    const { error } = await supabase.from('perfil_privado').upsert(
      { user_id: userId, consentimento_relatorio_genero: v, consentimento_relatorio_genero_em: v ? new Date().toISOString() : null },
      { onConflict: 'user_id' },
    );
    setSalvando(false);
    if (error) {
      setGenero(antes);
      Alert.alert('Privacidade', 'Não deu para salvar agora. Tente de novo.');
    }
  };

  const confirmarApagar = () =>
    Alert.alert('Apagar seu histórico de presença?', 'Apaga todos os "Eu vou" que você marcou, inclusive os de eventos que ainda vão acontecer. Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar', style: 'destructive', onPress: async () => {
          setApagando(true);
          try {
            const n = await apagarHistorico();
            Alert.alert('Pronto', n ? `Apagamos ${n} ${n === 1 ? 'presença' : 'presenças'}.` : 'Você não tinha nenhuma presença marcada.');
          } catch (e: any) {
            Alert.alert('Não deu certo', e?.message || 'Tente de novo em instantes.');
          } finally {
            setApagando(false);
          }
        },
      },
    ]);

  return (
    <>
      {genero !== null && (
        <View style={[s.linha, s.borda]}>
          <View style={[s.icone, { backgroundColor: '#FFFFFF26' }]}><Feather name="pie-chart" size={16} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>Relatórios anônimos</Text>
            <Text style={s.sub}>{TEXTO_CONSENTIMENTO_GENERO} Orientação sexual nunca entra.</Text>
          </View>
          <Switch value={genero} onValueChange={(v) => void mudarGenero(v)} disabled={salvando} trackColor={{ true: '#4CAF7D', false: '#3A3950' }} thumbColor="#FFF" accessibilityLabel={TEXTO_CONSENTIMENTO_GENERO} />
        </View>
      )}
      <TouchableOpacity style={[s.linha, s.borda]} onPress={confirmarApagar} disabled={apagando} activeOpacity={0.7} accessibilityRole="button">
        <View style={[s.icone, { backgroundColor: '#FFFFFF26' }]}>
          {apagando ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="user-x" size={16} color="#FFFFFF" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>Apagar meu histórico de presença</Text>
          <Text style={s.sub}>Todos os "Eu vou" que você marcou</Text>
        </View>
        <Feather name="chevron-right" size={16} color="#626274" />
      </TouchableOpacity>
    </>
  );
}

// Mesmo desenho das linhas da Conta (profile.tsx: linha, linhaBorda, menuIconBg, menuItemText, menuItemSub).
const s = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  borda: { borderBottomWidth: 1, borderBottomColor: '#2E2E3D' },
  icone: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 12, fontWeight: '600', color: '#F5F5F7' },
  sub: { fontSize: 10, color: '#A0A0B2', marginTop: 1, lineHeight: 14 },
});
