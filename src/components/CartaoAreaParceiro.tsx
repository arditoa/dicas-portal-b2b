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
    <View style={s.trilho} accessibilityRole="tablist">
      <View style={[s.lado, s.ativo]} accessibilityRole="tab" accessibilityState={{ selected: true }}>
        <Feather name="smartphone" size={14} color="#FFFFFF" />
        <Text style={s.ativoTxt}>Cliente</Text>
      </View>
      <TouchableOpacity style={s.lado} onPress={abrir} activeOpacity={0.8} accessibilityRole="tab" accessibilityLabel={`Ir para a Área do parceiro de ${localAtivo.nome}`}>
        <Feather name="briefcase" size={14} color="#E1306C" />
        <View style={{ flexShrink: 1 }}>
          <Text style={s.parceiroTxt}>Área do parceiro</Text>
          <Text style={s.nome} numberOfLines={1}>{nome}</Text>
        </View>
        <Feather name="chevron-right" size={16} color="#A0A0B2" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  trilho: {
    flexDirection: 'row', backgroundColor: '#161520', borderColor: '#232230', borderWidth: 1,
    borderRadius: 16, padding: 4, gap: 4, marginBottom: 12,
  },
  lado: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, minHeight: 48, paddingHorizontal: 10 },
  ativo: { flex: 0.7, backgroundColor: '#2A2938' },
  ativoTxt: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  parceiroTxt: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  nome: { color: '#A0A0B2', fontSize: 11, marginTop: 1 },
});
