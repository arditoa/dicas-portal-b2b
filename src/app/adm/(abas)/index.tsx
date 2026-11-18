// Modo equipe · Início: a caixa de entrada do dia (o que espera a equipe) e os números do app.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../../components/adm/TelaAdm';
import AvisosNoCelular from '../../../components/AvisosNoCelular';
import { reaisAdm } from '../../../lib/admin';
import { supabase } from '../../../lib/supabase';

type Resumo = {
  pendencias: { casas: number; festas: number; acoes_marca: number; fotos_marca: number; planos_interesse: number };
  numeros: { usuarios: number; usuarios_7d: number; casas_no_ar: number; checkins_hoje: number; presencas_marca_hoje: number; ingressos_hoje: number;
    taxa_ingressos_hoje_centavos: number; taxa_ingressos_mes_centavos: number; enquetes_hoje: number };
  planos: Record<string, number>;
};
type Lembrete = { chave: string; local_id: string; casa: string; telefone: string | null; titulo: string; corpo: string; avisado_em: string | null };

// WhatsApp com 1 toque: api.whatsapp.com mantém os emojis (wa.me às vezes quebra). Número brasileiro ganha o 55.
function linkWhats(tel: string, texto: string) {
  let n = tel.replace(/\D/g, '');
  if (n.length === 10 || n.length === 11) n = '55' + n;
  return `https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(texto)}`;
}

const NOME_PLANO: Record<string, string> = { freemium: 'Gratuito', starter: 'Starter', intermediario: 'Intermediário', premium: 'Premium', fundador: 'Fundador' };

