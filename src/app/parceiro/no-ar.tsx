// Modo parceiro — "No ar agora": tudo o que a casa tem visível no app, num lugar só.
//   • Na sua página: cupons valendo, festas que vêm aí (e o status), agenda da semana e ação de marca;
//   • Banner: o que está na Home e no topo da categoria;
//   • Festas passadas.
// Cada linha abre a tela de editar. "Ver minha página" abre a página como o cliente vê.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { obterBanners } from '../../lib/parceiro/banner';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import { nivelDoPlano } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

type Linha = { chave: string; titulo: string; sub: string; foto?: string | null; tom?: 'ok' | 'alerta' | 'neutro'; selo?: string; rota?: string };
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).replace('.', '');
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const hojeISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const COR_TOM = { ok: '#4CAF7D', alerta: '#F2A900', neutro: CP.dim };
const STATUS_FESTA: Record<string, { txt: string; tom: 'ok' | 'alerta' | 'neutro' }> = {
  aprovado: { txt: 'No app', tom: 'ok' }, pendente: { txt: 'Em análise', tom: 'alerta' }, rejeitado: { txt: 'Não aprovada', tom: 'neutro' },
};

export default function NoArAgora() {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const r = localAtivo ? recursosDaCategoria(localAtivo.categoria) : null;
  const premium = !!localAtivo && nivelDoPlano(localAtivo.plano_comercial) === 'premium';
  const [dados, setDados] = useState<{ pagina: Linha[]; banners: Linha[]; passadas: Linha[] } | null>(null);

  const carregar = useCallback(async () => {
    if (!localId) return;
    const agora = new Date().toISOString();
    const [cup, fut, pas, ag, marcas, bn] = await Promise.all([
      (supabase.from('cupons') as any).select('id, titulo, valido_ate, acao_marca_id').eq('local_id', localId).eq('ativo', true).order('created_at', { ascending: false }).limit(20),
      (supabase.from('eventos') as any).select('id, titulo, data_inicio, status, foto_capa_url, plano_destaque, destaque_ate').eq('local_id', localId).gte('data_inicio', new Date(Date.now() - 6 * 3600 * 1000).toISOString()).neq('status', 'cancelado').order('data_inicio').limit(20),
      (supabase.from('eventos') as any).select('id, titulo, data_inicio, foto_capa_url').eq('local_id', localId).lt('data_inicio', new Date(Date.now() - 6 * 3600 * 1000).toISOString()).eq('status', 'aprovado').order('data_inicio', { ascending: false }).limit(10),
      // 18/11: conta só o que ainda vai acontecer (dias que já passaram não estão mais no ar).
      (supabase.from('agenda_semanal') as any).select('id', { count: 'exact', head: true }).eq('local_id', localId).eq('ativo', true)
        .or(`data.is.null,data.gte.${new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)}`),
      (supabase.from('acoes_marca') as any).select('id, marca, nome, inicio, fim, ativa, mostrar_no_app').eq('local_id', localId).eq('ativa', true).gte('fim', hojeISO()).order('inicio'),
      premium ? obterBanners(localId).catch(() => null) : Promise.resolve(null),
    ]);

    const pagina: Linha[] = [];
    const cupons = ((cup.data as any[]) || []).filter((c) => !c.valido_ate || c.valido_ate >= agora);
    cupons.forEach((c) => pagina.push({ chave: `c-${c.id}`, titulo: c.titulo, sub: c.valido_ate ? `Cupom · vale até ${dia(c.valido_ate)}` : 'Cupom · sem data de fim', tom: 'ok', selo: c.acao_marca_id ? 'Com marca' : 'No ar', rota: `/parceiro/cupom-editar?id=${c.id}` }));
    ((fut.data as any[]) || []).forEach((e) => {
      const st = STATUS_FESTA[e.status] || { txt: e.status, tom: 'neutro' as const };
      const destaque = e.destaque_ate && e.destaque_ate >= agora;
      pagina.push({ chave: `f-${e.id}`, titulo: e.titulo, sub: `Festa · ${dia(e.data_inicio)} às ${hora(e.data_inicio)}${destaque ? ' · em destaque' : ''}`, foto: e.foto_capa_url, tom: st.tom, selo: st.txt, rota: `/parceiro/festa-editar?id=${e.id}` });
    });
    if (r?.agenda) {
      const n = ag.count || 0;
      pagina.push({ chave: 'agenda', titulo: 'Agenda da semana', sub: n ? `${n} ${n === 1 ? 'programação' : 'programações'} nos próximos dias` : 'Nada nos próximos dias', tom: n ? 'ok' : 'alerta', selo: n ? 'No ar' : 'Falta', rota: '/parceiro/agenda' });
    }
    ((marcas.data as any[]) || []).forEach((m) => {
      const noPeriodo = m.inicio <= hojeISO();
      pagina.push({ chave: `m-${m.id}`, titulo: `${m.marca} · ${m.nome}`, sub: `Ação de marca · até ${m.fim.split('-').reverse().slice(0, 2).join('/')}`,
        tom: m.mostrar_no_app && noPeriodo ? 'ok' : 'alerta', selo: !m.mostrar_no_app ? 'Aguardando a equipe' : noPeriodo ? 'No ar' : 'Agendada', rota: '/parceiro/acoes-marca' });
    });

    const banners: Linha[] = [];
    if (premium && bn) {
      banners.push({ chave: 'b-home', titulo: bn.home.chamada || 'Sem texto', sub: 'Banner na Home', tom: bn.home.chamada ? 'ok' : 'alerta', selo: bn.home.chamada ? 'No ar' : 'Vazio', foto: bn.home.imagem_url, rota: '/parceiro/banner' });
      banners.push({ chave: 'b-cat', titulo: bn.categoria.chamada || 'Sem texto', sub: 'Banner no topo da categoria', tom: bn.categoria.chamada ? 'ok' : 'alerta', selo: bn.categoria.chamada ? 'No ar' : 'Vazio', foto: bn.categoria.imagem_url, rota: '/parceiro/banner' });
    }
    const passadas: Linha[] = ((pas.data as any[]) || []).map((e) => ({ chave: `p-${e.id}`, titulo: e.titulo, sub: `${dia(e.data_inicio)} às ${hora(e.data_inicio)}`, foto: e.foto_capa_url, tom: 'neutro', selo: 'Passou', rota: '/parceiro/festas' }));
    setDados({ pagina, banners, passadas });
  }, [localId, premium, r?.agenda]);
  useEffect(() => { void carregar(); }, [carregar]);

  if (!localAtivo) return <TelaParceiro titulo="No ar agora"><Text style={a.vazio}>Escolha uma casa.</Text></TelaParceiro>;

  const Bloco = ({ itens, vazio }: { itens: Linha[]; vazio: string }) =>
    itens.length === 0 ? <Text style={a.vazio}>{vazio}</Text> : (
      <View style={a.lista}>
        {itens.map((l, i) => (
          <TouchableOpacity key={l.chave} style={[a.linha, i < itens.length - 1 && a.borda]} onPress={() => l.rota && router.push(l.rota as any)} activeOpacity={0.7} accessibilityRole="button">
            <View style={a.thumb}>{l.foto ? <Image source={{ uri: l.foto }} style={a.thumbImg} /> : <Feather name="circle" size={10} color={COR_TOM[l.tom || 'neutro']} />}</View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={a.tit} numberOfLines={1}>{l.titulo}</Text>
              <Text style={a.sub} numberOfLines={1}>{l.sub}</Text>
            </View>
            {!!l.selo && <Text style={[a.selo, { color: COR_TOM[l.tom || 'neutro'], borderColor: `${COR_TOM[l.tom || 'neutro']}55` }]}>{l.selo}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    );

  return (
    <TelaParceiro titulo="No ar agora" subtitulo="Tudo o que o público vê da sua casa no app." aoAtualizar={() => void carregar()} aoVoltar={() => router.back()}>
      <TouchableOpacity style={a.verPagina} onPress={() => router.push(`/business/${localId}` as any)} accessibilityRole="button">
        <Feather name="eye" size={16} color="#FFF" /><Text style={a.verPaginaTxt}>Ver minha página como o cliente vê</Text>
      </TouchableOpacity>
      {!dados ? <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} /> : (
        <>
          <TituloSecao texto="Na sua página" />
          <Bloco itens={dados.pagina} vazio="Nada no ar agora. Crie um cupom ou uma festa em Divulgar." />
          <TituloSecao texto="Banner" />
          {premium ? <Bloco itens={dados.banners} vazio="Sem banner." /> : <Text style={a.vazio}>O banner na Home e na categoria está nos planos Premium e Fundador.</Text>}
          <TituloSecao texto="Festas passadas" />
          <Bloco itens={dados.passadas} vazio="Nenhuma festa passada." />
        </>
      )}
    </TelaParceiro>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  verPagina: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2A2938', borderRadius: RAIO.s, minHeight: 46 },
  verPaginaTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  lista: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, padding: ESP.m, minHeight: 60 },
  borda: { borderBottomWidth: 1, borderBottomColor: CP.borda },
  thumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#232230', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: 40, height: 40 },
  tit: { color: CP.texto, fontSize: 14, fontWeight: '700' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  selo: { fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  vazio: { color: CP.fraco, fontSize: 13, lineHeight: 19 },
});
