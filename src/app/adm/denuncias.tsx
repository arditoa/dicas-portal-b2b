// Modo equipe — Denúncias (ocorrências, migração 045 + 141). A equipe lê, muda a situação, responde a pessoa e,
// quando for numa casa do app, vincula a denúncia à casa. "LGBTfobia confirmada" suspende o selo Lugar seguro da casa
// até a casa resolver. Quem denunciou NUNCA é identificado para a casa.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { supabase } from '../../lib/supabase';

type Oc = { id: string; protocolo: string; categoria: string; data_fato: string; local_tipo: string; local_nome: string | null; cidade: string | null; uf: string | null;
  descricao: string; status: string; risco_imediato: boolean; created_at: string; local_id: string | null; lgbtfobia_confirmada: boolean; resolvida_pela_casa_em: string | null;
  quer_orientacao: boolean; encaminhamento: string | null; locais: { nome: string } | null };
const CATEGORIA: Record<string, string> = { agressao_fisica: 'Agressão física', ameaca: 'Ameaça', injuria_discriminacao: 'Injúria / discriminação', discriminacao_local: 'Discriminação num local',
  assedio: 'Assédio', golpe_extorsao: 'Golpe / extorsão', perseguicao_online: 'Perseguição online', outro: 'Outro' };
const STATUS: [string, string][] = [['recebida', 'Recebida'], ['em_analise', 'Em análise'], ['aguardando_informacoes', 'Aguardando informações'], ['encaminhada', 'Encaminhada'], ['concluida', 'Concluída'], ['arquivada', 'Arquivada']];
const ABERTAS = ['recebida', 'em_analise', 'aguardando_informacoes', 'encaminhada'];

