// Modo parceiro — Enquete com prêmio (Divulgar › Enquete com prêmio). Migração 129.
// "Responda e ganhe 1 drink": a casa pergunta o que quer saber do público (até 5 perguntas) e dá um prêmio.
// O cliente responde no app (pode ser de casa) e pega o prêmio NA CASA ("Estou aqui"), mostrando a tela no balcão.
// O público vê só quanto resta. A casa vê as respostas somadas, sem nomes. Premium e Fundador.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarraSalvar, Campo, CampoData, Chips } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../lib/modoParceiro';
import { falarComEquipe, nivelDoPlano } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

const VERDE = '#34D399';
type TipoQ = 'escolha' | 'nota' | 'aberta';
type PerguntaForm = { texto: string; tipo: TipoQ; opcoes: string };
type Enquete = { id: string; titulo: string; premio: string; regra: string | null; perguntas: { id: string; texto: string; tipo: TipoQ; opcoes?: string[] }[]; limite_total: number | null; inicio: string; fim: string; ativa: boolean };
type Resultado = { responderam: number; premios: number; perguntas: { id: string; texto: string; tipo: TipoQ; responderam: number; opcoes?: { valor: string; n: number }[]; media?: number | null; textos?: string[] | null }[] };

const TIPOS_Q = [{ valor: 'escolha', rotulo: 'Opções' }, { valor: 'nota', rotulo: 'Nota 0 a 10' }, { valor: 'aberta', rotulo: 'Texto livre' }];
const VAZIA_Q: PerguntaForm = { texto: '', tipo: 'escolha', opcoes: '' };
// Modelos prontos: o que um bar costuma querer saber.
const MODELOS: { nome: string; perguntas: PerguntaForm[] }[] = [
  { nome: 'Sobre a casa', perguntas: [
    { texto: 'De 0 a 10, quanto você indicaria a casa para um amigo?', tipo: 'nota', opcoes: '' },
    { texto: 'O que te trouxe hoje?', tipo: 'escolha', opcoes: 'Os drinks, A música, Os amigos, A festa, O preço' },
    { texto: 'O que a gente pode melhorar?', tipo: 'aberta', opcoes: '' },
  ] },
  { nome: 'Programação', perguntas: [
    { texto: 'Que noite você mais gostaria de ter aqui?', tipo: 'escolha', opcoes: 'Karaokê, Drag show, Pagode, Pop, Eletrônica, Sertanejo' },
    { texto: 'Qual o melhor dia para você vir?', tipo: 'escolha', opcoes: 'Quarta, Quinta, Sexta, Sábado, Domingo' },
    { texto: 'Que artista ou DJ você quer ver aqui?', tipo: 'aberta', opcoes: '' },
  ] },
  { nome: 'Cardápio', perguntas: [
    { texto: 'De 0 a 10, quanto você gostou do drink de hoje?', tipo: 'nota', opcoes: '' },
    { texto: 'O que você mais pede aqui?', tipo: 'escolha', opcoes: 'Cerveja, Drinks, Caipirinha, Sem álcool, Petiscos' },
    { texto: 'Que drink ou prato você quer no cardápio?', tipo: 'aberta', opcoes: '' },
  ] },
];
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const br = (d: string) => d.slice(0, 10).split('-').reverse().slice(0, 2).join('/');

