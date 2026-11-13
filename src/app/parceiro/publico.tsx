// Modo parceiro — Seu público (Fidelizar › Seu público). Relatório de público da migração 114.
// Só números somados e anônimos: pessoas únicas, novas x recorrentes, idade, chegada por hora e dia, gostos,
// identidade de gênero (só de quem autorizou), check-ins, Lista VIP, cupons usados e "Eu vou".
// Premium e Fundador (plano efetivo) com a permissão 'resultados'; nos demais planos, cadeado e "Falar com a equipe".
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Chips } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import { falarComEquipe, nivelDoPlano } from '../../lib/parceiroMenu';
import { DIAS_CURTOS, diaBrasilia, Grupo, IDADES, Num, porcento, relatorio, Relatorio, texto, valorBarra } from '../../lib/parceiro/publico';
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

  const [periodo, setPeriodo] = useState<Periodo>('90');
  const [festas, setFestas] = useState<FestaPassada[]>([]);
  const [festa, setFesta] = useState<string | null>(null);
  const [rel, setRel] = useState<Relatorio | null>(null);
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
      setRel(await relatorio(localId, periodo === 'festa' ? { evento: festa! } : { de: diaBrasilia(-Number(periodo) + 1), ate: diaBrasilia() }));
    } catch (e: any) {
      setRel(null);
      setErro(e?.message || 'Não deu para gerar o relatório.');
    } finally {
      setCarregando(false);
    }
  }, [liberado, premium, periodo, festa, localId]);
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
        <Chips preencher opcoes={opcoes} valor={periodo} aoMudar={(v) => setPeriodo(v as Periodo)} />
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
          <Feather name="shield" size={20} color={CP.dim} />
          <Text style={a.insufTit}>Ainda não dá para mostrar</Text>
          <Text style={a.insufTxt}>Para proteger cada cliente, o relatório só aparece com pelo menos {rel.regras?.minimo_pessoas ?? 30} pessoas no período (check-in, Lista VIP, cupom ou "Eu vou"). Tente um período maior.</Text>
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

          <TituloSecao texto="Movimento" />
          <View style={a.grade}>
            {[
              ['Check-ins', t?.checkins], ['Pedidos na Lista VIP', t?.lista_pedidos], ['Aprovados na lista', t?.lista_aprovados],
              ['Entraram pela lista', t?.lista_entraram], ['Cupons usados', t?.cupons_usados], ['Marcaram "Eu vou"', t?.eu_vou],
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
