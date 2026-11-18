// Modo equipe · Ações de marca (saiu da aba Aprovar): para liberar, no ar e encerradas, com + Nova ação.
// Liberar = liga "Mostrar no app" (Ações da semana na Home). Link da marca = resultados ao vivo (144).
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { URL_PORTAL } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

type Acao = { id: string; marca: string; nome: string; brinde: string | null; inicio: string; fim: string; mostrar_no_app: boolean; locais: { nome: string } | null };
const br = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

export default function AcoesAdm() {
  const router = useRouter();
  const [acoes, setAcoes] = useState<Acao[] | null>(null);
  const [fazendo, setFazendo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    const { data } = await supabase.from('acoes_marca').select('id, marca, nome, brinde, inicio, fim, mostrar_no_app, locais(nome)').eq('ativa', true).gte('fim', hoje).order('inicio');
    setAcoes((data as any[]) || []);
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const mostrar = async (a: Acao, v: boolean) => {
    setFazendo(a.id);
    const { error } = await supabase.from('acoes_marca').update({ mostrar_no_app: v }).eq('id', a.id);
    setFazendo(null);
    if (error) return Alert.alert('Ação de marca', error.message);
    void carregar();
  };
  const liberar = (a: Acao) => Alert.alert('Liberar no app?', `${a.marca} autorizou por escrito o uso do nome/logo?`, [
    { text: 'Ainda não', style: 'cancel' },
    { text: 'Sim, liberar', onPress: () => void mostrar(a, true) },
  ]);
  const linkMarca = async (a: Acao) => {
    const { data, error } = await supabase.rpc('admin_link_marca', { p_acao: a.id, p_trocar: false });
    if (error) return Alert.alert('Link da marca', error.message.includes('admin_link_marca') ? 'Rode a migração 144 no Supabase.' : error.message);
    await Share.share({ message: `${a.marca} · resultados ao vivo da ação no Dicas LGBT+:\n${URL_PORTAL}/resultados/${data}` });
  };

  const esperando = (acoes || []).filter((a) => !a.mostrar_no_app);
  const noAr = (acoes || []).filter((a) => a.mostrar_no_app);
  return (
    <TelaAdm titulo="Ações de marca" subtitulo="Aparecem em Ações da semana, na Home" voltar>
      <TouchableOpacity style={[sa.botao, { marginBottom: 6 }]} onPress={() => router.push('/adm/acao-nova' as any)} accessibilityRole="button">
        <Feather name="plus" size={15} color="#FFF" /><Text style={sa.botaoTxt}>Nova ação</Text>
      </TouchableOpacity>
      {acoes === null ? <ActivityIndicator color={CA.rosa} /> : (
        <>
          <Text style={sa.secao}>NO AR · {noAr.length}</Text>
          {noAr.length === 0 ? <Text style={sa.vazio}>Nenhuma no ar.</Text> : (
            <View style={sa.lista}>
              {noAr.map((a, i) => (
                <View key={a.id} style={[sa.linha, i < noAr.length - 1 && sa.borda]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/marca/${a.id}` as any)} accessibilityRole="button">
                    <Text style={sa.tit}>{a.marca}</Text><Text style={sa.sub}>{a.brinde || a.nome}{a.locais?.nome ? ` · ${a.locais.nome}` : ''} · até {br(a.fim)}</Text>
                  </TouchableOpacity>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <TouchableOpacity onPress={() => void linkMarca(a)}><Text style={[c.acao, { color: CA.verde }]}>Link da marca</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => void mostrar(a, false)} disabled={fazendo === a.id}><Text style={c.acao}>Tirar do app</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={sa.secao}>PARA LIBERAR · {esperando.length}</Text>
          {esperando.length === 0 ? <Text style={sa.vazio}>Nenhuma esperando.</Text> : esperando.map((a) => (
            <View key={a.id} style={sa.card}>
              <Text style={sa.tit}>{a.marca} · {a.brinde || a.nome}</Text>
              <Text style={sa.sub}>{a.locais?.nome ? `${a.locais.nome} · ` : ''}{br(a.inicio)} a {br(a.fim)}</Text>
              <Text style={[sa.sub, { color: CA.amarelo }]}>Antes de liberar: a marca autorizou o uso do nome/logo por escrito?</Text>
              <TouchableOpacity style={[sa.botao, { marginTop: 10, minHeight: 38 }]} onPress={() => liberar(a)} disabled={fazendo === a.id}>
                {fazendo === a.id ? <ActivityIndicator color="#FFF" /> : <Text style={sa.botaoTxt}>Liberar no app</Text>}
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </TelaAdm>
  );
}

const c = StyleSheet.create({ acao: { color: '#F87171', fontSize: 12.5, fontWeight: '800' } });
