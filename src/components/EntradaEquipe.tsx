// Etapa 6 — na aba Conta do app cliente:
//   • "Tenho um código de equipe": quem recebeu o convite (8 letras) entra com a própria conta e o Modo parceiro
//     abre já com a casa (aceitar_convite_equipe, migração 099). Precisa de conta de verdade.
//   • "Sou da equipe da porta": código da casa + senha de 6 números, sem conta (login anônimo + entrar_modo_porta).
//     Mostra os erros do banco e o bloqueio depois de várias tentativas. O acesso vale até as 6h e sai sozinho
//     (o modoParceiro recarrega na hora de vencer e encerra a sessão anônima).
//   • Aparelho da porta conectado (sessão anônima): mostra até quando vale, "Abrir a porta" e "Sair do modo porta".
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { useModoParceiro } from '../lib/modoParceiro';
import { aceitarConvite, entrarNaPorta, hora } from '../lib/parceiro/equipe';

const C = { card: '#161520', borda: '#232230', texto: '#FFFFFF', dim: '#A0A0B2', fraco: '#626274', rosa: '#E1306C', campo: '#0F0E15', erro: '#FF7A7A' };

export default function EntradaEquipe() {
  const router = useRouter();
  const { session, user, signOut } = useAuth();
  const { recarregar, escolherLocal, definirModo, locais } = useModoParceiro();
  const anonimo = !!user?.is_anonymous;
  const logado = !!session && !anonimo;

  const [aberto, setAberto] = useState<'convite' | 'porta' | null>(null);
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [apelido, setApelido] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fechar = () => { setAberto(null); setCodigo(''); setPin(''); setErro(''); };

  const abrirConvite = () => {
    if (!logado) {
      return Alert.alert('Entre na sua conta', 'Para entrar na equipe de uma casa, use a sua conta (ou crie uma aqui em cima). Quem só trabalha na portaria usa "Sou da equipe da porta".');
    }
    setAberto('convite');
  };

  const enviarConvite = async () => {
    setErro('');
    setEnviando(true);
    try {
      const r = await aceitarConvite(codigo);
      await recarregar();
      escolherLocal(r.local_id);
      definirModo('parceiro');
      fechar();
      Alert.alert('Pronto!', `Você agora faz parte da equipe do ${r.nome}.`, [{ text: 'Abrir', onPress: () => router.push('/parceiro') }]);
    } catch (e: any) {
      setErro(e?.message || 'Não deu para aceitar o convite.');
    } finally {
      setEnviando(false);
    }
  };

  const enviarPorta = async () => {
    setErro('');
    if (!codigo.trim()) return setErro('Digite o código da casa.');
    if (!/^[0-9]{6}$/.test(pin)) return setErro('A senha da porta tem 6 números.');
    setEnviando(true);
    try {
      const r = await entrarNaPorta(codigo, pin, apelido);
      if (!r.ok) {
        setPin('');
        return setErro(r.restantes != null && r.restantes > 0 ? `${r.erro} Restam ${r.restantes} tentativa${r.restantes === 1 ? '' : 's'}.` : r.erro);
      }
      await recarregar();
      escolherLocal(r.local_id);
      definirModo('parceiro');
      fechar();
      Alert.alert('Porta liberada', `Você está na porta do ${r.nome} até as ${hora(r.expira_em)}. Depois disso, o acesso sai sozinho.`, [
        { text: 'Abrir', onPress: () => router.replace('/parceiro/aprovacoes') },
      ]);
    } catch (e: any) {
      setErro(e?.message || 'Não deu para entrar agora.');
    } finally {
      setEnviando(false);
    }
  };

  // Aparelho da porta (sessão anônima)
  if (anonimo) {
    const porta = locais.find((l) => l.papel === 'porta_pin');
    return (
      <View style={s.cartao}>
        <View style={s.linha}>
          <View style={s.icone}><Feather name="key" size={18} color={C.rosa} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>{porta ? `Modo porta · ${porta.nome}` : 'O acesso da porta terminou'}</Text>
            <Text style={s.sub}>{porta?.expira_em ? `Vale até as ${hora(porta.expira_em)}. Depois sai sozinho.` : 'Para entrar de novo, peça o código e a senha ao dono da casa.'}</Text>
          </View>
        </View>
        <View style={s.botoes}>
          {porta && (
            <TouchableOpacity style={[s.botao, s.principal]} onPress={() => { definirModo('parceiro'); router.push('/parceiro/aprovacoes'); }} accessibilityRole="button">
              <Text style={s.principalTxt}>Abrir a porta</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.botao} onPress={() => void signOut()} accessibilityRole="button"><Text style={s.botaoTxt}>Sair do modo porta</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 8, marginBottom: 14 }}>
      <TouchableOpacity style={s.linhaBotao} onPress={abrirConvite} accessibilityRole="button">
        <Feather name="users" size={18} color={C.dim} />
        <Text style={s.linhaTxt}>Tenho um código de equipe</Text>
        <Feather name="chevron-right" size={18} color={C.fraco} />
      </TouchableOpacity>
      <TouchableOpacity style={s.linhaBotao} onPress={() => setAberto('porta')} accessibilityRole="button">
        <Feather name="key" size={18} color={C.dim} />
        <Text style={s.linhaTxt}>Sou da equipe da porta</Text>
        <Feather name="chevron-right" size={18} color={C.fraco} />
      </TouchableOpacity>

      <Modal visible={!!aberto} transparent animationType="slide" onRequestClose={fechar}>
        <KeyboardAvoidingView style={s.fundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.folha}>
            <View style={s.topo}>
              <Text style={s.folhaTitulo}>{aberto === 'convite' ? 'Código de equipe' : 'Equipe da porta'}</Text>
              <TouchableOpacity onPress={fechar} style={s.x} accessibilityLabel="Fechar"><Feather name="x" size={22} color={C.texto} /></TouchableOpacity>
            </View>
            <Text style={s.sub}>
              {aberto === 'convite'
                ? 'Digite o código de 8 letras que o dono da casa te mandou. Ele vale 7 dias e só uma vez.'
                : 'Peça ao dono da casa o código e a senha de 6 números. Não precisa ter conta. O acesso vale até as 6h e mostra só a porta e as aprovações da festa.'}
            </Text>
            <Text style={s.rotulo}>{aberto === 'convite' ? 'Código do convite' : 'Código da casa'}</Text>
            <TextInput
              style={[s.input, s.codigo]}
              value={codigo}
              onChangeText={(v) => { setCodigo(v.toUpperCase().replace(/[^A-Z0-9-]/g, '')); setErro(''); }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={aberto === 'convite' ? 9 : 12}
              placeholder={aberto === 'convite' ? 'ABCD-EFGH' : 'Ex.: VEZPAB'}
              placeholderTextColor={C.fraco}
              accessibilityLabel={aberto === 'convite' ? 'Código do convite' : 'Código da casa'}
            />
            {aberto === 'porta' && (
              <>
                <Text style={s.rotulo}>Senha da porta</Text>
                <TextInput style={[s.input, s.codigo]} value={pin} onChangeText={(v) => { setPin(v.replace(/\D/g, '').slice(0, 6)); setErro(''); }} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="••••••" placeholderTextColor={C.fraco} accessibilityLabel="Senha da porta" />
                <Text style={s.rotulo}>Nome deste aparelho (opcional)</Text>
                <TextInput style={s.input} value={apelido} onChangeText={setApelido} maxLength={40} placeholder="Ex.: Celular da portaria" placeholderTextColor={C.fraco} accessibilityLabel="Nome deste aparelho" />
              </>
            )}
            {!!erro && <Text style={s.erro}>{erro}</Text>}
            <TouchableOpacity
              style={[s.enviar, enviando && { opacity: 0.6 }]}
              onPress={() => void (aberto === 'convite' ? enviarConvite() : enviarPorta())}
              disabled={enviando}
              accessibilityRole="button"
            >
              {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={s.enviarTxt}>{aberto === 'convite' ? 'Entrar na equipe' : 'Abrir a porta'}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  linhaBotao: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderColor: C.borda, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52 },
  linhaTxt: { flex: 1, color: C.texto, fontSize: 14, fontWeight: '700' },
  cartao: { backgroundColor: C.card, borderColor: '#3A1D2A', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icone: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A1420', alignItems: 'center', justifyContent: 'center' },
  titulo: { color: C.texto, fontSize: 16, fontWeight: '700' },
  sub: { color: C.dim, fontSize: 13, lineHeight: 18, marginTop: 2 },
  botoes: { flexDirection: 'row', gap: 8, marginTop: 12 },
  botao: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: C.borda, alignItems: 'center', justifyContent: 'center' },
  botaoTxt: { color: C.dim, fontSize: 13, fontWeight: '700' },
  principal: { backgroundColor: C.rosa, borderColor: C.rosa },
  principalTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 28 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  folhaTitulo: { color: C.texto, fontSize: 18, fontWeight: '800' },
  x: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  rotulo: { color: '#B9B6CC', fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: C.campo, borderColor: C.borda, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, color: C.texto, fontSize: 15 },
  codigo: { fontSize: 22, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
  erro: { color: C.erro, fontSize: 13, fontWeight: '700', marginTop: 12, lineHeight: 18 },
  enviar: { minHeight: 50, borderRadius: 14, backgroundColor: C.rosa, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  enviarTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
