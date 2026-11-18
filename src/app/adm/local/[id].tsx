// Modo equipe · Ficha da casa: ONDE ELA APARECE no app (e por quê), plano, caixas da Home e atalhos.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../../components/adm/TelaAdm';
import { Chips } from '../../../components/parceiro/form';
import { PLANOS, STATUS_PLANO } from '../../../lib/admin';
import { CATEGORIA_ORDER, CATEGORIA_REAL_LABEL, CATEGORIAS } from '../../../lib/categorias';
import { carregarSubcategorias, SubDef } from '../../../lib/subcategorias';
import { Modal, ScrollView } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { carregarConfigExperiencias, ConfigExperiencias, limiteDoPlano } from '../../../lib/experiencias';

type Casa = { id: string; nome: string; categoria: string; subcategoria: string | null; bairro: string | null; cidade: string | null; status: string; plano_comercial: string | null;
  plano_comercial_status: string | null; destaque_secoes: string[] | null; foto_capa_url: string | null; instagram: string | null; experiencias?: string[] | null };
type Onde = { plano: string; plano_status: string; status: string; mp_conectado: boolean; lugares: { lugar: string; motivo: string; ok: boolean; banner_id?: string }[] };
type Caixa = { chave: string; titulo: string; tipo: string };

export default function FichaLocalAdm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<Casa | null>(null);
  const [onde, setOnde] = useState<Onde | null>(null);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [erroOnde, setErroOnde] = useState('');
  // Categorias da casa: principal (locais.categoria/subcategoria) + extras (local_categorias_extra).
  type Extra = { categoria: string; subcategoria: string | null };
  const [extras, setExtras] = useState<Extra[]>([]);
  const [escolha, setEscolha] = useState<{ modo: 'principal' | 'extra'; categoria: string | null; defs: SubDef[] } | null>(null);
  // Nov/2026 (18/11) — Experiências da casa, com o limite do plano (Modo equipe › Experiências).
  const [cfgExp, setCfgExp] = useState<ConfigExperiencias | null>(null);
  useFocusEffect(useCallback(() => { void carregarConfigExperiencias(true).then(setCfgExp); }, []));
  const opcoesCat = Array.from(new Set(CATEGORIA_ORDER.map((k) => CATEGORIAS[k]?.categoriaReal).filter(Boolean) as string[]));
  const nomeCat = (real: string) => (real === 'lugares' ? 'Bares & Vida Noturna' : real === 'eventos' ? 'Festas & Eventos' : CATEGORIA_REAL_LABEL[real] || real);
  const subDefsDe = (real: string) => carregarSubcategorias(real === 'eventos' ? 'festas' : real);

  const carregar = useCallback(async () => {
    const [l, o, cx] = await Promise.all([
      supabase.from('locais').select('id, nome, categoria, subcategoria, bairro, cidade, status, plano_comercial, plano_comercial_status, destaque_secoes, foto_capa_url, instagram, experiencias').eq('id', id).maybeSingle(),
      supabase.rpc('admin_onde_aparece', { p_local: id }),
      supabase.from('home_caixas').select('chave, titulo, tipo').eq('tipo', 'curadoria').order('ordem'),
    ]);
    setC((l.data as Casa) || null);
    if (o.error) setErroOnde(o.error.message.includes('admin_onde_aparece') ? 'Rode a migração 133 para ver onde a casa aparece.' : o.error.message);
    else setOnde(o.data as Onde);
    setCaixas((cx.data as Caixa[]) || []);
    const ex = await supabase.from('local_categorias_extra').select('categoria, subcategoria').eq('local_id', id);
    setExtras((ex.data as Extra[]) || []);
  }, [id]);

  const abrirEscolha = async (modo: 'principal' | 'extra') => setEscolha({ modo, categoria: modo === 'principal' ? c?.categoria || null : null, defs: modo === 'principal' && c ? await subDefsDe(c.categoria) : [] });
  const confirmar = async (sub: string | null) => {
    if (!c || !escolha?.categoria) return;
    const real = escolha.categoria;
    if (escolha.modo === 'principal') {
      await mudar({ categoria: real, subcategoria: sub } as any, 'Categoria principal atualizada.');
    } else {
      if (real === c.categoria) return Alert.alert('Categoria', 'Essa já é a categoria principal da casa.');
      const { error } = await supabase.from('local_categorias_extra').upsert({ local_id: c.id, categoria: real, subcategoria: sub, atualizado_em: new Date().toISOString() }, { onConflict: 'local_id,categoria' });
      if (error) return Alert.alert('Categoria', error.message);
      void carregar();
    }
    setEscolha(null);
  };
  const tirarExtra = (x: Extra) => Alert.alert('Tirar desta categoria?', `${c?.nome} deixa de aparecer em ${nomeCat(x.categoria)}.`, [
    { text: 'Voltar', style: 'cancel' },
    { text: 'Tirar', style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('local_categorias_extra').delete().eq('local_id', id).eq('categoria', x.categoria);
      if (error) return Alert.alert('Categoria', error.message);
      void carregar();
    } },
  ]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  async function mudar(campos: Partial<Casa>, aviso?: string) {
    if (!c) return;
    const { error } = await supabase.from('locais').update(campos).eq('id', c.id);
    if (error) return Alert.alert('Casa', error.message);
    setC({ ...c, ...campos });
    void supabase.rpc('admin_onde_aparece', { p_local: c.id }).then(({ data }) => data && setOnde(data as Onde));
    if (aviso) Alert.alert('Pronto', aviso);
  }

  function trocarPlano(p: string) {
    if (!c || p === (c.plano_comercial || 'freemium')) return;
    Alert.alert('Mudar plano?', `${c.nome} passa para o plano ${PLANOS.find((x) => x.valor === p)?.rotulo}. Muda na hora o que a casa pode usar e onde aparece.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Mudar', onPress: () => void mudar({ plano_comercial: p, plano_comercial_status: 'ativo' }) },
    ]);
  }

  const secoes = c?.destaque_secoes || [];
  const ligarSecao = (s: string, v: boolean) => void mudar({ destaque_secoes: v ? Array.from(new Set([...secoes, s])) : secoes.filter((x) => x !== s) });

  if (!c) return <TelaAdm titulo="Casa" voltar><ActivityIndicator color={CA.rosa} /></TelaAdm>;

  return (
    <TelaAdm titulo={c.nome} subtitulo={`${CATEGORIA_REAL_LABEL[c.categoria] || c.categoria} · ${[c.bairro, c.cidade].filter(Boolean).join(', ')}`} voltar>
      {!!c.foto_capa_url && <Image source={{ uri: c.foto_capa_url }} style={e.capa} />}
      <View style={e.atalhos}>
        <TouchableOpacity style={sa.botaoSec} onPress={() => router.push(`/business/${c.id}` as any)} accessibilityRole="button">
          <Feather name="eye" size={14} color={CA.texto} /><Text style={sa.botaoSecTxt}>Ver no app</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sa.botaoSec} onPress={() => router.push(`/adm/banner-editar?local=${c.id}` as any)} accessibilityRole="button">
          <Feather name="image" size={14} color={CA.texto} /><Text style={sa.botaoSecTxt}>Banner para esta casa</Text>
        </TouchableOpacity>
      </View>

      <Text style={sa.secao}>INFORMAÇÕES DA CASA</Text>
      <View style={sa.lista}>
        {([
          ['sobre', 'Sobre', 'Nome, descrição, público, especialidade', 'edit-3'],
          ['fotos', 'Fotos e vídeo', 'Capa, logo e galeria', 'image'],
          ['horarios', 'Horários', 'Dias e horas de funcionamento', 'clock'],
          ['contato', 'Contato', 'Instagram, WhatsApp, e-mail', 'phone'],
          ['endereco', 'Endereço e mapa', 'Endereço, bairro e ponto no mapa', 'map-pin'],
        ] as [string, string, string, keyof typeof Feather.glyphMap][]).map(([k, t1, t2, ic], i, arr) => (
          <TouchableOpacity key={k} style={[sa.linha, i < arr.length - 1 && sa.borda]} onPress={() => router.push(`/adm/local-editar?id=${c.id}&secao=${k}` as any)} accessibilityRole="button">
            <Feather name={ic} size={16} color={CA.dim} />
            <View style={{ flex: 1 }}><Text style={sa.tit}>{t1}</Text><Text style={sa.sub}>{t2}</Text></View>
            <Feather name="chevron-right" size={16} color={CA.fraco} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={sa.secao}>CATEGORIAS DA CASA</Text>
      <View style={sa.lista}>
        <TouchableOpacity style={[sa.linha, sa.borda]} onPress={() => void abrirEscolha('principal')} accessibilityRole="button">
          <Feather name="star" size={16} color={CA.verde} />
          <View style={{ flex: 1 }}><Text style={sa.tit}>{nomeCat(c.categoria)}{c.subcategoria ? ` › ${c.subcategoria}` : ''}</Text><Text style={sa.sub}>Categoria principal · toque para trocar</Text></View>
          <Feather name="edit-2" size={14} color={CA.fraco} />
        </TouchableOpacity>
        {extras.map((x) => (
          <View key={x.categoria} style={[sa.linha, sa.borda]}>
            <Feather name="plus-circle" size={16} color={CA.dim} />
            <View style={{ flex: 1 }}><Text style={sa.tit}>{nomeCat(x.categoria)}{x.subcategoria ? ` › ${x.subcategoria}` : ''}</Text><Text style={sa.sub}>Também aparece aqui</Text></View>
            <TouchableOpacity onPress={() => tirarExtra(x)} hitSlop={8}><Feather name="x" size={16} color="#F87171" /></TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={sa.linha} onPress={() => void abrirEscolha('extra')} accessibilityRole="button">
          <Feather name="plus" size={16} color={CA.rosa} /><Text style={[sa.tit, { color: CA.rosa }]}>Aparecer em outra categoria</Text>
        </TouchableOpacity>
      </View>

      {!!cfgExp && (() => {
        const lim = limiteDoPlano(c, cfgExp.limites);
        const marcadas = (c.experiencias || []).filter((x) => cfgExp.lista.some((y) => y.slug === x));
        const tocar = (slug: string) => {
          const tem = marcadas.includes(slug);
          if (!tem && marcadas.length >= lim) {
            return Alert.alert('Experiências', lim === 0
              ? 'O plano desta casa não inclui experiências. Ela aparece só quando a experiência não tem nenhuma casa paga (se "Completar com as demais casas" estiver ligado).'
              : `O plano desta casa permite ${lim} ${lim === 1 ? 'experiência' : 'experiências'}. Tire uma para marcar outra.`);
          }
          const outras = (c.experiencias || []).filter((x) => !cfgExp.lista.some((y) => y.slug === x));
          void mudar({ experiencias: [...outras, ...(tem ? marcadas.filter((x) => x !== slug) : [...marcadas, slug])] } as any);
        };
        return (
          <>
            <Text style={sa.secao}>EXPERIÊNCIAS · {marcadas.length} DE {lim}</Text>
            <View style={[sa.card, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
              {cfgExp.lista.map((x) => {
                const on = marcadas.includes(x.slug);
                return (
                  <TouchableOpacity key={x.slug} style={[e.chip, on && e.chipOn]} onPress={() => tocar(x.slug)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[e.chipTxt, on && { color: '#0B0B0E' }]}>{x.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={[sa.vazio, { width: '100%', marginTop: 4 }]}>Fundador e Premium: até {cfgExp.limites.fundador}/{cfgExp.limites.premium} · Intermediário: {cfgExp.limites.intermediario}. Mude os limites e as tags em Início › Experiências.</Text>
            </View>
          </>
        );
      })()}

      <Modal visible={!!escolha} transparent animationType="slide" onRequestClose={() => setEscolha(null)}>
        <View style={e.fundo}>
          <View style={e.folha}>
            <ScrollView>
              <Text style={[sa.tit, { fontSize: 15, marginBottom: 10 }]}>{escolha?.modo === 'principal' ? 'Categoria principal' : 'Aparecer em outra categoria'}</Text>
              <Text style={e.rot}>Categoria</Text>
              <View style={e.chips}>
                {opcoesCat.map((k) => (
                  <TouchableOpacity key={k} style={[e.chip, escolha?.categoria === k && e.chipOn]} onPress={async () => { const defs = await subDefsDe(k); setEscolha((x) => (x ? { ...x, categoria: k, defs } : x)); }}>
                    <Text style={[e.chipTxt, escolha?.categoria === k && { color: '#0B0B0E' }]}>{nomeCat(k)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!escolha?.categoria && (
                <>
                  <Text style={e.rot}>Subcategoria</Text>
                  <View style={e.chips}>
                    {escolha.defs.map((d) => (
                      <TouchableOpacity key={d.chave} style={e.chip} onPress={() => void confirmar(d.rotulo)}><Text style={e.chipTxt}>{d.rotulo}</Text></TouchableOpacity>
                    ))}
                    <TouchableOpacity style={e.chip} onPress={() => void confirmar(null)}><Text style={e.chipTxt}>Sem subcategoria</Text></TouchableOpacity>
                  </View>
                  <Text style={[sa.vazio, { marginTop: 6 }]}>Toque na subcategoria para salvar.</Text>
                </>
              )}
              <TouchableOpacity style={[sa.botaoSec, { marginTop: 16 }]} onPress={() => setEscolha(null)}><Text style={sa.botaoSecTxt}>Cancelar</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Text style={sa.secao}>ONDE APARECE NO APP</Text>
      {!!erroOnde && <Text style={[sa.sub, { color: CA.amarelo }]}>{erroOnde}</Text>}
      {!onde && !erroOnde ? <ActivityIndicator color={CA.rosa} /> : onde && (
        <View style={sa.lista}>
          {onde.lugares.map((l, i) => (
            <TouchableOpacity key={i} style={[sa.linha, i < onde.lugares.length - 1 && sa.borda]} disabled={!l.banner_id}
              onPress={() => l.banner_id && router.push(`/adm/banner-editar?id=${l.banner_id}` as any)} accessibilityRole="button">
              <Feather name={l.ok ? 'check-circle' : 'alert-circle'} size={16} color={l.ok ? CA.verde : CA.amarelo} />
              <View style={{ flex: 1 }}><Text style={sa.tit}>{l.lugar}</Text><Text style={sa.sub}>{l.motivo}</Text></View>
              {!!l.banner_id && <Feather name="chevron-right" size={16} color={CA.fraco} />}
            </TouchableOpacity>
          ))}
          <View style={[sa.linha, { borderTopWidth: 1, borderTopColor: CA.borda }]}>
            <Feather name="credit-card" size={16} color={onde.mp_conectado ? CA.verde : CA.fraco} />
            <Text style={[sa.sub, { flex: 1 }]}>{onde.mp_conectado ? 'Mercado Pago conectado (vende ingressos)' : 'Mercado Pago não conectado'}</Text>
          </View>
        </View>
      )}

      <Text style={sa.secao}>PLANO</Text>
      <View style={[sa.card, { gap: 12 }]}>
        <Chips rotulo="Plano" opcoes={PLANOS as any} valor={c.plano_comercial || 'freemium'} aoMudar={(v) => trocarPlano(String(v))} />
        <Chips rotulo="Situação do pagamento" opcoes={STATUS_PLANO as any} valor={c.plano_comercial_status || 'ativo'} aoMudar={(v) => void mudar({ plano_comercial_status: String(v) })} />
      </View>

      <Text style={sa.secao}>CAIXAS DA HOME (ESCOLHA DA EQUIPE)</Text>
      <View style={sa.lista}>
        {[{ chave: 'em_alta', titulo: 'Em Alta', secao: 'em_alta' }, ...caixas.map((x) => ({ chave: x.chave, titulo: x.titulo, secao: `caixa:${x.chave}` }))].map((x, i, arr) => (
          <View key={x.chave} style={[sa.linha, i < arr.length - 1 && sa.borda]}>
            <Text style={[sa.tit, { flex: 1 }]}>Caixa {x.titulo}</Text>
            <Switch value={secoes.includes(x.secao)} onValueChange={(v) => ligarSecao(x.secao, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
          </View>
        ))}
      </View>

      {c.status !== 'aprovado' && (
        <>
          <Text style={sa.secao}>STATUS</Text>
          <Text style={sa.sub}>Esta casa está "{c.status}". Aprove na aba Aprovar.</Text>
        </>
      )}
    </TelaAdm>
  );
}

const e = StyleSheet.create({
  capa: { width: '100%', height: 140, borderRadius: 16, marginBottom: 10, backgroundColor: '#1B1A26' },
  atalhos: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '85%' },
  rot: { color: CA.dim, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipTxt: { color: CA.texto, fontSize: 12, fontWeight: '700' },
});
