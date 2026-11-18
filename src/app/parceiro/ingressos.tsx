// Modo parceiro — Ingressos (Divulgar › Ingressos). Migração 131.
// 1) Conectar a conta Mercado Pago da casa (uma vez, só o dono): o dinheiro cai direto lá.
// 2) Em cada festa: ligar a venda, quem paga a taxa, os lotes (preço, quantidade, meia) e as vendas ao vivo.
// A porta lê o QR do ingresso no modo porta.
// Fase 2 (migração 132): virada de lote (datas e automática), cupons de desconto, cortesias por link e
// lista de compradores com reembolso.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BarraSalvar, Campo, CampoData, Chips } from '../../components/parceiro/form';
import CartaoMercadoPago from '../../components/parceiro/CartaoMercadoPago';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { linkCortesia, pedirReembolso, reais } from '../../lib/ingressos';
import { useModoParceiro } from '../../lib/modoParceiro';
import { URL_PORTAL } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

type Festa = { id: string; titulo: string; data_inicio: string; ingressos_ativos: boolean; ingresso_taxa_paga_por: 'comprador' | 'casa'; ingresso_virada_automatica: boolean };
type Lote = { id: string; nome: string; preco_centavos: number; quantidade: number; permite_meia: boolean; ativo: boolean; ordem: number; inicio_venda: string | null; fim_venda: string | null; cortesia: boolean };
type CupomIng = { id: string; codigo: string; tipo: 'pct' | 'valor'; valor: number; limite_usos: number | null; ativo: boolean };
type Comprador = { pedido_id: string; status: string; total_centavos: number; desconto_centavos: number; pago_em: string | null; cortesia: boolean;
  ingressos: { titular: string; lote: string; meia: boolean; status: string; resgatar: boolean; codigo: string | null }[] };
