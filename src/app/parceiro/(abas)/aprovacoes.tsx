// Rodada 145 — aba Aprovações: a ÚNICA tela de operação do parceiro, para não confundir.
// Tudo o que o cliente mostra ou pede passa por aqui: QR da Lista VIP, código de check-in/cupom,
// porta da festa de hoje, pedidos de Lista VIP e check-ins a confirmar. Pensada para a noite corrida do bar.
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';
import FundoCaixaDegrade from '../../../components/FundoCaixaDegrade';
import { CP, TelaParceiro, TituloSecao } from '../../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../../lib/modoParceiro';
import { PedidoVip, ReservaPendente, responderPedido, responderReserva, usePendencias } from '../../../lib/pendencias';
import { supabase } from '../../../lib/supabase';

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');

export default function Aprovacoes() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const P = usePendencias(localAtivo, pode, 30000);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [camera, setCamera] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const [permissao, pedirPermissao] = useCameraPermissions();
  const lido = useRef<string | null>(null);

  useFocusEffect(useCallback(() => { void P.recarregar(); }, [P.recarregar])); // eslint-disable-line react-hooks/exhaustive-deps

  if (!localAtivo) return null;

  // ---------- validar: QR da Lista VIP ou código (pedido da festa de hoje ou check-in/cupom) ----------
  const abrirPedido = (id: string) => router.push({ pathname: '/parceiro/porta', params: { pedido: id } });
  const validar = async (bruto: string) => {
    const txt = (bruto || '').trim();
    const qr = /^dicasvip:([0-9a-f-]{36})$/i.exec(txt);
    if (qr) { Vibration.vibrate(60); setCamera(false); return abrirPedido(qr[1].toLowerCase()); }
    const c = txt.replace(/[^0-9a-z]/gi, '').toUpperCase().slice(0, 6);
    if (c.length < 6) return Alert.alert('Código', 'O código tem 6 letras e números.');
    setValidando(true);
    try {
      // 1) pedido de Lista VIP da festa de hoje (código = 6 primeiros caracteres do pedido)
      if (P.festaHoje) {
        const { data } = await supabase.from('listas_vip_solicitacoes').select('id, listas_vip!inner(evento_id)').eq('listas_vip.evento_id', P.festaHoje.id);
        const achado = ((data as { id: string }[]) || []).find((x) => x.id.replace(/-/g, '').slice(0, 6).toUpperCase() === c);
        if (achado) { setCodigo(''); setCamera(false); Vibration.vibrate(60); return abrirPedido(achado.id); }
      }
      // 2) check-in (com ou sem cupom)
      if (!pode('checkins')) return Alert.alert('Código não encontrado', 'Não achei este código na Lista VIP de hoje.');
      const { data, error } = await supabase.rpc('validar_checkin', { p_codigo: c });
      if (error) {
        const m = error.message || '';
        return Alert.alert('Não foi possível validar',
          /não encontrado/i.test(m) ? 'Código não encontrado. Confira as letras e números.'
          : /já foi usado/i.test(m) ? 'Este código já foi usado.'
          : /expirado/i.test(m) ? 'Este código expirou. Peça para o cliente gerar outro no app.'
          : /cancelado/i.test(m) ? 'Este check-in foi cancelado.'
          : /permissão/i.test(m) ? 'Este código é de outro local.' : m);
      }
      Vibration.vibrate(120);
      setCodigo(''); setCamera(false);
      Alert.alert('Check-in confirmado ✔', (data as { cupom_id?: string | null })?.cupom_id ? 'Cupom liberado para o cliente e visita somada no cartão fidelidade.' : 'Visita somada no cartão fidelidade.');
      void P.recarregar();
    } finally { setValidando(false); }
  };
  const aoLerQR = ({ data }: { data: string }) => {
    if (lido.current === data) return;
    lido.current = data; setTimeout(() => { lido.current = null; }, 2500);
    void validar(data);
  };
  const abrirCamera = async () => {
    if (!permissao?.granted) {
      const r = await pedirPermissao();
      if (!r.granted) return Alert.alert('Câmera bloqueada', 'Libere a câmera para o Dicas LGBT+ nos Ajustes do celular. Enquanto isso, digite o código.');
    }
    setCamera(true);
  };

  const responder = async (ped: PedidoVip, status: 'aprovada' | 'rejeitada') => {
    setOcupado(ped.id);
    const r = await responderPedido(ped.id, status);
    setOcupado(null);
    if (r === 'cheia') return Alert.alert('Lista cheia', 'A Lista VIP desta festa já atingiu o limite de vagas.');
    if (r === 'sem_permissao') return Alert.alert('Sem permissão', 'O seu acesso não permite responder a Lista VIP agora.');
    if (r === 'erro') return Alert.alert('Não foi possível', 'Tente de novo em instantes.');
    Vibration.vibrate(30);
    void P.recarregar();
  };

  const aprovarTodos = (festaId: string, titulo: string, lista: PedidoVip[]) =>
    Alert.alert('Aprovar todos', `Aprovar os ${lista.length} pedidos de "${titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprovar todos',
        onPress: async () => {
          setOcupado(festaId);
          let cheia = false;
          for (const p of lista) { const r = await responderPedido(p.id, 'aprovada'); if (r === 'cheia') { cheia = true; break; } }
          setOcupado(null);
          if (cheia) Alert.alert('Lista cheia', 'Parte dos pedidos foi aprovada; a lista atingiu o limite de vagas.');
          void P.recarregar();
        },
      },
    ]);

  const confirmarCheckin = async (codigo: string, id: string) => {
    setOcupado(id);
    const { error } = await supabase.rpc('validar_checkin', { p_codigo: codigo });
    setOcupado(null);
    if (error) return Alert.alert('Não foi possível', error.message.includes('expirado') ? 'Este código já expirou.' : error.message);
    Vibration.vibrate(30);
    void P.recarregar();
  };
  const cancelarCheckin = (id: string) =>
    Alert.alert('Cancelar check-in', 'A visita não conta no cartão fidelidade e o cupom volta para o cliente.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar check-in', style: 'destructive', onPress: async () => { setOcupado(id); await supabase.rpc('cancelar_checkin_local', { p_checkin_id: id }); setOcupado(null); void P.recarregar(); } },
    ]);

  // pedidos agrupados por festa
  const porFesta = P.vip.reduce<Record<string, { titulo: string; data: string; itens: PedidoVip[] }>>((acc, p) => {
    (acc[p.festa.id] ||= { titulo: p.festa.titulo, data: p.festa.data_inicio, itens: [] }).itens.push(p);
    return acc;
  }, {});
  const tudoEmDia = !P.festaHoje && !P.vip.length && !P.checkins.length && !P.reservas.length;
  const OCASIAO: Record<string, string> = { date: 'date', aniversario: 'aniversário', amigos: 'amigos', trabalho: 'trabalho', outro: 'outro' };
  const diaReserva = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
  const tratarReserva = async (rv: ReservaPendente, status: 'confirmada' | 'recusada') => {
    setOcupado(rv.id);
    const erro = await responderReserva(rv.id, status);
    setOcupado(null);
    if (erro) return Alert.alert('Não foi possível', erro);
    Vibration.vibrate(30);
    void P.recarregar();
  };
  const abrirDetalheReserva = (rv: ReservaPendente) =>
    Alert.alert(
      `${rv.nome} · ${rv.pessoas} pessoa${rv.pessoas > 1 ? 's' : ''}`,
      `${rv.area} · ${diaReserva(rv.data)} às ${rv.horario}${rv.ocasiao ? `\nOcasião: ${OCASIAO[rv.ocasiao] || rv.ocasiao}` : ''}${rv.observacao ? `\n“${rv.observacao}”` : ''}`,
      [
        { text: 'Fechar', style: 'cancel' },
        ...(rv.telefone ? [{ text: 'Chamar no WhatsApp', onPress: () => void Linking.openURL(`https://api.whatsapp.com/send?phone=${rv.telefone!.replace(/\D/g, '').replace(/^(?!55)/, '55')}`) }] : []),
      ],
    );

  const atualizar = async () => { setAtualizando(true); await P.recarregar(); setAtualizando(false); };

  return (
    <TelaParceiro titulo="Aprovações" subtitulo="QR, código, Lista VIP, check-in e cupom: tudo o que precisa de resposta, num lugar só." atualizando={atualizando} aoAtualizar={atualizar}>
      {/* Validar: um lugar só para QR da Lista VIP e código de check-in/cupom */}
      {(pode('porta') || pode('lista_vip') || pode('checkins')) && (
        <View style={e.validar}>
          {camera ? (
            <View style={e.cameraCaixa}>
              <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={aoLerQR} />
              <View style={e.mira} pointerEvents="none" />
              <TouchableOpacity style={e.fecharCamera} onPress={() => setCamera(false)} accessibilityLabel="Fechar câmera"><Feather name="x" size={20} color="#FFF" /></TouchableOpacity>
              <Text style={e.cameraDica}>Aponte para o QR no celular do cliente</Text>
            </View>
          ) : (
            <TouchableOpacity style={e.botaoQR} onPress={abrirCamera} activeOpacity={0.88} accessibilityRole="button">
              <Feather name="maximize" size={24} color="#FFF" />
              <View><Text style={e.botaoQRTxt}>Ler QR do cliente</Text><Text style={e.botaoQRSub}>Lista VIP na porta</Text></View>
            </TouchableOpacity>
          )}
          <View style={e.codigoLinha}>
            <TextInput
              style={e.codigoInput} value={codigo} onChangeText={setCodigo} placeholder="Ou digite o código (6)"
              placeholderTextColor={CP.fraco} autoCapitalize="characters" autoCorrect={false} maxLength={8}
              onSubmitEditing={() => validar(codigo)} returnKeyType="done"
            />
            <TouchableOpacity style={e.codigoBotao} onPress={() => validar(codigo)} disabled={validando}>
              {validando ? <ActivityIndicator color="#FFF" /> : <Text style={e.codigoBotaoTxt}>Validar</Text>}
            </TouchableOpacity>
          </View>
          <Text style={e.validarDica}>Serve para Lista VIP, check-in e cupom: o app descobre sozinho o que é.</Text>
        </View>
      )}

      {/* Resumo em 3 quadradinhos */}
      <View style={e.resumo}>
        <Resumo n={P.vip.length} rotulo="Lista VIP" icone="users" cor="#9B3CFF" />
        <Resumo n={P.checkins.length} rotulo="Check-ins" icone="check-circle" cor="#4CAF7D" />
        <Resumo n={P.festaHoje ? P.festaHoje.faltam : 0} rotulo="Faltam entrar" icone="log-in" cor="#E1306C" />
      </View>

      {P.carregando && tudoEmDia && !P.emAnalise.length ? <ActivityIndicator color={CP.rosa} style={{ marginTop: 24 }} /> : null}

      {/* Porta da festa de hoje */}
      {P.festaHoje && (pode('porta') || pode('lista_vip')) && (
        <TouchableOpacity style={e.porta} onPress={() => router.push('/parceiro/porta')} activeOpacity={0.88} accessibilityRole="button">
          <FundoCaixaDegrade id="aprov-porta" cores={['#C2185B', '#6A1B9A']} />
          <View style={{ flex: 1 }}>
            <Text style={e.portaRotulo}>Hoje tem festa · {hora(P.festaHoje.data_inicio)}</Text>
            <Text style={e.portaTitulo} numberOfLines={1}>{P.festaHoje.titulo}</Text>
            <Text style={e.portaSub}>{P.festaHoje.entraram} entraram · {P.festaHoje.faltam} faltam</Text>
          </View>
          <View style={e.portaBotao}><Feather name="list" size={20} color="#1A0F1F" /><Text style={e.portaBotaoTxt}>Lista da festa</Text></View>
        </TouchableOpacity>
      )}

      {/* Lista VIP esperando */}
      {Object.entries(porFesta).map(([fid, f]) => (
        <View key={fid}>
          <TituloSecao
            texto={`Lista VIP · ${f.titulo}`}
            direita={pode('lista_vip') && f.itens.length > 1 ? (
              <TouchableOpacity onPress={() => aprovarTodos(fid, f.titulo, f.itens)} disabled={ocupado === fid}>
                <Text style={e.todos}>{ocupado === fid ? 'Aprovando…' : `Aprovar todos (${f.itens.length})`}</Text>
              </TouchableOpacity>
            ) : <Text style={e.data}>{dia(f.data)}</Text>}
          />
          <View style={e.cartao}>
            {f.itens.map((p, i) => (
              <View key={p.id} style={[e.linha, i > 0 && e.borda]}>
                <View style={{ flex: 1 }}>
                  <Text style={e.nome} numberOfLines={1}>{p.nome}{p.acompanhantes ? `  +${p.acompanhantes}` : ''}</Text>
                  <Text style={e.sub}>pediu {dia(p.criado_em)} · {hora(p.criado_em)}</Text>
                </View>
                {ocupado === p.id ? <ActivityIndicator color={CP.rosa} /> : (
                  <>
                    <TouchableOpacity style={[e.redondo, e.nao]} onPress={() => responder(p, 'rejeitada')} accessibilityLabel={`Recusar ${p.nome}`}>
                      <Feather name="x" size={20} color="#FF7A7A" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[e.redondo, e.sim]} onPress={() => responder(p, 'aprovada')} accessibilityLabel={`Aprovar ${p.nome}`}>
                      <Feather name="check" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Reservas esperando confirmação (Rodada 146) */}
      {P.reservas.length > 0 && (
        <>
          <TituloSecao texto="Reservas a confirmar" />
          <View style={e.cartao}>
            {P.reservas.map((rv, i) => (
              <View key={rv.id} style={[e.linha, i > 0 && e.borda]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => abrirDetalheReserva(rv)} accessibilityRole="button">
                  <Text style={e.nome} numberOfLines={1}>{rv.nome}  · {rv.pessoas}p</Text>
                  <Text style={e.sub} numberOfLines={1}>
                    {rv.area} · {diaReserva(rv.data)} às {rv.horario}{rv.ocasiao ? ` · ${OCASIAO[rv.ocasiao] || rv.ocasiao}` : ''}{rv.observacao ? ' · 💬' : ''}
                  </Text>
                </TouchableOpacity>
                {ocupado === rv.id ? <ActivityIndicator color={CP.rosa} /> : (
                  <>
                    <TouchableOpacity style={[e.redondo, e.nao]} onPress={() => tratarReserva(rv, 'recusada')} accessibilityLabel={`Recusar reserva de ${rv.nome}`}>
                      <Feather name="x" size={20} color="#FF7A7A" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[e.redondo, e.sim]} onPress={() => tratarReserva(rv, 'confirmada')} accessibilityLabel={`Confirmar reserva de ${rv.nome}`}>
                      <Feather name="check" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Check-ins a confirmar */}
      {P.checkins.length > 0 && (
        <>
          <TituloSecao texto="Check-ins a confirmar" direita={<Text style={e.data}>confirmam sozinhos às 6h</Text>} />
          <View style={e.cartao}>
            {P.checkins.map((c, i) => (
              <View key={c.id} style={[e.linha, i > 0 && e.borda]}>
                <View style={{ flex: 1 }}>
                  <Text style={e.nome} numberOfLines={1}>{c.cliente}</Text>
                  <Text style={e.sub}>{hora(c.criado_em)} · código {c.codigo}{c.cupom ? ` · cupom ${c.cupom}` : ''}{c.distancia != null ? ` · a ${c.distancia} m` : ''}</Text>
                </View>
                {ocupado === c.id ? <ActivityIndicator color={CP.rosa} /> : (
                  <>
                    <TouchableOpacity style={[e.redondo, e.nao]} onPress={() => cancelarCheckin(c.id)} accessibilityLabel="Cancelar check-in">
                      <Feather name="x" size={20} color="#FF7A7A" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[e.redondo, e.sim]} onPress={() => confirmarCheckin(c.codigo, c.id)} accessibilityLabel="Confirmar check-in">
                      <Feather name="check" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Tudo em dia */}
      {tudoEmDia && !P.carregando && (
        <View style={e.emDia}>
          <View style={e.emDiaIcone}><Feather name="check" size={28} color="#4CAF7D" /></View>
          <Text style={e.emDiaTitulo}>Tudo em dia</Text>
          <Text style={e.emDiaSub}>Nenhum pedido de Lista VIP, reserva ou check-in esperando você. Esta tela se atualiza sozinha.</Text>
        </View>
      )}

      {/* Festas em análise (só informação) */}
      {P.emAnalise.length > 0 && (
        <>
          <TituloSecao texto="Em análise pela equipe Dicas" />
          <View style={e.cartao}>
            {P.emAnalise.map((f, i) => (
              <View key={f.id} style={[e.linha, i > 0 && e.borda]}>
                <Feather name="clock" size={16} color={CP.dim} />
                <View style={{ flex: 1 }}>
                  <Text style={e.nome} numberOfLines={1}>{f.titulo}</Text>
                  <Text style={e.sub}>{dia(f.data_inicio)} · {hora(f.data_inicio)} · aparece no app depois da aprovação</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </TelaParceiro>
  );
}

function Resumo({ n, rotulo, icone, cor }: { n: number; rotulo: string; icone: keyof typeof Feather.glyphMap; cor: string }) {
  return (
    <View style={[e.resumoCaixa, n > 0 && { borderColor: cor + '88' }]}>
      <Feather name={icone} size={16} color={n > 0 ? cor : CP.fraco} />
      <Text style={[e.resumoN, n > 0 && { color: '#FFF' }]}>{n}</Text>
      <Text style={e.resumoRot}>{rotulo}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  validar: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 16, marginBottom: 8 },
  botaoQR: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: CP.rosa, borderRadius: 14, minHeight: 64 },
  botaoQRTxt: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  botaoQRSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  cameraCaixa: { height: 280, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' },
  mira: { position: 'absolute', left: '18%', right: '18%', top: '14%', bottom: '24%', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 16 },
  fecharCamera: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  cameraDica: { position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', color: '#FFF', fontSize: 13, fontWeight: '600' },
  codigoLinha: { flexDirection: 'row', gap: 8, marginTop: 10 },
  codigoInput: { flex: 1, backgroundColor: '#0F0E15', borderColor: CP.borda, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, color: CP.texto, fontSize: 17, letterSpacing: 3, fontWeight: '800' },
  codigoBotao: { backgroundColor: '#2E9E62', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', minWidth: 92, alignItems: 'center' },
  codigoBotaoTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  validarDica: { color: CP.dim, fontSize: 11, marginTop: 8, textAlign: 'center' },
  resumo: { flexDirection: 'row', gap: 8 },
  resumoCaixa: { flex: 1, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: 14, padding: 12, minHeight: 88 },
  resumoN: { color: CP.fraco, fontSize: 26, fontWeight: '800', marginTop: 4 },
  resumoRot: { color: CP.dim, fontSize: 11, fontWeight: '600' },

  porta: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, overflow: 'hidden', padding: 16, marginTop: 8, backgroundColor: CP.card },
  portaRotulo: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  portaTitulo: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 4 },
  portaSub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 2 },
  portaBotao: { backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', gap: 2 },
  portaBotaoTxt: { color: '#1A0F1F', fontSize: 11, fontWeight: '800' },

  cartao: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 64 },
  borda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  nome: { color: CP.texto, fontSize: 15, fontWeight: '700' },
  sub: { color: CP.dim, fontSize: 11, marginTop: 2 },
  redondo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sim: { backgroundColor: '#2E9E62' },
  nao: { backgroundColor: '#3A1D22' },
  todos: { color: CP.rosa, fontSize: 12, fontWeight: '800' },
  data: { color: CP.dim, fontSize: 11, fontWeight: '600' },

  emDia: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20 },
  emDiaIcone: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#14301F', alignItems: 'center', justifyContent: 'center' },
  emDiaTitulo: { color: CP.texto, fontSize: 18, fontWeight: '800', marginTop: 12 },
  emDiaSub: { color: CP.dim, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 19 },
});
