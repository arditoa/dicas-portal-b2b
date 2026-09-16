import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useVipList } from '../../hooks/useVipList';
import { doorService } from '../../services/doorService';

export default function DoorControlScreen() {
  const eventId = 'evento-exemplo-id';
  const venueId = 'bar-exemplo-id';

  const { guests, toggleCheckIn, loading, refetch } = useVipList(eventId);
  const [search, setSearch] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [loadingCoupon, setLoadingCoupon] = useState(false);

  const filteredGuests = guests.filter(g =>
    g.full_name.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setLoadingCoupon(true);
    try {
      const coupon = await doorService.validateCouponCode(couponCode, venueId);
      Alert.alert(
        'Cupom Válido! 🎉',
        `Título: ${coupon.title}\nDesconto: ${coupon.discount_percent}%\n\nDeseja confirmar o resgate?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Dar Baixa',
            onPress: async () => {
              await doorService.redeemCoupon(coupon.id);
              Alert.alert('Sucesso', 'Cupom utilizado!');
              setCouponCode('');
            }
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoadingCoupon(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Controle de Portaria & Caixa</Text>

      {/* Validador de Cupom */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎟️ Validar Cupom de Desconto</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="CÓDIGO (ex: VIP20)"
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.btnValidate} onPress={handleValidateCoupon} disabled={loadingCoupon}>
            <Text style={styles.btnText}>Validar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Busca Lista VIP */}
      <View style={[styles.card, { flex: 1 }]}>
        <Text style={styles.cardTitle}>📋 Check-in Lista VIP</Text>
        <TextInput
          style={styles.input}
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          data={filteredGuests}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const isChecked = item.status === 'checked_in';
            return (
              <View style={styles.guestItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>{item.full_name}</Text>
                  <Text style={styles.guestEmail}>{item.email}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.btnCheckin, isChecked && styles.btnChecked]}
                  onPress={() => toggleCheckIn(item.id, item.status)}
                >
                  <Text style={styles.btnCheckinText}>{isChecked ? 'ENTROU ✓' : 'ENTRADA'}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum nome encontrado.</Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc', paddingTop: 50 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#fff' },
  btnValidate: { backgroundColor: '#7c3aed', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  guestItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  guestName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  guestEmail: { fontSize: 12, color: '#64748b' },
  btnCheckin: { backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  btnChecked: { backgroundColor: '#22c55e' },
  btnCheckinText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 20 }
});