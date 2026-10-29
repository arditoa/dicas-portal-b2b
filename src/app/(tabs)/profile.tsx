import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuth } from '../../lib/authContext';
import ContaAtividade from '../../components/ContaAtividade';
import { PassoGostos, PassoSobreVoce, aplicarPendente, guardarPendente, salvarExtras } from '../../components/CadastroExtras';
import { EXTRAS_VAZIO, ExtrasCadastro } from '../../lib/perfilOpcoes';
import { BotaoVoltar, TituloTela } from '../../components/CabecalhoTela';
import MarcaApp from '../../components/MarcaApp';
import FundoCaixaDegrade from '../../components/FundoCaixaDegrade';
import { AvatarEditavel, StatusRelacionamento } from '../../components/PerfilFotoStatus';
import { IDIOMAS, useI18n } from '../../lib/i18n';

// Site institucional (landing-dicaslgbt) — política e termos ficam lá e
// precisam estar acessíveis DENTRO do app (App Store 5.1.1(i)).
const URL_SITE = 'https://www.dicaslgbt.com.br';
import { supabase } from '../../lib/supabase';
import { traduzErroAuth } from '../../lib/erroAuth';
import { ativarTodosAvisos } from '../../lib/push';
import { useRastrearTela } from '../../lib/usoTelas';

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
  useRastrearTela('conta');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { user, session, loading: authLoading, signOut } = useAuth();
  const { t, idioma, proximoIdioma } = useI18n();
  const idiomaAtual = IDIOMAS.find((i) => i.code === idioma) || IDIOMAS[0];
  const { aba } = useLocalSearchParams<{ aba?: string }>();
  const isLogado = !!session;
  const [isModoCadastro, setIsModoCadastro] = useState(true);

  const [nomeSocial, setNomeSocial] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [senha, setSenha] = useState('');
  const [aceitaLGPD, setAceitaLGPD] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Cadastro em passos (como a abertura): 1 dados básicos · 2 sobre você · 3 gostos. Os passos 2 e 3 podem ser pulados.
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [extras, setExtras] = useState<ExtrasCadastro>(EXTRAS_VAZIO);

  const [perfil, setPerfil] = useState<{
    display_name: string | null;
    phone: string | null;
    birth_date: string | null;
  } | null>(null);
  const [totalSalvos, setTotalSalvos] = useState(0);
  const [totalCupons, setTotalCupons] = useState(0);

  // Formata enquanto digita: o teclado é numérico (nunca deveria ter barra
  // pra digitar) mas o campo pede DD/MM/AAAA -- sem isso, quem digitasse só
  // números nunca conseguia bater 3 partes separadas por "/" e o cadastro
  // travava com "Informe a data de nascimento no formato DD/MM/AAAA" sem
  // nenhum jeito de corrigir. Insere as barras automaticamente conforme os
  // números são digitados (mesmo padrão de "01/02/2000").
  const formatarDataNascimento = (texto: string): string => {
    const digitos = texto.replace(/\D/g, '').slice(0, 8);
    const dia = digitos.slice(0, 2);
    const mes = digitos.slice(2, 4);
    const ano = digitos.slice(4, 8);
    if (digitos.length <= 2) return dia;
    if (digitos.length <= 4) return `${dia}/${mes}`;
    return `${dia}/${mes}/${ano}`;
  };

  // DD/MM/AAAA -> AAAA-MM-DD (o formato que o Postgres espera)
  const paraDataISO = (dataBr: string): string | null => {
    const partes = dataBr.trim().split('/');
    if (partes.length !== 3) return null;
    const [dia, mes, ano] = partes;
    if (!dia || !mes || !ano || ano.length !== 4) return null;
    const iso = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return iso;
  };

  // Espelha a constraint birth_date_18_mais do banco, só pra dar um erro
  // amigável em vez do usuário ver um erro cru do Postgres.
  const temMaisDe18 = (dataISO: string): boolean => {
    const nascimento = new Date(dataISO);
    const limite = new Date();
    limite.setFullYear(limite.getFullYear() - 18);
    return nascimento <= limite;
  };

  useEffect(() => {
    if (!user?.id) {
      setPerfil(null);
      setTotalSalvos(0);
      setTotalCupons(0);
      return;
    }

    let ativo = true;

    (async () => {
      const [perfilRes, salvosRes, cuponsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, phone, birth_date')
          .eq('id', user.id)
          .single(),
        supabase
          .from('favoritos_locais')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('cupons_resgatados')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      if (!ativo) return;

      if (!perfilRes.error) setPerfil(perfilRes.data as any);
      if (!salvosRes.error) setTotalSalvos(salvosRes.count ?? 0);
      if (!cuponsRes.error) setTotalCupons(cuponsRes.count ?? 0);
    })();

    return () => {
      ativo = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) aplicarPendente(user.id).catch(() => {});
  }, [user?.id]);

  // Valida o passo 1; devolve a data ISO se estiver tudo certo.
  const validarBasico = (): string | null => {
    if (!nomeSocial || !email || !telefone || !dataNascimento || !senha) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha todos os campos.');
      return null;
    }
    if (!aceitaLGPD) {
      Alert.alert('LGPD', 'Autorize o uso dos dados para continuar.');
      return null;
    }
    const dataISO = paraDataISO(dataNascimento);
    if (!dataISO) {
      Alert.alert('Data inválida', 'Informe a data de nascimento no formato DD/MM/AAAA.');
      return null;
    }
    if (!temMaisDe18(dataISO)) {
      Alert.alert('Idade mínima', 'Você precisa ter 18 anos ou mais para criar uma conta.');
      return null;
    }
    return dataISO;
  };

  const handleCadastrar = async () => {
    const dataISO = validarBasico();
    if (!dataISO) {
      setPasso(1);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            full_name: nomeSocial,
            social_name: nomeSocial,
            phone: telefone,
            birth_date: dataISO,
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        const novoId = data.session.user.id;
        salvarExtras(novoId, extras).catch(() => {});
        Alert.alert(
          'Conta criada!',
          `Seja bem-vinde, ${nomeSocial}! Quer receber avisos de festas, cupons, lembretes e novidades? Você pode mudar isso em Conta > Notificações.`,
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Ativar todos', onPress: () => { ativarTodosAvisos(novoId).catch(() => {}); } },
          ]
        );
      } else {
        guardarPendente(extras).catch(() => {});
        Alert.alert(
          'Quase lá!',
          'Enviamos um e-mail de confirmação. Confirme para poder entrar na sua conta.'
        );
      }
    } catch (err: any) {
      Alert.alert('Não foi possível criar a conta', traduzErroAuth(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEntrar = async () => {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Informe e-mail e senha.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Não foi possível entrar', traduzErroAuth(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Recuperação de senha: manda o e-mail com o link para a página
  // dicaslgbt.com.br/redefinir-senha. A resposta é sempre a mesma, exista ou
  // não conta com esse e-mail, para não revelar quem tem cadastro.
  const handleEsqueciSenha = async () => {
    const alvo = email.trim();
    if (!alvo) {
      Alert.alert('Esqueci minha senha', 'Digite seu e-mail no campo acima e toque em "Esqueci minha senha" de novo.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(alvo, {
        redirectTo: `${URL_SITE}/redefinir-senha`,
      });
      if (error && (error.status === 429 || /rate limit|security purposes/i.test(error.message || ''))) {
        throw error;
      }
      Alert.alert(
        'Verifique seu e-mail',
        'Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Olhe também a caixa de spam.'
      );
    } catch (err: any) {
      Alert.alert('Não foi possível enviar', traduzErroAuth(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsModoCadastro(false);
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

  // App Store 5.1.1(v): a exclusão acontece de verdade, aqui dentro do app
  // (RPC excluir_minha_conta, migration 035 — apaga avaliações, perfil e o
  // login). Só se a função ainda não existir no banco cai no fluxo antigo
  // de pedido manual (solicitacoes_exclusao_conta), pra nunca travar a pessoa.
  const handleExcluirConta = () => {
    Alert.alert(
      'Excluir conta',
      'Isso apaga sua conta, seus favoritos, cupons, check-ins e avaliações de forma permanente. Não dá pra desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: rpcError } = await supabase.rpc('excluir_minha_conta');
              if (rpcError) {
                const { error } = await supabase.from('solicitacoes_exclusao_conta').insert({
                  email: user?.email || email,
                  telefone: perfil?.phone || telefone || null,
                  motivo: 'Solicitado pelo app (Conta > Excluir conta) — RPC indisponível: ' + rpcError.message,
                });
                if (error) throw error;
                await handleLogout();
                Alert.alert('Pedido registrado', 'Recebemos sua solicitação e sua conta será apagada em até 48 horas.');
                return;
              }
              await handleLogout();
              Alert.alert('Conta excluída', 'Sua conta e seus dados foram apagados.');
            } catch (err: any) {
              Alert.alert('Não foi possível excluir agora', err?.message || 'Tente novamente em alguns instantes.');
            }
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
        
        {/* Cabeçalho no mesmo padrão de Início/Eventos/Trip */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BotaoVoltar />
            <View>
              <MarcaApp />
            </View>
          </View>
        </View>
        <TituloTela
          titulo={t('conta.titulo')}
          tituloMenu="Ir para"
          opcoes={[
            { id: '/favorites', label: 'Locais salvos', icone: 'heart' },
            { id: '/coupons', label: 'Cupons', icone: 'tag' },
            { id: '/onboarding', label: 'Nossa missão e objetivo', icone: 'flag' },
          ]}
          onEscolher={(id) => (id === '/onboarding' ? router.push('/onboarding' as any) : handleCliqueExigente(id))}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {authLoading ? (
            <View style={styles.authBox}>
              <ActivityIndicator color={COLORS.pink} />
            </View>
          ) : !isLogado ? (
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
                <View style={styles.passosBarra}>
                  {[1, 2, 3].map((n) => (
                    <View key={n} style={[styles.passoTraco, n <= passo && styles.passoTracoAtivo]} />
                  ))}
                  <Text style={styles.passoTxt}>Passo {passo} de 3</Text>
                </View>
              )}

              {isModoCadastro && passo === 2 && <PassoSobreVoce valor={extras} onMudar={setExtras} />}
              {isModoCadastro && passo === 3 && <PassoGostos valor={extras} onMudar={setExtras} />}

              {(!isModoCadastro || passo === 1) && (
                <>
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
                        maxLength={10}
                        value={dataNascimento}
                        onChangeText={(texto) => setDataNascimento(formatarDataNascimento(texto))}
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
                    personalização de ofertas e contato da comunidade, e li a{' '}
                    <Text style={styles.link} onPress={() => Linking.openURL(`${URL_SITE}/privacidade`)}>
                      Política de Privacidade
                    </Text>{' '}e os{' '}
                    <Text style={styles.link} onPress={() => Linking.openURL(`${URL_SITE}/termos`)}>
                      Termos de Uso
                    </Text>
                    .
                  </Text>
                </TouchableOpacity>
              )}

                </>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, submitting && { opacity: 0.6 }]}
                onPress={() => {
                  if (!isModoCadastro) return handleEntrar();
                  if (passo === 1) { if (validarBasico()) setPasso(2); return; }
                  if (passo === 2) return setPasso(3);
                  return handleCadastrar();
                }}
                activeOpacity={0.85}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionBtnText}>
                    {!isModoCadastro ? 'Entrar na Conta' : passo === 1 ? 'Continuar' : passo === 2 ? 'Continuar' : 'Criar minha conta'}
                  </Text>
                )}
              </TouchableOpacity>

              {isModoCadastro && passo > 1 && (
                <View style={styles.passosLinks}>
                  <TouchableOpacity onPress={() => setPasso((passo - 1) as 1 | 2)} disabled={submitting} accessibilityRole="button">
                    <Text style={styles.switchAuthText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (passo === 2) { setExtras({ ...extras, orientacao: undefined, identidade: undefined, pronomes: undefined, status: undefined, consentimento: false }); setPasso(3); }
                      else { setExtras({ ...extras, gostos: { musica: [], experiencia: [], publico: [] } }); handleCadastrar(); }
                    }}
                    disabled={submitting}
                    accessibilityRole="button"
                  >
                    <Text style={styles.switchAuthText}>{passo === 2 ? 'Pular' : 'Pular e criar conta'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!isModoCadastro && (
                <TouchableOpacity
                  style={styles.switchAuthBtn}
                  onPress={handleEsqueciSenha}
                  disabled={submitting}
                  accessibilityRole="button"
                >
                  <Text style={styles.switchAuthText}>Esqueci minha senha</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.switchAuthBtn}
                onPress={() => { setIsModoCadastro(!isModoCadastro); setPasso(1); }}
                disabled={submitting}
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
              <View style={styles.heroTopo}>
                <FundoCaixaDegrade id="conta-hero" cores={['#4C1D95', '#BE185D']} />
                {user?.id ? (
                  <AvatarEditavel userId={user.id} iniciais={(perfil?.display_name || user?.email || 'US').substring(0, 2).toUpperCase()} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>
                      {(perfil?.display_name || user?.email || 'US').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.userName}>{perfil?.display_name || 'Sem nome cadastrado'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>

              <View style={styles.heroBase}>
                <View style={styles.infoRow}>
                  <Feather name="phone" size={14} color={COLORS.textMuted} />
                  <Text style={styles.infoText}>WhatsApp: {perfil?.phone || 'não informado'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="calendar" size={14} color={COLORS.textMuted} />
                  <Text style={styles.infoText}>Nascimento: {perfil?.birth_date || 'não informado'}</Text>
                </View>
                {user?.id && (
                  <>
                    <View style={styles.infoDivider} />
                    <StatusRelacionamento userId={user.id} />
                  </>
                )}
              </View>
            </View>
          )}

          {isLogado && (
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => handleCliqueExigente('/favorites')}
              activeOpacity={0.8}
            >
              {/* Rodada 57 — era "bookmark" (ícone de fita/bandeirinha):
                  Andrea reportou confusão porque salvar um local em
                  qualquer card da Home usa o coração (handleToggleFavorito),
                  então o stat de "Locais Salvos" aqui devia usar o MESMO
                  ícone do resto do app — um só símbolo pro mesmo conceito. */}
              <FundoCaixaDegrade id="stat-salvos" cores={['#E1306C', '#9B3CFF']} />
              <Feather name="heart" size={20} color="#FFFFFF" />
              <View>
                <Text style={styles.statNum}>{isLogado ? totalSalvos : 0}</Text>
                <Text style={styles.statLabel}>Locais salvos</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statBox}
              onPress={() => handleCliqueExigente('/coupons')}
              activeOpacity={0.8}
            >
              <FundoCaixaDegrade id="stat-cupons" cores={['#F2A900', '#C2410C']} />
              <Feather name="tag" size={20} color="#FFFFFF" />
              <View>
                <Text style={styles.statNum}>{isLogado ? totalCupons : 0}</Text>
                <Text style={styles.statLabel}>Meus cupons</Text>
              </View>
            </TouchableOpacity>
          </View>
          )}

          {/* Nova versão — a caixa de entrada saiu da barra inferior e mora aqui,
              junto das últimas ações (check-ins, cupons, listas VIP). Fica no topo pra o
              atalho da caixa de entrada na Home cair direto nela. */}
          <ContaAtividade userId={user?.id ?? null} abaInicial={aba === 'inbox' ? 'inbox' : undefined} />

          <Text style={styles.grupoTitulo}>COMUNIDADE</Text>
          <View style={styles.grupoCard}>
            <TouchableOpacity style={[styles.linha, styles.linhaBorda]} onPress={handleIndicarAmigos} activeOpacity={0.7} accessibilityRole="button">
              <View style={[styles.menuIconBg, { backgroundColor: '#7E57C226' }]}>
                <Feather name="share-2" size={16} color="#7E57C2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText]}>Indicar a Amigos</Text>
                <Text style={styles.menuItemSub}>Compartilhe o app com mensagens acolhedoras</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linha, styles.linhaBorda]} onPress={handleIndicarParceiroWhatsApp} activeOpacity={0.7} accessibilityRole="button">
              <View style={[styles.menuIconBg, { backgroundColor: '#4CAF7D26' }]}>
                <Feather name="message-circle" size={16} color="#4CAF7D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText]}>Indicar Parceiro / Espaço</Text>
                <Text style={styles.menuItemSub}>WhatsApp: (11) 94294-2028</Text>
              </View>
              <Feather name="external-link" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linha, styles.linhaBorda]} onPress={() => Linking.openURL('https://camaralgbt.com.br/')} activeOpacity={0.7} accessibilityRole="button">
              <View style={[styles.menuIconBg, { backgroundColor: '#FFD54F26' }]}>
                <Feather name="briefcase" size={16} color="#FFD54F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText]}>Câmara de Comércio LGBT+</Text>
                <Text style={styles.menuItemSub}>Parceira oficial de desenvolvimento</Text>
              </View>
              <Feather name="external-link" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linha, styles.linhaBorda]} onPress={() => router.push('/onboarding' as any)} activeOpacity={0.7} accessibilityRole="button">
              <View style={[styles.menuIconBg, { backgroundColor: '#E1306C26' }]}>
                <Feather name="heart" size={16} color="#E1306C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText]}>Nossa missão e objetivo</Text>
                <Text style={styles.menuItemSub}>Rever a abertura do Dicas LGBT+</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linha, styles.linhaUltima]} onPress={() => router.push('/denunciar')} activeOpacity={0.7} accessibilityRole="button">
              <View style={[styles.menuIconBg, { backgroundColor: '#FF525226' }]}>
                <Feather name="shield" size={16} color="#FF5252" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText]}>Denunciar Ocorrência</Text>
                <Text style={styles.menuItemSub}>Canal seguro contra discriminação</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.grupoTitulo}>PREFERÊNCIAS</Text>
          <View style={styles.grupoCard}>
            <TouchableOpacity style={[styles.linha, styles.linhaBorda]} onPress={proximoIdioma} activeOpacity={0.7} accessibilityRole="button">
              <View style={[styles.menuIconBg, { backgroundColor: '#FFFFFF1F' }]}>
                <Feather name="globe" size={16} color={COLORS.textPrimary} />
              </View>
              <Text style={[styles.menuItemText, { flex: 1 }]}>{t('conta.idioma')}</Text>
              <View style={styles.valorPilula}><Text style={styles.valorPilulaTxt}>{idiomaAtual.nome}</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linha, styles.linhaUltima]} onPress={() => router.push('/notificacoes')} activeOpacity={0.7} accessibilityRole="button">
              <View style={[styles.menuIconBg, { backgroundColor: '#FFFFFF26' }]}>
                <Feather name="bell" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText]}>Notificações</Text>

              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.grupoTitulo}>PRIVACIDADE E CONTA (LGPD)</Text>
          <View style={styles.grupoCard}>
            <TouchableOpacity style={[styles.linha, styles.linhaBorda]} onPress={() => Linking.openURL(`${URL_SITE}/privacidade`)} activeOpacity={0.7} accessibilityRole="button">
              <View style={[styles.menuIconBg, { backgroundColor: '#FFFFFF26' }]}>
                <Feather name="lock" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText]}>{t('conta.privacidade')}</Text>

              </View>
              <Feather name="external-link" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linha, styles.linhaBorda]} onPress={() => Linking.openURL(`${URL_SITE}/termos`)} activeOpacity={0.7} accessibilityRole="button">
              <View style={[styles.menuIconBg, { backgroundColor: '#FFFFFF26' }]}>
                <Feather name="file-text" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText]}>{t('conta.termos')}</Text>

              </View>
              <Feather name="external-link" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            {isLogado && (
              <TouchableOpacity style={[styles.linha, styles.linhaUltima]} onPress={handleExcluirConta} activeOpacity={0.7} accessibilityRole="button">
                <View style={[styles.menuIconBg, { backgroundColor: '#FF52521F' }]}>
                  <Feather name="trash-2" size={16} color={COLORS.danger} />
                </View>
                <Text style={[styles.menuItemText, { flex: 1, color: COLORS.danger }]}>Excluir minha conta</Text>
              </TouchableOpacity>
            )}
          </View>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, marginBottom: 16 },
  logo: { width: 140, height: 34 },
  appSub: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, marginTop: 2 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32, color: COLORS.textPrimary, paddingHorizontal: 16, marginTop: 4, marginBottom: 16 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 0, marginBottom: 14 },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  statNum: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },

  authBox: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  passosBarra: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  passoTraco: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#2A2A38' },
  passoTracoAtivo: { backgroundColor: COLORS.pink },
  passoTxt: { fontSize: 11, color: COLORS.textMuted, marginLeft: 4 },
  passosLinks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
  authTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
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
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 12 },

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
  lgpdText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  bold: { fontWeight: '700', color: COLORS.textPrimary },
  link: { fontWeight: '700', color: COLORS.pink, textDecorationLine: 'underline' },

  actionBtn: {
    height: 44,
    backgroundColor: COLORS.pink,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },

  switchAuthBtn: { marginTop: 12, alignItems: 'center' },
  switchAuthText: { fontSize: 12, fontWeight: '700', color: COLORS.purple },

  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
    marginBottom: 14,
  },
  heroTopo: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 16, gap: 2 },
  heroBase: { padding: 16 },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarInitials: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  userName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginTop: 6 },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: COLORS.border, width: '100%', marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  infoText: { fontSize: 12, color: COLORS.textSecondary },

  sectionBlock: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8, marginLeft: 4 },
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
  menuItemText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  menuItemSub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },

  grupoTitulo: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.8, marginTop: 8, marginBottom: 8, marginLeft: 6 },
  grupoCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 18 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  linhaBorda: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  linhaUltima: {},
  valorPilula: { backgroundColor: '#232230', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  valorPilulaTxt: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
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
  logoutBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
});