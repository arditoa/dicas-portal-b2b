// Modo equipe · Check-ins estranhos (migração 145). Lista quem tem check-ins fora do normal e permite anular.
// Anular não apaga: o check-in deixa de contar (visita, cupom e relatórios) e fica registrado quem anulou.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { supabase } from '../../lib/supabase';

type Suspeito = { user_id: string; nome: string | null; email: string | null; checkins: number; casas: number; ultimo: string; motivos: string[] };
type Linha = { id: string; casa: string; quando: string; metodo: string; distancia_m: number | null; anulado: boolean };
const PERIODOS = [7, 14, 30];
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const METODO: Record<string, string> = { gps: 'localização', codigo: 'código no caixa', automatico: 'confirmação automática', qr: 'QR' };

export default function Auditoria() {
  const [dias, setDias] = useState(14);
  const [lista, setLista] = useState<Suspeito[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Linha[] | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async (d = dias) => {
    const { data, error } = await supabase.rpc('admin_auditoria_checkins', { p_dias: d });
    if (error) { setErro(/function|does not exist/i.test(error.message) ? 'Rode a migração 145 no Supabase para ligar a auditoria.' : error.message); setLista([]); return; }
    setErro(null); setLista((data as Suspeito[]) || []);
  }, [dias]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const abrir = async (u: Suspeito) => {
    if (aberto === u.user_id) { setAberto(null); return; }
    setAberto(u.user_id); setDetalhe(null);
    const { data } = await supabase.rpc('admin_checkins_do_usuario', { p_user: u.user_id, p_dias: dias });
    setDetalhe((data as Linha[]) || []);
  };
  const anular = (ids: string[], texto: string) => Alert.alert('Anular check-in?', `${texto} Deixa de contar na visita, no cupom e nos relatórios.`, [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Anular', style: 'destructive', onPress: async () => {
      const { error } = await supabase.rpc('admin_anular_checkins', { p_ids: ids });
      if (error) return Alert.alert('Não deu', error.message);
      setDetalhe((d) => (d || []).map((l) => (ids.includes(l.id) ? { ...l, anulado: true } : l)));
      void carregar();
    } },
  ]);

  return (
    <TelaAdm titulo="Check-ins estranhos" subtitulo="Quem está fazendo check-in fora do normal" voltar atualizando={atualizando}
      aoAtualizar={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }}>
      <View style={c.periodos}>
        {PERIODOS.map((d) => (
          <TouchableOpacity key={d} style={[c.periodo, dias === d && c.periodoOn]} onPress={() => { setDias(d); void carregar(d); }} accessibilityRole="button">
            <Text style={[c.periodoTxt, dias === d && { color: '#0B0B0E' }]}>{d} dias</Text>
          </TouchableOpacity>
        ))}
      </View>
      {lista === null ? <ActivityIndicator color={CA.rosa} style={{ marginTop: 20 }} /> : erro ? <Text style={sa.vazio}>{erro}</Text> : lista.length === 0 ? (
        <View style={sa.card}><Text style={sa.tit}>Nada estranho no período</Text><Text style={sa.sub}>Ninguém com 4+ casas na mesma noite, viagem impossível, confirmação longe da casa ou mais de 20 check-ins.</Text></View>
      ) : lista.map((u) => (
        <View key={u.user_id} style={sa.card}>
          <TouchableOpacity onPress={() => void abrir(u)} accessibilityRole="button">
            <View style={c.topo}>
              <View style={{ flex: 1 }}>
                <Text style={sa.tit}>{u.nome || 'Sem nome'}</Text>
                <Text style={sa.sub}>{u.email || '—'} · {u.checkins} check-ins em {u.casas} {u.casas === 1 ? 'casa' : 'casas'} · último {quando(u.ultimo)}</Text>
              </View>
              <Feather name={aberto === u.user_id ? 'chevron-up' : 'chevron-down'} size={16} color={CA.dim} />
            </View>
            <View style={c.motivos}>{u.motivos.map((m) => <View key={m} style={[sa.selo, { backgroundColor: '#F2C94C22' }]}><Text style={[sa.seloTxt, { color: CA.amarelo }]}>{m}</Text></View>)}</View>
          </TouchableOpacity>
          {aberto === u.user_id && (detalhe === null ? <ActivityIndicator color={CA.rosa} style={{ marginTop: 10 }} /> : (
            <View style={{ marginTop: 10 }}>
              {detalhe.map((l) => (
                <View key={l.id} style={[c.linha, l.anulado && { opacity: 0.45 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={c.linhaTit}>{l.casa}</Text>
                    <Text style={sa.sub}>{quando(l.quando)} · {METODO[l.metodo] || l.metodo}{l.distancia_m != null ? ` · ${l.distancia_m} m da casa` : ''}</Text>
                  </View>
                  {l.anulado ? <Text style={c.anulado}>Anulado</Text> : (
                    <TouchableOpacity onPress={() => anular([l.id], `${l.casa}, ${quando(l.quando)}.`)} accessibilityRole="button"><Text style={c.anular}>Anular</Text></TouchableOpacity>
                  )}
                </View>
              ))}
              {detalhe.some((l) => !l.anulado) && (
                <TouchableOpacity style={[sa.botaoSec, { marginTop: 8 }]} onPress={() => anular(detalhe.filter((l) => !l.anulado).map((l) => l.id), `Todos os ${detalhe.filter((l) => !l.anulado).length} check-ins do período.`)} accessibilityRole="button">
                  <Text style={sa.botaoSecTxt}>Anular todos do período</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ))}
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  periodos: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodo: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  periodoOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  periodoTxt: { color: CA.texto, fontSize: 13, fontWeight: '700' },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  motivos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: CA.borda },
  linhaTit: { color: CA.texto, fontSize: 13, fontWeight: '700' },
  anular: { color: CA.rosa, fontSize: 13, fontWeight: '800' },
  anulado: { color: CA.fraco, fontSize: 12, fontWeight: '700' },
});
