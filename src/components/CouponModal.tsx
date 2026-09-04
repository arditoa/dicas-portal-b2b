import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';

export interface Cupom {
  id: string;
  codigo_cupom: string;
  titulo_oferta: string;
  descricao_regras?: string;
  desconto_porcentagem?: number;
  desconto_valor_fixo?: number;
  data_validade: string;
}

interface CouponModalProps {
  visible: boolean;
  cupom: Cupom | null;
  onClose: () => void;
}

export function CouponModal({ visible, cupom, onClose }: CouponModalProps) {
  const [copiado, setCopiado] = useState(false);

  if (!cupom) return null;

  const handleCopiar = () => {
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.badge}>🏷️ OFERTA EXCLUSIVA</Text>
          <Text style={styles.title}>{cupom.titulo_oferta}</Text>
          
          <Text style={styles.discountText}>
            {cupom.desconto_porcentagem ? `${cupom.desconto_porcentagem}% OFF` : `R$ ${cupom.desconto_valor_fixo} OFF`}
          </Text>

          {/* Caixas do Codigo */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{cupom.codigo_cupom}</Text>
          </View>

          {cupom.descricao_regras ? (
            <Text style={styles.regras}>Regras: {cupom.descricao_regras}</Text>
          ) : null}

          <Text style={styles.validade}>
            Válido até: {new Date(cupom.data_validade).toLocaleDateString('pt-BR')}
          </Text>

          <TouchableOpacity style={styles.copyButton} onPress={handleCopiar}>
            <Text style={styles.copyButtonText}>
              {copiado ? '✓ Código Copiado!' : 'Copiar Código do Cupom'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  badge: { backgroundColor: '#ECFDF5', color: '#059669', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', textAlign: 'center' },
  discountText: { fontSize: 28, fontWeight: '900', color: '#059669', marginVertical: 8 },
  codeContainer: { backgroundColor: '#F1F5F9', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginVertical: 12 },
  codeText: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', letterSpacing: 2 },
  regras: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 4 },
  validade: { fontSize: 12, color: '#94A3B8', marginBottom: 20 },
  copyButton: { backgroundColor: '#059669', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  copyButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  closeButton: { paddingVertical: 12, marginTop: 8 },
  closeButtonText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});