export default function InicioAdm() {
  const router = useRouter();
  const [r, setR] = useState<Resumo | null>(null);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  // Alertas para o dia a dia: banners que vencem logo e festas da semana sem flyer.
  const [vencendo, setVencendo] = useState(0);
  const [semFlyer, setSemFlyer] = useState(0);
  const [denuncias, setDenuncias] = useState(0);
  // Lembretes automáticos das casas (migração 135): a equipe vê os mesmos que vão no celular da casa.
  const [lembretes, setLembretes] = useState<Lembrete[] | null>(null);
  const [verTodos, setVerTodos] = useState(false);
  const [enviandoResumo, setEnviandoResumo] = useState(false);

  const carregar = useCallback(async () => {
    const agora = new Date();
    const [v, f] = await Promise.all([
      supabase.from('banners_app').select('id', { count: 'exact', head: true }).eq('ativo', true)
        .gte('fim', agora.toISOString()).lte('fim', new Date(agora.getTime() + 3 * 864e5).toISOString()),
      supabase.from('eventos').select('id', { count: 'exact', head: true }).eq('status', 'aprovado').is('foto_capa_url', null)
        .gte('data_inicio', agora.toISOString()).lte('data_inicio', new Date(agora.getTime() + 7 * 864e5).toISOString()),
    ]);
    setVencendo(v.count || 0);
    setSemFlyer(f.count || 0);
    // 141 — denúncias novas esperando a equipe
    const dn = await supabase.from('ocorrencias').select('id', { count: 'exact', head: true }).eq('status', 'recebida');
    setDenuncias(dn.count || 0);
    const lb = await supabase.rpc('admin_lembretes_casas');
    setLembretes(lb.error ? null : ((lb.data as Lembrete[]) || []));
    const { data, error } = await supabase.rpc('admin_resumo');
    if (error) setErro(error.message.includes('Could not find') ? 'Rode a migração 133 no Supabase para ver o resumo.' : `O resumo deu erro (rode a migração 150): ${error.message}`);
    else { setErro(''); setR(data as Resumo); }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const enviarResumoAgora = async () => {
    setEnviandoResumo(true);
    const { data, error } = await supabase.rpc('admin_enviar_resumo_agora');
    setEnviandoResumo(false);
    if (error) Alert.alert('Não deu', error.message.includes('admin_enviar_resumo_agora') ? 'Rode a migração 135 no Supabase.' : error.message);
    else Alert.alert('Resumo enviado', Number(data) > 0 ? `Foi para ${data} aparelho(s) da equipe.` : 'Nenhum celular da equipe está com notificações ligadas. Ligue em Conta › Notificações.');
  };

  const cobrar = (l: Lembrete) => {
    if (!l.telefone) { Alert.alert('Sem telefone', `${l.casa} não tem telefone de contato cadastrado.`); return; }
    const texto = `Oi, ${l.casa}! Aqui é a equipe Dicas LGBT+ 🌈\n\n${l.titulo}: ${l.corpo}\n\nQualquer dúvida é só chamar.`;
    void Linking.openURL(linkWhats(l.telefone, texto));
  };

  const p = r?.pendencias;
  const itens = p ? [
    { n: denuncias, txt: 'denúncias novas para analisar', icone: 'alert-octagon', ir: '/adm/denuncias' },
    { n: p.casas, txt: 'casas esperando aprovação', icone: 'map-pin', ir: '/adm/aprovar' },
    { n: p.festas, txt: 'festas esperando aprovação', icone: 'music', ir: '/adm/aprovar' },
    { n: p.acoes_marca, txt: 'ações de marca para liberar', icone: 'award', ir: '/adm/acoes' },
    { n: p.planos_interesse, txt: 'casas querendo plano pago', icone: 'trending-up', ir: '/adm/locais?plano=interesse' },
    { n: p.fotos_marca, txt: 'fotos enviadas para as casas (7 dias)', icone: 'camera', ir: null },
    { n: vencendo, txt: 'banners vencem em até 3 dias', icone: 'clock', ir: '/adm/banners' },
    { n: semFlyer, txt: 'festas da semana sem flyer', icone: 'image', ir: null },
  ].filter((x) => x.n > 0) : [];

  return (
    <TelaAdm titulo="Bom dia, equipe" subtitulo="O que espera vocês hoje e como o app está indo." atualizando={atualizando}
      aoAtualizar={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }}>
      {!!erro && <Text style={[sa.sub, { color: CA.amarelo }]}>{erro}</Text>}
      {!r && !erro && <ActivityIndicator color={CA.rosa} />}

      <AvisosNoCelular para="equipe" cores={{ card: CA.card, borda: CA.borda, texto: CA.texto, dim: CA.dim, destaque: CA.rosa }} />
      {r && (
        <>
          <Text style={sa.secao}>CAIXA DE ENTRADA</Text>
          {itens.length === 0 ? (
            <View style={[sa.card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <Feather name="check-circle" size={18} color={CA.verde} /><Text style={sa.tit}>Tudo em dia. Nada esperando a equipe.</Text>
            </View>
          ) : (
            <View style={sa.lista}>
              {itens.map((x, i) => (
                <TouchableOpacity key={x.txt} style={[sa.linha, i < itens.length - 1 && sa.borda]} disabled={!x.ir} onPress={() => x.ir && router.push(x.ir as any)} accessibilityRole="button">
                  <View style={e.num}><Text style={e.numTxt}>{x.n}</Text></View>
                  <Text style={[sa.tit, { flex: 1 }]}>{x.txt}</Text>
                  <Feather name={x.icone as any} size={16} color={CA.dim} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {lembretes && lembretes.length > 0 && (
            <TouchableOpacity style={[sa.card, { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }]} onPress={() => router.push('/adm/carteira' as any)} accessibilityRole="button">
              <Feather name="briefcase" size={16} color={CA.rosa} />
              <View style={{ flex: 1 }}>
                <Text style={sa.tit}>Carteira de clientes</Text>
                <Text style={sa.sub}>{new Set(lembretes.map((l) => l.local_id)).size} casas com algo pendente · cobrar no WhatsApp</Text>
              </View>
              <Feather name="chevron-right" size={16} color={CA.fraco} />
            </TouchableOpacity>
          )}

          <Text style={sa.secao}>HOJE NO APP</Text>
          <View style={e.grade}>
            {[
              ['Check-ins', r.numeros.checkins_hoje], ['"Estou aqui" de marcas', r.numeros.presencas_marca_hoje],
              ['Ingressos vendidos', r.numeros.ingressos_hoje], ['Taxa de ingressos', reaisAdm(r.numeros.taxa_ingressos_hoje_centavos)],
              ['Enquetes respondidas', r.numeros.enquetes_hoje], ['Taxa de ingressos no mês', reaisAdm(r.numeros.taxa_ingressos_mes_centavos)],
            ].map(([rot, v]) => (
              <View key={rot as string} style={e.caixa}><Text style={e.valor}>{v as any}</Text><Text style={e.rot}>{rot as string}</Text></View>
            ))}
          </View>

          <Text style={sa.secao}>CRESCIMENTO</Text>
          <View style={e.grade}>
            <View style={e.caixa}><Text style={e.valor}>{r.numeros.usuarios}</Text><Text style={e.rot}>pessoas com conta</Text></View>
            <View style={e.caixa}><Text style={[e.valor, { color: CA.verde }]}>+{r.numeros.usuarios_7d}</Text><Text style={e.rot}>nos últimos 7 dias</Text></View>
            <View style={e.caixa}><Text style={e.valor}>{r.numeros.casas_no_ar}</Text><Text style={e.rot}>casas no ar</Text></View>
          </View>

          <Text style={sa.secao}>CASAS POR PLANO</Text>
          <View style={sa.lista}>
            {Object.entries(r.planos).sort((a, b) => b[1] - a[1]).map(([pl, n], i, arr) => (
              <TouchableOpacity key={pl} style={[sa.linha, i < arr.length - 1 && sa.borda]} onPress={() => router.push(`/adm/locais?plano=${pl}` as any)} accessibilityRole="button">
                <Text style={[sa.tit, { flex: 1 }]}>{NOME_PLANO[pl] || pl}</Text>
                <Text style={sa.tit}>{n}</Text>
                <Feather name="chevron-right" size={16} color={CA.fraco} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={sa.secao}>ATALHOS</Text>
          <View style={e.atalhos}>
            {[
              ['Ações de marca', 'gift', '/adm/acoes'], ['Enviar aviso', 'bell', '/adm/push'], ['Novo banner', 'plus-square', '/adm/banner-editar'], ['Denúncias', 'alert-octagon', '/adm/denuncias'], ['Serviços LGBT+', 'map', '/adm/servicos'], ['Pulso LGBT+', 'activity', '/adm/pulso'], ['Auditoria', 'eye', '/adm/auditoria'], ['Carteira', 'briefcase', '/adm/carteira'], ['Experiências', 'heart', '/adm/experiencias'],
              ['O que está onde', 'layout', '/adm/vitrine'], ['Buscar casa', 'search', '/adm/locais'],
            ].map(([t, ic, ir]) => (
              <TouchableOpacity key={t} style={e.atalho} onPress={() => router.push(ir as any)} accessibilityRole="button">
                <Feather name={ic as any} size={18} color={CA.rosa} /><Text style={e.atalhoTxt}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[e.atalho, { width: '100%', marginTop: 8, justifyContent: 'center' }]} onPress={enviarResumoAgora} disabled={enviandoResumo} accessibilityRole="button">
            {enviandoResumo ? <ActivityIndicator color={CA.rosa} /> : <Feather name="sun" size={18} color={CA.amarelo} />}
            <Text style={e.atalhoTxt}>Mandar o resumo do dia agora</Text>
          </TouchableOpacity>
          <Text style={[sa.sub, { textAlign: 'center', marginTop: 6 }]}>O resumo chega sozinho todo dia às 9h no celular da equipe.</Text>
        </>
      )}
    </TelaAdm>
  );
}

const e = StyleSheet.create({
  num: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: CA.rosa, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  numTxt: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  caixa: { width: '48.5%', backgroundColor: CA.card, borderWidth: 1, borderColor: CA.borda, borderRadius: 14, padding: 12 },
  valor: { color: CA.texto, fontSize: 20, fontWeight: '900' },
  rot: { color: CA.dim, fontSize: 12, marginTop: 2 },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  atalho: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CA.card, borderWidth: 1, borderColor: CA.borda, borderRadius: 14, padding: 14 },
  whats: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#25D366', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 8 },
  whatsTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  atalhoTxt: { color: CA.texto, fontSize: 13.5, fontWeight: '800' },
});
