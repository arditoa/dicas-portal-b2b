// Modo equipe · Experiências (nov/2026, 18/11): as tags de "Experiências" do app e quantas cada plano pode ter.
//   Lista: nome, ícone, cor, ordem; criar e apagar. Limites: Fundador 3 · Premium 3 · Intermediário 1 · demais 0 (padrão).
//   "Completar com as demais casas": tag sem casa paga mostra as casas gratuitas que têm a tag.
// Tudo em app_config 'experiencias_config' (lib/experiencias.ts). As tags de cada casa: Locais › casa › Experiências.
import { Feather } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { carregarConfigExperiencias, ConfigExperiencias, ExperienciaDef, LimitesExperiencia, salvarConfigExperiencias } from '../../lib/experiencias';
import { normTxt } from '../../lib/subcategorias';

const ICONES = ['heart', 'music', 'mic', 'star', 'radio', 'gift', 'users', 'sun', 'moon', 'coffee', 'camera', 'smile', 'zap', 'award', 'feather', 'droplet', 'scissors', 'shopping-bag', 'film', 'book-open', 'map', 'compass', 'umbrella', 'sunrise', 'tag'];
const CORES = ['#E1306C', '#C084FC', '#FFB74D', '#4FC3F7', '#B39DDB', '#4CAF7D', '#F472B6', '#FDE047', '#F87171', '#60A5FA'];
const PLANOS: { k: keyof LimitesExperiencia; rotulo: string }[] = [
  { k: 'fundador', rotulo: 'Fundador' }, { k: 'premium', rotulo: 'Premium' }, { k: 'intermediario', rotulo: 'Intermediário' }, { k: 'demais', rotulo: 'Gratuito' },
];
const iconeFeather = (ic: string) => (ic.startsWith('mci:') ? 'gift' : ic);

