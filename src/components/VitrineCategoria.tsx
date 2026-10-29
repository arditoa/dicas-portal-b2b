// Estrutura padrão do topo de TODA categoria (out/2026), igual em todas as abas — previsível:
//   1) DESTAQUES  — locais pagos/fundadores girando por hora (o desejo de comunicar mora aqui)
//   2) PATROCÍNIO — banner fixo da categoria (editável no /admin e no portal do patrocinador)
//   3) OFERTAS E BENEFÍCIOS — cupons dos parceiros da categoria, girando por hora
// Cada bloco mede exibições e toques (vitrine_eventos) para a equipe comercial mostrar resultado.
import { Feather } from '@expo/vector-icons';
import { MODO_DEMONSTRACAO } from '../lib/demo';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import { useSlotHora } from '../hooks/useSlotHora';
import { deveExibirGlow, pagaPlanoComDireitoADestaque } from '../lib/destaque';
import { formatarNome } from '../lib/texto';
import {
  Comunicacao,
  OfertaVitrine,
  Patrocinio,
  ateData,
  buscarComunicacao,
  buscarOfertas,
  buscarPatrocinio,
  registrarVitrine,
} from '../lib/vitrine';
import CarrosselAnuncios, { Anuncio } from './CarrosselAnuncios';
import FundoCaixaDegrade from './FundoCaixaDegrade';

const C = { card: '#161520', border: '#232230', text: '#FFFFFF', dim: '#A0A0B2', pink: '#E1306C', gold: '#FFD54F' };
// Degradês do banner rotativo (sem foto): se alternam na identidade do app.
const DEGRADES_DESTAQUE: [string, string][] = [
  ['#E1306C', '#7E57C2'],
  ['#7E57C2', '#2563EB'],
  ['#0E9F6E', '#0E7490'],
  ['#F59E0B', '#E1306C'],
  ['#6366F1', '#EC4899'],
];
// Faixa de ofertas: só o plano Intermediário (e ofertas criadas pela equipe). Na categoria Destaques entram as dos Fundadores.
const planoComOferta = (o: OfertaVitrine, fundadores = false) =>
  o.equipe || (!!o.plano_comercial && (o.plano_comercial === 'intermediario' || (fundadores && o.plano_comercial === 'fundador')) && (o.plano_comercial_status ?? 'ativo') === 'ativo');
const DEGRADES_OFERTA: [string, string][] = [
  ['#E1306C', '#7E57C2'],
  ['#0E9F6E', '#0E7490'],
  ['#F59E0B', '#E1306C'],
  ['#6366F1', '#EC4899'],
  ['#2563EB', '#7E57C2'],
];
// Ofertas no formato das caixas da Home (3 por linha, 92 de altura): até 6 por vez, a janela avança a cada 6 horas.
const OFERTAS_POR_VEZ = 6;
const PATROCINIO_VEZPA: Patrocinio = {
  categoria: 'destaques',
  local_id: null,
  tag: 'PATROCINADOR MASTER',
  titulo: 'Vezpa Bar & Rooftop',
  subtitulo: null,
  cta: 'Conhecer',
  destino: '',
  imagem_url: null,
  cor1: '#E1306C',
  cor2: '#7E57C2',
};
const URL_PARCEIRO = 'https://www.dicaslgbt.com.br/parceiro-fundador';

export type LocalVitrine = {
  id: string;
  nome: string;
  categoria?: string;
  subcategoria?: string | null;
  bairro?: string | null;
  bairro_exibicao?: string | null;
  cidade?: string;
  foto_capa_url?: string | null;
  logo_url?: string | null;
  galeria_fotos?: string[] | null;
  plano_destaque?: string;
  plano_comercial?: string | null;
  plano_comercial_status?: string | null;
  destaque_secao_fixada?: string | null;
  destaque_secoes?: string[] | null;
  destaque_ate?: string | null;
};

type Props = {
  slug: string; // slug do app (bares, gastronomia, destaques…): chave do patrocínio e da medição
  titulo: string;
  categoriaReal?: string | string[] | null; // filtra as ofertas pela categoria real do banco
  locais: LocalVitrine[]; // locais já carregados da categoria
  fundadores?: boolean; // página "Destaques": todo o pool é de Membros Fundadores
  aposOfertas?: ReactNode; // subcategorias em ícones: entre o banner rotativo e as ofertas
  tituloLista?: string | null; // título antes da lista abaixo; null = sem título (a página mostra banners de subcategoria)
  idsLocaisOfertas?: string[]; // limita as ofertas a estes locais (ex.: os de uma cidade)
  semOfertas?: boolean; // páginas de destino: sem faixa de ofertas
  patrocinioPadrao?: Patrocinio; // mostrado quando a categoria/destino ainda não tem patrocinador cadastrado
  bannerPadrao?: Anuncio; // usado quando a categoria ainda não tem patrocinador (ex.: Dicas Trip em Destaques)
};

