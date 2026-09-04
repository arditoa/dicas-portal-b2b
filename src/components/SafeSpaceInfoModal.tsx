import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SafeSpaceInfoModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <Text style={styles.title}>🛡️ O que é um "Safe Space"</Text>
          <Text style={styles.body}>
            Locais com este selo passaram por uma checagem da nossa equipe e por
            avaliações da comunidade que confirmam um ambiente acolhedor para o
            público LGBT+. Revisamos o selo periodicamente com base em novas
            avaliações — ele pode ser removido se o padrão não for mantido.
          </Text>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeLabel}>Entendi</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default SafeSpaceInfoModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.card,
    borderTopRightRadius: theme.borderRadius.card,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: theme.typography.name.fontSize,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  body: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  closeButton: {
    marginTop: 8,
    minHeight: theme.touchTarget.minHeight,
    borderRadius: theme.borderRadius.button,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
});