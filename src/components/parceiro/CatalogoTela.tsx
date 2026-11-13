// Etapas 12 e 14 — tela do catálogo (Produtos ou Pacotes e roteiros). Só o dono.
// Lista com foto, nome, preço e situação (no ar / pausado); tocar abre o editor; ativar/pausar e excluir (com confirmação).
// Regras em src/lib/parceiro/catalogo.ts (espelho de dashboard/produtos e dashboard/pacotes do portal).
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useModoParceiro } from '../../lib/modoParceiro';
import { alternarAtivo, DURACOES, ESTILOS, excluir, Item, ITEM_VAZIO, listar, moeda, salvar, Tipo, validar } from '../../lib/parceiro/catalogo';
import { BarraSalvar, Campo, Chips, confirmarSair, FotoUpload, Interruptor, estiloForm as f } from './form';
import { CP, ESP, RAIO, TelaParceiro } from './TelaParceiro';

const TEXTO: Record<Tipo, { titulo: string; sub: string; novo: string; vazio: string; um: string }> = {
  produtos: { titulo: 'Catálogo de produtos', sub: 'Aparecem na página da casa no app.', novo: 'Novo produto', vazio: 'Nenhum produto ainda. Adicione o primeiro: ele aparece na página da casa.', um: 'produto' },
  pacotes: { titulo: 'Pacotes e roteiros', sub: 'Aparecem na página da casa e em Pacotes, com filtros de destino, duração e estilo.', novo: 'Novo pacote', vazio: 'Nenhum pacote ainda. Crie o primeiro: ele aparece na página da casa e em Pacotes.', um: 'pacote' },
};

