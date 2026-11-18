// Rodada 148 — escolha do brinde (migração 125): ao usar o cupom de uma ação de marca que tem opções
// (ex.: sabores), a pessoa escolhe antes. A marca recebe a preferência somada; o atendente vê a escolha na tela.
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EscolhaBrinde({ visivel, marca, pergunta, opcoes, cor, aoEscolher, aoFechar }: {
  visivel: boolean; marca: string; pergunta?: string | null; opcoes: string[]; cor: string;
  aoEscolher: (opcao: string) => void; aoFechar: () => void;
}) {
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar}>
      <Pressable style={s.veu} onPress={aoFechar}>
        <Pressable style={s.folha} onPress={() => {}}>
          <Text style={[s.tag, { color: cor }]}>PROVE GRÁTIS · APOIO {marca.toUpperCase()}</Text>
          <Text style={s.titulo}>{pergunta || 'Qual você quer?'}</Text>
          <View style={s.opcoes}>
            {opcoes.map((o) => (
              <TouchableOpacity key={o} style={[s.opcao, { borderColor: `${cor}88` }]} onPress={() => aoEscolher(o)} activeOpacity={0.8} accessibilityRole="button">
                <Text style={s.opcaoTxt}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.nota}>Sua escolha aparece na tela para o atendente e entra só somada para a marca.</Text>
          <TouchableOpacity onPress={aoFechar} style={s.cancelar} accessibilityRole="button"><Text style={s.cancelarTxt}>Cancelar</Text></TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  veu: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 30, borderColor: '#232230', borderWidth: 1 },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  titulo: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 4 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  opcao: { paddingHorizontal: 16, minHeight: 44, borderRadius: 22, borderWidth: 1, backgroundColor: '#1E1D28', justifyContent: 'center' },
  opcaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  nota: { color: '#8E8BA3', fontSize: 11.5, marginTop: 14 },
  cancelar: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelarTxt: { color: '#A0A0B2', fontSize: 13, fontWeight: '700' },
});
