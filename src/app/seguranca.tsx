// Segurança (migração 136): Cheguei bem, Me ajuda aqui, Emergência e contatos de confiança.
// O básico de segurança é sempre grátis. Emergência funciona até sem conta.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TopoApp from '../components/TopoApp';
import { TituloTela } from '../components/CabecalhoTela';
import { useAuth } from '../lib/authContext';
import { TITULO_SECAO } from '../constants/theme';
import {
  abrirSms, abrirWhats, adicionarContato, atualizarLocalDaVolta, cancelarVolta, CasaAjuda, casasParaPedirAjuda, chegueiBem, Contato,
  estenderVolta, iniciarVolta, linkMapa, meuPedidoDeAjuda, meusContatos, minhaPosicao, minhaVoltaAtiva, NUMEROS, PedidoAjuda, pedirAjuda,
  removerContato, telefoneBonito, textoVolta, Volta,
} from '../lib/seguranca';

const C = { bg: '#0B0A10', card: '#161520', borda: '#232230', texto: '#FFFFFF', dim: '#A0A0B2', fraco: '#626274', verde: '#34D399', rosa: '#E1306C', vermelho: '#EF4444', amarelo: '#F2C94C' };
const TEMPOS = [15, 30, 45, 60];
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function Seguranca() {
  const router = useRouter();
  const { user } = useAuth();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [volta, setVolta] = useState<Volta | null>(null);
  const [casas, setCasas] = useState<CasaAjuda[]>([]);
  const [pedido, setPedido] = useState<PedidoAjuda | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [minutos, setMinutos] = useState(30);
  const [avisar, setAvisar] = useState(false);          // mostra a lista "avisar meus contatos" depois de começar
  const [msgAjuda, setMsgAjuda] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoTel, setNovoTel] = useState('');
  const [addAberto, setAddAberto] = useState(false);

  const carregar = useCallback(async () => {
    if (!user) { setCarregando(false); return; }
    const [c, v, k, p] = await Promise.all([meusContatos(), minhaVoltaAtiva(), casasParaPedirAjuda(), meuPedidoDeAjuda()]);
    setContatos(c); setVolta(v); setCasas(k); setPedido(p); setCarregando(false);
    if (v) void atualizarLocalDaVolta();
  }, [user?.id]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const rodar = async (chave: string, f: () => Promise<void>) => {
    setOcupado(chave);
    try { await f(); } catch (e: any) { Alert.alert('Não deu', e?.message || 'Tente de novo.'); } finally { setOcupado(null); }
  };

  // ── Cheguei bem
  const comecar = () => rodar('comecar', async () => {
    await iniciarVolta(minutos, casas[0]?.id ?? null);
    await carregar();
    setAvisar(true);
  });
  const confirmar = () => rodar('chegou', async () => {
    await chegueiBem();
    setVolta(null); setAvisar(false);
    Alert.alert('Que bom! 💚', 'Quem te acompanha pelo app foi avisado. Se mandou o link, ele já mostra que você chegou bem.');
  });
  const estender = (m: number) => rodar('estender', async () => { const p = await estenderVolta(m); setVolta((v) => (v ? { ...v, previsao: p, status: 'a_caminho' } : v)); });
  const cancelar = () => Alert.alert('Cancelar a volta?', 'Seus amigos não vão receber alerta.', [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Cancelar volta', style: 'destructive', onPress: () => rodar('cancelar', async () => { await cancelarVolta(); setVolta(null); setAvisar(false); }) },
  ]);
  const texto = volta ? textoVolta(volta.token, volta.previsao, volta.local_nome) : '';

  // ── Me ajuda aqui
  const chamarEquipe = (c: CasaAjuda) => Alert.alert(`Chamar a equipe do ${c.nome}?`, 'A equipe recebe um alerta com seu primeiro nome. Ninguém mais fica sabendo.', [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Chamar', onPress: () => rodar('ajuda', async () => {
      const r = await pedirAjuda(c.id, msgAjuda);
      setMsgAjuda('');
      setPedido(await meuPedidoDeAjuda());
      Alert.alert(r.repetido ? 'A equipe já foi chamada' : 'Equipe avisada', r.avisados === 0
        ? 'A casa não está com notificações ligadas agora. Procure alguém da equipe ou, se for urgente, ligue 190.'
        : 'Fique em um lugar com gente por perto. Você recebe um aviso quando alguém estiver indo até você.');
    }) },
  ]);

  // ── Emergência
  const mandarLocalizacao = () => rodar('loc', async () => {
    if (contatos.length === 0) { Alert.alert('Sem contatos', 'Cadastre um contato de confiança abaixo.'); return; }
    const pos = await minhaPosicao(true);
    const t = `🚨 Preciso de ajuda. ${pos ? `Estou aqui: ${linkMapa(pos.lat, pos.lng)}` : 'Não consegui pegar minha localização.'} Me liga.`;
    if (contatos.length === 1) { await abrirWhats(contatos[0].telefone, t); return; }
    Alert.alert('Mandar para quem?', 'Abre o WhatsApp com a mensagem pronta.', [
      ...contatos.map((c) => ({ text: c.nome, onPress: () => { void abrirWhats(c.telefone, t); } })),
      { text: 'Voltar', style: 'cancel' as const },
    ]);
  });

  // ── Contatos
  const salvarContato = () => rodar('contato', async () => {
    await adicionarContato(novoNome, novoTel);
    setNovoNome(''); setNovoTel(''); setAddAberto(false);
    setContatos(await meusContatos());
  });
  const apagarContato = (c: Contato) => Alert.alert(`Remover ${c.nome}?`, undefined, [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: () => rodar('rm', async () => { await removerContato(c.id); setContatos(await meusContatos()); }) },
  ]);

  return (
    <View style={s.tela}>
      <TopoApp voltar />
      <TituloTela titulo="Segurança" discreto />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        {/* EMERGÊNCIA — sempre visível, até sem conta */}
        <View style={[s.card, { borderColor: C.vermelho + '66' }]}>
          <View style={s.cabeca}><Feather name="alert-octagon" size={18} color={C.vermelho} /><Text style={s.cardTit}>Emergência</Text></View>
          <TouchableOpacity style={[s.btn, { backgroundColor: C.vermelho }]} onPress={() => Linking.openURL(NUMEROS.policia)} accessibilityRole="button">
            <Feather name="phone" size={16} color="#FFF" /><Text style={s.btnTxt}>Ligar 190 · Polícia</Text>
          </TouchableOpacity>
          <View style={s.linha2}>
            <TouchableOpacity style={s.btnSec} onPress={() => Linking.openURL(NUMEROS.samu)} accessibilityRole="button"><Text style={s.btnSecTxt}>192 · SAMU</Text></TouchableOpacity>
            <TouchableOpacity style={s.btnSec} onPress={() => Linking.openURL(NUMEROS.disque100)} accessibilityRole="button"><Text style={s.btnSecTxt}>Disque 100</Text></TouchableOpacity>
          </View>
          {!!user && (
            <TouchableOpacity style={[s.btnSec, { marginTop: 8 }]} onPress={mandarLocalizacao} disabled={!!ocupado} accessibilityRole="button">
              {ocupado === 'loc' ? <ActivityIndicator color={C.texto} /> : <Text style={s.btnSecTxt}>Mandar minha localização</Text>}
            </TouchableOpacity>
          )}
        </View>

        {!user ? (
          <View style={s.card}>
            <Text style={s.cardTit}>Entre na sua conta</Text>
            <Text style={s.sub}>Para usar o "Cheguei bem", chamar a equipe da casa e salvar contatos de confiança.</Text>
            <TouchableOpacity style={[s.btn, { backgroundColor: C.rosa, marginTop: 12 }]} onPress={() => router.push('/(tabs)/profile' as any)}><Text style={s.btnTxt}>Entrar</Text></TouchableOpacity>
          </View>
        ) : carregando ? <ActivityIndicator color={C.rosa} style={{ marginTop: 24 }} /> : (
          <>
            {/* CHEGUEI BEM */}
            <View style={[s.card, volta && { borderColor: (volta.status === 'atrasada' ? C.amarelo : C.verde) + '88' }]}>
              <View style={s.cabeca}><Feather name="home" size={18} color={C.verde} /><Text style={s.cardTit}>Cheguei bem</Text></View>
              {volta ? (
                <>
                  <Text style={[s.grande, volta.status === 'atrasada' && { color: C.amarelo }]}>
                    {volta.status === 'atrasada' ? `Passou do horário (${hhmm(volta.previsao)})` : `Voltando · chegar até ${hhmm(volta.previsao)}`}
                  </Text>
                  <Text style={s.sub}>{volta.status === 'atrasada' ? 'Quem te acompanha já foi avisado. Confirme se chegou ou estenda o tempo.' : 'Se não confirmar até 10 minutos depois, quem te acompanha recebe um alerta.'}</Text>
                  <TouchableOpacity style={[s.btn, { backgroundColor: C.verde, marginTop: 12 }]} onPress={confirmar} disabled={!!ocupado} accessibilityRole="button">
                    {ocupado === 'chegou' ? <ActivityIndicator color="#0B0A10" /> : <><Feather name="check" size={18} color="#0B0A10" /><Text style={[s.btnTxt, { color: '#0B0A10' }]}>Cheguei bem</Text></>}
                  </TouchableOpacity>
                  <View style={s.linha2}>
                    <TouchableOpacity style={s.btnSec} onPress={() => estender(15)} disabled={!!ocupado}><Text style={s.btnSecTxt}>+15 min</Text></TouchableOpacity>
                    <TouchableOpacity style={s.btnSec} onPress={() => estender(30)} disabled={!!ocupado}><Text style={s.btnSecTxt}>+30 min</Text></TouchableOpacity>
                    <TouchableOpacity style={s.btnSec} onPress={() => setAvisar(!avisar)}><Text style={s.btnSecTxt}>Avisar amigos</Text></TouchableOpacity>
                  </View>
                  {avisar && (
                    <View style={s.avisar}>
                      <Text style={s.miniTit}>Mande o link para quem vai te acompanhar</Text>
                      {contatos.map((c) => (
                        <View key={c.id} style={s.contatoLinha}>
                          <Text style={[s.contatoNome, { flex: 1 }]}>{c.nome}</Text>
                          <TouchableOpacity style={[s.chip, { backgroundColor: '#25D366' }]} onPress={() => abrirWhats(c.telefone, texto)}><Text style={s.chipTxt}>WhatsApp</Text></TouchableOpacity>
                          <TouchableOpacity style={s.chip} onPress={() => abrirSms(c.telefone, texto)}><Text style={s.chipTxt}>SMS</Text></TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity onPress={() => Share.share({ message: texto })} style={{ paddingVertical: 8 }}><Text style={s.link}>Mandar para outra pessoa</Text></TouchableOpacity>
                      <Text style={s.nota}>Quem tem o app e abre o link recebe a notificação se você atrasar. O link some 12h depois.</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={cancelar} style={{ paddingTop: 10 }}><Text style={[s.link, { color: C.fraco }]}>Cancelar volta</Text></TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.sub}>Diga em quanto tempo chega. Se não confirmar, seus contatos são avisados.</Text>
                  <View style={s.tempos}>
                    {TEMPOS.map((m) => (
                      <TouchableOpacity key={m} style={[s.tempo, minutos === m && s.tempoOn]} onPress={() => setMinutos(m)} accessibilityRole="button" accessibilityState={{ selected: minutos === m }}>
                        <Text style={[s.tempoTxt, minutos === m && { color: '#0B0A10' }]}>{m < 60 ? `${m} min` : '1h'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={[s.btn, { backgroundColor: C.verde, marginTop: 12 }]} onPress={comecar} disabled={!!ocupado} accessibilityRole="button">
                    {ocupado === 'comecar' ? <ActivityIndicator color="#0B0A10" /> : <Text style={[s.btnTxt, { color: '#0B0A10' }]}>Começar a volta</Text>}
                  </TouchableOpacity>
                  {contatos.length === 0 && <Text style={s.nota}>Cadastre contatos abaixo para mandar o link com 1 toque.</Text>}
                </>
              )}
            </View>

            {/* ME AJUDA AQUI */}
            <View style={s.card}>
              <View style={s.cabeca}><Feather name="shield" size={18} color={C.rosa} /><Text style={s.cardTit}>Me ajuda aqui</Text></View>
              <Text style={s.sub}>A equipe da casa recebe um alerta discreto e vem até você.</Text>
              {pedido && (
                <View style={[s.status, { borderColor: (pedido.status === 'indo' ? C.verde : C.amarelo) + '88' }]}>
                  <Feather name={pedido.status === 'indo' ? 'user-check' : 'clock'} size={15} color={pedido.status === 'indo' ? C.verde : C.amarelo} />
                  <Text style={[s.sub, { marginTop: 0, flex: 1, color: C.texto }]}>{pedido.status === 'indo' ? `A equipe do ${pedido.casa} está indo até você.` : `Equipe do ${pedido.casa} avisada às ${hhmm(pedido.criado_em)}.`}</Text>
                </View>
              )}
              {casas.length === 0 ? (
                <>
                  <Text style={s.nota}>Funciona na casa onde você fez check-in ou "Estou aqui agora".</Text>
                  <TouchableOpacity style={[s.btnSec, { marginTop: 8 }]} onPress={() => router.push('/termometro' as any)}><Text style={s.btnSecTxt}>Fazer "Estou aqui agora"</Text></TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput value={msgAjuda} onChangeText={setMsgAjuda} placeholder="O que está acontecendo? (opcional)" placeholderTextColor={C.fraco} style={s.input} maxLength={140} />
                  {casas.map((c) => (
                    <TouchableOpacity key={c.id} style={[s.btn, { backgroundColor: C.rosa, marginTop: 8 }]} onPress={() => chamarEquipe(c)} disabled={!!ocupado} accessibilityRole="button">
                      {ocupado === 'ajuda' ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnTxt}>Chamar a equipe do {c.nome}</Text>}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>

            {/* CONTATOS DE CONFIANÇA */}
            <View style={s.card}>
              <View style={s.cabeca}><Feather name="users" size={18} color={C.dim} /><Text style={s.cardTit}>Contatos de confiança</Text></View>
              <Text style={s.sub}>Até 3 pessoas. Nada é enviado sem você tocar.</Text>
              {contatos.map((c) => (
                <View key={c.id} style={s.contatoLinha}>
                  <View style={{ flex: 1 }}><Text style={s.contatoNome}>{c.nome}</Text><Text style={s.nota}>{telefoneBonito(c.telefone)}</Text></View>
                  <TouchableOpacity onPress={() => apagarContato(c)} accessibilityLabel={`Remover ${c.nome}`}><Feather name="trash-2" size={16} color={C.fraco} /></TouchableOpacity>
                </View>
              ))}
              {contatos.length < 3 && (addAberto ? (
                <View style={{ marginTop: 8 }}>
                  <TextInput value={novoNome} onChangeText={setNovoNome} placeholder="Nome" placeholderTextColor={C.fraco} style={s.input} maxLength={40} />
                  <TextInput value={novoTel} onChangeText={setNovoTel} placeholder="Celular com DDD" placeholderTextColor={C.fraco} style={s.input} keyboardType="phone-pad" maxLength={20} />
                  <TouchableOpacity style={[s.btn, { backgroundColor: C.rosa, marginTop: 8 }]} onPress={salvarContato} disabled={!!ocupado}>
                    {ocupado === 'contato' ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnTxt}>Salvar contato</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={[s.btnSec, { marginTop: 10 }]} onPress={() => setAddAberto(true)}><Text style={s.btnSecTxt}>+ Adicionar contato</Text></TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* MAIS AJUDA — os links que antes ficavam soltos na Emergência */}
        <Text style={s.secao}>Mais ajuda</Text>
        <View style={[s.card, { paddingVertical: 4 }]}>
          {[
            { icone: 'map', txt: 'Serviços LGBT+ perto de você', go: () => router.push('/servicos' as any) },
            { icone: 'file-text', txt: 'Registrar uma ocorrência', go: () => router.push('/denunciar' as any) },
            { icone: 'message-circle', txt: 'Disque 100 no WhatsApp', go: () => Linking.openURL(NUMEROS.disque100Whats) },
          ].map((l, i) => (
            <TouchableOpacity key={l.txt} style={[s.maisLinha, i > 0 && s.maisBorda]} onPress={l.go} accessibilityRole="button">
              <Feather name={l.icone as any} size={16} color={C.dim} />
              <Text style={s.maisTxt}>{l.txt}</Text>
              <Feather name="chevron-right" size={16} color={C.fraco} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: C.bg },
  secao: { ...TITULO_SECAO, fontSize: 12, color: C.dim, marginTop: 8, marginBottom: 8, marginLeft: 4 },
  maisLinha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  maisBorda: { borderTopWidth: 1, borderTopColor: C.borda },
  maisTxt: { flex: 1, color: C.texto, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borda, borderRadius: 18, padding: 16, marginBottom: 12 },
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTit: { color: C.texto, fontSize: 16, fontWeight: '800' },
  grande: { color: C.verde, fontSize: 17, fontWeight: '800', marginTop: 4 },
  sub: { color: C.dim, fontSize: 13, lineHeight: 18, marginTop: 2 },
  nota: { color: C.fraco, fontSize: 12, lineHeight: 17, marginTop: 8 },
  miniTit: { color: C.texto, fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 6 },
  btnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  linha2: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnSec: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borda, backgroundColor: '#1D1C29', borderRadius: 12, paddingVertical: 11 },
  btnSecTxt: { color: C.texto, fontSize: 13, fontWeight: '700' },
  link: { color: C.rosa, fontSize: 13, fontWeight: '700' },
  tempos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tempo: { borderWidth: 1, borderColor: C.borda, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  tempoOn: { backgroundColor: C.verde, borderColor: C.verde },
  tempoTxt: { color: C.texto, fontSize: 13, fontWeight: '700' },
  avisar: { marginTop: 12, borderTopWidth: 1, borderTopColor: C.borda, paddingTop: 4 },
  contatoLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  contatoNome: { color: C.texto, fontSize: 14, fontWeight: '700' },
  chip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#2A2938' },
  chipTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: C.borda, backgroundColor: '#0F0E16', borderRadius: 12, color: C.texto, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginTop: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 10 },
});