export default function CatalogoTela({ tipo, liberado, motivo }: { tipo: Tipo; liberado: boolean; motivo: string }) {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const t = TEXTO[tipo];
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Item | null>(null);
  const [mudando, setMudando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!liberado || !localId) { setCarregando(false); return; }
    try { setItens(await listar(tipo, localId)); } catch (e: any) { Alert.alert(t.titulo, e?.message); } finally { setCarregando(false); }
  }, [liberado, localId, tipo, t.titulo]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo={t.titulo}>
        <Text style={a.aviso}>{motivo}</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  const ativar = async (i: Item) => {
    setMudando(i.id);
    try { await alternarAtivo(tipo, i.id!, !i.ativo); setItens((l) => l.map((x) => (x.id === i.id ? { ...x, ativo: !i.ativo } : x))); }
    catch (e: any) { Alert.alert(t.titulo, e?.message); } finally { setMudando(null); }
  };

  return (
    <TelaParceiro titulo={t.titulo} subtitulo={t.sub} atualizando={false} aoAtualizar={() => void carregar()}>
      <TouchableOpacity style={a.voltar} onPress={() => router.back()} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      <TouchableOpacity style={a.novo} onPress={() => setEditando({ ...ITEM_VAZIO })} accessibilityRole="button">
        <Feather name="plus" size={20} color="#FFF" /><Text style={a.novoTxt}>{t.novo}</Text>
      </TouchableOpacity>
      {carregando ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} />
      ) : itens.length === 0 ? (
        <Text style={a.aviso}>{t.vazio}</Text>
      ) : (
        <View style={{ gap: ESP.s, marginTop: ESP.m }}>
          {itens.map((i) => {
            const preco = tipo === 'produtos' ? moeda(i.preco) : [moeda(i.precoDe) && `a partir de ${moeda(i.precoDe)}`, moeda(i.precoAte) && `até ${moeda(i.precoAte)}`].filter(Boolean).join(' ');
            const extra = tipo === 'pacotes' ? [i.destino, i.duracao, i.estilo].filter(Boolean).join(' · ') : '';
            return (
              <TouchableOpacity key={i.id} style={[a.cartao, !i.ativo && { opacity: 0.6 }]} onPress={() => setEditando({ ...i })} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${i.nome}. Toque para editar`}>
                <View style={a.foto}>{i.foto ? <Image source={{ uri: i.foto }} style={StyleSheet.absoluteFill} /> : <Feather name={tipo === 'produtos' ? 'package' : 'map'} size={18} color={CP.rosa} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={a.titulo} numberOfLines={1}>{i.nome}</Text>
                  {!!extra && <Text style={a.sub} numberOfLines={1}>{extra}</Text>}
                  {!!preco && <Text style={a.preco}>{preco}</Text>}
                  <Text style={[a.sit, { color: i.ativo ? CP.verde : '#E1A93A' }]}>{i.ativo ? 'No ar' : 'Pausado'}</Text>
                </View>
                <TouchableOpacity style={a.acao} onPress={() => void ativar(i)} disabled={mudando === i.id} accessibilityRole="button" accessibilityLabel={i.ativo ? 'Pausar' : 'Retomar'}>
                  {mudando === i.id ? <ActivityIndicator size="small" color={CP.dim} /> : <Feather name={i.ativo ? 'pause' : 'play'} size={16} color={CP.dim} />}
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {editando && <Editor tipo={tipo} localId={localId} item={editando} total={itens.length} aoFechar={() => setEditando(null)} aoSalvo={() => { setEditando(null); void carregar(); }} />}
    </TelaParceiro>
  );
}

function Editor({ tipo, localId, item, total, aoFechar, aoSalvo }: { tipo: Tipo; localId: string; item: Item; total: number; aoFechar: () => void; aoSalvo: () => void }) {
  const [i, setI] = useState<Item>(item);
  const [base] = useState(() => JSON.stringify(item));
  const [salvando, setSalvando] = useState(false);
  const sujo = JSON.stringify(i) !== base;
  const um = TEXTO[tipo].um;
  const mudar = (x: Partial<Item>) => setI((a) => ({ ...a, ...x }));
  const gravar = async () => {
    const e = validar(tipo, i);
    if (e) return Alert.alert('Falta ajustar', e);
    setSalvando(true);
    try { await salvar(tipo, localId, i, total); aoSalvo(); } catch (x: any) { Alert.alert(TEXTO[tipo].titulo, x?.message); } finally { setSalvando(false); }
  };
  const apagar = () =>
    Alert.alert(`Excluir este ${um}?`, `"${i.nome}" sai da página da casa. Se quiser só esconder, use Pausar.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { try { await excluir(tipo, i.id!); aoSalvo(); } catch (x: any) { Alert.alert(TEXTO[tipo].titulo, x?.message); } } },
    ]);
  const fechar = () => confirmarSair(sujo, aoFechar);
  return (
    <Modal visible animationType="slide" transparent onRequestClose={fechar}>
      <KeyboardAvoidingView style={f.fundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={f.folha}>
          <View style={f.folhaTopo}>
            <Text style={f.folhaTitulo}>{i.id ? `Editar ${um}` : TEXTO[tipo].novo}</Text>
            <TouchableOpacity style={f.fechar} onPress={fechar} accessibilityLabel="Fechar"><Feather name="x" size={22} color={CP.texto} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: ESP.m }}>
            <FotoUpload rotulo="Foto (opcional)" valor={i.foto} aoMudar={(u) => mudar({ foto: u })} bucket="fotos-locais" pasta={`${localId}/${tipo}`} prefixo="foto" altura={150} />
            <Campo rotulo="Nome" valor={i.nome} aoMudar={(v) => mudar({ nome: v })} max={80} erro={!i.nome.trim() && sujo ? 'Obrigatório.' : null} />
            <Campo rotulo="Descrição (opcional)" valor={i.descricao} aoMudar={(v) => mudar({ descricao: v })} linhas max={600} />
            {tipo === 'produtos' ? (
              <>
                <Campo rotulo="Preço (opcional)" valor={i.preco} aoMudar={(v) => mudar({ preco: v.replace(/[^\d.,]/g, '') })} teclado="decimal-pad" exemplo="Ex.: 49,90" />
                <Campo rotulo="Link de compra (opcional)" valor={i.link} aoMudar={(v) => mudar({ link: v })} icone="link" teclado="url" autoCapitalize="none" exemplo="https://…" />
              </>
            ) : (
              <>
                <Campo rotulo="Destino" valor={i.destino} aoMudar={(v) => mudar({ destino: v })} max={80} exemplo="Ex.: Florianópolis" />
                <Chips rotulo="Duração" opcoes={DURACOES.map((d) => ({ valor: d, rotulo: d }))} valor={i.duracao || null} aoMudar={(v) => mudar({ duracao: i.duracao === v ? '' : v })} />
                <Chips rotulo="Estilo" opcoes={ESTILOS.map((d) => ({ valor: d, rotulo: d }))} valor={i.estilo || null} aoMudar={(v) => mudar({ estilo: i.estilo === v ? '' : v })} />
                <View style={{ flexDirection: 'row', gap: ESP.s }}>
                  <View style={{ flex: 1 }}><Campo rotulo="A partir de (R$)" valor={i.precoDe} aoMudar={(v) => mudar({ precoDe: v.replace(/[^\d.,]/g, '') })} teclado="decimal-pad" /></View>
                  <View style={{ flex: 1 }}><Campo rotulo="Até (R$)" valor={i.precoAte} aoMudar={(v) => mudar({ precoAte: v.replace(/[^\d.,]/g, '') })} teclado="decimal-pad" /></View>
                </View>
              </>
            )}
            <Interruptor titulo="No ar" explicacao="Desligue para esconder sem apagar." valor={i.ativo} aoMudar={(v) => mudar({ ativo: v })} />
          </ScrollView>
          <BarraSalvar emFolha rotulo="Salvar" salvando={salvando} aoSalvar={() => void gravar()} desabilitado={!!i.id && !sujo} secundario={i.id ? { rotulo: 'Excluir', aoTocar: apagar, perigo: true } : undefined} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  novo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESP.s, minHeight: 52, borderRadius: RAIO.m, backgroundColor: CP.rosa, marginTop: ESP.m },
  novoTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  foto: { width: 56, height: 56, borderRadius: RAIO.s, overflow: 'hidden', backgroundColor: '#2A1B3D', alignItems: 'center', justifyContent: 'center' },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  preco: { color: '#FFD54F', fontSize: 12, fontWeight: '700', marginTop: 2 },
  sit: { fontSize: 11, fontWeight: '800', marginTop: 3 },
  acao: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: CP.borda, alignItems: 'center', justifyContent: 'center' },
});
