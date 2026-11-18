// Moldura das telas do Modo equipe: faixa "EQUIPE DICAS", título, botão "Ver como cliente" e rolagem com puxar-para-atualizar.
import { TITULO_SECAO } from '../../constants/theme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const CA = { bg: '#0B0B0E', card: '#161520', borda: '#232230', texto: '#FFFFFF', dim: '#A0A0B2', fraco: '#626274', rosa: '#E1306C', verde: '#34D399', amarelo: '#F2C94C', roxo: '#9B3CFF' };

export default function TelaAdm({ titulo, subtitulo, children, atualizando, aoAtualizar, voltar, aoVoltar }: {
  titulo: string; subtitulo?: string; children: ReactNode; atualizando?: boolean; aoAtualizar?: () => void; voltar?: boolean;
  // Seta ao lado de "EQUIPE DICAS" (volta dentro da própria tela, ex.: da categoria para a grade da Vitrine)
  aoVoltar?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: CA.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={aoAtualizar ? <RefreshControl refreshing={!!atualizando} onRefresh={aoAtualizar} tintColor={CA.rosa} /> : undefined}
      >
        <View style={st.topo}>
          {voltar ? (
            <TouchableOpacity onPress={() => router.back()} style={st.voltar} accessibilityRole="button" accessibilityLabel="Voltar">
              <Feather name="chevron-left" size={18} color={CA.dim} /><Text style={st.voltarTxt}>Voltar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={st.marca} onPress={aoVoltar} disabled={!aoVoltar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole={aoVoltar ? 'button' : undefined} accessibilityLabel={aoVoltar ? 'Voltar' : undefined}>
              {aoVoltar ? <Feather name="chevron-left" size={18} color={CA.texto} /> : <View style={st.ponto} />}
              <Text style={st.marcaTxt}>EQUIPE DICAS</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={st.cliente} onPress={() => router.replace('/(tabs)' as any)} accessibilityRole="button">
            <Feather name="smartphone" size={14} color={CA.texto} /><Text style={st.clienteTxt}>Ver como cliente</Text>
          </TouchableOpacity>
        </View>
        <Text style={st.titulo}>{titulo}</Text>
        {!!subtitulo && <Text style={st.sub}>{subtitulo}</Text>}
        <View style={{ marginTop: 14 }}>{children}</View>
      </ScrollView>
    </View>
  );
}

export const sa = StyleSheet.create({
  card: { backgroundColor: CA.card, borderWidth: 1, borderColor: CA.borda, borderRadius: 16, padding: 12, marginBottom: 10 },
  lista: { backgroundColor: CA.card, borderWidth: 1, borderColor: CA.borda, borderRadius: 16, marginBottom: 10, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  borda: { borderBottomWidth: 1, borderBottomColor: CA.borda },
  tit: { color: CA.texto, fontSize: 12, fontWeight: '600' },
  sub: { color: CA.dim, fontSize: 10, lineHeight: 14, marginTop: 1 },
  secao: { ...TITULO_SECAO, marginTop: 18, marginBottom: 8, marginLeft: 2 },
  selo: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  seloTxt: { fontSize: 11, fontWeight: '800' },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CA.rosa, borderRadius: 999, minHeight: 44, paddingHorizontal: 16 },
  botaoTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  botaoSec: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: CA.borda, borderRadius: 999, minHeight: 38, paddingHorizontal: 14 },
  botaoSecTxt: { color: CA.texto, fontSize: 12, fontWeight: '600' },
  mais: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, alignSelf: 'flex-start' },
  maisTxt: { color: CA.rosa, fontSize: 12, fontWeight: '700' },
  vazio: { color: CA.fraco, fontSize: 12, paddingVertical: 6 },
  campoBusca: { borderWidth: 1, borderColor: CA.borda, borderRadius: 12, color: CA.texto, paddingHorizontal: 12, height: 44, fontSize: 15, backgroundColor: CA.card },
});

const st = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: CA.verde },
  marcaTxt: { color: CA.dim, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  voltarTxt: { color: CA.dim, fontSize: 14, fontWeight: '700' },
  cliente: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  clienteTxt: { color: CA.texto, fontSize: 12.5, fontWeight: '700' },
  titulo: { ...TITULO_SECAO, lineHeight: 19, marginTop: 16 },
  sub: { color: CA.dim, fontSize: 13, lineHeight: 18, marginTop: 2 },
});
