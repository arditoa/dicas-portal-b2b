// Modo parceiro — Curso de acolhimento LGBT+ (migração 143). 5 lições curtas + 5 perguntas. 4 acertos = certificado.
// 3 pessoas certificadas (dono ou equipe) = selo "Equipe treinada" na página da casa.
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../lib/modoParceiro';
import { LICOES, PERGUNTAS } from '../../lib/parceiro/cursoAcolhimento';
import { supabase } from '../../lib/supabase';

type Equipe = { selo: { certificados: number; tem_selo: boolean }; pessoas: { nome: string; em: string }[] };
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

export default function Treinamento() {
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const [passo, setPasso] = useState(-1); // -1 = início; 0..4 lições; 5 = perguntas; 6 = resultado
  const [resp, setResp] = useState<(string | null)[]>(PERGUNTAS.map(() => null));
  const [res, setRes] = useState<{ aprovado: boolean; acertos: number; erradas?: number[]; nome?: string; concluido_em?: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [equipe, setEquipe] = useState<Equipe | null>(null);

  const carregar = useCallback(async () => {
    if (!localId || !(pode('resultados') || localAtivo?.papel === 'dono')) return;
    const { data: d } = await supabase.rpc('treinamento_da_equipe', { p_local: localId });
    setEquipe((d as Equipe) || null);
  }, [localId, localAtivo?.papel]);
  useEffect(() => { void carregar(); }, [carregar]);

  const enviar = async () => {
    if (resp.some((r) => !r)) return Alert.alert('Curso', 'Responda as 5 perguntas.');
    setEnviando(true);
    const { data: d, error } = await supabase.rpc('concluir_treinamento', { p_local: localId, p_respostas: resp });
    setEnviando(false);
    if (error) return Alert.alert('Curso', error.message.includes('concluir_treinamento') ? 'Peça à equipe Dicas para ligar o curso (migração 143).' : error.message);
    setRes(d as any); setPasso(6); void carregar();
  };

  const certificado = () => res?.aprovado && Share.share({
    message: `Certificado · Acolhimento LGBT+ (Dicas LGBT+)\n${res.nome} concluiu o curso de acolhimento LGBT+ pela equipe do ${localAtivo?.nome} em ${data(res.concluido_em || new Date().toISOString())}, com ${res.acertos} de 5 acertos.`,
  });

  return (
    <TelaParceiro titulo="Curso de acolhimento" subtitulo="10 minutos para a equipe toda">
      {passo === -1 && (
        <>
          <Text style={s.txt}>5 lições curtas e 5 perguntas. Acertando 4, você ganha o certificado. Com 3 pessoas certificadas, sua casa ganha o selo "Equipe treinada" na página do app.</Text>
          {equipe && (
            <View style={[s.card, equipe.selo.tem_selo && { borderColor: '#34D39966' }]}>
              <Text style={s.cardTit}>{equipe.selo.tem_selo ? 'Selo Equipe treinada ativo ✓' : `${equipe.selo.certificados} de 3 pessoas certificadas`}</Text>
              {equipe.pessoas.map((p, i) => <Text key={i} style={s.sub}>{p.nome} · {data(p.em)}</Text>)}
            </View>
          )}
          <TouchableOpacity style={s.botao} onPress={() => setPasso(0)} accessibilityRole="button"><Text style={s.botaoTxt}>Começar o curso</Text></TouchableOpacity>
        </>
      )}

      {passo >= 0 && passo < LICOES.length && (
        <>
          <Text style={s.contador}>Lição {passo + 1} de {LICOES.length}</Text>
          <TituloSecao texto={LICOES[passo].titulo} />
          {LICOES[passo].pontos.map((p, i) => (
            <View key={i} style={s.ponto}><Feather name="check" size={15} color="#34D399" style={{ marginTop: 2 }} /><Text style={s.pontoTxt}>{p}</Text></View>
          ))}
          <View style={s.nav}>
            {passo > 0 && <TouchableOpacity style={s.botaoSec} onPress={() => setPasso(passo - 1)}><Text style={s.botaoTxt}>Voltar</Text></TouchableOpacity>}
            <TouchableOpacity style={[s.botao, { flex: 1 }]} onPress={() => setPasso(passo + 1)}><Text style={s.botaoTxt}>{passo === LICOES.length - 1 ? 'Ir para as perguntas' : 'Próxima'}</Text></TouchableOpacity>
          </View>
        </>
      )}

      {passo === LICOES.length && (
        <>
          <TituloSecao texto="Perguntas" />
          {PERGUNTAS.map((q, i) => (
            <View key={i} style={s.card}>
              <Text style={s.cardTit}>{i + 1}. {q.texto}</Text>
              {q.opcoes.map((o) => (
                <TouchableOpacity key={o.id} style={[s.opcao, resp[i] === o.id && s.opcaoOn]} onPress={() => setResp(resp.map((r, k) => (k === i ? o.id : r)))} accessibilityState={{ selected: resp[i] === o.id }}>
                  <Text style={[s.opcaoTxt, resp[i] === o.id && { color: '#0B0A10' }]}>{o.texto}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <TouchableOpacity style={s.botao} onPress={enviar} disabled={enviando}>{enviando ? <ActivityIndicator color="#FFF" /> : <Text style={s.botaoTxt}>Enviar respostas</Text>}</TouchableOpacity>
        </>
      )}

      {passo === 6 && res && (
        res.aprovado ? (
          <View style={[s.card, { borderColor: '#34D39966', alignItems: 'center' }]}>
            <Feather name="award" size={34} color="#34D399" />
            <Text style={[s.cardTit, { fontSize: 18, marginTop: 8 }]}>Parabéns, {res.nome}!</Text>
            <Text style={s.sub}>Você acertou {res.acertos} de 5 e está certificada(o) em acolhimento LGBT+.</Text>
            <TouchableOpacity style={[s.botao, { alignSelf: 'stretch', marginTop: 12 }]} onPress={certificado}><Text style={s.botaoTxt}>Compartilhar certificado</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setPasso(-1); setRes(null); setResp(PERGUNTAS.map(() => null)); }}><Text style={[s.sub, { marginTop: 10 }]}>Voltar</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.cardTit}>Quase! {res.acertos} de 5 acertos.</Text>
            <Text style={s.sub}>Reveja as perguntas {res.erradas?.join(', ')} e tente de novo. Precisa de 4.</Text>
            <TouchableOpacity style={[s.botao, { marginTop: 12 }]} onPress={() => setPasso(0)}><Text style={s.botaoTxt}>Rever as lições</Text></TouchableOpacity>
            <TouchableOpacity style={[s.botaoSec, { marginTop: 8 }]} onPress={() => setPasso(LICOES.length)}><Text style={s.botaoTxt}>Responder de novo</Text></TouchableOpacity>
          </View>
        )
      )}
    </TelaParceiro>
  );
}

const s = StyleSheet.create({
  txt: { color: CP.dim, fontSize: 13.5, lineHeight: 19, marginBottom: ESP.m },
  contador: { color: CP.fraco, fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m, padding: ESP.m, marginBottom: ESP.m, gap: 6 },
  cardTit: { color: CP.texto, fontSize: 14.5, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12.5, textAlign: 'center' },
  ponto: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pontoTxt: { color: CP.texto, fontSize: 14, lineHeight: 21, flex: 1 },
  nav: { flexDirection: 'row', gap: 8, marginTop: ESP.m },
  botao: { backgroundColor: CP.rosa, borderRadius: 999, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  botaoSec: { borderWidth: 1, borderColor: CP.borda, borderRadius: 999, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  opcao: { borderWidth: 1, borderColor: CP.borda, borderRadius: 12, padding: 12 },
  opcaoOn: { backgroundColor: '#C4B5FD', borderColor: '#C4B5FD' },
  opcaoTxt: { color: CP.texto, fontSize: 13.5, lineHeight: 18 },
});
