// Etapa 11 — Primeiros passos e lembretes (Início › Primeiros passos / Ver todos os lembretes).
// Mesma regra do Início do portal (src/lib/parceiro/inicio.ts): checklist com porcentagem e "Parabéns" no fim;
// lembretes ordenados (agora → esta semana → dica) com "Lembrar amanhã" (o aviso do cadastro não adia).
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { abrirLembrete, CartaoLembrete, useLembretes } from '../../components/parceiro/LembretesDoInicio';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { porcentagem } from '../../lib/parceiro/inicio';

export default function Lembretes() {
  const router = useRouter();
  const { lembretes, passos, adiar, carregado, nomeLocal, recarregar } = useLembretes();
  const pct = porcentagem(passos);
  return (
    <TelaParceiro titulo="Primeiros passos" subtitulo="O que deixa a casa aparecendo melhor no app." atualizando={false} aoAtualizar={() => void recarregar()} aoVoltar={() => router.back()}>
      {!carregado ? null : (
        <>
          {passos.length > 0 && (
            <View style={a.resumo}>
              <Text style={a.pct}>{pct}%</Text>
              <View style={{ flex: 1 }}>
                <Text style={a.titulo}>{pct === 100 ? 'Parabéns! Tudo pronto.' : `${passos.filter((p) => !p.feito).length} passo(s) faltando`}</Text>
                <View style={a.barra}><View style={[a.barraOn, { width: `${pct}%` }]} /></View>
              </View>
            </View>
          )}
          <View style={a.lista}>
            {passos.map((p, i) => (
              <TouchableOpacity key={p.id} style={[a.linha, i > 0 && a.borda]} onPress={() => !p.feito && router.push(p.rota as any)} disabled={p.feito} accessibilityRole="button" accessibilityState={{ checked: p.feito }}>
                <Feather name={p.feito ? 'check-circle' : 'circle'} size={20} color={p.feito ? CP.verde : CP.fraco} />
                <View style={{ flex: 1 }}>
                  <Text style={[a.titulo, p.feito && { color: CP.dim, textDecorationLine: 'line-through' }]}>{p.titulo}</Text>
                  <Text style={a.sub}>{p.texto}</Text>
                </View>
                {!p.feito && <Text style={a.acao}>{p.acao}</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <TituloSecao texto={`Lembretes (${lembretes.length})`} info={'"Lembrar amanhã" esconde o lembrete por 24 horas, só neste celular.'} />
          {lembretes.length === 0 ? (
            <Text style={a.vazio}>Tudo em dia por aqui.</Text>
          ) : (
            <View style={{ gap: ESP.s }}>
              {lembretes.map((l) => <CartaoLembrete key={l.id} l={l} aoFazer={() => abrirLembrete(router, l, nomeLocal)} aoAdiar={() => void adiar(l.id)} />)}
            </View>
          )}
        </>
      )}
    </TelaParceiro>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  resumo: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, marginTop: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  pct: { color: CP.verde, fontSize: 28, fontWeight: '900' },
  barra: { height: 8, borderRadius: 4, backgroundColor: '#232230', overflow: 'hidden', marginTop: 6 },
  barraOn: { height: 8, backgroundColor: CP.verde },
  lista: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden', marginTop: ESP.s },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, paddingHorizontal: ESP.m, paddingVertical: 12, minHeight: 60 },
  borda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  acao: { color: CP.rosa, fontSize: 12, fontWeight: '800' },
  vazio: { color: CP.fraco, fontSize: 13 },
});
