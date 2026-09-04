import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { doorService } from '../services/doorService';

export function DoorCheckin({ eventId }: { eventId: string }) {
  const [guests, setGuests] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const loadGuests = async () => {
    try {
      const data = await doorService.getEventGuests(eventId);
      setGuests(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadGuests(); }, [eventId]);

  const handleCheckIn = async (id: string) => {
    await doorService.checkInGuest(id);
    loadGuests();
  };

  const filteredGuests = guests.filter(g =>
    g.full_name.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚪 Portaria - Validação VIP</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredGuests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            {item.status === 'used' ? (
              <Text style={styles.statusDone}>✓ Entrou</Text>
            ) : (
              <TouchableOpacity style={styles.btn} onPress={() => handleCheckIn(item.id)}>
                <Text style={styles.btnText}>Dar Baixa</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#0f172a' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 8 },
  name: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  email: { color: '#64748b', fontSize: 13 },
  statusDone: { color: '#16a34a', fontWeight: 'bold' },
  btn: { backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});