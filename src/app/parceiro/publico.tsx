// Modo parceiro — Seu público (Fidelizar › Seu público). Relatório de público da migração 114.
// Só números somados e anônimos: pessoas únicas, novas x recorrentes, idade, chegada por hora e dia, gostos,
// identidade de gênero (só de quem autorizou), check-ins, Lista VIP, cupons usados e "Eu vou".
// Premium e Fundador (plano efetivo) com a permissão 'resultados'; nos demais planos, cadeado e "Falar com a equipe".
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Chips } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import { falarComEquipe, nivelDoPlano } from '../../lib/parceiroMenu';
import { Acao, ACOES, DIAS_CURTOS, diaBrasilia, Grupo, IDADES, Num, porcento, relatorio, Relatorio, texto, valorBarra } from '../../lib/parceiro/publico';
import { supabase } from '../../lib/supabase';

type Periodo = '30' | '90' | '365' | 'festa';
type FestaPassada = { id: string; titulo: string; data_inicio: string };
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });

function Barras({ linhas }: { linhas: { rotulo: string; n: Num | undefined; extra?: string }[] }) {
  const max = Math.max(1, ...linhas.map((l) => valorBarra(l.n)));
  return (
    <View style={{ gap: ESP.s }}>
      {linhas.map((l) => (
        <View key={l.rotulo} style={a.barraLinha}>
          <Text style={a.barraRotulo} numberOfLines={1}>{l.rotulo}</Text>
          <View style={a.barraTrilho}>
            <View style={[a.barra, { width: `${Math.max(4, (valorBarra(l.n) / max) * 100)}%` }, typeof l.n !== 'number' && a.barraFraca]} />
          </View>
          <Text style={a.barraValor}>{texto(l.n)}{l.extra ? ` · ${l.extra}` : ''}</Text>
        </View>
      ))}
    </View>
  );
}

function Colunas({ itens }: { itens: { rotulo: string; n: Num }[] }) {
  const max = Math.max(1, ...itens.map((i) => valorBarra(i.n)));
  return (
    <View style={a.colunas}>
      {itens.map((i, k) => (
        <View key={k} style={a.coluna}>
          <View style={a.colunaTrilho}>
            <View style={[a.colunaBarra, { height: `${Math.max(3, (valorBarra(i.n) / max) * 100)}%` }, typeof i.n !== 'number' && a.barraFraca]} />
          </View>
          <Text style={a.colunaRotulo}>{i.rotulo}</Text>
        </View>
      ))}
    </View>
  );
}

function Lista({ grupos, vazio }: { grupos: Grupo[] | undefined; vazio: string }) {
  if (!grupos?.length) return <Text style={a.vazio}>{vazio}</Text>;
  return <Barras linhas={grupos.map((g) => ({ rotulo: g.valor, n: g.n }))} />;
}