export default function ExperienciasAdm() {
  const [cfg, setCfg] = useState<ConfigExperiencias | null>(null);
  const [forma, setForma] = useState<(ExperienciaDef & { nova: boolean }) | null>(null);
  useFocusEffect(useCallback(() => { void carregarConfigExperiencias(true).then(setCfg); }, []));

  const gravar = async (n: ConfigExperiencias) => {
    const anterior = cfg;
    setCfg(n);
    const erro = await salvarConfigExperiencias(n);
    if (erro) { Alert.alert('Experiências', erro); setCfg(anterior); }
  };
  const mover = (i: number, dir: -1 | 1) => {
    if (!cfg) return;
    const j = i + dir; if (j < 0 || j >= cfg.lista.length) return;
    const l = cfg.lista.slice(); [l[i], l[j]] = [l[j], l[i]];
    void gravar({ ...cfg, lista: l });
  };
  const mudarLimite = (k: keyof LimitesExperiencia, d: number) => {
    if (!cfg) return;
    const v = Math.max(0, Math.min(10, cfg.limites[k] + d));
    void gravar({ ...cfg, limites: { ...cfg.limites, [k]: v } });
  };
  const salvarForma = () => {
    if (!cfg || !forma) return;
    const label = forma.label.trim();
    if (label.length < 2) return Alert.alert('Experiência', 'Escreva o nome.');
    if (forma.nova) {
      const slug = normTxt(label).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (cfg.lista.some((x) => x.slug === slug)) return Alert.alert('Experiência', 'Já existe uma experiência com esse nome.');
      void gravar({ ...cfg, lista: [...cfg.lista, { slug, label, icone: forma.icone, cor: forma.cor }] });
    } else {
      void gravar({ ...cfg, lista: cfg.lista.map((x) => (x.slug === forma.slug ? { ...x, label, icone: forma.icone, cor: forma.cor } : x)) });
    }
    setForma(null);
  };
  const apagar = () => {
    if (!cfg || !forma || forma.nova) return;
    Alert.alert('Tirar esta experiência?', 'Some do app. As casas continuam com a marcação guardada (volta se você criar de novo com o mesmo nome).', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Tirar', style: 'destructive', onPress: () => { void gravar({ ...cfg, lista: cfg.lista.filter((x) => x.slug !== forma.slug) }); setForma(null); } },
    ]);
  };

  return (
    <TelaAdm titulo="Experiências" subtitulo="Tags do app e quantas cada plano pode ter" voltar>
      {cfg === null ? <ActivityIndicator color={CA.rosa} /> : (
        <>
          <Text style={sa.secao}>QUANTAS TAGS CADA PLANO PODE TER</Text>
          <View style={sa.lista}>
            {PLANOS.map((p, i) => (
              <View key={p.k} style={[sa.linha, i < PLANOS.length - 1 && sa.borda]}>
                <Text style={[sa.tit, { flex: 1 }]}>{p.rotulo}</Text>
                <TouchableOpacity onPress={() => mudarLimite(p.k, -1)} style={e.passo} accessibilityLabel={`Menos para ${p.rotulo}`}><Feather name="minus" size={14} color={CA.texto} /></TouchableOpacity>
                <Text style={e.num}>{cfg.limites[p.k]}</Text>
                <TouchableOpacity onPress={() => mudarLimite(p.k, 1)} style={e.passo} accessibilityLabel={`Mais para ${p.rotulo}`}><Feather name="plus" size={14} color={CA.texto} /></TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={[sa.lista, { marginTop: 4 }]}>
            <View style={sa.linha}>
              <View style={{ flex: 1 }}>
                <Text style={sa.tit}>Completar com as demais casas</Text>
                <Text style={sa.sub}>Experiência sem nenhuma casa paga mostra as casas gratuitas que têm a tag (bom enquanto o app enche).</Text>
              </View>
              <Switch value={cfg.completarVazio} onValueChange={(v) => void gravar({ ...cfg, completarVazio: v })} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
            </View>
          </View>

          <Text style={sa.secao}>EXPERIÊNCIAS NO APP (NESTA ORDEM)</Text>
          <View style={sa.lista}>
            {cfg.lista.map((x, i) => (
              <View key={x.slug} style={[sa.linha, i < cfg.lista.length - 1 && sa.borda]}>
                <View style={{ gap: 2 }}>
                  <TouchableOpacity onPress={() => mover(i, -1)} disabled={i === 0} hitSlop={6}><Feather name="chevron-up" size={16} color={i === 0 ? '#3A3950' : CA.dim} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => mover(i, 1)} disabled={i === cfg.lista.length - 1} hitSlop={6}><Feather name="chevron-down" size={16} color={i === cfg.lista.length - 1 ? '#3A3950' : CA.dim} /></TouchableOpacity>
                </View>
                <View style={[e.icone, { backgroundColor: `${x.cor}33` }]}><Feather name={iconeFeather(x.icone) as any} size={15} color={x.cor} /></View>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setForma({ ...x, nova: false })} accessibilityRole="button">
                  <Text style={sa.tit}>{x.label}</Text>
                  <Text style={sa.sub}>Toque para mudar nome, ícone e cor</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[sa.botao, { marginTop: 6 }]} onPress={() => setForma({ slug: '', label: '', icone: 'heart', cor: CORES[0], nova: true })}>
            <Text style={sa.botaoTxt}>+ Nova experiência</Text>
          </TouchableOpacity>
          <Text style={[sa.vazio, { marginTop: 10 }]}>Para marcar as experiências de uma casa: Locais › casa › Experiências. A casa aparece nas primeiras tags dela, até o limite do plano.</Text>
        </>
      )}

      <Modal visible={!!forma} transparent animationType="slide" onRequestClose={() => setForma(null)}>
        <View style={e.fundo}>
          <View style={e.folha}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[sa.tit, { fontSize: 15 }]}>{forma?.nova ? 'Nova experiência' : 'Editar experiência'}</Text>
              <Text style={e.rot}>Nome *</Text>
              <TextInput value={forma?.label} onChangeText={(v) => forma && setForma({ ...forma, label: v })} placeholder="Ex.: Happy hour" placeholderTextColor={CA.fraco} maxLength={28} style={sa.campoBusca} />
              <Text style={e.rot}>Ícone</Text>
              <View style={e.grade}>
                {ICONES.map((ic) => (
                  <TouchableOpacity key={ic} style={[e.op, iconeFeather(forma?.icone || '') === ic && e.opOn]} onPress={() => forma && setForma({ ...forma, icone: ic })}>
                    <Feather name={ic as any} size={16} color={iconeFeather(forma?.icone || '') === ic ? '#0B0B0E' : CA.texto} />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={e.rot}>Cor</Text>
              <View style={e.grade}>
                {CORES.map((cor) => (
                  <TouchableOpacity key={cor} style={[e.op, { backgroundColor: cor }, forma?.cor === cor && { borderColor: '#FFF', borderWidth: 3 }]} onPress={() => forma && setForma({ ...forma, cor })} accessibilityLabel={`Cor ${cor}`} />
                ))}
              </View>
              <TouchableOpacity style={[sa.botao, { marginTop: 16 }]} onPress={salvarForma}><Text style={sa.botaoTxt}>Salvar</Text></TouchableOpacity>
              {!!forma && !forma.nova && (
                <TouchableOpacity style={[sa.botaoSec, { marginTop: 10 }]} onPress={apagar}><Text style={[sa.botaoSecTxt, { color: '#F87171' }]}>Tirar do app</Text></TouchableOpacity>
              )}
              <TouchableOpacity style={[sa.botaoSec, { marginTop: 10 }]} onPress={() => setForma(null)}><Text style={sa.botaoSecTxt}>Cancelar</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </TelaAdm>
  );
}

const e = StyleSheet.create({
  passo: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: CA.borda, alignItems: 'center', justifyContent: 'center' },
  num: { color: CA.texto, fontSize: 16, fontWeight: '800', minWidth: 22, textAlign: 'center' },
  icone: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '88%' },
  rot: { color: CA.dim, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  op: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: CA.borda, alignItems: 'center', justifyContent: 'center' },
  opOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
});
