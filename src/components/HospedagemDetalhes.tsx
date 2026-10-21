// Rodada 63 — blocos extras da página de um local quando ele é hospedagem
// (hotel, pousada, hostel…), no modelo das referências do Dicas Trip:
//   • tipo de hospedagem + tags por grupo (Comodidades, Quartos,
//     Acessibilidade, Diversidade e acolhimento…)
//   • Conheça o espaço: abas Quartos | Áreas em comum | Lazer, com foto
//   • Locais próximos: distância calculada pelo mapa (lat/lng)
//       – automático: bares, festas, restaurantes, cafés, saunas, cultura e
//         eventos que JÁ estão no app, num raio de 3 km
//       – indicados pelo hotel no portal (metrô, Av. Paulista, percurso da
//         Parada…), que só aparecem depois da validação da equipe
//
// Busca os próprios dados em consultas separadas: se a migration 036 ainda
// não tiver rodado no Supabase, as consultas falham em silêncio e a página
// do local continua exatamente como era (nada quebra).
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { distanciaMetros, formatarDistancia, tempoAPe } from '../lib/distancia';
import { supabase } from '../lib/supabase';
import {
  GRUPOS_HOSPEDAGEM,
  FORMAS_PAGAMENTO,
  IDIOMAS_ATENDIMENTO,
  TIPOS_CANCELAMENTO,
  TIPOS_ESPACO,
  TIPOS_PROXIMOS,
  slugTag,
  TipoEspaco,
  rotuloTag,
} from '../lib/taxonomia';

const C = {
  card: '#161520',
  borda: '#232230',
  texto: '#FFFFFF',
  sub: '#A0A0B2',
  lilas: '#B39DDB',
  verde: '#4CAF7D',
  rosa: '#E1306C',
};

const RAIO_AUTOMATICO_M = 3000;

type Espaco = {
  id: string;
  tipo: TipoEspaco;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  capacidade?: number | null;
  camas?: string | null;
  preco_de?: number | null;
  caracteristicas?: string[] | null;
};
// Rodada 64 — dados do cadastro completo (hospedagem_perfil, migration 037)
type PerfilHosp = {
  checkin_hora: string | null;
  checkout_hora: string | null;
  idiomas: string[] | null;
  idade_minima: number | null;
  cancelamento_tipo: string | null;
  cancelamento_texto: string | null;
  formas_pagamento: string[] | null;
  link_reserva: string | null;
  whatsapp_reserva: string | null;
  email_reserva: string | null;
  site: string | null;
};
const rotuloDe = (lista: string[], slug: string) => lista.find((l) => slugTag(l) === slug) || slug;

function abrirReserva(p: PerfilHosp) {
  if (p.link_reserva) return Linking.openURL(p.link_reserva);
  if (p.whatsapp_reserva) {
    let n = p.whatsapp_reserva.replace(/\D/g, '');
    if (n.length <= 11) n = `55${n}`;
    return Linking.openURL(`https://wa.me/${n}?text=${encodeURIComponent('Olá! Vi vocês no app Dicas LGBT+ e queria consultar disponibilidade.')}`);
  }
  if (p.site) return Linking.openURL(p.site);
  if (p.email_reserva) return Linking.openURL(`mailto:${p.email_reserva}?subject=${encodeURIComponent('Reserva — via Dicas LGBT+')}`);
}
type Proximo = {
  chave: string;
  tipo: string;
  nome: string;
  distancia: number;
  localId?: string;
  validado?: boolean;
};

// Categoria/subcategoria de um local do app → tipo de "local próximo".
function tipoAutomatico(categoria: string, sub: string | null): string | null {
  const s = (sub || '').toLowerCase();
  if (categoria === 'lugares') {
    if (s.includes('sauna')) return 'saunas';
    if (s.includes('18') || s.includes('dark') || s.includes('cine')) return 'espacos_18';
    if (/balada|boate|club|noturn/.test(s)) return 'casas_noturnas';
    return 'bares_lgbt';
  }
  if (categoria === 'eventos') return 'festas_lgbt';
  if (categoria === 'gastronomia') return /caf[eé]/.test(s) ? 'cafes' : 'restaurantes';
  if (categoria === 'cultura') {
    if (s.includes('teatro')) return 'teatros';
    if (s.includes('cinema')) return 'cinemas';
    if (s.includes('museu')) return 'museus';
    return 'centros_culturais';
  }
  return null;
}

