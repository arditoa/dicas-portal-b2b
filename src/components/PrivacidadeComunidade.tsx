// Conta › Privacidade e conta (LGPD): o que é da Comunidade e do Relatório de público (migrações 113, 114 e 115).
//   • Dois consentimentos PRÓPRIOS e separados (padrão: não), cada um com o seu interruptor:
//       - identidade de gênero nos relatórios para casas e marcas (consentimento_relatorio_genero, 114);
//       - orientação sexual só nos relatórios da equipe Dicas para marcas (consentimento_relatorio_orientacao, 115).
//     Sem a migração, o interruptor dela não aparece.
//   • "Apagar meu histórico de presença": apaga todos os "Eu vou" da pessoa (apagar_historico_presenca).
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { apagarHistorico } from '../lib/euVou';
import { TEXTO_CONSENTIMENTO_GENERO, TEXTO_CONSENTIMENTO_ORIENTACAO } from '../lib/perfilOpcoes';
import { supabase } from '../lib/supabase';

type Chave = 'genero' | 'orientacao';
const COLUNA: Record<Chave, string> = { genero: 'consentimento_relatorio_genero', orientacao: 'consentimento_relatorio_orientacao' };
const LINHAS: { chave: Chave; titulo: string; texto: string; icone: 'pie-chart' | 'bar-chart-2' }[] = [
  { chave: 'genero', titulo: 'Relatórios: identidade de gênero', texto: TEXTO_CONSENTIMENTO_GENERO, icone: 'pie-chart' },
  { chave: 'orientacao', titulo: 'Relatórios: orientação sexual', texto: TEXTO_CONSENTIMENTO_ORIENTACAO, icone: 'bar-chart-2' },
];

export default function PrivacidadeComunidade({ userId }: { userId: string }) {
  // null = carregando ou sem a migração daquela coluna (o interruptor não aparece)
  const [valores, setValores] = useState<Record<Chave, boolean | null>>({ genero: null, orientacao: null });
  const [salvando, setSalvando] = useState<Chave | null>(null);
  const [apagando, setApagando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const lidos: Record<Chave, boolean | null> = { genero: null, orientacao: null };
      await Promise.all((Object.keys(COLUNA) as Chave[]).map(async (k) => {
        const { data, error } = await supabase.from('perfil_privado').select(COLUNA[k]).eq('user_id', userId).maybeSingle();
        lidos[k] = error ? null : !!(data as Record<string, boolean> | null)?.[COLUNA[k]];
      }));
      if (vivo) setValores(lidos);
    })();
    return () => { vivo = false; };
  }, [userId]);

  const mudar = async (k: Chave, v: boolean) => {
    setSalvando(k);
    const antes = valores[k];
    setValores((x) => ({ ...x, [k]: v }));
    const { error } = await supabase.from('perfil_privado').upsert(
      { user_id: userId, [COLUNA[k]]: v, [`${COLUNA[k]}_em`]: v ? new Date().toISOString() : null },
      { onConflict: 'user_id' },
    );
    setSalvando(null);
    if (error) {
      setValores((x) => ({ ...x, [k]: antes }));
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
      {LINHAS.filter((l) => valores[l.chave] !== null).map((l) => (
        <View key={l.chave} style={[s.linha, s.borda]}>
          <View style={[s.icone, { backgroundColor: '#FFFFFF26' }]}><Feather name={l.icone} size={16} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>{l.titulo}</Text>
            <Text style={s.sub}>{l.texto} Nunca com o seu nome.</Text>
          </View>
          <Switch value={!!valores[l.chave]} onValueChange={(v) => void mudar(l.chave, v)} disabled={salvando === l.chave} trackColor={{ true: '#4CAF7D', false: '#3A3950' }} thumbColor="#FFF" accessibilityLabel={l.texto} />
        </View>
      ))}
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
