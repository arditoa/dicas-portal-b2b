// Rodada 148 — selo "Apoio · <marca>" em cupons e festas que fazem parte de uma ação de marca.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { AcaoVitrine, corDaMarca, marcaDoItem, useMarcasAtivas } from '../lib/marcas';

export default function SeloMarca({ tipo, id, acao }: { tipo: 'cupom' | 'festa'; id?: string | null; acao?: AcaoVitrine | null }) {
  const router = useRouter();
  const lista = useMarcasAtivas();
  const a = acao ?? marcaDoItem(lista, tipo, id);
  if (!a) return null;
  const cor = corDaMarca(a);
  return (
    <TouchableOpacity
      style={[s.selo, { borderColor: `${cor}66`, backgroundColor: `${cor}1A` }]}
      onPress={() => router.push(`/marca/${a.id}` as any)}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`Apoio de ${a.marca}. Ver a ação`}
    >
      <Feather name="award" size={10} color={cor} />
      <Text style={[s.txt, { color: cor }]} numberOfLines={1}>Apoio · {a.marca}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  selo: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginTop: 5 },
  txt: { fontSize: 10.5, fontWeight: '800', maxWidth: 160 },
});