const INFO_TIPO = Object.fromEntries(TIPOS_PROXIMOS.map((t) => [t.id, t]));

interface Props {
  localId: string;
  lat: number | null;
  lng: number | null;
  cidade: string | null;
  // Locais próximos e espaços com foto são recurso dos planos pagos.
  premium: boolean;
}

export default function HospedagemDetalhes({ localId, lat, lng, cidade, premium }: Props) {
  const router = useRouter();
  const [tipoHospedagem, setTipoHospedagem] = useState<string | null>(null);
  const [atributos, setAtributos] = useState<Record<string, string[]>>({});
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [abaEspaco, setAbaEspaco] = useState<TipoEspaco>('quarto');
  const [proximos, setProximos] = useState<Proximo[]>([]);
  const [verTodasTags, setVerTodasTags] = useState(false);
  const [verTodosProximos, setVerTodosProximos] = useState(false);
  const [perfil, setPerfil] = useState<PerfilHosp | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data, error } = await supabase
        .from('locais')
        .select('tipo_hospedagem, atributos')
        .eq('id', localId)
        .maybeSingle();
      if (!ativo || error || !data) return;
      setTipoHospedagem((data as any).tipo_hospedagem || null);
      setAtributos(((data as any).atributos as Record<string, string[]>) || {});
      const pf = await supabase
        .from('hospedagem_perfil')
        .select('checkin_hora, checkout_hora, idiomas, idade_minima, cancelamento_tipo, cancelamento_texto, formas_pagamento, link_reserva, whatsapp_reserva, email_reserva, site')
        .eq('local_id', localId)
        .maybeSingle();
      if (ativo && !pf.error && pf.data) setPerfil(pf.data as PerfilHosp);
    })();
    return () => {
      ativo = false;
    };
  }, [localId]);

  const ehHospedagem = !!tipoHospedagem;

  useEffect(() => {
    if (!ehHospedagem || !premium) return;
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from('hospedagem_espacos')
        .select('*')
        .eq('local_id', localId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (!ativo || !data) return;
      setEspacos(data as Espaco[]);
      const primeiro = TIPOS_ESPACO.find((t) => (data as Espaco[]).some((e) => e.tipo === t.id));
      if (primeiro) setAbaEspaco(primeiro.id);
    })();
    return () => {
      ativo = false;
    };
  }, [ehHospedagem, premium, localId]);

  useEffect(() => {
    if (!ehHospedagem || !premium || lat == null || lng == null) return;
    let ativo = true;
    (async () => {
      const lista: Proximo[] = [];

      // 1) Pontos indicados pelo hotel e validados pela equipe
      const pontos = await supabase
        .from('pontos_proximos')
        .select('id, tipo, nome, lat, lng')
        .eq('local_id', localId)
        .eq('status', 'aprovado');
      for (const p of (pontos.data as any[]) || []) {
        if (p.lat == null || p.lng == null) continue;
        lista.push({
          chave: `p-${p.id}`,
          tipo: p.tipo,
          nome: p.nome,
          distancia: distanciaMetros(lat, lng, p.lat, p.lng),
          validado: true,
        });
      }

      // 2) Locais do próprio app (automático)
      let q = supabase
        .from('locais')
        .select('id, nome, categoria, subcategoria, lat, lng')
        .eq('status', 'aprovado')
        .neq('id', localId)
        .not('lat', 'is', null)
        .limit(400);
      if (cidade) q = q.eq('cidade', cidade);
      const locais = await q;
      for (const l of (locais.data as any[]) || []) {
        const tipo = tipoAutomatico(l.categoria, l.subcategoria);
        if (!tipo) continue;
        const d = distanciaMetros(lat, lng, l.lat, l.lng);
        if (d > RAIO_AUTOMATICO_M) continue;
        lista.push({ chave: `l-${l.id}`, tipo, nome: l.nome, distancia: d, localId: l.id });
      }

      // 3) Eventos LGBT+ dos próximos 30 dias em locais próximos
      const hoje = new Date();
      const limite = new Date(hoje.getTime() + 30 * 86400000);
      const eventos = await supabase
        .from('eventos')
        .select('id, titulo, data_inicio, locais(lat, lng)')
        .eq('status', 'aprovado')
        .gte('data_inicio', hoje.toISOString())
        .lte('data_inicio', limite.toISOString())
        .limit(100);
      for (const ev of (eventos.data as any[]) || []) {
        const lo = ev.locais;
        if (!lo || lo.lat == null || lo.lng == null) continue;
        const d = distanciaMetros(lat, lng, lo.lat, lo.lng);
        if (d > RAIO_AUTOMATICO_M) continue;
        lista.push({ chave: `e-${ev.id}`, tipo: 'eventos_lgbt', nome: ev.titulo, distancia: d });
      }

      lista.sort((a, b) => a.distancia - b.distancia);
      if (ativo) setProximos(lista);
    })().catch(() => {});
    return () => {
      ativo = false;
    };
  }, [ehHospedagem, premium, lat, lng, cidade, localId]);

  // Grupos de tags com algo marcado, na ordem da taxonomia
  const gruposMarcados = useMemo(
    () =>
      GRUPOS_HOSPEDAGEM.map((g) => ({ ...g, marcadas: (atributos[g.id] || []).filter(Boolean) })).filter(
        (g) => g.marcadas.length > 0
      ),
    [atributos]
  );

  if (!ehHospedagem) return null;

  const gruposVisiveis = verTodasTags ? gruposMarcados : gruposMarcados.slice(0, 2);
  const espacosAba = espacos.filter((e) => e.tipo === abaEspaco);
  const abasComItens = TIPOS_ESPACO.filter((t) => espacos.some((e) => e.tipo === t.id));
  const proximosVisiveis = verTodosProximos ? proximos : proximos.slice(0, 6);

  return (
    <View style={{ marginTop: 4 }}>
      <View style={s.tipoRow}>
        <View style={s.tipoPill}>
          <Feather name="home" size={12} color={C.lilas} />
          <Text style={s.tipoTexto}>{rotuloTag(tipoHospedagem!)}</Text>
        </View>
        {(atributos.diversidade || []).includes('acolhimento_lgbt') && (
          <View style={[s.tipoPill, { borderColor: C.verde + '60' }]}>
            <Feather name="heart" size={12} color={C.verde} />
            <Text style={[s.tipoTexto, { color: C.verde }]}>Hospedagem acolhedora</Text>
          </View>
        )}
        {(atributos.diversidade || []).includes('verificado_pelo_dicas') && (
          <View style={[s.tipoPill, { borderColor: '#FFD54F80' }]}>
            <Feather name="check-circle" size={12} color="#FFD54F" />
            <Text style={[s.tipoTexto, { color: '#FFD54F' }]}>Verificado pelo Dicas</Text>
          </View>
        )}
      </View>

      {perfil && (
        <View style={s.infoCard}>
          {(perfil.checkin_hora || perfil.checkout_hora) && (
            <View style={s.infoLinha}>
              <Feather name="clock" size={14} color={C.lilas} />
              <Text style={s.infoTexto}>
                {perfil.checkin_hora ? `Check-in a partir de ${perfil.checkin_hora.slice(0, 5)}` : ''}
                {perfil.checkin_hora && perfil.checkout_hora ? '  ·  ' : ''}
                {perfil.checkout_hora ? `Check-out até ${perfil.checkout_hora.slice(0, 5)}` : ''}
              </Text>
            </View>
          )}
          {!!perfil.cancelamento_tipo && (
            <View style={s.infoLinha}>
              <Feather name="rotate-ccw" size={14} color={C.lilas} />
              <Text style={s.infoTexto}>
                Cancelamento {TIPOS_CANCELAMENTO.find((c) => c.id === perfil.cancelamento_tipo)?.label.toLowerCase()}
                {perfil.cancelamento_texto ? ` — ${perfil.cancelamento_texto}` : ` — ${TIPOS_CANCELAMENTO.find((c) => c.id === perfil.cancelamento_tipo)?.ajuda.toLowerCase()}`}
              </Text>
            </View>
          )}
          {!!perfil.idiomas?.length && (
            <View style={s.infoLinha}>
              <Feather name="globe" size={14} color={C.lilas} />
              <Text style={s.infoTexto}>Atendimento em {perfil.idiomas.map((i) => rotuloDe(IDIOMAS_ATENDIMENTO, i)).join(', ')}</Text>
            </View>
          )}
          {!!perfil.formas_pagamento?.length && (
            <View style={s.infoLinha}>
              <Feather name="credit-card" size={14} color={C.lilas} />
              <Text style={s.infoTexto}>{perfil.formas_pagamento.map((i) => rotuloDe(FORMAS_PAGAMENTO, i)).join(', ')}</Text>
            </View>
          )}
          {perfil.idade_minima != null && perfil.idade_minima > 0 && (
            <View style={s.infoLinha}>
              <Feather name="user-check" size={14} color={C.lilas} />
              <Text style={s.infoTexto}>Hóspedes a partir de {perfil.idade_minima} anos</Text>
            </View>
          )}
          {!!(perfil.link_reserva || perfil.whatsapp_reserva || perfil.site || perfil.email_reserva) && (
            <TouchableOpacity style={s.btnReserva} onPress={() => abrirReserva(perfil)} activeOpacity={0.85}>
              <Feather name="calendar" size={18} color="#FFF" />
              <View style={{ flex: 1 }}>
                <Text style={s.btnReservaTitulo}>Consultar disponibilidade</Text>
                <Text style={s.btnReservaSub}>Você será direcionado ao canal oficial da hospedagem.</Text>
              </View>
              <Feather name="external-link" size={16} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {gruposVisiveis.map((g) => (
        <View key={g.id} style={{ marginTop: 16 }}>
          <Text style={s.titulo}>{g.titulo}</Text>
          <View style={s.chips}>
            {g.marcadas.map((slug) => (
              <View key={slug} style={s.chip}>
                <Text style={s.chipTexto}>{rotuloTag(slug)}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      {gruposMarcados.length > 2 && (
        <TouchableOpacity onPress={() => setVerTodasTags((v) => !v)} style={{ marginTop: 10 }}>
          <Text style={s.link}>{verTodasTags ? 'Ver menos' : `Ver todas as informações (${gruposMarcados.length - 2} grupos)`}</Text>
        </TouchableOpacity>
      )}

      {abasComItens.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <Text style={s.titulo}>Conheça o espaço</Text>
          <View style={s.abas}>
            {abasComItens.map((a) => {
              const ativa = a.id === abaEspaco;
              return (
                <TouchableOpacity key={a.id} onPress={() => setAbaEspaco(a.id)} style={[s.aba, ativa && s.abaAtiva]}>
                  <Text style={[s.abaTexto, ativa && { color: '#FFF' }]}>{a.titulo}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={s.espacosLinha}>
            {espacosAba.map((e) => (
              <View key={e.id} style={s.espacoCard}>
                {e.foto_url ? (
                  <Image source={{ uri: e.foto_url }} style={s.espacoFoto} resizeMode="cover" />
                ) : (
                  <View style={[s.espacoFoto, s.semFoto]}>
                    <Feather name="image" size={20} color={C.sub} />
                  </View>
                )}
                <View style={{ padding: 10 }}>
                  <Text style={s.espacoNome} numberOfLines={1}>{e.nome}</Text>
                  {!!e.descricao && <Text style={s.espacoDesc} numberOfLines={2}>{e.descricao}</Text>}
                  {e.tipo === 'quarto' && (e.capacidade || e.camas) ? (
                    <Text style={s.espacoMeta} numberOfLines={1}>
                      {[e.capacidade ? `${e.capacidade} pessoas` : null, e.camas].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                  {e.tipo === 'quarto' && !!e.caracteristicas?.length && (
                    <Text style={s.espacoMeta} numberOfLines={2}>{e.caracteristicas.slice(0, 4).map(rotuloTag).join(' · ')}</Text>
                  )}
                  {e.preco_de != null && <Text style={s.espacoPreco}>a partir de R$ {Number(e.preco_de).toFixed(0)}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {proximos.length > 0 && (
        <View style={{ marginTop: 22 }}>
          <Text style={s.titulo}>Locais próximos</Text>
          <Text style={s.legenda}>Distâncias calculadas pelo mapa, em linha reta.</Text>
          <View style={s.listaProx}>
            {proximosVisiveis.map((p, i) => {
              const info = INFO_TIPO[p.tipo];
              const ape = tempoAPe(p.distancia);
              const Linha: any = p.localId ? TouchableOpacity : View;
              return (
                <Linha
                  key={p.chave}
                  style={[s.proxLinha, i > 0 && s.proxDivisor]}
                  {...(p.localId ? { onPress: () => router.push(`/business/${p.localId}`), activeOpacity: 0.8 } : {})}
                >
                  <View style={s.proxIcone}>
                    <Feather name={(info?.icone as any) || 'map-pin'} size={14} color={C.lilas} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.proxTipo}>{info?.label || rotuloTag(p.tipo)}</Text>
                    <Text style={s.proxNome} numberOfLines={1}>
                      {p.nome}
                      {p.validado ? '  ✓' : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.proxDist}>{formatarDistancia(p.distancia)}</Text>
                    {ape && <Text style={s.proxApe}>{ape}</Text>}
                  </View>
                </Linha>
              );
            })}
          </View>
          {proximos.length > 6 && (
            <TouchableOpacity onPress={() => setVerTodosProximos((v) => !v)} style={{ marginTop: 10 }}>
              <Text style={s.link}>{verTodosProximos ? 'Ver menos' : `Ver todos (${proximos.length})`}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tipoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tipoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.lilas + '60', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  tipoTexto: { color: C.lilas, fontSize: 12, fontWeight: '800' },
  titulo: { color: C.texto, fontSize: 15, fontWeight: '800' },
  legenda: { color: C.sub, fontSize: 11, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipTexto: { color: '#D0D0E0', fontSize: 12, fontWeight: '700' },
  link: { color: C.lilas, fontSize: 12, fontWeight: '800' },
  abas: { flexDirection: 'row', gap: 8, marginTop: 10 },
  aba: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.borda },
  abaAtiva: { backgroundColor: '#7E57C2', borderColor: '#7E57C2' },
  abaTexto: { color: C.sub, fontSize: 12, fontWeight: '800' },
  espacosLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  espacoCard: { width: '48%', backgroundColor: C.card, borderWidth: 1, borderColor: C.borda, borderRadius: 14, overflow: 'hidden' },
  espacoFoto: { width: '100%', height: 100, backgroundColor: '#0B0B0E' },
  semFoto: { alignItems: 'center', justifyContent: 'center' },
  espacoNome: { color: C.texto, fontSize: 12, fontWeight: '800' },
  espacoDesc: { color: C.sub, fontSize: 11, marginTop: 2, lineHeight: 15 },
  espacoMeta: { color: '#D0D0E0', fontSize: 10, marginTop: 4 },
  espacoPreco: { color: C.verde, fontSize: 12, fontWeight: '800', marginTop: 6 },
  infoCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borda, borderRadius: 14, padding: 12, marginTop: 12, gap: 10 },
  infoLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoTexto: { color: '#D0D0E0', fontSize: 12, lineHeight: 17, flex: 1 },
  btnReserva: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#7E57C2', borderRadius: 12, padding: 12, marginTop: 4 },
  btnReservaTitulo: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  btnReservaSub: { color: '#E6DDF7', fontSize: 11, marginTop: 1 },
  listaProx: { backgroundColor: C.card, borderWidth: 1, borderColor: C.borda, borderRadius: 14, marginTop: 10, paddingHorizontal: 12 },
  proxLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  proxDivisor: { borderTopWidth: 1, borderTopColor: C.borda },
  proxIcone: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#0B0B0E', alignItems: 'center', justifyContent: 'center' },
  proxTipo: { color: C.texto, fontSize: 12, fontWeight: '800' },
  proxNome: { color: C.sub, fontSize: 12, marginTop: 1 },
  proxDist: { color: C.texto, fontSize: 12, fontWeight: '800' },
  proxApe: { color: C.sub, fontSize: 10, marginTop: 1 },
});
