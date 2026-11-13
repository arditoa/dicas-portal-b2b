// Campo de hora (24h, 'HH:MM'). Abre uma grade de horários de `passo` em `passo` minutos.
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO } from '../TelaParceiro';
import { CORES_FORM, f } from './estilo';

const pad = (n: number) => String(n).padStart(2, '0');
const minutos = (h: string) => {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + (b || 0);
};

export function CampoHora({ rotulo, valor, aoMudar, ajuda, erro, de = '00:00', ate = '23:30', passo = 30, exemplo = 'Escolher horário', limpar }: {
  rotulo: string;
  valor: string | null;
  aoMudar: (v: string | null) => void;
  ajuda?: string;
  erro?: string | null;
  de?: string;
  ate?: string;
  passo?: number;
  exemplo?: string;
  limpar?: boolean; // mostra "Sem horário"
}) {
  const [aberto, setAberto] = useState(false);
  const opcoes = useMemo(() => {
    const l: string[] = [];
    for (let m = minutos(de); m <= minutos(ate); m += passo) l.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
    return l;
  }, [de, ate, passo]);

  return (
    <View style={f.bloco}>
      <Text style={f.rotulo}>{rotulo}</Text>
      <TouchableOpacity style={[f.seletor, !!erro && f.inputErro]} onPress={() => setAberto(true)} accessibilityRole="button" accessibilityLabel={`${rotulo}: ${valor || 'nenhum'}`}>
        <Feather name="clock" size={15} color={CP.fraco} />
        <Text style={[f.seletorTxt, !valor && f.seletorVazio]}>{valor || exemplo}</Text>
        <Feather name="chevron-down" size={16} color={CP.fraco} />
      </TouchableOpacity>
      {(!!erro || !!ajuda) && <Text style={[erro ? f.erro : f.ajuda, { marginTop: 4 }]}>{erro || ajuda}</Text>}

      <Modal visible={aberto} transparent animationType="slide" onRequestClose={() => setAberto(false)}>
        <TouchableOpacity style={f.fundo} activeOpacity={1} onPress={() => setAberto(false)}>
          <TouchableOpacity activeOpacity={1} style={f.folha}>
            <View style={f.folhaTopo}>
              <Text style={f.folhaTitulo}>{rotulo}</Text>
              <TouchableOpacity style={f.fechar} onPress={() => setAberto(false)} accessibilityLabel="Fechar"><Feather name="x" size={22} color={CP.texto} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={h.grade}>
              {limpar && (
                <TouchableOpacity style={[h.op, !valor && h.sel, { width: '100%' }]} onPress={() => { aoMudar(null); setAberto(false); }}>
                  <Text style={[h.txt, !valor && { color: '#FFF' }]}>Sem horário</Text>
                </TouchableOpacity>
              )}
              {opcoes.map((o) => (
                <TouchableOpacity key={o} style={[h.op, valor === o && h.sel]} onPress={() => { aoMudar(o); setAberto(false); }}>
                  <Text style={[h.txt, valor === o && { color: '#FFF' }]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const h = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s, paddingBottom: ESP.xl },
  op: { width: '22.5%', height: 44, borderRadius: RAIO.s, backgroundColor: CORES_FORM.campo, borderWidth: 1, borderColor: CP.borda, alignItems: 'center', justifyContent: 'center' },
  sel: { backgroundColor: CP.rosa, borderColor: CP.rosa },
  txt: { color: CP.texto, fontSize: 14, fontWeight: '700' },
});
