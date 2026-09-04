import { Platform, Share } from 'react-native';

interface ShareableItem {
  id: string;
  name: string;
  category: string;
  neighborhood?: string;
}

export async function shareItem(item: ShareableItem) {
  try {
    const slug = encodeURIComponent(item.name.toLowerCase().replace(/\s+/g, '-'));
    const shareUrl = `https://dicaslgbt.app/e/${slug}`;
    const message = `Dá uma olhada no ${item.name} (${item.category})! Encontrei no app Dicas LGBT 🌈`;

    await Share.share({
      title: item.name,
      message: Platform.OS === 'ios' ? message : `${message}\n${shareUrl}`,
      url: Platform.OS === 'ios' ? shareUrl : undefined,
    });
  } catch (error) {
    console.error('Erro ao abrir o menu de compartilhamento:', error);
  }
}