import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { submitCheckin } from '../lib/api';

interface CheckinButtonProps {
  businessId: string;
  onSuccess?: () => void;
}

export function CheckinButton({ businessId, onSuccess }: CheckinButtonProps) {
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const handleCheckin = async () => {
    try {
      setLoading(true);
      await submitCheckin(businessId);
      setCheckedIn(true);
      Alert.alert('🎉 Check-in Realizado!', 'Sua presença foi confirmada e somou +10 pontos no seu perfil!');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      Alert.alert('Atenção', error.message || 'Erro ao registrar check-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, checkedIn && styles.buttonDone]}
      onPress={handleCheckin}
      disabled={loading || checkedIn}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.text}>
          {checkedIn ? '✅ Presença Confirmada!' : '📍 Confirmar Check-in'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF2D78',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDone: {
    backgroundColor: '#10B981',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
