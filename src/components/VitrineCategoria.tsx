// Estrutura padrão do topo de TODA categoria (out/2026), igual em todas as abas — previsível:
//   1) DESTAQUES  — locais pagos/fundadores girando por hora (o desejo de comunicar mora aqui)
//   2) PATROCÍNIO — banner fixo da categoria (editável no /admin e no portal do patrocinador)
//   3) OFERTAS E BENEFÍCIOS — cupons dos parceiros da categoria, girando por hora
// Cada bloco mede exibições e toques (vitrine_eventos) para a equipe comercial mostrar resultado.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
// Ofertas no banner lateral: só Intermediário, Premium e Fundador ativos (e as ofertas criadas pela equipe).
const PLANOS_OFERTA = new Set(['intermediario', 'premium', 'fundador']);
const planoComOferta = (o: OfertaVitrine) =>
  o.equipe || (!!o.plano_comercial && PLANOS_OFERTA.has(o.plano_comercial) && (o.plano_comercial_status ?? 'ativo') === 'ativo');
const DEGRADES_OFERTA: [string, string][] = [
  ['#E1306C', '#7E57C2'],
  ['#0E9F6E', '#0E7490'],
  ['#F59E0B', '#E1306C'],
  ['#6366F1', '#EC4899'],
  ['#2563EB', '#7E57C2'],
];
const LARG_OFERTA = 92;
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
  aposPatrocinio?: ReactNode; // filtros: entram logo depois do patrocínio (ou, sem ele, depois das ofertas)
  tituloLista?: string | null; // título antes da lista abaixo; null = sem título (a página mostra banners de subcategoria)
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

