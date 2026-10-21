// Rodada 76 — "Ajuda & Denunciar" agora é a porta de entrada do registro de
// ocorrências (migration 045): orienta sobre canais oficiais, abre o registro
// com protocolo e leva para o acompanhamento.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../lib/authContext';
import { CANAIS } from '../lib/ocorrencias';

export default function DenunciarScreen() {
  const router = useRouter();
  const { session } = useAuth();

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Ajuda & Denúncia</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
          <View style={styles.urgente}>
            <View style={styles.urgenteTopo}>
              <Feather name="alert-triangle" size={16} color="#FF6B6B" />
              <Text style={styles.urgenteTitulo}>Está em perigo agora?</Text>
            </View>
            <Text style={styles.urgenteTexto}>
              Ligue 190 (Polícia Militar) e, se puder, vá para um lugar seguro. O Dicas LGBT+ não é
              órgão policial e não atende emergências.
            </Text>
            <View style={styles.linhaBotoes}>
              <TouchableOpacity style={styles.btnUrgente} onPress={() => Linking.openURL(CANAIS.emergencia)}>
                <Feather name="phone-call" size={14} color="#FFF" />
                <Text style={styles.btnUrgenteTxt}>Ligar 190</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecundario} onPress={() => Linking.openURL(CANAIS.disque100)}>
                <Feather name="phone" size={14} color="#FFF" />
                <Text style={styles.btnUrgenteTxt}>Disque 100</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.nota}>
              O Disque 100 (Direitos Humanos) é gratuito, funciona todos os dias, 24 horas, e também
              atende por WhatsApp.
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(CANAIS.disque100Whats)}>
              <Text style={styles.link}>Abrir WhatsApp do Disque 100</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cartao}
            activeOpacity={0.8}
            onPress={() => router.push('/ocorrencia/nova')}
          >
            <View style={styles.icone}>
              <Feather name="file-text" size={18} color="#E1306C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartaoTitulo}>Registrar uma ocorrência</Text>
              <Text style={styles.cartaoTexto}>
                Conte o que aconteceu com data, local e provas. Você recebe um protocolo e um resumo
                organizado para levar ao registro do Boletim de Ocorrência.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#8A8AA0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cartao}
            activeOpacity={0.8}
            onPress={() => router.push('/ocorrencia')}
          >
            <View style={styles.icone}>
              <Feather name="clock" size={18} color="#E1306C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartaoTitulo}>Minhas ocorrências</Text>
              <Text style={styles.cartaoTexto}>Acompanhe o andamento e converse com a equipe pelo protocolo.</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#8A8AA0" />
          </TouchableOpacity>

          {!session && (
            <View style={styles.aviso}>
              <Feather name="lock" size={14} color="#A0A0B2" />
              <Text style={styles.avisoTxt}>
                Para registrar e acompanhar, entre na sua conta (aba Perfil). O login garante que só
                você e a equipe responsável vejam o seu relato.
              </Text>
            </View>
          )}

          <View style={styles.aviso}>
            <Feather name="shield" size={14} color="#A0A0B2" />
            <Text style={styles.avisoTxt}>
              Seu relato é tratado como informação sensível: só você e a equipe responsável do Dicas
              LGBT+ têm acesso, e nada é publicado. O registro aqui não substitui o Boletim de
              Ocorrência feito na delegacia ou no serviço online da Polícia Civil, que é o que dá
              início a uma investigação.
            </Text>
          </View>

          <View style={styles.aviso}>
            <Feather name="flag" size={14} color="#A0A0B2" />
            <Text style={styles.avisoTxt}>
              Quer denunciar um local ou avaliação específica? Abra a página dele e use o botão de
              denúncia.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  urgente: { backgroundColor: '#2A1519', borderRadius: 14, borderWidth: 1, borderColor: '#5A2A31', padding: 14, gap: 10 },
  urgenteTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgenteTitulo: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  urgenteTexto: { color: '#E3C9CD', fontSize: 13, lineHeight: 19 },
  linhaBotoes: { flexDirection: 'row', gap: 10 },
  btnUrgente: { flex: 1, flexDirection: 'row', gap: 8, backgroundColor: '#D6334A', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnSecundario: { flex: 1, flexDirection: 'row', gap: 8, backgroundColor: '#3A2A31', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnUrgenteTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  nota: { color: '#C9B3B7', fontSize: 12, lineHeight: 17 },
  link: { color: '#FF9DB8', fontSize: 12, fontWeight: '700' },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1C1B26', borderRadius: 14, borderWidth: 1, borderColor: '#2D2B3D', padding: 14 },
  icone: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#2A1B2A', justifyContent: 'center', alignItems: 'center' },
  cartaoTitulo: { color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  cartaoTexto: { color: '#A0A0B2', fontSize: 12, lineHeight: 17 },
  aviso: { flexDirection: 'row', gap: 10, backgroundColor: '#1C1B26', borderRadius: 10, borderWidth: 1, borderColor: '#2D2B3D', padding: 12 },
  avisoTxt: { color: '#A0A0B2', fontSize: 12, lineHeight: 18, flex: 1 },
});
