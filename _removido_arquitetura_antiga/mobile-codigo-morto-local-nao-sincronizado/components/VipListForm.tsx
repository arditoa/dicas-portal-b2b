import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useVipList } from '../hooks/useVipList';

interface VipListFormProps {
  eventId: string;
  onSuccess?: () => void;
}

export function VipListForm({ eventId, onSuccess }: VipListFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const { registerGuest, loading, error, success } = useVipList(eventId);

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) return;
    try {
      await registerGuest(fullName, email);
      setFullName('');
      setEmail('');
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar na Lista VIP</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>Nome adicionado com sucesso!</Text>}

      <TextInput
        style={styles.input}
        placeholder="Nome Completo"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Confirmar Presença</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', borderRadius: 8 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#0f172a' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#7c3aed', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  errorText: { color: '#ef4444', marginBottom: 8, fontSize: 12 },
  successText: { color: '#22c55e', marginBottom: 8, fontSize: 12 }
});