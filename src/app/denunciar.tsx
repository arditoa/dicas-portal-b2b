import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';

export default function DenunciarScreen() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!session || !user) {
      Alert.alert(
        'Faça login primeiro',
        'Você precisa estar logado para enviar uma denúncia ou pedido de ajuda. Vá até a aba Perfil para entrar ou criar sua conta.'
      );
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Atenção', 'Descreva o que aconteceu antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      // Esta tela é um canal geral de ajuda/denúncia (não um "denunciar este
      // local/evento específico" — isso seria outro fluxo, ainda não existe
      // no app). Como a tabela denuncias exige um alvo_tipo/alvo_id, usamos
      // 'usuario' apontando pro próprio perfil de quem denuncia como
      // placeholder pragmático — o motivo e a descrição deixam claro que é
      // um pedido de ajuda/denúncia geral, não sobre o próprio usuário.
      const { error } = await supabase.from('denuncias').insert({
        reporter_id: user.id,
        alvo_tipo: 'usuario',
        alvo_id: user.id,
        motivo: 'Ajuda / denúncia geral enviada pelo app',
        descricao: reason.trim(),
      });

      if (error) throw error;

      Alert.alert(
        'Denúncia enviada',
        'Agradecemos sua colaboração. Nossa equipe vai analisar o que você relatou.'
      );
      router.back();
    } catch (err: any) {
      Alert.alert(
        'Não foi possível enviar',
        err?.message || 'Tente novamente em alguns instantes.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Obtenha Ajuda & Denunciar</Text>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {!session && (
            <View style={styles.loginNotice}>
              <Feather name="lock" size={14} color="#A0A0B2" />
              <Text style={styles.loginNoticeText}>
                Você precisa estar logado (aba Perfil) para enviar uma denúncia.
              </Text>
            </View>
          )}

          <Text style={styles.label}>Descreva o problema ou denúncia:</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Conte-nos o que aconteceu ou qual conteúdo viola as regras..."
            placeholderTextColor="#606070"
            multiline
            numberOfLines={5}
            value={reason}
            onChangeText={setReason}
            editable={!submitting}
          />

          <TouchableOpacity
            style={[styles.sendBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.sendText}>Enviar Denúncia</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  label: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  textArea: { backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', padding: 14, color: '#FFF', textAlignVertical: 'top', height: 120 },
  sendBtn: { backgroundColor: '#E1306C', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  loginNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1C1B26',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2B3D',
    padding: 10,
  },
  loginNoticeText: { color: '#A0A0B2', fontSize: 12, flex: 1 },
});
