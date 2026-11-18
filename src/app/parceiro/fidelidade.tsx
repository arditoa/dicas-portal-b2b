// Tela 7 do Modo parceiro — Cartão fidelidade (Fidelizar › Cartão fidelidade e Nível VIP). Só o dono.
// Regras do portal (dashboard/fidelidade); dados em src/lib/parceiro/fidelidade.ts.
//   - o cartão: nome, meta de visitas (1–60), brinde, contagem no mês ou sempre, observações;
//   - nível VIP opcional (a partir de 2 visitas, com benefício);
//   - mostrar no app / programa ativo; prévia igual ao cartão da página da casa;
//   - confirmar visita pelo código (mostra "X de N visitas"), clientes do cartão e "Entreguei o brinde".
// Some para categorias sem fidelidade (festas, saúde), igual ao menu.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BarraSalvar, Campo, Chips, Interruptor, Previa, estiloForm as f, useAvisoSairSemSalvar } from '../../components/parceiro/form';
import { PreviaFidelidade } from '../../components/parceiro/PreviaFidelidade';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import {
  clientesDoPrograma, ClienteFid, confirmarVisita, entregarBrinde, ErrosPrograma, fraseRegra, MAX, obterPrograma, Programa, PROGRAMA_VAZIO,
  salvarPrograma, validarPrograma,
} from '../../lib/parceiro/fidelidade';

