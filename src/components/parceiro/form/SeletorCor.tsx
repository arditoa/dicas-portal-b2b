// Escolha de cores e de textura. As cores são as mesmas do portal (src/lib/estiloBanner.ts, igual nos dois).
// SeletorTextura recebe as opções de quem usa: o portal ainda não tem lista de texturas (chega com a festa,
// rodada 130). Quando existir, coloque a lista num arquivo de src/lib igual ao do portal e passe aqui.
import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { DEGRADES_BANNER } from '../../../lib/estiloBanner';
import { CP, ESP, RAIO } from '../TelaParceiro';
import { f } from './estilo';

function Degrade({ cores, tamanho = 44 }: { cores: [string, string]; tamanho?: number }) {
  const id = `g${cores.join('').replace(/#/g, '')}`;
  return (
    <Svg width={tamanho} height={tamanho}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={cores[0]} />
          <Stop offset="1" stopColor={cores[1]} />
        </LinearGradient>
      </Defs>
      <Rect width={tamanho} height={tamanho} rx={12} fill={`url(#${id})`} />
    </Svg>
  );
}

export type OpcaoCor = { chave: string; rotulo: string; cores: [string, string] };

export function SeletorCor({ rotulo = 'Cores', valor, aoMudar, opcoes = DEGRADES_BANNER, ajuda }: {
  rotulo?: string; valor: string | null; aoMudar: (o: OpcaoCor) => void; opcoes?: OpcaoCor[]; ajuda?: string;
}) {
  return (
    <View style={f.bloco}>
      <Text style={f.rotulo}>{rotulo}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: ESP.s }}>
        {opcoes.map((o) => {
          const on = valor === o.chave;
          return (
            <TouchableOpacity key={o.chave} style={[c.op, on && c.on]} onPress={() => aoMudar(o)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.rotulo}>
              <Degrade cores={o.cores} />
              {on && <View style={c.check}><Feather name="check" size={12} color="#FFF" /></View>}
              <Text style={c.txt} numberOfLines={1}>{o.rotulo.split(' (')[0]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {!!ajuda && <Text style={[f.ajuda, { marginTop: 4 }]}>{ajuda}</Text>}
    </View>
  );
}

export type OpcaoTextura = { chave: string; rotulo: string; icone?: keyof typeof Feather.glyphMap };

export function SeletorTextura({ rotulo = 'Textura', valor, aoMudar, opcoes, ajuda }: {
  rotulo?: string; valor: string | null; aoMudar: (chave: string | null) => void; opcoes: OpcaoTextura[]; ajuda?: string;
}) {
  const todas: (OpcaoTextura & { chave: string | null })[] = [{ chave: null as any, rotulo: 'Lisa', icone: 'square' }, ...opcoes];
  return (
    <View style={f.bloco}>
      <Text style={f.rotulo}>{rotulo}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s }}>
        {todas.map((o) => {
          const on = valor === o.chave;
          return (
            <TouchableOpacity key={o.chave ?? 'lisa'} style={[c.textura, on && c.on]} onPress={() => aoMudar(o.chave)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <Feather name={o.icone || 'grid'} size={16} color={on ? CP.rosa : CP.dim} />
              <Text style={[c.txt, on && { color: CP.texto }]}>{o.rotulo}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!ajuda && <Text style={[f.ajuda, { marginTop: 4 }]}>{ajuda}</Text>}
    </View>
  );
}

const c = StyleSheet.create({
  op: { alignItems: 'center', gap: 4, padding: 4, borderRadius: RAIO.s, borderWidth: 2, borderColor: 'transparent', width: 68 },
  on: { borderColor: CP.rosa },
  check: { position: 'absolute', top: 6, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: CP.rosa, alignItems: 'center', justifyContent: 'center' },
  txt: { color: CP.dim, fontSize: 11, fontWeight: '700' },
  textura: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: ESP.m, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda, backgroundColor: CP.card },
});
