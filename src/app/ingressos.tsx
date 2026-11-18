// Migração 131 — Meus ingressos: QR nominal para mostrar na porta. Abre também pelo link dicaslgbt://ingressos
// (volta do pagamento no Mercado Pago). Pagamento ainda não confirmado aparece como "Aguardando pagamento".
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import TopoApp from '../components/TopoApp';
import { TituloTela } from '../components/CabecalhoTela';
import { useAuth } from '../lib/authContext';
import { meusIngressos, MeuIngresso, pedirReembolso, podeReembolsar, reais } from '../lib/ingressos';

const quando = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const passou = (i: MeuIngresso) => {
  const ev = i.eventos;
  if (!ev) return true;
  return new Date(ev.data_fim || new Date(ev.data_inicio).getTime() + 8 * 3600e3).getTime() < Date.now();
};

export default function MeusIngressos() {
  const router = useRouter();
  const { user } = useAuth();
  const [lista, setLista] = useState<MeuIngresso[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [reembolsando, setReembolsando] = useState<string | null>(null);

  // Direito de arrependimento: até 7 dias depois da compra e até 48h antes da festa. Devolve tudo, inclusive a taxa.
  const reembolsar = (i: MeuIngresso) => {
    const doPedido = (lista || []).filter((x) => x.pedido_id === i.pedido_id).length;
    Alert.alert('Pedir reembolso?', `Cancela ${doPedido > 1 ? `os ${doPedido} ingressos desta compra` : 'este ingresso'} e devolve ${reais(i.ingresso_pedidos?.total_centavos || 0)}, inclusive a taxa, no mesmo meio de pagamento.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Pedir reembolso', style: 'destructive', onPress: async () => {
        setReembolsando(i.pedido_id);
        try { await pedirReembolso(i.pedido_id); Alert.alert('Reembolso feito', 'O valor volta pelo Mercado Pago (Pix na hora; cartão na próxima fatura ou na seguinte).'); await carregar(); }
        catch (e: any) { Alert.alert('Reembolso', e?.message || 'Não deu agora.'); }
        finally { setReembolsando(null); }
      } },
    ]);
  };

  const carregar = useCallback(async () => {
    if (!user) return setLista([]);
    setLista(await meusIngressos());
  }, [user?.id]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const proximos = (lista || []).filter((i) => !passou(i) && i.status !== 'cancelado');
  const antigos = (lista || []).filter((i) => passou(i) || i.status === 'cancelado');
  const aguardando = proximos.some((i) => i.status === 'reservado');

  const Cartao = ({ i }: { i: MeuIngresso }) => {
    const abertoAqui = aberto === i.id;
    const pendente = i.status === 'reservado';
    return (
      <TouchableOpacity style={[s.card, i.status === 'usado' && { opacity: 0.6 }]} onPress={() => setAberto(abertoAqui ? null : i.id)} activeOpacity={0.85} accessibilityRole="button">
        <View style={s.cardTopo}>
          <View style={{ flex: 1 }}>
            <Text style={s.festa} numberOfLines={1}>{i.eventos?.titulo || 'Festa'}</Text>
            <Text style={s.sub}>{i.eventos ? quando(i.eventos.data_inicio) : ''}{i.eventos?.locais?.nome ? ` · ${i.eventos.locais.nome}` : ''}</Text>
            <Text style={s.sub}>{i.cortesia ? 'Cortesia da casa' : i.ingresso_lotes?.nome || 'Ingresso'}{i.meia ? ' · meia' : ''}{i.cortesia ? '' : ` · ${i.preco_centavos ? reais(i.preco_centavos) : 'grátis'}`}</Text>
          </View>
          <View style={[s.selo, pendente ? s.seloPend : i.status === 'usado' ? s.seloUsado : i.status === 'cancelado' ? s.seloUsado : s.seloOk]}>
            <Text style={s.seloTxt}>{pendente ? 'Aguardando pagamento' : i.status === 'usado' ? 'Usado' : i.status === 'cancelado' ? 'Cancelado' : 'Válido'}</Text>
          </View>
        </View>
        <Text style={s.titular}>{i.titular}</Text>
        {abertoAqui && i.status === 'valido' && (
          <View style={s.qrBox}>
            <View style={s.qrFundo}><QRCode value={`dicasingresso:${i.codigo}`} size={200} /></View>
            <Text style={s.codigo}>{i.codigo}</Text>
            <Text style={s.dica}>Mostre na porta{i.meia ? ' com o documento da meia-entrada' : ''}. O ingresso é nominal.</Text>
          </View>
        )}
        {!abertoAqui && i.status === 'valido' && <Text style={s.toque}>Toque para mostrar o QR</Text>}
        {abertoAqui && podeReembolsar(i) && (
          <TouchableOpacity onPress={() => reembolsar(i)} disabled={reembolsando === i.pedido_id} style={s.reembolso} accessibilityRole="button">
            {reembolsando === i.pedido_id ? <ActivityIndicator color="#8E8BA3" /> : <Text style={s.reembolsoTxt}>Desistiu? Pedir reembolso</Text>}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.tela}>
      <TopoApp voltar />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }} tintColor="#E1306C" />}>
        <View style={{ marginBottom: 12 }}><TituloTela titulo="Meus ingressos" discreto semMargem /></View>
        {lista === null ? <ActivityIndicator color="#E1306C" style={{ marginTop: 30 }} /> : (
          <>
            {aguardando && <Text style={s.aviso}>Pagou agora? Com Pix a confirmação é na hora; com cartão pode levar alguns minutos. Puxe a tela para atualizar.</Text>}
            {proximos.length === 0 && (
              <View style={s.vazio}>
                <Feather name="credit-card" size={26} color="#626274" />
                <Text style={s.vazioTxt}>Nenhum ingresso por aqui ainda.</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/events' as any)} accessibilityRole="button"><Text style={s.link}>Ver festas</Text></TouchableOpacity>
              </View>
            )}
            {proximos.map((i) => <Cartao key={i.id} i={i} />)}
            {antigos.length > 0 && <Text style={s.secao}>JÁ PASSARAM</Text>}
            {antigos.map((i) => <Cartao key={i.id} i={i} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0A10' },
  titulo: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginBottom: 12 },
  aviso: { color: '#F2C94C', fontSize: 12.5, lineHeight: 17, marginBottom: 10 },
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 16, padding: 14, marginBottom: 10 },
  cardTopo: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  festa: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  sub: { color: '#A0A0B2', fontSize: 12.5, marginTop: 2 },
  titular: { color: '#D6D3E0', fontSize: 13, fontWeight: '700', marginTop: 8 },
  selo: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  seloOk: { backgroundColor: '#34D39926' },
  seloPend: { backgroundColor: '#F2C94C26' },
  seloUsado: { backgroundColor: '#3A3950' },
  seloTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  qrBox: { alignItems: 'center', marginTop: 14, gap: 8 },
  qrFundo: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14 },
  codigo: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  dica: { color: '#A0A0B2', fontSize: 12, textAlign: 'center' },
  toque: { color: '#FF6FA0', fontSize: 12, fontWeight: '700', marginTop: 6 },
  vazio: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  reembolso: { alignSelf: 'center', paddingVertical: 10, marginTop: 4 },
  reembolsoTxt: { color: '#8E8BA3', fontSize: 12.5, fontWeight: '700', textDecorationLine: 'underline' },
  vazioTxt: { color: '#A0A0B2', fontSize: 14 },
  link: { color: '#E1306C', fontSize: 14, fontWeight: '800' },
  secao: { color: '#B9B6CC', fontSize: 12, fontWeight: '800', letterSpacing: 1.4, marginTop: 16, marginBottom: 8 },
});
