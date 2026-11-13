// Comunidade, fase 1 — "Eu vou" (migração 113).
//   • EuVouCompleto: página da festa (e a janela aberta pelos cartões da agenda). Botão, "N pessoas vão",
//     até 8 rostos de quem ligou "aparecer" (+N), o interruptor "Aparecer" e, ao tocar num rosto,
//     Denunciar / Bloquear.
//   • EuVouCompacto: cartões da agenda do bar. Botão e "N vão"; tocar no número abre o EuVouCompleto.
// Invisível por padrão; dá para desmarcar. Só maiores de 18 (o banco confere).
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import {
  AlvoEuVou, bloquear, Contagem, denunciar, desmarcar, fotosAssinadas, marcar, MOTIVOS, resumo, ResumoEuVou, Rosto, textoTotal,
} from '../lib/euVou';

const C = { card: '#161520', borda: '#232230', texto: '#F5F5F7', dim: '#A0A0B2', fraco: '#626274', rosa: '#E1306C', verde: '#4CAF7D', fundo: '#0B0B0E' };

function usarLogin() {
  const router = useRouter();
  return () =>
    Alert.alert('Entre na sua conta', 'Crie sua conta ou entre no app para marcar "Eu vou".', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Entrar / Criar conta', onPress: () => router.push('/(tabs)/profile') },
    ]);
}

