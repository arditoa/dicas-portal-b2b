// Modo equipe · Subcategorias de uma categoria: mostrar/esconder, "Em breve", mudar nome/ícone, ordem e criar novas.
//   ?categoria=<categoria real do banco: lugares, gastronomia… ou 'festas'>&titulo=<nome da categoria>
// Mostrar/esconder e Em breve: subcategoria_config (065). Nome, ícone, ordem e novas: subcategorias_app (148).
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { carregarSubcategorias, normTxt, SubDef, SUBCATEGORIAS } from '../../lib/subcategorias';
import { supabase } from '../../lib/supabase';

const ICONES = ['users', 'coffee', 'droplet', 'triangle', 'music', 'heart', 'sun', 'disc', 'mic', 'star', 'film', 'smile', 'tag', 'zap', 'gift', 'camera', 'map', 'award', 'feather', 'moon', 'globe', 'scissors', 'shopping-bag', 'book-open', 'briefcase', 'compass', 'package', 'home', 'navigation', 'anchor', 'umbrella', 'sunrise'];
type Forma = { chave: string | null; rotulo: string; curto: string; icone: string; palavras: string };

export default function SubcategoriasAdm() {
  const { categoria, titulo } = useLocalSearchParams<{ categoria: string; titulo?: string }>();
  const cat = String(categoria || '');
  const [defs, setDefs] = useState<SubDef[] | null>(null);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [breve, setBreve] = useState<Set<string>>(new Set());
  const [ativas, setAtivas] = useState<Set<string>>(new Set());
  const [semTabela, setSemTabela] = useState(false);
  const [forma, setForma] = useState<Forma | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const [d, cfg, t] = await Promise.all([
      carregarSubcategorias(cat, true),
      supabase.from('subcategoria_config').select('chave, ativo').eq('categoria', cat),
      (supabase.from('subcategorias_app') as any).select('chave').limit(1),
    ]);
    setDefs(d);
    setSemTabela(!!t.error);
    const o = new Set<string>(), b = new Set<string>(), a = new Set<string>();
    for (const r of ((cfg.data as any[]) || [])) {
      const k = String(r.chave);
      if (k.startsWith('breve:')) (r.ativo ? b : a).add(k.slice(6));
      else if (r.ativo === false) o.add(k);
    }
    setOff(o); setBreve(b); setAtivas(a);
  }, [cat]);
  useEffect(() => { void carregar(); }, [carregar]);

  const padrao = (k: string) => (SUBCATEGORIAS[cat] || []).find((d) => d.chave === k);
  const ehBreve = (d: SubDef) => breve.has(d.chave) || (!ativas.has(d.chave) && !!d.breve);

  const ligar = async (d: SubDef, v: boolean) => {
    setOff((s) => { const n = new Set(s); v ? n.delete(d.chave) : n.add(d.chave); return n; });
    const { error } = await supabase.from('subcategoria_config').upsert({ categoria: cat, chave: d.chave, ativo: v, atualizado_em: new Date().toISOString() });
    if (error) { Alert.alert('Subcategoria', error.message); void carregar(); }
  };
  const mudarBreve = async (d: SubDef, v: boolean) => {
    const { error } = await supabase.from('subcategoria_config').upsert({ categoria: cat, chave: `breve:${d.chave}`, ativo: v, atualizado_em: new Date().toISOString() });
    if (error) return Alert.alert('Subcategoria', error.message);
    void carregar();
  };
  // Grava a ordem atual de todas (a tabela guarda a posição de cada uma).
  const gravarOrdem = async (lista: SubDef[]) => {
    const linhas = lista.map((d, i) => ({ categoria: cat, chave: d.chave, rotulo: d.rotulo, curto: d.curto, icone: d.icone, ordem: i, nova: !padrao(d.chave),
      palavras: padrao(d.chave) ? [] : d.palavras, atualizado_em: new Date().toISOString() }));
    const { error } = await (supabase.from('subcategorias_app') as any).upsert(linhas);
    if (error) Alert.alert('Ordem', error.message);
  };
  const mover = (i: number, dir: -1 | 1) => {
    if (!defs) return;
    const j = i + dir; if (j < 0 || j >= defs.length) return;
    const n = defs.slice(); [n[i], n[j]] = [n[j], n[i]]; setDefs(n); void gravarOrdem(n);
  };

  const salvar = async () => {
    if (!forma || !defs) return;
    const rotulo = forma.rotulo.trim();
    if (rotulo.length < 2) return Alert.alert('Subcategoria', 'Escreva o nome.');
    const chave = forma.chave || normTxt(rotulo);
    if (!forma.chave && defs.some((d) => d.chave === chave)) return Alert.alert('Subcategoria', 'Já existe uma subcategoria com esse nome.');
    setSalvando(true);
    const pos = forma.chave ? defs.findIndex((d) => d.chave === forma.chave) : defs.length;
    const { error } = await (supabase.from('subcategorias_app') as any).upsert({
      categoria: cat, chave, rotulo, curto: forma.curto.trim() || rotulo, icone: forma.icone, ordem: pos, nova: !padrao(chave),
      palavras: forma.palavras.split(',').map((x) => normTxt(x)).filter(Boolean), atualizado_em: new Date().toISOString(),
    });
    setSalvando(false);
    if (error) return Alert.alert('Subcategoria', error.message);
    setForma(null); void carregar();
  };
  const apagar = () => {
    if (!forma?.chave) return;
    const ehPadrao = !!padrao(forma.chave);
    Alert.alert(ehPadrao ? 'Voltar ao nome original?' : 'Apagar subcategoria?', ehPadrao ? 'Desfaz a troca de nome e ícone.' : 'As casas dela passam para "Outros". Para só tirar do app, use o botão Mostrar.', [
      { text: 'Voltar', style: 'cancel' },
      { text: ehPadrao ? 'Desfazer' : 'Apagar', style: 'destructive', onPress: async () => {
        const { error } = await (supabase.from('subcategorias_app') as any).delete().eq('categoria', cat).eq('chave', forma.chave);
        if (error) return Alert.alert('Subcategoria', error.message);
        setForma(null); void carregar();
      } },
    ]);
  };

  return (
    <TelaAdm titulo={`Subcategorias · ${titulo || cat}`} subtitulo="Nome no app: mostrar, esconder, editar e criar" voltar>
      {semTabela && <Text style={[sa.sub, { color: CA.amarelo, marginBottom: 10 }]}>Rode a migração 148 para mudar nome, ordem e criar novas. Mostrar/esconder já funciona.</Text>}
      {defs === null ? <ActivityIndicator color={CA.rosa} /> : (
        <View style={sa.lista}>
          {defs.map((d, i) => {
            const visivel = !off.has(d.chave);
            return (
              <View key={d.chave} style={[c.linha, i < defs.length - 1 && sa.borda]}>
                <View style={c.setas}>
                  <TouchableOpacity onPress={() => mover(i, -1)} disabled={i === 0 || semTabela} hitSlop={6}><Feather name="chevron-up" size={16} color={i === 0 ? '#3A3950' : CA.dim} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => mover(i, 1)} disabled={i === defs.length - 1 || semTabela} hitSlop={6}><Feather name="chevron-down" size={16} color={i === defs.length - 1 ? '#3A3950' : CA.dim} /></TouchableOpacity>
                </View>
                <View style={c.icone}><Feather name={d.icone as any} size={16} color={visivel ? CA.texto : CA.fraco} /></View>
                <TouchableOpacity style={{ flex: 1, minWidth: 0 }} disabled={semTabela}
                  onPress={() => setForma({ chave: d.chave, rotulo: d.rotulo, curto: d.curto, icone: d.icone, palavras: padrao(d.chave) ? '' : d.palavras.filter((p) => p !== normTxt(d.rotulo)).join(', ') })}>
                  <Text style={[sa.tit, !visivel && { color: CA.fraco }]} numberOfLines={1}>{d.rotulo}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <TouchableOpacity onPress={() => void mudarBreve(d, !ehBreve(d))} style={[c.chip, ehBreve(d) && c.chipOn]}>
                      <Text style={[c.chipTxt, ehBreve(d) && { color: '#0B0B0E' }]}>{ehBreve(d) ? 'Em breve' : 'Aberta'}</Text>
                    </TouchableOpacity>
                    {!padrao(d.chave) && <View style={c.chip}><Text style={c.chipTxt}>Nova</Text></View>}
                  </View>
                </TouchableOpacity>
                <Switch value={visivel} onValueChange={(v) => void ligar(d, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
              </View>
            );
          })}
        </View>
      )}
      <Text style={[sa.vazio, { marginTop: 8 }]}>Chave: o nome/ícone aparece ou some no app. Toque no nome para editar. "Aberta / Em breve" troca o selo. Página própria com banners: na Vitrine › categoria.</Text>
      <TouchableOpacity style={[sa.botao, { marginTop: 14 }, semTabela && { opacity: 0.5 }]} disabled={semTabela} onPress={() => setForma({ chave: null, rotulo: '', curto: '', icone: 'tag', palavras: '' })}>
        <Text style={sa.botaoTxt}>+ Nova subcategoria</Text>
      </TouchableOpacity>

      <Modal visible={!!forma} transparent animationType="slide" onRequestClose={() => setForma(null)}>
        <View style={c.fundo}>
          <View style={c.folha}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[sa.tit, { fontSize: 15, marginBottom: 6 }]}>{forma?.chave ? 'Editar subcategoria' : 'Nova subcategoria'}</Text>
              <Text style={c.rot}>Nome *</Text>
              <TextInput value={forma?.rotulo} onChangeText={(v) => forma && setForma({ ...forma, rotulo: v })} placeholder="Ex.: Festas afro" placeholderTextColor={CA.fraco} maxLength={40} style={sa.campoBusca} />
              <Text style={c.rot}>Nome curto (embaixo do ícone)</Text>
              <TextInput value={forma?.curto} onChangeText={(v) => forma && setForma({ ...forma, curto: v })} placeholder="Ex.: Afro" placeholderTextColor={CA.fraco} maxLength={24} style={sa.campoBusca} />
              <Text style={c.rot}>Palavras que entram nela (separe por vírgula)</Text>
              <TextInput value={forma?.palavras} onChangeText={(v) => forma && setForma({ ...forma, palavras: v })} placeholder="Ex.: afro, black, baile black" placeholderTextColor={CA.fraco} style={sa.campoBusca} />
              <Text style={[sa.vazio, { marginTop: 4 }]}>A casa (ou festa) entra quando a subcategoria/tag dela tem uma dessas palavras.</Text>
              <Text style={c.rot}>Ícone</Text>
              <View style={c.icones}>
                {ICONES.map((ic) => (
                  <TouchableOpacity key={ic} style={[c.icOp, forma?.icone === ic && c.icOn]} onPress={() => forma && setForma({ ...forma, icone: ic })}>
                    <Feather name={ic as any} size={16} color={forma?.icone === ic ? '#0B0B0E' : CA.texto} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[sa.botao, { marginTop: 16 }, salvando && { opacity: 0.6 }]} onPress={() => void salvar()} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={sa.botaoTxt}>Salvar</Text>}
              </TouchableOpacity>
              {!!forma?.chave && (
                <TouchableOpacity style={[sa.botaoSec, { marginTop: 10 }]} onPress={apagar}>
                  <Text style={[sa.botaoSecTxt, { color: '#F87171' }]}>{padrao(forma.chave) ? 'Voltar ao nome original' : 'Apagar subcategoria'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[sa.botaoSec, { marginTop: 10 }]} onPress={() => setForma(null)}><Text style={sa.botaoSecTxt}>Cancelar</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </TelaAdm>
  );
}

const c = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  setas: { gap: 2 },
  icone: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A2840', alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipOn: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  chipTxt: { color: CA.dim, fontSize: 10, fontWeight: '700' },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '88%' },
  rot: { color: CA.dim, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  icones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  icOp: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: CA.borda, alignItems: 'center', justifyContent: 'center' },
  icOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
});
