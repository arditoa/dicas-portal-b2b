// Migração 131 — conta Mercado Pago da casa (receber os ingressos). Usado no Meu espaço e em Divulgar › Ingressos.
// Só o dono conecta. O token fica no servidor; aqui só aparece "conectado" ou não.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { falarComEquipe, URL_PORTAL } from '../../lib/parceiroMenu';
import { useIntegracaoLigada } from '../../lib/integracoes';
import { supabase } from '../../lib/supabase';
import { CP, ESP, RAIO } from './TelaParceiro';

export function useStatusMercadoPago(localId: string) {
  const [mp, setMp] = useState<{ conectado: boolean; desde: string | null } | null>(null);
  const ler = useCallback(async () => {
    if (!localId) return;
    const { data } = await supabase.rpc('mp_status_da_casa', { p_local: localId });
    setMp((data as any) || { conectado: false, desde: null });
  }, [localId]);
  useFocusEffect(useCallback(() => { void ler(); }, [ler]));
  return { mp, recarregar: ler };
}

export async function conectarMercadoPago(localId: string) {
  const { data, error } = await supabase.rpc('mp_iniciar_conexao', { p_local: localId });
  if (error || !data) return Alert.alert('Mercado Pago', error?.message || 'Não deu agora.');
  await Linking.openURL(`${URL_PORTAL}/api/mp/conectar?estado=${data}`);
}

export default function CartaoMercadoPago({ localId, dono, taxaPct }: { localId: string; dono: boolean; taxaPct: number }) {
  const { mp } = useStatusMercadoPago(localId);
  const ligado = useIntegracaoLigada('mp');
  if (ligado === false && !mp?.conectado) {
    // 18/11: integração ainda não liberada (credenciais/aprovação do Mercado Pago) → sem botão que dá erro.
    return (
      <View style={[st.card, { borderColor: CP.borda }]}>
        <View style={st.topo}>
          <View style={st.icone}><Feather name="credit-card" size={17} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.tit}>Mercado Pago</Text>
            <Text style={[st.status, { color: '#FBBF24' }]}>Em breve</Text>
          </View>
        </View>
        <Text style={st.txt}>Em breve você conecta sua conta Mercado Pago e vende ingressos pelo app, com o dinheiro caindo direto na sua conta. Enquanto isso, use a Lista VIP ou o link de ingresso da sua festa.</Text>
        <TouchableOpacity style={[st.botao, st.botaoSec]} onPress={() => void falarComEquipe('Olá! Quero vender ingressos pelo app Dicas LGBT+ com o Mercado Pago.')} accessibilityRole="button">
          <Feather name="message-circle" size={15} color={CP.dim} />
          <Text style={[st.botaoTxt, { color: CP.dim }]}>Quero ser avisado</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const desde = mp?.desde ? new Date(mp.desde).toLocaleDateString('pt-BR') : null;
  return (
    <View style={[st.card, { borderColor: mp?.conectado ? '#34D39955' : CP.borda }]}>
      <View style={st.topo}>
        <View style={st.icone}><Feather name="credit-card" size={17} color="#FFFFFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={st.tit}>Mercado Pago</Text>
          <Text style={[st.status, { color: mp?.conectado ? '#34D399' : CP.dim }]}>
            {mp === null ? 'Conferindo…' : mp.conectado ? `Conectado${desde ? ` desde ${desde}` : ''}` : 'Não conectado'}
          </Text>
        </View>
        {mp === null && <ActivityIndicator color={CP.rosa} />}
      </View>
      <Text style={st.txt}>
        {mp?.conectado
          ? `O dinheiro dos ingressos cai direto na conta Mercado Pago da casa. O app fica só com ${taxaPct}% (mínimo R$ 1). Com a taxa paga pelo comprador, a tarifa do Mercado Pago também vai na taxa dele e a casa recebe o ingresso cheio.`
          : 'Conecte uma vez para vender ingressos pelo app. O dinheiro cai direto na sua conta Mercado Pago; o app nunca segura o seu dinheiro.'}
      </Text>
      {dono ? (
        <TouchableOpacity style={[st.botao, mp?.conectado && st.botaoSec]} onPress={() => void conectarMercadoPago(localId)} accessibilityRole="button">
          <Feather name={mp?.conectado ? 'refresh-cw' : 'link'} size={15} color={mp?.conectado ? CP.dim : '#FFF'} />
          <Text style={[st.botaoTxt, mp?.conectado && { color: CP.dim }]}>{mp?.conectado ? 'Trocar a conta conectada' : 'Conectar Mercado Pago'}</Text>
        </TouchableOpacity>
      ) : !mp?.conectado ? <Text style={[st.txt, { color: CP.rosa }]}>Só o dono da casa conecta a conta.</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: CP.card, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, gap: ESP.s, marginBottom: ESP.m },
  topo: { flexDirection: 'row', alignItems: 'center', gap: ESP.m },
  icone: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#009EE3', alignItems: 'center', justifyContent: 'center' },
  tit: { color: CP.texto, fontSize: 15, fontWeight: '800' },
  status: { fontSize: 12.5, fontWeight: '700', marginTop: 1 },
  txt: { color: CP.dim, fontSize: 12.5, lineHeight: 17 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#009EE3', borderRadius: 999, minHeight: 44 },
  botaoSec: { backgroundColor: 'transparent', borderWidth: 1, borderColor: CP.borda },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