export default function EnquetesDaCasa() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const podeEditar = pode('cupons');
  const premium = !!localAtivo && nivelDoPlano(localAtivo.plano_comercial) === 'premium';

  const [lista, setLista] = useState<Enquete[] | null>(null);
  const [sel, setSel] = useState<Enquete | null>(null);
  const [res, setRes] = useState<Resultado | null>(null);
  const [nova, setNova] = useState<{ titulo: string; premio: string; regra: string; limite: string; inicio: string; fim: string } | null>(null);
  const [perguntas, setPerguntas] = useState<PerguntaForm[]>([{ ...VAZIA_Q }]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!localId) return;
    const { data, error } = await (supabase.from('enquetes_casa') as any)
      .select('id, titulo, premio, regra, perguntas, limite_total, inicio, fim, ativa').eq('local_id', localId).order('created_at', { ascending: false });
    setLista(error ? [] : (data as Enquete[]) || []);
  }, [localId]);
  useEffect(() => { if (premium) void carregar(); }, [carregar, premium]);

  useEffect(() => {
    if (!sel) return setRes(null);
    let vivo = true;
    const ler = () => supabase.rpc('resultado_enquete_casa', { p_enquete: sel.id }).then(({ data }) => { if (vivo && data) setRes(data as Resultado); }, () => {});
    void ler();
    const t = setInterval(() => { void ler(); }, 30 * 1000);
    return () => { vivo = false; clearInterval(t); };
  }, [sel?.id]);

  const Voltar = (
    <TouchableOpacity style={e.voltar} onPress={() => (nova ? setNova(null) : sel ? setSel(null) : router.back())} accessibilityRole="button">
      <Feather name="chevron-left" size={16} color={CP.dim} /><Text style={e.voltarTxt}>Voltar</Text>
    </TouchableOpacity>
  );

  if (!localAtivo) return <TelaParceiro titulo="Enquete com prêmio"><ActivityIndicator color={CP.rosa} /></TelaParceiro>;

  // Plano sem acesso: explica e chama a equipe.
  if (!premium) {
    return (
      <TelaParceiro titulo="Enquete com prêmio" subtitulo="Responda e ganhe: o público conta o que pensa da sua casa.">
        {Voltar}
        <View style={e.card}>
          <Text style={e.tag}>COMO FUNCIONA</Text>
          {[
            ['message-square', 'Você pergunta o que quer saber', 'Até 5 perguntas: nota de 0 a 10, opções ou texto. Tem modelos prontos.'],
            ['gift', 'Quem responde ganha um prêmio', 'Ex.: 1 drink. O prêmio só sai na casa: a pessoa toca em "Estou aqui" e mostra a tela no balcão.'],
            ['bar-chart-2', 'Você vê o resultado', 'Respostas somadas, sem nomes. O público vê só quanto ainda resta.'],
          ].map(([i, t, x]) => (
            <View key={t} style={e.passo}>
              <View style={e.passoIcone}><Feather name={i as any} size={15} color={VERDE} /></View>
              <View style={{ flex: 1 }}><Text style={e.itemTit}>{t}</Text><Text style={e.itemSub}>{x}</Text></View>
            </View>
          ))}
          <Text style={e.itemSub}>Incluída nos planos Premium e Fundador.</Text>
          <TouchableOpacity style={e.botao} onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero fazer uma enquete com prêmio no app.`)} accessibilityRole="button">
            <Feather name="message-circle" size={16} color="#0B0B0E" /><Text style={e.botaoTxt}>Falar com a equipe</Text>
          </TouchableOpacity>
        </View>
      </TelaParceiro>
    );
  }

  async function criar() {
    if (!nova) return;
    if (nova.titulo.trim().length < 3) return Alert.alert('Enquete', 'Dê um título (ex.: Conta pra gente!).');
    if (nova.premio.trim().length < 2) return Alert.alert('Enquete', 'Diga o prêmio (ex.: 1 caipirinha).');
    if (!nova.fim || nova.fim < nova.inicio) return Alert.alert('Enquete', 'Escolha até quando vale.');
    const montadas: { id: string; texto: string; tipo: TipoQ; opcoes?: string[] }[] = [];
    for (const [i, q] of perguntas.entries()) {
      if (!q.texto.trim()) continue;
      const ops = q.opcoes.split(',').map((o) => o.trim()).filter(Boolean);
      if (q.tipo === 'escolha' && (ops.length < 2 || ops.length > 6)) return Alert.alert('Enquete', `Pergunta ${i + 1}: coloque de 2 a 6 opções, separadas por vírgula.`);
      montadas.push({ id: `p${i + 1}`, texto: q.texto.trim(), tipo: q.tipo, ...(q.tipo === 'escolha' ? { opcoes: ops } : {}) });
    }
    if (!montadas.length) return Alert.alert('Enquete', 'Escreva pelo menos uma pergunta.');
    const limite = nova.limite.trim() ? parseInt(nova.limite, 10) : null;
    setSalvando(true);
    const { data, error } = await (supabase.from('enquetes_casa') as any).insert({
      local_id: localId, titulo: nova.titulo.trim().slice(0, 80), premio: nova.premio.trim().slice(0, 60), regra: nova.regra.trim().slice(0, 120) || null,
      perguntas: montadas, limite_total: limite && limite > 0 ? limite : null, inicio: nova.inicio, fim: nova.fim,
    }).select('id, titulo, premio, regra, perguntas, limite_total, inicio, fim, ativa').single();
    setSalvando(false);
    if (error) return Alert.alert('Enquete', error.message || 'Não deu para criar agora.');
    setNova(null); setPerguntas([{ ...VAZIA_Q }]);
    await carregar();
    setSel(data as Enquete);
  }

  async function encerrar() {
    if (!sel) return;
    Alert.alert('Encerrar a enquete?', 'Ela sai do app na hora. Quem já ganhou o prêmio continua com o vale.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: async () => {
        const { error } = await (supabase.from('enquetes_casa') as any).update({ ativa: false }).eq('id', sel.id);
        if (error) return Alert.alert('Enquete', error.message);
        setSel({ ...sel, ativa: false }); void carregar();
      } },
    ]);
  }

  // Criar
  if (nova) {
    return (
      <TelaParceiro titulo="Nova enquete com prêmio" subtitulo="Quem responde ganha o prêmio na casa.">
        {Voltar}
        <View style={{ gap: ESP.m, marginTop: ESP.s }}>
          <Campo rotulo="Título" valor={nova.titulo} aoMudar={(v) => setNova({ ...nova, titulo: v })} exemplo="Ex.: Conta pra gente!" />
          <Campo rotulo="Prêmio" valor={nova.premio} aoMudar={(v) => setNova({ ...nova, premio: v })} exemplo="Ex.: 1 caipirinha" ajuda="Sai na casa: a pessoa toca em &quot;Estou aqui&quot; e mostra a tela no balcão. Um por pessoa." />
          <Campo rotulo="Para os primeiros (opcional)" valor={nova.limite} aoMudar={(v) => setNova({ ...nova, limite: v.replace(/\D/g, '') })} teclado="number-pad" exemplo="Ex.: 30" ajuda="O público vê só quantos prêmios ainda restam. Em branco: sem limite." />
          <Campo rotulo="Regra (opcional)" valor={nova.regra} aoMudar={(v) => setNova({ ...nova, regra: v })} exemplo="Ex.: Retire até as 22h" />
          <CampoData rotulo="Começa em" valor={nova.inicio} aoMudar={(v) => setNova({ ...nova, inicio: v })} min={hoje()} />
          <CampoData rotulo="Vale até" valor={nova.fim || null} aoMudar={(v) => setNova({ ...nova, fim: v })} min={nova.inicio || hoje()} />

          <View style={e.card}>
            <Text style={e.tag}>PERGUNTAS (ATÉ 5)</Text>
            <View style={e.modelos}>
              {MODELOS.map((m) => (
                <TouchableOpacity key={m.nome} style={e.modelo} onPress={() => setPerguntas(m.perguntas.map((q) => ({ ...q })))} accessibilityRole="button">
                  <Text style={e.modeloTxt}>Modelo: {m.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {perguntas.map((q, i) => (
              <View key={i} style={e.pergunta}>
                <View style={e.perguntaTopo}>
                  <Text style={e.itemTit}>Pergunta {i + 1}</Text>
                  {perguntas.length > 1 && (
                    <TouchableOpacity onPress={() => setPerguntas(perguntas.filter((_, k) => k !== i))} accessibilityRole="button" accessibilityLabel={`Tirar a pergunta ${i + 1}`}>
                      <Feather name="trash-2" size={15} color={CP.dim} />
                    </TouchableOpacity>
                  )}
                </View>
                <Campo rotulo="Texto" valor={q.texto} aoMudar={(v) => setPerguntas(perguntas.map((x, k) => (k === i ? { ...x, texto: v } : x)))} exemplo="Ex.: O que te trouxe hoje?" />
                <Chips rotulo="Tipo de resposta" opcoes={TIPOS_Q as any} valor={q.tipo} aoMudar={(v) => setPerguntas(perguntas.map((x, k) => (k === i ? { ...x, tipo: v as TipoQ } : x)))} />
                {q.tipo === 'escolha' && (
                  <Campo rotulo="Opções (separe por vírgula)" valor={q.opcoes} aoMudar={(v) => setPerguntas(perguntas.map((x, k) => (k === i ? { ...x, opcoes: v } : x)))} exemplo="Ex.: Os drinks, A música, Os amigos" />
                )}
              </View>
            ))}
            {perguntas.length < 5 && (
              <TouchableOpacity style={e.mais} onPress={() => setPerguntas([...perguntas, { ...VAZIA_Q }])} accessibilityRole="button">
                <Feather name="plus" size={14} color={VERDE} /><Text style={e.maisTxt}>Adicionar pergunta</Text>
              </TouchableOpacity>
            )}
          </View>
          <BarraSalvar rotulo="Publicar enquete" salvando={salvando} aoSalvar={() => void criar()} />
        </View>
      </TelaParceiro>
    );
  }

  // Detalhe
  if (sel) {
    const noAr = sel.ativa && sel.inicio <= hoje() && sel.fim >= hoje();
    const restam = sel.limite_total != null && res ? Math.max(sel.limite_total - res.premios, 0) : null;
    return (
      <TelaParceiro titulo={sel.titulo} subtitulo={sel.premio}>
        {Voltar}
        <View style={e.card}>
          <Text style={[e.tag, { color: noAr ? VERDE : CP.dim }]}>{noAr ? 'NO AR' : sel.ativa ? (sel.inicio > hoje() ? 'AGENDADA' : 'TERMINOU') : 'ENCERRADA'}</Text>
          <Text style={e.itemTit}>Prêmio: {sel.premio}</Text>
          <Text style={e.itemSub}>De {br(sel.inicio)} a {br(sel.fim)}{sel.limite_total ? ` · para os primeiros ${sel.limite_total}` : ''}{sel.regra ? ` · ${sel.regra}` : ''}</Text>
          <TouchableOpacity onPress={() => router.push(`/business/${localId}` as any)} accessibilityRole="button"><Text style={e.link}>Ver como aparece no app</Text></TouchableOpacity>
        </View>
        <View style={e.numeros}>
          <View style={e.numero}><Text style={e.numeroN}>{res?.responderam ?? '—'}</Text><Text style={e.numeroR}>responderam</Text></View>
          <View style={e.numero}><Text style={e.numeroN}>{res?.premios ?? '—'}</Text><Text style={e.numeroR}>pegaram o prêmio{restam != null ? ` · restam ${restam}` : ''}</Text></View>
        </View>
        <TituloSecao texto="RESPOSTAS" info="Somadas e sem nomes. Os textos livres aparecem a partir de 5 respostas. Atualiza sozinho a cada 30 segundos." />
        {!res ? <ActivityIndicator color={VERDE} /> : res.perguntas.map((q) => (
          <View key={q.id} style={[e.card, { marginBottom: ESP.s }]}>
            <Text style={e.itemTit}>{q.texto}</Text>
            <Text style={e.itemSub}>{q.responderam} {q.responderam === 1 ? 'resposta' : 'respostas'}</Text>
            {q.tipo === 'escolha' && (q.opcoes || []).map((o) => {
              const pct = q.responderam ? Math.round((100 * o.n) / q.responderam) : 0;
              return (
                <View key={o.valor} style={{ marginTop: ESP.s }}>
                  <View style={e.barraLinha}><Text style={e.barraTxt}>{o.valor}</Text><Text style={e.barraTxt}>{o.n} · {pct}%</Text></View>
                  <View style={e.barraFundo}><View style={[e.barra, { width: `${pct}%` }]} /></View>
                </View>
              );
            })}
            {q.tipo === 'nota' && <Text style={e.media}>{q.media != null ? `Média ${String(q.media).replace('.', ',')}` : '—'}</Text>}
            {q.tipo === 'aberta' && (q.textos ? q.textos.slice(0, 30).map((t, k) => <Text key={k} style={e.texto}>“{t}”</Text>) : <Text style={e.itemSub}>Os textos aparecem a partir de 5 respostas.</Text>)}
          </View>
        ))}
        {podeEditar && sel.ativa && (
          <TouchableOpacity onPress={encerrar} style={e.encerrar} accessibilityRole="button"><Text style={e.encerrarTxt}>Encerrar a enquete</Text></TouchableOpacity>
        )}
      </TelaParceiro>
    );
  }

  // Lista
  return (
    <TelaParceiro titulo="Enquete com prêmio" subtitulo="Responda e ganhe: o público conta o que pensa da sua casa." atualizando={lista === null} aoAtualizar={() => void carregar()}>
      {Voltar}
      {podeEditar && (
        <TouchableOpacity style={e.botao} onPress={() => setNova({ titulo: 'Conta pra gente!', premio: '', regra: '', limite: '', inicio: hoje(), fim: '' })} accessibilityRole="button">
          <Feather name="plus" size={16} color="#0B0B0E" /><Text style={e.botaoTxt}>Nova enquete</Text>
        </TouchableOpacity>
      )}
      {lista === null ? <ActivityIndicator color={VERDE} style={{ marginTop: ESP.l }} /> : lista.length === 0 ? (
        <Text style={[e.itemSub, { marginTop: ESP.l }]}>Nenhuma enquete ainda. Crie a primeira: em poucos minutos você descobre o que o seu público quer.</Text>
      ) : (
        <View style={[e.lista, { marginTop: ESP.l }]}>
          {lista.map((x, i) => {
            const noAr = x.ativa && x.inicio <= hoje() && x.fim >= hoje();
            return (
              <TouchableOpacity key={x.id} style={[e.item, i < lista.length - 1 && e.itemBorda]} onPress={() => setSel(x)} accessibilityRole="button">
                <View style={{ flex: 1 }}>
                  <Text style={e.itemTit} numberOfLines={1}>{x.titulo}</Text>
                  <Text style={e.itemSub}>{x.premio} · até {br(x.fim)}</Text>
                </View>
                <Text style={[e.status, { color: noAr ? VERDE : CP.fraco }]}>{noAr ? 'No ar' : x.ativa ? (x.inicio > hoje() ? 'Agendada' : 'Terminou') : 'Encerrada'}</Text>
                <Feather name="chevron-right" size={16} color={CP.dim} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </TelaParceiro>
  );
}

const e = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: ESP.s, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m, padding: ESP.m, gap: 6 },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: VERDE },
  passo: { flexDirection: 'row', gap: ESP.m, alignItems: 'flex-start', marginTop: ESP.xs },
  passoIcone: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#34D3991F', alignItems: 'center', justifyContent: 'center' },
  itemTit: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  itemSub: { color: CP.dim, fontSize: 12.5, lineHeight: 17 },
  link: { color: CP.rosa, fontSize: 13, fontWeight: '800', marginTop: 4 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: VERDE, borderRadius: 999, minHeight: 46, marginTop: ESP.s },
  botaoTxt: { color: '#0B0B0E', fontSize: 14, fontWeight: '800' },
  modelos: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s },
  modelo: { borderWidth: 1, borderColor: CP.borda, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  modeloTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  pergunta: { borderTopWidth: 1, borderTopColor: CP.borda, paddingTop: ESP.m, marginTop: ESP.s, gap: ESP.s },
  perguntaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mais: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: ESP.s, alignSelf: 'flex-start' },
  maisTxt: { color: VERDE, fontSize: 13, fontWeight: '800' },
  numeros: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.m },
  numero: { flex: 1, backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m, padding: ESP.m },
  numeroN: { color: CP.texto, fontSize: 22, fontWeight: '900' },
  numeroR: { color: CP.dim, fontSize: 12 },
  barraLinha: { flexDirection: 'row', justifyContent: 'space-between' },
  barraTxt: { color: '#D6D3E0', fontSize: 12.5 },
  barraFundo: { height: 6, borderRadius: 3, backgroundColor: '#232230', marginTop: 4, overflow: 'hidden' },
  barra: { height: 6, backgroundColor: VERDE },
  media: { color: VERDE, fontSize: 18, fontWeight: '900', marginTop: 4 },
  texto: { color: '#D6D3E0', fontSize: 13, lineHeight: 18, marginTop: 6 },
  lista: { backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m },
  item: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, padding: ESP.m },
  itemBorda: { borderBottomWidth: 1, borderBottomColor: CP.borda },
  status: { fontSize: 12, fontWeight: '800' },
  encerrar: { alignSelf: 'center', paddingVertical: ESP.l },
  encerrarTxt: { color: '#F87171', fontSize: 14, fontWeight: '800' },
});
