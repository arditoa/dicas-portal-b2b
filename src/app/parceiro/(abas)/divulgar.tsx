import React from 'react';
// Rodada 145 — aba Divulgar: tudo o que faz o local aparecer mais no app.
// Duas partes, cada uma com uma frase do que é:
//   Eventos  → aba Eventos do app (festas, agenda da semana, destaque no topo)
//   Vitrine  → onde o público esbarra na casa sem procurar (banner da Home/categoria, cupons)
// Mais o quadro "O que cada plano mostra no app" — sem preço nem botão de pagamento (regra Apple):
// para mudar de plano, a casa fala com a equipe pelo WhatsApp.
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, GradeItens, RAIO, TelaParceiro, TituloSecao } from '../../../components/parceiro/TelaParceiro';
import { falarComEquipe, itensDaAba, NivelPlano, nivelDoPlano, NOME_NIVEL } from '../../../lib/parceiroMenu';
import { useModoParceiro } from '../../../lib/modoParceiro';
import { comSituacao, useStatusDivulgar } from '../../../lib/statusDivulgar';
import { useRouter } from 'expo-router';
import { abrirItem } from '../../../lib/parceiroMenu';

type Linha = { titulo: string; onde: string; gratuito: string | boolean; intermediario: string | boolean; premium: string | boolean };
const QUADRO: Linha[] = [
  { titulo: 'Página da casa', onde: 'Busca, mapa e categoria', gratuito: true, intermediario: true, premium: true },
  { titulo: 'Festas e agenda', onde: 'Aba Eventos', gratuito: true, intermediario: true, premium: true },
  { titulo: 'Cupons', onde: 'Página da casa e busca', gratuito: false, intermediario: '1 a cada 14 dias', premium: '1 a cada 7 dias' },
  { titulo: 'Destaques', onde: 'Topo de Eventos · festa ou agenda', gratuito: 'Avulso', intermediario: 'Avulso', premium: '4 por mês' },
  { titulo: 'Banner', onde: 'Home e topo da categoria', gratuito: false, intermediario: false, premium: true },
  { titulo: 'Selo Fundador', onde: 'Membros Fundadores na Home', gratuito: false, intermediario: false, premium: 'Só Fundador' },
];
const MES = () => new Date().toLocaleDateString('pt-BR', { month: 'long' });
const COLUNAS: NivelPlano[] = ['gratuito', 'intermediario', 'premium'];
const CURTO: Record<NivelPlano, string> = { gratuito: 'Grátis', intermediario: 'Interm.', premium: 'Premium' };

