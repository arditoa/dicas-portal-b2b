import { Alert, Linking, Share } from 'react-native';

// Número oficial de suporte/parcerias
const WHATSAPP_NUMBER = '5511942942028';

export const actionsService = {
  // 1. Indicar Amigo (Compartilhamento Nativo / WhatsApp)
  indicarAmigo: async () => {
    const message = 'Descubra os melhores bares, festas e roteiros LGBT+ no nosso app! Baixe agora: https://lgbtapp.com.br';
    try {
      await Share.share({ message });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar no momento.');
    }
  },

  // 2. Cadastrar Estabelecimento via WhatsApp Oficial
  cadastrarEstabelecimento: () => {
    const text = encodeURIComponent('Olá! Gostaria de cadastrar meu estabelecimento no App LGBT+.');
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp no seu dispositivo.');
    });
  },

  // 3. Suporte, Dúvidas e Notificações via WhatsApp Oficial
  suporteAtendimento: () => {
    const text = encodeURIComponent('Olá! Gostaria de tirar uma dúvida ou enviar uma sugestão para o App LGBT+.');
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp no seu dispositivo.');
    });
  },
};