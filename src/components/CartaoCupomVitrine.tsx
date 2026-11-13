// Cartão do cupom na faixa de Ofertas da categoria ("um cupom, dois lugares", migração 109).
// Usado pela VitrineCategoria (app cliente) e pela prévia do editor de cupom do Modo parceiro: é o MESMO desenho.
//   • Sem aparência: automático (partesCupom tira oferta e detalhe do título; degradê magenta → azul do logo).
//   • Com aparência: oferta em destaque (24), detalhe (30), fundo em degradê do app ou foto com véu escuro, cor dos dizeres.
// A regra do cupom (nome, regra, dias, horário, validade, limite do plano) é a mesma da página da casa.
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import FundoCaixaDegrade from './FundoCaixaDegrade';

// Design nov/2026 — cupons no degradê do logo (magenta → roxo → azul).
export const DEGRADE_CUPOM: [string, string] = ['#E0197D', '#3D3BEF'];
const HEX = /^#[0-9A-Fa-f]{6}$/;

export type AparenciaCupom = {
  vitrine_oferta?: string | null;
  vitrine_detalhe?: string | null;
  vitrine_foto_url?: string | null;
  vitrine_estilo?: string | null; // 'degrade' | 'foto'
  vitrine_cor1?: string | null;
  vitrine_cor2?: string | null;
  vitrine_cor_texto?: string | null;
};

// "Drink em dobro até as 19:00" → oferta "DRINK EM DOBRO" + detalhe "Até as 19:00" (menor e sem negrito).
export function partesCupom(o: { titulo: string; descricao: string | null; valido_ate: string | null }): { oferta: string; detalhe: string } {
  const t = (o.titulo || '').trim();
  const m = t.match(/^(.+?)\s+((?:at[eé]|v[aá]lido|das|a partir)\s.+)$/i);
  if (m) return { oferta: m[1], detalhe: m[2].charAt(0).toUpperCase() + m[2].slice(1) };
  const desc = (o.descricao || '').trim();
  if (desc && desc.length <= 40) return { oferta: t, detalhe: desc };
  if (o.valido_ate) {
    const d = new Date(o.valido_ate);
    // Dia no fuso de Brasília (o app grava 23h59 -03:00; em UTC isso já é o dia seguinte).
    if (!isNaN(d.getTime())) return { oferta: t, detalhe: `Válido até ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}` };
  }
  return { oferta: t, detalhe: '' };
}

export const temAparencia = (a: AparenciaCupom) => !!(a.vitrine_oferta || '').trim();

export function CorpoCupomVitrine({ id, cupom, nomeLocal }: {
  id: string;
  cupom: { titulo: string; descricao: string | null; valido_ate: string | null } & AparenciaCupom;
  nomeLocal: string;
}) {
  const proprio = temAparencia(cupom);
  const auto = partesCupom(cupom);
  const oferta = proprio ? (cupom.vitrine_oferta || '').trim() : auto.oferta;
  const detalhe = proprio ? (cupom.vitrine_detalhe || '').trim() : auto.detalhe;
  const comFoto = proprio && cupom.vitrine_estilo === 'foto' && !!cupom.vitrine_foto_url;
  const cores: [string, string] = proprio && HEX.test(cupom.vitrine_cor1 || '') && HEX.test(cupom.vitrine_cor2 || '') ? [cupom.vitrine_cor1!, cupom.vitrine_cor2!] : DEGRADE_CUPOM;
  const corTexto = proprio && HEX.test(cupom.vitrine_cor_texto || '') ? cupom.vitrine_cor_texto! : '#FFFFFF';
  return (
    <>
      <FundoCaixaDegrade id={id} cores={cores} />
      {comFoto ? (
        <>
          <Image source={{ uri: cupom.vitrine_foto_url! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,6,20,0.45)' }]} />
        </>
      ) : (
        <MaterialCommunityIcons name="ticket-percent-outline" size={78} color="rgba(255,255,255,0.28)" style={s.cupomIcone} />
      )}
      <View style={s.cupomLocal}>
        <Feather name="map-pin" size={9} color="#FFFFFF" />
        <Text style={s.cupomLocalTxt} numberOfLines={1}>{nomeLocal}</Text>
      </View>
      <Text style={[s.cupomOferta, { color: corTexto }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{(oferta || 'Sua oferta').toLocaleUpperCase('pt-BR')}</Text>
      {!!detalhe && <Text style={[s.cupomDetalhe, { color: corTexto, opacity: 0.9 }]} numberOfLines={1}>{detalhe}</Text>}
    </>
  );
}

// Para a prévia: o cartão com a mesma caixa da faixa.
export function CartaoCupomVitrine(props: Parameters<typeof CorpoCupomVitrine>[0]) {
  return <View style={estiloCartaoOferta}><CorpoCupomVitrine {...props} /></View>;
}

const s = StyleSheet.create({
  cupomIcone: { position: 'absolute', right: -10, bottom: -8, transform: [{ rotate: '-14deg' }] },
  cupomLocal: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.24)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  cupomLocalTxt: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  cupomOferta: { fontSize: 17, lineHeight: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.2, paddingRight: 18 },
  cupomDetalhe: { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.9)', marginTop: 5 },
});
export const estiloCartaoOferta = { width: 176, height: 116, borderRadius: 16, overflow: 'hidden' as const, padding: 12, justifyContent: 'flex-start' as const, backgroundColor: '#161520', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' };
