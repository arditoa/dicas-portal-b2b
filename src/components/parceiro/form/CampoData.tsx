// Campo de data (pt-BR, dd/mm). Valor guardado como 'AAAA-MM-DD' (igual ao banco).
// Abre um calendário simples do mês, sem depender de componente nativo (funciona no Expo Go).
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO } from '../TelaParceiro';
import { f } from './estilo';

const pad = (n: number) => String(n).padStart(2, '0');
export const chaveData = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dataDaChave = (k: string) => {
  const [a, m, d] = k.split('-').map(Number);
  return new Date(a, m - 1, d);
};
export const ddmm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const NOME_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function CampoData({ rotulo, valor, aoMudar, ajuda, erro, min, max, permitir, exemplo = 'Escolher data' }: {
  rotulo: string;
  valor: string | null; // 'AAAA-MM-DD'
  aoMudar: (v: string) => void;
  ajuda?: string;
  erro?: string | null;
  min?: string; // 'AAAA-MM-DD'
  max?: string;
  permitir?: (d: Date) => boolean; // ex.: só quintas
  exemplo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const base = valor ? dataDaChave(valor) : min ? dataDaChave(min) : new Date();
  const [mes, setMes] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const d = valor ? dataDaChave(valor) : null;

  const diasDoMes = () => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const celulas: (Date | null)[] = Array.from({ length: primeiro.getDay() }, () => null);
    for (let i = 1; i <= total; i++) celulas.push(new Date(mes.getFullYear(), mes.getMonth(), i));
    return celulas;
  };
  const pode = (x: Date) => {
    const k = chaveData(x);
    return (!min || k >= min) && (!max || k <= max) && (!permitir || permitir(x));
  };

  return (
    <View style={f.bloco}>
      <Text style={f.rotulo}>{rotulo}</Text>
      <TouchableOpacity style={[f.seletor, !!erro && f.inputErro]} onPress={() => setAberto(true)} accessibilityRole="button" accessibilityLabel={`${rotulo}: ${d ? ddmm(d) : 'nenhuma'}`}>
        <Feather name="calendar" size={15} color={CP.fraco} />
        <Text style={[f.seletorTxt, !d && f.seletorVazio]}>{d ? `${NOME_DIA[d.getDay()]}, ${ddmm(d)}` : exemplo}</Text>
        <Feather name="chevron-down" size={16} color={CP.fraco} />
      </TouchableOpacity>
      {(!!erro || !!ajuda) && <Text style={[erro ? f.erro : f.ajuda, { marginTop: 4 }]}>{erro || ajuda}</Text>}

      <Modal visible={aberto} transparent animationType="slide" onRequestClose={() => setAberto(false)}>
        <TouchableOpacity style={f.fundo} activeOpacity={1} onPress={() => setAberto(false)}>
          <TouchableOpacity activeOpacity={1} style={f.folha}>
            <View style={f.folhaTopo}>
              <TouchableOpacity style={c.seta} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} accessibilityLabel="Mês anterior">
                <Feather name="chevron-left" size={20} color={CP.texto} />
              </TouchableOpacity>
              <Text style={[f.folhaTitulo, { textAlign: 'center' }]}>
                {mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity style={c.seta} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} accessibilityLabel="Próximo mês">
                <Feather name="chevron-right" size={20} color={CP.texto} />
              </TouchableOpacity>
            </View>
            <View style={c.grade}>
              {SEMANA.map((x, i) => <Text key={i} style={c.cab}>{x}</Text>)}
              {diasDoMes().map((x, i) => {
                if (!x) return <View key={i} style={c.cel} />;
                const ok = pode(x);
                const sel = !!d && chaveData(x) === chaveData(d);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[c.cel, sel && c.sel]}
                    disabled={!ok}
                    onPress={() => { aoMudar(chaveData(x)); setAberto(false); }}
                    accessibilityLabel={`${NOME_DIA[x.getDay()]}, ${ddmm(x)}`}
                  >
                    <Text style={[c.num, !ok && { color: '#3A3950' }, sel && { color: '#FFF' }]}>{x.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const c = StyleSheet.create({
  seta: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: ESP.xl },
  cab: { width: `${100 / 7}%`, textAlign: 'center', color: CP.fraco, fontSize: 11, fontWeight: '800', paddingVertical: 6 },
  cel: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RAIO.s },
  sel: { backgroundColor: CP.rosa },
  num: { color: CP.texto, fontSize: 15, fontWeight: '700' },
});
