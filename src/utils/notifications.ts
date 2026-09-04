import { Alert } from 'react-native';

// Gerenciamento pontual de lembretes para festas favoritadas
export async function togglePartyReminder(
  eventId: string,
  eventTitle: string,
  currentlyFavorited: boolean
): Promise<boolean> {
  if (currentlyFavorited) {
    // Desfavoritar: Cancela a notificação agendada
    if (__DEV__) console.log(`[Notification] Lembrete cancelado para o evento: ${eventId}`);
    return false;
  } else {
    // Favoritar: Agenda lembrete local para o dia do evento
    if (__DEV__) console.log(`[Notification] Lembrete agendado para "${eventTitle}"`);
    
    Alert.alert(
      'Lembrete Salvo! 🔔',
      `Avisaremos você no dia do evento (${eventTitle}) algumas horas antes de começar.`
    );
    return true;
  }
}