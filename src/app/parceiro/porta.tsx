// Rodada 145 — Abrir a porta (Modo porta no app). Mesmas regras do portal (/dashboard/porta):
//   • O convidado aprovado mostra um QR "dicasvip:<id do pedido>" ou o código (6 primeiros caracteres do id).
//   • Quem confirma a entrada é a casa. Ações: Confirmar entrada, Aprovar e liberar, Recusar, Desfazer, Aprovar mesmo assim.
//   • Lembrete: conferir documento com foto. Se a pessoa tem foto de conferência, ela aparece grande.
//   • Atualiza sozinho a cada 12 s (outro celular da portaria pode ter confirmado).
// Quem pode: dono, equipe com "porta" (só na janela da festa) ou "lista_vip". O banco decide (migration 099);
// se o banco desfizer a mudança, a tela avisa em vez de fingir que deu certo.
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, Vibration, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModoParceiro } from '../../lib/modoParceiro';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#0B0B0E', card: '#161520', borda: '#232230', texto: '#FFFFFF', dim: '#A0A0B2', fraco: '#626274',
  secao: '#B9B6CC', rosa: '#E1306C', verde: '#4CAF7D', amarelo: '#F2A900', vermelho: '#FF5252',
};

type Status = 'solicitada' | 'aprovada' | 'recusada' | 'cancelada' | 'check_in';
type Festa = { id: string; titulo: string; data_inicio: string; data_fim: string | null; listas_vip: { id: string; vagas_limite: number | null }[] };
type Pedido = { id: string; user_id: string; status: Status; acompanhantes: number; created_at: string; check_in_em?: string | null; nome: string };
type Filtro = 'todos' | 'faltam' | 'entraram' | 'esperando';

const ROTULO: Record<Status, { texto: string; cor: string }> = {
  solicitada: { texto: 'Esperando aprovação', cor: C.amarelo },
  aprovada: { texto: 'Aprovado', cor: '#3FA0A7' },
  check_in: { texto: 'Já entrou', cor: C.verde },
  recusada: { texto: 'Recusado', cor: C.vermelho },
  cancelada: { texto: 'Cancelou', cor: C.fraco },
};

