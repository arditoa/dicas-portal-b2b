import { Platform } from 'react-native';

export function triggerImpact(style: 'light' | 'medium' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    if (style === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // Graceful fallback se o módulo não estiver carregado
  }
}

export function triggerNotificationSuccess() {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Graceful fallback
  }
}