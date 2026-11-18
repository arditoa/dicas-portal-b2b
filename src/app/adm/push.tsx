// Modo equipe · Enviar aviso (push). Só chega para quem LIGOU aquele tipo de aviso em Conta › Notificações
// (regra da Apple). Dá para mandar só para quem esteve numa casa (90 dias). Sempre dá para testar no seu celular antes.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { Chips } from '../../components/parceiro/form';
import { supabase } from '../../lib/supabase';

type Tipo = 'festas' | 'cupons' | 'lembretes' | 'novidades' | 'marcas';
const TIPOS: { valor: Tipo; rotulo: string }[] = [
  { valor: 'festas', rotulo: 'Festas' }, { valor: 'cupons', rotulo: 'Cupons' }, { valor: 'marcas', rotulo: 'Marcas parceiras' },
  { valor: 'novidades', rotulo: 'Novidades' }, { valor: 'lembretes', rotulo: 'Lembretes' },
];
const MODELOS: { nome: string; tipo: Tipo; titulo: string; corpo: string; destino: Destino }[] = [
  { nome: 'Festa hoje', tipo: 'festas', titulo: 'Hoje tem festa 🎉', corpo: 'Lista VIP aberta: garanta seu nome no app antes de lotar.', destino: 'festa' },
  { nome: 'Ingressos à venda', tipo: 'festas', titulo: 'Ingressos à venda 🎟️', corpo: 'Primeiro lote no app, com Pix na hora. Corre que é por pouco tempo.', destino: 'festa' },
  { nome: 'Prove grátis', tipo: 'marcas', titulo: 'Prove grátis hoje 🍦', corpo: 'Chegou na casa? Toque em "Estou aqui" e ganhe. Restam poucos!', destino: 'marca' },
  { nome: 'Cupom novo', tipo: 'cupons', titulo: 'Cupom novo pra você', corpo: 'Vale hoje. Abra o app, faça check-in e use na hora.', destino: 'casa' },
  { nome: 'Fim de semana', tipo: 'novidades', titulo: 'O que fazer no fim de semana?', corpo: 'Separamos as festas e os bares que estão bombando. Vem ver!', destino: 'hoje' },
];
type Destino = 'nenhum' | 'home' | 'hoje' | 'festa' | 'casa' | 'marca' | 'ingressos' | 'cupons';
const DESTINOS: { valor: Destino; rotulo: string }[] = [
  { valor: 'home', rotulo: 'Home' }, { valor: 'hoje', rotulo: 'Hoje na cidade' }, { valor: 'festa', rotulo: 'Uma festa' }, { valor: 'casa', rotulo: 'Uma casa' },
  { valor: 'marca', rotulo: 'Ação de marca' }, { valor: 'cupons', rotulo: 'Cupons' }, { valor: 'ingressos', rotulo: 'Meus ingressos' },
];
type Envio = { id: string; tipo: string; titulo: string; total: number; aceitos: number; so_teste: boolean; criado_em: string };
type Item = { id: string; nome: string; sub?: string };