export default function Divulgar() {
  const { localAtivo, pode } = useModoParceiro();
  const router = useRouter();
  const [verPlanos, setVerPlanos] = useState(false);
  const [verImagens, setVerImagens] = useState(false);
  const st = useStatusDivulgar(localAtivo, pode);
  if (!localAtivo) return null;
  const itens = comSituacao(itensDaAba('divulgar', localAtivo, pode), st);
  // "Nova festa" e "Minhas festas" viram um quadradinho só: a lista já começa com "+ Nova festa".
  // (O atalho "Nova festa" do Início continua indo direto para criar.)
  const ORDEM_FESTAS = ['agenda', 'eventos'];
  const festas = itens.filter((i) => ORDEM_FESTAS.includes(i.chave)).sort((a, b) => ORDEM_FESTAS.indexOf(a.chave) - ORDEM_FESTAS.indexOf(b.chave));
  const vitrineOrdem = ['cupons', 'banner'];
  const minhasFestas = itens.find((i) => i.chave === 'eventos');
  const temAgenda = itens.some((i) => i.chave === 'agenda');
  const oQue = temAgenda && minhasFestas ? 'festa ou agenda' : temAgenda ? 'agenda' : 'festa';
  const acaoMarca = itens.find((i) => i.chave === 'marcas');
  const vitrine = itens.filter((i) => vitrineOrdem.includes(i.chave)).sort((a, b) => vitrineOrdem.indexOf(a.chave) - vitrineOrdem.indexOf(b.chave));
  const nivel = nivelDoPlano(localAtivo.plano_comercial); // plano efetivo (só conta pago com status ativo)
  const ehFesta = localAtivo.categoria === 'eventos';
  const dono = localAtivo.papel === 'dono';

  return (
    <TelaParceiro titulo="Divulgar" subtitulo="Faça sua casa aparecer mais no app.">
      {/* Rodada 148 — tudo o que está visível no app, num lugar só */}
      <TouchableOpacity style={noAr.botao} onPress={() => router.push('/parceiro/no-ar' as any)} activeOpacity={0.85} accessibilityRole="button">
        <View style={noAr.icone}><Feather name="radio" size={16} color="#4CAF7D" /></View>
        <View style={{ flex: 1 }}>
          <Text style={noAr.tit}>No ar agora</Text>
          <Text style={noAr.sub}>Cupons, festas, agenda, banner e ação de marca</Text>
        </View>
        <Feather name="chevron-right" size={18} color="#626274" />
      </TouchableOpacity>
      {festas.length > 0 && (
        <>
          <TituloSecao
            texto={ehFesta ? 'Festas' : 'Eventos'}
            info="Aparece na aba Eventos do app, onde o público procura o que fazer hoje e na semana. Festa com Lista VIP já abre o pedido de nome na lista."
          />
          {/* 18/11: o destaque do plano fica dentro do próprio quadradinho (Agenda: 4 dias · Eventos: 1 por 7 dias). */}
          <GradeItens compacto itens={festas.map((i) =>
            dono && i.chave === 'agenda' && st.destaques ? { ...i, cota: { rotulo: `${st.destaques.limite} dias no mês`, usadas: st.destaques.usadas, limite: st.destaques.limite } }
            : dono && i.chave === 'eventos' && st.eventos ? { ...i, cota: { rotulo: `${st.eventos.limite} ${st.eventos.limite === 1 ? 'evento' : 'eventos'} · 7 dias`, usadas: st.eventos.usadas, limite: st.eventos.limite } }
            : i)} />
          {/* Destaque não é outro cadastro: é ligar o destaque numa festa ou num dia da agenda já cadastrado.
              Premium/Fundador: 4 por mês, uma cota só para festas + agenda (migração 101). */}
          {/* 18/11: dois cartões separados (antes "Destacar festa ou agenda" juntos confundia).
              Agenda da semana: 4 destaques por mês (Bares). Evento: 1 por mês, 7 dias no topo de Eventos (Festas: mais). */}
        </>
      )}

      {vitrine.length > 0 && (
        <>
          <TituloSecao
            texto="Sua casa no app"
            sub="Cupons no seu perfil · banner na Home e na categoria"
            info="Cupons aparecem na página da sua casa (o seu perfil no app) e na busca. O banner aparece na Home e no topo da sua categoria, para quem ainda não conhece a casa."
          />
          <GradeItens itens={vitrine} compacto />
        </>
      )}

      {/* Rodada 148 — Ação de marca: patrocínio de uma marca na casa, com selo "Apoio" no app e resultado medido. */}
      {acaoMarca && (
        <>
          <TituloSecao
            texto="Marcas"
            info="Quando uma marca patrocina algo na sua casa (happy hour, festa, drink), os cupons e festas ganham o selo Apoio no app e você vê quantas pessoas foram de verdade."
          />
          <TouchableOpacity style={d.marca} activeOpacity={0.85} accessibilityRole="button" onPress={() => abrirItem(router, acaoMarca, localAtivo.nome)}>
            <View style={d.marcaIcone}><Feather name="award" size={16} color="#1A1405" /></View>
            <View style={{ flex: 1 }}>
              <Text style={d.destaqueTitulo}>Ação de marca</Text>
              <Text style={d.destaqueSub}>Patrocínio com selo "Apoio" e resultado de quem foi</Text>
            </View>
            {acaoMarca.bloqueado ? <Feather name="lock" size={16} color={CP.fraco} /> : <Feather name="chevron-right" size={18} color={CP.fraco} />}
          </TouchableOpacity>
        </>
      )}

      {/* 18/11: guia das imagens — o que dá para personalizar e em que tamanho subir. Vem antes do quadro dos planos. */}
      <TouchableOpacity style={d.planoLinha} onPress={() => setVerImagens((v) => !v)} activeOpacity={0.85} accessibilityRole="button">
        <View style={[d.planoIcone, { backgroundColor: '#1E2A3A' }]}><Feather name="image" size={16} color="#5BB8F5" /></View>
        <View style={{ flex: 1 }}>
          <Text style={d.planoTitulo}>Imagens e personalização</Text>
          <Text style={d.planoSub}>Tamanho certo para subir e o que dá para mudar</Text>
        </View>
        <Feather name={verImagens ? 'chevron-up' : 'chevron-down'} size={18} color={CP.dim} />
      </TouchableOpacity>
      {verImagens && (
        <View style={d.guia}>
          {GUIA_IMAGENS.map((g, k) => (
            <View key={g.titulo}>
              {(k === 0 || GUIA_IMAGENS[k - 1].grupo !== g.grupo) && <Text style={[d.guiaGrupo, k > 0 && { marginTop: ESP.m }]}>{g.grupo}</Text>}
              <TouchableOpacity style={d.guiaLinha} onPress={() => router.push(g.rota as any)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${g.titulo}, ${g.tamanho} pixels. ${g.texto}`}>
                <Formato prop={g.prop} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <Text style={d.guiaTitulo} numberOfLines={1}>{g.titulo}</Text>
                    <Text style={d.guiaTamTxt}>{g.tamanho} px</Text>
                  </View>
                  <Text style={d.guiaTexto}>{g.texto}</Text>
                  <Text style={d.guiaOnde}>{g.onde}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={CP.fraco} />
              </TouchableOpacity>
            </View>
          ))}
          <Text style={d.guiaRodape}>JPG ou PNG. Foto maior tudo bem: o app recorta e comprime. Evite texto escrito na foto.</Text>
        </View>
      )}

      {/* Planos: uma linha; o quadro completo abre só se a pessoa quiser */}
      <TouchableOpacity style={d.planoLinha} onPress={() => setVerPlanos((v) => !v)} activeOpacity={0.85} accessibilityRole="button">
        <View style={d.planoIcone}><Feather name="layers" size={16} color={CP.rosa} /></View>
        <View style={{ flex: 1 }}>
          <Text style={d.planoTitulo}>O que cada plano mostra</Text>
          <Text style={d.planoSub}>Seu plano: {NOME_NIVEL[nivel]}</Text>
        </View>
        <Feather name={verPlanos ? 'chevron-up' : 'chevron-down'} size={18} color={CP.dim} />
      </TouchableOpacity>

      {verPlanos && (
        <>
          <View style={d.quadro}>
            <View style={[d.qLinha, d.qCab]}>
              <View style={d.qItem}><Text style={d.qCabTxt}>No app</Text></View>
              {COLUNAS.map((c) => (
                <View key={c} style={[d.qCel, c === nivel && d.qAtual]}>
                  <Text style={[d.qCabTxt, c === nivel && { color: CP.rosa }]}>{CURTO[c]}</Text>
                </View>
              ))}
            </View>
            {QUADRO.map((l) => (
              <View key={l.titulo} style={[d.qLinha, d.qBorda]}>
                <View style={d.qItem}>
                  <Text style={d.qTitulo}>{l.titulo}</Text>
                  <Text style={d.qOnde}>{l.onde}</Text>
                </View>
                {COLUNAS.map((c) => (
                  <View key={c} style={[d.qCel, c === nivel && d.qAtual]}>
                    <Valor v={l[c]} />
                  </View>
                ))}
              </View>
            ))}
          </View>
          {dono && nivel !== 'premium' && (
            <TouchableOpacity
              style={d.botao}
              onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero aparecer mais no app (banner, cupons e festas em destaque).`)}
              accessibilityRole="button"
            >
              <Feather name="message-circle" size={16} color="#FFFFFF" />
              <Text style={d.botaoTxt}>Quero aparecer mais</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </TelaParceiro>
  );
}

function Valor({ v }: { v: string | boolean }) {
  if (v === true) return <Feather name="check" size={16} color={CP.verde} />;
  if (v === false) return <Feather name="lock" size={13} color={CP.fraco} />;
  return <Text style={d.qTexto}>{v}</Text>;
}

// 18/11: cartão de destaque (agenda ou evento), lado a lado, com as bolinhas da cota do mês.
function CartaoDestaque({ titulo, sub, usadas, limite, onPress }: { titulo: string; sub: string; usadas?: number; limite?: number; onPress: () => void }) {
  const tem = typeof limite === 'number' && limite > 0;
  const u = Math.min(usadas || 0, limite || 0);
  const livres = tem ? limite! - u : 0;
  return (
    <TouchableOpacity style={d.destaqueCartao} activeOpacity={0.85} accessibilityRole="button" onPress={onPress}
      accessibilityLabel={`${titulo}. ${sub}${tem ? `. ${livres} livres` : ''}`}>
      <View style={d.destaqueTopo}>
        <View style={d.destaqueIcone}><Feather name="zap" size={15} color="#FFFFFF" /></View>
        <Feather name="chevron-right" size={16} color={CP.fraco} />
      </View>
      <Text style={d.destaqueTitulo} numberOfLines={1}>{titulo}</Text>
      <Text style={d.destaqueSub} numberOfLines={1}>{sub}</Text>
      {tem && (
        <View style={d.destaqueRodape}>
          <View style={d.contador}>
            {Array.from({ length: limite! }).map((_, k) => (
              <View key={k} style={[d.bolinha, k < u && d.bolinhaUsada]} />
            ))}
          </View>
          <Text style={[d.destaqueLivres, livres === 0 && { color: CP.fraco }]}>{livres === 0 ? 'Usado no mês' : `${livres} ${livres === 1 ? 'livre' : 'livres'}`}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// 18/11: guia de imagens do parceiro (tamanhos recomendados conforme o espaço que cada uma ocupa no app).
const GUIA_IMAGENS: { grupo: string; titulo: string; tamanho: string; prop: [number, number]; texto: string; onde: string; rota: string }[] = [
  { grupo: 'Sua página', titulo: 'Logo', tamanho: '500 × 500', prop: [1, 1], texto: 'Quadrado, fundo liso.', onde: 'Mapa, lista e topo da página', rota: '/parceiro/pagina' },
  { grupo: 'Sua página', titulo: 'Foto de capa', tamanho: '1200 × 600', prop: [2, 1], texto: 'Horizontal, o principal no centro.', onde: 'Fundo do topo da página', rota: '/parceiro/pagina' },
  { grupo: 'Divulgação', titulo: 'Banner', tamanho: '1200 × 450', prop: [8, 3], texto: 'Monte no app (cor, textura, frase e botão) ou use foto sem texto.', onde: 'Home e topo da categoria · Premium e Fundador', rota: '/parceiro/banner' },
  { grupo: 'Divulgação', titulo: 'Flyer da festa', tamanho: '1080 × 1080', prop: [1, 1], texto: 'Quadrado. Cor e textura do cartão no app.', onde: 'Aba Eventos e página da festa', rota: '/parceiro/festas' },
  { grupo: 'Divulgação', titulo: 'Cartaz da semana', tamanho: '1080 × 1350', prop: [4, 5], texto: 'Em pé, igual post do Instagram.', onde: 'Eventos › Essa semana', rota: '/parceiro/agenda' },
  { grupo: 'Divulgação', titulo: 'Cupom', tamanho: '1080 × 1080', prop: [1, 1], texto: 'Cor do app ou foto (ganha véu escuro).', onde: 'Sua página e faixa de cupons', rota: '/parceiro/cupons' },
];
// Desenho do formato (proporção) num quadrinho de 36 px.
function Formato({ prop }: { prop: [number, number] }) {
  const [w, h] = prop;
  const max = 30;
  const lw = w >= h ? max : Math.round((max * w) / h);
  const lh = h >= w ? max : Math.round((max * h) / w);
  return (
    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#2A2938', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: lw, height: lh, borderRadius: 3, borderWidth: 1.5, borderColor: '#5BB8F5', backgroundColor: '#5BB8F51F' }} />
    </View>
  );
}

const d = StyleSheet.create({
  vitrineSub: { color: CP.dim, fontSize: 12, marginTop: -ESP.xs, marginBottom: ESP.s },
  marca: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, backgroundColor: CP.card, borderColor: '#F2C94C55', borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, minHeight: 64 },
  marcaIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F2C94C', alignItems: 'center', justifyContent: 'center' },
  destaque: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, backgroundColor: '#C2185B1A',
    borderColor: '#C2185B55', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, minHeight: 60,
  },
  destaqueIcone: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#C2185B', alignItems: 'center', justifyContent: 'center' },
  planoRotulo: { color: CP.secao, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: ESP.s, marginBottom: ESP.s },
  destaquesLinha: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.s },
  destaqueCartao: {
    flex: 1, backgroundColor: '#C2185B14', borderColor: '#C2185B44', borderWidth: 1, borderRadius: RAIO.m,
    paddingHorizontal: ESP.m, paddingVertical: ESP.m, gap: 4,
  },
  destaqueTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  destaqueRodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  destaqueLivres: { color: CP.rosa, fontSize: 11, fontWeight: '800' },
  destaqueTitulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  destaqueSub: { color: CP.dim, fontSize: 12, marginTop: 1 },
  contador: { flexDirection: 'row', gap: 4 },
  bolinha: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#FF6B9A' },
  bolinhaUsada: { backgroundColor: '#FF6B9A' },
  guia: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, paddingHorizontal: ESP.m, paddingVertical: ESP.xs, marginTop: ESP.s, marginBottom: ESP.s },
  guiaLinha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, paddingVertical: ESP.s + 2 },
  guiaGrupo: { color: CP.secao, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginTop: ESP.s, marginBottom: 2 },
  guiaIcone: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#2A2938', alignItems: 'center', justifyContent: 'center' },
  guiaTitulo: { color: CP.texto, fontSize: 13, fontWeight: '800' },
  guiaTam: { backgroundColor: '#5BB8F51F', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  guiaTamTxt: { color: '#5BB8F5', fontSize: 12, fontWeight: '800' },
  guiaTexto: { color: CP.dim, fontSize: 12, lineHeight: 17, marginTop: 2 },
  guiaOnde: { color: CP.fraco, fontSize: 11, lineHeight: 15, marginTop: 2 },
  guiaRodape: { color: CP.fraco, fontSize: 11, lineHeight: 16, paddingVertical: ESP.m, marginTop: ESP.xs, borderTopWidth: 1, borderTopColor: CP.borda },
  planoLinha: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, backgroundColor: CP.card,
    borderColor: CP.borda, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, minHeight: 60,
  },
  planoIcone: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#2A1420', alignItems: 'center', justifyContent: 'center' },
  planoTitulo: { color: CP.texto, fontSize: 14, fontWeight: '700' },
  planoSub: { color: CP.dim, fontSize: 12, marginTop: 1 },
  quadro: { marginTop: 8, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  qLinha: { flexDirection: 'row', alignItems: 'stretch', minHeight: 48 },
  qBorda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  qCab: { minHeight: 34, backgroundColor: '#1C1B28' },
  qCabTxt: { color: CP.secao, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  qItem: { flex: 1.6, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  qCel: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  qAtual: { backgroundColor: '#E1306C14' },
  qTitulo: { color: CP.texto, fontSize: 13, fontWeight: '700' },
  qOnde: { color: CP.fraco, fontSize: 11, marginTop: 1 },
  qTexto: { color: CP.texto, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  botao: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CP.verde,
    borderRadius: 14, minHeight: 48, marginTop: 12,
  },
  botaoTxt: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

// Rodada 148 — atalho "No ar agora"
const noAr = StyleSheet.create({
  botao: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#161520', borderColor: '#4CAF7D44', borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 8 },
  icone: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#4CAF7D1F', alignItems: 'center', justifyContent: 'center' },
  tit: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  sub: { color: '#A0A0B2', fontSize: 12, marginTop: 1 },
});
