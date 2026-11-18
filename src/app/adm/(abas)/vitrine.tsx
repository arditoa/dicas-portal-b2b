// Modo equipe · Vitrine: quadradinhos (Home, Trip e cada categoria). Toque abre o que está naquele lugar AGORA.
// Toque num banner para editar, em "Adicionar aqui" para pôr um banner novo naquele lugar, numa casa para abrir a ficha.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import BannerLinha from '../../../components/adm/BannerLinha';
import OfertasAdm from '../../../components/adm/OfertasAdm';
import { chaveDoLocal } from '../../../components/SubcategoriaBanners';
import { carregarSubcategorias, salvarOrdemSubcategorias, SubDef } from '../../../lib/subcategorias';
import { buscarConvitesVaga, buscarPaginasSub, buscarSubcategoriasDesligadas, conviteLigado } from '../../../lib/vitrine';
import { buscarExtrasTurismo, Destino, DESTINOS_PADRAO, ehCasaDeViagem, estaAberto } from '../../../lib/destinos';
import TelaAdm, { CA, sa } from '../../../components/adm/TelaAdm';
import { BannerAdm, situacaoBanner } from '../../../lib/admin';
import { aplicarOrdemHome, CATEGORIAS, CHAVE_ESTADO_CATEGORIAS, CHAVE_ORDEM_HOME, EstadoCategoria, lerEstadosCategorias, ORDEM_HOME, podeAbrirCategoria, ROTULO_CURTO_HOME } from '../../../lib/categorias';
import { supabase } from '../../../lib/supabase';
import { TITULO_SECAO } from '../../../constants/theme';

type Caixa = { chave: string; titulo: string; tipo: string; ativo: boolean; ordem: number };
type LocalMin = { id: string; nome: string; categoria: string; plano_comercial: string | null; destaque_secoes: string[] | null };
type Master = { id: string; categoria: string; titulo: string; ativo: boolean; local_id: string | null };
type Acao = { id: string; marca: string; nome: string; mostrar_no_app: boolean; fim: string };

