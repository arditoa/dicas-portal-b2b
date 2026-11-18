// Modo parceiro — Presente de aniversário (migração 141). A casa liga uma vez; o app avisa no dia quem já veio à casa
// (só quem ligou avisos de ofertas) e a pessoa mostra o vale na casa. A casa vê só números, nunca nomes ou datas.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { BarraSalvar, Campo, Chips, Interruptor } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../lib/modoParceiro';
import { falarComEquipe, nivelDoPlano } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

type Numeros = { clientes_aniversariantes_mes: number | string; presentes_pegos_mes: number; presentes_pegos_ano: number };

export default function Aniversario() {
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const [carregando, setCarregando] = useState(true);
  const [ativo, setAtivo] = useState(true);
  const [presente, setPresente] = useState('');
  const [regra, setRegra] = useState('');
  const [dias, setDias] = useState('7');
  const [existe, setExiste] = useState(false);
  const [num, setNum] = useState<Numeros | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!localId) return;
    const [{ data }, n] = await Promise.all([
      supabase.from('aniversario_casa').select('ativo, presente, regra, dias').eq('local_id', localId).maybeSingle(),
      supabase.rpc('aniversarios_da_casa', { p_local: localId }),
    ]);
    const a = data as { ativo: boolean; presente: string; regra: string | null; dias: number } | null;
    if (a) { setExiste(true); setAtivo(a.ativo); setPresente(a.presente); setRegra(a.regra || ''); setDias(String(a.dias)); }
    setNum((n.data as Numeros) || null);
    setCarregando(false);
  }, [localId]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async () => {
    if (presente.trim().length < 2) return Alert.alert('Presente', 'Qual é o presente? Ex.: Drink grátis, Entrada free, Sobremesa.');
    setSalvando(true);
    const { error } = await supabase.from('aniversario_casa').upsert({ local_id: localId, ativo, presente: presente.trim(), regra: regra.trim() || null, dias: Number(dias) });
    setSalvando(false);
    if (error) return Alert.alert('Não deu', error.message.includes('aniversario_casa') ? 'Peça à equipe Dicas para ligar esta função (migração 141).' : error.message);
    setExiste(true);
    Alert.alert('Pronto', ativo ? 'No aniversário, quem já veio à sua casa vai ver o presente no app.' : 'Presente desligado.');
  };

  if (!pode('cupons')) return <TelaParceiro titulo="Presente de aniversário"><Text style={s.nota}>Seu acesso não inclui ofertas desta casa.</Text></TelaParceiro>;
  // 161 (18/11): só Fundador, Premium e Intermediário.
  if (nivelDoPlano(localAtivo?.plano_comercial) === 'gratuito') {
    return (
      <TelaParceiro titulo="Presente de aniversário">
        <Text style={s.nota}>O presente de aniversário faz parte dos planos Intermediário, Premium e Fundador. No dia do aniversário, o app avisa sozinho quem já veio à sua casa, e a pessoa volta para pegar o presente.</Text>
        <BarraSalvar rotulo="Falar com a equipe" aoSalvar={() => void falarComEquipe(`Olá! Sou do ${localAtivo?.nome} e quero o presente de aniversário para meus clientes.`)} />
      </TelaParceiro>
    );
  }
  return (
    <TelaParceiro titulo="Presente de aniversário" subtitulo="Fidelize quem já veio, sem trabalho">
      {carregando ? <ActivityIndicator color={CP.rosa} /> : (
        <>
          {/* 18/11 — layout mais arejado: explicação em cartão com passos, campos com respiro. */}
          <View style={s.explica}>
            <Text style={s.explicaEmoji}>🎂</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.explicaTit}>Como funciona</Text>
              <Text style={s.passo}>1. Quem esteve aqui nos últimos 90 dias recebe um aviso no dia do aniversário.</Text>
              <Text style={s.passo}>2. A mensagem diz: "o {localAtivo?.nome} tem um presente para você".</Text>
              <Text style={s.passo}>3. A pessoa mostra o vale no app e pega o presente aqui.</Text>
            </View>
          </View>
          <View style={s.bloco}>
            <Interruptor titulo="Presente de aniversário ligado" valor={ativo} aoMudar={setAtivo} />
          </View>
          <View style={s.bloco}>
            <Campo rotulo="Presente" valor={presente} aoMudar={setPresente} max={60} exemplo="Ex.: Drink grátis" />
          </View>
          <View style={s.bloco}>
            <Campo rotulo="Regra (opcional)" valor={regra} aoMudar={setRegra} max={120} exemplo="Ex.: 1 por pessoa, mostrando documento" />
          </View>
          <View style={s.bloco}>
            <Chips rotulo="Vale até" opcoes={[{ valor: '0', rotulo: 'Só no dia' }, { valor: '7', rotulo: '7 dias' }, { valor: '15', rotulo: '15 dias' }, { valor: '30', rotulo: '30 dias' }]} valor={dias} aoMudar={(v) => setDias(String(v))} />
          </View>
          <View style={{ height: ESP.l }} />
          {num && existe && (
            <>
              <TituloSecao texto="Números" info="Só contagens. Nunca mostramos nomes ou datas de aniversário de clientes." />
              <View style={s.grade}>
                {[['Clientes fazendo aniversário este mês', String(num.clientes_aniversariantes_mes)], ['Presentes pegos no mês', String(num.presentes_pegos_mes)], ['Presentes pegos no ano', String(num.presentes_pegos_ano)]].map(([r, v]) => (
                  <View key={r} style={s.caixa}><Text style={s.valor}>{v}</Text><Text style={s.rot}>{r}</Text></View>
                ))}
              </View>
            </>
          )}
          <BarraSalvar rotulo="Salvar" aoSalvar={salvar} salvando={salvando} />
        </>
      )}
    </TelaParceiro>
  );
}

const s = StyleSheet.create({
  txt: { color: CP.dim, fontSize: 13, lineHeight: 19, marginBottom: ESP.m },
  explica: { flexDirection: 'row', gap: ESP.m, backgroundColor: '#E1306C14', borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.s, marginBottom: ESP.l },
  explicaEmoji: { fontSize: 26 },
  explicaTit: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  passo: { color: CP.dim, fontSize: 13, lineHeight: 18 },
  bloco: { marginBottom: ESP.m },
  nota: { color: CP.dim, fontSize: 13 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  caixa: { width: '48.5%', backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m, padding: ESP.m },
  valor: { color: CP.texto, fontSize: 18, fontWeight: '900' },
  rot: { color: CP.dim, fontSize: 12, marginTop: 2 },
});
