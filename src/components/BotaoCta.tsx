// Botão padrão dos banners (design nov/2026): fundo branco, texto em CAIXA ALTA no degradê do logo e verbo no
// imperativo (CONHEÇA, VISITE, EXPLORE, DESCUBRA). Os textos que chegam do banco/admin no infinitivo
// ("Conhecer", "Explorar a Trip") são convertidos aqui, sem precisar editar cada banner.
import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import TextoDegrade, { CORES_MARCA } from './TextoDegrade';

const IMPERATIVO: Record<string, string> = {
  conhecer: 'Conheça',
  visitar: 'Visite',
  explorar: 'Explore',
  descobrir: 'Descubra',
  ver: 'Veja',
  acessar: 'Acesse',
  garantir: 'Garanta',
  aproveitar: 'Aproveite',
  reservar: 'Reserve',
  participar: 'Participe',
};

export function ctaImperativo(texto: string): string {
  const t = (texto || '').trim();
  if (!t) return 'Conheça';
  const [primeira, ...resto] = t.split(/\s+/);
  const imp = IMPERATIVO[primeira.toLowerCase()];
  return imp ? [imp, ...resto].join(' ') : t;
}

export default function BotaoCta({ texto, compacto = false }: { texto: string; compacto?: boolean }) {
  const rotulo = ctaImperativo(texto).toLocaleUpperCase('pt-BR');
  return (
    <View style={[s.btn, compacto && s.btnCompacto]}>
      <TextoDegrade tamanho={compacto ? 11 : 12} peso="900" espacamento={0.8}>{rotulo}</TextoDegrade>
      <Feather name="arrow-right" size={compacto ? 13 : 14} color={CORES_MARCA[CORES_MARCA.length - 1]} />
    </View>
  );
}

const s = StyleSheet.create({
  btn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 14, minHeight: 30 },
  btnCompacto: { paddingHorizontal: 11, minHeight: 26 },
});
