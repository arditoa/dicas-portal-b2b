// Prévia da festa como o cliente vê. ESPELHO do app cliente (mesmas medidas e cores):
//   LinhaFestaPrevia    → renderEventCard em src/app/(tabs)/events.tsx (lista da aba Eventos)
//   DestaqueFestaPrevia → quadradinho de "Festas em destaque" (só o flyer; sem flyer, ícone + nome)
//   TopoFestaPrevia     → topo de src/app/evento/[id].tsx (flyer com fundo desfocado, selos, título)
// Se mudar lá, mude aqui.
// Cores, textura, chamada e destaques ainda NÃO aparecem no app cliente (ele só lê foto_capa_url): a prévia
// mostra esses campos numa faixa à parte, avisando que chegam quando o app cliente for atualizado.
import { Feather } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const COLORS = { card: '#161520', textPrimary: '#FFFFFF', textSecondary: '#A0A0B2', pink: '#E1306C', gold: '#FFD54F', green: '#4CAF7D' };
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const horaCurta = (iso: string) => { const d = new Date(iso); return d.getMinutes() ? `${d.getHours()}h${pad2(d.getMinutes())}` : `${d.getHours()}h`; };
const diaCurto = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  if (d.toDateString() === hoje.toDateString()) return 'hoje';
  if (d.toDateString() === amanha.toDateString()) return 'amanhã';
  return `${DIAS[d.getDay()].slice(0, 3)} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
};

export function LinhaFestaPrevia({ titulo, inicio, nomeLocal, ondeLocal, listaVip, destaque }: {
  titulo: string; inicio: string | null; nomeLocal: string; ondeLocal?: string; listaVip: boolean; destaque: boolean;
}) {
  return (
    <View style={[s.eventCard, destaque && s.eventCardDestaque]}>
      <View style={s.eventHora}>
        <Text style={s.eventHoraTxt}>{inicio ? horaCurta(inicio) : '--'}</Text>
        <Text style={s.eventDiaTxt}>{inicio ? diaCurto(inicio) : 'data'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.eventTitle} numberOfLines={1}>{titulo || 'Nome da festa'}</Text>
        <Text style={s.eventLocation} numberOfLines={1}>{ondeLocal ? `${nomeLocal} · ${ondeLocal}` : nomeLocal}</Text>
      </View>
      {listaVip ? (
        <View style={s.guestListBadge}><Text style={s.guestListBadgeText}>lista VIP</Text></View>
      ) : destaque ? (
        <Feather name="star" size={14} color={COLORS.gold} />
      ) : (
        <Feather name="chevron-right" size={16} color="#606070" />
      )}
    </View>
  );
}

export function DestaqueFestaPrevia({ foto, titulo }: { foto: string | null; titulo: string }) {
  return (
    <View style={s.festaPagaCard}>
      {foto ? (
        <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={s.festaSemFlier}>
          <Feather name="music" size={18} color="rgba(255,255,255,0.5)" />
          <Text style={s.festaSemFlierTxt} numberOfLines={3}>{titulo || 'Nome da festa'}</Text>
        </View>
      )}
    </View>
  );
}

export function TopoFestaPrevia({ foto, titulo, listaVip, destaque }: { foto: string | null; titulo: string; listaVip: boolean; destaque: boolean }) {
  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.card }}>
      <View style={s.flierBox}>
        {foto ? (
          <>
            <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={30} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11,11,14,0.55)' }]} />
            <Image source={{ uri: foto }} style={s.flier} resizeMode="contain" />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, s.centro, { backgroundColor: '#2A1530' }]}>
            <Feather name="music" size={36} color={COLORS.pink} />
          </View>
        )}
      </View>
      <View style={{ padding: 14 }}>
        <View style={s.selos}>
          <View style={[s.selo, { backgroundColor: COLORS.pink }]}><Text style={[s.seloTxt, { color: '#FFF' }]}>FESTA</Text></View>
          {destaque && <View style={[s.selo, { backgroundColor: '#FF9142' }]}><Text style={[s.seloTxt, { color: '#000' }]}>DESTAQUE</Text></View>}
          {listaVip && <View style={[s.selo, { backgroundColor: 'rgba(76,175,125,0.18)' }]}><Text style={[s.seloTxt, { color: COLORS.green }]}>NOME NA LISTA</Text></View>}
        </View>
        <Text style={s.titulo} numberOfLines={2}>{titulo || 'Nome da festa'}</Text>
      </View>
    </View>
  );
}

// Visual novo (cores, textura, chamada, destaques): ainda não aparece no app cliente.
export function VisualNovoPrevia({ cores, textura, chamada, destaques }: { cores: [string, string] | null; textura: string | null; chamada: string; destaques: string[] }) {
  if (!cores && !textura && !chamada.trim() && !destaques.length) return null;
  const id = `pf${(cores || ['#000000', '#000000']).join('').replace(/#/g, '')}`;
  return (
    <View style={s.novo}>
      {cores && (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={cores[0]} />
              <Stop offset="1" stopColor={cores[1]} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      )}
      {!!textura && <Text style={s.textura}>Textura: {textura}</Text>}
      {!!chamada.trim() && <Text style={s.chamada}>{chamada.trim()}</Text>}
      {destaques.length > 0 && (
        <View style={s.chips}>
          {destaques.map((d) => <View key={d} style={s.chip}><Text style={s.chipTxt}>{d}</Text></View>)}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, gap: 12 },
  eventCardDestaque: { borderWidth: 1, borderColor: 'rgba(246,196,83,0.35)' },
  eventHora: { width: 52, alignItems: 'center' },
  eventHoraTxt: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  eventDiaTxt: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, marginTop: 1 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  eventLocation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  guestListBadge: { backgroundColor: 'rgba(76, 175, 125, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  guestListBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.green },
  festaPagaCard: { width: 104, height: 130, borderRadius: 12, overflow: 'hidden', backgroundColor: '#2A1B3D' },
  festaSemFlier: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
  festaSemFlierTxt: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  flierBox: { height: 260, backgroundColor: '#1A1926', overflow: 'hidden' },
  flier: { position: 'absolute', top: 14, bottom: 10, left: 16, right: 16 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  selo: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  seloTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  titulo: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900' },
  novo: { borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.card, padding: 14, gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3A3950' },
  textura: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },
  chamada: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
