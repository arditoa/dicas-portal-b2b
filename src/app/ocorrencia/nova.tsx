// Rodada 76 — registro de ocorrência em passos (migration 045).
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../lib/authContext';
import {
  ArquivoEscolhido,
  CANAIS,
  CATEGORIAS,
  CategoriaOcorrencia,
  LIMITE_ARQUIVOS,
  LIMITE_BYTES,
  LOCAL_TIPOS,
  VERSAO_CONSENTIMENTO,
  dataParaIso,
  enviarAnexo,
  mascaraData,
} from '../../lib/ocorrencias';
import { supabase } from '../../lib/supabase';

const PASSOS = ['Aviso', 'O que houve', 'Quando e onde', 'Relato', 'Provas', 'Contato e B.O.', 'Revisar'];

export default function NovaOcorrencia() {
  const router = useRouter();
  const { user, session } = useAuth();

  const [passo, setPasso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [falhasArquivos, setFalhasArquivos] = useState(0);

  const [consentiu, setConsentiu] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaOcorrencia | null>(null);
  const [risco, setRisco] = useState(false);
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [localTipo, setLocalTipo] = useState<'estabelecimento' | 'via_publica' | 'online' | 'outro'>('estabelecimento');
  const [localNome, setLocalNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [descricao, setDescricao] = useState('');
  const [envolvidos, setEnvolvidos] = useState('');
  const [testemunhas, setTestemunhas] = useState('');
  const [arquivos, setArquivos] = useState<ArquivoEscolhido[]>([]);
  const [boSituacao, setBoSituacao] = useState<'sim' | 'nao' | 'pretende'>('nao');
  const [boNumero, setBoNumero] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [contatoWhats, setContatoWhats] = useState('');
  const [contatoEmail, setContatoEmail] = useState(user?.email ?? '');
  const [preferido, setPreferido] = useState<'app' | 'whatsapp' | 'email'>('app');
  const [orientacao, setOrientacao] = useState(false);

  if (!session || !user) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <Cabecalho titulo="Registrar ocorrência" onVoltar={() => router.back()} />
          <View style={{ padding: 20, gap: 12 }}>
            <Text style={styles.texto}>
              Para registrar uma ocorrência, entre na sua conta pela aba Perfil. O login garante que
              só você e a equipe responsável vejam o seu relato e permite acompanhar o protocolo.
            </Text>
            <TouchableOpacity style={styles.btnPrimario} onPress={() => router.replace('/(tabs)/profile')}>
              <Text style={styles.btnPrimarioTxt}>Ir para o Perfil</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (protocolo) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <Cabecalho titulo="Ocorrência registrada" onVoltar={() => router.replace('/denunciar')} />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            <View style={styles.sucesso}>
              <Feather name="check-circle" size={26} color="#3DD68C" />
              <Text style={styles.sucessoTitulo}>Recebemos o seu relato</Text>
              <Text style={styles.protocolo} selectable>{protocolo}</Text>
              <Text style={styles.sucessoTexto}>Guarde este protocolo. Você acompanha tudo em “Minhas ocorrências”.</Text>
            </View>
            {falhasArquivos > 0 && (
              <View style={styles.alerta}>
                <Text style={styles.alertaTxt}>
                  {falhasArquivos} arquivo(s) não foram enviados. Abra a ocorrência em “Minhas
                  ocorrências” e conte à equipe, ou guarde as provas no seu aparelho para o B.O.
                </Text>
              </View>
            )}
            <View style={styles.caixa}>
              <Text style={styles.caixaTitulo}>Próximo passo importante</Text>
              <Text style={styles.texto}>
                Para que o caso possa ser investigado, registre o Boletim de Ocorrência na delegacia
                ou no serviço online da Polícia Civil do seu estado. Na tela da ocorrência você
                encontra um resumo organizado para copiar ou compartilhar. Guarde também as provas
                originais (prints, fotos e vídeos) no seu aparelho.
              </Text>
              <TouchableOpacity style={styles.btnSecundario} onPress={() => Linking.openURL(CANAIS.disque100)}>
                <Text style={styles.btnSecundarioTxt}>Ligar para o Disque 100</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.btnPrimario} onPress={() => router.replace('/ocorrencia')}>
              <Text style={styles.btnPrimarioTxt}>Ver minhas ocorrências</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const escolherArquivos = async () => {
    const restantes = LIMITE_ARQUIVOS - arquivos.length;
    if (restantes <= 0) {
      Alert.alert('Limite atingido', `Você pode anexar até ${LIMITE_ARQUIVOS} arquivos.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permissão necessária',
        'Para anexar fotos e vídeos, permita o acesso à galeria nos ajustes do aparelho.'
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: restantes,
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (res.canceled) return;

    const novos: ArquivoEscolhido[] = [];
    let recusados = 0;
    for (const a of res.assets) {
      const tipo: 'imagem' | 'video' = a.type === 'video' ? 'video' : 'imagem';
      const mime = a.mimeType || (tipo === 'video' ? 'video/mp4' : 'image/jpeg');
      const permitido = /^(image\/(jpeg|png|webp|heic|heif)|video\/(mp4|quicktime))$/.test(mime);
      if (!permitido || (a.fileSize && a.fileSize > LIMITE_BYTES)) {
        recusados++;
        continue;
      }
      novos.push({ uri: a.uri, tipo, mime, tamanho: a.fileSize ?? null, nome: a.fileName ?? null });
    }
    if (recusados > 0) {
      Alert.alert(
        'Alguns arquivos não entraram',
        'Aceitamos fotos (JPG, PNG, WebP, HEIC) e vídeos MP4 ou MOV de até 40 MB. Vídeos longos: grave um trecho de até 1 minuto.'
      );
    }
    setArquivos((atual) => [...atual, ...novos].slice(0, LIMITE_ARQUIVOS));
  };

  const validarPasso = (p: number): string | null => {
    if (p === 0 && !consentiu) return 'Marque a confirmação para continuar.';
    if (p === 1 && !categoria) return 'Escolha o tipo de ocorrência.';
    if (p === 2) {
      if (!dataParaIso(data)) return 'Informe a data do fato no formato DD/MM/AAAA (não pode ser futura).';
      if (uf && uf.trim().length !== 2) return 'O estado (UF) deve ter 2 letras, por exemplo SP.';
      if (localTipo !== 'online' && !localNome.trim() && !endereco.trim() && !cidade.trim()) {
        return 'Diga pelo menos o nome do local, o endereço ou a cidade.';
      }
    }
    if (p === 3 && descricao.trim().length < 40) {
      return 'Conte com mais detalhes o que aconteceu (mínimo de 40 caracteres).';
    }
    if (p === 5 && boSituacao === 'sim' && !boNumero.trim()) return 'Informe o número do B.O. ou escolha outra opção.';
    if (p === 5 && preferido === 'whatsapp' && contatoWhats.replace(/\D/g, '').length < 10) {
      return 'Informe o WhatsApp com DDD ou escolha outra forma de contato.';
    }
    return null;
  };

  const avancar = () => {
    const erro = validarPasso(passo);
    if (erro) {
      Alert.alert('Atenção', erro);
      return;
    }
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  };

  const enviar = async () => {
    for (let p = 0; p <= 5; p++) {
      const erro = validarPasso(p);
      if (erro) {
        setPasso(p);
        Alert.alert('Atenção', erro);
        return;
      }
    }
    setEnviando(true);
    try {
      const { data: criada, error } = await supabase
        .from('ocorrencias')
        .insert({
          reporter_id: user.id,
          categoria,
          risco_imediato: risco,
          data_fato: dataParaIso(data),
          hora_fato: hora.trim() || null,
          local_tipo: localTipo,
          local_nome: localNome.trim() || null,
          endereco: endereco.trim() || null,
          cidade: cidade.trim() || null,
          uf: uf.trim() ? uf.trim().toUpperCase() : null,
          descricao: descricao.trim(),
          envolvidos: envolvidos.trim() || null,
          testemunhas: testemunhas.trim() || null,
          bo_situacao: boSituacao,
          bo_numero: boSituacao === 'sim' ? boNumero.trim() : null,
          contato_nome: contatoNome.trim() || null,
          contato_email: contatoEmail.trim() || null,
          contato_whatsapp: contatoWhats.trim() || null,
          contato_preferido: preferido,
          quer_orientacao: orientacao,
          consentimento_versao: VERSAO_CONSENTIMENTO,
        })
        .select('id, protocolo')
        .single();
      if (error || !criada) throw error || new Error('Falha ao registrar.');

      let falhas = 0;
      for (const arq of arquivos) {
        try {
          await enviarAnexo(user.id, criada.id, arq);
        } catch {
          falhas++;
        }
      }
      setFalhasArquivos(falhas);
      setProtocolo(criada.protocolo);
    } catch (err: any) {
      Alert.alert('Não foi possível enviar', err?.message || 'Tente novamente em alguns instantes.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <Cabecalho
          titulo="Registrar ocorrência"
          onVoltar={() => (passo === 0 ? router.back() : setPasso(passo - 1))}
        />
        <View style={styles.progresso}>
          <Text style={styles.progressoTxt}>
            Passo {passo + 1} de {PASSOS.length} · {PASSOS[passo]}
          </Text>
          <View style={styles.barra}>
            <View style={[styles.barraCheia, { width: `${((passo + 1) / PASSOS.length) * 100}%` }]} />
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
            {passo === 0 && (
              <>
                <View style={styles.urgente}>
                  <Text style={styles.urgenteTitulo}>Em perigo agora? Ligue 190.</Text>
                  <Text style={styles.urgenteTxt}>
                    Este registro não é atendimento de emergência e o Dicas LGBT+ não é órgão policial.
                  </Text>
                  <TouchableOpacity style={styles.btnUrgente} onPress={() => Linking.openURL(CANAIS.emergencia)}>
                    <Text style={styles.btnUrgenteTxt}>Ligar 190</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.texto}>
                  Vamos organizar o seu relato em poucos passos. Você receberá um protocolo, poderá
                  anexar provas e acompanhar o atendimento da equipe. Ao final, terá um resumo pronto
                  para levar ao registro do Boletim de Ocorrência, que continua sendo feito na
                  delegacia ou no serviço online da Polícia Civil.
                </Text>
                <Text style={styles.texto}>
                  Seus dados e arquivos ficam em área privada, visíveis apenas para você e para a
                  equipe responsável, e nada é publicado.
                </Text>
                <TouchableOpacity style={styles.checkLinha} onPress={() => setConsentiu(!consentiu)} activeOpacity={0.8}>
                  <View style={[styles.check, consentiu && styles.checkOn]}>
                    {consentiu && <Feather name="check" size={14} color="#FFF" />}
                  </View>
                  <Text style={[styles.texto, { flex: 1 }]}>
                    Entendo que este relato contém informações sensíveis, autorizo o Dicas LGBT+ a
                    tratá-las para analisar o caso e entrar em contato, e sei que isto não substitui
                    o Boletim de Ocorrência.
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {passo === 1 && (
              <>
                <Text style={styles.label}>Qual foi o tipo de ocorrência?</Text>
                {CATEGORIAS.map((c) => (
                  <TouchableOpacity
                    key={c.v}
                    style={[styles.opcao, categoria === c.v && styles.opcaoOn]}
                    onPress={() => setCategoria(c.v)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.opcaoTitulo}>{c.rotulo}</Text>
                    <Text style={styles.opcaoDica}>{c.dica}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.linhaSwitch}>
                  <Text style={[styles.texto, { flex: 1 }]}>
                    Ainda existe risco para mim ou para outras pessoas (o agressor sabe onde moro,
                    continua me ameaçando etc.)?
                  </Text>
                  <Switch value={risco} onValueChange={setRisco} trackColor={{ true: '#E1306C' }} />
                </View>
                {risco && (
                  <Text style={styles.aviso}>
                    Registre aqui, mas com risco atual ligue também para o 190 ou procure uma delegacia.
                  </Text>
                )}
              </>
            )}

            {passo === 2 && (
              <>
                <Text style={styles.label}>Data do fato</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#606070"
                  keyboardType="number-pad"
                  value={data}
                  onChangeText={(v) => setData(mascaraData(v))}
                />
                <Text style={styles.label}>Horário aproximado (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex.: 23h30, de madrugada"
                  placeholderTextColor="#606070"
                  value={hora}
                  onChangeText={setHora}
                  maxLength={20}
                />
                <Text style={styles.label}>Onde aconteceu?</Text>
                <View style={styles.chips}>
                  {LOCAL_TIPOS.map((l) => (
                    <TouchableOpacity
                      key={l.v}
                      style={[styles.chip, localTipo === l.v && styles.chipOn]}
                      onPress={() => setLocalTipo(l.v)}
                    >
                      <Text style={[styles.chipTxt, localTipo === l.v && { color: '#FFF' }]}>{l.rotulo}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>{localTipo === 'online' ? 'Aplicativo, rede ou site' : 'Nome do local'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={localTipo === 'online' ? 'Ex.: Instagram, app de encontros' : 'Ex.: nome do bar ou da festa'}
                  placeholderTextColor="#606070"
                  value={localNome}
                  onChangeText={setLocalNome}
                  maxLength={160}
                />
                {localTipo !== 'online' && (
                  <>
                    <Text style={styles.label}>Endereço ou ponto de referência</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Rua, número, bairro"
                      placeholderTextColor="#606070"
                      value={endereco}
                      onChangeText={setEndereco}
                      maxLength={240}
                    />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Cidade</Text>
                        <TextInput style={styles.input} placeholder="São Paulo" placeholderTextColor="#606070" value={cidade} onChangeText={setCidade} maxLength={100} />
                      </View>
                      <View style={{ width: 80 }}>
                        <Text style={styles.label}>UF</Text>
                        <TextInput style={styles.input} placeholder="SP" placeholderTextColor="#606070" autoCapitalize="characters" value={uf} onChangeText={(v) => setUf(v.replace(/[^a-zA-Z]/g, '').slice(0, 2))} maxLength={2} />
                      </View>
                    </View>
                  </>
                )}
              </>
            )}

            {passo === 3 && (
              <>
                <Text style={styles.label}>Conte o que aconteceu</Text>
                <Text style={styles.dica}>
                  Descreva na ordem em que aconteceu: o que foi dito ou feito, por quem, e como você
                  reagiu. Quanto mais concreto, melhor para o B.O.
                </Text>
                <TextInput
                  style={[styles.input, styles.area]}
                  placeholder="Escreva com suas palavras..."
                  placeholderTextColor="#606070"
                  multiline
                  value={descricao}
                  onChangeText={setDescricao}
                  maxLength={5000}
                />
                <Text style={styles.contador}>{descricao.trim().length}/5000 (mínimo 40)</Text>
                <Text style={styles.label}>Pessoa(s) envolvida(s) (opcional)</Text>
                <Text style={styles.dica}>
                  Nome ou apelido, aparência, roupa, perfil em rede social, placa de veículo. Só o que
                  você souber.
                </Text>
                <TextInput
                  style={[styles.input, styles.areaMedia]}
                  placeholder="Ex.: homem, 30 a 40 anos, camisa azul, seguranças da porta..."
                  placeholderTextColor="#606070"
                  multiline
                  value={envolvidos}
                  onChangeText={setEnvolvidos}
                  maxLength={2000}
                />
                <Text style={styles.label}>Testemunhas (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.areaMedia]}
                  placeholder="Quem viu e pode confirmar? Nome e como encontrar."
                  placeholderTextColor="#606070"
                  multiline
                  value={testemunhas}
                  onChangeText={setTestemunhas}
                  maxLength={1000}
                />
              </>
            )}

            {passo === 4 && (
              <>
                <Text style={styles.label}>Fotos e vídeos (opcional)</Text>
                <Text style={styles.dica}>
                  Até {LIMITE_ARQUIVOS} arquivos: prints de conversa, fotos de lesões, do local, de
                  perfis, vídeos curtos (até 1 minuto). Vão para uma pasta privada. Mantenha também
                  os originais no seu aparelho. Fotos podem trazer a localização onde foram tiradas.
                </Text>
                <TouchableOpacity style={styles.btnSecundario} onPress={escolherArquivos}>
                  <Feather name="paperclip" size={15} color="#FFF" />
                  <Text style={styles.btnSecundarioTxt}>Escolher da galeria</Text>
                </TouchableOpacity>
                <View style={styles.grade}>
                  {arquivos.map((a, i) => (
                    <View key={a.uri + i} style={styles.miniatura}>
                      {a.tipo === 'imagem' ? (
                        <Image source={{ uri: a.uri }} style={styles.miniaturaImg} />
                      ) : (
                        <View style={[styles.miniaturaImg, styles.miniaturaVideo]}>
                          <Feather name="video" size={22} color="#FFF" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.remover}
                        onPress={() => setArquivos(arquivos.filter((_, j) => j !== i))}
                      >
                        <Feather name="x" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <Text style={styles.contador}>{arquivos.length}/{LIMITE_ARQUIVOS} arquivos</Text>
                <Text style={styles.dica}>
                  Depois de enviado, o arquivo não pode ser trocado nem apagado pelo app, para manter
                  o registro íntegro. Escolha com atenção.
                </Text>
              </>
            )}

            {passo === 5 && (
              <>
                <Text style={styles.label}>Você já registrou Boletim de Ocorrência?</Text>
                {([
                  ['sim', 'Sim, já registrei'],
                  ['pretende', 'Ainda não, pretendo registrar'],
                  ['nao', 'Não'],
                ] as const).map(([v, r]) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.opcao, boSituacao === v && styles.opcaoOn]}
                    onPress={() => setBoSituacao(v)}
                  >
                    <Text style={styles.opcaoTitulo}>{r}</Text>
                  </TouchableOpacity>
                ))}
                {boSituacao === 'sim' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Número do B.O."
                    placeholderTextColor="#606070"
                    value={boNumero}
                    onChangeText={setBoNumero}
                    maxLength={60}
                  />
                )}
                <Text style={styles.label}>Como prefere que a equipe responda?</Text>
                <View style={styles.chips}>
                  {([
                    ['app', 'Pelo app'],
                    ['whatsapp', 'WhatsApp'],
                    ['email', 'E-mail'],
                  ] as const).map(([v, r]) => (
                    <TouchableOpacity key={v} style={[styles.chip, preferido === v && styles.chipOn]} onPress={() => setPreferido(v)}>
                      <Text style={[styles.chipTxt, preferido === v && { color: '#FFF' }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.input} placeholder="Nome para contato (opcional)" placeholderTextColor="#606070" value={contatoNome} onChangeText={setContatoNome} maxLength={120} />
                <TextInput style={styles.input} placeholder="WhatsApp com DDD (opcional)" placeholderTextColor="#606070" keyboardType="phone-pad" value={contatoWhats} onChangeText={setContatoWhats} maxLength={30} />
                <TextInput style={styles.input} placeholder="E-mail (opcional)" placeholderTextColor="#606070" keyboardType="email-address" autoCapitalize="none" value={contatoEmail} onChangeText={setContatoEmail} maxLength={160} />
                <View style={styles.linhaSwitch}>
                  <Text style={[styles.texto, { flex: 1 }]}>
                    Quero orientação sobre como registrar o B.O. e onde buscar apoio jurídico ou
                    psicológico.
                  </Text>
                  <Switch value={orientacao} onValueChange={setOrientacao} trackColor={{ true: '#E1306C' }} />
                </View>
              </>
            )}

            {passo === 6 && (
              <>
                <Text style={styles.label}>Confira antes de enviar</Text>
                <View style={styles.caixa}>
                  <Linha t="Tipo" v={CATEGORIAS.find((c) => c.v === categoria)?.rotulo ?? ''} />
                  <Linha t="Data" v={`${data}${hora ? ` · ${hora}` : ''}`} />
                  <Linha t="Local" v={[localNome, endereco, [cidade, uf].filter(Boolean).join('/')].filter(Boolean).join(' — ') || 'não informado'} />
                  <Linha t="Relato" v={descricao.trim()} />
                  {!!envolvidos.trim() && <Linha t="Envolvidos" v={envolvidos.trim()} />}
                  {!!testemunhas.trim() && <Linha t="Testemunhas" v={testemunhas.trim()} />}
                  <Linha t="Arquivos" v={`${arquivos.length}`} />
                  <Linha t="B.O." v={boSituacao === 'sim' ? `Já registrado (${boNumero})` : boSituacao === 'pretende' ? 'Pretende registrar' : 'Não registrado'} />
                  <Linha t="Contato" v={preferido === 'app' ? 'Pelo app' : preferido === 'whatsapp' ? `WhatsApp ${contatoWhats}` : `E-mail ${contatoEmail}`} />
                </View>
                <Text style={styles.dica}>
                  Ao enviar, o relato fica registrado com data e hora e não pode ser editado; você
                  poderá acrescentar informações pelo acompanhamento.
                </Text>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.rodape}>
          {passo < PASSOS.length - 1 ? (
            <TouchableOpacity style={styles.btnPrimario} onPress={avancar}>
              <Text style={styles.btnPrimarioTxt}>Continuar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.btnPrimario, enviando && { opacity: 0.6 }]} onPress={enviar} disabled={enviando}>
              {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimarioTxt}>Enviar ocorrência</Text>}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Cabecalho({ titulo, onVoltar }: { titulo: string; onVoltar: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={onVoltar}>
        <Feather name="chevron-left" size={20} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.title}>{titulo}</Text>
    </View>
  );
}

function Linha({ t, v }: { t: string; v: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.linhaT}>{t}</Text>
      <Text style={styles.linhaV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121216' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1C1B26', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  progresso: { paddingHorizontal: 20, paddingTop: 14, gap: 6 },
  progressoTxt: { color: '#A0A0B2', fontSize: 12, fontWeight: '600' },
  barra: { height: 4, borderRadius: 2, backgroundColor: '#2D2B3D', overflow: 'hidden' },
  barraCheia: { height: 4, backgroundColor: '#E1306C' },
  texto: { color: '#C8C8D6', fontSize: 13, lineHeight: 19 },
  label: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  dica: { color: '#8A8AA0', fontSize: 12, lineHeight: 17 },
  aviso: { color: '#F5A524', fontSize: 12, lineHeight: 17 },
  contador: { color: '#8A8AA0', fontSize: 11, textAlign: 'right' },
  input: { backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', paddingHorizontal: 14, paddingVertical: 12, color: '#FFF', fontSize: 14 },
  area: { height: 170, textAlignVertical: 'top' },
  areaMedia: { height: 90, textAlignVertical: 'top' },
  opcao: { backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', padding: 12, gap: 2 },
  opcaoOn: { borderColor: '#E1306C', backgroundColor: '#2A1B2A' },
  opcaoTitulo: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  opcaoDica: { color: '#8A8AA0', fontSize: 12 },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', padding: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, backgroundColor: '#1C1B26', borderWidth: 1, borderColor: '#2D2B3D' },
  chipOn: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  chipTxt: { color: '#C8C8D6', fontSize: 12, fontWeight: '600' },
  checkLinha: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', padding: 12 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#606070', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkOn: { backgroundColor: '#E1306C', borderColor: '#E1306C' },
  urgente: { backgroundColor: '#2A1519', borderRadius: 12, borderWidth: 1, borderColor: '#5A2A31', padding: 12, gap: 8 },
  urgenteTitulo: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  urgenteTxt: { color: '#E3C9CD', fontSize: 12, lineHeight: 17 },
  btnUrgente: { backgroundColor: '#D6334A', height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnUrgenteTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniatura: { width: 92, height: 92 },
  miniaturaImg: { width: 92, height: 92, borderRadius: 10, backgroundColor: '#1C1B26' },
  miniaturaVideo: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2D2B3D' },
  remover: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#D6334A', justifyContent: 'center', alignItems: 'center' },
  caixa: { backgroundColor: '#1C1B26', borderRadius: 12, borderWidth: 1, borderColor: '#2D2B3D', padding: 14, gap: 4 },
  caixaTitulo: { color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  linhaT: { color: '#8A8AA0', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  linhaV: { color: '#FFF', fontSize: 13, lineHeight: 18 },
  rodape: { padding: 16, borderTopWidth: 1, borderTopColor: '#2D2B3D', backgroundColor: '#121216' },
  btnPrimario: { backgroundColor: '#E1306C', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnPrimarioTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  btnSecundario: { flexDirection: 'row', gap: 8, backgroundColor: '#2D2B3D', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnSecundarioTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  sucesso: { alignItems: 'center', gap: 8, backgroundColor: '#14241C', borderRadius: 14, borderWidth: 1, borderColor: '#1F4A33', padding: 20 },
  sucessoTitulo: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  protocolo: { color: '#3DD68C', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  sucessoTexto: { color: '#B9DCC8', fontSize: 12, textAlign: 'center' },
  alerta: { backgroundColor: '#2A2315', borderRadius: 12, borderWidth: 1, borderColor: '#5A4A1F', padding: 12 },
  alertaTxt: { color: '#F0D9A0', fontSize: 12, lineHeight: 17 },
});