export default function Fidelidade() {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const dono = localAtivo?.papel === 'dono';
  const liberado = !!localAtivo && dono && recursosDaCategoria(localAtivo.categoria).fidelidade;

  const [p, setP] = useState<Programa>({ ...PROGRAMA_VAZIO });
  const [base, setBase] = useState(() => JSON.stringify(PROGRAMA_VAZIO));
  const [clientes, setClientes] = useState<ClienteFid[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<ErrosPrograma>({});
  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<{ nome: string; userId: string | null; visitas: number | null } | null>(null);
  const [entregando, setEntregando] = useState<string | null>(null);

  const sujo = JSON.stringify(p) !== base;
  const voltar = useAvisoSairSemSalvar(sujo && !salvando);

  const carregarClientes = useCallback(async (id: string | null) => { setClientes(id ? await clientesDoPrograma(id) : []); }, []);
  const carregar = useCallback(async () => {
    if (!liberado) { setCarregando(false); return; }
    try {
      const prog = await obterPrograma(localId);
      setP(prog);
      setBase(JSON.stringify(prog));
      await carregarClientes(prog.id);
    } catch (e: any) {
      Alert.alert('Fidelidade', e?.message || 'Não deu para abrir o cartão.');
    } finally {
      setCarregando(false);
    }
  }, [liberado, localId, carregarClientes]);
  useEffect(() => { void carregar(); }, [carregar]);

  const mudar = (x: Partial<Programa>) => { setP((a) => ({ ...a, ...x })); setErros({}); };
  const n = parseInt(p.visitas, 10) || 0;
  const vipN = parseInt(p.vipVisitas, 10) || 0;

  const salvar = async () => {
    const e = validarPrograma(p);
    if (Object.keys(e).length) { setErros(e); return Alert.alert('Falta ajustar', Object.values(e).join('\n')); }
    setSalvando(true);
    try {
      const id = await salvarPrograma(localId, p);
      const novo = { ...p, id };
      setP(novo);
      setBase(JSON.stringify(novo));
      await carregarClientes(id);
      Alert.alert('Cartão salvo', p.ativo && p.exibir ? 'Já aparece na página da casa.' : 'Salvo. Ele não aparece no app enquanto estiver pausado ou escondido.');
    } catch (x: any) {
      Alert.alert('Fidelidade', x?.message || 'Não deu para salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const validar = async () => {
    if (!codigo.trim()) return;
    setValidando(true);
    setResultado(null);
    try {
      const r = await confirmarVisita(codigo, p.id, p.ativo);
      setResultado(r);
      setCodigo('');
      await carregarClientes(p.id);
    } catch (e: any) {
      Alert.alert('Confirmar visita', e?.message || 'Não deu para validar esse código.');
    } finally {
      setValidando(false);
    }
  };

  const entregar = (c: { userId: string; nome: string }) =>
    Alert.alert('Entregou o brinde?', `Marca que ${c.nome} recebeu: ${p.recompensa}. A contagem dele recomeça.`, [
      { text: 'Ainda não', style: 'cancel' },
      {
        text: 'Entreguei', onPress: async () => {
          if (!p.id) return;
          setEntregando(c.userId);
          try { await entregarBrinde(p.id, c.userId); setResultado(null); await carregarClientes(p.id); }
          catch (e: any) { Alert.alert('Brinde', e?.message || 'Não deu para marcar agora.'); }
          finally { setEntregando(null); }
        },
      },
    ]);

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Cartão fidelidade">
        <Text style={a.aviso}>{!dono ? 'Só o dono do local mexe no cartão fidelidade.' : 'Esta categoria não usa cartão fidelidade. Para festas, use a Lista VIP.'}</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }
  if (carregando) return <View style={[a.tela, a.centro]}><ActivityIndicator color={CP.rosa} /></View>;

  const prontos = clientes.filter((c) => n > 0 && c.visitas >= n && !c.ja_ganhou);
  const ganharam = clientes.filter((c) => c.ja_ganhou).length;
  const vips = clientes.filter((c) => c.vip).length;
  const atingiu = !!resultado?.userId && resultado.visitas != null && n > 0 && resultado.visitas >= n;

  return (
    <View style={a.tela}>
      <TelaParceiro titulo="Cartão fidelidade" subtitulo="Aparece na página da casa. Cada visita é um check-in confirmado." aoVoltar={voltar}>

        <View style={a.passos}>
          {['O cliente faz check-in no app (a localização confirma sozinha ou vocês confirmam o código de 6 letras).', 'Check-in que ninguém confirmou entra sozinho às 6h.', 'Quando bate a meta, vocês entregam o brinde e marcam aqui.', 'Se tiver cupom, ele vai junto no mesmo check-in.'].map((t, i) => (
            <View key={t} style={a.passo}><Text style={a.passoN}>{i + 1}</Text><Text style={a.passoTxt}>{t}</Text></View>
          ))}
        </View>

        {/* Confirmar visita */}
        <TituloSecao texto="Confirmar visita" />
        <View style={a.linhaCodigo}>
          <TextInput style={[f.input, a.codigo]} value={codigo} onChangeText={(v) => setCodigo(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC123" placeholderTextColor={CP.fraco} autoCapitalize="characters" accessibilityLabel="Código do check-in" />
          <TouchableOpacity style={[a.botao, (!codigo || validando) && { opacity: 0.6 }]} onPress={() => void validar()} disabled={!codigo || validando} accessibilityRole="button">
            {validando ? <ActivityIndicator color="#FFF" /> : <Text style={a.botaoTxt}>Confirmar</Text>}
          </TouchableOpacity>
        </View>
        {resultado && (
          <View style={a.resultado}>
            <Feather name="check-circle" size={16} color={CP.verde} />
            <View style={{ flex: 1 }}>
              <Text style={a.titulo}>Visita de {resultado.nome} confirmada</Text>
              {resultado.visitas != null && <Text style={a.sub}>{resultado.visitas} de {n} visitas{p.janela === 'mes' ? ' no mês' : ''}{atingiu ? ' · bateu a meta!' : ''}</Text>}
            </View>
            {atingiu && (
              <TouchableOpacity style={a.entregar} onPress={() => entregar({ userId: resultado.userId!, nome: resultado.nome })} accessibilityRole="button"><Text style={a.entregarTxt}>Entregar brinde</Text></TouchableOpacity>
            )}
          </View>
        )}

        {/* O cartão */}
        <TituloSecao texto="1 · O cartão" />
        <Campo rotulo="Nome do cartão" valor={p.nome} aoMudar={(v) => mudar({ nome: v })} max={MAX.nome} exemplo="Cartão fidelidade" />
        <Campo rotulo="Quantas visitas para ganhar" valor={p.visitas} aoMudar={(v) => mudar({ visitas: v.replace(/\D/g, '').slice(0, 2) })} teclado="number-pad" erro={erros.visitas} ajuda="De 1 a 60." />
        <Campo rotulo="O que o cliente ganha" valor={p.recompensa} aoMudar={(v) => mudar({ recompensa: v })} max={MAX.recompensa} erro={erros.recompensa} exemplo="Ex.: 1 drink grátis" />
        <Chips
          rotulo="Contagem"
          preencher
          opcoes={[{ valor: 'mes', rotulo: 'No mês' }, { valor: 'sempre', rotulo: 'Sempre' }]}
          valor={p.janela}
          aoMudar={(v) => mudar({ janela: v as Programa['janela'] })}
          ajuda={p.janela === 'mes' ? 'Zera todo dia 1º. No máximo 1 brinde por mês.' : 'As visitas vão somando, sem zerar.'}
        />
        <Campo rotulo="Observações (opcional)" valor={p.descricao} aoMudar={(v) => mudar({ descricao: v })} linhas max={MAX.descricao} exemplo="Ex.: Válido de terça a quinta." />

        {/* Nível VIP */}
        <TituloSecao texto="2 · Nível VIP (opcional)" info="Para quem vem sempre: com tantas visitas, o cliente vira VIP e ganha um benefício. Aparece em Clientes VIP." />
        <Campo rotulo="Visitas para virar VIP" valor={p.vipVisitas} aoMudar={(v) => mudar({ vipVisitas: v.replace(/\D/g, '').slice(0, 3) })} teclado="number-pad" erro={erros.vipVisitas} exemplo="Sem nível VIP" ajuda="De 2 a 200. Deixe vazio para não usar." />
        {vipN >= 2 && (
          <Campo rotulo="O que o VIP ganha" valor={p.vipBeneficio} aoMudar={(v) => mudar({ vipBeneficio: v })} max={MAX.beneficio} erro={erros.vipBeneficio} exemplo="Ex.: Mesa reservada e drink de boas-vindas" />
        )}

        {/* No app */}
        <TituloSecao texto="3 · No app" />
        <Interruptor titulo="Mostrar no app" explicacao="Aparece na página da casa para o cliente acompanhar as visitas." valor={p.exibir} aoMudar={(v) => mudar({ exibir: v })} />
        <Interruptor titulo="Programa ativo" explicacao="Pausar não apaga o histórico de visitas de ninguém." valor={p.ativo} aoMudar={(v) => mudar({ ativo: v })} />

        <TituloSecao texto="Como o cliente vê" />
        <Previa onde="Página da casa">
          <PreviaFidelidade nome={p.nome} visitas={n} recompensa={p.recompensa} descricao={p.descricao} noMes={p.janela === 'mes'} vipVisitas={vipN >= 2 ? vipN : null} vipBeneficio={p.vipBeneficio} />
        </Previa>
        <Text style={[f.ajuda, { marginTop: ESP.s }]}>{fraseRegra(n, p.recompensa, p.janela)}</Text>

        {/* Clientes */}
        {!!p.id && (
          <>
            <TituloSecao texto="Clientes do cartão" />
            <View style={a.numeros}>
              <Numero n={prontos.length} rotulo="para entregar" cor="#FFD54F" />
              <Numero n={ganharam} rotulo="já ganharam" cor={CP.verde} />
              <Numero n={vips} rotulo="VIPs" cor="#C8853C" />
            </View>
            {clientes.length === 0 ? (
              <Text style={a.vazio}>Nenhuma visita confirmada ainda neste período.</Text>
            ) : (
              <View style={{ gap: ESP.s, marginTop: ESP.s }}>
                {[...prontos, ...clientes.filter((c) => !prontos.includes(c))].map((c) => {
                  const pronto = prontos.includes(c);
                  const pct = n > 0 ? Math.min(100, Math.round((c.visitas / n) * 100)) : 0;
                  return (
                    <View key={c.user_id} style={[a.cliente, pronto && a.clientePronto]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={a.titulo}>{c.nome}</Text>
                          {c.vip && <View style={a.selo}><Text style={[a.seloTxt, { color: '#C8853C' }]}>VIP</Text></View>}
                          {c.ja_ganhou && <View style={a.selo}><Text style={[a.seloTxt, { color: CP.verde }]}>Já ganhou</Text></View>}
                        </View>
                        <Text style={a.sub}>{c.visitas} de {n} visitas{p.janela === 'mes' ? ' no mês' : ''} · {c.visitas_total} no total</Text>
                        <View style={a.barra}><View style={[a.barraOn, { width: `${pct}%` }]} /></View>
                      </View>
                      {pronto && (
                        <TouchableOpacity style={a.entregar} onPress={() => entregar({ userId: c.user_id, nome: c.nome })} disabled={entregando === c.user_id} accessibilityRole="button">
                          {entregando === c.user_id ? <ActivityIndicator size="small" color="#1A1020" /> : <Text style={a.entregarTxt}>Entreguei o brinde</Text>}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
        <View style={{ height: ESP.xl }} />
      </TelaParceiro>
      <BarraSalvar rotulo={p.id ? 'Salvar cartão' : 'Criar cartão'} salvando={salvando} aoSalvar={() => void salvar()} desabilitado={!!p.id && !sujo} />
    </View>
  );
}

function Numero({ n, rotulo, cor }: { n: number; rotulo: string; cor: string }) {
  return (
    <View style={a.numero}><Text style={[a.numeroN, { color: cor }]}>{n}</Text><Text style={a.numeroR}>{rotulo}</Text></View>
  );
}

const a = StyleSheet.create({
  tela: { flex: 1, backgroundColor: CP.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  passos: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, gap: ESP.s, marginTop: ESP.m },
  passo: { flexDirection: 'row', gap: ESP.s },
  passoN: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#2A2938', color: CP.texto, fontSize: 11, fontWeight: '800', textAlign: 'center', lineHeight: 20 },
  passoTxt: { flex: 1, color: CP.dim, fontSize: 12, lineHeight: 17 },
  linhaCodigo: { flexDirection: 'row', gap: ESP.s },
  codigo: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
  botao: { minHeight: 46, paddingHorizontal: ESP.l, borderRadius: RAIO.s, backgroundColor: CP.rosa, alignItems: 'center', justifyContent: 'center' },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  resultado: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, marginTop: ESP.s, backgroundColor: '#4CAF7D14', borderRadius: RAIO.s, padding: ESP.m },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  numeros: { flexDirection: 'row', gap: ESP.s },
  numero: { flex: 1, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, paddingVertical: ESP.m, alignItems: 'center' },
  numeroN: { fontSize: 18, fontWeight: '900' },
  numeroR: { color: CP.fraco, fontSize: 11, fontWeight: '700', marginTop: 2 },
  vazio: { color: CP.fraco, fontSize: 13, marginTop: ESP.s },
  cliente: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  clientePronto: { borderColor: '#FFD54F66' },
  selo: { backgroundColor: '#2A2938', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  seloTxt: { fontSize: 10, fontWeight: '800' },
  barra: { height: 6, borderRadius: 3, backgroundColor: '#232230', overflow: 'hidden', marginTop: 6 },
  barraOn: { height: 6, backgroundColor: '#FFD54F' },
  entregar: { minHeight: 44, paddingHorizontal: ESP.m, borderRadius: RAIO.s, backgroundColor: '#FFD54F', alignItems: 'center', justifyContent: 'center' },
  entregarTxt: { color: '#1A1020', fontSize: 12, fontWeight: '800' },
});
