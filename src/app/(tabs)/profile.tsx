import { useAuth } from '@/lib/authContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header com a Logo Linear sem fundo e alinhamento sincronizado */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Image
          source={require('@/assets/images/logolinear-semfundo.png')}
          style={styles.logoLinear}
          resizeMode="contain"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Card Dinâmico: Navegação Anônima VS Usuário Autenticado */}
        {!user ? (
          <View style={styles.anonCard}>
            <View style={styles.anonHeaderRow}>
              <View style={styles.avatarCircle}>
                <Feather name="user" size={20} color="#A0A0B0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.anonTitle}>Navegação Anônima</Text>
                <Text style={styles.anonDesc}>
                  Seus dados estão protegidos enquanto você explora. Você pode favoritar locais e ver o mapa sem criar conta.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push('/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.loginBtnText}>Entrar / Cadastrar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.anonCard}>
            <View style={styles.anonHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: 'rgba(225, 48, 108, 0.15)' }]}>
                <Feather name="check-circle" size={20} color="#E1306C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.anonTitle}>Conta Conectada</Text>
                <Text style={styles.anonDesc}>{user.email}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={signOut}
              activeOpacity={0.85}
            >
              <Text style={styles.logoutBtnText}>Sair da Conta</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BLOCO INSTITUCIONAL: SELO DICAS & CANAL DE SEGURANÇA */}
        <View style={styles.institutionalCard}>
          <View style={styles.instHeaderRow}>
            <View style={styles.instIconBox}>
              <Feather name="award" size={18} color="#E1306C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.instTitle}>Selo Dicas LGBT+</Text>
              <Text style={styles.instSub}>Curadoria e garantia de ambientes acolhedores</Text>
            </View>
          </View>
          <Text style={styles.instDesc}>
            Locais selecionados para garantir experiências seguras e inclusivas para nossa comunidade.
          </Text>
          
          <TouchableOpacity
            style={styles.denounceRowBtn}
            onPress={() => router.push('/denunciar')}
            activeOpacity={0.8}
          >
            <Feather name="shield" size={14} color="#E1306C" />
            <Text style={styles.denounceBtnText}>Canal Seguro de Denúncia & Acolhimento</Text>
            <Feather name="chevron-right" size={14} color="#E1306C" />
          </TouchableOpacity>
        </View>

        {/* Seção: Minhas Atividades */}
        <Text style={styles.sectionHeader}>MINHAS ATIVIDADES</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/favorites')} activeOpacity={0.7}>
            <View style={styles.iconBox}><Feather name="bookmark" size={16} color="#E1306C" /></View>
            <Text style={styles.menuText}>Meus Favoritos</Text>
            <Feather name="chevron-right" size={16} color="#606070" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/coupons')} activeOpacity={0.7}>
            <View style={styles.iconBox}><Feather name="tag" size={16} color="#E1306C" /></View>
            <Text style={styles.menuText}>Meus Cupons & Listas VIP</Text>
            <Feather name="chevron-right" size={16} color="#606070" />
          </TouchableOpacity>
        </View>

        {/* Seção: Privacidade */}
        <Text style={styles.sectionHeader}>PRIVACIDADE</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/privacy')} activeOpacity={0.7}>
            <View style={styles.iconBox}><Feather name="shield" size={16} color="#81C784" /></View>
            <Text style={styles.menuText}>Política de Privacidade (LGPD)</Text>
            <Feather name="chevron-right" size={16} color="#606070" />
          </TouchableOpacity>
        </View>

        {/* Seção: Comunidade */}
        <Text style={styles.sectionHeader}>COMUNIDADE</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/business/advertise')} activeOpacity={0.7}>
            <View style={styles.iconBox}><Feather name="volume-2" size={16} color="#FFB74D" /></View>
            <Text style={styles.menuText}>Anuncie seu espaço</Text>
            <Feather name="chevron-right" size={16} color="#606070" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/indicar')} activeOpacity={0.7}>
            <View style={styles.iconBox}><Feather name="plus-circle" size={16} color="#4FC3F7" /></View>
            <Text style={styles.menuText}>Indicar um Local ou Festa</Text>
            <Feather name="chevron-right" size={16} color="#606070" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/indicar-amigo')} activeOpacity={0.7}>
            <View style={styles.iconBox}><Feather name="users" size={16} color="#7E57C2" /></View>
            <Text style={styles.menuText}>Indique um Amigo</Text>
            <Feather name="chevron-right" size={16} color="#606070" />
          </TouchableOpacity>
        </View>

        {/* Seção: Suporte */}
        <Text style={styles.sectionHeader}>SUPORTE</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/denunciar')} activeOpacity={0.7}>
            <View style={styles.iconBox}><Feather name="help-circle" size={16} color="#A0A0B0" /></View>
            <Text style={styles.menuText}>Obtenha Ajuda & Denunciar</Text>
            <Feather name="chevron-right" size={16} color="#606070" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  logoLinear: { width: 150, height: 36 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  anonCard: { backgroundColor: '#1C1B26', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2D2B3D', marginBottom: 16 },
  anonHeaderRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#282836', justifyContent: 'center', alignItems: 'center' },
  anonTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  anonDesc: { fontSize: 12, color: '#A0A0B0', lineHeight: 18 },
  loginBtn: { backgroundColor: '#E1306C', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  loginBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  
  logoutBtn: { backgroundColor: '#232230', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#3D3D4E' },
  logoutBtnText: { color: '#E1306C', fontSize: 14, fontWeight: '700' },

  institutionalCard: { backgroundColor: '#161520', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(225, 48, 108, 0.3)', marginBottom: 24 },
  instHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  instIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(225, 48, 108, 0.15)', justifyContent: 'center', alignItems: 'center' },
  instTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  instSub: { fontSize: 10, color: '#A0A0B2' },
  instDesc: { fontSize: 11, color: '#A0A0B2', lineHeight: 16, marginBottom: 12 },
  denounceRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(225, 48, 108, 0.1)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(225, 48, 108, 0.2)' },
  denounceBtnText: { fontSize: 12, fontWeight: '700', color: '#E1306C', flex: 1, marginLeft: 8 },

  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#606070', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  groupCard: { backgroundColor: '#1C1B26', borderRadius: 16, borderWidth: 1, borderColor: '#2D2B3D', marginBottom: 20 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#282836', justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#262632', marginLeft: 58 },
});