// Rodada 146 — Fazer reserva (app cliente). Abre pelo botão "Fazer reserva" da página da casa quando o modo é 'app'.
// Um passo a passo numa tela só: área → dia → horário → pessoas → ocasião → enviar. A casa confirma em Aprovações.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/authContext';
import { supabase } from '../../lib/supabase';
import { TITULO_SECAO } from '../../constants/theme';

const C = { bg: '#0B0B0E', card: '#161520', borda: '#232230', texto: '#FFFFFF', dim: '#A0A0B2', fraco: '#626274', rosa: '#E1306C', verde: '#4CAF7D', secao: '#B9B6CC' };
const INDICADO: Record<string, string> = {
  date: 'Dates', grupo_pequeno: 'Grupos pequenos', grupo_grande: 'Grupos grandes', aniversario: 'Aniversários',
  show: 'Perto do show', tranquilo: 'Mais tranquilo', acessivel: 'Acessível',
};
const OCASIOES: [string, string][] = [['date', 'Date'], ['aniversario', 'Aniversário'], ['amigos', 'Amigos'], ['trabalho', 'Trabalho'], ['outro', 'Outro']];
const STATUS: Record<string, { txt: string; cor: string }> = {
  aguardando: { txt: 'Aguardando a casa confirmar', cor: '#F2A900' },
  confirmada: { txt: 'Reserva confirmada', cor: '#4CAF7D' },
};

type Config = { modo: string; chamada: string | null; aviso: string | null; dias_semana: number[]; antecedencia_horas: number; dias_a_frente: number; max_pessoas: number };
type Area = { id: string; nome: string; descricao: string | null; tipo_mesa: string | null; indicado_para: string[]; hora_inicio: string; hora_limite: string; min_pessoas: number; max_pessoas: number | null };
type Minha = { id: string; area_nome: string; data: string; horario: string; pessoas: number; status: string; resposta: string | null };

