// Tela 6 do Modo parceiro — Equipe e senha da porta (Meu espaço › Equipe e senha da porta). Só o dono.
// Funções da migração 099 (dados em src/lib/parceiro/equipe.ts):
//   - equipe: nome, papel e o que pode fazer em linguagem simples; editar e remover;
//   - convidar: modelo (gerente, porteiro, social media, personalizado), código de 8 letras que vale 7 dias,
//     mensagem pronta no WhatsApp com o passo a passo; convites pendentes (reenviar/cancelar);
//   - senha da porta: código da casa, definir/trocar o PIN (6 números; trocar derruba quem entrou com o antigo),
//     aparelhos conectados agora (desconectar) e mensagem pronta para o porteiro.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BarraSalvar, Campo, Chips, confirmarSair, estiloForm as f, Interruptor } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { Permissao, useModoParceiro } from '../../lib/modoParceiro';
import {
  Aparelho, cancelarConvite, compartilharWhatsApp, Convite, criarConvite, CURTO_PERMISSAO, dataHora, definirPin, formatarCodigo, hora,
  listarConvites, listarEquipe, Membro, mensagemDaPorta, mensagemDoConvite, Modelo, MODELOS, NOME_MODELO, Porta, portaDoLocal,
  PERMISSOES_DO_MODELO, removerDaEquipe, salvarMembro, TEXTO_PERMISSAO, TODAS_PERMISSOES, validarPin,
} from '../../lib/parceiro/equipe';

type Editor = { tipo: 'convite' } | { tipo: 'membro'; membro: Membro } | { tipo: 'pin' } | null;