export default function SeuPublico() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const liberado = !!localAtivo && pode('resultados');
  const premium = !!localAtivo && nivelDoPlano(localAtivo.plano_comercial) === 'premium';
  const temFestas = !!localAtivo && recursosDaCategoria(localAtivo.categoria).eventos;

  // 139 — vindo de Ingressos › "Ver o público desta festa" (?festa=<id>) já abre o relatório da festa
  const { festa: festaParam } = useLocalSearchParams<{ festa?: string }>();
  const [periodo, setPeriodo] = useState<Periodo>(festaParam ? 'festa' : '90');
  const [festas, setFestas] = useState<FestaPassada[]>([]);
  const [festa, setFesta] = useState<string | null>(festaParam || null);
  const [rel, setRel] = useState<Relatorio | null>(null);
  const [acao, setAcao] = useState<Acao | ''>('');
  // 143 — comparação com as casas da mesma cidade (só por período)
  type Perf = { pessoas: number; idade_pct: Record<string, number | null>; pico_hora: number | null; nota_seguranca: number | null };
  const [comp, setComp] = useState<{ cidade_nome: string; casa: Perf | null; cidade: Perf | null } | null>(null);
  useEffect(() => {
    if (!liberado || !premium || periodo === 'festa' || !localId) { setComp(null); return; }
    supabase.rpc('comparacao_com_cidade', { p_local: localId, p_de: diaBrasilia(-Number(periodo) + 1), p_ate: diaBrasilia() })
      .then(({ data, error }) => setComp(error ? null : (data as any)), () => setComp(null));
  }, [liberado, premium, periodo, localId]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!liberado || !premium || !temFestas) return;
    void (async () => {
      const { data } = await supabase.from('eventos').select('id, titulo, data_inicio').eq('local_id', localId)
        .neq('status', 'cancelado').lt('data_inicio', new Date().toISOString()).order('data_inicio', { ascending: false }).limit(12);
      setFestas((data as FestaPassada[]) || []);
    })();
  }, [liberado, premium, temFestas, localId]);

  const carregar = useCallback(async () => {
    if (!liberado || !premium) return;
    if (periodo === 'festa' && !festa) { setRel(null); return; }
    setCarregando(true);
    setErro('');
    try {
      setRel(await relatorio(localId, periodo === 'festa' ? { evento: festa! } : { de: diaBrasilia(-Number(periodo) + 1), ate: diaBrasilia() }, acao || null));
    } catch (e: any) {
      setRel(null);
      setErro(e?.message || 'Não deu para gerar o relatório.');
    } finally {
      setCarregando(false);
    }
  }, [liberado, premium, periodo, festa, localId, acao]);
  useEffect(() => { void carregar(); }, [carregar]);

  const Voltar = (
    <TouchableOpacity style={a.voltar} onPress={() => router.back()} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
  );

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Seu público">
        {Voltar}
        <Text style={a.aviso}>Seu acesso não inclui os resultados desta casa. Peça ao dono para liberar a permissão de resultados.</Text>
      </TelaParceiro>
    );
  }
  if (!premium) {
    return (
      <TelaParceiro titulo="Seu público" subtitulo="Quem vem na sua casa, em números somados.">
        {Voltar}
        <View style={a.trava}>
          <View style={a.travaIcone}><Feather name="lock" size={18} color="#FFF" /></View>
          <Text style={a.travaTitulo}>Seu público nos planos Premium e Fundador</Text>
          <Text style={a.travaTxt}>Idade, horários de chegada, dias mais fortes, gostos musicais, clientes novos e recorrentes. Tudo somado e anônimo, sem nomes, para planejar a programação e conversar com marcas.</Text>
          <TouchableOpacity style={a.travaBtn} onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero ver o relatório de público no app.`)} accessibilityRole="button">
            <Feather name="message-circle" size={16} color="#FFF" />
            <Text style={a.travaBtnTxt}>Falar com a equipe</Text>
          </TouchableOpacity>
        </View>
      </TelaParceiro>
    );
  }

  const opcoes = [
    { valor: '30', rotulo: '30 dias' }, { valor: '90', rotulo: '90 dias' }, { valor: '365', rotulo: '12 meses' },
    ...(temFestas ? [{ valor: 'festa', rotulo: 'Uma festa' }] : []),
  ];
  const ok = rel?.status === 'ok';
  const t = rel?.totais;

  return (
    <TelaParceiro titulo="Seu público" subtitulo="Números somados e anônimos. Nunca nomes." atualizando={false} aoAtualizar={() => void carregar()}>
      {Voltar}
      <View style={{ marginTop: ESP.s }}>
        {/* 18/11 — visual mais profissional: período em controle segmentado e recorte em pílulas discretas. */}
        <View style={a.seg}>
          {opcoes.map((o) => {
            const on = periodo === o.valor;
            return (
              <TouchableOpacity key={o.valor} style={[a.segItem, on && a.segOn]} onPress={() => setPeriodo(o.valor as Periodo)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[a.segTxt, on && a.segTxtOn]} numberOfLines={1}>{o.rotulo}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* 139 — recorte por ação: o perfil de quem comprou ingresso, respondeu a enquete, reservou… */}
        <Text style={a.rotRecorte}>RECORTE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: ESP.m }}>
          {[{ valor: '', rotulo: 'Todo o público' }, ...ACOES].map((o) => {
            const on = acao === o.valor;
            return (
              <TouchableOpacity key={o.valor || 'todos'} style={[a.filtro, on && a.filtroOn]} onPress={() => setAcao(o.valor as Acao | '')} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[a.filtroTxt, on && a.filtroTxtOn]}>{o.rotulo}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {periodo === 'festa' && (
        <View style={{ marginTop: ESP.s }}>
          {festas.length ? (
            <Chips opcoes={festas.map((f) => ({ valor: f.id, rotulo: `${dataCurta(f.data_inicio)} · ${f.titulo.slice(0, 22)}` }))} valor={festa || ''} aoMudar={(v) => setFesta(v)} />
          ) : (
            <Text style={a.vazio}>Nenhuma festa que já aconteceu.</Text>
          )}
        </View>
      )}

      {carregando ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} />
      ) : erro ? (
        <Text style={a.aviso}>{erro}</Text>
      ) : !rel ? (
        periodo === 'festa' ? <Text style={a.vazio}>Escolha uma festa.</Text> : null
      ) : !ok ? (
        <View style={a.insuf}>
          <View style={a.insufIcone}><Feather name="bar-chart-2" size={18} color={CP.dim} /></View>
          <Text style={a.insufTit}>Dados insuficientes neste período</Text>
          <Text style={a.insufTxt}>O relatório é liberado a partir de {rel.regras?.minimo_pessoas ?? 30} pessoas no período (check-in, Lista VIP, cupom ou "Eu vou"), para garantir o anonimato dos clientes. Selecione um período maior ou outro recorte.</Text>
        </View>
      ) : (
        <>
          <View style={a.numeros}>
            <View style={a.numero}><Text style={a.numeroN}>{texto(rel.pessoas)}</Text><Text style={a.numeroR}>pessoas</Text></View>
            <View style={a.numero}><Text style={[a.numeroN, { color: CP.verde }]}>{texto(rel.novas)}</Text><Text style={a.numeroR}>vieram pela 1ª vez</Text></View>
            <View style={a.numero}><Text style={[a.numeroN, { color: '#B39DDB' }]}>{texto(rel.recorrentes)}</Text><Text style={a.numeroR}>voltaram</Text></View>
          </View>

          <TituloSecao texto="Idade" />
          <Barras linhas={[...IDADES.map((k) => ({ rotulo: k, n: rel.idade?.[k], extra: porcento(rel.idade?.[k], rel.pessoas) })), { rotulo: 'Sem data', n: rel.idade?.sem_info }]} />

          <TituloSecao texto="Que horas chegam" info="Check-ins confirmados e entradas pela Lista VIP, no horário de Brasília." />
          <Colunas itens={(rel.chegada_hora || []).filter((h) => h.hora >= 16 || h.hora <= 5).sort((x, y) => ((x.hora + 8) % 24) - ((y.hora + 8) % 24)).map((h) => ({ rotulo: h.hora % 2 === 0 ? `${h.hora}h` : '', n: h.n }))} />
          <Text style={a.nota}>Das 16h às 5h.</Text>

          <TituloSecao texto="Dias mais fortes" />
          <Colunas itens={(rel.chegada_dia || []).map((d) => ({ rotulo: DIAS_CURTOS[d.dia], n: d.n }))} />

          <TituloSecao texto="Gosto musical" info="De quem preencheu os gostos no app. Só aparecem gostos com 10 pessoas ou mais." />
          <Lista grupos={rel.gostos?.musica} vazio="Ainda poucas respostas." />
          <TituloSecao texto="O que buscam" />
          <Lista grupos={rel.gostos?.experiencia} vazio="Ainda poucas respostas." />

          <TituloSecao texto="Identidade de gênero" info="Só de quem autorizou em Conta, de forma anônima e somada." />
          {rel.genero?.grupos?.length ? <Lista grupos={rel.genero.grupos} vazio="" /> : <Text style={a.vazio}>Ainda poucas pessoas autorizaram.</Text>}
          {!!rel.genero?.outros_ocultos && <Text style={a.nota}>Outras identidades com menos de 10 pessoas ficam de fora.</Text>}

          {comp && (comp.casa || comp.cidade) && (
            <>
              <TituloSecao texto={`Comparado com ${comp.cidade_nome}`} info="Média das outras casas da cidade no mesmo período. Só aparece com 3 casas e 100 pessoas ou mais, para ninguém descobrir o público de outra casa." />
              <View style={a.compCard}>
                <View style={a.compLinha}><Text style={[a.compCol, { flex: 1.4 }]} /><Text style={a.compCab}>Sua casa</Text><Text style={a.compCab}>Cidade</Text></View>
                {IDADES.map((f) => (
                  <View key={f} style={a.compLinha}>
                    <Text style={[a.compCol, { flex: 1.4 }]}>{f} anos</Text>
                    <Text style={a.compVal}>{comp.casa?.idade_pct?.[f] != null ? `${comp.casa.idade_pct[f]}%` : '–'}</Text>
                    <Text style={a.compVal}>{comp.cidade?.idade_pct?.[f] != null ? `${comp.cidade.idade_pct[f]}%` : '–'}</Text>
                  </View>
                ))}
                <View style={a.compLinha}>
                  <Text style={[a.compCol, { flex: 1.4 }]}>Pico de chegada</Text>
                  <Text style={a.compVal}>{comp.casa?.pico_hora != null ? `${comp.casa.pico_hora}h` : '–'}</Text>
                  <Text style={a.compVal}>{comp.cidade?.pico_hora != null ? `${comp.cidade.pico_hora}h` : '–'}</Text>
                </View>
                <View style={a.compLinha}>
                  <Text style={[a.compCol, { flex: 1.4 }]}>Nota de segurança</Text>
                  <Text style={a.compVal}>{comp.casa?.nota_seguranca ?? '–'}</Text>
                  <Text style={a.compVal}>{comp.cidade?.nota_seguranca ?? '–'}</Text>
                </View>
                {!comp.cidade && <Text style={a.nota}>A média da cidade aparece quando houver pelo menos 3 casas e 100 pessoas no período.</Text>}
              </View>
            </>
          )}

          <TituloSecao texto="Movimento" />
          <View style={a.grade}>
            {[
              ['Check-ins', t?.checkins], ['Pedidos na Lista VIP', t?.lista_pedidos], ['Aprovados na lista', t?.lista_aprovados],
              ['Entraram pela lista', t?.lista_entraram], ['Cupons usados', t?.cupons_usados], ['Marcaram "Eu vou"', t?.eu_vou],
              // 139 — ingressos (por ingresso) e "Estou aqui agora" do Termômetro
              ...(t?.ingressos_vendidos !== undefined ? [['Ingressos vendidos', t.ingressos_vendidos], ['Entraram com ingresso', t.ingressos_entraram]] : []),
              ...(t?.estou_aqui !== undefined ? [['"Estou aqui agora"', t.estou_aqui]] : []),
              ...(t?.enquetes_respondidas !== undefined ? [['Responderam enquete', t.enquetes_respondidas], ['Reservas', t.reservas], ['Vieram na reserva', t.reservas_vieram]] : []),
            ].map(([r, n]) => (
              <View key={r as string} style={a.gradeItem}><Text style={a.gradeN}>{texto(n as Num)}</Text><Text style={a.gradeR}>{r as string}</Text></View>
            ))}
          </View>
        </>
      )}

      <Text style={[a.nota, { marginTop: ESP.xl }]}>
        Como protegemos: com menos de 30 pessoas no período, nada aparece. Grupos com menos de 10 pessoas viram "menos de 10" e os outros números são arredondados de 5 em 5. Nunca mostramos nomes.
      </Text>
    </TelaParceiro>
  );
}

const a = StyleSheet.create({
  compCard: { backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m, padding: ESP.m, gap: 8 },
  compLinha: { flexDirection: 'row', alignItems: 'center' },
  compCab: { flex: 1, color: CP.dim, fontSize: 11.5, fontWeight: '800', textAlign: 'right' },
  compCol: { color: CP.texto, fontSize: 13 },
  compVal: { flex: 1, color: CP.texto, fontSize: 13.5, fontWeight: '800', textAlign: 'right' },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  vazio: { color: CP.fraco, fontSize: 13, marginTop: ESP.s },
  nota: { color: CP.fraco, fontSize: 11, lineHeight: 16, marginTop: ESP.s },
  trava: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.l, marginTop: ESP.l, gap: ESP.s },
  travaIcone: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3A3950', alignItems: 'center', justifyContent: 'center' },
  travaTitulo: { color: CP.texto, fontSize: 16, fontWeight: '800' },
  travaTxt: { color: CP.dim, fontSize: 13, lineHeight: 19 },
  travaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CP.rosa, borderRadius: RAIO.s, minHeight: 48, marginTop: ESP.s },
  travaBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  seg: { flexDirection: 'row', backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: 12, padding: 3, marginTop: ESP.s },
  segItem: { flex: 1, minHeight: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segOn: { backgroundColor: '#2A2838' },
  segTxt: { color: CP.dim, fontSize: 12.5, fontWeight: '700' },
  segTxtOn: { color: CP.texto },
  rotRecorte: { color: CP.fraco, fontSize: 10.5, fontWeight: '800', letterSpacing: 1, marginTop: ESP.m, marginBottom: 6 },
  filtro: { borderWidth: 1, borderColor: CP.borda, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  filtroOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  filtroTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  filtroTxtOn: { color: '#0B0B0E' },
  insufIcone: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22202E', alignItems: 'center', justifyContent: 'center' },
  insuf: { alignItems: 'center', gap: ESP.s, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.l, marginTop: ESP.l },
  insufTit: { color: CP.texto, fontSize: 15, fontWeight: '800' },
  insufTxt: { color: CP.dim, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  numeros: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.l },
  numero: { flex: 1, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, paddingVertical: ESP.m, paddingHorizontal: ESP.s, alignItems: 'center' },
  numeroN: { color: CP.texto, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  numeroR: { color: CP.fraco, fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: ESP.s },
  barraRotulo: { color: CP.dim, fontSize: 12, width: 92 },
  barraTrilho: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#232230', overflow: 'hidden' },
  barra: { height: 10, borderRadius: 5, backgroundColor: CP.rosa },
  barraFraca: { opacity: 0.35 },
  barraValor: { color: CP.texto, fontSize: 12, fontWeight: '700', minWidth: 76, textAlign: 'right' },
  colunas: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 110 },
  coluna: { flex: 1, alignItems: 'center', height: '100%' },
  colunaTrilho: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  colunaBarra: { width: '100%', borderRadius: 3, backgroundColor: '#7E57C2' },
  colunaRotulo: { color: CP.fraco, fontSize: 9, marginTop: 4, height: 12 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s },
  gradeItem: { width: '48%', flexGrow: 1, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, padding: ESP.m },
  gradeN: { color: CP.texto, fontSize: 17, fontWeight: '900' },
  gradeR: { color: CP.fraco, fontSize: 11, fontWeight: '700', marginTop: 2 },
});