export default function VitrineAdm() {
  const router = useRouter();
  const [banners, setBanners] = useState<BannerAdm[] | null>(null);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [marcados, setMarcados] = useState<LocalMin[]>([]);
  const [pagos, setPagos] = useState<LocalMin[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [selados, setSelados] = useState<LocalMin[]>([]);
  const [extras, setExtras] = useState<Record<string, Set<string>>>({});   // categoria extra → casas (local_categorias_extra)
  type CupomMin = { id: string; titulo: string; local_id: string; locais: { nome: string; plano_comercial: string | null } | null };
  type FestaMin = { id: string; titulo: string; data_inicio: string; destaque_secoes: string[] | null; locais: { nome: string; plano_comercial: string | null } | null };
  const [cuponsCat, setCuponsCat] = useState<CupomMin[] | null>(null);
  // Destino da Trip aberto (lugar = 'dest:<slug>'): casas de viagem da cidade.
  type CasaDest = { id: string; nome: string; plano_comercial: string | null };
  const [destCasas, setDestCasas] = useState<CasaDest[] | null>(null);
  // Destinos da tabela (a equipe vê também os escondidos); sem tabela, a lista padrão.
  const [destinosAdm, setDestinosAdm] = useState<Destino[]>(DESTINOS_PADRAO);
  useFocusEffect(useCallback(() => {
    void (async () => {
      let r: any = await supabase.from('destinos').select('slug, cidade, uf, foto_url, ordem, ativo, aberto, evento').order('ordem');
      if (r.error) r = await supabase.from('destinos').select('slug, cidade, uf, foto_url, ordem, ativo, aberto').order('ordem'); // sem a 156
      if (r.error) r = await supabase.from('destinos').select('slug, cidade, uf, foto_url, ordem, ativo').order('ordem');
      if (!r.error && r.data?.length) setDestinosAdm(r.data as Destino[]);
    })();
  }, []));
  const [festasDest, setFestasDest] = useState<FestaMin[] | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [lugar, setLugar] = useState<string | null>(null);   // null = grade de quadradinhos
  const [atualizando, setAtualizando] = useState(false);
  // Subcategorias (lista editável) da categoria aberta — 'cat:<slug>' ou 'sub:<slug>:<chave>'.
  const [defsAdm, setDefsAdm] = useState<SubDef[]>([]);
  const [paginasAdm, setPaginasAdm] = useState<Set<string>>(new Set());
  // Ordem das categorias na Home (app_config).
  const [ordemCats, setOrdemCats] = useState(ORDEM_HOME);
  const [ordenando, setOrdenando] = useState(false);
  useFocusEffect(useCallback(() => {
    void supabase.from('app_config').select('chave, valor').in('chave', [CHAVE_ORDEM_HOME, CHAVE_ESTADO_CATEGORIAS]).then(({ data }) => {
      const m = Object.fromEntries(((data as any[]) || []).map((x) => [x.chave, x.valor]));
      setOrdemCats(aplicarOrdemHome(m[CHAVE_ORDEM_HOME]));
      setEstadosCat(lerEstadosCategorias(m[CHAVE_ESTADO_CATEGORIAS]));
    });
  }, []));
  // Aparece / Em breve / Oculta de cada categoria na Home.
  const [estadosCat, setEstadosCat] = useState<Record<string, EstadoCategoria>>({});
  const ABERTAS_PADRAO = ['destaques', 'bares', 'festas', 'servicos', 'turismo', 'artistas', 'beleza', 'saude', 'produtos', 'mais18'];
  const estadoDe = (slug: string): EstadoCategoria => estadosCat[slug] || ((CATEGORIAS as any)[slug]?.emBreve || !ABERTAS_PADRAO.includes(slug) ? 'breve' : 'aparece');
  const mudarEstado = async (slug: string, v: EstadoCategoria) => {
    if (v === 'aparece' && !podeAbrirCategoria(slug)) return Alert.alert('Ainda não dá para abrir', 'Esta categoria ainda não existe no banco de dados (precisa de uma migração). Deixe como Em breve ou Oculta.');
    const novo = { ...estadosCat, [slug]: v };
    setEstadosCat(novo);
    const { error } = await supabase.from('app_config').upsert({ chave: CHAVE_ESTADO_CATEGORIAS, valor: JSON.stringify(novo), atualizado_em: new Date().toISOString() });
    if (error) Alert.alert('Categoria', error.message);
  };
  const ROT_ESTADO: Record<EstadoCategoria, string> = { aparece: 'Aparece', breve: 'Em breve', oculta: 'Oculta' };
  // Discreto: uma linha "Na Home · Aparece ›"; toque para trocar (Em breve / Oculta ficam escondidos aqui).
  const EstadoCat = ({ slug }: { slug: string }) => {
    const est = estadoDe(slug);
    const ver = aberta === `estado:${slug}`;
    return (
      <View style={{ marginBottom: 10 }}>
        <TouchableOpacity style={e.estadoLinha} onPress={() => setAberta(ver ? null : `estado:${slug}`)} accessibilityRole="button">
          <View style={[e.estadoPonto, { backgroundColor: est === 'aparece' ? CA.verde : est === 'breve' ? '#FBBF24' : CA.fraco }]} />
          <Text style={e.estadoLinhaTxt}>Na Home · {ROT_ESTADO[est]}</Text>
          <Feather name={ver ? 'chevron-up' : 'chevron-down'} size={13} color={CA.fraco} />
        </TouchableOpacity>
        {ver && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {(['aparece', 'breve', 'oculta'] as EstadoCategoria[]).map((v) => {
              const on = est === v;
              return (
                <TouchableOpacity key={v} style={[e.estado, on && e.estadoOn]} onPress={() => { void mudarEstado(slug, v); setAberta(null); }} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[e.estadoTxt, on && { color: '#0B0B0E' }]}>{ROT_ESTADO[v]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };
  const moverCat = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= ordemCats.length) return;
    const n = ordemCats.slice(); [n[i], n[j]] = [n[j], n[i]];
    setOrdemCats(n);
    const { error } = await supabase.from('app_config').upsert({ chave: CHAVE_ORDEM_HOME, valor: JSON.stringify(n), atualizado_em: new Date().toISOString() });
    if (error) Alert.alert('Ordem', error.message);
  };
  // Topo 1 vazio: mostrar "Sua marca aqui" ou nada, por página.
  const [convites, setConvites] = useState<Record<string, boolean>>({});
  useFocusEffect(useCallback(() => { void buscarConvitesVaga(true).then(setConvites); }, []));
  const ligarConvite = async (slug: string, v: boolean) => {
    setConvites((m) => ({ ...m, [slug]: v }));
    const { error } = await supabase.from('subcategoria_config').upsert({ categoria: slug, chave: '__vaga_livre', ativo: v, atualizado_em: new Date().toISOString() });
    if (error) { Alert.alert('Topo 1', error.message); void buscarConvitesVaga(true).then(setConvites); }
  };
  const [subOff, setSubOff] = useState<Set<string>>(new Set());
  const catDoLugar = lugar === 'trip' || lugar?.startsWith('dest:') ? 'turismo' : lugar && (lugar.startsWith('cat:') || lugar.startsWith('sub:')) ? lugar.split(':')[1] : null;
  const realDaSub = (slug: string) => (slug === 'festas' ? 'festas' : CATEGORIAS[slug as keyof typeof CATEGORIAS]?.categoriaReal || '');
  useFocusEffect(useCallback(() => {
    if (!catDoLugar || !realDaSub(catDoLugar)) { setDefsAdm([]); return; }
    void carregarSubcategorias(realDaSub(catDoLugar), true).then(setDefsAdm);
    void buscarPaginasSub(realDaSub(catDoLugar)).then(setPaginasAdm);
    void buscarSubcategoriasDesligadas(realDaSub(catDoLugar)).then(setSubOff);
  }, [catDoLugar]));
  // Subcategoria aberta (lugar = 'sub:<slug>:<chave>'): casas Fundador/Premium dela.
  const [subCasas, setSubCasas] = useState<CasaDest[] | null>(null);
  useEffect(() => {
    setSubCasas(null);
    if (!lugar || !lugar.startsWith('sub:')) return;
    const [, slug, ...resto] = lugar.split(':');
    const chave = resto.join(':');
    if (slug === 'festas') { setSubCasas([]); return; } // Festas: entram as casas que têm festa desse tipo na agenda (o app decide na hora)
    const real = CATEGORIAS[slug as keyof typeof CATEGORIAS]?.categoriaReal;
    if (!real) { setSubCasas([]); return; }
    (async () => {
      const { data } = await supabase.from('locais').select('id, nome, subcategoria, plano_comercial').eq('status', 'aprovado').eq('categoria', real).in('plano_comercial', ['fundador', 'premium']).limit(300);
      const defs = await carregarSubcategorias(real);
      setSubCasas((((data as any[]) || []).filter((l) => chaveDoLocal(l, defs) === chave)));
    })();
  }, [lugar]);

  const carregar = useCallback(async () => {
    const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    const [b, c, m, p, ms, a, sf, xt] = await Promise.all([
      supabase.from('banners_app').select('*').order('peso', { ascending: false }),
      supabase.from('home_caixas').select('chave, titulo, tipo, ativo, ordem').order('ordem'),
      supabase.from('locais').select('id, nome, categoria, plano_comercial, destaque_secoes').eq('status', 'aprovado').not('destaque_secoes', 'eq', '{}').limit(500),
      supabase.from('locais').select('id, nome, categoria, plano_comercial, destaque_secoes').eq('status', 'aprovado').in('plano_comercial', ['premium', 'fundador']).limit(500),
      supabase.from('categoria_patrocinio').select('id, categoria, titulo, ativo, local_id'),
      supabase.from('acoes_marca').select('id, marca, nome, mostrar_no_app, fim').eq('ativa', true).gte('fim', hoje).order('fim'),
      // Mesma regra da Home: Fundador = selo "Membro Fundador" ativo (local_badges), não só o plano.
      supabase.from('local_badges').select('locais!inner(id, nome, categoria, plano_comercial, destaque_secoes, status)').ilike('rotulo', '%fundador%').eq('ativo', true).eq('locais.status', 'aprovado').limit(100),
      supabase.from('local_categorias_extra').select('local_id, categoria'),
    ]);
    setBanners((b.data as BannerAdm[]) || []);
    setCaixas((c.data as Caixa[]) || []);
    setMarcados((m.data as LocalMin[]) || []);
    setPagos((p.data as LocalMin[]) || []);
    setMasters((ms.data as Master[]) || []);
    setAcoes((a.data as Acao[]) || []);
    const mapa: Record<string, Set<string>> = {};
    for (const r of ((xt.data as any[]) || [])) (mapa[r.categoria] ||= new Set()).add(r.local_id);
    setExtras(mapa);
    setSelados((((sf.data as any[]) || []).map((r) => r.locais).filter(Boolean)) as LocalMin[]);
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  useEffect(() => {
    setDestCasas(null);
    if (!lugar || !lugar.startsWith('dest:')) return;
    const d = destinosAdm.find((x) => x.slug === lugar.slice(5));
    if (!d) { setDestCasas([]); return; }
    (async () => {
      const [ls, ex] = await Promise.all([
        supabase.from('locais').select('id, nome, categoria, tipo_hospedagem, plano_comercial').eq('status', 'aprovado').eq('cidade', d.cidade).limit(500),
        buscarExtrasTurismo(),
      ]);
      let dados: any[] = (ls.data as any[]) || [];
      if (ls.error) dados = (((await supabase.from('locais').select('id, nome, categoria, plano_comercial').eq('status', 'aprovado').eq('cidade', d.cidade).limit(500)).data) as any[]) || [];
      setDestCasas(dados.filter((l) => ehCasaDeViagem(l, ex)).sort((a, b) => a.nome.localeCompare(b.nome)));
    })();
  }, [lugar, destinosAdm]);

  // Ao abrir uma categoria: cupons ativos dela (quadradinhos) e, em Eventos, as festas em destaque (fliers).
  useEffect(() => {
    setCuponsCat(null); setFestasDest(null);
    if (!lugar || !lugar.startsWith('cat:')) return;
    const slug = lugar.slice(4) as keyof typeof CATEGORIAS;
    const real = CATEGORIAS[slug]?.categoriaReal;
    (async () => {
      if (slug === 'festas') {
        const ontem = new Date(Date.now() - 30 * 3600e3).toISOString();
        const { data } = await supabase.from('eventos').select('id, titulo, data_inicio, destaque_secoes, locais(nome, plano_comercial)')
          .eq('status', 'aprovado').gte('data_inicio', ontem).overlaps('destaque_secoes', ['plano_festa', 'patrocinado']).order('data_inicio').limit(50);
        setFestasDest((data as any) || []);
        return;
      }
      if (!real) { setCuponsCat([]); return; }
      const { data } = await supabase.from('cupons').select('id, titulo, local_id, locais!inner(nome, categoria, status, plano_comercial)')
        .eq('ativo', true).eq('locais.status', 'aprovado').eq('locais.categoria', real).limit(100);
      setCuponsCat((data as any) || []);
    })();
  }, [lugar]);

  const daTela = (tela: string) => (banners || []).filter((x) => (x.telas || []).includes(tela));
  // Fundadores = selo Membro Fundador (regra da Home) + quem está no plano Fundador, sem repetir; ordem fixa como na Home.
  const fundadores = [...selados, ...pagos.filter((l) => l.plano_comercial === 'fundador')]
    .filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i)
    .sort((x, y) => x.id.localeCompare(y.id));
  const naCaixa = (chave: string) => marcados.filter((l) => (l.destaque_secoes || []).includes(chave === 'em-alta' || chave === 'em_alta' ? 'em_alta' : `caixa:${chave}`));

  const moverSub = async (real: string, i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= defsAdm.length) return;
    const n = defsAdm.slice(); [n[i], n[j]] = [n[j], n[i]];
    setDefsAdm(n);
    const erro = await salvarOrdemSubcategorias(real, n);
    if (erro) { Alert.alert('Ordem', erro); void carregarSubcategorias(real, true).then(setDefsAdm); }
  };
  const ligarHerdar = async (real: string, chave: string, v: boolean) => {
    setSubOff((x) => { const n = new Set(x); v ? n.delete(`__herdar:${chave}`) : n.add(`__herdar:${chave}`); return n; });
    const { error } = await supabase.from('subcategoria_config').upsert({ categoria: real, chave: `__herdar:${chave}`, ativo: v, atualizado_em: new Date().toISOString() });
    if (error) Alert.alert('Subcategoria', error.message);
  };
  const ligarPaginaSub = async (real: string, chave: string, v: boolean) => {
    setPaginasAdm((x) => { const n = new Set(x); v ? n.add(chave) : n.delete(chave); return n; });
    const { error } = await supabase.from('subcategoria_config').upsert({ categoria: real, chave: `pagina:${chave}`, ativo: v, atualizado_em: new Date().toISOString() });
    if (error) { Alert.alert('Subcategoria', error.message); void buscarPaginasSub(real).then(setPaginasAdm); }
  };
  const ligarCaixa = async (c: Caixa, ativo: boolean) => {
    const { error } = await supabase.from('home_caixas').update({ ativo }).eq('chave', c.chave);
    if (error) return Alert.alert('Caixa', error.message);
    setCaixas(caixas.map((x) => (x.chave === c.chave ? { ...x, ativo } : x)));
  };

  // Pausar = some do app (faixa, banner, página) na hora, sem apagar nada. Ligar de novo = volta.
  const ligarAcao = async (a: Acao, v: boolean) => {
    setAcoes((l) => l.map((x) => (x.id === a.id ? { ...x, mostrar_no_app: v } : x)));
    const { error } = await supabase.from('acoes_marca').update({ mostrar_no_app: v }).eq('id', a.id);
    if (error) { setAcoes((l) => l.map((x) => (x.id === a.id ? { ...x, mostrar_no_app: !v } : x))); Alert.alert('Ação', error.message); }
  };

  const Bloco = ({ tela, titulo, dica }: { tela: string; titulo: string; dica?: string }) => {
    const lista = daTela(tela);
    return (
      <>
        <View style={e.blocoTopo}>
          <Text style={e.blocoTit}>{titulo}</Text>
          <TouchableOpacity onPress={() => router.push(`/adm/banner-editar?tela=${encodeURIComponent(tela)}` as any)} accessibilityRole="button">
            <Text style={e.add}>+ Adicionar aqui</Text>
          </TouchableOpacity>
        </View>
        {!!dica && <Text style={[sa.sub, { marginBottom: 6 }]}>{dica}</Text>}
        {lista.length ? <View style={sa.lista}>{lista.map((b, i) => <BannerLinha key={b.id} b={b} ultimo={i === lista.length - 1} />)}</View> : <Text style={sa.vazio}>Nenhum banner aqui.</Text>}
      </>
    );
  };

  const ligarMaster = async (m: Master, v: boolean) => {
    setMasters((l) => l.map((x) => (x.id === m.id ? { ...x, ativo: v } : x)));
    const { error } = await supabase.from('categoria_patrocinio').update({ ativo: v }).eq('id', m.id);
    if (error) { setMasters((l) => l.map((x) => (x.id === m.id ? { ...x, ativo: !v } : x))); Alert.alert('Patrocínio Master', error.message); }
  };
  // O Museu é parceiro da Trip (banner do bloco 2), não o Master. Coloca o banner do Museu também na aba Trip.
  const museuNaTrip = async () => {
    const m = (banners || []).find((x) => x.chave === 'museu' || /museu da diversidade/i.test(x.titulo || ''));
    if (!m) return Alert.alert('Museu', 'Não achei o banner do Museu. Crie em "+ Adicionar aqui" com o texto do Museu.');
    const telas = Array.from(new Set([...(m.telas || []), 'trip']));
    const { error } = await supabase.from('banners_app').update({ telas, ativo: true }).eq('id', m.id);
    if (error) return Alert.alert('Museu', error.message);
    await carregar();
  };
  const Topo = ({ n, titulo, meta, acao, children }: { n: number; titulo: string; meta: string; acao?: { txt: string; ir: () => void }; children: React.ReactNode }) => (
    <View style={e.topoCard}>
      <View style={e.topoCab}>
        {n > 0 && <View style={e.topoSelo}><Text style={e.topoSeloTxt}>TOPO {n}</Text></View>}
        <Text style={e.topoTit} numberOfLines={1}>{titulo}</Text>
        {!!acao && <TouchableOpacity onPress={acao.ir} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button"><Text style={e.add}>{acao.txt}</Text></TouchableOpacity>}
      </View>
      <Text style={e.topoMeta}>{meta}</Text>
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
  // Linha simples dentro de um Topo (casa, cupom, festa)
  const Item = ({ txt, sub, selo, ir }: { txt: string; sub?: string; selo?: string; ir?: () => void }) => (
    <TouchableOpacity style={e.item} onPress={ir} disabled={!ir} activeOpacity={0.7}>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={sa.tit} numberOfLines={1}>{txt}</Text>{!!sub && <Text style={sa.sub} numberOfLines={1}>{sub}</Text>}</View>
      {!!selo && <View style={[sa.selo, { backgroundColor: '#34D39922' }]}><Text style={[sa.seloTxt, { color: CA.verde }]}>{selo}</Text></View>}
      {!!ir && <Feather name="chevron-right" size={15} color={CA.fraco} />}
    </TouchableOpacity>
  );
  const Vazio = ({ txt }: { txt: string }) => <Text style={e.vazio}>{txt}</Text>;
  // Banners de um Topo: os que o app mostra agora ficam à vista; desligados/vencidos ficam recolhidos.
  const BannersDoTopo = ({ lista, chave }: { lista: BannerAdm[]; chave: string }) => {
    const vivos = lista.filter((b) => ['No ar', 'Agendado'].includes(situacaoBanner(b).txt));
    const off = lista.filter((b) => !vivos.includes(b));
    const ver = aberta === `off:${chave}`;
    if (!lista.length) return null;
    return (
      <View style={{ marginTop: 8 }}>
        {vivos.length > 0 && <View style={[sa.lista, { marginBottom: 0 }]}>{vivos.map((b, i2, arr) => <BannerLinha key={b.id} b={b} ultimo={i2 === arr.length - 1} />)}</View>}
        {off.length > 0 && (
          <TouchableOpacity style={e.offBtn} onPress={() => setAberta(ver ? null : `off:${chave}`)} accessibilityRole="button">
            <Text style={e.offTxt}>{ver ? 'Esconder desligados' : `Desligados (${off.length}) · não aparecem no app`}</Text>
            <Feather name={ver ? 'chevron-up' : 'chevron-down'} size={13} color={CA.dim} />
          </TouchableOpacity>
        )}
        {ver && <View style={[sa.lista, { marginBottom: 0 }]}>{off.map((b, i2, arr) => <BannerLinha key={b.id} b={b} ultimo={i2 === arr.length - 1} />)}</View>}
      </View>
    );
  };

  const MasterCard = ({ slug }: { slug: string }) => {
    const m = masters.find((x) => x.categoria === slug);
    if (!m) {
      const on = conviteLigado(convites, slug);
      return (
        <View style={e.item}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={sa.tit}>Vaga livre</Text>
            <Text style={sa.sub}>{on ? 'O app mostra “Sua marca aqui”' : 'O app não mostra nada aqui'}</Text>
          </View>
          <Switch value={on} onValueChange={(v) => void ligarConvite(slug, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
        </View>
      );
    }
    return (
      <View style={e.item}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[sa.tit, !m.ativo && { color: CA.fraco }]} numberOfLines={1}>{m.titulo}</Text>
          <Text style={sa.sub}>{m.ativo ? 'No ar' : 'Desligado · aparece “Sua marca aqui”'}</Text>
        </View>
        <Switch value={m.ativo} onValueChange={(v) => void ligarMaster(m, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
      </View>
    );
  };

  const Casas = ({ lista, vazio, selo }: { lista: LocalMin[]; vazio: string; selo?: string }) => (
    lista.length ? (
      <View style={sa.lista}>
        {lista.map((l, i) => (
          <TouchableOpacity key={l.id} style={[sa.linha, i < lista.length - 1 && sa.borda]} onPress={() => router.push(`/adm/local/${l.id}` as any)} accessibilityRole="button">
            <Text style={[sa.tit, { flex: 1 }]} numberOfLines={1}>{l.nome}</Text>
            {!!selo && <View style={[sa.selo, { backgroundColor: '#34D39922' }]}><Text style={[sa.seloTxt, { color: CA.verde }]}>{selo}</Text></View>}
            <Feather name="chevron-right" size={16} color={CA.fraco} />
          </TouchableOpacity>
        ))}
      </View>
    ) : <Text style={sa.vazio}>{vazio}</Text>
  );

  return (
    <TelaAdm titulo="Vitrine do app" aoVoltar={lugar !== null ? () => setLugar(lugar.startsWith('dest:') ? 'trip' : lugar.startsWith('sub:turismo:') ? 'trip' : lugar.startsWith('sub:') ? `cat:${lugar.split(':')[1]}` : null) : undefined} subtitulo={lugar === null ? 'Toque num lugar para ver o que está nele agora.' : undefined} atualizando={atualizando}
      aoAtualizar={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }}>
      {banners === null ? <ActivityIndicator color={CA.rosa} /> : (
        <>
          {lugar === null && (
            <View style={[e.blocoTopo, { marginTop: 0 }]}>
              <Text style={e.blocoTit}>Categorias na ordem da Home</Text>
              <TouchableOpacity onPress={() => setOrdenando(!ordenando)} accessibilityRole="button"><Text style={e.add}>{ordenando ? 'Pronto' : 'Mudar ordem'}</Text></TouchableOpacity>
            </View>
          )}
          {lugar === null && ordenando && (
            <View style={sa.lista}>
              {ordemCats.map((slug, i) => {
                const cat = CATEGORIAS[slug];
                const nome = slug === 'destaques' ? 'Membros Fundadores' : slug === 'turismo' ? 'Dicas Trip' : ROTULO_CURTO_HOME[slug] || cat?.label || slug;
                return (
                  <View key={slug} style={[sa.linha, i < ordemCats.length - 1 && sa.borda]}>
                    <Text style={[sa.sub, { width: 22 }]}>{i + 1}</Text>
                    <Feather name={((cat as any)?.icon || 'grid') as any} size={16} color={(cat as any)?.color || CA.texto} />
                    <Text style={[sa.tit, { flex: 1 }, estadoDe(slug) === 'oculta' && { color: CA.fraco }]}>{nome}</Text>
                    <Text style={[sa.sub, { fontSize: 11 }]}>{ROT_ESTADO[estadoDe(slug)]}</Text>
                    <TouchableOpacity onPress={() => void moverCat(i, -1)} disabled={i === 0} hitSlop={8} style={{ padding: 4 }}><Feather name="arrow-up" size={18} color={i === 0 ? '#3A3950' : CA.texto} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => void moverCat(i, 1)} disabled={i === ordemCats.length - 1} hitSlop={8} style={{ padding: 4 }}><Feather name="arrow-down" size={18} color={i === ordemCats.length - 1 ? '#3A3950' : CA.texto} /></TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
          {lugar === null && !ordenando && (
            <View style={e.grade}>
              {[
                { id: 'home', label: 'Home', icon: 'home', cor: '#E1306C', info: `${daTela('home_topo').length + daTela('home').length + daTela('home_c3').length + daTela('home_c4').length} banners · ${acoes.length} ações` },
                // Mesma ordem da barra de categorias da Home; Dicas Trip abre a Trip; "Destaques" = Membros Fundadores.
                ...ordemCats.map((slug) => {
                  const cat = CATEGORIAS[slug];
                  if (slug === 'turismo') return { id: 'trip', label: 'Dicas Trip', icon: (cat as any)?.icon || 'compass', cor: (cat as any)?.color || '#2F80ED', info: `${daTela('trip').length + daTela('cat:turismo').length} banners` };
                  const premium = pagos.filter((l) => cat?.categoriaReal && l.categoria === cat.categoriaReal).length;
                  const label = slug === 'destaques' ? 'Membros Fundadores' : ROTULO_CURTO_HOME[slug] || cat?.label || slug;
                  const est = estadoDe(slug);
                  return { id: `cat:${slug}`, label, icon: (cat as any)?.icon || 'grid', cor: (cat as any)?.color || '#9B3CFF', info: est !== 'aparece' ? ROT_ESTADO[est] : slug === 'destaques' ? `${fundadores.length} fundadores` : `${daTela(`cat:${slug}`).length} banners · ${premium} pagos` };
                }),
              ].map((q) => (
                <TouchableOpacity key={q.id} style={e.quadro} onPress={() => setLugar(q.id)} activeOpacity={0.85} accessibilityRole="button">
                  <View style={[e.quadroIcone, { backgroundColor: q.cor + '26' }]}><Feather name={q.icon as any} size={18} color={q.cor} /></View>
                  <Text style={e.quadroTit} numberOfLines={2}>{q.label}</Text>
                  <Text style={e.quadroSub} numberOfLines={1}>{q.info}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {lugar === 'home' && (
            <>
          <Bloco tela="home_topo" titulo="1. Carrossel do topo" />
          <Casas lista={fundadores} vazio="Nenhum Fundador com plano ativo." selo="No ar" />
          <Bloco tela="home" titulo="2. Segundo carrossel" />

          <View style={e.blocoTopo}><Text style={e.blocoTit}>3. Caixas da Home</Text><TouchableOpacity onPress={() => router.push('/adm/caixa-editar' as any)} accessibilityRole="button"><Text style={e.add}>+ Nova caixa</Text></TouchableOpacity></View>
          <View style={sa.lista}>
            {caixas.map((c, i) => {
              const lista = naCaixa(c.chave);
              const abertaAqui = aberta === `caixa:${c.chave}`;
              return (
                <View key={c.chave} style={i < caixas.length - 1 ? sa.borda : undefined}>
                  <View style={sa.linha}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setAberta(abertaAqui ? null : `caixa:${c.chave}`)} accessibilityRole="button">
                      <Text style={[sa.tit, !c.ativo && { color: CA.fraco }]}>{c.titulo}</Text>
                      <Text style={sa.sub}>{c.tipo === 'padrao' ? 'Lista automática' : c.tipo === 'link' ? 'Abre uma página' : 'Escolha da equipe'}{lista.length ? ` · ${lista.length} ${lista.length === 1 ? 'casa marcada' : 'casas marcadas'}` : ''}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push(`/adm/caixa-editar?chave=${encodeURIComponent(c.chave)}` as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Editar ${c.titulo}`}><Feather name="edit-2" size={15} color={CA.dim} /></TouchableOpacity>
                    <Switch value={c.ativo} onValueChange={(v) => void ligarCaixa(c, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
                  </View>
                  {abertaAqui && <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}><Casas lista={lista} vazio="Nenhuma casa marcada. Marque na ficha da casa (aba Locais)." /></View>}
                </View>
              );
            })}
            {!caixas.length && <Text style={[sa.vazio, { padding: 12 }]}>Sem caixas configuradas (migração 097).</Text>}
          </View>

          <View style={e.blocoTopo}><Text style={e.blocoTit}>4. Ações da semana</Text><TouchableOpacity onPress={() => router.push('/adm/acoes' as any)} accessibilityRole="button"><Text style={e.add}>Ações de marca ›</Text></TouchableOpacity></View>
          {acoes.length ? (
            <View style={sa.lista}>
              {acoes.map((a, i) => (
                <View key={a.id} style={[sa.linha, i < acoes.length - 1 && sa.borda]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/adm/aprovar' as any)} accessibilityRole="button">
                    <Text style={[sa.tit, !a.mostrar_no_app && { color: CA.fraco }]}>{a.marca}</Text>
                    <Text style={sa.sub}>{a.nome} · até {a.fim.split('-').reverse().slice(0, 2).join('/')} · {a.mostrar_no_app ? 'no ar' : 'pausada'}</Text>
                  </TouchableOpacity>
                  <Switch value={a.mostrar_no_app} onValueChange={(v) => void ligarAcao(a, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" accessibilityLabel={a.mostrar_no_app ? `Pausar ${a.marca}` : `Pôr ${a.marca} no ar`} />
                </View>
              ))}
            </View>
          ) : <Text style={sa.vazio}>Nenhuma ação de marca no período.</Text>}

          <Bloco tela="home_c3" titulo="5. Terceiro carrossel" dica="Só aparece quando tem banner." />
          <Bloco tela="home_c4" titulo="6. Quarto carrossel" dica="Fim da Home. Só aparece quando tem banner." />

          <View style={e.blocoTopo}><Text style={e.blocoTit}>7. Rodapé dos Fundadores</Text></View>
          <TouchableOpacity onPress={() => setAberta(aberta === 'fund' ? null : 'fund')} accessibilityRole="button"><Text style={sa.sub}>{fundadores.length} Membros Fundadores · toque para ver</Text></TouchableOpacity>
          {aberta === 'fund' && <Casas lista={fundadores} vazio="Nenhum Fundador." />}

            </>
          )}
          {lugar === 'trip' && (() => {
            const casasTrip = [...fundadores, ...pagos].filter((l, i2, arr) => arr.findIndex((x) => x.id === l.id) === i2)
              .filter((l) => (l.plano_comercial === 'fundador' || l.plano_comercial === 'premium') && (l.categoria === 'turismo' || !!extras.turismo?.has(l.id)));
            const bannersTrip = [...daTela('trip'), ...daTela('cat:turismo')].filter((b, i2, arr) => arr.findIndex((x) => x.id === b.id) === i2);
            return (
              <>
                <Text style={e.catTit}>Dicas Trip</Text>
                <EstadoCat slug="turismo" />
                <Topo n={1} titulo="Patrocinador" meta="Fixo · 1 vaga" acao={{ txt: masters.some((x) => x.categoria === 'trip') ? 'Editar' : '+ Patrocinador', ir: () => router.push('/adm/master-editar?categoria=trip' as any) }}>
                  <MasterCard slug="trip" />
                </Topo>
                <Topo n={2} titulo="Banner rotativo" meta="Casas de viagem Fundador e Premium + campanhas · 4 por vez · troca a cada hora"
                  acao={{ txt: '+ Banner', ir: () => router.push('/adm/banner-editar?tela=trip' as any) }}>
                  {casasTrip.length ? casasTrip.map((l) => <Item key={l.id} txt={l.nome} selo="No ar" ir={() => router.push(`/adm/local/${l.id}` as any)} />)
                    : <Vazio txt="Nenhuma casa de viagem Fundador ou Premium (categoria Turismo ou Turismo como extra)" />}
                  <BannersDoTopo lista={bannersTrip} chave="trip" />
                </Topo>

                <Topo n={0} titulo="Ícones da Trip" meta={`Nome, ícone e ordem no app · ${defsAdm.filter((d) => !subOff.has(d.chave)).length} de ${defsAdm.length} aparecendo`}
                  acao={{ txt: 'Gerenciar', ir: () => router.push(`/adm/subcategorias?categoria=turismo&titulo=${encodeURIComponent('Dicas Trip')}` as any) }}>
                  {defsAdm.map((d, i2) => {
                    const visivel = !subOff.has(d.chave);
                    return (
                      <View key={d.chave} style={e.item}>
                        <View style={{ gap: 2 }}>
                          <TouchableOpacity onPress={() => void moverSub('turismo', i2, -1)} disabled={i2 === 0} hitSlop={6} accessibilityLabel="Subir"><Feather name="chevron-up" size={16} color={i2 === 0 ? '#3A3950' : CA.dim} /></TouchableOpacity>
                          <TouchableOpacity onPress={() => void moverSub('turismo', i2, 1)} disabled={i2 === defsAdm.length - 1} hitSlop={6} accessibilityLabel="Descer"><Feather name="chevron-down" size={16} color={i2 === defsAdm.length - 1 ? '#3A3950' : CA.dim} /></TouchableOpacity>
                        </View>
                        <Feather name={d.icone as any} size={15} color={visivel ? CA.texto : CA.fraco} />
                        <Text style={[sa.tit, { flex: 1 }, !visivel && { color: CA.fraco }]} numberOfLines={1}>{d.rotulo}</Text>
                        <Text style={[sa.sub, { color: visivel ? CA.verde : CA.fraco }]}>{visivel ? 'Aparece' : 'Escondida'}</Text>
                      </View>
                    );
                  })}
                  {defsAdm.length === 0 && <Vazio txt="Sem ícones. Crie em Gerenciar." />}
                </Topo>
                <Topo n={0} titulo="Página própria com banners" meta={`Ligada: o ícone abre uma página só dela com Topo 1 e 2 próprios. Desligada: abre só as casas cadastradas nela. ${casasTrip.length} casas pagas na Trip · vale ligar quando passar de 12`}>
                  {defsAdm.filter((d) => !subOff.has(d.chave)).map((d) => {
                    const proprios = daTela(`cat:turismo:${d.chave}`).length + (masters.some((x) => x.categoria === `turismo--${d.chave}`) ? 1 : 0);
                    return (
                      <View key={d.chave} style={e.item}>
                        <TouchableOpacity style={{ flex: 1, minWidth: 0 }} onPress={() => setLugar(`sub:turismo:${d.chave}`)} accessibilityRole="button">
                          <Text style={sa.tit} numberOfLines={1}>{d.rotulo}</Text>
                          <Text style={sa.sub} numberOfLines={1}>{proprios ? `${proprios} banner(s)/patrocinador próprio(s)` : 'Sem banner próprio'} · editar banners ›</Text>
                        </TouchableOpacity>
                        <Switch value={paginasAdm.has(d.chave)} onValueChange={(v) => void ligarPaginaSub('turismo', d.chave, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
                      </View>
                    );
                  })}
                </Topo>

                <View style={e.blocoTopo}>
                  <Text style={e.blocoTit}>Destinos e eventos (Roteiros)</Text>
                  <TouchableOpacity onPress={() => router.push('/adm/destino-editar' as any)} accessibilityRole="button"><Text style={e.add}>+ Destino</Text></TouchableOpacity>
                </View>
                <View style={e.grade}>
                  {destinosAdm.map((d) => {
                    const aberto = estaAberto(d);
                    const escondido = d.ativo === false;
                    return (
                      <TouchableOpacity key={d.slug} style={[e.quadro, (!aberto || escondido) && { opacity: 0.55 }]} onPress={() => setLugar(`dest:${d.slug}`)} activeOpacity={0.85} accessibilityRole="button">
                        <View style={[e.quadroIcone, { backgroundColor: '#2F80ED26' }]}><Feather name="map-pin" size={18} color="#2F80ED" /></View>
                        <Text style={e.quadroTit} numberOfLines={2}>{d.cidade}</Text>
                        <Text style={e.quadroSub} numberOfLines={1}>{`${(d as any).evento ? 'Evento · ' : ''}${escondido ? `${d.uf} · Escondido` : aberto ? `${d.uf} · Aberto` : `${d.uf} · Em breve`}`}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            );
          })()}
          {!!lugar && lugar.startsWith('dest:') && (() => {
            const d = destinosAdm.find((x) => x.slug === lugar.slice(5));
            if (!d) return null;
            const chave = `destino-${d.slug}`;
            const rot = (destCasas || []).filter((l) => l.plano_comercial === 'fundador' || l.plano_comercial === 'premium');
            return (
              <>
                <View style={e.blocoTopo}>
                  <Text style={e.catTit}>Trip · {d.cidade}</Text>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <TouchableOpacity onPress={() => router.push(`/adm/roteiros?destino=${d.slug}&cidade=${encodeURIComponent(d.cidade)}&uf=${d.uf || ''}` as any)} accessibilityRole="button"><Text style={e.add}>Roteiros</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push(`/adm/destino-editar?slug=${d.slug}` as any)} accessibilityRole="button"><Text style={e.add}>Editar destino</Text></TouchableOpacity>
                  </View>
                </View>
                <Text style={[sa.sub, { marginBottom: 10 }]}>{d.ativo === false ? 'Escondido da Trip' : estaAberto(d) ? 'Aberto no app' : 'Em breve no app (aparece apagado)'}</Text>
                <Topo n={1} titulo="Patrocinador" meta={`Fixo · 1 vaga · só na página de ${d.cidade}`} acao={{ txt: masters.some((x) => x.categoria === chave) ? 'Editar' : '+ Patrocinador', ir: () => router.push(`/adm/master-editar?categoria=${chave}` as any) }}>
                  <MasterCard slug={chave} />
                </Topo>
                <Topo n={2} titulo="Banner rotativo" meta="Casas de viagem Fundador e Premium · 4 por vez · troca a cada hora">
                  {destCasas === null ? <ActivityIndicator color={CA.rosa} /> : rot.length
                    ? rot.map((l) => <Item key={l.id} txt={l.nome} sub={l.plano_comercial === 'fundador' ? 'Fundador' : 'Premium'} selo="No ar" ir={() => router.push(`/adm/local/${l.id}` as any)} />)
                    : <Vazio txt="Nenhuma casa de viagem Fundador ou Premium aqui. Para entrar: categoria Turismo (ou Turismo como categoria extra) e plano pago." />}
                </Topo>
                <Topo n={3} titulo="Ofertas" meta={`Cupons das casas de viagem de ${d.cidade}`}>
                  {destCasas === null ? <ActivityIndicator color={CA.rosa} /> : <OfertasAdm categoria="turismo" idsLocais={destCasas.map((l) => l.id)} />}
                </Topo>
              </>
            );
          })()}
          {!!lugar && lugar.startsWith('sub:') && (() => {
            const [, slug, ...resto] = lugar.split(':');
            const chave = resto.join(':');
            const cat = CATEGORIAS[slug as keyof typeof CATEGORIAS];
            const defs = defsAdm;
            const d = defs.find((x) => x.chave === chave);
            const chaveMaster = `${slug}--${chave}`;
            const tela = `cat:${slug}:${chave}`;
            const bs = daTela(tela);
            return (
              <>
                <Text style={e.catTit}>{cat?.label || slug} › {d?.rotulo || chave}</Text>
                <Topo n={1} titulo="Patrocinador" meta="Fixo · 1 vaga · sem patrocinador próprio, mostra o da categoria"
                  acao={{ txt: masters.some((x) => x.categoria === chaveMaster) ? 'Editar' : '+ Patrocinador', ir: () => router.push(`/adm/master-editar?categoria=${encodeURIComponent(chaveMaster)}` as any) }}>
                  <MasterCard slug={chaveMaster} />
                </Topo>
                {(() => {
                  // O que a subcategoria herda da categoria quando não tem casa paga nem banner próprio.
                  const realCat = slug === 'festas' ? 'eventos' : cat?.categoriaReal || '';
                  const daCat = [...fundadores, ...pagos].filter((l, i2, arr) => arr.findIndex((x) => x.id === l.id) === i2)
                    .filter((l) => (l.plano_comercial === 'fundador' || l.plano_comercial === 'premium') && (l.categoria === realCat || !!extras[realCat]?.has(l.id)));
                  const proprio = (slug !== 'festas' && (subCasas || []).length > 0) || bs.length > 0;
                  const herda = !subOff.has(`__herdar:${chave}`);
                  return (
                    <View style={[e.topoCard, { paddingVertical: 12 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={e.topoTit}>Usar os banners da categoria</Text>
                          <Text style={e.topoMeta}>{herda ? (proprio ? 'Só entra se a subcategoria ficar sem nada próprio' : `Rodando agora: ${daCat.map((l) => l.nome).join(', ') || 'nenhum'}`) : 'Desligado: só aparece o que é desta subcategoria'}</Text>
                        </View>
                        <Switch value={herda} onValueChange={(v) => void ligarHerdar(realDaSub(slug), chave, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />
                      </View>
                    </View>
                  );
                })()}
                <Topo n={2} titulo="Banner rotativo" meta="Fundadores e Premium da subcategoria + banners · sem nenhum, roda o da categoria"
                  acao={{ txt: '+ Banner', ir: () => router.push(`/adm/banner-editar?tela=${encodeURIComponent(tela)}` as any) }}>
                  {slug === 'festas'
                    ? <Vazio txt="Próprias: casas Fundador e Premium de Festas que têm festa desse tipo marcada." />
                    : subCasas === null ? <ActivityIndicator color={CA.rosa} />
                    : subCasas.length ? subCasas.map((l) => <Item key={l.id} txt={l.nome} sub={l.plano_comercial === 'fundador' ? 'Fundador' : 'Premium'} selo="No ar" ir={() => router.push(`/adm/local/${l.id}` as any)} />)
                    : <Vazio txt="Nenhuma casa Fundador ou Premium nesta subcategoria" />}
                  <BannersDoTopo lista={bs} chave={lugar} />
                </Topo>
              </>
            );
          })()}
          {!!lugar && lugar.startsWith('cat:') && (() => {
            const slug = lugar.slice(4) as keyof typeof CATEGORIAS;
            const cat = CATEGORIAS[slug];
            const ehEventos = slug === 'festas';
            const real = slug === 'festas' ? 'eventos' : cat?.categoriaReal || '';   // Festas & Eventos = categoria 'eventos' das casas
            const naCat = (l: LocalMin) => !!real && (l.categoria === real || !!extras[real]?.has(l.id));
            const rotativo = [...fundadores.filter(naCat), ...pagos.filter(naCat)].filter((l, i2, arr) => arr.findIndex((x) => x.id === l.id) === i2);
            const plano = (c: { locais: { plano_comercial: string | null } | null }) => c.locais?.plano_comercial || 'gratuito';
            const grupo = (pl: string[]) => (cuponsCat || []).filter((c) => pl.includes(plano(c)));
            const banners = daTela(lugar);
            const dm = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            return (
              <>
                <Text style={e.catTit}>{slug === 'destaques' ? 'Membros Fundadores' : cat?.label || slug}</Text>
                <EstadoCat slug={slug} />

                <Topo n={1} titulo="Patrocinador" meta={ehEventos ? 'Fixo · 1 vaga · R$2.000/mês' : 'Fixo · 1 vaga'} acao={{ txt: masters.some((x) => x.categoria === slug) ? 'Editar' : '+ Patrocinador', ir: () => router.push(`/adm/master-editar?categoria=${slug}` as any) }}>
                  <MasterCard slug={slug} />
                </Topo>

                <Topo n={2} titulo="Banner rotativo" meta="Fundadores e Premium · 4 por vez · troca a cada hora"
                  acao={{ txt: '+ Banner', ir: () => router.push(`/adm/banner-editar?tela=${encodeURIComponent(lugar)}` as any) }}>
                  {rotativo.length ? rotativo.map((l) => <Item key={l.id} txt={l.nome} selo="No ar" ir={() => router.push(`/adm/local/${l.id}` as any)} />) : <Vazio txt="Nenhuma casa Fundador ou Premium" />}
                  <BannersDoTopo lista={banners} chave={lugar} />
                </Topo>

                {ehEventos ? (
                  <Topo n={3} titulo="Em destaque nessa semana" meta="Carrossel · até 24 · ações de marca na frente · do plano antes das avulsas · ordem gira a cada 10 min" acao={{ txt: '+ Festa', ir: () => router.push('/adm/festa-destacar' as any) }}>
                    {[
                      { tit: 'Do plano', regra: 'Fundador/Premium · Festas: 4×7 ou 2×15 dias · outras categorias: 1×7 dias/mês', lista: (festasDest || []).filter((f) => (f.destaque_secoes || []).includes('plano_festa') && f.locais?.plano_comercial !== 'intermediario') },
                      { tit: 'Intermediário Festas', regra: 'R$199 · 2 eventos/mês × 7 dias · máx. 12 casas', lista: (festasDest || []).filter((f) => (f.destaque_secoes || []).includes('plano_festa') && f.locais?.plano_comercial === 'intermediario') },
                      { tit: 'Avulsos', regra: 'R$129 (7 dias) ou R$199 (21 dias) · qualquer casa · máx. 6 por dia', lista: (festasDest || []).filter((f) => !(f.destaque_secoes || []).includes('plano_festa')) },
                    ].map((g) => (
                      <View key={g.tit} style={e.grupo}>
                        <View style={e.grupoCab}><Text style={e.grupoTit}>{g.tit}</Text><Text style={e.grupoNum}>{festasDest === null ? '…' : g.lista.length}</Text></View>
                        <Text style={e.grupoRegra}>{g.regra}</Text>
                        {g.lista.slice(0, 6).map((f) => <Item key={f.id} txt={f.titulo} sub={`${f.locais?.nome || ''} · ${dm(f.data_inicio)}`} />)}
                      </View>
                    ))}
                  </Topo>
                ) : (
                  <Topo n={3} titulo="Ofertas" meta="Cupons das casas · 6 por vez na faixa">
                    <OfertasAdm categoria={real} />
                  </Topo>
                )}

                {!!realDaSub(slug) && (
                  <>
                    <Text style={e.secaoGrande}>Subcategorias</Text>
                    <Topo n={0} titulo="Nome no app e ordem" meta={`Ícones redondos, nesta ordem no app · ${defsAdm.filter((d) => !subOff.has(d.chave)).length} de ${defsAdm.length} aparecendo`}
                      acao={{ txt: 'Gerenciar', ir: () => router.push(`/adm/subcategorias?categoria=${encodeURIComponent(realDaSub(slug))}&titulo=${encodeURIComponent(cat?.label || slug)}` as any) }}>
                      {defsAdm.map((d, i2) => {
                        const visivel = !subOff.has(d.chave);
                        return (
                          <View key={d.chave} style={e.item}>
                            <View style={{ gap: 2 }}>
                              <TouchableOpacity onPress={() => void moverSub(realDaSub(slug), i2, -1)} disabled={i2 === 0} hitSlop={6} accessibilityLabel="Subir"><Feather name="chevron-up" size={16} color={i2 === 0 ? '#3A3950' : CA.dim} /></TouchableOpacity>
                              <TouchableOpacity onPress={() => void moverSub(realDaSub(slug), i2, 1)} disabled={i2 === defsAdm.length - 1} hitSlop={6} accessibilityLabel="Descer"><Feather name="chevron-down" size={16} color={i2 === defsAdm.length - 1 ? '#3A3950' : CA.dim} /></TouchableOpacity>
                            </View>
                            <Feather name={d.icone as any} size={15} color={visivel ? CA.texto : CA.fraco} />
                            <Text style={[sa.tit, { flex: 1 }, !visivel && { color: CA.fraco }]} numberOfLines={1}>{d.rotulo}</Text>
                            <Text style={[sa.sub, { color: visivel ? CA.verde : CA.fraco }]}>{visivel ? 'Aparece' : 'Escondida'}</Text>
                          </View>
                        );
                      })}
                      {defsAdm.length === 0 && <Vazio txt="Sem subcategorias. Crie em Gerenciar." />}
                    </Topo>
                    <Topo n={0} titulo="Página própria com banners"
                      meta={slug === 'festas' ? 'Em Festas toda subcategoria já abre página própria' : `Ligada: o ícone abre uma página só dela (Topo 1, 2 e 3). Desligada: só filtra a lista. ${rotativo.length} casas pagas na categoria · vale ligar quando passar de 12`}>
                      {defsAdm.length === 0 && <Vazio txt="Sem subcategorias. Crie em Gerenciar." />}
                      {defsAdm.filter((d) => !subOff.has(d.chave)).map((d) => {
                        const proprios = daTela(`cat:${slug}:${d.chave}`).length + (masters.some((x) => x.categoria === `${slug}--${d.chave}`) ? 1 : 0);
                        const ligada = slug === 'festas' || paginasAdm.has(d.chave);
                        return (
                          <View key={d.chave} style={e.item}>
                            <TouchableOpacity style={{ flex: 1, minWidth: 0 }} onPress={() => setLugar(`sub:${slug}:${d.chave}`)} accessibilityRole="button">
                              <Text style={sa.tit} numberOfLines={1}>{d.rotulo}</Text>
                              <Text style={sa.sub} numberOfLines={1}>{proprios ? `${proprios} banner(s)/patrocinador próprio(s)` : 'Sem banner próprio'} · editar banners ›</Text>
                            </TouchableOpacity>
                            {slug !== 'festas' && <Switch value={ligada} onValueChange={(v) => void ligarPaginaSub(realDaSub(slug), d.chave, v)} trackColor={{ true: CA.verde, false: '#3A3950' }} thumbColor="#FFF" />}
                          </View>
                        );
                      })}
                    </Topo>
                  </>
                )}
              </>
            );
          })()}
        </>
      )}
    </TelaAdm>
  );
}

const e = StyleSheet.create({
  blocoTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 6 },
  blocoTit: { ...TITULO_SECAO, fontSize: 12, color: CA.dim },
  add: { color: CA.rosa, fontSize: 12, fontWeight: '700' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catTit: { ...TITULO_SECAO, marginBottom: 12 },
  topoCard: { backgroundColor: CA.card, borderWidth: 1, borderColor: CA.borda, borderRadius: 16, padding: 14, marginBottom: 12 },
  topoCab: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topoSelo: { backgroundColor: '#E1306C22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  topoSeloTxt: { color: CA.rosa, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  topoTit: { flex: 1, color: CA.texto, fontSize: 13, fontWeight: '700' },
  topoMeta: { color: CA.dim, fontSize: 10, marginTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: CA.borda },
  vazio: { color: CA.fraco, fontSize: 11, paddingVertical: 4 },
  grupo: { marginBottom: 10 },
  grupoCab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grupoTit: { color: CA.texto, fontSize: 12, fontWeight: '600' },
  grupoNum: { color: CA.texto, fontSize: 12, fontWeight: '700', backgroundColor: '#2A2840', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' },
  grupoRegra: { color: CA.fraco, fontSize: 10, marginTop: 2, marginBottom: 2 },
  secaoGrande: { ...TITULO_SECAO, marginTop: 18, marginBottom: 10 },
  estadoLinha: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 2 },
  estadoPonto: { width: 7, height: 7, borderRadius: 4 },
  estadoLinhaTxt: { color: CA.dim, fontSize: 11.5, fontWeight: '600' },
  estado: { flex: 1, borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingVertical: 8, alignItems: 'center' },
  estadoOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  estadoTxt: { color: CA.texto, fontSize: 12, fontWeight: '700' },
  offBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  offTxt: { color: CA.dim, fontSize: 11, fontWeight: '600' },
  quadro: { width: '31.8%', backgroundColor: CA.card, borderWidth: 1, borderColor: CA.borda, borderRadius: 14, padding: 10, minHeight: 104 },
  quadroIcone: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quadroTit: { color: CA.texto, fontSize: 12, fontWeight: '700', lineHeight: 15 },
  quadroSub: { color: CA.dim, fontSize: 10, marginTop: 3 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  voltarTxt: { color: CA.dim, fontSize: 13, fontWeight: '700' },
});
