// Estilos comuns das peças de formulário do Modo parceiro (mesma régua de TelaParceiro: ESP/RAIO).
import { StyleSheet } from 'react-native';
import { CP, ESP, RAIO } from '../TelaParceiro';

export const CORES_FORM = { campo: '#0F0E15', folha: '#14131C', erro: '#FF7A7A', chipFundo: '#2A2938' };

export const f = StyleSheet.create({
  bloco: { marginTop: ESP.m },
  rotulo: { color: CP.secao, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: CORES_FORM.campo, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s,
    paddingHorizontal: ESP.m, minHeight: 46, color: CP.texto, fontSize: 15,
  },
  inputLinhas: { minHeight: 84, textAlignVertical: 'top', paddingTop: 10 },
  inputErro: { borderColor: CORES_FORM.erro },
  rodape: { flexDirection: 'row', justifyContent: 'space-between', gap: ESP.s, marginTop: 4 },
  ajuda: { flex: 1, color: CP.fraco, fontSize: 11, lineHeight: 15 },
  erro: { flex: 1, color: CORES_FORM.erro, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  contador: { color: CP.fraco, fontSize: 11 },
  // Botão que abre um seletor (data, hora): parece um campo
  seletor: {
    flexDirection: 'row', alignItems: 'center', gap: ESP.s, backgroundColor: CORES_FORM.campo, borderColor: CP.borda,
    borderWidth: 1, borderRadius: RAIO.s, paddingHorizontal: ESP.m, minHeight: 46,
  },
  seletorTxt: { flex: 1, color: CP.texto, fontSize: 15 },
  seletorVazio: { color: CP.fraco },
  // Folha que sobe de baixo (modais)
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  folha: { backgroundColor: CORES_FORM.folha, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: ESP.l, maxHeight: '90%' },
  folhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, marginBottom: ESP.s },
  folhaTitulo: { color: CP.texto, fontSize: 18, fontWeight: '800', flex: 1 },
  fechar: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
});