export default function VitrineCategoria({ slug, titulo, categoriaReal, locais, fundadores, bannerPadrao, tituloLista, aposPatrocinio }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const slot = useSlotHora(60);
  const [patrocinio, setPatrocinio] = useState<Patrocinio | null>(null);
  const [patrocinioLido, setPatrocinioLido] = useState(false);
  const [ofertas, setOfertas] = useState<OfertaVitrine[]>([]);
  const [comunicacao, setComunicacao] = useState<Record<string, Comunicacao>>({});

  // 1) pool de destaques: pagos (selo DESTAQUE / plano premium-fundador) com imagem, girando por hora.
  const pool = useMemo(() => {
    const base = fundadores ? locais : locais.filter((l) => deveExibirGlow(l as any) || pagaPlanoComDireitoADestaque(l as any));
    // Banner em degradê, sem foto: não exige imagem do local.
    return base.slice().sort((a, b) => a.id.localeCompare(b.id));
  }, [locais, fundadores]);
  const destaques = useMemo(() => {
    if (pool.length === 0) return [];
    const inicio = ((slot % pool.length) + pool.length) % pool.length;
    return [...pool.slice(inicio), ...pool.slice(0, inicio)].slice(0, 8);
  }, [pool, slot]);

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
  const idsLocais = useMemo(() => (fundadores ? locais.map((l) => l.id) : undefined), [fundadores, locais]);
  useEffect(() => {
    let vivo = true;
    buscarOfertas({ categoriaReal: fundadores ? null : categoriaReal, idsLocais }).then((o) => { if (vivo) setOfertas(o); });
    return () => { vivo = false; };
  }, [categoriaReal, fundadores, idsLocais]);

  const ofertasHora = useMemo(() => {
    if (ofertas.filter(planoComOferta).length === 0) return [];
    const rank = (o: OfertaVitrine) => (o.equipe ? 0 : pagaPlanoComDireitoADestaque(o as any) ? 1 : 2);
    const ord = ofertas.filter(planoComOferta).sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
    const inicio = ((slot % ord.length) + ord.length) % ord.length;
    return [...ord.slice(inicio), ...ord.slice(0, inicio)].slice(0, 10);
  }, [ofertas, slot]);

  // Rotação visível das ofertas: avança um quadradinho a cada 3 s (volta ao início no fim) e pausa
  // por 8 s quando a pessoa mexe com o dedo.
  const refOfertas = useRef<ScrollView>(null);
  const pausaAte = useRef(0);
  const posOferta = useRef(0);
  useEffect(() => {
    if (ofertasHora.length < 3) return;
    const passo = LARG_OFERTA + 8;
    const t = setInterval(() => {
      if (Date.now() < pausaAte.current) return;
      posOferta.current = (posOferta.current + 1) % ofertasHora.length;
      refOfertas.current?.scrollTo({ x: posOferta.current * passo, animated: true });
    }, 3000);
    return () => clearInterval(t);
  }, [ofertasHora.length]);

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

  const larguraCard = fundadores ? Math.min(280, Math.round(width * 0.7)) : Math.min(230, Math.round(width * 0.6));

  return (
    <View style={s.raiz}>
      {/* 1) DESTAQUES */}
      {fundadores && <Text style={s.secao}>Membros Fundadores</Text>}
      {destaques.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={s.linha} decelerationRate="fast" snapToInterval={larguraCard + 10} snapToAlignment="start">
          {destaques.map((l, idx) => {
            const com = comunicacao[l.id];
            // O banner é genérico: mostra a CHAMADA (editável pelo local e pela equipe), não o nome. Tocar abre o local.
            // Sem chamada escrita ainda, usa um convite neutro com o tipo e o bairro.
            const lugar = l.bairro_exibicao || l.bairro;
            const chamada = com?.headline || com?.oferta || `Conheça ${l.subcategoria ? `um(a) ${String(l.subcategoria).toLowerCase()}` : 'um lugar especial'}${lugar ? ` em ${lugar}` : ''}`;
            const frase = fundadores ? [com?.texto, l.subcategoria, lugar].find(Boolean) || '' : '';
            return (
              <TouchableOpacity
                key={l.id}
                activeOpacity={0.9}
                style={[s.cardDestaque, { width: larguraCard, height: fundadores ? 150 : 108 }]}
                onPress={() => {
                  registrarVitrine(l.id, `destaques:${slug}`, 'clique');
                  if (com?.destino) abrirDestino(router, com.destino);
                  else router.push(`/business/${l.id}` as any);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${chamada}. ${com?.cta || 'Conhecer'}`}
              >
                <FundoCaixaDegrade id={`dg-${slug}-${l.id}`} cores={DEGRADES_DESTAQUE[(idx + slot) % DEGRADES_DESTAQUE.length]} />
                {fundadores && (
                  <View style={s.selo}>
                    <Feather name="star" size={11} color="#1A1405" />
                    <Text style={s.seloTxt}>MEMBRO FUNDADOR</Text>
                  </View>
                )}
                <View style={s.rodapeCard}>
                  {fundadores && <Text style={s.frase} numberOfLines={1}>{formatarNome(l.nome)}</Text>}
                  <Text style={s.nome} numberOfLines={3}>{chamada}</Text>
                  {!!frase && fundadores && <Text style={s.frase} numberOfLines={2}>{frase}</Text>}
                  {!!com?.oferta && !!com?.headline && (
                    <View style={s.ofertaPilula}>
                      <Feather name="tag" size={11} color="#FFF" />
                      <Text style={s.ofertaTxt} numberOfLines={1}>{com.oferta}</Text>
                    </View>
                  )}
                  <View style={s.ctaPilula}>
                    <Text style={s.ctaTxt}>{com?.cta || 'Conhecer'}</Text>
                    <Feather name="arrow-right" size={13} color="#FFF" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <TouchableOpacity style={s.vazioCard} activeOpacity={0.85} onPress={() => Linking.openURL(URL_PARCEIRO).catch(() => {})} accessibilityRole="button">
          <FundoCaixaDegrade id={`vz-${slug}`} cores={['#2B2540', '#171421']} />
          <Feather name="star" size={22} color={C.gold} />
          <View style={{ flex: 1 }}>
            <Text style={s.vazioTitulo}>Seu negócio aqui</Text>
            <Text style={s.vazioSub}>Negócios parceiros aparecem aqui, girando a cada hora. Quer aparecer? Conheça os planos.</Text>
          </View>
          <Feather name="chevron-right" size={18} color={C.dim} />
        </TouchableOpacity>
      )}

      {/* 2) OFERTAS — logo abaixo do banner de destaque. Só planos Intermediário, Premium e Fundador.
          Quadradinhos pequenos que passam de lado; não mostram o local (só ao tocar), como no Mercado Livre. */}
      <View style={{ marginTop: 12 }}>
        {ofertasHora.length > 0 ? (
          <ScrollView ref={refOfertas} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={s.linhaOfertas} onScrollBeginDrag={() => { pausaAte.current = Date.now() + 8000; }} onMomentumScrollEnd={(e) => { posOferta.current = Math.round(e.nativeEvent.contentOffset.x / (LARG_OFERTA + 8)); }}>
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
                <Text style={s.ofertaTitulo} numberOfLines={4}>{o.titulo}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={s.vazioOfertas}>
            <Feather name="gift" size={14} color={C.pink} />
            <Text style={s.vazioOfertasTxt}>Ofertas chegando — cupons dos negócios desta categoria passam aqui.</Text>
          </View>
        )}
      </View>

      {/* 3) PATROCÍNIO DA CATEGORIA (banner fixo) */}
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
          <Text style={s.patrocTag}>{patrocinio.tag}</Text>
          <View style={{ gap: 4 }}>
            <Text style={s.patrocTitulo} numberOfLines={2}>{patrocinio.titulo}</Text>
            {!!patrocinio.subtitulo && <Text style={s.patrocSub} numberOfLines={4}>{patrocinio.subtitulo}</Text>}
            <View style={s.patrocCta}>
              <Text style={s.patrocCtaTxt}>{patrocinio.cta}</Text>
              <Feather name="arrow-right" size={13} color="#FFF" />
            </View>
          </View>
        </TouchableOpacity>
      )}
      {bannerPatr && (
        <View style={{ marginTop: 14, marginHorizontal: -16 }}>
          <CarrosselAnuncios anuncios={[bannerPatr]} />
        </View>
      )}

      {!!aposPatrocinio && <View style={{ marginTop: 12, marginHorizontal: -16 }}>{aposPatrocinio}</View>}

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
  patroc: { marginTop: 14, minHeight: 168, borderRadius: 18, overflow: 'hidden', padding: 14, justifyContent: 'space-between', backgroundColor: C.card },
  patrocVeu: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,16,0.45)' },
  patrocTag: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.8 },
  patrocTitulo: { fontSize: 22, fontWeight: '900', color: '#FFF', lineHeight: 26 },
  patrocSub: { fontSize: 12, color: 'rgba(255,255,255,0.92)', lineHeight: 16 },
  patrocCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 4 },
  patrocCtaTxt: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  linhaOfertas: { gap: 8, paddingHorizontal: 16 },
  cardOferta: { width: LARG_OFERTA, height: 56, borderRadius: 10, overflow: 'hidden', padding: 5, justifyContent: 'center' },
  ofertaTitulo: { fontSize: 10, fontWeight: '800', color: '#FFF', lineHeight: 12 },
  ofertaAte: { position: 'absolute', right: 6, top: 5, fontSize: 8, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  vazioOfertas: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  vazioOfertasTxt: { flex: 1, fontSize: 11, color: C.dim },
});
