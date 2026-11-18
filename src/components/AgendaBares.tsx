// Nov/2026 — "Agenda" dos bares: a primeira subcategoria de Bares & Vida Noturna (abre por padrão).
//   1) Em destaque nessa semana: agendas destacadas pelo plano (Fundador/Premium, até 4 por mês) — carrossel.
//   2) Programação por dia (Hoje · Amanhã · Próximos 7 dias): o que cada bar sobe na Agenda da semana.
// Os nomes dos bares (lista de locais) aparecem ao tocar nas outras subcategorias.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { TITULO_SECAO } from '../constants/theme';
import { supabase } from '../lib/supabase';

type Agenda = {
  id: string; local_id: string; dia_semana: number; data?: string | null; tipo?: string | null; titulo: string; descricao: string | null;
  horario?: string | null; foto_url: string | null; publico?: string | null; entrada?: string | null; lista?: boolean | null;
  locais: { nome: string; bairro: string | null; bairro_exibicao?: string | null; cidade: string; categoria: string; plano_comercial?: string | null; plano_comercial_status?: string | null; logo_url?: string | null; foto_capa_url?: string | null; publico_tags?: string[] | null } | null;
};
type Destaque = { id: string; local_id: string; data_inicio: string; data_fim: string; agenda: Agenda | null };

const pad2 = (n: number) => String(n).padStart(2, '0');
const chaveDia = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
// Predominância de público do bar (locais.publico_tags, definido pelo parceiro) — aparece na agenda como em Festas.
const ROTULO_PUBLICO: Record<string, string> = {
  gay: 'Gays', lesbica: 'Lésbicas', bi: 'Bissexuais', trans: 'Trans e travestis', nao_binario: 'Não binárie', queer: 'Queer',
  ursos: 'Ursos', daddy: 'Daddy', leather: 'Leather', drag: 'Drag', misto_lgbt: 'Misto LGBT+', aliados: 'Todos (friendly)',
};
export const publicoDoBar = (tags?: string[] | null) => (tags || []).map((t) => ROTULO_PUBLICO[t]).filter(Boolean).slice(0, 2).join(' · ');
// Público da noite (migration 154) vence; sem ele, a predominância do cadastro do bar.
const tagsDa = (a?: Agenda | null) => (a?.publico ? [a.publico] : a?.locais?.publico_tags || []);
const publicoDa = (a?: Agenda | null) => publicoDoBar(tagsDa(a));
const rank = (a: Agenda) => (a.locais?.plano_comercial_status !== 'ativo' ? 2 : a.locais?.plano_comercial === 'fundador' ? 0 : a.locais?.plano_comercial === 'premium' ? 1 : 2);

