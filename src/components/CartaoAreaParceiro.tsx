// Rodada 145 — cartão na aba Conta para voltar ao Modo parceiro (só aparece para dono ou equipe de um local).
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

  return (
    <TouchableOpacity style={s.cartao} onPress={abrir} activeOpacity={0.85} accessibilityRole="button">
      <View style={s.icone}><Feather name="briefcase" size={20} color="#E1306C" /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.titulo}>Área do parceiro</Text>
        <Text style={s.sub} numberOfLines={1}>
          {localAtivo.nome}{locais.length > 1 ? ` e mais ${locais.length - 1}` : ''}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color="#A0A0B2" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  cartao: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#161520', borderColor: '#3A1D2A',
    borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14, minHeight: 64,
  },
  icone: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A1420', alignItems: 'center', justifyContent: 'center' },
  titulo: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  sub: { color: '#A0A0B2', fontSize: 13, marginTop: 2 },
});
