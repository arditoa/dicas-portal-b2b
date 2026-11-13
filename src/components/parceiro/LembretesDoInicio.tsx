// Etapa 11 — bloco do Início do portal dentro do Início do app (src/app/parceiro/(abas)/index.tsx):
//   • aviso fixo do cadastro (em análise / não aprovado / suspenso);
//   • "Primeiros passos" com a porcentagem (abre /parceiro/lembretes);
//   • o lembrete mais importante agora, com a ação e "Lembrar amanhã" (o resto em "Ver todos").
// Regras em src/lib/parceiro/inicio.ts (espelho do portal). Some para o aparelho da porta.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../lib/authContext';
import { useModoParceiro } from '../../lib/modoParceiro';
import { adiarLembrete, diagnosticar, Lembrete, lerAdiados, montarLembretes, montarPrimeirosPassos, Passo, porcentagem } from '../../lib/parceiro/inicio';
import { ehContaWhatsApp } from '../../lib/parceiroAuth';
import { falarComEquipe } from '../../lib/parceiroMenu';
import { CP, ESP, RAIO } from './TelaParceiro';

const COR = { agora: '#E1306C', semana: '#FFD54F', dica: '#A0A0B2' } as const;

export function useLembretes() {
  const { localAtivo, pode, senhaProvisoria } = useModoParceiro();
  const { user } = useAuth();
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [passos, setPassos] = useState<Passo[]>([]);
  const [adiados, setAdiados] = useState<Record<string, number>>({});
  const [carregado, setCarregado] = useState(false);
  const carregar = useCallback(async () => {
    if (!localAtivo || localAtivo.papel === 'porta_pin') return;
    try {
      const [d, a] = await Promise.all([diagnosticar(localAtivo, pode), lerAdiados(localAtivo.local_id)]);
      setLembretes(montarLembretes(localAtivo, d));
      setPassos(montarPrimeirosPassos(localAtivo, d, ehContaWhatsApp(user?.email), senhaProvisoria));
      setAdiados(a);
    } catch {
      // sem rede: o Início segue sem o bloco
    } finally {
      setCarregado(true);
    }
  }, [localAtivo, pode, user?.email, senhaProvisoria]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));
  const adiar = useCallback(async (id: string) => {
    if (!localAtivo) return;
    setAdiados(await adiarLembrete(localAtivo.local_id, id));
  }, [localAtivo]);
  const visiveis = lembretes.filter((l) => l.fixo || !adiados[l.id]);
  return { lembretes: visiveis, todos: lembretes, passos, adiar, carregado, recarregar: carregar, nomeLocal: localAtivo?.nome || '' };
}

export function abrirLembrete(router: { push: (r: any) => void }, l: Lembrete, nomeLocal: string) {
  if (l.rota) router.push(l.rota);
  else void falarComEquipe(`Olá! Sou do ${nomeLocal || 'meu local'}. ${l.titulo}: preciso de ajuda.`);
}

export function CartaoLembrete({ l, aoFazer, aoAdiar }: { l: Lembrete; aoFazer: () => void; aoAdiar?: () => void }) {
  return (
    <View style={[s.cartao, { borderColor: COR[l.nivel] + '55' }]}>
      <View style={s.linha}>
        <View style={[s.ponto, { backgroundColor: COR[l.nivel] }]} />
        <Text style={s.titulo}>{l.titulo}</Text>
      </View>
      <Text style={s.texto}>{l.texto}</Text>
      <View style={s.acoes}>
        <TouchableOpacity style={s.fazer} onPress={aoFazer} accessibilityRole="button"><Text style={s.fazerTxt}>{l.acao}</Text></TouchableOpacity>
        {!l.fixo && aoAdiar && (
          <TouchableOpacity style={s.adiar} onPress={aoAdiar} accessibilityRole="button"><Text style={s.adiarTxt}>Lembrar amanhã</Text></TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function LembretesDoInicio() {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  const { lembretes, passos, adiar, carregado, nomeLocal } = useLembretes();
  if (!localAtivo || localAtivo.papel === 'porta_pin' || !carregado) return null;
  const pct = porcentagem(passos);
  const fixo = lembretes.find((l) => l.fixo);
  const principal = lembretes.find((l) => !l.fixo);
  if (!fixo && !principal && pct === 100) return null;
  return (
    <View style={{ gap: ESP.s, marginTop: ESP.m }}>
      {fixo && <CartaoLembrete l={fixo} aoFazer={() => abrirLembrete(router, fixo, nomeLocal)} />}
      {passos.length > 0 && pct < 100 && (
        <TouchableOpacity style={s.passos} onPress={() => router.push('/parceiro/lembretes' as any)} accessibilityRole="button" accessibilityLabel={`Primeiros passos, ${pct}% feito`}>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>Primeiros passos · {pct}%</Text>
            <View style={s.barra}><View style={[s.barraOn, { width: `${pct}%` }]} /></View>
            <Text style={s.texto}>{passos.filter((p) => !p.feito).length} passo{passos.filter((p) => !p.feito).length === 1 ? '' : 's'} para a casa aparecer melhor no app.</Text>
          </View>
          <Feather name="chevron-right" size={18} color={CP.fraco} />
        </TouchableOpacity>
      )}
      {principal && <CartaoLembrete l={principal} aoFazer={() => abrirLembrete(router, principal, nomeLocal)} aoAdiar={() => void adiar(principal.id)} />}
      {lembretes.filter((l) => !l.fixo).length > 1 && (
        <TouchableOpacity style={s.verTodos} onPress={() => router.push('/parceiro/lembretes' as any)} accessibilityRole="button">
          <Text style={s.verTodosTxt}>Ver todos os lembretes ({lembretes.filter((l) => !l.fixo).length})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cartao: { backgroundColor: CP.card, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.s },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  texto: { color: CP.dim, fontSize: 12, lineHeight: 17, marginTop: 4 },
  acoes: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.m },
  fazer: { minHeight: 44, paddingHorizontal: ESP.m, borderRadius: RAIO.s, backgroundColor: CP.rosa, alignItems: 'center', justifyContent: 'center' },
  fazerTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  adiar: { minHeight: 44, paddingHorizontal: ESP.m, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda, alignItems: 'center', justifyContent: 'center' },
  adiarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  passos: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  barra: { height: 6, borderRadius: 3, backgroundColor: '#232230', overflow: 'hidden', marginTop: 6 },
  barraOn: { height: 6, backgroundColor: CP.verde },
  verTodos: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  verTodosTxt: { color: CP.rosa, fontSize: 13, fontWeight: '800' },
});
