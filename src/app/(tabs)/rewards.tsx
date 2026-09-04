import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, LAYOUT, RADIUS, TYPOGRAPHY } from '../../constants/theme';

const MY_REDEEMED_ITEMS = [
  {
    id: '1',
    type: 'coupon',
    title: '20% OFF em Drinks',
    venue: 'Bar da Mami',
    code: 'MAMI20',
    validUntil: 'Hoje até 23h',
  },
  {
    id: '2',
    type: 'vip',
    title: 'Rainbow Night',
    venue: 'Club Rainbow',
    validUntil: 'Sábado - Portaria até 21h',
  },
];

export default function RewardsScreen() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <Text style={TYPOGRAPHY.screenTitle}>Minha Carteira 🎟️</Text>
      <Text style={[TYPOGRAPHY.bodyMetadata, { marginBottom: 16 }]}>
        Seus cupons resgatados e presenças confirmadas.
      </Text>

      <FlatList
        data={MY_REDEEMED_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.badge}>
                {item.type === 'coupon' ? '🎟️ CUPOM' : '🎉 LISTA VIP'}
              </Text>
              <Text style={TYPOGRAPHY.captionTag}>{item.validUntil}</Text>
            </View>

            <Text style={TYPOGRAPHY.venueName}>{item.title}</Text>
            <Text style={TYPOGRAPHY.bodyMetadata}>📍 {item.venue}</Text>

            {item.type === 'coupon' ? (
              <TouchableOpacity
                style={styles.btnShowCode}
                onPress={() => setSelectedCode(item.code!)}
              >
                <Text style={styles.btnText}>Ver Código do Caixa</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.vipTag}>
                <Text style={styles.vipText}>✓ Nome na lista na portaria</Text>
              </View>
            )}
          </View>
        )}
      />

      <Modal visible={!!selectedCode} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apresente no Caixa</Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{selectedCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.btnClose}
              onPress={() => setSelectedCode(null)}
            >
              <Text style={styles.btnCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 50 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.card, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { backgroundColor: 'rgba(255, 111, 160, 0.15)', color: COLORS.accent, fontWeight: 'bold', fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  btnShowCode: { backgroundColor: COLORS.accent, padding: 12, borderRadius: RADIUS.pill, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  vipTag: { backgroundColor: 'rgba(146, 192, 155, 0.15)', padding: 10, borderRadius: RADIUS.pill, alignItems: 'center', marginTop: 12 },
  vipText: { color: COLORS.positive, fontWeight: 'bold', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, width: '100%', borderRadius: RADIUS.card, padding: 24, alignItems: 'center' },
  modalTitle: { ...TYPOGRAPHY.venueName, fontSize: 18, marginBottom: 16 },
  codeBox: { backgroundColor: COLORS.background, paddingHorizontal: 32, paddingVertical: 16, borderRadius: RADIUS.card, borderWidth: 1, borderColor: 'rgba(182, 166, 190, 0.2)', marginBottom: 20 },
  codeText: { fontSize: 28, fontWeight: 'bold', color: COLORS.accent, letterSpacing: 3 },
  btnClose: { backgroundColor: COLORS.accent, width: '100%', height: LAYOUT.minTouchTarget, borderRadius: RADIUS.pill, justifyContent: 'center', alignItems: 'center' },
  btnCloseText: { color: '#FFF', fontWeight: 'bold' }
});