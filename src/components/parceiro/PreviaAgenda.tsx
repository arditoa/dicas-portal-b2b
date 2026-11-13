// Prévia da agenda como o cliente vê em Eventos › Essa semana.
// ESPELHO de renderAgendaBar / renderCartaz em src/app/(tabs)/events.tsx (mesmas medidas e cores).
// Se mudar o cartão lá, mude aqui.
import { Feather } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';

// Mesmas cores de COLORS em src/app/(tabs)/events.tsx.
const COLORS = {
  background: '#0B0B0E', card: '#161520', border: '#232230', textPrimary: '#FFFFFF', textSecondary: '#A0A0B2',
  pink: '#E1306C', purple: '#7E57C2', gold: '#FFD54F',
};

export function CartaoAgendaPrevia({ titulo, horario, descricao, foto_url, link, nomeLocal, ondeLocal, dia }: {
  titulo: string; horario?: string; descricao?: string; foto_url?: string; link?: string; nomeLocal: string; ondeLocal?: string; dia?: string;
}) {
  return (
    <View>
      {!!dia && <Text style={s.dia}>{dia}</Text>}
      <View style={s.eventCard}>
        <View style={s.eventThumb}>
          {foto_url ? <Image source={{ uri: foto_url }} style={s.eventThumbImg} /> : <Feather name="music" size={20} color={COLORS.purple} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.eventHeaderRow}>
            <Text style={s.eventDate}>{horario || 'Programação do dia'}</Text>
            <View style={s.agendaBadge}><Text style={s.agendaBadgeText}>AGENDA DO BAR</Text></View>
          </View>
          <Text style={s.eventTitle}>{titulo || 'O que rola?'}</Text>
          <Text style={s.eventLocation}>{ondeLocal ? `${nomeLocal} • ${ondeLocal}` : nomeLocal}</Text>
          {!!descricao && <Text style={s.agendaDesc} numberOfLines={2}>{descricao}</Text>}
          {!!link && <Text style={s.agendaLink}>Ver mais</Text>}
        </View>
        <Feather name="chevron-right" size={18} color="#606070" />
      </View>
    </View>
  );
}

export function CartazPrevia({ foto_url, descricao, nomeLocal, ondeLocal }: { foto_url?: string; descricao?: string; nomeLocal: string; ondeLocal?: string }) {
  return (
    <View style={s.cartazCard}>
      {!!foto_url && <Image source={{ uri: foto_url }} style={s.cartazImg} resizeMode="cover" />}
      <View style={{ padding: 12 }}>
        <View style={s.eventHeaderRow}>
          <Text style={s.eventDate}>PROGRAMAÇÃO DA SEMANA</Text>
          <View style={s.agendaBadge}><Text style={s.agendaBadgeText}>AGENDA DO BAR</Text></View>
        </View>
        <Text style={s.eventTitle}>{nomeLocal}</Text>
        {!!ondeLocal && <Text style={s.eventLocation}>{ondeLocal}</Text>}
        {!!descricao && !foto_url && <Text style={s.agendaDesc} numberOfLines={4}>{descricao}</Text>}
        <Text style={s.agendaLink}>Toque para ver a programação completa</Text>
      </View>
    </View>
  );
}

// Faixa "Festas em destaque": com foto mostra só a foto; sem foto, ícone + nome (regra da 101).
export function DestaquePrevia({ foto_url, titulo }: { foto_url?: string; titulo: string }) {
  return (
    <View style={s.destaque}>
      {foto_url ? (
        <Image source={{ uri: foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={s.destaqueSem}>
          <Feather name="star" size={18} color={COLORS.gold} />
          <Text style={s.destaqueTxt} numberOfLines={3}>{titulo}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  dia: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 4 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, gap: 12, marginBottom: 8 },
  eventThumb: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(225, 48, 108, 0.12)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  eventThumbImg: { width: 48, height: 48 },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  eventDate: { fontSize: 11, fontWeight: '700', color: COLORS.pink },
  eventTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  eventLocation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  agendaBadge: { backgroundColor: 'rgba(126,87,194,0.22)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  agendaBadgeText: { fontSize: 8, fontWeight: '800', color: '#B39DDB', letterSpacing: 0.5 },
  agendaDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  agendaLink: { fontSize: 12, fontWeight: '700', color: COLORS.pink, marginTop: 6 },
  cartazCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  cartazImg: { width: '100%', height: 190, backgroundColor: '#0B0B0E' },
  destaque: { width: 120, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.card, borderWidth: 1, borderColor: 'rgba(246,196,83,0.35)' },
  destaqueSem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  destaqueTxt: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