export default function Equipe() {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const dono = localAtivo?.papel === 'dono';

  const [membros, setMembros] = useState<Membro[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [porta, setPorta] = useState<Porta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editor, setEditor] = useState<Editor>(null);
  const [codigoNovo, setCodigoNovo] = useState<{ codigo: string; modelo: string } | null>(null);

  const carregar = useCallback(async () => {
    if (!localId || !dono) return;
    setErro('');
    try {
      const [m, c, p] = await Promise.all([listarEquipe(localId), listarConvites(localId), portaDoLocal(localId).catch(() => null)]);
      setMembros(m);
      setConvites(c);
      setPorta(p);
    } catch (e: any) {
      setErro(e?.message || 'Não deu para carregar a equipe.');
    } finally {
      setCarregando(false);
    }
  }, [localId, dono]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  if (!localAtivo || !dono) {
    return (
      <TelaParceiro titulo="Equipe">
        <Text style={a.aviso}>Só o dono do local mexe na equipe e na senha da porta.</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  const nomeLocal = localAtivo.nome;
  const desconectar = (ap: Aparelho) =>
    Alert.alert('Desconectar este aparelho?', `${ap.apelido || 'Aparelho da porta'} sai do modo porta agora. Para entrar de novo, precisa do código e da senha.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desconectar', style: 'destructive', onPress: async () => { try { await removerDaEquipe(ap.id); void carregar(); } catch (e: any) { Alert.alert('Porta', e?.message); } } },
    ]);
  const cancelar = (c: Convite) =>
    Alert.alert('Cancelar este convite?', `O código ${formatarCodigo(c.codigo)} para de funcionar.`, [
      { text: 'Manter', style: 'cancel' },
      { text: 'Cancelar convite', style: 'destructive', onPress: async () => { try { await cancelarConvite(c.codigo); void carregar(); } catch (e: any) { Alert.alert('Convite', e?.message); } } },
    ]);

  return (
    <TelaParceiro titulo="Equipe e senha da porta" subtitulo="Quem da casa pode fazer o quê no app. Só você mexe aqui." atualizando={false} aoAtualizar={() => void carregar()} aoVoltar={() => router.back()}>

      <TouchableOpacity style={a.convidar} onPress={() => setEditor({ tipo: 'convite' })} activeOpacity={0.85} accessibilityRole="button">
        <Feather name="user-plus" size={20} color="#FFF" />
        <Text style={a.convidarTxt}>Convidar para a equipe</Text>
      </TouchableOpacity>

      {!!erro && <Text style={a.erro}>{erro}</Text>}

      {carregando ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} />
      ) : (
        <>
          {/* Equipe */}
          <TituloSecao texto={`Equipe (${membros.length})`} info="Cada pessoa entra com a própria conta. Equipe, senha da porta, plano e dados da empresa ficam só com você." />
          {membros.length === 0 ? (
            <Text style={a.vazio}>Ninguém na equipe ainda. Convide o gerente, quem cuida da porta ou das redes.</Text>
          ) : (
            <View style={{ gap: ESP.s }}>
              {membros.map((m) => (
                <TouchableOpacity key={m.id} style={a.cartao} onPress={() => setEditor({ tipo: 'membro', membro: m })} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${m.nome}, ${NOME_MODELO[m.modelo]}. Toque para editar`}>
                  <View style={a.linha}>
                    <View style={a.avatar}><Text style={a.avatarTxt}>{m.nome.slice(0, 2).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={a.titulo}>{m.nome}</Text>
                      <Text style={a.sub}>{NOME_MODELO[m.modelo] || 'Equipe'} · desde {dataHora(m.criado_em).split(' às')[0]}</Text>
                    </View>
                    <Feather name="edit-2" size={16} color={CP.fraco} />
                  </View>
                  <View style={a.perms}>
                    {m.permissoes.map((p) => <View key={p} style={a.perm}><Text style={a.permTxt}>{CURTO_PERMISSAO[p]}</Text></View>)}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Convites pendentes */}
          {convites.length > 0 && (
            <>
              <TituloSecao texto="Convites esperando" />
              <View style={{ gap: ESP.s }}>
                {convites.map((c) => (
                  <View key={c.codigo} style={a.cartao}>
                    <View style={a.linha}>
                      <View style={{ flex: 1 }}>
                        <Text style={a.codigoPeq}>{formatarCodigo(c.codigo)}</Text>
                        <Text style={a.sub}>{NOME_MODELO[c.modelo]}{c.apelido ? ` · para ${c.apelido}` : ''} · vale até {dataHora(c.expira_em)}</Text>
                      </View>
                    </View>
                    <View style={a.acoes}>
                      <TouchableOpacity style={[a.acao, { flex: 1 }]} onPress={() => void compartilharWhatsApp(mensagemDoConvite(nomeLocal, c.codigo, c.modelo))} accessibilityRole="button">
                        <Feather name="message-circle" size={14} color={CP.dim} /><Text style={a.acaoTxt}>Reenviar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={a.acao} onPress={() => cancelar(c)} accessibilityRole="button">
                        <Text style={[a.acaoTxt, { color: '#FF7A7A' }]}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Senha da porta */}
          <TituloSecao texto="Senha da porta" info="Para quem trabalha só na portaria e não tem conta: abre o app, vai em Conta › Sou da equipe da porta, digita o código da casa e a senha. Vale até as 6h e mostra só a porta e as aprovações da festa." />
          <View style={a.cartao}>
            {porta?.codigo ? (
              <>
                <Text style={a.rotuloPeq}>Código da casa</Text>
                <Text style={a.codigoGrande}>{porta.codigo}</Text>
                <Text style={a.sub}>{porta.temPin ? `Senha definida${porta.atualizadoEm ? ` em ${dataHora(porta.atualizadoEm)}` : ''}. Só você sabe a senha: o app não mostra.` : 'Sem senha ainda.'}</Text>
              </>
            ) : (
              <Text style={a.sub}>Defina uma senha de 6 números. O app cria o código da casa na hora.</Text>
            )}
            <View style={a.acoes}>
              <TouchableOpacity style={[a.acao, a.acaoPrincipal, { flex: 1 }]} onPress={() => setEditor({ tipo: 'pin' })} accessibilityRole="button">
                <Feather name="key" size={14} color="#FFF" /><Text style={[a.acaoTxt, { color: '#FFF' }]}>{porta?.temPin ? 'Trocar a senha' : 'Definir a senha'}</Text>
              </TouchableOpacity>
              {!!porta?.codigo && porta.temPin && (
                <TouchableOpacity style={[a.acao, { flex: 1 }]} onPress={() => void compartilharWhatsApp(mensagemDaPorta(nomeLocal, porta.codigo!))} accessibilityRole="button">
                  <Feather name="message-circle" size={14} color={CP.dim} /><Text style={a.acaoTxt}>Mandar o código</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {!!porta?.aparelhos.length && (
            <View style={[a.cartao, { marginTop: ESP.s }]}>
              <Text style={a.rotuloPeq}>Conectados agora na porta</Text>
              {porta.aparelhos.map((ap) => (
                <View key={ap.id} style={[a.linha, { marginTop: ESP.s }]}>
                  <Feather name="smartphone" size={16} color={CP.dim} />
                  <View style={{ flex: 1 }}>
                    <Text style={a.titulo}>{ap.apelido || 'Aparelho da porta'}</Text>
                    <Text style={a.sub}>desde {hora(ap.desde)} · sai sozinho às {hora(ap.expira_em)}</Text>
                  </View>
                  <TouchableOpacity style={a.acao} onPress={() => desconectar(ap)} accessibilityRole="button"><Text style={[a.acaoTxt, { color: '#FF7A7A' }]}>Desconectar</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {editor?.tipo === 'convite' && (
        <EditorConvite
          localId={localId}
          aoFechar={() => setEditor(null)}
          aoCriar={(codigo, modelo) => { setEditor(null); setCodigoNovo({ codigo, modelo }); void carregar(); }}
        />
      )}
      {editor?.tipo === 'membro' && (
        <EditorMembro key={editor.membro.id} membro={editor.membro} aoFechar={() => setEditor(null)} aoSalvo={() => { setEditor(null); void carregar(); }} />
      )}
      {editor?.tipo === 'pin' && (
        <EditorPin localId={localId} trocando={!!porta?.temPin} aparelhos={porta?.aparelhos.length || 0} aoFechar={() => setEditor(null)} aoSalvo={() => { setEditor(null); void carregar(); }} />
      )}

      {/* Código gerado */}
      <Modal visible={!!codigoNovo} transparent animationType="fade" onRequestClose={() => setCodigoNovo(null)}>
        <View style={[f.fundo, { justifyContent: 'center', padding: ESP.l }]}>
          <View style={[f.folha, { borderRadius: 22 }]}>
            <Text style={f.folhaTitulo}>Convite pronto</Text>
            <Text style={[a.sub, { marginTop: ESP.s }]}>Mande para a pessoa. Ela digita em Conta › "Tenho um código de equipe". Vale 7 dias, uma vez só.</Text>
            <Text style={[a.codigoGrande, { textAlign: 'center', marginVertical: ESP.l }]}>{codigoNovo ? formatarCodigo(codigoNovo.codigo) : ''}</Text>
            <TouchableOpacity style={[a.convidar, { backgroundColor: '#25D366', marginTop: 0 }]} onPress={() => codigoNovo && void compartilharWhatsApp(mensagemDoConvite(nomeLocal, codigoNovo.codigo, codigoNovo.modelo))} accessibilityRole="button">
              <Feather name="message-circle" size={18} color="#FFF" /><Text style={a.convidarTxt}>Mandar no WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={a.fechar} onPress={() => setCodigoNovo(null)} accessibilityRole="button"><Text style={a.fecharTxt}>Fechar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </TelaParceiro>
  );
}

// ---------- escolha de modelo + permissões ----------
function Permissoes({ modelo, permissoes, aoMudar }: { modelo: Modelo; permissoes: Permissao[]; aoMudar: (m: Modelo, p: Permissao[]) => void }) {
  return (
    <>
      <Chips
        rotulo="Papel"
        opcoes={MODELOS.map((m) => ({ valor: m.valor, rotulo: m.rotulo }))}
        valor={modelo}
        aoMudar={(m) => aoMudar(m as Modelo, m === 'personalizado' ? permissoes : PERMISSOES_DO_MODELO[m as Modelo])}
        ajuda={MODELOS.find((m) => m.valor === modelo)?.dica}
      />
      <View style={f.bloco}>
        <Text style={f.rotulo}>{modelo === 'personalizado' ? 'O que pode fazer' : 'O que este papel pode fazer'}</Text>
        {TODAS_PERMISSOES.map((p) => {
          const on = permissoes.includes(p);
          return (
            <Interruptor
              key={p}
              titulo={CURTO_PERMISSAO[p]}
              explicacao={TEXTO_PERMISSAO[p]}
              valor={on}
              // Mexer numa permissão vira "Personalizado"
              aoMudar={(v) => aoMudar('personalizado', v ? [...permissoes, p] : permissoes.filter((x) => x !== p))}
            />
          );
        })}
      </View>
    </>
  );
}

function Folha({ titulo, aoFechar, children, rodape }: { titulo: string; aoFechar: () => void; children: ReactNode; rodape: ReactNode }) {
  return (
    <Modal visible animationType="slide" transparent onRequestClose={aoFechar}>
      <KeyboardAvoidingView style={f.fundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={f.folha}>
          <View style={f.folhaTopo}>
            <Text style={f.folhaTitulo}>{titulo}</Text>
            <TouchableOpacity style={f.fechar} onPress={aoFechar} accessibilityLabel="Fechar"><Feather name="x" size={22} color={CP.texto} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: ESP.m }}>{children}</ScrollView>
          {rodape}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EditorConvite({ localId, aoFechar, aoCriar }: { localId: string; aoFechar: () => void; aoCriar: (codigo: string, modelo: Modelo) => void }) {
  const [modelo, setModelo] = useState<Modelo>('gerente');
  const [perms, setPerms] = useState<Permissao[]>(PERMISSOES_DO_MODELO.gerente);
  const [apelido, setApelido] = useState('');
  const [salvando, setSalvando] = useState(false);
  const criar = async () => {
    setSalvando(true);
    try { aoCriar(await criarConvite(localId, modelo, perms, apelido), modelo); }
    catch (e: any) { Alert.alert('Convite', e?.message || 'Não deu para criar o convite.'); }
    finally { setSalvando(false); }
  };
  return (
    <Folha titulo="Convidar para a equipe" aoFechar={aoFechar} rodape={<BarraSalvar emFolha rotulo="Gerar código" salvando={salvando} aoSalvar={() => void criar()} desabilitado={!perms.length} />}>
      <Campo rotulo="Nome de quem vai entrar (opcional)" valor={apelido} aoMudar={setApelido} max={40} exemplo="Ex.: Júlia (gerente da noite)" ajuda="Só para você reconhecer na lista." />
      <Permissoes modelo={modelo} permissoes={perms} aoMudar={(m, p) => { setModelo(m); setPerms(p); }} />
    </Folha>
  );
}

function EditorMembro({ membro, aoFechar, aoSalvo }: { membro: Membro; aoFechar: () => void; aoSalvo: () => void }) {
  const inicial = { modelo: (membro.modelo as Modelo) || 'personalizado', perms: membro.permissoes, apelido: membro.apelido || '' };
  const [modelo, setModelo] = useState<Modelo>(inicial.modelo);
  const [perms, setPerms] = useState<Permissao[]>(inicial.perms);
  const [apelido, setApelido] = useState(inicial.apelido);
  const [salvando, setSalvando] = useState(false);
  const sujo = JSON.stringify({ modelo, perms: [...perms].sort(), apelido }) !== JSON.stringify({ ...inicial, perms: [...inicial.perms].sort() });
  const fechar = () => confirmarSair(sujo, aoFechar);
  const salvar = async () => {
    setSalvando(true);
    try { await salvarMembro(membro.id, modelo, perms, apelido); aoSalvo(); }
    catch (e: any) { Alert.alert('Equipe', e?.message || 'Não deu para salvar.'); }
    finally { setSalvando(false); }
  };
  const remover = () =>
    Alert.alert(`Tirar ${membro.nome} da equipe?`, 'A pessoa perde o acesso ao Modo parceiro desta casa na hora. Para voltar, precisa de um convite novo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar da equipe', style: 'destructive', onPress: async () => { try { await removerDaEquipe(membro.id); aoSalvo(); } catch (e: any) { Alert.alert('Equipe', e?.message); } } },
    ]);
  return (
    <Folha titulo={membro.nome} aoFechar={fechar} rodape={<BarraSalvar emFolha rotulo="Salvar" salvando={salvando} aoSalvar={() => void salvar()} desabilitado={!sujo || !perms.length} secundario={{ rotulo: 'Remover', aoTocar: remover, perigo: true }} />}>
      <Campo rotulo="Nome na lista" valor={apelido} aoMudar={setApelido} max={40} exemplo={membro.nome} />
      <Permissoes modelo={modelo} permissoes={perms} aoMudar={(m, p) => { setModelo(m); setPerms(p); }} />
    </Folha>
  );
}

function EditorPin({ localId, trocando, aparelhos, aoFechar, aoSalvo }: { localId: string; trocando: boolean; aparelhos: number; aoFechar: () => void; aoSalvo: () => void }) {
  const [pin, setPin] = useState('');
  const [confirma, setConfirma] = useState('');
  const [salvando, setSalvando] = useState(false);
  const erroPin = pin.length === 6 && confirma.length === 6 ? validarPin(pin, confirma) : null;
  const salvar = async () => {
    const e = validarPin(pin, confirma);
    if (e) return Alert.alert('Senha da porta', e);
    const executar = async () => {
      setSalvando(true);
      try {
        const codigo = await definirPin(localId, pin);
        Alert.alert('Senha da porta salva', `Código da casa: ${codigo}\n\nPasse a senha pessoalmente para quem fica na porta. Ela não aparece mais no app.`);
        aoSalvo();
      } catch (x: any) {
        Alert.alert('Senha da porta', x?.message || 'Não deu para salvar.');
      } finally {
        setSalvando(false);
      }
    };
    if (trocando) {
      return Alert.alert('Trocar a senha da porta?', `Quem entrou com a senha antiga sai na hora${aparelhos ? ` (${aparelhos} aparelho${aparelhos === 1 ? '' : 's'} agora)` : ''} e precisa da senha nova.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Trocar', style: 'destructive', onPress: () => void executar() },
      ]);
    }
    void executar();
  };
  return (
    <Folha titulo={trocando ? 'Trocar a senha da porta' : 'Senha da porta'} aoFechar={aoFechar} rodape={<BarraSalvar emFolha rotulo="Salvar senha" salvando={salvando} aoSalvar={() => void salvar()} desabilitado={pin.length !== 6 || confirma.length !== 6} />}>
      <Text style={a.sub}>6 números. Evite datas e sequências (123456, 000000…).{trocando ? ' Trocar a senha derruba todos os aparelhos que entraram com a senha antiga.' : ''}</Text>
      <View style={f.bloco}>
        <Text style={f.rotulo}>Nova senha</Text>
        <TextInput style={[f.input, a.pin]} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} accessibilityLabel="Nova senha da porta" />
      </View>
      <View style={f.bloco}>
        <Text style={f.rotulo}>Repita a senha</Text>
        <TextInput style={[f.input, a.pin, !!erroPin && f.inputErro]} value={confirma} onChangeText={(v) => setConfirma(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} accessibilityLabel="Repita a senha da porta" />
        {!!erroPin && <Text style={[f.erro, { marginTop: 4 }]}>{erroPin}</Text>}
      </View>
    </Folha>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  erro: { color: '#FF7A7A', fontSize: 13, backgroundColor: '#FF7A7A14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  convidar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESP.s, minHeight: 52, borderRadius: RAIO.m, backgroundColor: '#7E57C2', marginTop: ESP.m },
  convidarTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  vazio: { color: CP.fraco, fontSize: 13, lineHeight: 18 },
  cartao: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A1B3D', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#B39DDB', fontSize: 13, fontWeight: '800' },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, lineHeight: 17, marginTop: 2 },
  perms: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: ESP.m },
  perm: { backgroundColor: '#2A2938', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  permTxt: { color: '#D0D0E0', fontSize: 11, fontWeight: '700' },
  acoes: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.m },
  acao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, paddingHorizontal: ESP.m, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda },
  acaoPrincipal: { backgroundColor: CP.rosa, borderColor: CP.rosa },
  acaoTxt: { color: CP.dim, fontSize: 12, fontWeight: '800' },
  rotuloPeq: { color: CP.secao, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  codigoGrande: { color: CP.texto, fontSize: 30, fontWeight: '900', letterSpacing: 4, marginVertical: 4 },
  codigoPeq: { color: CP.texto, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  pin: { fontSize: 24, letterSpacing: 10, textAlign: 'center' },
  fechar: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: ESP.s },
  fecharTxt: { color: CP.dim, fontSize: 14, fontWeight: '700' },
});
