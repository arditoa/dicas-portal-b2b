// Chips de escolha: única (rádio) ou múltipla. Área de toque mínima de 44 (hitSlop).
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP } from '../TelaParceiro';
import { CORES_FORM, f } from './estilo';

export type OpcaoChip<T extends string | number> = { valor: T; rotulo: string };

type Comum<T extends string | number> = { rotulo?: string; opcoes: OpcaoChip<T>[]; ajuda?: string; erro?: string | null; preencher?: boolean };

export function Chips<T extends string | number>(
  props: Comum<T> & ({ multiplo?: false; valor: T | null; aoMudar: (v: T) => void } | { multiplo: true; valor: T[]; aoMudar: (v: T[]) => void }),
) {
  const { rotulo, opcoes, ajuda, erro, preencher } = props;
  const marcado = (v: T) => (props.multiplo ? props.valor.includes(v) : props.valor === v);
  const tocar = (v: T) => {
    if (props.multiplo) props.aoMudar(props.valor.includes(v) ? props.valor.filter((x) => x !== v) : [...props.valor, v]);
    else props.aoMudar(v);
  };
  return (
    <View style={rotulo ? f.bloco : undefined}>
      {!!rotulo && <Text style={f.rotulo}>{rotulo}</Text>}
      <View style={[c.linha, preencher && { flexWrap: 'nowrap' }]}>
        {opcoes.map((o) => {
          const on = marcado(o.valor);
          return (
            <TouchableOpacity
              key={String(o.valor)}
              style={[c.chip, on && c.chipOn, preencher && { flex: 1 }]}
              onPress={() => tocar(o.valor)}
              hitSlop={{ top: 5, bottom: 5 }}
              accessibilityRole={props.multiplo ? 'checkbox' : 'radio'}
              accessibilityState={props.multiplo ? { checked: on } : { selected: on }}
            >
              <Text style={[c.txt, on && { color: '#FFF' }]} numberOfLines={1}>{o.rotulo}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {(!!erro || !!ajuda) && <Text style={erro ? [f.erro, { marginTop: 4 }] : [f.ajuda, { marginTop: 4 }]}>{erro || ajuda}</Text>}
    </View>
  );
}

const c = StyleSheet.create({
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s },
  chip: {
    borderRadius: 17, borderWidth: 1, borderColor: CP.borda, backgroundColor: CORES_FORM.campo,
    paddingHorizontal: ESP.m, height: 34, alignItems: 'center', justifyContent: 'center',
  },
  chipOn: { backgroundColor: CP.rosa, borderColor: CP.rosa },
  txt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
});
