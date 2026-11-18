// Modo equipe — Pulso LGBT+ (migração 144): retrato mensal da noite LGBT+ (Brasil ou cidade), só números somados.
// "Publicar link" congela o mês e gera uma página para marcas, agências e imprensa.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { URL_PORTAL } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

type Pulso = { status: string; mes: string; pessoas: number | string; crescimento_pct: number | null; casas_com_movimento: number; idade_pct: Record<string, number | null>;
  dias_pct: { dia: number; pct: number }[]; pico_hora: number | null; categorias_pct: { categoria: string; pct: number }[]; bairros: { bairro: string; pessoas: number | string }[] | null;
  gostos_musica: { valor: string; pct: number }[]; gostos_experiencia: { valor: string; pct: number }[]; ingressos: { vendidos: number | string; preco_medio_centavos: number | null } };
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const mesDe = (deslocar: number) => { const d = new Date(Date.now() - 3 * 3600e3); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + deslocar); return d.toISOString().slice(0, 10); };
const nomeMes = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function PulsoAdm() {
  const [mes, setMes] = useState(mesDe(0));
  const [cidades, setCidades] = useState<string[]>([]);
  const [cidade, setCidade] = useState<string | null>(null);
  const [p, setP] = useState<Pulso | null>(null);
  const [erro, setErro] = useState('');
  const [publicando, setPublicando] = useState(false);

  useEffect(() => {
    supabase.from('locais').select('cidade').eq('status', 'aprovado').limit(2000).then(({ data }) => {
      setCidades(Array.from(new Set(((data as { cidade: string }[]) || []).map((x) => x.cidade).filter(Boolean))).sort());
    }, () => {});
  }, []);
  const carregar = useCallback(async () => {
    setP(null); setErro('');
    const { data, error } = await supabase.rpc('pulso_lgbt', { p_mes: mes, p_cidade: cidade });
    if (error) setErro(error.message.includes('pulso_lgbt') ? 'Rode a migração 144 no Supabase.' : error.message); else setP(data as Pulso);
  }, [mes, cidade]);
  useEffect(() => { void carregar(); }, [carregar]);

  const publicar = async () => {
    setPublicando(true);
    const { data, error } = await supabase.rpc('publicar_pulso', { p_mes: mes, p_cidade: cidade });
    setPublicando(false);
    if (error) return Alert.alert('Pulso', error.message);
    await Share.share({ message: `Pulso LGBT+ · ${nomeMes(mes)}${cidade ? ` · ${cidade}` : ''}\n${URL_PORTAL}/pulso/${data}` });
  };

  const barra = (r: string, pct: number | null | undefined) => (
    <View key={r} style={st.barraLinha}>
      <Text style={st.barraRot}>{r}</Text>
      <View style={st.trilho}><View style={[st.barra, { width: `${Math.max(2, pct || 0)}%` }]} /></View>
      <Text style={st.barraVal}>{pct ?? '–'}%</Text>
    </View>
  );

  return (
    <TelaAdm titulo="Pulso LGBT+" subtitulo="Retrato do mês para marcas, agências e imprensa. Só números somados." voltar aoAtualizar={carregar}>
      <View style={st.chips}>
        {[0, -1, -2].map((d) => (
          <TouchableOpacity key={d} style={[st.chip, mes === mesDe(d) && st.chipOn]} onPress={() => setMes(mesDe(d))}>
            <Text style={[st.chipTxt, mes === mesDe(d) && { color: '#000' }]}>{nomeMes(mesDe(d))}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
        {[null, ...cidades].map((c) => (
          <TouchableOpacity key={c || 'br'} style={[st.chip, cidade === c && st.chipOn]} onPress={() => setCidade(c)}>
            <Text style={[st.chipTxt, cidade === c && { color: '#000' }]}>{c || 'Brasil'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {!!erro && <Text style={sa.sub}>{erro}</Text>}
      {!p && !erro ? <ActivityIndicator color={CA.rosa} /> : p && (p.status !== 'ok' ? (
        <Text style={sa.sub}>Poucos dados neste recorte ({String(p.pessoas)} pessoas). O Pulso precisa de 100 ou mais.</Text>
      ) : (
        <>
          <View style={st.grade}>
            {[['Pessoas ativas', String(p.pessoas)], ['vs mês anterior', p.crescimento_pct == null ? '–' : `${p.crescimento_pct > 0 ? '+' : ''}${p.crescimento_pct}%`],
              ['Casas com movimento', String(p.casas_com_movimento)], ['Pico de chegada', p.pico_hora == null ? '–' : `${p.pico_hora}h`]].map(([r, v]) => (
              <View key={r} style={st.caixa}><Text style={st.valor}>{v}</Text><Text style={sa.sub}>{r}</Text></View>
            ))}
          </View>
          <Text style={sa.secao}>IDADE</Text>
          <View style={sa.card}>{Object.entries(p.idade_pct).map(([f, v]) => barra(f, v))}</View>
          <Text style={sa.secao}>DIAS DA SEMANA</Text>
          <View style={sa.card}>{p.dias_pct.map((d) => barra(DIAS[d.dia], d.pct))}</View>
          {p.categorias_pct.length > 0 && <><Text style={sa.secao}>TIPO DE CASA</Text><View style={sa.card}>{p.categorias_pct.map((c) => barra(c.categoria, c.pct))}</View></>}
          {!!p.bairros?.length && <><Text style={sa.secao}>BAIRROS MAIS MOVIMENTADOS</Text><View style={sa.card}>{p.bairros.map((b) => <Text key={b.bairro} style={sa.tit}>{b.bairro} · {String(b.pessoas)} pessoas</Text>)}</View></>}
          {p.gostos_musica.length > 0 && <><Text style={sa.secao}>MÚSICA</Text><View style={sa.card}>{p.gostos_musica.map((g) => barra(g.valor, g.pct))}</View></>}
          {p.gostos_experiencia.length > 0 && <><Text style={sa.secao}>TIPO DE ROLÊ</Text><View style={sa.card}>{p.gostos_experiencia.map((g) => barra(g.valor, g.pct))}</View></>}
          <Text style={sa.secao}>INGRESSOS</Text>
          <View style={sa.card}><Text style={sa.tit}>{String(p.ingressos.vendidos)} vendidos{p.ingressos.preco_medio_centavos ? ` · ingresso médio ${(p.ingressos.preco_medio_centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}</Text></View>
          <TouchableOpacity style={st.botao} onPress={publicar} disabled={publicando}><Text style={st.botaoTxt}>{publicando ? 'Publicando…' : 'Publicar link para marcas'}</Text></TouchableOpacity>
          <Text style={[sa.sub, { textAlign: 'center', marginTop: 6 }]}>O link mostra este retrato congelado. Grupos com menos de 10 pessoas não aparecem.</Text>
        </>
      ))}
    </TelaAdm>
  );
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipTxt: { color: CA.texto, fontSize: 12.5, fontWeight: '700', textTransform: 'capitalize' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  caixa: { width: '48.5%', backgroundColor: CA.card, borderWidth: 1, borderColor: CA.borda, borderRadius: 14, padding: 12 },
  valor: { color: CA.texto, fontSize: 20, fontWeight: '900' },
  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 3 },
  barraRot: { color: CA.texto, fontSize: 12.5, width: 92 },
  trilho: { flex: 1, height: 8, backgroundColor: '#232230', borderRadius: 4 },
  barra: { height: 8, backgroundColor: CA.rosa, borderRadius: 4 },
  barraVal: { color: CA.dim, fontSize: 12, width: 40, textAlign: 'right' },
  botao: { backgroundColor: CA.rosa, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