const codigoDoPedido = (id: string) => id.replace(/-/g, '').slice(0, 6).toUpperCase();
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function Porta() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { localAtivo } = useModoParceiro();
  const [permissao, pedirPermissao] = useCameraPermissions();
  // vindo da aba Aprovações (QR ou código): abre direto a ficha deste pedido
  const { pedido: pedidoAlvo } = useLocalSearchParams<{ pedido?: string }>();
  const alvoAberto = useRef<string | null>(null);

  const [festas, setFestas] = useState<Festa[]>([]);
  const [festaId, setFestaId] = useState<string | null>(null);
  const [escolhendoFesta, setEscolhendoFesta] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [camera, setCamera] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [aberto, setAberto] = useState<Pedido | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const lidoAgora = useRef<string | null>(null);

  const festa = useMemo(() => festas.find((f) => f.id === festaId) || null, [festas, festaId]);
  const listaId = festa?.listas_vip?.[0]?.id ?? null;

  // ---- festas com Lista VIP: abre na mais perto de agora ----
  useEffect(() => {
    if (!localAtivo) return;
    (async () => {
      const agora = Date.now();
      const { data, error } = await supabase
        .from('eventos')
        .select('id, titulo, data_inicio, data_fim, listas_vip(id, vagas_limite)')
        .eq('local_id', localAtivo.local_id)
        .neq('status', 'cancelado')
        .gte('data_inicio', new Date(agora - 3 * 864e5).toISOString())
        .lte('data_inicio', new Date(agora + 14 * 864e5).toISOString())
        .order('data_inicio', { ascending: true });
      if (error) console.warn('[porta] festas:', error.message);
      const comLista = ((data as unknown as Festa[]) || []).filter((f) => f.listas_vip?.length);
      setFestas(comLista);
      const maisPerto = [...comLista].sort(
        (a, b) => Math.abs(new Date(a.data_inicio).getTime() - agora) - Math.abs(new Date(b.data_inicio).getTime() - agora)
      )[0];
      let escolhida = maisPerto?.id ?? null;
      if (pedidoAlvo) {
        const { data: ped } = await supabase.from('listas_vip_solicitacoes').select('id, listas_vip!inner(evento_id)').eq('id', pedidoAlvo).maybeSingle();
        const ev = (ped as { listas_vip?: { evento_id: string } } | null)?.listas_vip?.evento_id;
        if (ev && comLista.some((f) => f.id === ev)) escolhida = ev;
      }
      setFestaId(escolhida);
      setCarregando(false);
    })();
  }, [localAtivo, pedidoAlvo]);

  // ---- pedidos da lista (e de novo a cada 12 s) ----
  const carregarPedidos = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('listas_vip_solicitacoes')
      .select('id, user_id, status, acompanhantes, created_at, check_in_em')
      .eq('lista_vip_id', id)
      .order('created_at', { ascending: true });
    const base = ((data as Omit<Pedido, 'nome'>[]) || []).map((p) => ({ ...p, nome: 'Convidado' }));
    if (base.length) {
      const { data: perfis } = await supabase.from('perfis_publicos').select('id, display_name').in('id', base.map((p) => p.user_id));
      const nome = new Map(((perfis as { id: string; display_name: string | null }[]) || []).map((p) => [p.id, p.display_name]));
      base.forEach((p) => (p.nome = nome.get(p.user_id) || 'Convidado'));
    }
    setPedidos(base);
    if (pedidoAlvo && alvoAberto.current !== pedidoAlvo) {
      const p = base.find((x) => x.id === pedidoAlvo);
      if (p) { alvoAberto.current = pedidoAlvo; setAberto(p); }
    }
    setAberto((a) => (a ? base.find((p) => p.id === a.id) || a : a));
  }, [pedidoAlvo]);

  useEffect(() => {
    setAberto(null);
    if (!listaId) { setPedidos([]); return; }
    void carregarPedidos(listaId);
    const t = setInterval(() => void carregarPedidos(listaId), 12000);
    return () => clearInterval(t);
  }, [listaId, carregarPedidos]);

  // ---- foto de conferência do pedido aberto ----
  useEffect(() => {
    setFoto(null);
    if (!aberto) return;
    (async () => {
      const { data: caminho } = await supabase.rpc('foto_conferencia_do_pedido', { p_solicitacao: aberto.id });
      if (!caminho) return;
      const { data } = await supabase.storage.from('fotos-conferencia').createSignedUrl(caminho as string, 600);
      if (data?.signedUrl) setFoto(data.signedUrl);
    })();
  }, [aberto?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- achar pelo QR, código ou nome ----
  const abrirPorId = (id: string) => {
    const p = pedidos.find((x) => x.id === id);
    if (!p) {
      Vibration.vibrate([0, 80, 80, 80]);
      Alert.alert('Não está nesta lista', festas.length > 1
        ? 'Este QR não é desta festa. Confira se a festa certa está escolhida no topo.'
        : 'Este QR não é de um pedido desta festa.');
      return;
    }
    Vibration.vibrate(60);
    setCamera(false);
    setAberto(p);
  };

  const aoLerQR = ({ data }: { data: string }) => {
    if (lidoAgora.current === data) return; // o leitor dispara várias vezes seguidas
    lidoAgora.current = data;
    setTimeout(() => { lidoAgora.current = null; }, 2500);
    const m = /^dicasvip:([0-9a-f-]{36})$/i.exec((data || '').trim());
    if (!m) {
      Alert.alert('QR desconhecido', 'Este QR não é da Lista VIP do Dicas LGBT+.');
      return;
    }
    abrirPorId(m[1].toLowerCase());
  };

  const procurarCodigo = () => {
    const c = codigo.replace(/[^0-9a-z]/gi, '').toUpperCase();
    if (c.length < 6) return Alert.alert('Código', 'O código tem 6 letras e números.');
    const achados = pedidos.filter((p) => codigoDoPedido(p.id) === c.slice(0, 6));
    if (achados.length === 1) { setCodigo(''); abrirPorId(achados[0].id); }
    else Alert.alert('Código não encontrado', 'Confira as letras e números, ou procure pelo nome.');
  };

  const abrirCamera = async () => {
    if (!permissao?.granted) {
      const r = await pedirPermissao();
      if (!r.granted) {
        Alert.alert('Câmera bloqueada', 'Para ler o QR, libere a câmera para o Dicas LGBT+ nos Ajustes do celular. Enquanto isso, use o código ou o nome.');
        return;
      }
    }
    setCamera(true);
  };

  // ---- mudar status (o banco confere quem pode) ----
  const mudar = async (p: Pedido, novo: Status, ok: string) => {
    setSalvando(true);
    const { data, error } = await supabase
      .from('listas_vip_solicitacoes')
      .update({ status: novo })
      .eq('id', p.id)
      .select('id, status')
      .maybeSingle();
    setSalvando(false);
    if (error) return Alert.alert('Não foi possível', error.message.includes('cheia') ? 'A Lista VIP está cheia.' : 'Tente de novo em instantes.');
    if (!data || (data as { status: Status }).status !== novo) {
      return Alert.alert('Sem permissão agora', 'O seu acesso não permite esta ação neste horário. A porta só abre perto do horário da festa.');
    }
    Vibration.vibrate(novo === 'check_in' ? 120 : 40);
    if (listaId) await carregarPedidos(listaId);
    setAberto((a) => (a ? { ...a, status: novo } : a));
    if (novo === 'check_in') Alert.alert('Entrada confirmada', ok);
  };

  // ---- números ----
  const n = useMemo(() => {
    const entraram = pedidos.filter((p) => p.status === 'check_in');
    const aprovados = pedidos.filter((p) => p.status === 'aprovada');
    return {
      pessoasEntraram: entraram.reduce((t, p) => t + 1 + (p.acompanhantes || 0), 0),
      faltam: aprovados.reduce((t, p) => t + 1 + (p.acompanhantes || 0), 0),
      esperando: pedidos.filter((p) => p.status === 'solicitada').length,
    };
  }, [pedidos]);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return pedidos
      .filter((p) => (filtro === 'faltam' ? p.status === 'aprovada'
        : filtro === 'entraram' ? p.status === 'check_in'
        : filtro === 'esperando' ? p.status === 'solicitada'
        : true))
      .filter((p) => !b || p.nome.toLowerCase().includes(b) || codigoDoPedido(p.id).toLowerCase().startsWith(b))
      .sort((a, b2) => a.nome.localeCompare(b2.nome, 'pt-BR'));
  }, [pedidos, busca, filtro]);

  // ---------------------------------------------------------------------------------------------
  if (carregando) {
    return <View style={[s.tela, s.centro]}><ActivityIndicator color={C.rosa} /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Topo */}
      <View style={[s.topo, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.voltar} accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={20} color={C.texto} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.secaoTitulo}>Abrir a porta</Text>
          <TouchableOpacity disabled={festas.length < 2} onPress={() => setEscolhendoFesta(!escolhendoFesta)} style={s.festaLinha}>
            <Text style={s.festaNome} numberOfLines={1}>{festa ? festa.titulo : 'Nenhuma festa com Lista VIP'}</Text>
            {festas.length > 1 && <Feather name={escolhendoFesta ? 'chevron-up' : 'chevron-down'} size={16} color={C.dim} />}
          </TouchableOpacity>
          {!!festa && <Text style={s.festaHora}>{new Date(festa.data_inicio).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} · {hora(festa.data_inicio)}</Text>}
        </View>
      </View>

      {escolhendoFesta && (
        <View style={[s.cartao, { marginHorizontal: 16, marginBottom: 8 }]}>
          {festas.map((f, i) => (
            <TouchableOpacity key={f.id} style={[s.linha, i > 0 && s.linhaBorda]} onPress={() => { setFestaId(f.id); setEscolhendoFesta(false); }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.linhaTitulo, f.id === festaId && { color: C.rosa }]}>{f.titulo}</Text>
                <Text style={s.linhaSub}>{new Date(f.data_inicio).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} · {hora(f.data_inicio)}</Text>
              </View>
              {f.id === festaId && <Feather name="check" size={16} color={C.rosa} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!festa ? (
        <View style={[s.centro, { flex: 1, padding: 24 }]}>
          <Feather name="calendar" size={28} color={C.fraco} />
          <Text style={[s.vazio, { textAlign: 'center', marginTop: 10 }]}>
            Nenhuma festa com Lista VIP perto de hoje. Quando a festa tiver Lista VIP, ela aparece aqui.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          {/* Contadores */}
          <View style={s.contadores}>
            <View style={s.contador}><Text style={[s.contadorNum, { color: C.verde }]}>{n.pessoasEntraram}</Text><Text style={s.contadorRot}>pessoas entraram</Text></View>
            <View style={s.contador}><Text style={s.contadorNum}>{n.faltam}</Text><Text style={s.contadorRot}>faltam entrar</Text></View>
            <View style={s.contador}><Text style={[s.contadorNum, { color: C.amarelo }]}>{n.esperando}</Text><Text style={s.contadorRot}>esperando</Text></View>
          </View>

          {/* Câmera / código */}
          {camera ? (
            <View style={s.cameraCaixa}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={aoLerQR}
              />
              <View style={s.mira} pointerEvents="none" />
              <TouchableOpacity style={s.fecharCamera} onPress={() => setCamera(false)} accessibilityLabel="Fechar câmera">
                <Feather name="x" size={20} color="#FFF" />
              </TouchableOpacity>
              <Text style={s.cameraDica}>Aponte para o QR no celular do convidado</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.botaoQR} onPress={abrirCamera} activeOpacity={0.85} accessibilityRole="button">
              <Feather name="maximize" size={26} color="#FFF" />
              <Text style={s.botaoQRTexto}>Ler QR do convidado</Text>
            </TouchableOpacity>
          )}

          <View style={s.codigoLinha}>
            <TextInput
              style={s.codigoInput} value={codigo} onChangeText={setCodigo} placeholder="Ou digite o código (6)"
              placeholderTextColor={C.fraco} autoCapitalize="characters" autoCorrect={false} maxLength={8}
              onSubmitEditing={procurarCodigo} returnKeyType="search"
            />
            <TouchableOpacity style={s.codigoBotao} onPress={procurarCodigo}><Text style={s.codigoBotaoTexto}>Achar</Text></TouchableOpacity>
          </View>

          {/* Lista */}
          <View style={s.secaoLinha}>
            <Text style={s.secaoTitulo}>Lista</Text>
            <Text style={s.contagem}>{pedidos.length} pedidos</Text>
          </View>
          <View style={s.buscaLinha}>
            <Feather name="search" size={15} color={C.fraco} />
            <TextInput style={s.buscaInput} value={busca} onChangeText={setBusca} placeholder="Procurar pelo nome" placeholderTextColor={C.fraco} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
            {([['todos', 'Todos'], ['faltam', 'Faltam entrar'], ['entraram', 'Entraram'], ['esperando', 'Esperando']] as [Filtro, string][]).map(([k, t]) => (
              <TouchableOpacity key={k} onPress={() => setFiltro(k)} style={[s.chip, filtro === k && s.chipAtivo]}>
                <Text style={[s.chipTexto, filtro === k && { color: '#FFF' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.cartao}>
            {lista.length === 0 ? (
              <Text style={[s.vazio, { padding: 14 }]}>Ninguém aqui.</Text>
            ) : lista.map((p, i) => (
              <TouchableOpacity key={p.id} style={[s.linha, i > 0 && s.linhaBorda]} onPress={() => setAberto(p)}>
                <View style={[s.ponto, { backgroundColor: ROTULO[p.status].cor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.linhaTitulo} numberOfLines={1}>{p.nome}{p.acompanhantes ? `  +${p.acompanhantes}` : ''}</Text>
                  <Text style={s.linhaSub}>{ROTULO[p.status].texto}{p.status === 'check_in' && p.check_in_em ? ` às ${hora(p.check_in_em)}` : ''} · {codigoDoPedido(p.id)}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={C.fraco} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Ficha do convidado */}
      {aberto && (
        <View style={s.fundoFicha}>
          <View style={[s.ficha, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={s.fecharFicha} onPress={() => setAberto(null)} accessibilityLabel="Fechar">
              <Feather name="x" size={20} color={C.dim} />
            </TouchableOpacity>
            <View style={s.fichaTopo}>
              {foto ? (
                <Image source={{ uri: foto }} style={s.fotoConf} />
              ) : (
                <View style={[s.fotoConf, s.centro]}><Feather name="user" size={34} color={C.fraco} /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.fichaNome}>{aberto.nome}</Text>
                <Text style={s.fichaSub}>{aberto.acompanhantes ? `+ ${aberto.acompanhantes} acompanhante${aberto.acompanhantes > 1 ? 's' : ''}` : 'Sem acompanhante'}</Text>
                <View style={[s.selo, { backgroundColor: ROTULO[aberto.status].cor + '33' }]}>
                  <Text style={[s.seloTexto, { color: ROTULO[aberto.status].cor }]}>
                    {ROTULO[aberto.status].texto}{aberto.status === 'check_in' && aberto.check_in_em ? ` às ${hora(aberto.check_in_em)}` : ''}
                  </Text>
                </View>
              </View>
            </View>
            <View style={s.lembrete}>
              <Feather name="credit-card" size={14} color={C.amarelo} />
              <Text style={s.lembreteTexto}>Confira um documento com foto{foto ? ' e compare com a foto acima' : ''}.</Text>
            </View>

            {salvando ? <ActivityIndicator color={C.rosa} style={{ marginTop: 16 }} /> : (
              <View style={{ gap: 8, marginTop: 14 }}>
                {aberto.status === 'aprovada' && (
                  <BotaoFicha cor={C.verde} texto="Confirmar entrada" icone="check" onPress={() => mudar(aberto, 'check_in', `${aberto.nome} entrou.`)} />
                )}
                {aberto.status === 'solicitada' && (
                  <>
                    <BotaoFicha cor={C.verde} texto="Aprovar e liberar" icone="check" onPress={() => mudar(aberto, 'aprovada', '')} />
                    <BotaoFicha secundario texto="Recusar" icone="x" onPress={() => mudar(aberto, 'recusada', '')} />
                  </>
                )}
                {aberto.status === 'check_in' && (
                  <BotaoFicha secundario texto="Desfazer entrada" icone="rotate-ccw" onPress={() => mudar(aberto, 'aprovada', '')} />
                )}
                {(aberto.status === 'recusada' || aberto.status === 'cancelada') && (
                  <BotaoFicha secundario texto="Aprovar mesmo assim" icone="check" onPress={() => mudar(aberto, 'aprovada', '')} />
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function BotaoFicha({ texto, icone, onPress, cor, secundario }: {
  texto: string; icone: keyof typeof Feather.glyphMap; onPress: () => void; cor?: string; secundario?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.botaoFicha, secundario ? s.botaoFichaSec : { backgroundColor: cor || C.rosa }]}
      onPress={onPress} activeOpacity={0.85} accessibilityRole="button"
    >
      <Feather name={icone} size={18} color="#FFF" />
      <Text style={s.botaoFichaTexto}>{texto}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: C.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  voltar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  secaoTitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: C.secao },
  festaLinha: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  festaNome: { color: C.texto, fontSize: 20, fontWeight: '800', flexShrink: 1 },
  festaHora: { color: C.dim, fontSize: 12, marginTop: 2 },

  contadores: { flexDirection: 'row', gap: 8, marginTop: 4 },
  contador: { flex: 1, backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  contadorNum: { color: C.texto, fontSize: 24, fontWeight: '800' },
  contadorRot: { color: C.dim, fontSize: 11, marginTop: 2, textAlign: 'center' },

  botaoQR: {
    marginTop: 12, minHeight: 92, borderRadius: 18, backgroundColor: C.rosa, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  botaoQRTexto: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  cameraCaixa: { marginTop: 12, height: 320, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
  mira: {
    position: 'absolute', left: '18%', right: '18%', top: '16%', bottom: '24%', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 18,
  },
  fecharCamera: {
    position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraDica: { position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', color: '#FFF', fontSize: 13, fontWeight: '600' },

  codigoLinha: { flexDirection: 'row', gap: 8, marginTop: 10 },
  codigoInput: {
    flex: 1, backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    minHeight: 48, color: C.texto, fontSize: 16, letterSpacing: 2, fontWeight: '700',
  },
  codigoBotao: { backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  codigoBotaoTexto: { color: C.texto, fontWeight: '700', fontSize: 15 },

  secaoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 8 },
  contagem: { color: C.dim, fontSize: 12, fontWeight: '600' },
  buscaLinha: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderColor: C.borda, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 12, minHeight: 44,
  },
  buscaInput: { flex: 1, color: C.texto, fontSize: 15 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, justifyContent: 'center' },
  chipAtivo: { backgroundColor: C.rosa, borderColor: C.rosa },
  chipTexto: { color: C.dim, fontSize: 12, fontWeight: '700' },

  cartao: { backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 54 },
  linhaBorda: { borderTopColor: C.borda, borderTopWidth: StyleSheet.hairlineWidth },
  linhaTitulo: { color: C.texto, fontSize: 14, fontWeight: '600' },
  linhaSub: { color: C.dim, fontSize: 11, marginTop: 1 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  vazio: { color: C.dim, fontSize: 13, lineHeight: 19 },

  fundoFicha: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  ficha: { backgroundColor: '#14131C', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, borderColor: C.borda, borderWidth: 1 },
  fecharFicha: { position: 'absolute', top: 12, right: 12, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  fichaTopo: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  fotoConf: { width: 96, height: 96, borderRadius: 18, backgroundColor: C.card },
  fichaNome: { color: C.texto, fontSize: 21, fontWeight: '800', paddingRight: 30 },
  fichaSub: { color: C.dim, fontSize: 13, marginTop: 2 },
  selo: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  seloTexto: { fontSize: 12, fontWeight: '800' },
  lembrete: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: '#2A2110', borderRadius: 10, padding: 10 },
  lembreteTexto: { color: '#F6D58A', fontSize: 13, flex: 1 },
  botaoFicha: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 14 },
  botaoFichaSec: { backgroundColor: C.card, borderColor: C.borda, borderWidth: 1 },
  botaoFichaTexto: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