export default function EnviarAviso() {
  const [tipo, setTipo] = useState<Tipo>('festas');
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [destino, setDestino] = useState<Destino>('home');
  const [alvo, setAlvo] = useState<Item | null>(null);          // festa / casa / marca escolhida
  const [publicoCasa, setPublicoCasa] = useState<Item | null>(null); // só quem esteve nesta casa
  const [buscaAlvo, setBuscaAlvo] = useState('');
  const [buscaCasa, setBuscaCasa] = useState('');
  const [opcoes, setOpcoes] = useState<Item[]>([]);
  const [opcoesCasa, setOpcoesCasa] = useState<Item[]>([]);
  const [quantos, setQuantos] = useState<Record<string, number> | null>(null);
  const [enviando, setEnviando] = useState<false | 'teste' | 'todos'>(false);
  const [historico, setHistorico] = useState<Envio[]>([]);

  const carregarHistorico = useCallback(async () => {
    const { data } = await supabase.from('push_envios').select('id, tipo, titulo, total, aceitos, so_teste, criado_em').order('criado_em', { ascending: false }).limit(12);
    setHistorico((data as Envio[]) || []);
  }, []);
  useFocusEffect(useCallback(() => { void carregarHistorico(); }, [carregarHistorico]));

  useEffect(() => {
    supabase.rpc('admin_publico_push', publicoCasa ? { p_local: publicoCasa.id } : {}).then(({ data, error }) => setQuantos(error ? null : (data as any)));
  }, [publicoCasa?.id]);

  // Busca do destino (festa, casa ou ação de marca)
  useEffect(() => {
    if (!['festa', 'casa', 'marca'].includes(destino) || alvo) { setOpcoes([]); return; }
    const t = setTimeout(async () => {
      const q = buscaAlvo.trim();
      if (destino === 'festa') {
        let r = supabase.from('eventos').select('id, titulo, data_inicio').eq('status', 'aprovado').gte('data_inicio', new Date(Date.now() - 12 * 3600e3).toISOString()).order('data_inicio').limit(8);
        if (q.length >= 2) r = r.ilike('titulo', `%${q}%`);
        const { data } = await r;
        setOpcoes(((data as any[]) || []).map((e) => ({ id: e.id, nome: e.titulo, sub: new Date(e.data_inicio).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) })));
      } else if (destino === 'casa') {
        if (q.length < 2) return setOpcoes([]);
        const { data } = await supabase.from('locais').select('id, nome, bairro').eq('status', 'aprovado').ilike('nome', `%${q}%`).limit(8);
        setOpcoes(((data as any[]) || []).map((l) => ({ id: l.id, nome: l.nome, sub: l.bairro || undefined })));
      } else {
        const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
        const { data } = await supabase.from('acoes_marca').select('id, marca, nome').eq('ativa', true).eq('mostrar_no_app', true).gte('fim', hoje).limit(10);
        setOpcoes(((data as any[]) || []).map((a) => ({ id: a.id, nome: a.marca, sub: a.nome })));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [destino, buscaAlvo, alvo]);

  useEffect(() => {
    if (publicoCasa || buscaCasa.trim().length < 2) { setOpcoesCasa([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('locais').select('id, nome, bairro').eq('status', 'aprovado').ilike('nome', `%${buscaCasa.trim()}%`).limit(8);
      setOpcoesCasa(((data as any[]) || []).map((l) => ({ id: l.id, nome: l.nome, sub: l.bairro || undefined })));
    }, 250);
    return () => clearTimeout(t);
  }, [buscaCasa, publicoCasa]);

  const rota = (): string | null => {
    switch (destino) {
      case 'home': return '/(tabs)';
      case 'hoje': return '/secao/hoje';
      case 'cupons': return '/coupons';
      case 'ingressos': return '/ingressos';
      case 'festa': return alvo ? `/evento/${alvo.id}` : null;
      case 'casa': return alvo ? `/business/${alvo.id}` : null;
      case 'marca': return alvo ? `/marca/${alvo.id}` : null;
      default: return null;
    }
  };

  const usarModelo = (m: (typeof MODELOS)[number]) => { setTipo(m.tipo); setTitulo(m.titulo); setCorpo(m.corpo); setDestino(m.destino); setAlvo(null); setBuscaAlvo(''); };
  const n = quantos?.[tipo] ?? null;

  async function enviar(teste: boolean) {
    if (titulo.trim().length < 2 || titulo.length > 60) return Alert.alert('Aviso', 'Título de 2 a 60 letras.');
    if (corpo.trim().length < 2 || corpo.length > 170) return Alert.alert('Aviso', 'Mensagem de 2 a 170 letras.');
    if (['festa', 'casa', 'marca'].includes(destino) && !alvo) return Alert.alert('Aviso', 'Escolha para onde o aviso leva.');
    const corpoReq = { tipo, titulo: titulo.trim(), corpo: corpo.trim(), rota: rota() || undefined, so_teste: teste, local_id: publicoCasa?.id };
    const ir = async () => {
      setEnviando(teste ? 'teste' : 'todos');
      const { data, error } = await supabase.functions.invoke('enviar-push', { body: corpoReq });
      setEnviando(false);
      let msg = (data as any)?.erro as string | undefined;
      if (error && !msg) { try { msg = (await (error as any).context?.json?.())?.erro; } catch {} }
      if (error || msg) return Alert.alert('Aviso', msg || 'Não deu para enviar. Confira se a função "enviar-push" está publicada no Supabase.');
      const r = data as { total: number; aceitos: number };
      Alert.alert(teste ? 'Teste enviado' : 'Aviso enviado! 🚀', teste ? 'Confira no seu celular.' : `${r.aceitos} de ${r.total} aparelhos receberam.`);
      void carregarHistorico();
    };
    if (teste) return void ir();
    Alert.alert('Enviar para todos?', `Vai para ${n ?? 'as'} pessoas que ligaram "${TIPOS.find((t) => t.valor === tipo)?.rotulo}"${publicoCasa ? ` e estiveram no ${publicoCasa.nome}` : ''}. Não dá para desfazer.`, [
      { text: 'Cancelar', style: 'cancel' }, { text: 'Enviar', onPress: () => void ir() },
    ]);
  }

  const Escolha = ({ item, limpar }: { item: Item; limpar: () => void }) => (
    <View style={[sa.card, { flexDirection: 'row', alignItems: 'center' }]}>
      <View style={{ flex: 1 }}><Text style={sa.tit}>{item.nome}</Text>{!!item.sub && <Text style={sa.sub}>{item.sub}</Text>}</View>
      <TouchableOpacity onPress={limpar} accessibilityRole="button"><Text style={e.trocar}>Trocar</Text></TouchableOpacity>
    </View>
  );
  const Lista = ({ itens, escolher }: { itens: Item[]; escolher: (i: Item) => void }) => (
    <>{itens.map((i) => (
      <TouchableOpacity key={i.id} style={sa.card} onPress={() => escolher(i)} accessibilityRole="button">
        <Text style={sa.tit}>{i.nome}</Text>{!!i.sub && <Text style={sa.sub}>{i.sub}</Text>}
      </TouchableOpacity>
    ))}</>
  );

  return (
    <TelaAdm titulo="Enviar aviso" subtitulo="Só chega para quem ligou esse tipo de aviso. Teste no seu celular antes." voltar>
      <Text style={sa.secao}>MODELOS PRONTOS</Text>
      <View style={e.modelos}>
        {MODELOS.map((m) => (
          <TouchableOpacity key={m.nome} style={e.modelo} onPress={() => usarModelo(m)} accessibilityRole="button"><Text style={e.modeloTxt}>{m.nome}</Text></TouchableOpacity>
        ))}
      </View>

      <View style={{ gap: 14, marginTop: 8 }}>
        <Chips rotulo="Tipo de aviso" opcoes={TIPOS.map((t) => ({ valor: t.valor, rotulo: quantos ? `${t.rotulo} · ${quantos[t.valor] ?? 0}` : t.rotulo })) as any}
          valor={tipo} aoMudar={(v) => setTipo(v as Tipo)} />

        <View>
          <Text style={e.rot}>Para quem</Text>
          {publicoCasa ? <Escolha item={{ ...publicoCasa, sub: 'Só quem esteve nesta casa nos últimos 90 dias' }} limpar={() => { setPublicoCasa(null); setBuscaCasa(''); }} /> : (
            <>
              <Text style={[sa.sub, { marginBottom: 6 }]}>Todos que ligaram este aviso. Para mandar só para quem esteve numa casa, busque a casa:</Text>
              <TextInput style={sa.campoBusca} value={buscaCasa} onChangeText={setBuscaCasa} placeholder="Casa (opcional)" placeholderTextColor={CA.fraco} />
              <Lista itens={opcoesCasa} escolher={(i) => { setPublicoCasa(i); setBuscaCasa(''); }} />
            </>
          )}
        </View>

        <View>
          <Text style={e.rot}>Título <Text style={e.conta}>{titulo.length}/60</Text></Text>
          <TextInput style={e.campo} value={titulo} onChangeText={setTitulo} maxLength={60} placeholder="Ex.: Hoje tem festa no Vezpa 🎉" placeholderTextColor={CA.fraco} />
        </View>
        <View>
          <Text style={e.rot}>Mensagem <Text style={e.conta}>{corpo.length}/170</Text></Text>
          <TextInput style={[e.campo, { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={corpo} onChangeText={setCorpo} maxLength={170} multiline placeholder="O que a pessoa ganha abrindo?" placeholderTextColor={CA.fraco} />
        </View>

        <Chips rotulo="Ao tocar, abre" opcoes={DESTINOS as any} valor={destino} aoMudar={(v) => { setDestino(v as Destino); setAlvo(null); setBuscaAlvo(''); }} />
        {['festa', 'casa', 'marca'].includes(destino) && (alvo ? <Escolha item={alvo} limpar={() => setAlvo(null)} /> : (
          <>
            {destino !== 'marca' && <TextInput style={sa.campoBusca} value={buscaAlvo} onChangeText={setBuscaAlvo} placeholder={destino === 'festa' ? 'Buscar festa (ou escolha abaixo)' : 'Nome da casa'} placeholderTextColor={CA.fraco} />}
            <Lista itens={opcoes} escolher={(i) => setAlvo(i)} />
          </>
        ))}

        {/* Prévia da notificação */}
        <View style={e.notif}>
          <View style={e.notifTopo}><View style={e.notifIcone}><Text style={{ fontSize: 10 }}>🌈</Text></View><Text style={e.notifApp}>DICAS LGBT+</Text><Text style={e.notifAgora}>agora</Text></View>
          <Text style={e.notifTit} numberOfLines={1}>{titulo || 'Título do aviso'}</Text>
          <Text style={e.notifCorpo} numberOfLines={3}>{corpo || 'Mensagem do aviso.'}</Text>
        </View>

        <TouchableOpacity style={sa.botaoSec} onPress={() => void enviar(true)} disabled={!!enviando} accessibilityRole="button">
          {enviando === 'teste' ? <ActivityIndicator color={CA.rosa} /> : <><Feather name="smartphone" size={14} color={CA.texto} /><Text style={sa.botaoSecTxt}>Enviar teste para o meu celular</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={sa.botao} onPress={() => void enviar(false)} disabled={!!enviando} accessibilityRole="button">
          {enviando === 'todos' ? <ActivityIndicator color="#FFF" /> : <><Feather name="send" size={15} color="#FFF" /><Text style={sa.botaoTxt}>{n != null ? `Enviar para ${n} ${n === 1 ? 'pessoa' : 'pessoas'}` : 'Enviar'}</Text></>}
        </TouchableOpacity>
      </View>

      <Text style={sa.secao}>ÚLTIMOS ENVIOS</Text>
      {historico.length === 0 ? <Text style={sa.vazio}>Nenhum envio ainda.</Text> : (
        <View style={sa.lista}>
          {historico.map((h, i) => (
            <View key={h.id} style={[sa.linha, i < historico.length - 1 && sa.borda]}>
              <View style={{ flex: 1 }}>
                <Text style={sa.tit} numberOfLines={1}>{h.titulo}</Text>
                <Text style={sa.sub}>{new Date(h.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {h.tipo}{h.so_teste ? ' · teste' : ''}</Text>
              </View>
              <Text style={sa.tit}>{h.aceitos}/{h.total}</Text>
            </View>
          ))}
        </View>
      )}
    </TelaAdm>
  );
}

const e = StyleSheet.create({
  modelos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modelo: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  modeloTxt: { color: CA.texto, fontSize: 12.5, fontWeight: '700' },
  rot: { color: CA.texto, fontSize: 13.5, fontWeight: '700', marginBottom: 8 },
  conta: { color: CA.fraco, fontWeight: '400', fontSize: 12 },
  campo: { borderWidth: 1, borderColor: CA.borda, borderRadius: 12, color: CA.texto, paddingHorizontal: 12, minHeight: 44, fontSize: 15, backgroundColor: CA.card },
  trocar: { color: CA.rosa, fontSize: 13, fontWeight: '800' },
  notif: { backgroundColor: '#2A2935', borderRadius: 18, padding: 12 },
  notifTopo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  notifIcone: { width: 18, height: 18, borderRadius: 5, backgroundColor: '#E1306C', alignItems: 'center', justifyContent: 'center' },
  notifApp: { color: '#D6D3E0', fontSize: 11, fontWeight: '700', flex: 1 },
  notifAgora: { color: '#A0A0B2', fontSize: 11 },
  notifTit: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  notifCorpo: { color: '#E6E4EE', fontSize: 13, marginTop: 1 },
});
