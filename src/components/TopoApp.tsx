// Topo único do app: logo + frase à esquerda; cidade e idioma à direita (o mesmo da Home) em TODAS as telas.
// A seta de voltar aparece em todas as telas (menos na Home), só o ícone, sem caixa. A frase do logo fica só na Home:
// com seta + logo + cidade + idioma, ela batia no botão da cidade.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCidadeAtual } from '../hooks/useCidadeAtual';
import { IDIOMAS, useI18n } from '../lib/i18n';
import MarcaApp from './MarcaApp';

const C = { card: '#161520', border: '#232230', text: '#FFFFFF' };

export default function TopoApp({ voltar = true, comInsets = true }: { voltar?: boolean; comInsets?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, idioma, proximoIdioma } = useI18n();
  const local = useCidadeAtual();
  const idiomaAtual = IDIOMAS.find((i) => i.code === idioma) || IDIOMAS[0];
  return (
    <View style={[s.topo, { paddingTop: (comInsets ? insets.top : 0) + 8 }]}>
      <View style={s.esquerda}>
        {voltar && (
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Feather name="arrow-left" size={22} color={C.text} />
          </TouchableOpacity>
        )}
        <MarcaApp semFrase />
      </View>
      <View style={s.direita}>
        <TouchableOpacity
          style={s.chip}
          activeOpacity={0.8}
          onPress={() => (local.autorizado ? router.push('/(tabs)/explore') : local.ativar())}
          accessibilityRole="button"
          accessibilityLabel={local.cidade ? `${t('home.voceEstaEm')} ${local.cidade}` : t('home.ativarLocalizacao')}
        >
          <Image source={require('../assets/images/pin-localizacao.png')} style={s.pin} resizeMode="contain" />
          <Text style={s.chipTxt} numberOfLines={1}>{local.cidade || t('home.localizacao')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.idioma}
          onPress={proximoIdioma}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${t('conta.idioma')}: ${idiomaAtual.nome}`}
        >
          <Feather name="globe" size={14} color={C.text} />
          <Text style={s.idiomaTxt}>{idiomaAtual.sigla}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 },
  esquerda: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  direita: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, maxWidth: 130, paddingHorizontal: 10, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  pin: { width: 18, height: 14 },
  chipTxt: { fontSize: 12, fontWeight: '700', color: C.text, flexShrink: 1 },
  idioma: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  idiomaTxt: { fontSize: 12, fontWeight: '800', color: C.text },
});
