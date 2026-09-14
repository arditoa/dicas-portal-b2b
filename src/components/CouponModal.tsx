import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface CouponModalProps {
  visible: boolean;
  onClose: () => void;
  estabelecimento: string;
  tituloCupom: string;
  codigo: string;
}

export function CouponModal({
  visible,
  onClose,
  estabelecimento,
  tituloCupom,
  codigo,
}: CouponModalProps) {
  const [usado, setUsado] = useState(false);

  const handleConfirmarUso = () => {
    Alert.alert(
      'Confirmar Uso',
      'Você confirma que apresentou este cupom no estabelecimento e o desconto foi aplicado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, confirmar',
          onPress: () => {
            setUsado(true);
            setTimeout(() => {
              onClose();
              setUsado(false);
            }, 1500);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color="#A0A0B2" />
          </TouchableOpacity>

          <View style={styles.badgeTag}>
            <Text style={styles.badgeText}>CUPOM EXCLUSIVO LGBT+</Text>
          </View>

          <Text style={styles.placeName}>{estabelecimento}</Text>
          <Text style={styles.couponTitle}>{tituloCupom}</Text>

          {/* QR CODE PARA ESCANEAR NO LOCAL */}
          <View style={styles.qrContainer}>
            <QRCode value={codigo} size={140} backgroundColor="#FFFFFF" color="#0B0B0E" />
          </View>

          <Text style={styles.codeLabel}>CÓDIGO DE VALIDAÇÃO</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{codigo}</Text>
          </View>

          <Text style={styles.instruction}>
            Apresente a tela do seu celular para o atendente ou garçom no momento do pagamento.
          </Text>

          <TouchableOpacity
            style={[styles.confirmBtn, usado && styles.confirmBtnSuccess]}
            onPress={handleConfirmarUso}
            disabled={usado}
          >
            <Feather name={usado ? "check-circle" : "check"} size={16} color="#FFF" />
            <Text style={styles.confirmBtnText}>
              {usado ? 'Cupom Utilizado!' : 'Marcar como Utilizado'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', backgroundColor: '#161520', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#232230' },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  badgeTag: { backgroundColor: 'rgba(255, 213, 79, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFD54F' },
  placeName: { fontSize: 13, color: '#A0A0B2', fontWeight: '600' },
  couponTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center', marginTop: 2, marginBottom: 16 },
  qrContainer: { padding: 12, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16 },
  codeLabel: { fontSize: 10, fontWeight: '700', color: '#626274', letterSpacing: 1 },
  codeBox: { backgroundColor: '#0B0B0E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#232230', marginVertical: 6 },
  codeText: { fontSize: 16, fontWeight: '800', color: '#E1306C', letterSpacing: 2 },
  instruction: { fontSize: 11, color: '#A0A0B2', textAlign: 'center', marginVertical: 12, lineHeight: 16 },
  confirmBtn: { width: '100%', height: 44, backgroundColor: '#E1306C', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 },
  confirmBtnSuccess: { backgroundColor: '#4CAF7D' },
  confirmBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});