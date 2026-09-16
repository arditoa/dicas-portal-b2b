import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCoupons } from '../../hooks/useCoupons';

export default function CouponsScreen() {
  const venueId = 'bar-exemplo-id';
  const { coupons, loading, error, createCoupon, toggleStatus } = useCoupons(venueId);

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !code.trim() || !discountPercent.trim()) return;

    setSubmitting(true);
    const success = await createCoupon({
      venue_id: venueId,
      title,
      code: code.toUpperCase().trim(),
      discount_percent: Number(discountPercent),
      max_uses: maxUses ? Number(maxUses) : 100,
      is_active: true,
    });

    if (success) {
      setTitle('');
      setCode('');
      setDiscountPercent('');
      setMaxUses('');
    }
    setSubmitting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🎟️ Gestão de Cupons & Promoções</Text>

      <View style={styles.contentGrid}>
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Criar Novo Cupom</Text>

          <TextInput
            style={styles.input}
            placeholder="Título (ex: 20% OFF no Drink Especial)"
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Código (ex: LGBT20)"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Desconto (%)"
              value={discountPercent}
              onChangeText={setDiscountPercent}
              keyboardType="numeric"
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Limite de resgates (padrão: 100)"
            value={maxUses}
            onChangeText={setMaxUses}
            keyboardType="numeric"
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btnSubmit, submitting && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnSubmitText}>Lançar Cupom no App</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Cupons Cadastrados</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={coupons}
              keyExtractor={(item) => item.id!}
              renderItem={({ item }) => (
                <View style={styles.couponItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.couponTitle}>{item.title}</Text>
                    <Text style={styles.couponCode}>Código: <Text style={styles.codeBadge}>{item.code}</Text></Text>
                    <Text style={styles.couponMeta}>
                      {item.discount_percent}% OFF • Resgates: {item.used_count}/{item.max_uses}
                    </Text>
                  </View>

                  <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>{item.is_active ? 'Ativo' : 'Pausado'}</Text>
                    <Switch
                      value={item.is_active}
                      onValueChange={() => toggleStatus(item.id!, !!item.is_active)}
                    />
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Nenhum cupom cadastrado até o momento.</Text>
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: '#f8fafc' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  contentGrid: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  formCard: { flex: 1, minWidth: 320, backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  listCard: { flex: 1.5, minWidth: 360, backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  rowInputs: { flexDirection: 'row', gap: 10 },
  btnSubmit: { backgroundColor: '#7c3aed', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnSubmitText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 8 },
  couponItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  couponTitle: { fontWeight: 'bold', fontSize: 15, color: '#0f172a' },
  couponCode: { fontSize: 13, color: '#64748b', marginTop: 2 },
  codeBadge: { fontWeight: 'bold', color: '#7c3aed' },
  couponMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  switchContainer: { alignItems: 'center', gap: 4 },
  switchLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 20 }
});