// Rodada 145 — aba Divulgar: tudo o que faz o local aparecer mais no app.
// Duas partes, cada uma com uma frase do que é:
//   Eventos  → aba Eventos do app (festas, agenda da semana, destaque no topo)
//   Vitrine  → onde o público esbarra na casa sem procurar (banner da Home/categoria, cupons)
// Mais o quadro "O que cada plano mostra no app" — sem preço nem botão de pagamento (regra Apple):
// para mudar de plano, a casa fala com a equipe pelo WhatsApp.
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, GradeItens, TelaParceiro, TituloSecao } from '../../../components/parceiro/TelaParceiro';
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
  const vitrine = itens.filter((i) => vitrineOrdem.includes(i.chave)).sort((a, b) => vitrineOrdem.indexOf(a.chave) - vitrineOrdem.indexOf(b.chave));
  const nivel = nivelDoPlano(localAtivo.plano_comercial); // plano efetivo (só conta pago com status ativo)
  const ehFesta = localAtivo.categoria === 'eventos';
  const dono = localAtivo.papel === 'dono';

  return (
    <TelaParceiro titulo="Divulgar" subtitulo="Faça sua casa aparecer mais no app.">
      {festas.length > 0 && (
        <>
          <TituloSecao
            texto={ehFesta ? 'Festas' : 'Eventos'}
            info="Aparece na aba Eventos do app, onde o público procura o que fazer hoje e na semana. Festa com Lista VIP já abre o pedido de nome na lista."
          />
          <GradeItens itens={festas} compacto />
          {/* Destaque não é outro cadastro: é ligar o destaque numa festa ou num dia da agenda já cadastrado.
              Premium/Fundador: 4 por mês, uma cota só para festas + agenda (migração 101). */}
          {dono && (minhasFestas || temAgenda) && (
            <TouchableOpacity
              style={d.destaque}
              activeOpacity={0.85}
              accessibilityRole="button"
              onPress={() =>
                st.destaques
                  ? abrirItem(
                      router,
                      {
                        ...(minhasFestas || itens.find((i) => i.chave === 'agenda')!),
                        aviso:
                          `Seu plano inclui 4 destaques por mês no topo de Eventos, para usar em festas ou na agenda da semana. Em ${MES()} você usou ${st.destaques.usadas}.\n\n` +
                          (minhasFestas ? 'Festa: Minhas festas › Destacar com o plano (fica no ar até a festa acabar).\n' : '') +
                          (temAgenda ? 'Agenda: destaque um dia (fica no ar até o fim do dia) ou o cartaz da semana (a semana toda). Chega junto com a nova tela da Agenda.' : ''),
                      },
                      localAtivo.nome,
                    )
                  : void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero destacar ${oQue === 'agenda' ? 'a minha agenda' : 'uma festa'} no topo de Eventos.`)
              }
            >
              <View style={d.destaqueIcone}><Feather name="zap" size={15} color="#FFFFFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={d.destaqueTitulo}>Destacar {oQue === 'festa ou agenda' ? 'festa ou agenda' : oQue === 'agenda' ? 'a agenda' : 'uma festa'}</Text>
                <Text style={d.destaqueSub}>
                  {st.destaques
                    ? `${st.destaques.usadas} de ${st.destaques.limite} destaques usados em ${MES()}`
                    : 'Topo de Eventos no dia e na véspera · fale com a equipe'}
                </Text>
              </View>
              {st.destaques && (
                <View style={d.contador}>
                  {Array.from({ length: st.destaques.limite }).map((_, k) => (
                    <View key={k} style={[d.bolinha, k < st.destaques!.usadas && d.bolinhaUsada]} />
                  ))}
                </View>
              )}
              <Feather name="chevron-right" size={18} color={CP.fraco} />
            </TouchableOpacity>
          )}
        </>
      )}

      {vitrine.length > 0 && (
        <>
          <TituloSecao
            texto="Vitrine do app"
            info="Onde o público vê a casa sem estar procurando: o banner na Home e no topo da categoria, e os cupons na página da casa e na busca."
          />
          <GradeItens itens={vitrine} compacto />
        </>
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

const d = StyleSheet.create({
  destaque: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, backgroundColor: '#C2185B1A',
    borderColor: '#C2185B55', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, minHeight: 60,
  },
  destaqueIcone: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#C2185B', alignItems: 'center', justifyContent: 'center' },
  destaqueTitulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  destaqueSub: { color: CP.dim, fontSize: 12, marginTop: 1 },
  contador: { flexDirection: 'row', gap: 4 },
  bolinha: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#FF6B9A' },
  bolinhaUsada: { backgroundColor: '#FF6B9A' },
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
