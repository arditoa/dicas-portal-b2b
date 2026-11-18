// Migração 131 — "Ingressos" na página da festa: escolhe o lote, inteira ou meia, o nome de quem vai usar
// e paga no Mercado Pago. Fase 2 (migração 132): cupom de desconto, Pix DENTRO do app (QR + copia e cola),
// cartão pelo Checkout Pro, virada de lote ("abre quando o anterior acabar"). Ingresso nominal com QR em "Meus ingressos".
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { comprar, conferirCupom, Cupom, custoPagamento, ingressosDaFesta, IngressosDaFesta, precoItem, reais, statusDoPedido, taxaItem } from '../lib/ingressos';

type Pix = { pedido_id: string; copia_e_cola: string; qr_base64: string; vence_em: string; total_centavos: number };
const quando = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(d.getHours()).padStart(2, '0')}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`; };

type Linha = { lote_id: string; titular: string; meia: boolean };

export default function ComprarIngressos({ eventoId, nomePadrao }: { eventoId: string; nomePadrao?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [info, setInfo] = useState<IngressosDaFesta | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [enviando, setEnviando] = useState<false | 'pix' | 'cartao'>(false);
  const [codigoCupom, setCodigoCupom] = useState('');
  const [cupom, setCupom] = useState<Cupom | null>(null);
  const [pix, setPix] = useState<Pix | null>(null);
  const espiando = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pix na tela: confere a cada 4 s se o pagamento caiu.
  useEffect(() => {
    if (!pix) return;
    espiando.current = setInterval(async () => {
      const st = await statusDoPedido(pix.pedido_id);
      if (st === 'pago') {
        setPix(null);
        Alert.alert('Pagamento confirmado! 🎉', 'Seus ingressos estão em Meus ingressos.', [{ text: 'Ver', onPress: () => router.push('/ingressos' as any) }]);
        ingressosDaFesta(eventoId).then(setInfo);
      } else if (st === 'expirado' || Date.now() > new Date(pix.vence_em).getTime()) {
        setPix(null);
        Alert.alert('Pix vencido', 'O tempo para pagar acabou. Escolha os ingressos de novo.');
      }
    }, 4000);
    return () => { if (espiando.current) clearInterval(espiando.current); };
  }, [pix?.pedido_id]);

  useEffect(() => {
    let vivo = true;
    ingressosDaFesta(eventoId).then((r) => { if (vivo) setInfo(r); });
    return () => { vivo = false; };
  }, [eventoId]);

  if (!info?.ativos || !info.lotes.length) return null;
  const pagos = info.lotes.some((l) => l.preco_centavos > 0);
  if (pagos && !info.casa_conectada) return null;

  const lote = (id: string) => info.lotes.find((l) => l.id === id)!;
  // Mesma conta do banco: desconto do cupom dividido entre os ingressos; taxa sobre o preço com desconto.
  const bruto = linhas.reduce((s, x) => s + precoItem(lote(x.lote_id), x.meia), 0);
  const desconto = cupom && bruto > 0 ? Math.min(bruto, cupom.tipo === 'pct' ? Math.round((bruto * cupom.valor) / 100) : cupom.valor) : 0;
  const precosFinais = linhas.map((x) => { const p = precoItem(lote(x.lote_id), x.meia); return bruto ? Math.max(p - Math.round((desconto * p) / bruto), 0) : p; });
  const sub = precosFinais.reduce((a, b) => a + b, 0);
  const taxa = precosFinais.reduce((s, p) => s + taxaItem(p, info.taxa_pct, info.taxa_min_centavos ?? 100), 0);
  // Taxa de serviço = taxa do Dicas + tarifa do Mercado Pago (Pix menor, cartão maior); a casa recebe o ingresso cheio
  const servicoPix = info.taxa_paga_por === 'comprador' ? taxa + custoPagamento(sub, taxa, 'pix', info) : 0;
  const servicoCartao = info.taxa_paga_por === 'comprador' ? taxa + custoPagamento(sub, taxa, 'cartao', info) : 0;
  const total = sub + servicoPix;
  const totalCartao = sub + servicoCartao;

  const aplicarCupom = async () => {
    if (!codigoCupom.trim()) return;
    const c = await conferirCupom(eventoId, codigoCupom);
    if (!c) return Alert.alert('Cupom', 'Cupom inválido ou esgotado.');
    setCupom(c);
  };

  const adicionar = (loteId: string) => {
    if (!user) {
      return Alert.alert('Entre na sua conta', 'Para comprar, entre ou crie sua conta (é rapidinho).', [
        { text: 'Agora não', style: 'cancel' }, { text: 'Entrar', onPress: () => router.push('/(tabs)/profile' as any) },
      ]);
    }
    if (linhas.length >= 10) return Alert.alert('Ingressos', 'Até 10 ingressos por compra.');
    setLinhas([...linhas, { lote_id: loteId, titular: linhas.length === 0 ? nomePadrao || '' : '', meia: false }]);
  };

  const finalizar = async (forma: 'pix' | 'cartao') => {
    if (linhas.some((l) => l.titular.trim().length < 2)) return Alert.alert('Ingressos', 'Coloque o nome de quem vai usar cada ingresso. O ingresso é nominal.');
    setEnviando(forma);
    try {
      const r = await comprar(eventoId, linhas.map((l) => ({ ...l, titular: l.titular.trim() })), forma, cupom?.codigo);
      setLinhas([]); setCupom(null); setCodigoCupom('');
      if (r.tipo === 'pix') { setPix(r); return; }
      if (r.tipo === 'gratis') {
        Alert.alert('Prontinho!', 'Seus ingressos estão em Meus ingressos.', [{ text: 'Ver', onPress: () => router.push('/ingressos' as any) }]);
      } else {
        Alert.alert('Pagamento aberto', 'Pague no Mercado Pago (Pix ou cartão). Ao voltar, seus ingressos aparecem em Meus ingressos.', [{ text: 'Meus ingressos', onPress: () => router.push('/ingressos' as any) }]);
      }
      ingressosDaFesta(eventoId).then(setInfo);
    } catch (e: any) {
      Alert.alert('Ingressos', e?.message || 'Não deu agora.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.topo}>
        <Feather name="credit-card" size={16} color="#FF6FA0" />
        <Text style={s.titulo}>Ingressos</Text>
      </View>
      {info.lotes.map((l) => {
        const indisponivel = !l.disponivel || l.em_breve || l.encerrado || !!l.bloqueado_virada;
        return (
          <View key={l.id} style={s.lote}>
            <View style={{ flex: 1 }}>
              <Text style={s.loteNome}>{l.nome}</Text>
              <Text style={s.lotePreco}>
                {l.preco_centavos === 0 ? 'Grátis' : reais(l.preco_centavos)}
                {l.permite_meia && l.preco_centavos > 0 ? ` · meia ${reais(precoItem(l, true))}` : ''}
              </Text>
              {(l.ultimos || indisponivel) && (
                <Text style={[s.aviso, indisponivel && { color: '#8E8BA3' }]}>
                  {l.bloqueado_virada ? 'Abre quando o lote anterior acabar' : l.em_breve ? (l.abre_em ? `Abre ${quando(l.abre_em)}` : 'Em breve') : l.encerrado ? 'Encerrado' : !l.disponivel ? 'Esgotado' : 'Últimos ingressos'}
                </Text>
              )}
            </View>
            <TouchableOpacity style={[s.mais, indisponivel && s.maisOff]} disabled={indisponivel} onPress={() => adicionar(l.id)} accessibilityRole="button" accessibilityLabel={`Adicionar ${l.nome}`}>
              <Feather name="plus" size={16} color={indisponivel ? '#626274' : '#FFF'} />
            </TouchableOpacity>
          </View>
        );
      })}

      {linhas.length > 0 && (
        <View style={s.carrinho}>
          {linhas.map((x, i) => {
            const l = lote(x.lote_id);
            return (
              <View key={i} style={s.item}>
                <View style={s.itemTopo}>
                  <Text style={s.itemTit}>{i + 1}. {l.nome} · {reais(precoItem(l, x.meia))}</Text>
                  <TouchableOpacity onPress={() => setLinhas(linhas.filter((_, k) => k !== i))} accessibilityRole="button" accessibilityLabel="Tirar este ingresso">
                    <Feather name="x" size={16} color="#8E8BA3" />
                  </TouchableOpacity>
                </View>
                <TextInput style={s.campo} value={x.titular} onChangeText={(v) => setLinhas(linhas.map((y, k) => (k === i ? { ...y, titular: v } : y)))}
                  placeholder="Nome de quem vai usar" placeholderTextColor="#6E6B80" maxLength={80} autoCapitalize="words" />
                {l.permite_meia && l.preco_centavos > 0 && (
                  <View style={s.meiaLinha}>
                    <Text style={s.meiaTxt}>Meia-entrada (leve o documento)</Text>
                    <Switch value={x.meia} onValueChange={(v) => setLinhas(linhas.map((y, k) => (k === i ? { ...y, meia: v } : y)))} trackColor={{ true: '#E1306C', false: '#3A3950' }} thumbColor="#FFF" />
                  </View>
                )}
              </View>
            );
          })}
          {info.tem_cupom && bruto > 0 && (
            cupom ? (
              <View style={s.cupomOk}>
                <Feather name="tag" size={14} color="#34D399" />
                <Text style={s.cupomOkTxt}>Cupom {cupom.codigo}: {cupom.tipo === 'pct' ? `${cupom.valor}% off` : `${reais(cupom.valor)} off`}</Text>
                <TouchableOpacity onPress={() => setCupom(null)} accessibilityRole="button" accessibilityLabel="Tirar o cupom"><Feather name="x" size={14} color="#8E8BA3" /></TouchableOpacity>
              </View>
            ) : (
              <View style={s.cupomLinha}>
                <TextInput style={[s.campo, { flex: 1 }]} value={codigoCupom} onChangeText={(v) => setCodigoCupom(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Cupom de desconto" placeholderTextColor="#6E6B80" autoCapitalize="characters" maxLength={20} />
                <TouchableOpacity style={s.aplicar} onPress={() => void aplicarCupom()} accessibilityRole="button"><Text style={s.aplicarTxt}>Aplicar</Text></TouchableOpacity>
              </View>
            )
          )}
          <View style={s.resumo}>
            <View style={s.resumoLinha}><Text style={s.resumoTxt}>Ingressos</Text><Text style={s.resumoTxt}>{reais(bruto)}</Text></View>
            {desconto > 0 && <View style={s.resumoLinha}><Text style={[s.resumoTxt, { color: '#34D399' }]}>Desconto</Text><Text style={[s.resumoTxt, { color: '#34D399' }]}>− {reais(desconto)}</Text></View>}
            {info.taxa_paga_por === 'comprador' && taxa > 0 && (
              <View style={s.resumoLinha}><Text style={s.resumoTxt}>Taxa de serviço (Pix)</Text><Text style={s.resumoTxt}>{reais(servicoPix)}</Text></View>
            )}
            <View style={s.resumoLinha}><Text style={s.total}>Total no Pix</Text><Text style={s.total}>{reais(total)}</Text></View>
            {totalCartao !== total && <View style={s.resumoLinha}><Text style={s.resumoTxt}>No cartão</Text><Text style={s.resumoTxt}>{reais(totalCartao)}</Text></View>}
          </View>
          {total === 0 ? (
            <TouchableOpacity style={s.pagar} onPress={() => void finalizar('pix')} disabled={!!enviando} accessibilityRole="button">
              {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={s.pagarTxt}>Garantir ingressos</Text>}
            </TouchableOpacity>
          ) : (
            <View style={s.formas}>
              <TouchableOpacity style={[s.pagar, { flex: 1 }]} onPress={() => void finalizar('pix')} disabled={!!enviando} accessibilityRole="button">
                {enviando === 'pix' ? <ActivityIndicator color="#FFF" /> : <Text style={s.pagarTxt}>Pix · {reais(total)}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[s.pagar, s.pagarSec, { flex: 1 }]} onPress={() => void finalizar('cartao')} disabled={!!enviando} accessibilityRole="button">
                {enviando === 'cartao' ? <ActivityIndicator color="#FFF" /> : <Text style={s.pagarTxt}>Cartão · {reais(totalCartao)}</Text>}
              </TouchableOpacity>
            </View>
          )}
          <Text style={s.nota}>Pagamento seguro pelo Mercado Pago. O valor vai direto para a casa. Desistiu em até 7 dias? Devolvemos tudo, inclusive a taxa.</Text>
        </View>
      )}

      {/* Pix dentro do app */}
      <Modal visible={!!pix} transparent animationType="slide" onRequestClose={() => setPix(null)}>
        <Pressable style={s.veu} onPress={() => {}}>
          <View style={s.folha}>
            <Text style={s.pixTit}>Pague com Pix</Text>
            <Text style={s.pixValor}>{pix ? reais(pix.total_centavos) : ''}</Text>
            {!!pix?.qr_base64 && <Image source={{ uri: `data:image/png;base64,${pix.qr_base64}` }} style={s.pixQr} />}
            <Text style={s.pixDica}>Abra o app do seu banco, escolha Pix › Ler QR ou Pix Copia e Cola.</Text>
            <Text selectable style={s.pixCodigo} numberOfLines={3}>{pix?.copia_e_cola}</Text>
            <TouchableOpacity style={s.pagar} onPress={() => pix && Share.share({ message: pix.copia_e_cola })} accessibilityRole="button">
              <Text style={s.pagarTxt}>Copiar código Pix</Text>
            </TouchableOpacity>
            <View style={s.esperando}><ActivityIndicator color="#34D399" /><Text style={s.esperandoTxt}>Esperando o pagamento… confirma sozinho.</Text></View>
            {!!pix && <Text style={s.pixVence}>Vale até {new Date(pix.vence_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>}
            <TouchableOpacity onPress={() => setPix(null)} style={{ paddingVertical: 10 }} accessibilityRole="button"><Text style={s.fechar}>Fechar (pago depois em Meus ingressos)</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#FF6FA040', borderRadius: 16, padding: 14, marginTop: 6, marginBottom: 10 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  titulo: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  lote: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#232230' },
  loteNome: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  lotePreco: { color: '#D6D3E0', fontSize: 13, marginTop: 2 },
  aviso: { color: '#FF6FA0', fontSize: 11.5, fontWeight: '800', marginTop: 2 },
  mais: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E1306C', alignItems: 'center', justifyContent: 'center' },
  maisOff: { backgroundColor: '#232230' },
  carrinho: { borderTopWidth: 1, borderTopColor: '#232230', paddingTop: 10, marginTop: 4, gap: 10 },
  item: { backgroundColor: '#1B1A26', borderRadius: 12, padding: 10, gap: 8 },
  itemTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTit: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  campo: { borderWidth: 1, borderColor: '#2D2B3D', borderRadius: 10, color: '#FFF', paddingHorizontal: 10, height: 40, fontSize: 14 },
  meiaLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meiaTxt: { color: '#D6D3E0', fontSize: 12.5 },
  resumo: { gap: 4 },
  resumoLinha: { flexDirection: 'row', justifyContent: 'space-between' },
  resumoTxt: { color: '#A0A0B2', fontSize: 13 },
  total: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  pagar: { backgroundColor: '#E1306C', borderRadius: 999, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  pagarTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  nota: { color: '#6E6B80', fontSize: 11, lineHeight: 15 },
  formas: { flexDirection: 'row', gap: 8 },
  pagarSec: { backgroundColor: '#2D2B3D' },
  cupomLinha: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  aplicar: { borderWidth: 1, borderColor: '#2D2B3D', borderRadius: 10, height: 40, paddingHorizontal: 14, justifyContent: 'center' },
  aplicarTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  cupomOk: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#34D3991A', borderRadius: 10, padding: 10 },
  cupomOkTxt: { flex: 1, color: '#34D399', fontSize: 13, fontWeight: '800' },
  veu: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34, alignItems: 'stretch', gap: 10 },
  pixTit: { color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  pixValor: { color: '#34D399', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  pixQr: { width: 210, height: 210, alignSelf: 'center', backgroundColor: '#FFF', borderRadius: 12 },
  pixDica: { color: '#A0A0B2', fontSize: 12.5, textAlign: 'center' },
  pixCodigo: { color: '#D6D3E0', fontSize: 11, backgroundColor: '#1B1A26', borderRadius: 10, padding: 10 },
  esperando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  esperandoTxt: { color: '#34D399', fontSize: 12.5, fontWeight: '700' },
  pixVence: { color: '#8E8BA3', fontSize: 11.5, textAlign: 'center' },
  fechar: { color: '#8E8BA3', fontSize: 12.5, textAlign: 'center', fontWeight: '700' },
});
