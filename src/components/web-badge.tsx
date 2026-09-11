import { StyleSheet, Text, View, useColorScheme } from 'react-native';

export default function WebBadge() {
  const scheme = useColorScheme();

  return (
    <View style={styles.container}>
      {/* Exibe o badge estilizado de forma nativa */}
      <View style={[styles.badge, scheme === 'dark' ? styles.badgeDark : styles.badgeLight]}>
        <Text style={styles.badgeText}>DICAS LGBT+</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeDark: {
    backgroundColor: '#1E1A29',
    borderColor: '#E1306C',
  },
  badgeLight: {
    backgroundColor: '#FFF',
    borderColor: '#E1306C',
  },
  badgeText: {
    color: '#E1306C',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
});