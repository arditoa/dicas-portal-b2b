// Rodada 146 — Reservas (Meu espaço › Reservas). Só dono, só planos pagos (migração 102).
//   1. Como receber: pelo app (quiz → Aprovações, a casa confirma) · pelo WhatsApp (botão abre a conversa) · desligado.
//   2. Regras gerais: dias da semana, antecedência mínima, até quantos dias à frente, máximo de pessoas, aviso.
//   3. Áreas: Rooftop, Primeiro andar, Sacada… com descrição, tipo de mesa, indicado para, horário e pessoas.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../lib/modoParceiro';
import { nivelDoPlano } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

type Modo = 'app' | 'whatsapp' | 'desligado';
type Config = {
  modo: Modo; whatsapp: string; chamada: string; aviso: string;
  dias_semana: number[]; antecedencia_horas: number; dias_a_frente: number; max_pessoas: number;
};
type Area = {
  id?: string; nome: string; descricao: string; tipo_mesa: string; indicado_para: string[];
  hora_inicio: string; hora_limite: string; min_pessoas: number; max_pessoas: number | null; ativo: boolean; ordem: number;
};

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const INDICADO: { id: string; rotulo: string }[] = [
  { id: 'date', rotulo: 'Dates' }, { id: 'grupo_pequeno', rotulo: 'Grupos pequenos' }, { id: 'grupo_grande', rotulo: 'Grupos grandes' },
  { id: 'aniversario', rotulo: 'Aniversários' }, { id: 'show', rotulo: 'Perto do show' }, { id: 'tranquilo', rotulo: 'Mais tranquilo' },
  { id: 'acessivel', rotulo: 'Acessível' },
];
const PADRAO: Config = { modo: 'desligado', whatsapp: '', chamada: 'Faça sua reserva', aviso: '', dias_semana: [4, 5, 6], antecedencia_horas: 2, dias_a_frente: 30, max_pessoas: 12 };
const NOVA: Area = { nome: '', descricao: '', tipo_mesa: '', indicado_para: [], hora_inicio: '18:00', hora_limite: '22:00', min_pessoas: 1, max_pessoas: null, ativo: true, ordem: 0 };
// Modelo pronto para começar rápido (o bar edita depois).
const MODELO: Omit<Area, 'id' | 'ordem'>[] = [
  { nome: 'Salão', descricao: 'Mais movimento, perto do bar', tipo_mesa: 'Mesa', indicado_para: ['grupo_grande', 'aniversario'], hora_inicio: '18:00', hora_limite: '22:00', min_pessoas: 1, max_pessoas: null, ativo: true },
  { nome: 'Área externa', descricao: 'Ao ar livre, mais tranquilo para conversar', tipo_mesa: 'Mesa e cadeiras', indicado_para: ['tranquilo', 'grupo_pequeno'], hora_inicio: '18:00', hora_limite: '21:00', min_pessoas: 1, max_pessoas: null, ativo: true },
  { nome: 'Mesa bistrô', descricao: 'Mesa alta para dois ou três', tipo_mesa: 'Mesa bistrô', indicado_para: ['date'], hora_inicio: '19:00', hora_limite: '22:00', min_pessoas: 1, max_pessoas: 3, ativo: true },
];
const soDigitos = (s: string) => s.replace(/\D/g, '');
const horaOk = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

