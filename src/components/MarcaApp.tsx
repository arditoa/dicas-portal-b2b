import { Image, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../lib/i18n';

// Marca do app no topo de TODAS as telas: logo + "Conexões e Experiências LGBT+" bem juntinhos.
// O arquivo do logo é 1500x160 (proporção 9,4:1). Antes ele era desenhado numa caixa 140x34, e o
// "contain" deixava ~10 de vazio em cima e embaixo, o que afastava a frase do logo. Agora a caixa
// tem a altura real da imagem (140 de largura => 15 de altura), mantendo o tamanho visual.
export const LOGO_LARGURA = 140;
export const LOGO_ALTURA = Math.round((LOGO_LARGURA * 160) / 1500); // 15

export default function MarcaApp() {
  const { t } = useI18n();
  return (
    <View style={s.raiz}>
      <Image
        source={require('../assets/images/logolinear-semfundo.png')}
        style={s.logo}
        resizeMode="contain"
        accessibilityLabel="Dicas LGBT+"
      />
      <Text style={s.frase} numberOfLines={1}>{t('app.subtitulo')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { justifyContent: 'center' },
  logo: { width: LOGO_LARGURA, height: LOGO_ALTURA },
  frase: { fontSize: 11, fontWeight: '500', color: '#A0A0B2', marginTop: 3 },
});
