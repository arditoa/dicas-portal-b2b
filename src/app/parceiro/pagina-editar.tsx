// Tela 8 do Modo parceiro — editor de uma seção da Minha página (?secao=fotos|sobre|horarios|contato|endereco).
// Grava só os campos daquela seção (src/lib/parceiro/pagina.ts). Regras do portal (dashboard/perfil). Só o dono.
import { ACOLHIMENTO } from '../../lib/acolhimento';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarraSalvar, Campo, CampoHora, Chips, FotoUpload, Interruptor, estiloForm as f, useAvisoSairSemSalvar } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import TelaAdm from '../../components/adm/TelaAdm';
import { CLASSIFICACOES_LGBT } from '../../lib/classificacaoLgbt';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import {
  ATENDIMENTO, cidadeOpcional, coordenadasAqui, coordenadasDoEndereco, DIAS_SEMANA, LIMITE_GALERIA, MAX_DESCRICAO, obterPagina, Pagina,
  premiumAtivo, PUBLICO_OPCOES, salvarSecao, Secao, telefoneCurto,
} from '../../lib/parceiro/pagina';

const TITULO: Record<Secao, string> = { fotos: 'Fotos e vídeo', sobre: 'Sobre a casa', horarios: 'Horários', contato: 'Contato', endereco: 'Endereço e mapa' };
const ABRE = '18:00';
const FECHA = '23:00';
const MUSICA = '21:00';

export default function PaginaEditar() {
  return <EditorPagina />;
}

// Modo equipe (/adm/local-editar): mesmo editor, para qualquer casa, sem precisar ser o dono.
function CascaAdm({ titulo, subtitulo, children }: { titulo?: string; subtitulo?: string; children: React.ReactNode }) {
  return <TelaAdm titulo={titulo || ''} subtitulo={subtitulo} voltar>{children}</TelaAdm>;
}

