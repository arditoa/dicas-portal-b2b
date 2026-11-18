// Etapa 13 — Cadastro da hospedagem (Meu espaço › Cadastro da hospedagem). Só o dono e só a categoria turismo.
// Resumo: situação da validação (rascunho, em análise, ajustes, verificada), % de completude (ordena no app), as 9 etapas
// com o que falta e "Enviar para validação" quando os obrigatórios estão ok. Regras em src/lib/parceiro/hospedagem.ts.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../lib/modoParceiro';
import { calcularCompletude, carregar, Dados, ETAPAS, montarChecklist, salvar } from '../../lib/parceiro/hospedagem';
import { URL_PORTAL } from '../../lib/parceiroMenu';

export default function Hospedagem() {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  const liberado = !!localAtivo && localAtivo.papel === 'dono' && localAtivo.categoria === 'turismo';
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!liberado || !localAtivo) return;
    carregar(localAtivo.local_id).then(setD).catch((e) => setErro(e?.message || 'Não foi possível carregar.'));
  }, [liberado, localAtivo]));

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Cadastro da hospedagem">
        <Text style={a.aviso}>{localAtivo?.papel !== 'dono' ? 'Só o dono do local mexe no cadastro da hospedagem.' : 'O cadastro da hospedagem é para a categoria Dicas Trip.'}</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  const checklist = d ? montarChecklist(d) : [];
  const pct = calcularCompletude(checklist);
  const faltam = checklist.filter((i) => i.obrigatorio && !i.ok);
  const st = d?.validacao.status;

  const enviar = async () => {
    if (!d || faltam.length) return;
    setEnviando(true);
    try {
      const v = await salvar(d, { enviar: st !== 'aprovado' });
      setD({ ...d, validacao: v });
      Alert.alert(st === 'aprovado' ? 'Atualizações salvas' : 'Cadastro enviado!', st === 'aprovado' ? 'Já aparecem no app. A hospedagem continua verificada.' : 'A equipe Dicas vai conferir e avisar você pelo WhatsApp.');
    } catch (e: any) {
      Alert.alert('Hospedagem', e?.message || 'Não deu para enviar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <TelaParceiro titulo="Cadastro da hospedagem" subtitulo="Quanto mais completo, mais destaque no app." aoVoltar={() => router.back()}>
      {!!erro && <Text style={a.erro}>{erro}</Text>}
      {!d ? (
        !erro && <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} />
      ) : (
        <>
          {st === 'aprovado' && <Status cor="#4CAF7D" icone="check-circle" txt="Hospedagem verificada pelo Dicas. O selo já aparece no app." />}
          {st === 'enviado' && <Status cor="#FFD54F" icone="clock" txt="Cadastro em análise pela equipe Dicas. Você pode continuar editando." />}
          {st === 'ajustes' && <Status cor="#FF7A7A" icone="alert-triangle" txt={`A equipe pediu ajustes${d.validacao.observacao_equipe ? `: ${d.validacao.observacao_equipe}` : '.'} Depois de ajustar, envie de novo.`} />}

          <View style={a.resumo}>
            <Text style={a.pct}>{pct}%</Text>
            <View style={{ flex: 1 }}>
              <Text style={a.titulo}>Cadastro completo</Text>
              <View style={a.barra}><View style={[a.barraOn, { width: `${pct}%` }]} /></View>
              <Text style={a.sub}>{faltam.length ? `Faltam ${faltam.length} item(ns) obrigatório(s) para enviar.` : 'Os obrigatórios estão prontos.'}</Text>
            </View>
          </View>

          <TituloSecao texto="Etapas" />
          <View style={a.lista}>
            {ETAPAS.filter((e) => e.n < 9).map((e, i) => {
              const itens = checklist.filter((x) => x.etapa === e.n);
              const falta = itens.filter((x) => x.obrigatorio && !x.ok);
              const ok = !falta.length && itens.some((x) => x.ok);
              return (
                <TouchableOpacity key={e.n} style={[a.linha, i > 0 && a.borda]} onPress={() => router.push(`/parceiro/hospedagem-etapa?n=${e.n}` as any)} accessibilityRole="button">
                  <View style={[a.n, ok && { backgroundColor: CP.verde }]}>{ok ? <Feather name="check" size={14} color="#FFF" /> : <Text style={a.nTxt}>{e.n}</Text>}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={a.titulo}>{e.titulo}</Text>
                    <Text style={[a.sub, falta.length ? { color: '#FFD54F' } : null]} numberOfLines={2}>{falta.length ? `Falta: ${falta.map((x) => x.label.toLowerCase()).join(', ')}` : `${itens.filter((x) => x.ok).length} de ${itens.length} itens`}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={CP.fraco} />
                </TouchableOpacity>
              );
            })}
          </View>

          <TituloSecao texto="9 · Revisão e envio" />
          <TouchableOpacity style={[a.enviar, (faltam.length > 0 || enviando) && { opacity: 0.5 }]} onPress={() => void enviar()} disabled={faltam.length > 0 || enviando} accessibilityRole="button">
            {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={a.enviarTxt}>{st === 'aprovado' ? 'Salvar e publicar' : st === 'enviado' ? 'Enviar de novo' : 'Enviar para validação'}</Text>}
          </TouchableOpacity>
          {faltam.length > 0 && <Text style={a.sub}>Para enviar, falta: {faltam.map((x) => x.label.toLowerCase()).join(', ')}.</Text>}
          <TouchableOpacity style={a.portal} onPress={() => void Linking.openURL(`${URL_PORTAL}/dashboard/hospedagem?etapa=6`)} accessibilityRole="button">
            <Feather name="external-link" size={14} color={CP.dim} />
            <Text style={a.portalTxt}>{d.validacao.comprovante_path ? 'Comprovante enviado · trocar pelo portal' : 'Enviar comprovante (PDF) pelo portal'}</Text>
          </TouchableOpacity>
        </>
      )}
    </TelaParceiro>
  );
}

function Status({ cor, icone, txt }: { cor: string; icone: keyof typeof Feather.glyphMap; txt: string }) {
  return (
    <View style={[a.status, { borderColor: cor + '66', backgroundColor: cor + '14' }]}>
      <Feather name={icone} size={16} color={cor} />
      <Text style={[a.statusTxt, { color: cor }]}>{txt}</Text>
    </View>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  erro: { color: '#FF7A7A', fontSize: 13, backgroundColor: '#FF7A7A14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: ESP.s, marginTop: ESP.m, borderWidth: 1, borderRadius: RAIO.s, padding: ESP.m },
  statusTxt: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  resumo: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, marginTop: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  pct: { color: CP.verde, fontSize: 28, fontWeight: '900' },
  barra: { height: 8, borderRadius: 4, backgroundColor: '#232230', overflow: 'hidden', marginTop: 6 },
  barraOn: { height: 8, backgroundColor: CP.verde },
  lista: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, paddingHorizontal: ESP.m, paddingVertical: 10, minHeight: 60 },
  borda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  n: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2A2938', alignItems: 'center', justifyContent: 'center' },
  nTxt: { color: CP.texto, fontSize: 12, fontWeight: '800' },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2, lineHeight: 16 },
  enviar: { minHeight: 52, borderRadius: RAIO.m, backgroundColor: CP.rosa, alignItems: 'center', justifyContent: 'center', marginBottom: ESP.s },
  enviarTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  portal: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: ESP.m },
  portalTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
});