export default function Denuncias() {
  const [lista, setLista] = useState<Oc[] | null>(null);
  const [filtro, setFiltro] = useState<'abertas' | 'todas'>('abertas');
  const [aberta, setAberta] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<{ id: string; nome: string; cidade: string }[]>([]);
  const [casaSel, setCasaSel] = useState<{ id: string; nome: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [resolucao, setResolucao] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    let q = supabase.from('ocorrencias').select('id, protocolo, categoria, data_fato, local_tipo, local_nome, cidade, uf, descricao, status, risco_imediato, created_at, local_id, lgbtfobia_confirmada, resolvida_pela_casa_em, quer_orientacao, encaminhamento, locais(nome)')
      .order('created_at', { ascending: false }).limit(80);
    if (filtro === 'abertas') q = q.in('status', ABERTAS);
    const { data, error } = await q;
    setLista(error ? [] : ((data as unknown as Oc[]) || []));
  }, [filtro]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const abrir = (o: Oc) => {
    setAberta(aberta === o.id ? null : o.id);
    setCasaSel(o.local_id && o.locais ? { id: o.local_id, nome: o.locais.nome } : null);
    setBusca(o.local_nome || ''); setAchados([]); setMsg(''); setResolucao('');
  };
  const buscar = async (t: string) => {
    setBusca(t);
    if (t.trim().length < 2) return setAchados([]);
    const { data } = await supabase.from('locais').select('id, nome, cidade').ilike('nome', `%${t.trim()}%`).limit(6);
    setAchados((data as { id: string; nome: string; cidade: string }[]) || []);
  };
  const rodar = async (f: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setOcupado(true);
    const { error } = await f();
    setOcupado(false);
    if (error) return Alert.alert('Não deu', error.message.includes('admin_ocorrencia') ? 'Rode a migração 141 no Supabase.' : error.message);
    Alert.alert('Pronto', ok);
    void carregar();
  };
  const mudarStatus = (o: Oc, status: string) => rodar(async () => supabase.from('ocorrencias').update({ status }).eq('id', o.id), 'Situação atualizada. A pessoa vê no app.');
  const responder = (o: Oc) => {
    if (msg.trim().length < 5) return Alert.alert('Mensagem', 'Escreva a mensagem para a pessoa.');
    void rodar(async () => supabase.from('ocorrencias').update({ encaminhamento: msg.trim().slice(0, 1000) }).eq('id', o.id), 'Mensagem enviada. Aparece no acompanhamento da pessoa.');
  };
  const vincular = (o: Oc, confirmada: boolean) => {
    if (!casaSel) return Alert.alert('Casa', 'Escolha a casa na busca.');
    const fazer = () => rodar(async () => supabase.rpc('admin_ocorrencia_casa', { p_ocorrencia: o.id, p_local: casaSel.id, p_confirmada: confirmada }),
      confirmada ? `Selo do ${casaSel.nome} suspenso. A casa foi avisada, sem saber quem denunciou.` : 'Denúncia vinculada à casa.');
    if (!confirmada) return void fazer();
    Alert.alert('Confirmar LGBTfobia?', `O selo Lugar seguro do ${casaSel.nome} fica suspenso até a casa resolver. A casa recebe um aviso, sem saber quem denunciou.`,
      [{ text: 'Voltar', style: 'cancel' }, { text: 'Confirmar', style: 'destructive', onPress: () => void fazer() }]);
  };
  const resolvida = (o: Oc) => rodar(async () => supabase.rpc('admin_ocorrencia_resolvida_casa', { p_ocorrencia: o.id, p_resolucao: resolucao }), 'Marcada como resolvida pela casa. O selo pode voltar.');

  return (
    <TelaAdm titulo="Denúncias" subtitulo="Ocorrências enviadas pelo app. Dados sensíveis: trate com cuidado." voltar atualizando={false} aoAtualizar={carregar}>
      <View style={st.filtros}>
        {(['abertas', 'todas'] as const).map((f) => (
          <TouchableOpacity key={f} style={[st.filtro, filtro === f && st.filtroOn]} onPress={() => setFiltro(f)}>
            <Text style={[st.filtroTxt, filtro === f && { color: '#000' }]}>{f === 'abertas' ? 'Abertas' : 'Todas'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {lista === null ? <ActivityIndicator color={CA.rosa} /> : lista.length === 0 ? <Text style={sa.sub}>Nenhuma denúncia {filtro === 'abertas' ? 'aberta' : ''}.</Text> : lista.map((o) => (
        <View key={o.id} style={[sa.card, o.risco_imediato && { borderColor: '#EF4444' }, { marginBottom: 10 }]}>
          <TouchableOpacity onPress={() => abrir(o)} accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {o.risco_imediato && <Feather name="alert-octagon" size={15} color="#EF4444" />}
              <Text style={[sa.tit, { flex: 1 }]}>{CATEGORIA[o.categoria] || o.categoria}</Text>
              <Text style={st.status}>{STATUS.find((x) => x[0] === o.status)?.[1] || o.status}</Text>
            </View>
            <Text style={sa.sub}>{o.protocolo} · {o.data_fato.split('-').reverse().join('/')} · {[o.local_nome, o.cidade, o.uf].filter(Boolean).join(', ') || o.local_tipo}</Text>
            {o.local_id && <Text style={[sa.sub, { color: o.lgbtfobia_confirmada && !o.resolvida_pela_casa_em ? CA.amarelo : CA.verde }]}>
              Casa: {o.locais?.nome}{o.lgbtfobia_confirmada ? (o.resolvida_pela_casa_em ? ' · resolvida pela casa' : ' · LGBTfobia confirmada, selo suspenso') : ''}</Text>}
          </TouchableOpacity>

          {aberta === o.id && (
            <View style={{ marginTop: 10, gap: 8 }}>
              <Text style={st.relato}>{o.descricao}</Text>
              {o.quer_orientacao && <Text style={[sa.sub, { color: CA.amarelo }]}>A pessoa quer orientação (Defensoria, delegacia, apoio).</Text>}

              <Text style={st.rotulo}>Situação</Text>
              <View style={st.filtros}>
                {STATUS.map(([v, r]) => (
                  <TouchableOpacity key={v} style={[st.chip, o.status === v && st.filtroOn]} onPress={() => mudarStatus(o, v)} disabled={ocupado}>
                    <Text style={[st.chipTxt, o.status === v && { color: '#000' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={st.rotulo}>Mensagem para a pessoa (aparece no app dela)</Text>
              <TextInput value={msg} onChangeText={setMsg} multiline placeholder={o.encaminhamento || 'Ex.: Recebemos e encaminhamos à Defensoria. Você pode ligar no 129.'} placeholderTextColor={CA.fraco} style={st.input} />
              <TouchableOpacity style={st.botaoSec} onPress={() => responder(o)} disabled={ocupado}><Text style={st.botaoTxt}>Enviar mensagem</Text></TouchableOpacity>

              {o.local_tipo === 'estabelecimento' && (
                <>
                  <Text style={st.rotulo}>Casa do app (para o selo)</Text>
                  <TextInput value={busca} onChangeText={buscar} placeholder="Buscar casa pelo nome" placeholderTextColor={CA.fraco} style={st.input} />
                  {achados.map((c) => (
                    <TouchableOpacity key={c.id} onPress={() => { setCasaSel({ id: c.id, nome: c.nome }); setAchados([]); setBusca(c.nome); }} style={st.achado}>
                      <Text style={sa.tit}>{c.nome}</Text><Text style={sa.sub}>{c.cidade}</Text>
                    </TouchableOpacity>
                  ))}
                  {casaSel && <Text style={[sa.sub, { color: CA.verde }]}>Escolhida: {casaSel.nome}</Text>}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[st.botaoSec, { flex: 1 }]} onPress={() => vincular(o, false)} disabled={ocupado}><Text style={st.botaoTxt}>Só vincular</Text></TouchableOpacity>
                    <TouchableOpacity style={[st.botao, { flex: 1 }]} onPress={() => vincular(o, true)} disabled={ocupado}><Text style={st.botaoTxt}>Confirmar LGBTfobia</Text></TouchableOpacity>
                  </View>
                  {o.lgbtfobia_confirmada && !o.resolvida_pela_casa_em && (
                    <>
                      <TextInput value={resolucao} onChangeText={setResolucao} placeholder="O que a casa fez (treinou a equipe, afastou o funcionário…)" placeholderTextColor={CA.fraco} style={st.input} />
                      <TouchableOpacity style={[st.botaoSec, { borderColor: CA.verde }]} onPress={() => resolvida(o)} disabled={ocupado}><Text style={[st.botaoTxt, { color: CA.verde }]}>A casa resolveu: devolver o selo</Text></TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      ))}
    </TelaAdm>
  );
}

const st = StyleSheet.create({
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  filtro: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  filtroOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  filtroTxt: { color: CA.texto, fontSize: 13, fontWeight: '700' },
  status: { color: CA.dim, fontSize: 11.5, fontWeight: '700' },
  relato: { color: CA.texto, fontSize: 13.5, lineHeight: 19, backgroundColor: '#0F0E16', borderRadius: 10, padding: 10 },
  rotulo: { color: CA.dim, fontSize: 12, fontWeight: '800', marginTop: 6 },
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipTxt: { color: CA.texto, fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: CA.borda, backgroundColor: '#0F0E16', borderRadius: 10, color: CA.texto, padding: 10, fontSize: 13.5, minHeight: 42 },
  achado: { padding: 8, borderBottomWidth: 1, borderBottomColor: CA.borda },
  botao: { backgroundColor: '#B91C1C', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  botaoSec: { borderWidth: 1, borderColor: CA.borda, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  botaoTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});
