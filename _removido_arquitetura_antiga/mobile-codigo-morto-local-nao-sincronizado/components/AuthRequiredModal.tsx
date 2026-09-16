import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  actionText?: string;
}

export function AuthRequiredModal({ visible, onClose, actionText = 'para realizar esta ação' }: AuthModalProps) {
  const router = useRouter();

  const handleGoToAuth = (screen: '/auth/login' | '/auth/register') => {
    onClose();
    router.push(screen as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color="#A0A0B2" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Feather name="lock" size={24} color="#E1306C" />
          </View>

          <Text style={styles.title}>Crie sua conta ou entre</Text>
          <Text style={styles.sub}>
            Você precisa estar conectado {actionText}. É rápido, gratuito e seguro!
          </Text>

          {/* LOGIN COM APPLE (EXIGIDO PELA APPLE PARA APROVAÇÃO) */}
          <TouchableOpacity style={styles.appleBtn} onPress={() => handleGoToAuth('/auth/login')}>
            <Feather name="command" size={16} color="#FFF" />
            <Text style={styles.appleBtnText}>Continuar com a Apple</Text>
          </TouchableOpacity>

          {/* LOGIN COM E-MAIL */}
          <TouchableOpacity style={styles.emailBtn} onPress={() => handleGoToAuth('/auth/register')}>
            <Text style={styles.emailBtnText}>Criar conta com E-mail</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleGoToAuth('/auth/login')}>
            <Text style={styles.loginLink}>Já tem uma conta? Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', backgroundColor: '#161520', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#232230' },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(225,48,108,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  sub: { fontSize: 12, color: '#A0A0B2', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  appleBtn: { width: '100%', height: 44, backgroundColor: '#000', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#333', marginBottom: 10 },
  appleBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  emailBtn: { width: '100%', height: 44, backgroundColor: '#E1306C', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emailBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  loginLink: { fontSize: 12, color: '#7E57C2', fontWeight: '700', marginTop: 4 },
});