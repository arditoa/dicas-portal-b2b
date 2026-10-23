import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLORS = {
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
  gold: '#FFD54F',
};

// Bloco "Destaques" da Home: um parceiro patrocinado por vez, trocando a cada
// hora (o rodízio é decidido na Home). Cartão fino: foto 1:1 à esquerda, nome,
// bairro · categoria, oferta (só se houver oferta válida) e botão pílula.
export type ParceiroHora = {
  id: string;
  nome: string;
  foto: string | null;
  ehLogo: boolean;
  bairro: string;
  categoria: string;
  oferta: string | null;
  botao: string;
};

type Props = {
  parceiro: ParceiroHora;
  fimDoSlot: number; // instante (ms) em que o slot acaba
  inicioDoSlot: number;
  tagTexto: string;
  rotulos: { rotacionaEm: string; ativoAgora: string; botao: string };
  onAbrir: () => void;
};

export default function DestaqueHora({ parceiro, fimDoSlot, inicioDoSlot, tagTexto, rotulos, onAbrir }: Props) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const restanteMin = Math.max(1, Math.ceil((fimDoSlot - agora) / 60000));
  const recemTrocou = agora - inicioDoSlot < 5 * 60000;
  const status = recemTrocou ? rotulos.ativoAgora : rotulos.rotacionaEm.replace('{m}', String(restanteMin));

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.9}
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`${parceiro.nome}. ${parceiro.oferta || ''}`}
    >
      <View style={[s.foto, parceiro.ehLogo && { backgroundColor: '#FFFFFF' }]}>
        {parceiro.foto ? (
          <Image
            source={{ uri: parceiro.foto }}
            style={parceiro.ehLogo ? { width: '80%', height: '80%' } : { width: '100%', height: '100%' }}
            resizeMode={parceiro.ehLogo ? 'contain' : 'cover'}
          />
        ) : (
          <Feather name="star" size={22} color={COLORS.gold} />
        )}
      </View>
      <View style={s.corpo}>
        <Text style={s.nome} numberOfLines={1}>{parceiro.nome}</Text>
        <Text style={s.linha} numberOfLines={1}>{[parceiro.bairro, parceiro.categoria].filter(Boolean).join(' · ')}</Text>
        {!!parceiro.oferta && <Text style={s.oferta} numberOfLines={2}>{parceiro.oferta}</Text>}
        <View style={s.rodape}>
          <Text style={s.status} numberOfLines={1}>{status}</Text>
          <View style={s.botao}>
            <Text style={s.botaoTexto} numberOfLines={1}>{rotulos.botao}</Text>
          </View>
        </View>
      </View>
      <View style={s.tag}>
        <Text style={s.tagTexto}>{tagTexto}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  foto: { width: 84, height: 84, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A22' },
  corpo: { flex: 1, minWidth: 0, justifyContent: 'center' },
  nome: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, paddingRight: 84 },
  linha: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  oferta: { fontSize: 12, fontWeight: '600', color: COLORS.gold, marginTop: 4 },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  status: { flex: 1, fontSize: 11, color: COLORS.textMuted },
  botao: { height: 30, paddingHorizontal: 14, borderRadius: 999, backgroundColor: COLORS.pink, alignItems: 'center', justifyContent: 'center' },
  botaoTexto: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  tag: { position: 'absolute', top: 10, right: 10, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: COLORS.purple },
  tagTexto: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 },
});