const CUPOM_VAZIO = { codigo: '', tipo: 'pct' as 'pct' | 'valor', valor: '', limite: '' };
type Vendas = { vendidos: number; entraram: number; meias: number; bruto_centavos: number; taxa_casa_centavos: number; lotes: { id: string; vendidos: number }[] };
const LOTE_VAZIO = { id: '', nome: '1º lote', preco: '', quantidade: '100', permite_meia: true, inicio: '' as string, fim: '' as string };
const diaDe = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10) : '');
const hojeBR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const dia = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} · ${String(d.getHours()).padStart(2, '0')}h`;
};
const br = (iso: string) => diaDe(iso).split('-').reverse().slice(0, 2).join('/');
const centavos = (v: string) => Math.round(Number(v.replace(/\./g, '').replace(',', '.')) * 100);

export default function IngressosDoParceiro() {
  const router = useRouter();
  const { conectado, festa: festaPedida } = useLocalSearchParams<{ conectado?: string; festa?: string }>();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const dono = localAtivo?.papel === 'dono';
  const podeEditar = pode('festa');
  const pct = 5; // 140: taxa do Dicas igual em todos os planos (ingresso_config)

  const [mp, setMp] = useState<{ conectado: boolean; desde: string | null } | null>(null);
  const [festas, setFestas] = useState<Festa[] | null>(null);
  const [sel, setSel] = useState<Festa | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [vendas, setVendas] = useState<Vendas | null>(null);
  const [form, setForm] = useState<typeof LOTE_VAZIO | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cupons, setCupons] = useState<CupomIng[]>([]);
  const [formCupom, setFormCupom] = useState<typeof CUPOM_VAZIO | null>(null);
  const [nomesCortesia, setNomesCortesia] = useState<string | null>(null);
  const [compradores, setCompradores] = useState<Comprador[] | null>(null);
  const [verCompradores, setVerCompradores] = useState(false);

  const carregar = useCallback(async () => {
    if (!localId) return;
    const [m, f] = await Promise.all([
      supabase.rpc('mp_status_da_casa', { p_local: localId }),
      (supabase.from('eventos') as any).select('id, titulo, data_inicio, ingressos_ativos, ingresso_taxa_paga_por, ingresso_virada_automatica')
        .eq('local_id', localId).gte('data_inicio', new Date(Date.now() - 12 * 3600e3).toISOString()).neq('status', 'cancelado').order('data_inicio').limit(30),
    ]);
    setMp((m.data as any) || { conectado: false, desde: null });
    setFestas((f.data as Festa[]) || []);
  }, [localId]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));
  // 18/11: vindo do cadastro da festa (tique "Vender ingresso pelo app"), já abre essa festa.
  const abriuPedida = useRef(false);
  useEffect(() => {
    if (!festaPedida || !festas || abriuPedida.current) return;
    const f = festas.find((x) => x.id === festaPedida);
    if (f) { abriuPedida.current = true; setSel(f); }
  }, [festaPedida, festas]);
  useEffect(() => { if (conectado) void carregar(); }, [conectado, carregar]);

  const carregarFesta = useCallback(async (f: Festa) => {
    const [l, v, c, cp] = await Promise.all([
      (supabase.from('ingresso_lotes') as any).select('id, nome, preco_centavos, quantidade, permite_meia, ativo, ordem, inicio_venda, fim_venda, cortesia').eq('evento_id', f.id).order('ordem'),
      supabase.rpc('vendas_do_evento', { p_evento: f.id }),
      (supabase.from('ingresso_cupons') as any).select('id, codigo, tipo, valor, limite_usos, ativo').eq('evento_id', f.id).order('created_at'),
      supabase.rpc('compradores_do_evento', { p_evento: f.id }),
    ]);
    setLotes(((l.data as Lote[]) || []).filter((x) => !x.cortesia));
    setVendas((v.data as Vendas) || null);
    setCupons((c.data as CupomIng[]) || []);
    setCompradores(cp.error ? [] : ((cp.data as Comprador[]) || []));
  }, []);
  useEffect(() => {
    if (!sel) return;
    void carregarFesta(sel);
    const t = setInterval(() => { void carregarFesta(sel); }, 30 * 1000);
    return () => clearInterval(t);
  }, [sel?.id, carregarFesta]);

  async function conectarMp() {
    const { data, error } = await supabase.rpc('mp_iniciar_conexao', { p_local: localId });
    if (error || !data) return Alert.alert('Mercado Pago', error?.message || 'Não deu agora.');
    await Linking.openURL(`${URL_PORTAL}/api/mp/conectar?estado=${data}`);
  }

  async function mudarFesta(campos: Partial<Festa>) {
    if (!sel) return;
    if (campos.ingressos_ativos && !lotes.some((l) => l.ativo)) return Alert.alert('Ingressos', 'Crie pelo menos um lote antes de ligar a venda.');
    if (campos.ingressos_ativos && lotes.some((l) => l.ativo && l.preco_centavos > 0) && !mp?.conectado) {
      return Alert.alert('Ingressos', 'A venda de ingresso pago precisa da conta Mercado Pago da casa conectada (em breve, se ainda não aparecer o botão). Ingresso grátis e Lista VIP já funcionam.');
    }
    const { error } = await (supabase.from('eventos') as any).update(campos).eq('id', sel.id);
    if (error) return Alert.alert('Ingressos', error.message);
    const nova = { ...sel, ...campos };
    setSel(nova);
    setFestas((festas || []).map((f) => (f.id === sel.id ? nova : f)));
  }

  async function salvarLote() {
    if (!sel || !form) return;
    const preco = form.preco.trim() ? centavos(form.preco) : 0;
    const qtd = parseInt(form.quantidade, 10);
    if (form.nome.trim().length < 2) return Alert.alert('Lote', 'Dê um nome ao lote (ex.: 1º lote, Pista, Camarote).');
    if (Number.isNaN(preco) || preco < 0) return Alert.alert('Lote', 'Confira o preço (ex.: 40 ou 39,90). Em branco = grátis.');
    if (!qtd || qtd < 1) return Alert.alert('Lote', 'Quantos ingressos tem este lote?');
    setSalvando(true);
    if (form.inicio && form.fim && form.fim < form.inicio) return Alert.alert('Lote', 'A data de parar de vender vem antes da de começar.');
    const campos = { nome: form.nome.trim().slice(0, 40), preco_centavos: preco, quantidade: qtd, permite_meia: form.permite_meia,
      inicio_venda: form.inicio ? `${form.inicio}T00:00:00-03:00` : null, fim_venda: form.fim ? `${form.fim}T23:59:59-03:00` : null };
    const { error } = form.id
      ? await (supabase.from('ingresso_lotes') as any).update(campos).eq('id', form.id)
      : await (supabase.from('ingresso_lotes') as any).insert({ ...campos, evento_id: sel.id, ordem: lotes.length });
    setSalvando(false);
    if (error) return Alert.alert('Lote', error.message);
    setForm(null);
    void carregarFesta(sel);
  }

  async function salvarCupom() {
    if (!sel || !formCupom) return;
    const codigo = formCupom.codigo.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return Alert.alert('Cupom', 'Código de 3 a 20 letras e números, sem espaço (ex.: VEZPA10).');
    const valor = formCupom.tipo === 'pct' ? parseInt(formCupom.valor, 10) : centavos(formCupom.valor);
    if (!valor || valor < 1 || (formCupom.tipo === 'pct' && valor > 100)) return Alert.alert('Cupom', formCupom.tipo === 'pct' ? 'Desconto de 1 a 100%.' : 'Coloque o valor do desconto em reais.');
    const limite = formCupom.limite.trim() ? parseInt(formCupom.limite, 10) : null;
    setSalvando(true);
    const { error } = await (supabase.from('ingresso_cupons') as any).insert({ evento_id: sel.id, codigo, tipo: formCupom.tipo, valor, limite_usos: limite && limite > 0 ? limite : null });
    setSalvando(false);
    if (error) return Alert.alert('Cupom', error.message.includes('duplicate') ? 'Já existe um cupom com esse código nesta festa.' : error.message);
    setFormCupom(null);
    void carregarFesta(sel);
  }

  async function ligarCupom(c: CupomIng, ativo: boolean) {
    const { error } = await (supabase.from('ingresso_cupons') as any).update({ ativo }).eq('id', c.id);
    if (error) return Alert.alert('Cupom', error.message);
    if (sel) void carregarFesta(sel);
  }

  async function emitirCortesias() {
    if (!sel || nomesCortesia === null) return;
    const nomes = nomesCortesia.split('\n').map((n) => n.trim()).filter((n) => n.length >= 2);
    if (!nomes.length) return Alert.alert('Cortesias', 'Escreva um nome por linha.');
    if (nomes.length > 50) return Alert.alert('Cortesias', 'Até 50 nomes por vez.');
    setSalvando(true);
    const { data, error } = await supabase.rpc('emitir_cortesias', { p_evento: sel.id, p_nomes: nomes });
    setSalvando(false);
    if (error) return Alert.alert('Cortesias', error.message);
    const lista = (data as { titular: string; codigo: string }[]) || [];
    setNomesCortesia(null);
    void carregarFesta(sel);
    await Share.share({ message: `Cortesias · ${sel.titulo}\n\n` + lista.map((c) => `${c.titular}: ${linkCortesia(c.codigo)}`).join('\n') + '\n\nAbra o link no celular para guardar o ingresso no app Dicas LGBT+.' });
  }

  function reembolsarPedido(c: Comprador) {
    Alert.alert('Reembolsar este pedido?', `Devolve ${reais(c.total_centavos)} pelo Mercado Pago e cancela ${c.ingressos.length > 1 ? `os ${c.ingressos.length} ingressos` : 'o ingresso'}. O valor sai da conta Mercado Pago da casa.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Reembolsar', style: 'destructive', onPress: async () => {
        try { await pedirReembolso(c.pedido_id); Alert.alert('Pronto', 'Reembolso feito.'); if (sel) void carregarFesta(sel); }
        catch (e: any) { Alert.alert('Reembolso', e?.message || 'Não deu agora.'); }
      } },
    ]);
  }

  async function ligarLote(l: Lote, ativo: boolean) {
    const { error } = await (supabase.from('ingresso_lotes') as any).update({ ativo }).eq('id', l.id);
    if (error) return Alert.alert('Lote', error.message);
    if (sel) void carregarFesta(sel);
  }

  const Voltar = (
    <TouchableOpacity style={e.voltar} onPress={() => (form ? setForm(null) : sel ? setSel(null) : router.back())} accessibilityRole="button">
      <Feather name="chevron-left" size={16} color={CP.dim} /><Text style={e.voltarTxt}>Voltar</Text>
    </TouchableOpacity>
  );

  if (!localAtivo) return <TelaParceiro titulo="Ingressos"><ActivityIndicator color={CP.rosa} /></TelaParceiro>;

  // Formulário do lote
  if (sel && form) {
    return (
      <TelaParceiro titulo={form.id ? 'Editar lote' : 'Novo lote'} subtitulo={sel.titulo}>
        {Voltar}
        <View style={{ gap: ESP.m, marginTop: ESP.s }}>
          <Campo rotulo="Nome do lote" valor={form.nome} aoMudar={(v) => setForm({ ...form, nome: v })} exemplo="Ex.: 1º lote, Pista, Camarote" />
          <Campo rotulo="Preço (R$)" valor={form.preco} aoMudar={(v) => setForm({ ...form, preco: v.replace(/[^\d.,]/g, '') })} teclado="decimal-pad" exemplo="Ex.: 40" ajuda="Em branco = ingresso grátis (sai na hora, sem pagamento)." />
          <Campo rotulo="Quantidade" valor={form.quantidade} aoMudar={(v) => setForm({ ...form, quantidade: v.replace(/\D/g, '') })} teclado="number-pad" exemplo="Ex.: 100" ajuda="O público não vê o total; vê só &quot;Últimos ingressos&quot; perto de acabar." />
          <CampoData rotulo="Começa a vender (opcional)" valor={form.inicio || null} aoMudar={(v) => setForm({ ...form, inicio: v })} min={hojeBR()} ajuda="Em branco: vende assim que ligar. Ex.: 2º lote só a partir de sábado." />
          <CampoData rotulo="Para de vender (opcional)" valor={form.fim || null} aoMudar={(v) => setForm({ ...form, fim: v })} min={form.inicio || hojeBR()} />
          <View style={e.linhaSwitch}>
            <View style={{ flex: 1 }}><Text style={e.itemTit}>Meia-entrada</Text><Text style={e.itemSub}>Metade do preço. A porta confere o documento (lei 12.933/2013).</Text></View>
            <Switch value={form.permite_meia} onValueChange={(v) => setForm({ ...form, permite_meia: v })} trackColor={{ true: CP.verde, false: '#3A3950' }} thumbColor="#FFF" />
          </View>
          <BarraSalvar rotulo="Salvar lote" salvando={salvando} aoSalvar={() => void salvarLote()} />
        </View>
      </TelaParceiro>
    );
  }

  // Uma festa
  if (sel) {
    const vendidosDo = (id: string) => vendas?.lotes.find((x) => x.id === id)?.vendidos ?? 0;
    return (
      <TelaParceiro titulo={sel.titulo} subtitulo={dia(sel.data_inicio)}>
        {Voltar}
        <View style={e.card}>
          <View style={e.linhaSwitch}>
            <View style={{ flex: 1 }}><Text style={e.itemTit}>Vender ingressos pelo app</Text><Text style={e.itemSub}>{sel.ingressos_ativos ? 'À venda na página da festa.' : 'Desligado: ninguém vê os lotes.'}</Text></View>
            <Switch value={sel.ingressos_ativos} disabled={!podeEditar} onValueChange={(v) => void mudarFesta({ ingressos_ativos: v })} trackColor={{ true: CP.verde, false: '#3A3950' }} thumbColor="#FFF" />
          </View>
          <View style={e.linhaSwitch}>
            <View style={{ flex: 1 }}><Text style={e.itemTit}>Virada automática de lote</Text><Text style={e.itemSub}>Vende um lote de cada vez, na ordem. Quando esgota (ou acaba o prazo), abre o próximo.</Text></View>
            <Switch value={!!sel.ingresso_virada_automatica} disabled={!podeEditar} onValueChange={(v) => void mudarFesta({ ingresso_virada_automatica: v })} trackColor={{ true: CP.verde, false: '#3A3950' }} thumbColor="#FFF" />
          </View>
          <Chips rotulo={`Quem paga a taxa do app (${pct}%, mínimo R$ 2)?`} opcoes={[{ valor: 'comprador', rotulo: 'O comprador' }, { valor: 'casa', rotulo: 'A casa' }] as any}
            valor={sel.ingresso_taxa_paga_por} aoMudar={(v) => void mudarFesta({ ingresso_taxa_paga_por: v as Festa['ingresso_taxa_paga_por'] })} />
        </View>

        <View style={e.numeros}>
          <View style={e.numero}><Text style={e.numeroN}>{vendas?.vendidos ?? '—'}</Text><Text style={e.numeroR}>vendidos{vendas?.meias ? ` · ${vendas.meias} meias` : ''}</Text></View>
          <View style={e.numero}><Text style={e.numeroN}>{vendas ? reais(vendas.bruto_centavos) : '—'}</Text><Text style={e.numeroR}>em ingressos{vendas ? ` · ${vendas.entraram} entraram` : ''}</Text></View>
        </View>

        <TituloSecao texto="LOTES" info="O público vê o nome, o preço e se está acabando. Desligue um lote para parar a venda dele." />
        <View style={e.lista}>
          {lotes.length === 0 && <Text style={[e.itemSub, { padding: ESP.m }]}>Nenhum lote ainda.</Text>}
          {lotes.map((l, i) => (
            <TouchableOpacity key={l.id} style={[e.item, i < lotes.length - 1 && e.itemBorda]} disabled={!podeEditar}
              onPress={() => setForm({ id: l.id, nome: l.nome, preco: l.preco_centavos ? String(l.preco_centavos / 100).replace('.', ',') : '', quantidade: String(l.quantidade), permite_meia: l.permite_meia, inicio: diaDe(l.inicio_venda), fim: diaDe(l.fim_venda) })} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={[e.itemTit, !l.ativo && { color: CP.fraco }]}>{l.nome}</Text>
                <Text style={e.itemSub}>{l.preco_centavos ? reais(l.preco_centavos) : 'Grátis'}{l.permite_meia && l.preco_centavos ? ' · com meia' : ''} · {vendidosDo(l.id)} de {l.quantidade}</Text>
                {(l.inicio_venda || l.fim_venda) && <Text style={e.itemSub}>{l.inicio_venda ? `de ${br(l.inicio_venda)} ` : ''}{l.fim_venda ? `até ${br(l.fim_venda)}` : ''}</Text>}
              </View>
              <Switch value={l.ativo} disabled={!podeEditar} onValueChange={(v) => void ligarLote(l, v)} trackColor={{ true: CP.verde, false: '#3A3950' }} thumbColor="#FFF" />
            </TouchableOpacity>
          ))}
        </View>
        {podeEditar && (
          <TouchableOpacity style={e.mais} onPress={() => setForm({ ...LOTE_VAZIO, nome: `${lotes.length + 1}º lote` })} accessibilityRole="button">
            <Feather name="plus" size={14} color={CP.rosa} /><Text style={e.maisTxt}>Novo lote</Text>
          </TouchableOpacity>
        )}

        {/* Cupons de desconto */}
        <TituloSecao texto="CUPONS DE DESCONTO" info="O comprador digita o código na hora de pagar. Pode ser % ou R$, com limite de usos." />
        {formCupom ? (
          <View style={[e.card, { gap: ESP.m }]}>
            <Campo rotulo="Código" valor={formCupom.codigo} aoMudar={(v) => setFormCupom({ ...formCupom, codigo: v.toUpperCase().replace(/[^A-Z0-9]/g, '') })} exemplo="Ex.: VEZPA10" />
            <Chips rotulo="Tipo" opcoes={[{ valor: 'pct', rotulo: '% de desconto' }, { valor: 'valor', rotulo: 'R$ de desconto' }] as any} valor={formCupom.tipo} aoMudar={(v) => setFormCupom({ ...formCupom, tipo: v as 'pct' | 'valor' })} />
            <Campo rotulo={formCupom.tipo === 'pct' ? 'Desconto (%)' : 'Desconto (R$)'} valor={formCupom.valor} aoMudar={(v) => setFormCupom({ ...formCupom, valor: v.replace(/[^\d.,]/g, '') })} teclado="decimal-pad" exemplo={formCupom.tipo === 'pct' ? 'Ex.: 10' : 'Ex.: 15'} />
            <Campo rotulo="Limite de usos (opcional)" valor={formCupom.limite} aoMudar={(v) => setFormCupom({ ...formCupom, limite: v.replace(/\D/g, '') })} teclado="number-pad" exemplo="Ex.: 50" />
            <BarraSalvar rotulo="Criar cupom" salvando={salvando} aoSalvar={() => void salvarCupom()} secundario={{ rotulo: 'Cancelar', aoTocar: () => setFormCupom(null) }} />
          </View>
        ) : (
          <>
            {cupons.length > 0 && (
              <View style={e.lista}>
                {cupons.map((c, i) => (
                  <View key={c.id} style={[e.item, i < cupons.length - 1 && e.itemBorda]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[e.itemTit, !c.ativo && { color: CP.fraco }]}>{c.codigo}</Text>
                      <Text style={e.itemSub}>{c.tipo === 'pct' ? `${c.valor}% off` : `${reais(c.valor)} off`}{c.limite_usos ? ` · até ${c.limite_usos} usos` : ''}</Text>
                    </View>
                    <Switch value={c.ativo} disabled={!podeEditar} onValueChange={(v) => void ligarCupom(c, v)} trackColor={{ true: CP.verde, false: '#3A3950' }} thumbColor="#FFF" />
                  </View>
                ))}
              </View>
            )}
            {podeEditar && (
              <TouchableOpacity style={e.mais} onPress={() => setFormCupom({ ...CUPOM_VAZIO })} accessibilityRole="button">
                <Feather name="tag" size={14} color={CP.rosa} /><Text style={e.maisTxt}>Novo cupom</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Cortesias */}
        <TituloSecao texto="CORTESIAS" info="Ingresso grátis com o nome da pessoa. Você manda o link no WhatsApp; ela abre e guarda o ingresso no app." />
        {nomesCortesia !== null ? (
          <View style={[e.card, { gap: ESP.m }]}>
            <Text style={e.itemSub}>Um nome por linha (até 50):</Text>
            <TextInput style={e.areaNomes} value={nomesCortesia} onChangeText={setNomesCortesia} multiline placeholder={'Maria Souza\nJoão Lima'} placeholderTextColor={CP.fraco} autoCapitalize="words" />
            <BarraSalvar rotulo="Emitir e enviar links" salvando={salvando} aoSalvar={() => void emitirCortesias()} secundario={{ rotulo: 'Cancelar', aoTocar: () => setNomesCortesia(null) }} />
          </View>
        ) : podeEditar ? (
          <TouchableOpacity style={e.mais} onPress={() => setNomesCortesia('')} accessibilityRole="button">
            <Feather name="gift" size={14} color={CP.rosa} /><Text style={e.maisTxt}>Emitir cortesias</Text>
          </TouchableOpacity>
        ) : null}

        {/* Página de venda no site (quem não tem o app compra por lá; a mesma conta) */}
        <TouchableOpacity style={e.mais} onPress={() => Share.share({ message: `${sel.titulo} · ingressos: ${URL_PORTAL}/e/${sel.id}` })} accessibilityRole="button">
          <Feather name="share-2" size={14} color={CP.rosa} /><Text style={e.maisTxt}>Divulgar a página de venda no site</Text>
        </TouchableOpacity>
        {/* 139 — perfil de quem comprou e de quem entrou (faixa etária, chegada, novos x recorrentes, gostos) */}
        <TouchableOpacity style={e.mais} onPress={() => router.push(`/parceiro/publico?festa=${sel.id}` as any)} accessibilityRole="button">
          <Feather name="bar-chart-2" size={14} color={CP.rosa} /><Text style={e.maisTxt}>Ver o perfil do público desta festa</Text>
        </TouchableOpacity>

        {/* Compradores */}
        <TituloSecao texto="COMPRADORES" info="Nomes de cada ingresso (sem contato). A casa pode reembolsar um pedido a qualquer hora (ex.: festa cancelada)." />
        {compradores === null ? <ActivityIndicator color={CP.rosa} /> : compradores.length === 0 ? (
          <Text style={e.itemSub}>Ninguém comprou ainda.</Text>
        ) : (
          <>
            <TouchableOpacity style={e.mais} onPress={() => setVerCompradores(!verCompradores)} accessibilityRole="button">
              <Feather name={verCompradores ? 'chevron-up' : 'chevron-down'} size={14} color={CP.rosa} />
              <Text style={e.maisTxt}>{verCompradores ? 'Esconder' : `Ver ${compradores.length} ${compradores.length === 1 ? 'pedido' : 'pedidos'}`}</Text>
            </TouchableOpacity>
            {verCompradores && (
              <View style={e.lista}>
                {compradores.map((c, i) => (
                  <View key={c.pedido_id} style={[e.pedido, i < compradores.length - 1 && e.itemBorda]}>
                    {c.ingressos.map((g, k) => (
                      <View key={k} style={e.pedidoLinha}>
                        <Text style={[e.itemTit, { flex: 1 }, g.status === 'cancelado' && { color: CP.fraco, textDecorationLine: 'line-through' }]} numberOfLines={1}>{g.titular}</Text>
                        <Text style={e.itemSub}>{g.lote}{g.meia ? ' · meia' : ''}{g.status === 'usado' ? ' · entrou' : ''}{g.resgatar ? ' · link não aberto' : ''}</Text>
                        {g.resgatar && g.codigo && (
                          <TouchableOpacity onPress={() => void Share.share({ message: `${g.titular}, sua cortesia para ${sel.titulo}: ${linkCortesia(g.codigo!)}` })} accessibilityRole="button" accessibilityLabel={`Reenviar link de ${g.titular}`}>
                            <Feather name="send" size={14} color={CP.rosa} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <View style={e.pedidoLinha}>
                      <Text style={[e.itemSub, { flex: 1 }]}>{c.cortesia ? 'Cortesia' : `${reais(c.total_centavos)}${c.desconto_centavos ? ` · cupom −${reais(c.desconto_centavos)}` : ''}`}{c.status === 'reembolsado' ? ' · REEMBOLSADO' : ''}</Text>
                      {podeEditar && c.status === 'pago' && c.total_centavos > 0 && (
                        <TouchableOpacity onPress={() => reembolsarPedido(c)} accessibilityRole="button"><Text style={e.reembolsar}>Reembolsar</Text></TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={[e.itemSub, { marginTop: ESP.m }]}>Na porta: abra o modo porta e leia o QR do ingresso. Ingresso já usado avisa na hora.</Text>
      </TelaParceiro>
    );
  }

  // Início
  return (
    <TelaParceiro titulo="Ingressos" subtitulo="Venda pelo app, receba direto na sua conta e leia o QR na porta.">
      {Voltar}
      <CartaoMercadoPago localId={localId} dono={dono} taxaPct={pct} />

      <TituloSecao texto="FESTAS" />
      {festas === null ? <ActivityIndicator color={CP.rosa} /> : festas.length === 0 ? (
        <Text style={e.itemSub}>Nenhuma festa nos próximos dias. Crie uma em Divulgar › Nova festa.</Text>
      ) : (
        <View style={e.lista}>
          {festas.map((f, i) => (
            <TouchableOpacity key={f.id} style={[e.item, i < festas.length - 1 && e.itemBorda]} onPress={() => setSel(f)} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={e.itemTit} numberOfLines={1}>{f.titulo}</Text>
                <Text style={e.itemSub}>{dia(f.data_inicio)}</Text>
              </View>
              <Text style={[e.status, { color: f.ingressos_ativos ? '#34D399' : CP.fraco }]}>{f.ingressos_ativos ? 'À venda' : 'Sem venda'}</Text>
              <Feather name="chevron-right" size={16} color={CP.dim} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TelaParceiro>
  );
}

const e = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: ESP.s, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m, padding: ESP.m, gap: ESP.s, marginBottom: ESP.m },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: CP.rosa },
  itemTit: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  itemSub: { color: CP.dim, fontSize: 12.5, lineHeight: 17 },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', gap: ESP.m },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#009EE3', borderRadius: 999, minHeight: 46, marginTop: ESP.xs },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  numeros: { flexDirection: 'row', gap: ESP.s, marginBottom: ESP.m },
  numero: { flex: 1, backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m, padding: ESP.m },
  numeroN: { color: CP.texto, fontSize: 20, fontWeight: '900' },
  numeroR: { color: CP.dim, fontSize: 12 },
  lista: { backgroundColor: CP.card, borderWidth: 1, borderColor: CP.borda, borderRadius: RAIO.m },
  item: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, padding: ESP.m },
  itemBorda: { borderBottomWidth: 1, borderBottomColor: CP.borda },
  status: { fontSize: 12, fontWeight: '800' },
  mais: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: ESP.m, alignSelf: 'flex-start' },
  maisTxt: { color: CP.rosa, fontSize: 13, fontWeight: '800' },
  areaNomes: { minHeight: 110, borderWidth: 1, borderColor: CP.borda, borderRadius: 12, color: CP.texto, padding: 10, fontSize: 14, textAlignVertical: 'top' },
  pedido: { padding: ESP.m, gap: 6 },
  pedidoLinha: { flexDirection: 'row', alignItems: 'center', gap: ESP.s },
  reembolsar: { color: '#F87171', fontSize: 12.5, fontWeight: '800' },
});