export default function AgendaBares({ categoria, extras, cor = '#E1306C', publico }: { categoria: string; extras?: Set<string>; cor?: string; publico?: string | null }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [agenda, setAgenda] = useState<Agenda[] | null>(null);
  const [destaques, setDestaques] = useState<Destaque[]>([]);
  const quando = 'hoje' as 'hoje' | 'amanha' | 'semana';

  useFocusEffect(useCallback(() => {
    let vivo = true;
    (async () => {
      const hoje = new Date(); const ate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 6);
      const BASE0 = 'id, local_id, dia_semana, titulo, descricao, foto_url, data, tipo, horario, locais!inner(nome, bairro, bairro_exibicao, cidade, categoria, status, plano_comercial, plano_comercial_status, logo_url, foto_capa_url, publico_tags)';
      const consultaAgenda = (campos: string) => (supabase.from('agenda_semanal') as any).select(campos).eq('ativo', true).eq('locais.status', 'aprovado')
        .or(`data.is.null,and(data.gte.${chaveDia(hoje)},data.lte.${chaveDia(ate)})`).limit(500);
      const [a, d]: any[] = await Promise.all([
        consultaAgenda(BASE0.replace('horario, locais', 'horario, publico, entrada, lista, locais'))
          .then((r: any) => (r.error ? consultaAgenda(BASE0.replace('horario, locais', 'horario, publico, locais')) : r))
          .then((r: any) => (r.error ? consultaAgenda(BASE0) : r)), // sem a 155/154 // sem a 154: sem público por dia
        (supabase.from('destaques_agenda') as any).select('id, local_id, data_inicio, data_fim, agenda_semanal!inner(id, titulo, foto_url, horario, ativo)').gte('data_fim', chaveDia(hoje)).eq('agenda_semanal.ativo', true).limit(48),
      ]);
      if (!vivo) return;
      const lista = ((a.data as Agenda[]) || []).filter((x) => x.locais && (x.locais.categoria === categoria || !!extras?.has(x.local_id)));
      setAgenda(lista);
      const porLocal = new Map(lista.map((x) => [x.local_id, x.locais]));
      setDestaques(((d.data as any[]) || [])
        .filter((x) => porLocal.has(x.local_id))
        .map((x) => ({ id: x.id, local_id: x.local_id, data_inicio: x.data_inicio, data_fim: x.data_fim, agenda: x.agenda_semanal ? { ...x.agenda_semanal, publico: lista.find((y) => y.id === x.agenda_semanal.id)?.publico ?? null, locais: porLocal.get(x.local_id) } : null })));
    })();
    return () => { vivo = false; };
  }, [categoria, extras]));

  const doDia = (d: Date): Agenda[] => {
    const chave = chaveDia(d); const dow = d.getDay();
    const lista = (agenda || []).filter((x) => x.tipo !== 'semana' && (!publico || tagsDa(x).includes(publico)));
    const datados = lista.filter((x) => x.data === chave);
    const fixos = lista.filter((x) => !x.data && x.dia_semana === dow && !datados.some((y) => y.local_id === x.local_id));
    return [...datados, ...fixos].sort((x, y) => rank(x) - rank(y));
  };
  const hoje = new Date();
  // Carrossel "Em destaque nessa semana": destaques do plano primeiro, depois a programação dos próximos 7 dias (por dia).
  const idsDestacados = new Set(destaques.map((d) => d.agenda?.id).filter(Boolean));
  const semanaCards = Array.from({ length: 7 }, (_, i) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i))
    .flatMap((d) => doDia(d).filter((x) => !idsDestacados.has(x.id)).map((x) => ({ x, d })))
    .slice(0, 24);
  const dias = quando === 'hoje' ? [hoje] : quando === 'amanha' ? [new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1)]
    : Array.from({ length: 7 }, (_, i) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i));
  const blocos = dias.map((d, i) => ({ d, i, itens: doDia(d) })).filter((b) => b.itens.length > 0);
  const total = blocos.reduce((n, b) => n + b.itens.length, 0);
  const larguraCard = Math.floor((Math.min(width, 600) - 32 - 20) / 3.2);
  const fotoDe = (x: Agenda) => x.foto_url || x.locais?.foto_capa_url || x.locais?.logo_url || null;

  return (
    <View>
      {destaques.length + semanaCards.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <View style={s.cab}><Text style={s.titulo}>Em destaque nessa semana</Text><Text style={s.qtd}>{destaques.length + semanaCards.length}</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }} style={{ marginTop: 10, marginRight: -16 }}>
            {destaques.map((dq) => {
              const ini = new Date(`${dq.data_inicio}T12:00:00`);
              const ehHoje = dq.data_inicio <= chaveDia(hoje) && dq.data_fim >= chaveDia(hoje);
              const semana = dq.data_inicio !== dq.data_fim;
              const foto = dq.agenda ? fotoDe(dq.agenda) : null;
              return (
                <TouchableOpacity key={dq.id} style={{ width: larguraCard }} onPress={() => router.push(`/business/${dq.local_id}` as any)} activeOpacity={0.9} accessibilityRole="button">
                  <View style={[s.flyer, { width: larguraCard, height: Math.round(larguraCard * 1.33) }]}>
                    {foto ? <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Feather name="calendar" size={22} color="rgba(255,255,255,0.5)" />}
                    <View style={[s.selo, (ehHoje && !semana) && { backgroundColor: cor }]}>
                      <Text style={s.seloTxt}>{semana ? 'ESTA SEMANA' : ehHoje ? 'HOJE' : `${DIAS_CURTOS[ini.getDay()]} ${pad2(ini.getDate())}/${pad2(ini.getMonth() + 1)}`}</Text>
                    </View>
                  </View>
                  {!!dq.agenda?.horario && <Text style={[s.hora, { color: cor }]} numberOfLines={1}>{dq.agenda.horario}</Text>}
                  <Text style={s.cardTit} numberOfLines={2}>{dq.agenda?.titulo && dq.agenda.titulo !== 'Programação da semana' ? dq.agenda.titulo : dq.agenda?.locais?.nome || 'Agenda'}</Text>
                  <Text style={s.cardCasa} numberOfLines={2}>{dq.agenda?.locais?.nome || ''}</Text>
                  {!!publicoDa(dq.agenda) && <Text style={s.cardPub} numberOfLines={1}>{publicoDa(dq.agenda)}</Text>}
                </TouchableOpacity>
              );
            })}
            {semanaCards.map(({ x, d }) => {
              const ehHoje = chaveDia(d) === chaveDia(hoje);
              const foto = fotoDe(x);
              return (
                <TouchableOpacity key={`${x.id}-${chaveDia(d)}`} style={{ width: larguraCard }} onPress={() => router.push(`/business/${x.local_id}` as any)} activeOpacity={0.9} accessibilityRole="button">
                  <View style={[s.flyer, { width: larguraCard, height: Math.round(larguraCard * 1.33) }]}>
                    {foto ? <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Feather name="music" size={22} color="rgba(255,255,255,0.5)" />}
                    <View style={[s.selo, ehHoje && { backgroundColor: cor }]}><Text style={s.seloTxt}>{ehHoje ? 'HOJE' : `${DIAS_CURTOS[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`}</Text></View>
                  </View>
                  {!!x.horario && <Text style={[s.hora, { color: cor }]} numberOfLines={1}>{x.horario}</Text>}
                  <Text style={s.cardTit} numberOfLines={2}>{x.titulo && x.titulo !== 'Programação da semana' ? x.titulo : x.locais?.nome}</Text>
                  <Text style={s.cardCasa} numberOfLines={2}>{x.locais?.nome || ''}</Text>
                  {!!publicoDa(x) && <Text style={s.cardPub} numberOfLines={1}>{publicoDa(x)}</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={[s.cab, { marginTop: 18 }]}>
        <Text style={s.titulo}>{quando === 'hoje' ? 'Agenda de hoje' : quando === 'amanha' ? 'Agenda de amanhã' : 'Agenda · 7 dias'}</Text>
        <Text style={s.qtd}>{agenda === null ? '' : `${total} ${total === 1 ? 'programação' : 'programações'}`}</Text>
      </View>
      {agenda !== null && total === 0 && (
        <View style={s.vazio}><Feather name="calendar" size={26} color="rgba(255,255,255,0.35)" /><Text style={s.vazioTxt}>Nenhum bar subiu programação para {quando === 'hoje' ? 'hoje' : quando === 'amanha' ? 'amanhã' : 'os próximos dias'} ainda. Toque numa subcategoria para ver os bares.</Text></View>
      )}
      {blocos.map((b) => (
        <View key={chaveDia(b.d)}>
          {quando === 'semana' && <Text style={[s.dia, { color: cor }]}>{b.i === 0 ? 'Hoje' : b.i === 1 ? 'Amanhã' : DIAS[b.d.getDay()]} · {pad2(b.d.getDate())}/{pad2(b.d.getMonth() + 1)}</Text>}
          {b.itens.map((x) => (
            <TouchableOpacity key={`${x.id}-${chaveDia(b.d)}`} style={s.linha} onPress={() => router.push(`/business/${x.local_id}` as any)} activeOpacity={0.85} accessibilityRole="button">
              <View style={s.foto}>{fotoDe(x) ? <Image source={{ uri: fotoDe(x) as string }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Feather name="music" size={20} color="#B39DDB" />}</View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.linhaTit} numberOfLines={2}>{x.titulo && x.titulo !== 'Programação da semana' ? x.titulo : x.locais?.nome}</Text>
                <Text style={[s.hora, { color: cor, marginTop: 4 }]} numberOfLines={1}>{x.horario || 'Programação do dia'}{rank(x) < 2 ? '  ★' : ''}</Text>
                <Text style={s.local} numberOfLines={1}>{x.locais?.nome} · {x.locais?.bairro_exibicao || x.locais?.bairro || x.locais?.cidade}</Text>
                {(!!publicoDa(x) || !!x.entrada || !!x.lista) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {!!publicoDa(x) && <View style={s.chipPub}><Feather name="users" size={11} color="rgba(255,255,255,0.75)" /><Text style={s.chipPubTxt} numberOfLines={1}>{publicoDa(x)}</Text></View>}
                    {x.entrada === 'gratis' && <View style={[s.chipPub, { borderColor: '#34D39966' }]}><Feather name="gift" size={11} color="#34D399" /><Text style={[s.chipPubTxt, { color: '#34D399' }]}>Entrada grátis</Text></View>}
                    {x.entrada === 'pago' && <View style={s.chipPub}><Feather name="tag" size={11} color="rgba(255,255,255,0.75)" /><Text style={s.chipPubTxt}>Pago</Text></View>}
                    {!!x.lista && <View style={[s.chipPub, { borderColor: '#C084FC66' }]}><Feather name="user-check" size={11} color="#C084FC" /><Text style={[s.chipPubTxt, { color: '#C084FC' }]}>Nome na lista</Text></View>}
                  </View>
                )}
                {!!x.descricao && <Text style={s.desc} numberOfLines={2}>{x.descricao}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  cab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { ...TITULO_SECAO },
  qtd: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  flyer: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#2A1B3D', alignItems: 'center', justifyContent: 'center' },
  selo: { position: 'absolute', top: 6, left: 6, maxWidth: '88%', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  seloTxt: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  hora: { marginTop: 6, fontSize: 11.5, fontWeight: '800' },
  cardTit: { marginTop: 2, fontSize: 12.5, fontWeight: '800', color: '#FFF', lineHeight: 16 },
  cardCasa: { marginTop: 1, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  cardPub: { marginTop: 1, fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  chipPub: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  chipPubTxt: { fontSize: 11.5, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  quando: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  dia: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 4 },
  linha: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  foto: { width: 84, height: 104, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(126,87,194,0.16)', alignItems: 'center', justifyContent: 'center' },
  linhaTit: { fontSize: 15, fontWeight: '800', color: '#FFF', lineHeight: 19 },
  local: { marginTop: 3, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  desc: { marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  vazio: { alignItems: 'center', gap: 8, padding: 24, marginTop: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)' },
  vazioTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
});
