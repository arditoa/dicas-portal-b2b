// Tela 9 do Modo parceiro — Histórico de visitas (Fidelizar › Histórico de visitas). Permissão 'checkins'.
// Regras do portal (dashboard/checkins); dados em src/lib/parceiro/fidelidade.ts.
//   - período 24 horas / 2 / 7 / 30 dias (padrão 2); contadores confirmados, esperando, cancelados;
//   - cada visita: cliente, quando, cupom usado, como foi (localização com distância, automático às 6h, pela casa);
//   - cancelar (também as já confirmadas), com confirmação: a visita e o cupom voltam atrás;
//   - recarrega sozinho a cada 30 s.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Chips } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import { cancelarVisita, comoFoi, historico, PERIODOS, Visita } from '../../lib/parceiro/fidelidade';

type Filtro = 'todas' | 'confirmado' | 'pendente' | 'cancelado';
const COR: Record<Visita['situacao'], string> = { confirmado: '#4CAF7D', pendente: '#E1A93A', cancelado: '#A0A0B2' };
const NOME: Record<Visita['situacao'], string> = { confirmado: 'Confirmada', pendente: 'Esperando', cancelado: 'Cancelada' };
const quando = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function Historico() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const liberado = !!localAtivo && pode('checkins') && recursosDaCategoria(localAtivo.categoria).checkins;

  const [dias, setDias] = useState(2);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [linhas, setLinhas] = useState<Visita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [cancelando, setCancelando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!liberado) return;
    try {
      setLinhas(await historico(localId, dias));
      setErro('');
    } catch (e: any) {
      setErro(e?.message || 'Não deu para carregar o histórico.');
    } finally {
      setCarregando(false);
    }
  }, [liberado, localId, dias]);

  useFocusEffect(useCallback(() => {
    void carregar();
    const t = setInterval(() => void carregar(), 30000);
    return () => clearInterval(t);
  }, [carregar]));
  useEffect(() => { setCarregando(true); }, [dias]);

  const cancelar = (v: Visita) =>
    Alert.alert('Cancelar esta visita?', `${v.cliente} · ${quando(v.criado_em)}\n\nA visita deixa de contar no cartão fidelidade${v.cupom ? ' e o cupom volta atrás' : ''}.`, [
      { text: 'Manter', style: 'cancel' },
      {
        text: 'Cancelar visita', style: 'destructive',
        onPress: async () => {
          setCancelando(v.checkin_id);
          try { await cancelarVisita(v.checkin_id); await carregar(); }
          catch (e: any) { Alert.alert('Histórico', e?.message || 'Não deu para cancelar agora.'); }
          finally { setCancelando(null); }
        },
      },
    ]);

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Histórico de visitas">
        <Text style={a.aviso}>Seu acesso não inclui os check-ins deste local.</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  const conta = (s: Visita['situacao']) => linhas.filter((l) => l.situacao === s).length;
  const visiveis = filtro === 'todas' ? linhas : linhas.filter((l) => l.situacao === filtro);
  const cupons = linhas.filter((l) => l.cupom && l.situacao === 'confirmado').length;

  return (
    <TelaParceiro titulo="Histórico de visitas" subtitulo="Check-ins e cupons usados. Atualiza sozinho." atualizando={false} aoAtualizar={() => void carregar()} aoVoltar={() => router.back()}>

      <View style={{ marginTop: ESP.m }}>
        <Chips preencher opcoes={PERIODOS.map((p) => ({ valor: p.dias, rotulo: p.rotulo }))} valor={dias} aoMudar={setDias} />
      </View>
      <View style={a.numeros}>
        <Numero n={conta('confirmado')} rotulo="confirmadas" cor={COR.confirmado} />
        <Numero n={conta('pendente')} rotulo="esperando" cor={COR.pendente} />
        <Numero n={cupons} rotulo="cupons usados" cor="#F2A900" />
        <Numero n={conta('cancelado')} rotulo="canceladas" cor={COR.cancelado} />
      </View>
      <View style={{ marginTop: ESP.s }}>
        <Chips opcoes={[{ valor: 'todas', rotulo: 'Todas' }, { valor: 'confirmado', rotulo: 'Confirmadas' }, { valor: 'pendente', rotulo: 'Esperando' }, { valor: 'cancelado', rotulo: 'Canceladas' }]} valor={filtro} aoMudar={(v) => setFiltro(v as Filtro)} />
      </View>

      {!!erro && <Text style={a.erro}>{erro}</Text>}
      <TituloSecao texto={`${visiveis.length} ${visiveis.length === 1 ? 'visita' : 'visitas'}`} info="Check-in que ninguém confirmou entra sozinho às 6h. Para confirmar agora, use Aprovações." />
      {carregando ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.l }} />
      ) : visiveis.length === 0 ? (
        <Text style={a.vazio}>Nenhuma visita neste período.</Text>
      ) : (
        <View style={a.lista}>
          {visiveis.map((v, i) => (
            <View key={v.checkin_id} style={[a.linha, i > 0 && a.borda]}>
              <View style={[a.ponto, { backgroundColor: COR[v.situacao] }]} />
              <View style={{ flex: 1 }}>
                <Text style={a.titulo}>{v.cliente}</Text>
                <Text style={a.sub}>{quando(v.criado_em)} · {comoFoi(v)}</Text>
                {!!v.cupom && <Text style={a.cupom}><Feather name="tag" size={11} color="#F2A900" /> {v.cupom}</Text>}
              </View>
              {v.situacao !== 'cancelado' ? (
                <TouchableOpacity style={a.cancelar} onPress={() => cancelar(v)} disabled={cancelando === v.checkin_id} accessibilityRole="button" accessibilityLabel={`Cancelar visita de ${v.cliente}`}>
                  {cancelando === v.checkin_id ? <ActivityIndicator size="small" color={CP.dim} /> : <Feather name="x" size={16} color={CP.dim} />}
                </TouchableOpacity>
              ) : (
                <Text style={[a.situacao, { color: COR.cancelado }]}>{NOME.cancelado}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </TelaParceiro>
  );
}

function Numero({ n, rotulo, cor }: { n: number; rotulo: string; cor: string }) {
  return <View style={a.numero}><Text style={[a.numeroN, { color: cor }]}>{n}</Text><Text style={a.numeroR}>{rotulo}</Text></View>;
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  erro: { color: '#FF7A7A', fontSize: 13, backgroundColor: '#FF7A7A14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  numeros: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.m },
  numero: { flex: 1, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, paddingVertical: ESP.m, alignItems: 'center' },
  numeroN: { fontSize: 18, fontWeight: '900' },
  numeroR: { color: CP.fraco, fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  vazio: { color: CP.fraco, fontSize: 13 },
  lista: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, paddingHorizontal: ESP.m, paddingVertical: 10, minHeight: 60 },
  borda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2, lineHeight: 16 },
  cupom: { color: '#F2A900', fontSize: 12, fontWeight: '700', marginTop: 3 },
  cancelar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: CP.borda, alignItems: 'center', justifyContent: 'center' },
  situacao: { fontSize: 11, fontWeight: '800' },
});
