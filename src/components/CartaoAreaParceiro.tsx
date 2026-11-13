// Rodada 146 — topo da aba Conta: seletor "Cliente | Área do parceiro" (só para dono ou equipe de uma casa).
// Na Conta a pessoa está vendo como cliente; tocar em "Área do parceiro" leva ao Modo parceiro.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useModoParceiro } from '../lib/modoParceiro';

export default function CartaoAreaParceiro() {
  const router = useRouter();
  const { ehParceiro, localAtivo, locais, definirModo } = useModoParceiro();
  if (!ehParceiro || !localAtivo) return null;

  const abrir = () => {
    definirModo('parceiro');
    router.push('/parceiro');
  };
  const nome = `${localAtivo.nome}${locais.length > 1 ? ` +${locais.length - 1}` : ''}`;

  return (
    <TouchableOpacity style={s.linha} onPress={abrir} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Ir para a Área do parceiro de ${localAtivo.nome}`}>
      <View style={s.icone}><Feather name="briefcase" size={15} color="#E1306C" /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rotulo}>Área do parceiro</Text>
        <Text style={s.txt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{nome}</Text>
      </View>
      <Feather name="chevron-right" size={15} color="#A0A0B2" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  linha: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: '#161520', borderColor: '#232230', borderWidth: 1, borderRadius: 12, marginBottom: 10,
  },
  icone: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#E1306C1F', alignItems: 'center', justifyContent: 'center' },
  rotulo: { color: '#E1306C', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
  txt: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700', marginTop: 1 },
});
