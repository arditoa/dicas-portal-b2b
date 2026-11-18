// Modo equipe · Topo 3 de Eventos: escolher quais festas entram em "Festas em destaque" (fliers).
//   157 (18/11): a janela termina no dia do evento (destaque_inicio … dia do evento).
//   • Do plano: o parceiro escolhe no app (7 ou 15 dias); aqui a equipe marca 7 dias → 'plano_festa'
//   • Avulso (qualquer casa): R$129 por 7 dias ou R$199 por 21 dias                 → 'patrocinado'
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { supabase } from '../../lib/supabase';

type Festa = { id: string; titulo: string; data_inicio: string; destaque_secoes: string[] | null; destaque_dias?: number | null; locais: { nome: string; plano_comercial: string | null } | null };
const PLANO: Record<string, string> = { premium: 'Premium', fundador: 'Fundador', intermediario: 'Intermediário Festas' };

export default function FestaDestacar() {
  const [lista, setLista] = useState<Festa[] | null>(null);
  const [busca, setBusca] = useState('');
  const carregar = useCallback(async () => {
    const ontem = new Date(Date.now() - 30 * 3600e3).toISOString();
    const q = (c: string) => supabase.from('eventos').select(c).eq('status', 'aprovado').gte('data_inicio', ontem).order('data_inicio').limit(80);
    let r: any = await q('id, titulo, data_inicio, destaque_secoes, destaque_dias, locais(nome, plano_comercial)');
    if (r.error) r = await q('id, titulo, data_inicio, destaque_secoes, locais(nome, plano_comercial)'); // sem a 157
    setLista((r.data as any) || []);
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  // Trava por data (153): 24 destaques no dia, no máximo 6 avulsas. A equipe pode passar, mas é avisada.
  const diaDo = (f: Festa) => new Date(new Date(f.data_inicio).getTime() - 3 * 3600e3).toISOString().slice(0, 10);
  const inicioDe = (f: Festa, dias: number) => {
    const d = new Date(`${diaDo(f)}T12:00:00`); d.setDate(d.getDate() - (dias - 1));
    const k = d.toISOString().slice(0, 10); const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    return k < hoje ? hoje : k;
  };
  const conferirData = async (f: Festa, tipo: 'plano_festa' | 'patrocinado' | null, dias: number): Promise<boolean> => {
    if (!tipo) return true;
    let pior: { dia: string; total: number; avulsas: number } | null = null;
    for (let k = inicioDe(f, dias); k <= diaDo(f); k = new Date(new Date(`${k}T12:00:00`).getTime() + 864e5).toISOString().slice(0, 10)) {
      const { data } = await supabase.rpc('destaques_na_data', { p_data: k });
      const d = (data || {}) as { total?: number; avulsas?: number };
      if ((d.total || 0) >= 24 || (tipo === 'patrocinado' && (d.avulsas || 0) >= 6)) { pior = { dia: k, total: d.total || 0, avulsas: d.avulsas || 0 }; break; }
    }
    if (!pior) return true;
    const d = pior;
    return new Promise((ok) => Alert.alert('Dia esgotado', `${d.dia.split('-').reverse().slice(0, 2).join('/')} já tem ${d.total} destaques (${d.avulsas} avulsos). Limite: 24 no dia e 6 avulsos. Marcar mesmo assim?`, [
      { text: 'Não', style: 'cancel', onPress: () => ok(false) }, { text: 'Marcar assim mesmo', onPress: () => ok(true) },
    ]));
  };
  const marcar = async (f: Festa, tipo: 'plano_festa' | 'patrocinado' | null, dias = 7) => {
    if (!(await conferirData(f, tipo, dias))) return;
    const resto = (f.destaque_secoes || []).filter((x) => x !== 'plano_festa' && x !== 'patrocinado');
    const novo = tipo ? [...resto, tipo] : resto;
    setLista((l) => (l || []).map((x) => (x.id === f.id ? { ...x, destaque_secoes: novo, destaque_dias: tipo ? dias : null } : x)));
    let { error } = await supabase.from('eventos').update({ destaque_secoes: novo, destaque_inicio: tipo ? inicioDe(f, dias) : null, destaque_dias: tipo ? dias : null }).eq('id', f.id);
    if (error && /destaque_(inicio|dias)/.test(error.message)) ({ error } = await supabase.from('eventos').update({ destaque_secoes: novo }).eq('id', f.id)); // sem a 157
    if (error) { Alert.alert('Evento', error.message); void carregar(); }
  };

  const vis = (lista || []).filter((f) => !busca.trim() || `${f.titulo} ${f.locais?.nome || ''}`.toLowerCase().includes(busca.trim().toLowerCase()));
  return (
    <TelaAdm titulo="Topo 3 · Eventos em destaque" subtitulo="Termina no dia do evento · avulso R$129 (7 dias) ou R$199 (21 dias) · máx. 24 por dia e 6 avulsos" voltar>
      <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar festa ou casa" placeholderTextColor={CA.fraco} style={[sa.campoBusca, { marginBottom: 10 }]} />
      {lista === null ? <ActivityIndicator color={CA.rosa} /> : vis.length === 0 ? <Text style={sa.vazio}>Nenhuma festa aprovada nos próximos dias.</Text> : vis.map((f) => {
        const atual = (f.destaque_secoes || []).includes('plano_festa') ? 'plano_festa' : (f.destaque_secoes || []).includes('patrocinado') ? 'patrocinado' : null;
        const opcoes: [('plano_festa' | 'patrocinado' | null), string, number][] = [['plano_festa', 'Do plano', 7], ['patrocinado', 'Avulso 7 dias · R$129', 7], ['patrocinado', 'Avulso 21 dias · R$199', 21], [null, 'Sem destaque', 0]];
        const ehAtual = (t: string | null, d: number) => atual === t && (t !== 'patrocinado' || (f.destaque_dias ?? 7) === d);
        return (
          <View key={f.id} style={sa.card}>
            <Text style={sa.tit} numberOfLines={1}>{f.titulo}</Text>
            <Text style={sa.sub}>{f.locais?.nome || ''}{f.locais?.plano_comercial && PLANO[f.locais.plano_comercial] ? ` · ${PLANO[f.locais.plano_comercial]}` : ' · Gratuito'} · {new Date(f.data_inicio).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</Text>
            <View style={c.opcoes}>
              {opcoes.map(([t, r, d]) => (
                <TouchableOpacity key={r} style={[c.op, ehAtual(t, d) && c.opOn]} onPress={() => void marcar(f, t, d || 7)} accessibilityRole="button" accessibilityState={{ selected: ehAtual(t, d) }}>
                  <Text style={[c.opTxt, ehAtual(t, d) && { color: '#0B0B0E' }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  op: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  opOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  opTxt: { color: CA.texto, fontSize: 11, fontWeight: '700' },
});