function fotoDe(l: LocalVitrine): string | null {
  return l.foto_capa_url || l.galeria_fotos?.[0] || l.logo_url || null;
}

function abrirDestino(router: ReturnType<typeof useRouter>, destino: string) {
  if (!destino) return;
  if (destino.startsWith('http')) Linking.openURL(destino).catch(() => {});
  else if (destino.startsWith('local:')) router.push(`/business/${destino.slice(6)}` as any);
  else router.push(destino as any);
}

export default function VitrineCategoria({ slug, titulo, categoriaReal, locais, fundadores, bannerPadrao, tituloLista, aposOfertas, semOfertas, patrocinioPadrao, idsLocaisOfertas }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const slot = useSlotHora(60);
  const slotOferta = useSlotHora(360); // faixa de ofertas troca a cada 6 horas
  const slotPremium = useSlotHora(60); // banner rotativo Premium: 4 por vez, troca a cada hora (até 12 no total)
  const [patrocinioDb, setPatrocinio] = useState<Patrocinio | null>(null);
  const [patrocinioLido, setPatrocinioLido] = useState(false);
  // Destaques (Fundadores): um único slot de patrocínio master. Sem linha no banco, mostra o Vezpa Bar & Rooftop.
  const patrocinioDemo: Patrocinio | null = MODO_DEMONSTRACAO
    ? { categoria: slug, local_id: null, tag: 'PATROCÍNIO MASTER · CATEGORIA', titulo: `Espaço do patrocinador master de ${titulo}`, subtitulo: null, cta: 'Quero este espaço', destino: URL_PARCEIRO, imagem_url: null, cor1: '#7E57C2', cor2: '#E1306C' }
    : null;
  const patrocinio = patrocinioDb ?? (patrocinioLido ? (fundadores ? PATROCINIO_VEZPA : patrocinioPadrao ?? patrocinioDemo) : null);
  const [ofertas, setOfertas] = useState<OfertaVitrine[]>([]);
  const [comunicacao, setComunicacao] = useState<Record<string, Comunicacao>>({});

  // 1) pool de destaques: pagos (selo DESTAQUE / plano premium-fundador) com imagem, girando por hora.
  const pool = useMemo(() => {
    const base = fundadores ? locais : locais.filter((l) => deveExibirGlow(l as any) || pagaPlanoComDireitoADestaque(l as any));
    // Banner em degradê, sem foto: não exige imagem do local.
    return base.slice().sort((a, b) => a.id.localeCompare(b.id)).slice(0, 12); // até 12 vagas
  }, [locais, fundadores]);
  // 12 vagas de banner rotativo (Premium na categoria; Fundador em Destaques): 4 por vez, a janela avança a cada hora.
  // Em demonstração as vagas sem anunciante aparecem escritas ("Banner Premium Destaque 5 …") como se estivesse tudo cheio.
  const totalVagas = MODO_DEMONSTRACAO ? 12 : pool.length;
  const posicoes = useMemo(() => {
    if (totalVagas === 0) return [] as number[];
    const ini = ((((fundadores ? slot : slotPremium) * 4) % totalVagas) + totalVagas) % totalVagas;
    return Array.from({ length: Math.min(4, totalVagas) }, (_, k) => (ini + k) % totalVagas);
  }, [totalVagas, slot, slotPremium, fundadores]);
  const destaques = useMemo(() => posicoes.map((i) => pool[i]).filter(Boolean), [posicoes, pool]);

  const idsPool = useMemo(() => destaques.map((l) => l.id).join(','), [destaques]);
  useEffect(() => {
    let vivo = true;
    if (!idsPool) { setComunicacao({}); return; }
    buscarComunicacao(idsPool.split(',')).then((m) => { if (vivo) setComunicacao(m); });
    return () => { vivo = false; };
  }, [idsPool]);

  useEffect(() => {
    let vivo = true;
    setPatrocinioLido(false);
    buscarPatrocinio(slug).then((p) => { if (vivo) { setPatrocinio(p); setPatrocinioLido(true); } });
    return () => { vivo = false; };
  }, [slug]);

  // 3) ofertas: da categoria real; em "Destaques", dos fundadores.
  // A lista chega como array novo a cada render; a chave em texto evita buscar as ofertas em loop.
  const chaveIdsOfertas = idsLocaisOfertas?.join(',') ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const idsLocais = useMemo(() => (idsLocaisOfertas ?? (fundadores ? locais.map((l) => l.id) : undefined)), [fundadores, locais, chaveIdsOfertas]);
  useEffect(() => {
    let vivo = true;
    if (semOfertas) return;
    buscarOfertas({ categoriaReal: fundadores || chaveIdsOfertas !== null ? null : categoriaReal, idsLocais }).then((o) => { if (vivo) setOfertas(o); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaReal, fundadores, idsLocais, chaveIdsOfertas, semOfertas]);

  const ofertasHora = useMemo(() => {
    const ord = ofertas.filter((o) => planoComOferta(o, fundadores)).sort((a, b) => (a.equipe ? 0 : 1) - (b.equipe ? 0 : 1) || a.id.localeCompare(b.id));
    if (ord.length === 0) return [];
    // OFERTAS_POR_VEZ por vez; a janela avança esse tanto a cada 6 horas (até 24 ofertas por categoria).
    const inicio = (((slotOferta * OFERTAS_POR_VEZ) % ord.length) + ord.length) % ord.length;
    return [...ord.slice(inicio), ...ord.slice(0, inicio)].slice(0, OFERTAS_POR_VEZ);
  }, [ofertas, slotOferta, fundadores]);

  // Medição: exibição dos 3 primeiros destaques e das 3 primeiras ofertas (1x por sessão e seção).
  useEffect(() => {
    destaques.slice(0, 3).forEach((l) => registrarVitrine(l.id, `destaques:${slug}`, 'exibicao'));
  }, [destaques, slug]);
  useEffect(() => {
    ofertasHora.slice(0, 3).forEach((o) => registrarVitrine(o.local_id, `oferta:${slug}`, 'exibicao'));
  }, [ofertasHora, slug]);

  // Sem patrocinador a categoria NÃO mostra espaço nenhum (só a categoria Destaques traz o banner padrão da Trip).
  const bannerPatr = !patrocinio && bannerPadrao ? bannerPadrao : null;

  useEffect(() => {
    if (patrocinio && patrocinioLido) registrarVitrine(patrocinio.local_id, `patrocinio:${slug}`, 'exibicao');
  }, [patrocinio, patrocinioLido, slug]);

  // Cartões do banner rotativo (padrão da Home). Chamada editável; sem chamada, convite neutro sem nome do local.
  const anunciosRotativos = useMemo<Anuncio[]>(() => {
    if (posicoes.length === 0) {
      return [{
        id: `dest-vazio-${slug}`,
        chave: `dest-vazio-${slug}`,
        tag: 'SEU NEGÓCIO AQUI',
        titulo: `Apareça para quem procura ${titulo}`,
        cta: 'Conheça os planos',
        icone: 'award',
        cor: '#7E57C2',
        degrade: ['#374151', '#4B5563'],
        onPress: () => Linking.openURL(URL_PARCEIRO).catch(() => {}),
      }];
    }
    return posicoes.map<Anuncio>((pos, idx) => {
      const l = pool[pos];
      const cor = DEGRADES_DESTAQUE[(idx + slot) % DEGRADES_DESTAQUE.length];
      if (!l) {
        // Vaga ainda sem anunciante (só em demonstração).
        const rotulo = fundadores ? `Banner Fundador ${pos + 1} Destaques` : `Banner Premium Destaque ${pos + 1} ${titulo}`;
        return {
          id: `demo-${slug}-${pos}`,
          chave: `demo-${slug}-${pos}`,
          tag: fundadores ? 'BANNER FUNDADOR' : 'BANNER PREMIUM DESTAQUE · CATEGORIA',
          titulo: rotulo,
          cta: 'Conheça os planos',
          icone: fundadores ? 'star' : 'award',
          cor: cor[0],
          degrade: cor,
          onPress: () => Linking.openURL(URL_PARCEIRO).catch(() => {}),
        };
      }
      const com = comunicacao[l.id];
      const lugar = l.bairro_exibicao || l.bairro;
      const chamada = com?.headline || com?.oferta || `Conheça ${l.subcategoria ? `um(a) ${String(l.subcategoria).toLowerCase()}` : 'um lugar especial'}${lugar ? ` em ${lugar}` : ''}`;
      return {
        id: `dest-${l.id}`,
        chave: `dest-${l.id}`,
        tag: fundadores ? formatarNome(l.nome).toUpperCase() : (l.subcategoria ? String(l.subcategoria).toUpperCase() : 'LUGAR ESPECIAL'),
        titulo: chamada,
        cta: com?.cta || 'Conhecer',
        icone: fundadores ? 'star' : 'map-pin',
        cor: cor[0],
        degrade: cor,
        onPress: () => {
          registrarVitrine(l.id, `destaques:${slug}`, 'clique');
          if (com?.destino) abrirDestino(router, com.destino);
          else router.push(`/business/${l.id}` as any);
        },
      };
    });
  }, [posicoes, pool, comunicacao, fundadores, slot, slug, titulo, router]);


  return (
    <View style={s.raiz}>
      {fundadores && (
        <View style={s.agradece}>
          <FundoCaixaDegrade id="agradece-fundadores" cores={['#4C1D95', '#BE185D']} />
          <View style={s.agradeceFaixa}>
            {['#E40303', '#FF8C00', '#FFED00', '#008026', '#24408E', '#732982'].map((c) => (
              <View key={c} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>
          <View style={s.agradeceCorpo}>
            <View style={s.agradeceTopo}>
              <View style={s.agradeceIcone}>
                <Feather name="heart" size={18} color="#FFFFFF" />
              </View>
              <View style={s.agradecePilula}>
                <Text style={s.agradecePilulaTxt}>MEMBROS FUNDADORES</Text>
              </View>
            </View>
            <Text style={s.agradeceTitulo}>Gratidão aos nossos Fundadores</Text>
            <Text style={s.agradeceTexto}>
              Estes negócios acreditaram no Dicas LGBT+ desde o começo e estão construindo esta comunidade com a gente. Cada visita, cada avaliação e cada oferta aqui fortalece quem abriu as portas primeiro.
            </Text>
            <Text style={s.agradeceFecho}>Obrigado por fazer parte da história!</Text>
          </View>
        </View>
      )}

      {/* 0) BANNER PRINCIPAL ESTÁTICO (patrocínio master) — logo abaixo da busca, emoldurado na mesma margem dos outros cartões, 76 de altura. Só aparece se a categoria tem patrocinador. */}
      {patrocinio && (
        <TouchableOpacity
          activeOpacity={0.92}
          style={s.patroc}
          onPress={() => {
            registrarVitrine(patrocinio.local_id, `patrocinio:${slug}`, 'clique');
            abrirDestino(router, patrocinio.destino);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${patrocinio.titulo}. ${patrocinio.tag}`}
        >
          <FundoCaixaDegrade id={`pt-${slug}`} cores={[patrocinio.cor1, patrocinio.cor2]} />
          {!!patrocinio.imagem_url && <Image source={{ uri: patrocinio.imagem_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          {!!patrocinio.imagem_url && <View style={s.patrocVeu} />}
          <View style={s.patrocCorpo}>
            <View style={s.patrocPilula}>
              <Text style={s.patrocTag} numberOfLines={1}>{patrocinio.tag}</Text>
            </View>
            <Text style={s.patrocTitulo} numberOfLines={2}>{patrocinio.titulo}</Text>
            <View style={s.patrocBtn}>
              <Text style={s.patrocBtnTxt}>{patrocinio.cta}</Text>
              <Feather name="arrow-right" size={14} color="#1A1020" />
            </View>
          </View>
        </TouchableOpacity>
      )}
      {bannerPatr && (
        <View style={{ marginBottom: 12, marginHorizontal: -16 }}>
          <CarrosselAnuncios anuncios={[bannerPatr]} />
        </View>
      )}

      {/* 1) BANNER ROTATIVO — mesmo cartão em degradê da Home (ex.: "Apoio cultural"): etiqueta, chamada, botão, pontinhos. */}
      <View style={{ marginHorizontal: -16, marginBottom: -8 }}>
        <CarrosselAnuncios anuncios={anunciosRotativos} onExibir={(id) => { const l = destaques.find((x) => `dest-${x.id}` === id); if (l) registrarVitrine(l.id, `destaques:${slug}`, 'exibicao'); }} />
      </View>

      {!fundadores && (
        <>
      {/* 1b) SUBCATEGORIAS em ícones — entre o banner rotativo e as ofertas. */}
      {!!aposOfertas && <View style={{ marginTop: 8 }}>{aposOfertas}</View>}

      {/* 2) OFERTAS — logo abaixo dos ícones. Só planos Intermediário, Premium e Fundador.
          Quadradinhos pequenos que passam de lado; não mostram o local (só ao tocar), como no Mercado Livre. */}
      {!semOfertas && (
      <View style={{ marginTop: 10 }}>
        {ofertasHora.length > 0 || MODO_DEMONSTRACAO ? (
          <View style={s.linhaOfertas}>
            {ofertasHora.map((o, idx) => (
              <TouchableOpacity
                key={o.id}
                activeOpacity={0.9}
                style={s.cardOferta}
                onPress={() => {
                  registrarVitrine(o.local_id, `oferta:${slug}`, 'clique');
                  router.push(`/business/${o.local_id}` as any);
                }}
                accessibilityRole="button"
                accessibilityLabel={o.titulo}
              >
                <FundoCaixaDegrade id={`of-${o.id}`} cores={DEGRADES_OFERTA[(idx + slot) % DEGRADES_OFERTA.length]} />
                {!!o.imagem_url && <Image source={{ uri: o.imagem_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                {!!o.imagem_url && <View style={s.ofertaVeu} />}
                <Feather name="tag" size={22} color="#FFFFFF" />
                <Text style={s.ofertaTitulo} numberOfLines={2}>{o.titulo}</Text>
              </TouchableOpacity>
            ))}
            {MODO_DEMONSTRACAO && Array.from({ length: Math.max(0, OFERTAS_POR_VEZ - ofertasHora.length) }).map((_, k) => {
              const n = ofertasHora.length + k + 1;
              return (
                <View key={`demo-${n}`} style={s.cardOferta} accessibilityLabel={`Banner ${n} Intermediário ${titulo}`}>
                  <FundoCaixaDegrade id={`ofd-${slug}-${n}`} cores={DEGRADES_OFERTA[n % DEGRADES_OFERTA.length]} />
                  <Feather name="tag" size={20} color="#FFFFFF" />
                  <Text style={[s.ofertaTitulo, { fontSize: 11 }]} numberOfLines={3}>{`Banner ${n} Intermediário ${titulo}`}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.vazioOfertas}>
            <Feather name="gift" size={14} color={C.pink} />
            <Text style={s.vazioOfertasTxt}>Ofertas chegando — cupons dos negócios desta categoria passam aqui.</Text>
          </View>
        )}
      </View>
      )}

        </>
      )}

      {tituloLista !== null && (
        <Text style={[s.secao, { marginTop: 18 }]}>{tituloLista ?? (fundadores ? 'Todos os Membros Fundadores' : `Todos em ${titulo}`)}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { paddingTop: 4, paddingBottom: 6 },
  secao: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 10 },
  linha: { gap: 10, paddingHorizontal: 16 },
  cardDestaque: { height: 205, borderRadius: 18, overflow: 'hidden', backgroundColor: C.card, justifyContent: 'flex-end' },
  veu: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,16,0.45)' },
  selo: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.gold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  seloTxt: { fontSize: 10, fontWeight: '800', color: '#1A1405', letterSpacing: 0.5 },
  rodapeCard: { padding: 10, gap: 2 },
  nome: { fontSize: 14, fontWeight: '800', color: '#FFF', lineHeight: 18 },
  frase: { fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 17 },
  ctaPilula: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 4 },
  ctaTxt: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  ofertaPilula: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.pink, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, marginTop: 4, maxWidth: '100%' },
  ofertaTxt: { fontSize: 11, fontWeight: '800', color: '#FFF', flexShrink: 1 },
  vazioCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  vazioTitulo: { fontSize: 14, fontWeight: '800', color: C.text },
  vazioSub: { fontSize: 12, color: C.dim, lineHeight: 16, marginTop: 2 },
  agradece: { marginBottom: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: C.card },
  agradeceFaixa: { flexDirection: 'row', height: 4 },
  agradeceCorpo: { padding: 16, gap: 8 },
  agradeceTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agradeceIcone: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  agradecePilula: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  agradecePilulaTxt: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6 },
  agradeceTitulo: { fontSize: 19, lineHeight: 24, fontWeight: '900', color: '#FFFFFF' },
  agradeceTexto: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.92)' },
  agradeceFecho: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  patroc: { marginBottom: 14, height: 128, borderRadius: 14, overflow: 'hidden', justifyContent: 'center', backgroundColor: C.card },
  patrocVeu: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,16,0.45)' },
  patrocCorpo: { padding: 14, gap: 6, paddingRight: 24 },
  patrocPilula: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  patrocTag: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6 },
  patrocTitulo: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', lineHeight: 19 },
  patrocBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 13, minHeight: 30 },
  patrocBtnTxt: { fontSize: 12, fontWeight: '800', color: '#1A1020' },
  ofertaVeu: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,16,0.5)' },
  linhaOfertas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardOferta: { width: '31.5%', height: 92, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6, backgroundColor: C.card },
  ofertaTitulo: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.28)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  ofertaAte: { position: 'absolute', right: 6, top: 5, fontSize: 8, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  vazioOfertas: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  vazioOfertasTxt: { flex: 1, fontSize: 11, color: C.dim },
});