const chave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const diaBonito = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
const paraMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const deMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export default function FazerReserva() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [nomeLocal, setNomeLocal] = useState('');
  const [cfg, setCfg] = useState<Config | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [minha, setMinha] = useState<Minha | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [area, setArea] = useState<Area | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [pessoas, setPessoas] = useState(2);
  const [ocasiao, setOcasiao] = useState<string | null>(null);
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    const hoje = chave(new Date());
    const [l, c, a, m] = await Promise.all([
      supabase.from('locais').select('nome').eq('id', id).maybeSingle(),
      supabase.from('reserva_config').select('modo, chamada, aviso, dias_semana, antecedencia_horas, dias_a_frente, max_pessoas').eq('local_id', id).maybeSingle(),
      supabase.from('reserva_areas').select('id, nome, descricao, tipo_mesa, indicado_para, hora_inicio, hora_limite, min_pessoas, max_pessoas').eq('local_id', id).eq('ativo', true).order('ordem'),
      user
        ? supabase.from('reservas').select('id, area_nome, data, horario, pessoas, status, resposta').eq('local_id', id).eq('user_id', user.id)
            .gte('data', hoje).in('status', ['aguardando', 'confirmada']).order('data').limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setNomeLocal((l.data as { nome: string } | null)?.nome || '');
    setCfg((c.data as Config) || null);
    setAreas(((a.data as Area[]) || []).map((x) => ({ ...x, hora_inicio: x.hora_inicio.slice(0, 5), hora_limite: x.hora_limite.slice(0, 5) })));
    setMinha((m.data as Minha) || null);
    setCarregando(false);
  }, [id, user]);
  useEffect(() => { void carregar(); }, [carregar]);

  const dias = useMemo(() => {
    if (!cfg) return [];
    const out: string[] = [];
    const base = new Date();
    for (let i = 0; i <= cfg.dias_a_frente && out.length < 21; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      if (cfg.dias_semana.includes(d.getDay())) out.push(chave(d));
    }
    return out;
  }, [cfg]);

  const horarios = useMemo(() => {
    if (!area || !dia || !cfg) return [];
    const minimo = new Date(Date.now() + cfg.antecedencia_horas * 36e5);
    const out: string[] = [];
    for (let m = paraMin(area.hora_inicio); m <= paraMin(area.hora_limite); m += 30) {
      const h = deMin(m);
      if (new Date(`${dia}T${h}:00`) >= minimo) out.push(h);
    }
    return out;
  }, [area, dia, cfg]);

  const maxP = area ? Math.min(area.max_pessoas ?? cfg?.max_pessoas ?? 12, cfg?.max_pessoas ?? 12) : 12;
  const minP = area?.min_pessoas ?? 1;
  useEffect(() => { setPessoas((p) => Math.min(Math.max(p, minP), maxP)); }, [minP, maxP]);
  useEffect(() => { setHora(null); }, [area, dia]);

  const enviar = async () => {
    if (!user) return Alert.alert('Entre na sua conta', 'Para reservar, entre na aba Conta.', [{ text: 'Agora não', style: 'cancel' }, { text: 'Entrar', onPress: () => router.push('/(tabs)/profile') }]);
    if (!area || !dia || !hora) return;
    setEnviando(true);
    const { error } = await supabase.rpc('pedir_reserva', { p_area: area.id, p_data: dia, p_horario: hora, p_pessoas: pessoas, p_ocasiao: ocasiao, p_observacao: obs });
    setEnviando(false);
    if (error) return Alert.alert('Não deu para reservar', error.message);
    setEnviada(true);
    void carregar();
  };
  const cancelar = () =>
    Alert.alert('Cancelar reserva', 'A casa é avisada e a mesa fica livre.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar reserva', style: 'destructive', onPress: async () => { await supabase.rpc('responder_reserva', { p_reserva: minha!.id, p_status: 'cancelada' }); setEnviada(false); void carregar(); } },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.voltar} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={18} color={C.texto} />
        </TouchableOpacity>
        <Text style={s.local}>{nomeLocal}</Text>
        <Text style={s.titulo}>{cfg?.chamada || 'Faça sua reserva'}</Text>
        {!!cfg?.aviso && <Text style={s.aviso}>{cfg.aviso}</Text>}

        {carregando ? (
          <ActivityIndicator color={C.rosa} style={{ marginTop: 32 }} />
        ) : !cfg || cfg.modo !== 'app' || !areas.length ? (
          <Text style={s.vazio}>Esta casa não está recebendo reservas pelo app agora.</Text>
        ) : minha ? (
          <View style={s.minha}>
            <View style={[s.status, { backgroundColor: (STATUS[minha.status]?.cor || C.dim) + '26' }]}>
              <Feather name={minha.status === 'confirmada' ? 'check-circle' : 'clock'} size={14} color={STATUS[minha.status]?.cor || C.dim} />
              <Text style={[s.statusTxt, { color: STATUS[minha.status]?.cor || C.dim }]}>{STATUS[minha.status]?.txt || minha.status}</Text>
            </View>
            <Text style={s.minhaTitulo}>{minha.area_nome} · {diaBonito(minha.data)} às {minha.horario.slice(0, 5)}</Text>
            <Text style={s.minhaSub}>{minha.pessoas} pessoa{minha.pessoas > 1 ? 's' : ''}{minha.resposta ? ` · “${minha.resposta}”` : ''}</Text>
            {enviada && <Text style={s.minhaSub}>A casa responde por aqui. Você pode voltar nesta tela para ver.</Text>}
            <TouchableOpacity onPress={cancelar} style={{ marginTop: 12 }}><Text style={s.cancelar}>Cancelar reserva</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <Passo n={1} titulo="Onde você quer ficar?" />
            <View style={{ gap: 8 }}>
              {areas.map((a) => {
                const on = area?.id === a.id;
                return (
                  <TouchableOpacity key={a.id} style={[s.area, on && s.areaOn]} onPress={() => setArea(a)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.areaNome}>{a.nome}</Text>
                      {!!a.descricao && <Text style={s.areaDesc}>{a.descricao}</Text>}
                      <View style={s.tags}>
                        {!!a.tipo_mesa && <Text style={s.tag}>{a.tipo_mesa}</Text>}
                        {a.indicado_para.map((x) => <Text key={x} style={s.tag}>{INDICADO[x] || x}</Text>)}
                        <Text style={s.tag}>Reserva até {a.hora_limite}</Text>
                      </View>
                    </View>
                    <Feather name={on ? 'check-circle' : 'circle'} size={20} color={on ? C.rosa : C.fraco} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {area && (
              <>
                <Passo n={2} titulo="Que dia?" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {dias.map((d) => (
                    <TouchableOpacity key={d} style={[s.chip, dia === d && s.chipOn]} onPress={() => setDia(d)}>
                      <Text style={[s.chipTxt, dia === d && { color: '#FFF' }]}>{d === chave(new Date()) ? 'Hoje' : diaBonito(d)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {area && dia && (
              <>
                <Passo n={3} titulo="Que horas você chega?" />
                {horarios.length === 0 ? (
                  <Text style={s.vazioPeq}>Sem horário livre neste dia. Escolha outro.</Text>
                ) : (
                  <View style={s.grade}>
                    {horarios.map((h) => (
                      <TouchableOpacity key={h} style={[s.chip, hora === h && s.chipOn]} onPress={() => setHora(h)}>
                        <Text style={[s.chipTxt, hora === h && { color: '#FFF' }]}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {hora && (
              <>
                <Passo n={4} titulo="Quantas pessoas?" />
                <View style={s.contador}>
                  <TouchableOpacity style={s.mm} onPress={() => setPessoas((p) => Math.max(minP, p - 1))}><Feather name="minus" size={18} color={C.texto} /></TouchableOpacity>
                  <Text style={s.contaValor}>{pessoas}</Text>
                  <TouchableOpacity style={s.mm} onPress={() => setPessoas((p) => Math.min(maxP, p + 1))}><Feather name="plus" size={18} color={C.texto} /></TouchableOpacity>
                  <Text style={s.contaDica}>{minP > 1 ? `de ${minP} a ${maxP}` : `até ${maxP}`}</Text>
                </View>

                <Passo n={5} titulo="É alguma ocasião? (opcional)" />
                <View style={s.grade}>
                  {OCASIOES.map(([k, t]) => (
                    <TouchableOpacity key={k} style={[s.chip, ocasiao === k && s.chipOn]} onPress={() => setOcasiao(ocasiao === k ? null : k)}>
                      <Text style={[s.chipTxt, ocasiao === k && { color: '#FFF' }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.input} value={obs} onChangeText={setObs} maxLength={280} multiline
                  placeholder="Algum pedido? Ex.: perto da janela, cadeira para bebê" placeholderTextColor={C.fraco}
                />

                <View style={s.resumo}>
                  <Feather name="bookmark" size={16} color={C.rosa} />
                  <Text style={s.resumoTxt}>{area!.nome} · {diaBonito(dia!)} às {hora} · {pessoas} pessoa{pessoas > 1 ? 's' : ''}</Text>
                </View>
                <TouchableOpacity style={[s.enviar, enviando && { opacity: 0.6 }]} onPress={enviar} disabled={enviando} accessibilityRole="button">
                  {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={s.enviarTxt}>Pedir reserva</Text>}
                </TouchableOpacity>
                <Text style={s.nota}>A casa confirma pelo app. Seu nome e telefone da Conta vão junto com o pedido.</Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Passo({ n, titulo }: { n: number; titulo: string }) {
  return (
    <View style={s.passo}>
      <View style={s.passoN}><Text style={s.passoNTxt}>{n}</Text></View>
      <Text style={s.passoTitulo}>{titulo}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  voltar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  local: { ...TITULO_SECAO, marginTop: 16 },
  titulo: { color: C.texto, fontSize: 24, fontWeight: '800', marginTop: 4 },
  aviso: { color: C.dim, fontSize: 13, lineHeight: 19, marginTop: 6 },
  vazio: { color: C.dim, fontSize: 14, lineHeight: 20, backgroundColor: C.card, borderRadius: 16, padding: 16, marginTop: 24 },
  vazioPeq: { color: C.dim, fontSize: 13 },
  passo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 10 },
  passoN: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.rosa, alignItems: 'center', justifyContent: 'center' },
  passoNTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  passoTitulo: { color: C.texto, fontSize: 16, fontWeight: '800' },
  area: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 16, padding: 14 },
  areaOn: { borderColor: C.rosa, backgroundColor: '#E1306C14' },
  areaNome: { color: C.texto, fontSize: 16, fontWeight: '800' },
  areaDesc: { color: C.dim, fontSize: 13, lineHeight: 18, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { color: C.secao, fontSize: 11, fontWeight: '700', backgroundColor: '#24223A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 18, borderWidth: 1, borderColor: C.borda, backgroundColor: C.card, paddingHorizontal: 14, height: 38, justifyContent: 'center' },
  chipOn: { backgroundColor: C.rosa, borderColor: C.rosa },
  chipTxt: { color: C.dim, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mm: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  contaValor: { color: C.texto, fontSize: 22, fontWeight: '800', minWidth: 32, textAlign: 'center' },
  contaDica: { color: C.fraco, fontSize: 12 },
  input: { backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 72, color: C.texto, fontSize: 14, marginTop: 10, textAlignVertical: 'top' },
  resumo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, backgroundColor: '#E1306C14', borderRadius: 12, padding: 12 },
  resumoTxt: { flex: 1, color: C.texto, fontSize: 13, fontWeight: '700' },
  enviar: { backgroundColor: C.rosa, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  enviarTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  nota: { color: C.fraco, fontSize: 11, textAlign: 'center', marginTop: 8 },
  minha: { backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 24 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt: { fontSize: 12, fontWeight: '800' },
  minhaTitulo: { color: C.texto, fontSize: 16, fontWeight: '800', marginTop: 10 },
  minhaSub: { color: C.dim, fontSize: 13, marginTop: 3, lineHeight: 18 },
  cancelar: { color: '#FF7A7A', fontSize: 13, fontWeight: '700' },
});