function Avatar({ foto, nome, tamanho = 40 }: { foto?: string | null; nome?: string | null; tamanho?: number }) {
  const est = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };
  if (foto) return <Image source={{ uri: foto }} style={[est, s.avatarBorda]} />;
  return (
    <View style={[est, s.avatarBorda, s.avatarVazio]}>
      <Text style={[s.avatarLetra, { fontSize: tamanho * 0.4 }]}>{(nome || '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function EuVouCompleto({ alvo, aoMudar }: { alvo: AlvoEuVou; aoMudar?: (c: Contagem) => void }) {
  const { user, session } = useAuth();
  const pedirLogin = usarLogin();
  const [r, setR] = useState<ResumoEuVou | null>(null);
  const [ligado, setLigado] = useState(true); // false = sem a migração 113: não mostra nada
  const [enviando, setEnviando] = useState(false);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [pessoa, setPessoa] = useState<Rosto | null>(null);
  const [escolhendoMotivo, setEscolhendoMotivo] = useState(false);
  const chave = JSON.stringify(alvo);

  const aplicar = useCallback((x: ResumoEuVou) => {
    setR(x);
    aoMudar?.({ total: x.total, eu: x.euVou });
    const caminhos = x.rostos.map((p) => p.foto).filter(Boolean) as string[];
    if (caminhos.length) void fotosAssinadas(caminhos).then(setFotos).catch(() => {});
  }, [aoMudar]);

  const carregar = useCallback(async () => {
    const x = await resumo(JSON.parse(chave));
    if (!x) { setLigado(false); return; }
    setLigado(true);
    aplicar(x);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, user?.id]);
  useEffect(() => { void carregar(); }, [carregar]);

  const executar = async (f: () => Promise<ResumoEuVou>) => {
    setEnviando(true);
    try { aplicar(await f()); } catch (e: any) { Alert.alert('Eu vou', e?.message || 'Não deu certo agora.'); } finally { setEnviando(false); }
  };

  const alternar = () => {
    if (!session || !user) return pedirLogin();
    if (!r?.euVou) return void executar(() => marcar(alvo));
    Alert.alert('Desmarcar "Eu vou"?', 'Você sai da contagem e, se estava aparecendo, seu rosto some.', [
      { text: 'Continuar indo', style: 'cancel' },
      { text: 'Desmarcar', style: 'destructive', onPress: () => void executar(() => desmarcar(alvo)) },
    ]);
  };
  const mudarAparecer = (v: boolean) => void executar(() => marcar(alvo, v));

  const enviarDenuncia = async (motivo: string) => {
    if (!pessoa) return;
    const alvoPessoa = pessoa;
    setEscolhendoMotivo(false);
    setPessoa(null);
    try {
      await denunciar(alvoPessoa.id, motivo, alvo);
      Alert.alert('Denúncia enviada', 'Obrigada! A equipe Dicas analisa em até 24 horas. Quer bloquear esta pessoa também?', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Bloquear', style: 'destructive', onPress: () => void fazerBloqueio(alvoPessoa) },
      ]);
    } catch (e: any) {
      Alert.alert('Não foi possível enviar', e?.message || 'Tente de novo em alguns instantes.');
    }
  };
  const fazerBloqueio = async (p: Rosto) => {
    try {
      await bloquear(p.id);
      setR((x) => (x ? { ...x, rostos: x.rostos.filter((y) => y.id !== p.id), mais: x.mais + 1 } : x));
      Alert.alert('Pessoa bloqueada', 'Vocês não se veem mais no "Eu vou" nem nas avaliações.');
    } catch (e: any) {
      Alert.alert('Não foi possível bloquear', e?.message || 'Tente de novo em alguns instantes.');
    }
  };
  const confirmarBloqueio = () => {
    if (!pessoa) return;
    const p = pessoa;
    setPessoa(null);
    Alert.alert(`Bloquear ${p.nome || 'esta pessoa'}?`, 'Vocês deixam de se ver no "Eu vou". Ela não é avisada.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: () => void fazerBloqueio(p) },
    ]);
  };

  if (!ligado) return null;
  if (!r) return <View style={[s.card, { alignItems: 'center' }]}><ActivityIndicator color={C.rosa} /></View>;

  return (
    <View style={s.card}>
      <View style={s.topo}>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>{r.total ? textoTotal(r.total) : 'Ninguém marcou ainda'}</Text>
          <Text style={s.sub}>
            {r.euVou ? (r.euApareco ? 'Você aparece para quem também vai.' : 'Você está invisível: só conta no número.') : 'Marque "Eu vou" e veja quem mais vai.'}
          </Text>
        </View>
        <TouchableOpacity style={[s.botao, r.euVou && s.botaoOn]} onPress={alternar} disabled={enviando} accessibilityRole="button" accessibilityState={{ selected: r.euVou, busy: enviando }} accessibilityLabel={r.euVou ? 'Eu vou, marcado. Toque para desmarcar' : 'Marcar Eu vou'}>
          {enviando ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name={r.euVou ? 'check' : 'plus'} size={16} color="#FFF" />}
          <Text style={s.botaoTxt}>Eu vou</Text>
        </TouchableOpacity>
      </View>

      {r.rostos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rostos}>
          {r.rostos.map((p) => {
            const eu = p.id === user?.id;
            return (
              <TouchableOpacity key={p.id} style={s.rosto} disabled={eu} onPress={() => setPessoa(p)} accessibilityLabel={eu ? 'Você' : `${p.nome || 'Pessoa'}. Toque para denunciar ou bloquear`}>
                <Avatar foto={p.foto ? fotos[p.foto] : null} nome={p.nome} />
                <Text style={s.rostoNome} numberOfLines={1}>{eu ? 'Você' : p.nome || '—'}</Text>
              </TouchableOpacity>
            );
          })}
          {r.mais > 0 && (
            <View style={s.rosto}>
              <View style={[s.avatarBorda, s.mais]}><Text style={s.maisTxt}>+{r.mais}</Text></View>
              <Text style={s.rostoNome} numberOfLines={1}>{r.rostos.length >= 8 ? 'e mais' : 'invisíveis'}</Text>
            </View>
          )}
        </ScrollView>
      )}
      {r.total > 0 && !r.rostos.length && (
        <Text style={s.nota}>
          {!session ? 'Entre na sua conta para ver quem vai.' : !r.possoVerRostos ? 'Os rostos aparecem só para maiores de 18 com a data de nascimento na Conta.' : 'Por enquanto, todo mundo está invisível.'}
        </Text>
      )}

      {r.euVou && (
        <View style={s.aparecer}>
          <View style={{ flex: 1 }}>
            <Text style={s.aparecerTit}>Aparecer para quem também vai</Text>
            <Text style={s.aparecerSub}>Primeiro nome e foto. Some quando o evento acaba.</Text>
          </View>
          <Switch value={r.euApareco} onValueChange={mudarAparecer} disabled={enviando} trackColor={{ true: C.verde, false: '#3A3950' }} thumbColor="#FFF" accessibilityLabel="Aparecer para quem também vai" />
        </View>
      )}

      <Modal visible={!!pessoa} transparent animationType="fade" onRequestClose={() => { setPessoa(null); setEscolhendoMotivo(false); }}>
        <Pressable style={s.veu} onPress={() => { setPessoa(null); setEscolhendoMotivo(false); }}>
          <Pressable style={s.folha} onPress={() => {}}>
            {pessoa && (
              <>
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Avatar foto={pessoa.foto ? fotos[pessoa.foto] : null} nome={pessoa.nome} tamanho={64} />
                  <Text style={s.folhaNome}>{pessoa.nome || 'Pessoa'}</Text>
                </View>
                {escolhendoMotivo ? (
                  <View style={{ marginTop: 14, gap: 6 }}>
                    <Text style={s.folhaPergunta}>O que aconteceu?</Text>
                    {MOTIVOS.map((m) => (
                      <TouchableOpacity key={m.valor} style={s.opcao} onPress={() => void enviarDenuncia(m.valor)} accessibilityRole="button">
                        <Text style={s.opcaoTxt}>{m.rotulo}</Text>
                        <Feather name="chevron-right" size={16} color={C.fraco} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={{ marginTop: 14, gap: 8 }}>
                    <TouchableOpacity style={s.opcao} onPress={() => setEscolhendoMotivo(true)} accessibilityRole="button">
                      <Feather name="flag" size={16} color={C.rosa} /><Text style={[s.opcaoTxt, { flex: 1 }]}>Denunciar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.opcao} onPress={confirmarBloqueio} accessibilityRole="button">
                      <Feather name="slash" size={16} color={C.rosa} /><Text style={[s.opcaoTxt, { flex: 1 }]}>Bloquear</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={s.fechar} onPress={() => { setPessoa(null); setEscolhendoMotivo(false); }} accessibilityRole="button">
                  <Text style={s.fecharTxt}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function EuVouCompacto({ alvo, contagem, aoMudar }: { alvo: AlvoEuVou; contagem?: Contagem; aoMudar: (c: Contagem) => void }) {
  const { user, session } = useAuth();
  const pedirLogin = usarLogin();
  const [enviando, setEnviando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const c = contagem || { total: 0, eu: false };

  const alternar = async () => {
    if (!session || !user) return pedirLogin();
    setEnviando(true);
    try {
      const x = c.eu ? await desmarcar(alvo) : await marcar(alvo);
      aoMudar({ total: x.total, eu: x.euVou });
    } catch (e: any) {
      Alert.alert('Eu vou', e?.message || 'Não deu certo agora.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={s.compacto}>
      <TouchableOpacity style={[s.pilula, c.eu && s.botaoOn]} onPress={() => void alternar()} disabled={enviando} hitSlop={{ top: 6, bottom: 6 }} accessibilityRole="button" accessibilityState={{ selected: c.eu, busy: enviando }} accessibilityLabel={c.eu ? 'Eu vou, marcado. Toque para desmarcar' : 'Marcar Eu vou'}>
        {enviando ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name={c.eu ? 'check' : 'plus'} size={12} color="#FFF" />}
        <Text style={s.pilulaTxt}>Eu vou</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setAberto(true)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel={`${c.total ? textoTotal(c.total) : 'Ninguém marcou ainda'}. Ver quem vai`}>
        <Text style={s.compactoTxt}>{c.total ? (c.total === 1 ? '1 vai' : `${c.total} vão`) : 'Ver quem vai'}</Text>
      </TouchableOpacity>
      <Modal visible={aberto} transparent animationType="slide" onRequestClose={() => setAberto(false)}>
        <Pressable style={s.veu} onPress={() => setAberto(false)}>
          <Pressable style={s.folha} onPress={() => {}}>
            <EuVouCompleto alvo={alvo} aoMudar={aoMudar} />
            <TouchableOpacity style={s.fechar} onPress={() => setAberto(false)} accessibilityRole="button"><Text style={s.fecharTxt}>Fechar</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 16, padding: 14, marginVertical: 10 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { color: C.texto, fontSize: 15, fontWeight: '800' },
  sub: { color: C.dim, fontSize: 12, marginTop: 2 },
  botao: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.rosa, borderRadius: 999, paddingHorizontal: 16, minHeight: 44 },
  botaoOn: { backgroundColor: C.verde },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  rostos: { gap: 10, paddingTop: 12 },
  rosto: { width: 48, alignItems: 'center' },
  rostoNome: { color: C.dim, fontSize: 10, marginTop: 4, maxWidth: 48 },
  avatarBorda: { borderWidth: 2, borderColor: C.borda },
  avatarVazio: { backgroundColor: '#2A1530', alignItems: 'center', justifyContent: 'center' },
  avatarLetra: { color: '#FFF', fontWeight: '800' },
  mais: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#232230', alignItems: 'center', justifyContent: 'center' },
  maisTxt: { color: C.texto, fontSize: 12, fontWeight: '800' },
  nota: { color: C.fraco, fontSize: 12, marginTop: 10 },
  aparecer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borda },
  aparecerTit: { color: C.texto, fontSize: 13, fontWeight: '700' },
  aparecerSub: { color: C.fraco, fontSize: 11, marginTop: 2 },
  veu: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  folha: { backgroundColor: C.fundo, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 32, borderColor: C.borda, borderWidth: 1 },
  folhaNome: { color: C.texto, fontSize: 17, fontWeight: '800' },
  folhaPergunta: { color: C.dim, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, justifyContent: 'space-between' },
  opcaoTxt: { color: C.texto, fontSize: 14, fontWeight: '600' },
  fechar: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 10 },
  fecharTxt: { color: C.dim, fontSize: 14, fontWeight: '700' },
  compacto: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  pilula: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.rosa, borderRadius: 999, paddingHorizontal: 12, minHeight: 30 },
  pilulaTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  compactoTxt: { color: '#B39DDB', fontSize: 12, fontWeight: '700' },
});
