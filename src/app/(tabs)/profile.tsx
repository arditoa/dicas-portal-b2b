import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#0B0B0E',
  card: '#161520',
  border: '#232230',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B2',
  textMuted: '#626274',
  pink: '#E1306C',
  purple: '#7E57C2',
  safeSpace: '#4CAF7D',
  gold: '#FFD54F',
  danger: '#FF5252',
};

const WHATSAPP_PARCEIROS = '5511942942028';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLogado, setIsLogado] = useState(false);
  const [isModoCadastro, setIsModoCadastro] = useState(true);

  const [nomeSocial, setNomeSocial] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [senha, setSenha] = useState('');
  const [aceitaLGPD, setAceitaLGPD] = useState(false);

  const [totalSalvos, setTotalSalvos] = useState(0);
  const [totalCupons, setTotalCupons] = useState(0);

  const handleCadastrar = () => {
    if (!nomeSocial || !email || !telefone || !dataNascimento || !senha) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha todos os campos.');
      return;
    }
    if (!aceitaLGPD) {
      Alert.alert('LGPD', 'Autorize o uso dos dados para continuar.');
      return;
    }

    setIsLogado(true);
    setTotalSalvos(3);
    setTotalCupons(1);
    Alert.alert('Conta Criada!', `Seja bem-vinde, ${nomeSocial}!`);
  };

  const handleEntrar = () => {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Informe e-mail e senha.');
      return;
    }
    setNomeSocial('Alex Silva');
    setIsLogado(true);
    setTotalSalvos(5);
    setTotalCupons(2);
  };

  const handleLogout = () => {
    setIsLogado(false);
    setIsModoCadastro(false);
    setTotalSalvos(0);
    setTotalCupons(0);
  };

  const handleIndicarAmigos = async () => {
    const mensagemEngajadora = 
      '🌈 Olá! Acabei de encontrar esse aplicativo incrível do Diretório LGBT+! ' +
      'Nele dá pra descobrir bares, eventos, restaurantes, hospedagens e espaços seguros e acolhedores na cidade.\n\n' +
      'Bora conferir e escolher o nosso próximo rolê juntos? Baixe agora: https://meuapplgbt.com';

    try {
      await Share.share({
        message: mensagemEngajadora,
        title: 'Convite - Diretório LGBT+',
      });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível compartilhar no momento.');
    }
  };

  const handleIndicarParceiroWhatsApp = async () => {
    const mensagem = encodeURIComponent(
      'Olá! Gostaria de indicar/cadastrar um novo estabelecimento parceiro no aplicativo do Diretório LGBT+.'
    );
    const url = `whatsapp://send?phone=${WHATSAPP_PARCEIROS}&text=${mensagem}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${WHATSAPP_PARCEIROS}&text=${mensagem}`);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  const handleExcluirConta = () => {
    Alert.alert(
      'Excluir Conta (LGPD)',
      'Deseja remover permanentemente sua conta e histórico?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            handleLogout();
            Alert.alert('Conta removida com sucesso.');
          },
        },
      ]
    );
  };

  const handleCliqueExigente = (rota: string) => {
    if (!isLogado) {
      Alert.alert('Acesso Restrito', 'Faça login ou crie sua conta para acessar seus salvos.', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Entrar / Criar Conta', onPress: () => setIsModoCadastro(true) },
      ]);
      return;
    }
    router.push(rota as any);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logolinear-semfundo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>{isLogado ? 'Meu Perfil' : ''}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => handleCliqueExigente('/favorites')}
              activeOpacity={0.8}
            >
              <Feather name="bookmark" size={20} color={COLORS.pink} />
              <Text style={styles.statNum}>{isLogado ? totalSalvos : 0}</Text>
              <Text style={styles.statLabel}>Locais Salvos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statBox}
              onPress={() => handleCliqueExigente('/coupons')}
              activeOpacity={0.8}
            >
              <Feather name="tag" size={20} color={COLORS.gold} />
              <Text style={styles.statNum}>{isLogado ? totalCupons : 0}</Text>
              <Text style={styles.statLabel}>Meus Cupons</Text>
            </TouchableOpacity>
          </View>

          {!isLogado ? (
            <View style={styles.authBox}>
              <Text style={styles.authTitle}>
                {isModoCadastro ? 'Criar sua conta' : 'Entrar na sua conta'}
              </Text>
              <Text style={styles.authSub}>
                {isModoCadastro
                  ? 'Cadastre-se para salvar locais, resgatar cupons e receber indicações.'
                  : 'Informe seus dados para acessar sua conta.'}
              </Text>

              {isModoCadastro && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nome Social *</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="user" size={16} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Como prefere ser chamado(a/e)"
                      placeholderTextColor={COLORS.textMuted}
                      value={nomeSocial}
                      onChangeText={setNomeSocial}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail *</Text>
                <View style={styles.inputContainer}>
                  <Feather name="mail" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="seuemail@exemplo.com"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {isModoCadastro && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Telefone (WhatsApp) *</Text>
                    <View style={styles.inputContainer}>
                      <Feather name="phone" size={16} color={COLORS.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="(11) 99999-9999"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="phone-pad"
                        value={telefone}
                        onChangeText={setTelefone}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Data de Nascimento *</Text>
                    <View style={styles.inputContainer}>
                      <Feather name="calendar" size={16} color={COLORS.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                        value={dataNascimento}
                        onChangeText={setDataNascimento}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha *</Text>
                <View style={styles.inputContainer}>
                  <Feather name="lock" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                    value={senha}
                    onChangeText={setSenha}
                  />
                </View>
              </View>

              {isModoCadastro && (
                <TouchableOpacity
                  style={styles.lgpdBox}
                  activeOpacity={0.8}
                  onPress={() => setAceitaLGPD(!aceitaLGPD)}
                >
                  <View style={[styles.checkbox, aceitaLGPD && styles.checkboxActive]}>
                    {aceitaLGPD && <Feather name="check" size={12} color="#FFF" />}
                  </View>
                  <Text style={styles.lgpdText}>
                    Autorizo a coleta do <Text style={styles.bold}>Telefone</Text> e{' '}
                    <Text style={styles.bold}>Data de Nascimento</Text> conforme a LGPD para
                    personalização de ofertas e contato da comunidade.
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={isModoCadastro ? handleCadastrar : handleEntrar}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnText}>
                  {isModoCadastro ? 'Concluir Cadastro' : 'Entrar na Conta'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchAuthBtn}
                onPress={() => setIsModoCadastro(!isModoCadastro)}
              >
                <Text style={styles.switchAuthText}>
                  {isModoCadastro
                    ? 'Já tem uma conta? Entrar'
                    : 'Novo por aqui? Criar uma conta'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>
                  {nomeSocial ? nomeSocial.substring(0, 2).toUpperCase() : 'US'}
                </Text>
              </View>
              <Text style={styles.userName}>{nomeSocial}</Text>
              <Text style={styles.userEmail}>{email}</Text>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Feather name="phone" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>WhatsApp: {telefone}</Text>
              </View>

              <View style={styles.infoRow}>
                <Feather name="calendar" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>Nascimento: {dataNascimento}</Text>
              </View>
            </View>
          )}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Recursos e Comunidade</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleIndicarAmigos} activeOpacity={0.7}>
              <View style={[styles.menuIconBg, { backgroundColor: 'rgba(126, 87, 194, 0.15)' }]}>
                <Feather name="share-2" size={16} color={COLORS.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Indicar a Amigos</Text>
                <Text style={styles.menuItemSub}>Compartilhe o app com mensagens acolhedoras</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleIndicarParceiroWhatsApp} activeOpacity={0.7}>
              <View style={[styles.menuIconBg, { backgroundColor: 'rgba(76, 175, 125, 0.15)' }]}>
                <Feather name="message-circle" size={16} color={COLORS.safeSpace} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Indicar Parceiro / Espaço</Text>
                <Text style={styles.menuItemSub}>WhatsApp: (11) 94294-2028</Text>
              </View>
              <Feather name="external-link" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL('https://camaralgbtoficial.com.br')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBg, { backgroundColor: 'rgba(255, 213, 79, 0.15)' }]}>
                <Feather name="briefcase" size={16} color={COLORS.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Câmara de Comércio LGBT+</Text>
                <Text style={styles.menuItemSub}>Parceira oficial de desenvolvimento</Text>
              </View>
              <Feather name="external-link" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/denunciar')} activeOpacity={0.7}>
              <View style={[styles.menuIconBg, { backgroundColor: 'rgba(255, 82, 82, 0.15)' }]}>
                <Feather name="shield" size={16} color={COLORS.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Denunciar Ocorrência</Text>
                <Text style={styles.menuItemSub}>Canal seguro contra discriminação</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {isLogado && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Privacidade (LGPD)</Text>
              <TouchableOpacity style={styles.menuItem} onPress={handleExcluirConta} activeOpacity={0.7}>
                <Feather name="trash-2" size={16} color={COLORS.danger} style={{ marginLeft: 6, marginRight: 10 }} />
                <Text style={[styles.menuItemText, { color: COLORS.danger }]}>Excluir Minha Conta</Text>
              </TouchableOpacity>
            </View>
          )}

          {isLogado && (
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Feather name="log-out" size={16} color={COLORS.textMuted} />
              <Text style={styles.logoutBtnText}>Sair da Conta</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  logo: { width: 130, height: 32 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  authBox: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  authTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  authSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 },

  inputGroup: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 42,
  },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },

  lgpdBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 10,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: COLORS.purple },
  lgpdText: { flex: 1, fontSize: 10, color: COLORS.textSecondary, lineHeight: 14 },
  bold: { fontWeight: '700', color: COLORS.textPrimary },

  actionBtn: {
    height: 44,
    backgroundColor: COLORS.pink,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  switchAuthBtn: { marginTop: 12, alignItems: 'center' },
  switchAuthText: { fontSize: 12, fontWeight: '700', color: COLORS.purple },

  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarInitials: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  userName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  userEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: COLORS.border, width: '100%', marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  infoText: { fontSize: 12, color: COLORS.textSecondary },

  sectionBlock: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8, marginLeft: 4 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    gap: 12,
  },
  menuIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuItemText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  menuItemSub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  logoutBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
});