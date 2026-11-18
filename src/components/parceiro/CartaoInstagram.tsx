// Migração 138 — Instagram da casa no Meu espaço: conectar uma vez e puxar flyers dos posts ao criar festa.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { conectarInstagram, desconectarInstagram, statusInstagram, StatusIg } from '../../lib/parceiro/instagram';
import { CP, ESP, RAIO } from './TelaParceiro';
import { useIntegracaoLigada } from '../../lib/integracoes';

export default function CartaoInstagram({ localId }: { localId: string }) {
  const [st, setSt] = useState<StatusIg | null | undefined>(undefined);
  const ler = useCallback(async () => { setSt(await statusInstagram(localId)); }, [localId]);
  useFocusEffect(useCallback(() => { void ler(); }, [ler]));
  const ligado = useIntegracaoLigada('ig');
  if (st === null) return null; // sem acesso ou migração 138 ainda não rodada
  // 18/11: integração em "Em breve" (app_config integracoes.ig = false) → cartão sem botão de conectar.
  if (ligado === false && !st?.conectado) {
    return (
      <View style={[s.card, { borderColor: CP.borda }]}>
        <View style={s.topo}>
          <View style={s.icone}><Feather name="instagram" size={17} color="#FFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.tit}>Instagram da casa</Text>
            <Text style={[s.status, { color: '#FBBF24' }]}>Em breve</Text>
          </View>
        </View>
        <Text style={s.txt}>Em breve você conecta o Instagram da casa e puxa o flyer direto dos seus posts, sem baixar e subir de novo. Por enquanto, suba a arte da festa pela galeria.</Text>
      </View>
    );
  }

  const conectar = async () => { try { await conectarInstagram(localId); } catch (e: any) { Alert.alert('Instagram', e?.message); } };
  const desligar = () => Alert.alert('Desconectar o Instagram?', 'Os flyers já puxados continuam nas festas.', [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Desconectar', style: 'destructive', onPress: async () => { await desconectarInstagram(localId); await ler(); } },
  ]);
  const ok = !!st?.conectado && !st.vencido;
  return (
    <View style={[s.card, { borderColor: ok ? '#E1306C55' : CP.borda }]}>
      <View style={s.topo}>
        <View style={s.icone}><Feather name="instagram" size={17} color="#FFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.tit}>Instagram da casa</Text>
          <Text style={[s.status, { color: ok ? '#34D399' : CP.dim }]}>
            {st === undefined ? 'Conferindo…' : ok ? `Conectado${st.username ? ` como @${st.username}` : ''}` : st?.vencido ? 'Conexão vencida' : 'Não conectado'}
          </Text>
        </View>
        {st === undefined && <ActivityIndicator color={CP.rosa} />}
      </View>
      <Text style={s.txt}>
        {ok ? 'Ao criar uma festa, toque em "Puxar do Instagram" e escolha o post do flyer. O app preenche nome, data e hora pela legenda.'
          : 'Conecte uma vez e puxe o flyer direto dos seus posts, sem baixar e subir de novo. Precisa ser conta profissional (Empresa ou Criador). O app só lê seus posts; nunca publica nada.'}
      </Text>
      <TouchableOpacity style={[s.botao, ok && s.botaoSec]} onPress={ok ? desligar : conectar} accessibilityRole="button">
        <Feather name={ok ? 'x' : 'link'} size={15} color={ok ? CP.dim : '#FFF'} />
        <Text style={[s.botaoTxt, ok && { color: CP.dim }]}>{ok ? 'Desconectar' : st?.vencido ? 'Conectar de novo' : 'Conectar Instagram'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: CP.card, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, gap: ESP.s, marginBottom: ESP.m },
  topo: { flexDirection: 'row', alignItems: 'center', gap: ESP.m },
  icone: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#C13584', alignItems: 'center', justifyContent: 'center' },
  tit: { color: CP.texto, fontSize: 15, fontWeight: '800' },
  status: { fontSize: 12.5, fontWeight: '700', marginTop: 1 },
  txt: { color: CP.dim, fontSize: 12.5, lineHeight: 17 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#C13584', borderRadius: 999, minHeight: 44 },
  botaoSec: { backgroundColor: 'transparent', borderWidth: 1, borderColor: CP.borda },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
