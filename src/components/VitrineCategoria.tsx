// Estrutura padrão do topo de TODA categoria (out/2026), igual em todas as abas — previsível:
//   1) DESTAQUES  — locais pagos/fundadores girando por hora (o desejo de comunicar mora aqui)
//   2) PATROCÍNIO — banner fixo da categoria (editável no /admin e no portal do patrocinador)
//   3) OFERTAS E BENEFÍCIOS — cupons dos parceiros da categoria, girando por hora
// Cada bloco mede exibições e toques (vitrine_eventos) para a equipe comercial mostrar resultado.
import { estiloDoCartao } from '../lib/estiloBanner';
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
  VagasCategoria,
  ateData,
  buscarComunicacao,
  buscarVagas,
  buscarOfertas,
  buscarPatrocinio,
  buscarSubcategoriasDesligadas,
  registrarVitrine,
} from '../lib/vitrine';
import CarrosselAnuncios, { Anuncio } from './CarrosselAnuncios';
import { useAnunciosApp } from '../lib/banners';
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
// Faixa de cupons (regra out/2026): 24 posições por categoria.
//   10 Premium + 2 Fundador (12 posições)  e  12 Intermediário (os 24 Intermediários se alternam, 12 por hora).
//   Cada tela mostra 6 quadradinhos = 3 do grupo Premium/Fundador + 3 do grupo Intermediário, o grupo Premium/Fundador avança a cada 10 min e o Intermediário a cada 30 min.
//   Os 2 cupons de Fundador trocam a cada 10 min entre todos os Fundadores da categoria.
//   Vagas do admin (vitrine_vaga, tipo intermediario): 1–10 = cupom Premium, 11–12 = cupom Fundador, 13–24 = cupom Intermediário.
// Na categoria Destaques (fundadores) continua: Intermediário, Fundador e ofertas da equipe.
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
const COM_GRUPO = 3; // por vez: 3 do grupo Premium/Fundador + 3 do grupo Intermediário
const SLOTS_PREMIUM = 10;
const SLOTS_FUNDADOR = 2;
const SLOTS_INTERMEDIARIO = 12;
type SlotOferta = { oferta?: OfertaVitrine; rotulo: string };
const ativoPlano = (o: OfertaVitrine) => (o.plano_comercial_status ?? 'ativo') === 'ativo';
// Um cupom por local (o mais recente); cupons da equipe ficam todos.
function umPorLocal(lista: OfertaVitrine[]): OfertaVitrine[] {
  const vistos = new Set<string>();
  const out: OfertaVitrine[] = [];
  for (const o of lista.slice().sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''))) {
    if (o.equipe) { out.push(o); continue; }
    if (vistos.has(o.local_id)) continue;
    vistos.add(o.local_id);
    out.push(o);
  }
  return out;
}
// Janela circular de `qtd` itens começando em `inicio` (sem repetir).
function janela<T>(lista: T[], inicio: number, qtd: number): T[] {
  if (lista.length <= qtd) return lista.slice();
  const ini = ((inicio % lista.length) + lista.length) % lista.length;
  return Array.from({ length: qtd }, (_, k) => lista[(ini + k) % lista.length]);
}
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
  const slotOferta = useSlotHora(360); // Destaques (Fundadores): a faixa troca a cada 6 horas
  const slot10 = useSlotHora(10); // cupons Premium/Fundador: a faixa avança a cada 10 minutos
  const slot30 = useSlotHora(30); // cupons Intermediário: a faixa avança a cada 30 minutos
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
  // Vagas manuais do admin (vitrine_vaga): o local escolhido ocupa a posição escolhida; o resto é preenchido pelo plano.
  const [vagas, setVagas] = useState<VagasCategoria>({ premium: {}, intermediario: {} });
  // Chaves liga/desliga do portal admin (aba Categorias): '__banner' esconde o banner rotativo, '__cupons' esconde os cupons desta página.
  const [secoesOff, setSecoesOff] = useState<Set<string>>(new Set());
  useEffect(() => {
    let vivo = true;
    buscarSubcategoriasDesligadas(slug).then((x) => { if (vivo) setSecoesOff(x); });
    return () => { vivo = false; };
  }, [slug]);
  useEffect(() => {
    let vivo = true;
    buscarVagas(slug).then((v) => { if (vivo) setVagas(v); });
    return () => { vivo = false; };
  }, [slug]);
  const pool = useMemo(() => {
    const base = fundadores ? locais : locais.filter((l) => deveExibirGlow(l as any) || pagaPlanoComDireitoADestaque(l as any));
    // Banner em degradê, sem foto: não exige imagem do local.
    const auto = base.slice().sort((a, b) => a.id.localeCompare(b.id));
    const marcados = new Set(Object.values(vagas.premium));
    const livres = auto.filter((l) => !marcados.has(l.id));
    const slots: (LocalVitrine | undefined)[] = [];
    for (let n = 1; n <= 12; n++) {
      const idMarcado = vagas.premium[n];
      const doAdmin = idMarcado ? locais.find((l) => l.id === idMarcado) : undefined;
      slots.push(doAdmin ?? (idMarcado ? undefined : livres.shift()));
    }
    // Sem demonstração, vagas vazias saem da fila (o banner roda só com quem existe).
    return MODO_DEMONSTRACAO ? slots : (slots.filter(Boolean) as LocalVitrine[]);
  }, [locais, fundadores, vagas]);
  // 12 vagas de banner rotativo (Premium na categoria; Fundador em Destaques): 4 por vez, a janela avança a cada hora.
  // Em demonstração as vagas sem anunciante aparecem escritas ("Banner Premium Destaque 5 …") como se estivesse tudo cheio.
  const totalVagas = MODO_DEMONSTRACAO ? 12 : pool.length;
  // (em demonstração `pool` tem 12 posições; as sem anunciante ficam escritas)
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

  const slotsOferta = useMemo<SlotOferta[]>(() => {
    if (fundadores) {
      // Destaques: Intermediário + Fundador + equipe, 6 por vez a cada 6 horas (regra anterior).
      const posVaga = (o: OfertaVitrine) => { const e = Object.entries(vagas.intermediario).find(([, id]) => id === o.local_id); return e ? Number(e[0]) : 99; };
      const ord = ofertas.filter((o) => planoComOferta(o, true) || posVaga(o) < 99).sort((a, b) => posVaga(a) - posVaga(b) || (a.equipe ? 0 : 1) - (b.equipe ? 0 : 1) || a.id.localeCompare(b.id));
      const visBruto = ord.length === 0 ? [] : janela(ord, slotOferta * OFERTAS_POR_VEZ, OFERTAS_POR_VEZ);
      const vis = visBruto.filter((o, i) => visBruto.findIndex((p) => p.id === o.id) === i); // a janela gira em círculo: sem cupom repetido
      const out: SlotOferta[] = vis.map((o, i) => ({ oferta: o, rotulo: `Banner ${i + 1} Intermediário ${titulo}` }));
      if (MODO_DEMONSTRACAO) for (let n = out.length + 1; n <= OFERTAS_POR_VEZ; n++) out.push({ rotulo: `Banner ${n} Intermediário ${titulo}` });
      return out;
    }

    // Categorias: cupom por plano. Um cupom por local (o mais recente).
    const vagaLocal = (n: number) => vagas.intermediario[n];
    const todas = umPorLocal(ofertas.filter(ativoPlano));
    const doLocal = (id?: string) => (id ? todas.find((o) => o.local_id === id) : undefined);
    const fixos = new Set(Object.values(vagas.intermediario));
    const livres = (plano: string) => todas.filter((o) => !o.equipe && o.plano_comercial === plano && !fixos.has(o.local_id)).sort((a, b) => a.local_id.localeCompare(b.local_id));

    // Premium: 10 posições (vagas 1–10), fixas do admin primeiro, o resto pela ordem do plano.
    const premLivres = livres('premium');
    const premium: SlotOferta[] = [];
    for (let n = 1; n <= SLOTS_PREMIUM; n++) {
      const fx = vagaLocal(n);
      premium.push({ oferta: fx ? doLocal(fx) : premLivres.shift(), rotulo: `Cupom Premium ${n} ${titulo}` });
    }
    // Fundador: 2 posições (vagas 11–12); as livres trocam a cada 10 min entre todos os Fundadores.
    const fundLivres = livres('fundador');
    const fundador: SlotOferta[] = [];
    let k = 0;
    for (let n = 1; n <= SLOTS_FUNDADOR; n++) {
      const fx = vagaLocal(SLOTS_PREMIUM + n);
      let o = fx ? doLocal(fx) : undefined;
      if (!fx && fundLivres.length > 0) { o = fundLivres[(slot10 * SLOTS_FUNDADOR + k) % fundLivres.length]; k++; }
      fundador.push({ oferta: o, rotulo: `Cupom Fundador ${n} ${titulo}` });
    }
    // Intermediário: 12 posições (vagas 13–24); com mais de 12 Intermediários, metade a cada hora.
    const equipe = todas.filter((o) => o.equipe).sort((a, b) => a.id.localeCompare(b.id));
    const intLivres = [...equipe, ...livres('intermediario')];
    const fixosInt: (OfertaVitrine | undefined)[] = [];
    for (let n = 1; n <= SLOTS_INTERMEDIARIO; n++) { const fx = vagaLocal(SLOTS_PREMIUM + SLOTS_FUNDADOR + n); fixosInt.push(fx ? doLocal(fx) : undefined); }
    const vagasLivresInt = fixosInt.filter((x, i) => !vagaLocal(SLOTS_PREMIUM + SLOTS_FUNDADOR + i + 1)).length;
    const doRodizio = janela(intLivres, slot * vagasLivresInt, vagasLivresInt);
    const intermediario: SlotOferta[] = fixosInt.map((x, i) => {
      const fixa = !!vagaLocal(SLOTS_PREMIUM + SLOTS_FUNDADOR + i + 1);
      return { oferta: fixa ? x : doRodizio.shift(), rotulo: `Cupom Intermediário ${i + 1} ${titulo}` };
    });

    // Grupo A = Fundador + Premium (12); grupo B = Intermediário (12).
    const A = [...fundador, ...premium];
    const B = intermediario;
    const compacta = (l: SlotOferta[]) => (MODO_DEMONSTRACAO ? l : l.filter((x) => !!x.oferta));
    const a = compacta(A);
    const b = compacta(B);
    // Premium/Fundador giram a cada 10 min; Intermediário a cada 30 min (hierarquia preservada).
    let va = janela(a, slot10 * COM_GRUPO, COM_GRUPO);
    let vb = janela(b, slot30 * COM_GRUPO, COM_GRUPO);
    // Se um grupo tem menos de 3, o outro completa até 6.
    if (va.length < COM_GRUPO) vb = janela(b, slot30 * COM_GRUPO, OFERTAS_POR_VEZ - va.length);
    else if (vb.length < COM_GRUPO) va = janela(a, slot10 * COM_GRUPO, OFERTAS_POR_VEZ - vb.length);
    // A janela gira em círculo: com poucas ofertas o mesmo cupom pode voltar duas vezes na faixa. Mostra cada um só uma vez.
    const vistos = new Set<string>();
    return [...va, ...vb].filter((x) => {
      if (!x.oferta) return true;
      if (vistos.has(x.oferta.id)) return false;
      vistos.add(x.oferta.id);
      return true;
    });
  }, [ofertas, slotOferta, slot10, slot30, slot, fundadores, vagas, titulo]);
  const ofertasHora = useMemo(() => slotsOferta.map((x) => x.oferta).filter(Boolean) as OfertaVitrine[], [slotsOferta]);

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
    // Sem patrocinador/anunciante nesta página: NÃO mostra convite nem espaço vazio.
    // O banner só aparece quando há alguém nas vagas (escolhido em Posição no app / Categorias no portal admin).
    if (posicoes.length === 0) return [];
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
      // Rodada 141 — versão do banner só desta página (ex.: 'cat:bares'), quando o parceiro escolheu uma diferente.
      const vari = com?.variantes?.[`cat:${slug}`];
      const chamada = vari?.chamada || com?.headline || com?.oferta || `Conheça ${l.subcategoria ? `um(a) ${String(l.subcategoria).toLowerCase()}` : 'um lugar especial'}${lugar ? ` em ${lugar}` : ''}`;
      return {
        id: `dest-${l.id}`,
        chave: `dest-${l.id}`,
        // Rodada 137 — nas categorias, o banner não mostra a subcategoria (cortava e não ajudava); só em Destaques aparece o nome.
        tag: fundadores ? formatarNome(l.nome).toUpperCase() : '',
        titulo: chamada,
        cta: vari?.cta || com?.cta || 'Conhecer',
        // Rodada 140 — estilo escolhido no portal: degradê, foto (direita/esquerda/fundo), cor dos dizeres e palavra de impacto.
        ...estiloDoCartao(vari?.chamada ? vari : com, cor),
        icone: fundadores ? 'star' : 'map-pin',
        cor: estiloDoCartao(vari?.chamada ? vari : com, cor).degrade[0],
        onPress: () => {
          registrarVitrine(l.id, `destaques:${slug}`, 'clique');
          if (com?.destino) abrirDestino(router, com.destino);
          else router.push(`/business/${l.id}` as any);
        },
      };
    });
  }, [posicoes, pool, comunicacao, fundadores, slot, slug, titulo, router]);
  // Rodada 139 — banners de parceiros e campanhas (aba "Banners e parceiros" do /admin) marcados para esta categoria
  // entram no mesmo carrossel, depois dos banners de Fundador/Premium.
  const { anuncios: bannersParceiros, aoExibir: exibirParceiro } = useAnunciosApp(`cat:${slug}`);
  const bannersDaPagina = useMemo(() => [...anunciosRotativos, ...(bannersParceiros || [])], [anunciosRotativos, bannersParceiros]);


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
          {/* Rodada 138 — cartão mais leve, sem "agradecimento": título curto + logos dos Fundadores. */}
          <View style={s.agradeceCorpo}>
            <View style={s.agradecePilula}>
              <Feather name="star" size={10} color="#FFFFFF" />
              <Text style={s.agradecePilulaTxt}>MEMBROS FUNDADORES</Text>
            </View>
            <Text style={s.agradeceTitulo}>Quem abriu as portas primeiro</Text>
            <Text style={s.agradeceTexto}>Negócios que apostam na comunidade LGBT+ desde o começo.</Text>
            {locais.length > 0 && (
              <View style={s.agradeceLogos}>
                {locais.slice(0, 6).map((l, i) => {
                  const img = l.logo_url || l.foto_capa_url || l.galeria_fotos?.[0] || null;
                  return (
                    <View key={l.id} style={[s.agradeceLogo, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                      {img ? (
                        <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode={l.logo_url ? 'contain' : 'cover'} />
                      ) : (
                        <Text style={s.agradeceLogoTxt}>{formatarNome(l.nome).charAt(0)}</Text>
                      )}
                    </View>
                  );
                })}
                <Text style={s.agradeceQtd}>{locais.length === 1 ? '1 fundador' : `${locais.length} fundadores`}</Text>
              </View>
            )}
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
      {bannersDaPagina.length > 0 && !secoesOff.has('__banner') && (
        <View style={{ marginHorizontal: -16, marginBottom: -8 }}>
          <CarrosselAnuncios anuncios={bannersDaPagina} onExibir={(id) => { exibirParceiro(id); const l = destaques.find((x) => `dest-${x.id}` === id); if (l) registrarVitrine(l.id, `destaques:${slug}`, 'exibicao'); }} />
        </View>
      )}

      {!fundadores && (
        <>
      {/* 1b) SUBCATEGORIAS em ícones — entre o banner rotativo e as ofertas. */}
      {!!aposOfertas && <View style={{ marginTop: 8 }}>{aposOfertas}</View>}

      {/* 2) OFERTAS — logo abaixo dos ícones. Só planos Intermediário, Premium e Fundador.
          Quadradinhos pequenos que passam de lado; não mostram o local (só ao tocar), como no Mercado Livre. */}
      {!semOfertas && !secoesOff.has('__cupons') && (
      <View style={{ marginTop: 10 }}>
        {slotsOferta.length > 0 || MODO_DEMONSTRACAO ? (
          <View style={s.linhaOfertas}>
            {slotsOferta.map((sl, idx) => {
              const o = sl.oferta;
              if (!o) {
                if (!MODO_DEMONSTRACAO) return null;
                return (
                  <View key={`demo-${idx}`} style={s.cardOferta} accessibilityLabel={sl.rotulo}>
                    <FundoCaixaDegrade id={`ofd-${slug}-${idx}`} cores={DEGRADES_OFERTA[(idx + 1) % DEGRADES_OFERTA.length]} />
                    <Feather name="tag" size={20} color="#FFFFFF" />
                    <Text style={[s.ofertaTitulo, { fontSize: 11 }]} numberOfLines={3}>{sl.rotulo}</Text>
                  </View>
                );
              }
              return (
                <TouchableOpacity
                  key={`${o.id}-${idx}`}
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
              );
            })}
          </View>
        ) : null /* sem cupons: não mostra aviso "Ofertas chegando" */}
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
  agradeceCorpo: { padding: 16, gap: 6 },
  agradeceLogos: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  agradeceLogo: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#F4F1FA', alignItems: 'center', justifyContent: 'center' },
  agradeceLogoTxt: { fontSize: 13, fontWeight: '900', color: '#4C1D95' },
  agradeceQtd: { marginLeft: 10, fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.92)' },
  agradeceTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agradeceIcone: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  agradecePilula: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  agradecePilulaTxt: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6 },
  agradeceTitulo: { fontSize: 18, lineHeight: 23, fontWeight: '900', color: '#FFFFFF' },
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