export function EditorPagina({ localIdAdm }: { localIdAdm?: string }) {
  const router = useRouter();
  const { secao: s } = useLocalSearchParams<{ secao?: string }>();
  const secao = (['fotos', 'sobre', 'horarios', 'contato', 'endereco'].includes(s || '') ? s : 'sobre') as Secao;
  const { localAtivo, recarregar } = useModoParceiro();
  const dono = !!localIdAdm || localAtivo?.papel === 'dono';
  const idAlvo = localIdAdm || localAtivo?.local_id;
  const Casca = localIdAdm ? CascaAdm : TelaParceiro;

  const [p, setP] = useState<Pagina | null>(null);
  const [base, setBase] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const sujo = !!p && JSON.stringify(p) !== base;
  const voltar = useAvisoSairSemSalvar(sujo && !salvando);

  const carregar = useCallback(async () => {
    if (!idAlvo || !dono) return;
    try {
      const pg = await obterPagina(idAlvo);
      setP(pg);
      setBase(JSON.stringify(pg));
    } catch (e: any) {
      Alert.alert('Minha página', e?.message || 'Não deu para abrir.');
      router.back();
    }
  }, [idAlvo, dono, router]);
  useEffect(() => { void carregar(); }, [carregar]);

  const mudar = (x: Partial<Pagina>) => setP((a) => (a ? { ...a, ...x } : a));

  const salvar = async () => {
    if (!p) return;
    setSalvando(true);
    try {
      await salvarSecao(secao, p);
      setBase(JSON.stringify(p));
      if (secao === 'sobre' && !localIdAdm) void recarregar(); // o nome aparece no topo do Modo parceiro
      Alert.alert('Salvo', 'Já aparece na página da casa.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert(TITULO[secao], e?.message || 'Não deu para salvar.');
    } finally {
      setSalvando(false);
    }
  };

  if (!idAlvo || !dono) {
    return (
      <TelaParceiro titulo="Minha página">
        <Text style={a.aviso}>Só o dono do local mexe na página da casa.</Text>
      </TelaParceiro>
    );
  }
  if (!p) return <View style={[a.tela, a.centro]}><ActivityIndicator color={CP.rosa} /></View>;

  const r = recursosDaCategoria(p.categoria, p.subcategoria);
  const premium = premiumAtivo(p);

  const buscarEndereco = async () => {
    setBuscando(true);
    try {
      const c = await coordenadasDoEndereco(p);
      if (!c) Alert.alert('Mapa', 'Não encontramos esse endereço. Confira o endereço ou use "Estou na casa agora".');
      else mudar({ lat: c.lat, lng: c.lng });
    } catch (e: any) { Alert.alert('Mapa', e?.message); } finally { setBuscando(false); }
  };
  const usarAqui = async () => {
    setBuscando(true);
    try { mudar(await coordenadasAqui()); } catch (e: any) { Alert.alert('Mapa', e?.message || 'Não deu para pegar a localização.'); } finally { setBuscando(false); }
  };

  return (
    <View style={a.tela}>
      <Casca titulo={TITULO[secao]} subtitulo={p.nome}>
        {!localIdAdm && <TouchableOpacity style={a.voltar} onPress={voltar} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Minha página</Text></TouchableOpacity>}

        {secao === 'fotos' && (
          <>
            <FotoUpload rotulo="Foto de capa" valor={p.foto_capa_url} aoMudar={(u) => mudar({ foto_capa_url: u })} bucket="fotos-locais" pasta={p.id} prefixo="capa" altura={180} ajuda="A primeira foto que o público vê: ambiente, fachada ou o que a casa tem de melhor." />
            <FotoUpload rotulo="Logo (opcional)" valor={p.logo_url} aoMudar={(u) => mudar({ logo_url: u })} bucket="fotos-locais" pasta={p.id} prefixo="logo" aspecto={[1, 1]} altura={120} encaixe="contain" ajuda="Sem logo, o app usa a foto de capa." />
            <TituloSecao texto={`Galeria (${p.galeria_fotos.length} de ${LIMITE_GALERIA})`} />
            {!premium && <Text style={a.premium}>A galeria e o vídeo aparecem no app nos planos Premium e Fundador. Você pode preencher desde já.</Text>}
            <View style={a.galeria}>
              {p.galeria_fotos.map((u) => (
                <TouchableOpacity key={u} style={a.foto} onPress={() => Alert.alert('Foto da galeria', undefined, [{ text: 'Tirar da galeria', style: 'destructive', onPress: () => mudar({ galeria_fotos: p.galeria_fotos.filter((x) => x !== u) }) }, { text: 'Cancelar', style: 'cancel' }])} accessibilityLabel="Foto da galeria. Toque para tirar">
                  <Image source={{ uri: u }} style={StyleSheet.absoluteFill} />
                </TouchableOpacity>
              ))}
            </View>
            {p.galeria_fotos.length < LIMITE_GALERIA && (
              <FotoUpload rotulo="Adicionar foto à galeria" valor={null} aoMudar={(u) => u && mudar({ galeria_fotos: [...p.galeria_fotos, u].slice(0, LIMITE_GALERIA) })} bucket="fotos-locais" pasta={p.id} prefixo="galeria" />
            )}
            <Campo rotulo="Vídeo (link)" valor={p.video_url} aoMudar={(v) => mudar({ video_url: v })} icone="video" teclado="url" autoCapitalize="none" exemplo="https://instagram.com/reel/…" ajuda="Só link: Instagram, Reels ou YouTube." />
          </>
        )}

        {secao === 'sobre' && (
          <>
            <Campo rotulo="Nome da casa" valor={p.nome} aoMudar={(v) => mudar({ nome: v })} max={80} erro={!p.nome.trim() ? 'Obrigatório.' : null} ajuda="Pode ser diferente da razão social." />
            <Campo rotulo="Descrição" valor={p.descricao} aoMudar={(v) => mudar({ descricao: v })} linhas max={MAX_DESCRICAO} exemplo="O que a casa tem de especial, o clima, o que servem…" ajuda={p.descricao.trim().length < 20 ? 'Escreva pelo menos 20 letras: é o que convence a pessoa a ir.' : undefined} />
            <Chips
              rotulo="Relação com a comunidade LGBT+"
              opcoes={CLASSIFICACOES_LGBT.map((c) => ({ valor: c.value as string, rotulo: `${c.emoji} ${c.label}` }))}
              valor={p.classificacao_lgbt}
              aoMudar={(v) => mudar({ classificacao_lgbt: p.classificacao_lgbt === v ? null : v })}
              ajuda="Método da Câmara de Comércio LGBT+. Toque de novo para desmarcar."
            />
            <Chips
              multiplo
              rotulo="Público"
              opcoes={PUBLICO_OPCOES.map((o) => ({ valor: o.slug, rotulo: o.label }))}
              valor={p.publico_tags.filter((t) => t !== 'todos')}
              aoMudar={(l) => mudar({ publico_tags: l.length ? l : ['todos'] })}
              ajuda="Nenhum marcado = todo mundo."
            />
            {p.acolhimento && (
              <Chips
                multiplo
                rotulo="Acolhimento e acessibilidade"
                opcoes={ACOLHIMENTO.map((o) => ({ valor: o.slug, rotulo: o.rotulo }))}
                valor={p.acolhimento}
                aoMudar={(l) => mudar({ acolhimento: l })}
                ajuda="Marque só o que a casa oferece de verdade. Aparece na sua página e nos filtros do app."
              />
            )}
          </>
        )}

        {secao === 'horarios' && (
          <>
            {!r.pedeHorario && <Text style={a.premium}>Para a sua categoria, o horário é opcional.</Text>}
            {DIAS_SEMANA.map((d) => {
              const dia = p.horario_funcionamento[d.chave] || { aberto: false };
              const set = (x: Partial<typeof dia>) => mudar({ horario_funcionamento: { ...p.horario_funcionamento, [d.chave]: { ...dia, ...x } } });
              return (
                <View key={d.chave} style={a.dia}>
                  <Interruptor titulo={d.label} explicacao={dia.aberto ? `Abre ${dia.abre || '--'} · fecha ${dia.fecha || '--'}` : 'Fechado'} valor={dia.aberto} aoMudar={(v) => set(v ? { aberto: true, abre: dia.abre || ABRE, fecha: dia.fecha || FECHA } : { aberto: false })} />
                  {dia.aberto && (
                    <>
                      <View style={a.duas}>
                        <View style={{ flex: 1 }}><CampoHora rotulo="Abre" valor={dia.abre || null} aoMudar={(v) => set({ abre: v || undefined })} /></View>
                        <View style={{ flex: 1 }}><CampoHora rotulo="Fecha" valor={dia.fecha || null} aoMudar={(v) => set({ fecha: v || undefined })} /></View>
                      </View>
                      <Interruptor titulo="Tem música ao vivo?" valor={!!dia.musica_ao_vivo} aoMudar={(v) => set({ musica_ao_vivo: v ? dia.musica_ao_vivo || MUSICA : undefined })} />
                      {!!dia.musica_ao_vivo && <CampoHora rotulo="Começa às" valor={dia.musica_ao_vivo} aoMudar={(v) => set({ musica_ao_vivo: v || undefined })} />}
                    </>
                  )}
                </View>
              );
            })}
          </>
        )}

        {secao === 'contato' && (
          <>
            <Campo rotulo="Instagram" valor={p.instagram} aoMudar={(v) => mudar({ instagram: v.replace(/\s/g, '') })} icone="instagram" autoCapitalize="none" exemplo="@suacasa" />
            <Campo rotulo="WhatsApp / telefone" valor={p.contato_telefone} aoMudar={(v) => mudar({ contato_telefone: v })} teclado="phone-pad" exemplo="(11) 90000-0000" erro={telefoneCurto(p.contato_telefone) ? 'Parece incompleto: confere se o DDD está incluído?' : null} />
            <Campo rotulo="E-mail" valor={p.contato_email} aoMudar={(v) => mudar({ contato_email: v.trim() })} teclado="email-address" autoCapitalize="none" />
            <Campo rotulo="Nome do contato" valor={p.contato_nome} aoMudar={(v) => mudar({ contato_nome: v })} ajuda="Só para a equipe Dicas falar com vocês." />
            {p.categoria === 'servicos' && (
              <>
                <Chips rotulo="Atendimento" opcoes={ATENDIMENTO} valor={p.atendimento_tipo} aoMudar={(v) => mudar({ atendimento_tipo: v })} />
                <Campo rotulo="Especialidade" valor={p.especialidade} aoMudar={(v) => mudar({ especialidade: v })} exemplo="Ex.: Advocacia LGBT+, Psicologia" />
              </>
            )}
            {p.categoria === 'produtos' && (
              <Campo rotulo="Link da loja online (opcional)" valor={p.link_loja_online} aoMudar={(v) => mudar({ link_loja_online: v })} icone="link" teclado="url" autoCapitalize="none" exemplo="https://…" />
            )}
          </>
        )}

        {secao === 'endereco' && (
          <>
            <Campo rotulo="Endereço" valor={p.endereco} aoMudar={(v) => mudar({ endereco: v })} exemplo="Rua, número" />
            <Campo rotulo="Bairro" valor={p.bairro} aoMudar={(v) => mudar({ bairro: v })} />
            <Campo rotulo="Bairro para exibir (opcional)" valor={p.bairro_exibicao} aoMudar={(v) => mudar({ bairro_exibicao: v })} exemplo="Ex.: Augusta" ajuda="Só muda o texto mostrado no app; o mapa usa o endereço." />
            <Campo rotulo={cidadeOpcional(p.categoria) ? 'Cidade (opcional)' : 'Cidade'} valor={p.cidade} aoMudar={(v) => mudar({ cidade: v })} erro={!cidadeOpcional(p.categoria) && !p.cidade.trim() ? 'Obrigatória.' : null} />
            <TituloSecao texto="Ponto no mapa" info={'Sem o ponto no mapa, o botão "Ver no mapa" e a distância não funcionam.'} />
            <Text style={[f.ajuda, { marginBottom: ESP.s }]}>{p.lat != null && p.lng != null ? `Marcado: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : 'Ainda sem ponto no mapa.'}</Text>
            <View style={a.duas}>
              <TouchableOpacity style={[a.botao, { flex: 1 }]} onPress={() => void buscarEndereco()} disabled={buscando} accessibilityRole="button">
                {buscando ? <ActivityIndicator color={CP.dim} /> : <><Feather name="search" size={14} color={CP.dim} /><Text style={a.botaoTxt}>Pelo endereço</Text></>}
              </TouchableOpacity>
              <TouchableOpacity style={[a.botao, { flex: 1 }]} onPress={() => void usarAqui()} disabled={buscando} accessibilityRole="button">
                <Feather name="navigation" size={14} color={CP.dim} /><Text style={a.botaoTxt}>Estou na casa agora</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <View style={{ height: ESP.xl }} />
      </Casca>
      <BarraSalvar rotulo="Salvar" salvando={salvando} aoSalvar={() => void salvar()} desabilitado={!sujo} />
    </View>
  );
}

const a = StyleSheet.create({
  tela: { flex: 1, backgroundColor: CP.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  premium: { color: '#FFD54F', fontSize: 12, lineHeight: 17, backgroundColor: '#FFD54F14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.s },
  galeria: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s, marginTop: ESP.s },
  foto: { width: 96, height: 96, borderRadius: RAIO.s, overflow: 'hidden', backgroundColor: CP.card },
  dia: { marginTop: ESP.s, paddingBottom: ESP.s, borderBottomColor: CP.borda, borderBottomWidth: StyleSheet.hairlineWidth },
  duas: { flexDirection: 'row', gap: ESP.s },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 46, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda },
  botaoTxt: { color: CP.dim, fontSize: 12, fontWeight: '800' },
});
