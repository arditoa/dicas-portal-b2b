// Reservas fase 2 — lista do dia na Porta (Porta › Reservas de hoje).
// Quem fica na porta (permissão 'porta', inclusive o aparelho da porta por PIN) ou quem cuida das reservas
// ('lista_vip') vê as reservas de hoje e marca se a pessoa veio ou não (responder_reserva, migração 110).
// Confirmar e recusar continuam em Aprovações (só 'lista_vip').
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Chips } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro } from '../../components/parceiro/TelaParceiro';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import { supabase } from '../../lib/supabase';

type Reserva = { id: string; nome: string; area_nome: string; horario: string; pessoas: number; ocasiao: string | null; observacao: string | null; status: string };
type Filtro = 'faltam' | 'chegaram' | 'todas';
const OCASIAO: Record<string, string> = { date: 'Date', aniversario: 'Aniversário', amigos: 'Amigos', trabalho: 'Trabalho', outro: 'Outro' };
// "Hoje" no fuso de Brasília, igual à regra do banco (migração 110).
const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

export default function ReservasHoje() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const liberado = !!localAtivo && recursosDaCategoria(localAtivo.categoria).reservas && (pode('porta') || pode('lista_vip'));
  const [lista, setLista] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('faltam');
  const [mudando, setMudando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!liberado || !localAtivo) return;
    const { data } = await supabase
      .from('reservas')
      .select('id, nome, area_nome, horario, pessoas, ocasiao, observacao, status')
      .eq('local_id', localAtivo.local_id)
      .eq('data', hoje())
      .in('status', ['aguardando', 'confirmada', 'compareceu', 'nao_veio'])
      .order('horario');
    setLista((data as Reserva[]) || []);
    setCarregando(false);
  }, [liberado, localAtivo]);
  useFocusEffect(useCallback(() => {
    void carregar();
    const t = setInterval(() => void carregar(), 30000);
    return () => clearInterval(t);
  }, [carregar]));

  const marcar = async (r: Reserva, status: 'compareceu' | 'nao_veio') => {
    setMudando(r.id);
    const { error } = await supabase.rpc('responder_reserva', { p_reserva: r.id, p_status: status, p_resposta: null });
    setMudando(null);
    if (error) return Alert.alert('Reserva', /permiss|42501/i.test(error.message) ? 'Seu acesso não permite marcar esta reserva. Peça ao dono para rodar a atualização 110.' : error.message);
    setLista((l) => l.map((x) => (x.id === r.id ? { ...x, status } : x)));
  };

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Reservas de hoje">
        <Text style={a.aviso}>Seu acesso não inclui as reservas desta casa.</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  const pessoas = (l: Reserva[]) => l.reduce((t, r) => t + r.pessoas, 0);
  const faltam = lista.filter((r) => r.status === 'confirmada');
  const chegaram = lista.filter((r) => r.status === 'compareceu');
  const visiveis = filtro === 'faltam' ? faltam : filtro === 'chegaram' ? chegaram : lista;

  return (
    <TelaParceiro titulo="Reservas de hoje" subtitulo="Marque quem chegou. Atualiza sozinho." atualizando={false} aoAtualizar={() => void carregar()} aoVoltar={() => router.back()}>
      <View style={a.numeros}>
        <View style={a.numero}><Text style={[a.numeroN, { color: '#FFD54F' }]}>{pessoas(faltam)}</Text><Text style={a.numeroR}>pessoas faltam</Text></View>
        <View style={a.numero}><Text style={[a.numeroN, { color: CP.verde }]}>{pessoas(chegaram)}</Text><Text style={a.numeroR}>pessoas chegaram</Text></View>
        <View style={a.numero}><Text style={a.numeroN}>{lista.length}</Text><Text style={a.numeroR}>reservas</Text></View>
      </View>
      <View style={{ marginTop: ESP.m }}>
        <Chips preencher opcoes={[{ valor: 'faltam', rotulo: `Faltam (${faltam.length})` }, { valor: 'chegaram', rotulo: `Chegaram (${chegaram.length})` }, { valor: 'todas', rotulo: 'Todas' }]} valor={filtro} aoMudar={(v) => setFiltro(v as Filtro)} />
      </View>
      {carregando ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} />
      ) : visiveis.length === 0 ? (
        <Text style={a.vazio}>{lista.length ? 'Ninguém nesta lista.' : 'Nenhuma reserva para hoje.'}</Text>
      ) : (
        <View style={{ gap: ESP.s, marginTop: ESP.m }}>
          {visiveis.map((r) => {
            const aguardando = r.status === 'aguardando';
            return (
              <View key={r.id} style={a.cartao}>
                <View style={a.linha}>
                  <Text style={a.hora}>{r.horario.slice(0, 5)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={a.titulo}>{r.nome}</Text>
                    <Text style={a.sub}>{r.pessoas} pessoa{r.pessoas === 1 ? '' : 's'} · {r.area_nome}{r.ocasiao ? ` · ${OCASIAO[r.ocasiao] || r.ocasiao}` : ''}</Text>
                    {!!r.observacao && <Text style={a.obs}>“{r.observacao}”</Text>}
                  </View>
                </View>
                {aguardando ? (
                  <Text style={a.aguardando}>Ainda não confirmada pela casa (Aprovações).</Text>
                ) : (
                  <View style={a.acoes}>
                    <TouchableOpacity style={[a.acao, r.status === 'compareceu' && a.acaoVerde]} onPress={() => void marcar(r, 'compareceu')} disabled={mudando === r.id} accessibilityRole="button" accessibilityState={{ selected: r.status === 'compareceu' }}>
                      {mudando === r.id ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="check" size={16} color={r.status === 'compareceu' ? '#FFF' : CP.verde} />}
                      <Text style={[a.acaoTxt, { color: r.status === 'compareceu' ? '#FFF' : CP.verde }]}>Compareceu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[a.acao, r.status === 'nao_veio' && a.acaoCinza]} onPress={() => void marcar(r, 'nao_veio')} disabled={mudando === r.id} accessibilityRole="button" accessibilityState={{ selected: r.status === 'nao_veio' }}>
                      <Feather name="user-x" size={16} color={r.status === 'nao_veio' ? '#FFF' : CP.dim} />
                      <Text style={[a.acaoTxt, { color: r.status === 'nao_veio' ? '#FFF' : CP.dim }]}>Não veio</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </TelaParceiro>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  numeros: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.m },
  numero: { flex: 1, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, paddingVertical: ESP.m, alignItems: 'center' },
  numeroN: { color: CP.texto, fontSize: 20, fontWeight: '900' },
  numeroR: { color: CP.fraco, fontSize: 10, fontWeight: '700', marginTop: 2 },
  vazio: { color: CP.fraco, fontSize: 13, marginTop: ESP.l },
  cartao: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  linha: { flexDirection: 'row', gap: ESP.m },
  hora: { color: CP.texto, fontSize: 18, fontWeight: '900', width: 56 },
  titulo: { color: CP.texto, fontSize: 15, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  obs: { color: CP.dim, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  aguardando: { color: '#FFD54F', fontSize: 12, marginTop: ESP.s },
  acoes: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.m },
  acao: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda },
  acaoVerde: { backgroundColor: CP.verde, borderColor: CP.verde },
  acaoCinza: { backgroundColor: '#3A3950', borderColor: '#3A3950' },
  acaoTxt: { fontSize: 14, fontWeight: '800' },
});
