// "Ligue os avisos": convite para registrar este celular e receber os avisos de trabalho (migração 135).
//   • Modo parceiro: lembretes da casa às 10h (festa sem flyer, cupom vencendo, Lista VIP esperando, Mercado Pago).
//   • Modo equipe: o resumo do dia às 9h.
// Some sozinho quando a permissão já foi dada (aí só renova o registro do aparelho, sem perguntar nada).
// "Agora não" esconde por 14 dias neste aparelho.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ativarPushNesteAparelho } from '../lib/push';

const CHAVE = 'avisos_no_celular_adiado_ate';
const TEXTO = {
  casa: { tit: 'Ligue os avisos da casa', sub: 'A gente te avisa quando uma festa estiver sem flyer, um cupom for vencer ou tiver gente esperando na Lista VIP.' },
  equipe: { tit: 'Receba o resumo do dia', sub: 'Todo dia às 9h: o que espera a equipe e como foi o dia anterior no app.' },
};

export default function AvisosNoCelular({ para, cores }: { para: 'casa' | 'equipe'; cores: { card: string; borda: string; texto: string; dim: string; destaque: string } }) {
  const [mostrar, setMostrar] = useState(false);
  const [ligando, setLigando] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let vivo = true;
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') { void ativarPushNesteAparelho(); return; } // já permitido: só garante o registro
        const ate = Number((await AsyncStorage.getItem(CHAVE)) || 0);
        if (vivo && Date.now() > ate) setMostrar(true);
      } catch { /* sem módulo de notificações: não mostra */ }
    })();
    return () => { vivo = false; };
  }, []);

  if (!mostrar) return null;
  const t = TEXTO[para];

  const ligar = async () => {
    setLigando(true);
    const r = await ativarPushNesteAparelho();
    setLigando(false);
    if (r === 'ok') { setMostrar(false); Alert.alert('Avisos ligados', 'Pronto! Este celular vai receber os avisos.'); }
    else if (r === 'negado') Alert.alert('Notificações bloqueadas', 'Libere as notificações do Dicas LGBT+ nos Ajustes do celular e tente de novo.');
    else Alert.alert('Não deu agora', 'Este aparelho não conseguiu ligar os avisos. Tente de novo mais tarde.');
  };
  const adiar = async () => {
    setMostrar(false);
    try { await AsyncStorage.setItem(CHAVE, String(Date.now() + 14 * 864e5)); } catch { /* ok */ }
  };

  return (
    <View style={[s.card, { backgroundColor: cores.card, borderColor: cores.borda }]}>
      <View style={[s.icone, { backgroundColor: cores.destaque + '22' }]}><Feather name="bell" size={18} color={cores.destaque} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[s.tit, { color: cores.texto }]}>{t.tit}</Text>
        <Text style={[s.sub, { color: cores.dim }]}>{t.sub}</Text>
        <View style={s.botoes}>
          <TouchableOpacity style={[s.ligar, { backgroundColor: cores.destaque }]} onPress={ligar} disabled={ligando} accessibilityRole="button">
            <Text style={s.ligarTxt}>{ligando ? 'Ligando…' : 'Ligar avisos'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={adiar} style={s.depois} accessibilityRole="button"><Text style={[s.depoisTxt, { color: cores.dim }]}>Agora não</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  icone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tit: { fontSize: 14.5, fontWeight: '800' },
  sub: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  botoes: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  ligar: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  ligarTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  depois: { paddingVertical: 8 },
  depoisTxt: { fontSize: 13, fontWeight: '700' },
});