export default function Reservas() {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  const [cfg, setCfg] = useState<Config>(PADRAO);
  const [areas, setAreas] = useState<Area[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvoModo, setSalvoModo] = useState<Modo>('desligado'); // como está gravado no banco
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [falta, setFalta] = useState(false); // migração 102 ainda não rodou
  const [editando, setEditando] = useState<Area | null>(null);
  const localId = localAtivo?.local_id;
  const pago = nivelDoPlano(localAtivo?.plano_comercial) !== 'gratuito';

  const carregar = useCallback(async () => {
    if (!localId) return;
    setCarregando(true);
    const [c, a] = await Promise.all([
      supabase.from('reserva_config').select('*').eq('local_id', localId).maybeSingle(),
      supabase.from('reserva_areas').select('*').eq('local_id', localId).order('ordem'),
    ]);
    if (c.error) {
      if (/relation|does not exist|schema cache/i.test(c.error.message)) setFalta(true);
      else setErroCarga(c.error.message);
    }
    if (c.data) {
      setSalvoModo((c.data as { modo: Modo }).modo);
      const d = c.data as Record<string, any>;
      setCfg({
        modo: d.modo, whatsapp: d.whatsapp || '', chamada: d.chamada || '', aviso: d.aviso || '',
        dias_semana: d.dias_semana || [], antecedencia_horas: d.antecedencia_horas, dias_a_frente: d.dias_a_frente, max_pessoas: d.max_pessoas,
      });
    }
    setAreas(((a.data as any[]) || []).map((x) => ({
      id: x.id, nome: x.nome, descricao: x.descricao || '', tipo_mesa: x.tipo_mesa || '', indicado_para: x.indicado_para || [],
      hora_inicio: String(x.hora_inicio).slice(0, 5), hora_limite: String(x.hora_limite).slice(0, 5),
      min_pessoas: x.min_pessoas, max_pessoas: x.max_pessoas, ativo: x.ativo, ordem: x.ordem,
    })));
    setCarregando(false);
  }, [localId]);
  useEffect(() => { void carregar(); }, [carregar]);

  if (!localAtivo) return null;

  const usarModelo = async () => {
    const { error } = await supabase.from('reserva_areas').insert(MODELO.map((m, i) => ({ ...m, local_id: localId, ordem: areas.length + i })));
    if (error) return Alert.alert('Não foi possível criar o modelo', error.message);
    void carregar();
  };

  // Ao ligar "Pelo app" sem nenhuma área, já oferece criar a primeira (o quiz começa por ela).
  const escolherModo = (m: Modo) => {
    setCfg({ ...cfg, modo: m });
    if (m === 'app' && !areas.length) {
      Alert.alert('Vamos montar o quiz?', 'A primeira pergunta é "Onde você quer ficar?". Crie a primeira área (ex.: Rooftop) ou comece com um modelo pronto e edite depois.', [
        { text: 'Depois', style: 'cancel' },
        { text: 'Usar modelo pronto', onPress: () => void usarModelo() },
        { text: 'Criar a primeira área', onPress: () => setEditando({ ...NOVA }) },
      ]);
    }
  };

  const salvarConfig = async () => {
    const zap = soDigitos(cfg.whatsapp);
    const numero = zap ? (zap.startsWith('55') ? zap : `55${zap}`) : '';
    if (cfg.modo === 'whatsapp' && !/^\d{12,13}$/.test(numero)) return Alert.alert('WhatsApp', 'Coloque o WhatsApp das reservas com DDD, ex.: (11) 94294-2028.');
    if (cfg.modo === 'app' && !areas.some((a) => a.ativo))
      return Alert.alert('Falta montar o quiz', 'O quiz começa perguntando "Onde você quer ficar?". Cadastre pelo menos uma área, ou comece com um modelo pronto e edite.', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Usar modelo pronto', onPress: () => void usarModelo() },
      ]);
    if (cfg.modo !== 'desligado' && !cfg.dias_semana.length) return Alert.alert('Dias', 'Escolha os dias em que a casa recebe reservas.');
    setSalvando(true);
    const { error } = await supabase.from('reserva_config').upsert({
      local_id: localId, modo: cfg.modo, whatsapp: numero || null, chamada: cfg.chamada.trim() || null, aviso: cfg.aviso.trim() || null,
      dias_semana: cfg.dias_semana, antecedencia_horas: cfg.antecedencia_horas, dias_a_frente: cfg.dias_a_frente, max_pessoas: cfg.max_pessoas,
      updated_at: new Date().toISOString(),
    });
    setSalvando(false);
    if (error) return Alert.alert('Não foi possível salvar', `${error.message}\n\nSe continuar, mande um print para a equipe Dicas.`);
    setSalvoModo(cfg.modo);
    Alert.alert(
      'Reservas salvas!',
      cfg.modo === 'app' ? 'O botão "Fazer reserva" já aparece na página da casa e os pedidos chegam em Aprovações.' : cfg.modo === 'whatsapp' ? 'O botão "Fazer reserva" abre o WhatsApp de vocês.' : 'Reservas desligadas.',
      cfg.modo === 'app' ? [{ text: 'OK', style: 'cancel' }, { text: 'Ver o quiz como cliente', onPress: () => router.push(`/reserva/${localId}` as any) }] : undefined,
    );
  };

  const salvarArea = async (a: Area) => {
    if (a.nome.trim().length < 2) return Alert.alert('Área', 'Dê um nome para a área (ex.: Rooftop).');
    if (!horaOk(a.hora_inicio) || !horaOk(a.hora_limite) || a.hora_inicio > a.hora_limite) return Alert.alert('Horário', 'Use o formato 18:00 e a última chegada depois da primeira.');
    const linha = {
      local_id: localId, nome: a.nome.trim(), descricao: a.descricao.trim() || null, tipo_mesa: a.tipo_mesa.trim() || null, indicado_para: a.indicado_para,
      hora_inicio: a.hora_inicio, hora_limite: a.hora_limite, min_pessoas: a.min_pessoas, max_pessoas: a.max_pessoas, ativo: a.ativo,
      ordem: a.id ? a.ordem : areas.length,
    };
    const { error } = a.id ? await supabase.from('reserva_areas').update(linha).eq('id', a.id) : await supabase.from('reserva_areas').insert(linha);
    if (error) return Alert.alert('Não foi possível salvar', error.message);
    setEditando(null);
    void carregar();
  };
  const apagarArea = (a: Area) =>
    Alert.alert('Apagar área', `Apagar "${a.nome}"? As reservas já feitas continuam com o nome da área.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => { await supabase.from('reserva_areas').delete().eq('id', a.id!); setEditando(null); void carregar(); } },
    ]);

  return (
    <TelaParceiro titulo="Reservas" subtitulo="O cliente escolhe a área, o dia e o horário. Vocês confirmam.">
      <TouchableOpacity style={r.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={r.voltarTxt}>Meu espaço</Text></TouchableOpacity>

      {!pago ? (
        <Text style={r.aviso}>Reservas estão incluídas nos planos pagos. Fale com a equipe em Meu espaço › Seu plano.</Text>
      ) : falta ? (
        <Text style={r.aviso}>As reservas ainda não foram ativadas no sistema. (Equipe Dicas: rodar a migração 102 no Supabase.)</Text>
      ) : erroCarga ? (
        <Text style={r.aviso}>Não foi possível abrir as reservas: {erroCarga}</Text>
      ) : carregando ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={[r.estado, salvoModo !== 'desligado' && { borderColor: '#4CAF7D88', backgroundColor: '#4CAF7D14' }]}>
            <Feather name={salvoModo === 'desligado' ? 'pause-circle' : 'check-circle'} size={16} color={salvoModo === 'desligado' ? CP.dim : CP.verde} />
            <Text style={r.estadoTxt}>
              {salvoModo === 'app' ? 'Ligadas pelo app: o quiz está na página da casa.' : salvoModo === 'whatsapp' ? 'Ligadas pelo WhatsApp.' : 'Reservas desligadas. Escolha como receber e salve.'}
            </Text>
          </View>

          <TituloSecao texto="1 · Como receber" />
          <View style={{ gap: ESP.s }}>
            {([
              ['app', 'list', 'Pelo app', 'O cliente responde um passo a passo e o pedido chega em Aprovações.'],
              ['whatsapp', 'message-circle', 'Pelo WhatsApp', 'O botão "Fazer reserva" abre a conversa com vocês.'],
              ['desligado', 'slash', 'Desligado', 'Sem botão de reserva na página da casa.'],
            ] as [Modo, keyof typeof Feather.glyphMap, string, string][]).map(([m, ic, t, s]) => (
              <TouchableOpacity key={m} style={[r.modo, cfg.modo === m && r.modoAtivo]} onPress={() => escolherModo(m)} accessibilityRole="radio" accessibilityState={{ selected: cfg.modo === m }}>
                <View style={[r.modoIcone, cfg.modo === m && { backgroundColor: CP.rosa }]}><Feather name={ic} size={16} color="#FFF" /></View>
                <View style={{ flex: 1 }}><Text style={r.modoTitulo}>{t}</Text><Text style={r.modoSub}>{s}</Text></View>
                <Feather name={cfg.modo === m ? 'check-circle' : 'circle'} size={18} color={cfg.modo === m ? CP.rosa : CP.fraco} />
              </TouchableOpacity>
            ))}
          </View>

          {cfg.modo === 'whatsapp' && (
            <Campo rotulo="WhatsApp das reservas" valor={cfg.whatsapp} aoMudar={(v) => setCfg({ ...cfg, whatsapp: v })} teclado="phone-pad" dica="Com DDD. O cliente cai direto na conversa." />
          )}

          {cfg.modo === 'app' && (
            <>
              <TituloSecao
                texto="2 · Monte o quiz"
                direita={<TouchableOpacity onPress={() => setEditando({ ...NOVA })}><Text style={r.add}>+ Nova área</Text></TouchableOpacity>}
              />
              <Text style={r.quizIntro}>Pergunta 1 do quiz: <Text style={{ color: CP.texto, fontWeight: '800' }}>Onde você quer ficar?</Text> Cada área vira uma opção.</Text>
              {areas.length === 0 ? (
                <TouchableOpacity style={r.vazio} onPress={() => setEditando({ ...NOVA })}>
                  <Feather name="plus" size={18} color={CP.rosa} />
                  <Text style={r.vazioTxt}>Cadastre os lugares que o cliente pode escolher: Rooftop, Salão, Sacada…</Text>
                </TouchableOpacity>
              ) : null}
              {areas.length === 0 ? (
                <TouchableOpacity style={r.modelo} onPress={usarModelo}>
                  <Feather name="zap" size={15} color="#FFF" />
                  <Text style={r.modeloTxt}>Começar com um modelo pronto (Salão · Área externa · Mesa bistrô)</Text>
                </TouchableOpacity>
              ) : (
                <View style={r.lista}>
                  {areas.map((a, i) => (
                    <TouchableOpacity key={a.id} style={[r.linha, i > 0 && r.borda, !a.ativo && { opacity: 0.5 }]} onPress={() => setEditando({ ...a })}>
                      <View style={{ flex: 1 }}>
                        <Text style={r.areaNome}>{a.nome}{!a.ativo ? ' · pausada' : ''}</Text>
                        <Text style={r.areaSub} numberOfLines={2}>
                          {[a.descricao, a.tipo_mesa, `chegada ${a.hora_inicio}–${a.hora_limite}`].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Feather name="edit-2" size={16} color={CP.fraco} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={r.depois}>
                <Text style={r.depoisTitulo}>Depois o quiz pergunta sozinho:</Text>
                {['2. Que dia? (só os dias que vocês recebem)', '3. Que horas chega? (de 30 em 30 min, na janela da área)', '4. Quantas pessoas?', '5. É alguma ocasião? + observação'].map((x) => (
                  <Text key={x} style={r.depoisItem}>{x}</Text>
                ))}
              </View>
            </>
          )}

          {cfg.modo !== 'desligado' && (
            <>
              <TituloSecao texto={cfg.modo === 'app' ? '3 · Regras' : '2 · Regras'} />
              <View style={r.caixa}>
                <Text style={r.rotulo}>Dias que recebem reserva</Text>
                <View style={r.chips}>
                  {DIAS.map((d, i) => {
                    const on = cfg.dias_semana.includes(i);
                    return (
                      <TouchableOpacity key={d} style={[r.chip, on && r.chipOn]} onPress={() => setCfg({ ...cfg, dias_semana: on ? cfg.dias_semana.filter((x) => x !== i) : [...cfg.dias_semana, i].sort() })}>
                        <Text style={[r.chipTxt, on && { color: '#FFF' }]}>{d}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {cfg.modo === 'app' && (
                  <>
                    <Contador rotulo="Antecedência mínima" sufixo="h" valor={cfg.antecedencia_horas} min={0} max={48} aoMudar={(v) => setCfg({ ...cfg, antecedencia_horas: v })} />
                    <Contador rotulo="Reserva até quantos dias à frente" sufixo=" dias" valor={cfg.dias_a_frente} min={1} max={90} passo={7} aoMudar={(v) => setCfg({ ...cfg, dias_a_frente: v })} />
                    <Contador rotulo="Máximo de pessoas por reserva" valor={cfg.max_pessoas} min={1} max={50} aoMudar={(v) => setCfg({ ...cfg, max_pessoas: v })} />
                  </>
                )}
              </View>
              <Campo rotulo="Chamada do botão" valor={cfg.chamada} aoMudar={(v) => setCfg({ ...cfg, chamada: v })} max={80} dica='Ex.: "Faça sua reserva" ou "Garanta sua mesa"' />
              {cfg.modo === 'app' && (
                <Campo rotulo="Aviso para o cliente (opcional)" valor={cfg.aviso} aoMudar={(v) => setCfg({ ...cfg, aviso: v })} max={280} linhas dica="Ex.: Tolerância de 15 minutos. Mesas para aniversário com 2 dias de antecedência." />
              )}
            </>
          )}

          <TouchableOpacity style={[r.salvar, salvando && { opacity: 0.6 }]} onPress={salvarConfig} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={r.salvarTxt}>{cfg.modo === 'desligado' ? 'Salvar' : 'Salvar e ligar reservas'}</Text>}
          </TouchableOpacity>
          {salvoModo === 'app' && (
            <TouchableOpacity style={r.verQuiz} onPress={() => router.push(`/reserva/${localId}` as any)}>
              <Feather name="eye" size={15} color={CP.rosa} />
              <Text style={r.verQuizTxt}>Ver o quiz como o cliente vê</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <EditorArea area={editando} aoFechar={() => setEditando(null)} aoSalvar={salvarArea} aoApagar={apagarArea} />
    </TelaParceiro>
  );
}

function Campo({ rotulo, valor, aoMudar, dica, max, linhas, teclado }: {
  rotulo: string; valor: string; aoMudar: (v: string) => void; dica?: string; max?: number; linhas?: boolean; teclado?: 'phone-pad' | 'default';
}) {
  return (
    <View style={{ marginTop: ESP.m }}>
      <Text style={r.rotulo}>{rotulo}</Text>
      <TextInput
        style={[r.input, linhas && { minHeight: 76, textAlignVertical: 'top', paddingTop: 10 }]} value={valor} onChangeText={aoMudar}
        maxLength={max} multiline={linhas} keyboardType={teclado} placeholderTextColor={CP.fraco}
      />
      {!!dica && <Text style={r.dica}>{dica}{max ? `  ·  ${valor.length}/${max}` : ''}</Text>}
    </View>
  );
}

function Contador({ rotulo, valor, aoMudar, min, max, passo = 1, sufixo = '' }: {
  rotulo: string; valor: number; aoMudar: (v: number) => void; min: number; max: number; passo?: number; sufixo?: string;
}) {
  return (
    <View style={r.contador}>
      <Text style={[r.rotulo, { flex: 1, marginBottom: 0 }]}>{rotulo}</Text>
      <TouchableOpacity style={r.mm} onPress={() => aoMudar(Math.max(min, valor - passo))}><Feather name="minus" size={16} color={CP.texto} /></TouchableOpacity>
      <Text style={r.contaValor}>{valor}{sufixo}</Text>
      <TouchableOpacity style={r.mm} onPress={() => aoMudar(Math.min(max, valor + passo))}><Feather name="plus" size={16} color={CP.texto} /></TouchableOpacity>
    </View>
  );
}

function EditorArea({ area, aoFechar, aoSalvar, aoApagar }: { area: Area | null; aoFechar: () => void; aoSalvar: (a: Area) => void; aoApagar: (a: Area) => void }) {
  const [a, setA] = useState<Area | null>(area);
  useEffect(() => setA(area), [area]);
  if (!a) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={aoFechar}>
      <View style={r.fundo}>
        <View style={r.folha}>
          <View style={r.folhaTopo}>
            <Text style={r.folhaTitulo}>{a.id ? 'Editar área' : 'Nova área'}</Text>
            <TouchableOpacity onPress={aoFechar} accessibilityLabel="Fechar"><Feather name="x" size={22} color={CP.texto} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
            <Campo rotulo="Nome" valor={a.nome} aoMudar={(v) => setA({ ...a, nome: v })} max={40} dica="Ex.: Rooftop, Primeiro andar, Sacada superior" />
            <Campo rotulo="Como é" valor={a.descricao} aoMudar={(v) => setA({ ...a, descricao: v })} max={160} linhas dica="Ex.: Mais calmo, com mesas e cadeiras" />
            <Campo rotulo="Tipo de mesa (opcional)" valor={a.tipo_mesa} aoMudar={(v) => setA({ ...a, tipo_mesa: v })} max={40} dica="Ex.: Mesa bistrô, sofá, bancada" />
            <Text style={[r.rotulo, { marginTop: ESP.m }]}>Indicado para</Text>
            <View style={r.chips}>
              {INDICADO.map((x) => {
                const on = a.indicado_para.includes(x.id);
                return (
                  <TouchableOpacity key={x.id} style={[r.chip, on && r.chipOn]} onPress={() => setA({ ...a, indicado_para: on ? a.indicado_para.filter((y) => y !== x.id) : [...a.indicado_para, x.id] })}>
                    <Text style={[r.chipTxt, on && { color: '#FFF' }]}>{x.rotulo}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: ESP.s }}>
              <View style={{ flex: 1 }}><Campo rotulo="Primeira chegada" valor={a.hora_inicio} aoMudar={(v) => setA({ ...a, hora_inicio: v })} max={5} /></View>
              <View style={{ flex: 1 }}><Campo rotulo="Reserva até" valor={a.hora_limite} aoMudar={(v) => setA({ ...a, hora_limite: v })} max={5} /></View>
            </View>
            <View style={[r.caixa, { marginTop: ESP.m }]}>
              <Contador rotulo="Mínimo de pessoas" valor={a.min_pessoas} min={1} max={30} aoMudar={(v) => setA({ ...a, min_pessoas: v })} />
              <Contador rotulo="Máximo de pessoas (0 = regra geral)" valor={a.max_pessoas ?? 0} min={0} max={50} aoMudar={(v) => setA({ ...a, max_pessoas: v === 0 ? null : Math.max(v, a.min_pessoas) })} />
              <View style={r.contador}>
                <Text style={[r.rotulo, { flex: 1, marginBottom: 0 }]}>Aceitando reservas</Text>
                <Switch value={a.ativo} onValueChange={(v) => setA({ ...a, ativo: v })} trackColor={{ true: CP.rosa }} />
              </View>
            </View>
            <TouchableOpacity style={r.salvar} onPress={() => aoSalvar(a)}><Text style={r.salvarTxt}>Salvar área</Text></TouchableOpacity>
            {!!a.id && <TouchableOpacity style={r.apagar} onPress={() => aoApagar(a)}><Text style={r.apagarTxt}>Apagar área</Text></TouchableOpacity>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const r = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: 14, marginTop: ESP.l },
  modo: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, minHeight: 64 },
  modoAtivo: { borderColor: CP.rosa, backgroundColor: '#E1306C14' },
  modoIcone: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#2A2938', alignItems: 'center', justifyContent: 'center' },
  modoTitulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  modoSub: { color: CP.dim, fontSize: 12, marginTop: 1, lineHeight: 16 },
  caixa: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  rotulo: { color: CP.secao, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#0F0E15', borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, paddingHorizontal: 12, minHeight: 46, color: CP.texto, fontSize: 15 },
  dica: { color: CP.fraco, fontSize: 11, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: CP.borda, backgroundColor: '#0F0E15', paddingHorizontal: 12, height: 34, justifyContent: 'center' },
  chipOn: { backgroundColor: CP.rosa, borderColor: CP.rosa },
  chipTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  contador: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, marginTop: ESP.m },
  mm: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2A2938', alignItems: 'center', justifyContent: 'center' },
  contaValor: { color: CP.texto, fontSize: 15, fontWeight: '800', minWidth: 56, textAlign: 'center' },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: ESP.l, borderRadius: RAIO.m, borderWidth: 1, borderColor: CP.borda, backgroundColor: CP.card, padding: ESP.m },
  estadoTxt: { flex: 1, color: CP.texto, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  quizIntro: { color: CP.dim, fontSize: 13, lineHeight: 19, marginBottom: ESP.s },
  modelo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4B5BD6', borderRadius: RAIO.s, padding: 12, marginTop: ESP.s },
  modeloTxt: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '700' },
  depois: { marginTop: ESP.m, borderLeftWidth: 3, borderLeftColor: '#3A3950', paddingLeft: 10, gap: 3 },
  depoisTitulo: { color: CP.secao, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  depoisItem: { color: CP.dim, fontSize: 12 },
  verQuiz: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: ESP.m, padding: 8 },
  verQuizTxt: { color: CP.rosa, fontSize: 13, fontWeight: '800' },
  add: { color: CP.rosa, fontSize: 12, fontWeight: '800' },
  vazio: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RAIO.m, borderWidth: 1, borderStyle: 'dashed', borderColor: CP.rosa, padding: 14 },
  vazioTxt: { flex: 1, color: CP.dim, fontSize: 13, lineHeight: 18 },
  lista: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, paddingHorizontal: ESP.m, paddingVertical: 10, minHeight: 60 },
  borda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  areaNome: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  areaSub: { color: CP.dim, fontSize: 12, marginTop: 2, lineHeight: 16 },
  salvar: { backgroundColor: CP.rosa, borderRadius: RAIO.s, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: ESP.xl },
  salvarTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  apagar: { alignItems: 'center', marginTop: ESP.m, padding: 8 },
  apagarTxt: { color: '#FF7A7A', fontSize: 13, fontWeight: '700' },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: ESP.l, maxHeight: '90%' },
  folhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  folhaTitulo: { color: CP.texto, fontSize: 18, fontWeight: '800' },
});
