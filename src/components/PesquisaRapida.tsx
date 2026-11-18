// Rodada 148 — questionário de feedback depois de uma ação de marca (migrações 117 e 123).
// Aparece na Conta só para quem FOI (cupom usado, check-in ou entrada pela Lista VIP) e ainda não respondeu.
// Formato novo: até 5 perguntas (opções, nota de 0 a 10 ou texto curto). Formato antigo: 1 pergunta de opções.
// Respostas somadas no resultado da ação; nunca com o nome da pessoa.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

type Pergunta = { id: string; texto: string; tipo: 'escolha' | 'nota' | 'aberta'; opcoes?: string[] };
type Pesquisa = { acao_id: string; marca: string; pergunta: string | null; opcoes: string[] | null; perguntas: Pergunta[] | null };

export default function PesquisaRapida() {
  const [p, setP] = useState<Pesquisa | null>(null);
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string | number>>({});
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [obrigada, setObrigada] = useState(false);

  useFocusEffect(useCallback(() => {
    let vivo = true;
    supabase.rpc('pesquisa_marca_pendente').then(({ data, error }) => {
      if (!vivo || error) return; // sem as migrações, simplesmente não aparece
      const linha = ((data as Pesquisa[] | null) || [])[0];
      setP(linha || null); setPasso(0); setRespostas({}); setTexto('');
    }, () => {});
    return () => { vivo = false; };
  }, []));

  if (!p) return null;

  // Formato antigo (1 pergunta) vira uma lista de 1 pergunta de opções.
  const perguntas: Pergunta[] = p.perguntas?.length ? p.perguntas : p.pergunta && p.opcoes ? [{ id: 'unica', texto: p.pergunta, tipo: 'escolha', opcoes: p.opcoes }] : [];
  const novo = !!p.perguntas?.length;
  const q = perguntas[passo];

  const terminar = async (finais: Record<string, string | number> | null) => {
    setEnviando(true);
    const { error } = novo
      ? await supabase.rpc('responder_questionario_marca', { p_acao: p.acao_id, p_respostas: finais })
      : await supabase.rpc('responder_pesquisa_marca', { p_acao: p.acao_id, p_resposta: finais ? (finais.unica as string) ?? null : null });
    setEnviando(false);
    if (error) { setP(null); return; }
    setObrigada(true);
    setTimeout(() => { setP(null); setObrigada(false); }, 2200);
  };

  const responder = (valor: string | number | null) => {
    const novas = { ...respostas };
    if (valor !== null && valor !== '') novas[q.id] = valor;
    setRespostas(novas); setTexto('');
    if (passo + 1 < perguntas.length) setPasso(passo + 1);
    else void terminar(Object.keys(novas).length ? novas : null);
  };

  return (
    <View style={s.card}>
      <View style={s.topo}>
        <View style={s.icone}><Feather name="message-circle" size={14} color="#F2C94C" /></View>
        <Text style={s.tag}>{perguntas.length > 1 ? `SUA OPINIÃO · ${passo + 1} DE ${perguntas.length}` : 'UMA PERGUNTA RÁPIDA'}</Text>
      </View>
      {obrigada ? (
        <Text style={s.ok}>Valeu! Sua resposta ajuda a trazer mais ações para a comunidade.</Text>
      ) : q ? (
        <>
          <Text style={s.pergunta}>{q.texto}</Text>
          {q.tipo === 'escolha' && (
            <View style={s.opcoes}>
              {(q.opcoes || []).map((o) => (
                <TouchableOpacity key={o} style={s.opcao} onPress={() => responder(o)} disabled={enviando} activeOpacity={0.8} accessibilityRole="button">
                  <Text style={s.opcaoTxt}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {q.tipo === 'nota' && (
            <>
              <View style={s.notas}>
                {Array.from({ length: 11 }, (_, n) => (
                  <TouchableOpacity key={n} style={s.nota} onPress={() => responder(n)} disabled={enviando} accessibilityRole="button" accessibilityLabel={`Nota ${n}`}>
                    <Text style={s.notaTxt}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.notaLegenda}><Text style={s.legTxt}>Nada</Text><Text style={s.legTxt}>Muito</Text></View>
            </>
          )}
          {q.tipo === 'aberta' && (
            <>
              <TextInput style={s.campo} value={texto} onChangeText={setTexto} placeholder="Escreva aqui (opcional)" placeholderTextColor="#6E6B80" maxLength={280} multiline />
              <TouchableOpacity style={s.enviar} onPress={() => responder(texto.trim())} disabled={enviando} accessibilityRole="button">
                <Text style={s.enviarTxt}>{passo + 1 < perguntas.length ? 'Próxima' : 'Enviar'}</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => (passo === 0 ? void terminar(null) : responder(null))} disabled={enviando} style={s.pular} accessibilityRole="button">
            <Text style={s.pularTxt}>{passo === 0 ? 'Prefiro não responder' : 'Pular esta'}</Text>
          </TouchableOpacity>
          <Text style={s.notaRodape}>Anônima: entra só somada, sem o seu nome.</Text>
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 18, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#3A3320', backgroundColor: '#1A1810' },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icone: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#F2C94C1F', alignItems: 'center', justifyContent: 'center' },
  tag: { fontSize: 10.5, fontWeight: '800', color: '#F2C94C', letterSpacing: 1 },
  pergunta: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginTop: 10, lineHeight: 20 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  opcao: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#4A4430', backgroundColor: '#24211A', justifyContent: 'center' },
  opcaoTxt: { color: '#F5F5F7', fontSize: 13, fontWeight: '700' },
  notas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  nota: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#4A4430', backgroundColor: '#24211A', alignItems: 'center', justifyContent: 'center' },
  notaTxt: { color: '#F5F5F7', fontSize: 14, fontWeight: '800' },
  notaLegenda: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  legTxt: { color: '#8E8BA3', fontSize: 11 },
  campo: { marginTop: 12, minHeight: 70, borderRadius: 12, borderWidth: 1, borderColor: '#4A4430', backgroundColor: '#24211A', color: '#FFF', fontSize: 14, padding: 10, textAlignVertical: 'top' },
  enviar: { marginTop: 10, height: 42, borderRadius: 21, backgroundColor: '#E1306C', alignItems: 'center', justifyContent: 'center' },
  enviarTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  pular: { alignSelf: 'flex-start', paddingVertical: 10 },
  pularTxt: { color: '#8E8BA3', fontSize: 12, fontWeight: '600' },
  notaRodape: { color: '#6E6B80', fontSize: 11 },
  ok: { color: '#4CAF7D', fontSize: 13, fontWeight: '700', marginTop: 10 },
});
