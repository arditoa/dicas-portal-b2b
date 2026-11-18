// Tela 3 do Modo parceiro — Agenda da semana (Divulgar › Agenda da semana).
// Regra copiada do portal (portal-b2b-lgbt/src/app/dashboard/agenda): 7 dias, "só nesta semana" ou
// "repetir toda semana", cartaz da semana opcional, esta semana ou a próxima. Dados em src/lib/parceiro/agenda.ts.
// Novidades do app: prévia de como o cliente vê, destacar com o plano (migração 101, cota 4/mês, só dono)
// e compartilhar no WhatsApp/Instagram com o link da casa.
// Permissão: 'festa' para editar; destacar só o dono.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarraSalvar, Campo, Chips, confirmarSair, ddmm, FotoUpload, Interruptor, Previa, dataDaChave, chaveData, estiloForm as f } from '../../components/parceiro/form';
import { CartaoAgendaPrevia, CartazPrevia, DestaquePrevia } from '../../components/parceiro/PreviaAgenda';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import {
  CartazAgenda, cartazVazio, chaveDestaque, DiaAgenda, destacar, destaquesUsadosNoMes, idDoDia, LIMITE_DESTAQUES, limparDia,
  listarDestaques, listarSemana, NOMES_DIA, nomeDoMes, PUBLICOS_AGENDA, removerCartaz, salvarCartaz, salvarDia, segundaDaSemana, somarDias,
  temDestaqueNoPlano, textoDaAgenda, validarDia,
} from '../../lib/parceiro/agenda';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import { falarComEquipe } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

const rotuloDia = (k: string) => {
  const d = dataDaChave(k);
  return `${NOMES_DIA[d.getDay()]}, ${ddmm(d)}`;
};

export default function Agenda() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const dono = localAtivo?.papel === 'dono';
  const liberado = !!localAtivo && pode('festa') && recursosDaCategoria(localAtivo.categoria).agenda;

  const [offset, setOffset] = useState(0);
  const [dias, setDias] = useState<DiaAgenda[]>([]);
  const [cartaz, setCartaz] = useState<CartazAgenda>(cartazVazio());
  const [destaques, setDestaques] = useState<Set<string>>(new Set());
  const [temPlano, setTemPlano] = useState<boolean | null>(null);
  const [usadas, setUsadas] = useState<number | null>(null);
  const [onde, setOnde] = useState<{ bairro: string | null; cidade: string | null; aprovado: boolean } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editDia, setEditDia] = useState<DiaAgenda | null>(null);
  const [editCartaz, setEditCartaz] = useState<CartazAgenda | null>(null);
  const [destacando, setDestacando] = useState<string | null>(null);

  const segunda = segundaDaSemana(offset);
  const chaveSegunda = chaveData(segunda);
  const hoje = chaveData(new Date());
  const rotuloSemana = `${ddmm(segunda)} a ${ddmm(somarDias(segunda, 6))}`;

  const carregar = useCallback(async (off: number) => {
    if (!localId) return;
    setErro('');
    try {
      const [sem, dest] = await Promise.all([listarSemana(localId, off), listarDestaques(localId)]);
      setDias(sem.dias);
      setCartaz(sem.cartaz);
      setDestaques(dest);
    } catch (e: any) {
      setErro(e?.message || 'Não deu para carregar a agenda.');
    } finally {
      setCarregando(false);
    }
  }, [localId]);

  // Plano, cota do mês e endereço (para a prévia) mudam pouco: carrega ao abrir a tela.
  const carregarExtras = useCallback(async () => {
    if (!localId) return;
    const [plano, n, loc] = await Promise.all([
      dono ? temDestaqueNoPlano(localId) : Promise.resolve(false),
      dono ? destaquesUsadosNoMes(localId, chaveData(new Date())) : Promise.resolve(null),
      supabase.from('locais').select('bairro, cidade, status').eq('id', localId).maybeSingle(),
    ]);
    setTemPlano(plano);
    setUsadas(n);
    const l = loc.data as { bairro: string | null; cidade: string | null; status: string | null } | null;
    if (l) setOnde({ bairro: l.bairro, cidade: l.cidade, aprovado: l.status === 'aprovado' });
  }, [localId, dono]);

  useFocusEffect(useCallback(() => {
    if (!liberado) return;
    void carregar(offset);
    void carregarExtras();
  }, [liberado, carregar, carregarExtras, offset]));

  const trocarSemana = (o: number) => {
    if (o === offset) return;
    setCarregando(true);
    setOffset(o);
  };

  // ---------- destacar com o plano ----------
  const alternarDestaque = (agendaId: string, data: string, rotulo: string, ligado: boolean, semana: boolean) => {
    const mes = nomeDoMes(data);
    const executar = async () => {
      const k = chaveDestaque(agendaId, data);
      setDestacando(k);
      try {
        const r = await destacar(agendaId, data, !ligado);
        const novo = new Set(destaques);
        if (ligado) novo.delete(k);
        else novo.add(k);
        setDestaques(novo);
        if (data.slice(0, 7) === hoje.slice(0, 7)) setUsadas(r.usadas);
        else void destaquesUsadosNoMes(localId, hoje).then(setUsadas);
        Alert.alert(ligado ? 'Destaque tirado' : 'Destacado!', `Destaques da agenda em ${mes}: ${r.usadas} de ${r.limite}.`);
      } catch (e: any) {
        Alert.alert('Destaque', e?.message || 'Não deu para destacar agora.');
      } finally {
        setDestacando(null);
      }
    };
    if (ligado) {
      return Alert.alert('Tirar o destaque?', `${rotulo} sai do topo de Eventos e o destaque volta para a cota de ${mes}.`, [
        { text: 'Manter', style: 'cancel' },
        { text: 'Tirar destaque', style: 'destructive', onPress: () => void executar() },
      ]);
    }
    Alert.alert(
      semana ? 'Destacar o cartaz da semana?' : 'Destacar este dia?',
      `${rotulo} aparece em Bares › Agenda, em "Em destaque nessa semana", ${semana ? 'de segunda a domingo' : 'até o fim do dia'}. Usa 1 dos ${LIMITE_DESTAQUES} destaques de ${mes}.`,
      [{ text: 'Agora não', style: 'cancel' }, { text: 'Destacar', onPress: () => void executar() }],
    );
  };

  // ---------- compartilhar ----------
  const texto = useMemo(() => textoDaAgenda(localAtivo?.nome || 'nosso espaço', localId, dias, cartaz), [localAtivo?.nome, localId, dias, cartaz]);
  const compartilharWhatsApp = async () => {
    const t = encodeURIComponent(texto);
    try {
      const app = `whatsapp://send?text=${t}`;
      if (await Linking.canOpenURL(app)) await Linking.openURL(app);
      else await Linking.openURL(`https://api.whatsapp.com/send?text=${t}`);
    } catch {
      Alert.alert('WhatsApp', 'Não foi possível abrir o WhatsApp agora.');
    }
  };
  const compartilharOutros = () => {
    Share.share({ message: texto }).catch(() => {});
  };

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Agenda da semana">
        <Text style={a.aviso}>Seu acesso não inclui a agenda deste local. Peça para o dono liberar a permissão de festas e agenda.</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  const preenchidos = dias.filter((d) => idDoDia(d)).length;
  const ondeLocal = onde ? onde.bairro || onde.cidade || undefined : undefined;
  const noAr = dias.filter((d) => idDoDia(d) && d.ativo && !d.passou && d.titulo.trim());
  const cartazNoAr = !!cartaz.id && cartaz.ativo;
  const kCartaz = cartaz.id ? chaveDestaque(cartaz.id, chaveSegunda) : '';
  const fotoDestaques = [
    ...(cartaz.id && destaques.has(kCartaz) ? [{ k: kCartaz, foto: cartaz.foto_url, titulo: localAtivo.nome }] : []),
    ...dias.filter((d) => idDoDia(d) && destaques.has(chaveDestaque(idDoDia(d)!, d.chave))).map((d) => ({ k: d.chave, foto: d.foto_url, titulo: d.titulo })),
  ];

  return (
    <TelaParceiro titulo="Agenda da semana" subtitulo="Aparece no app em Eventos › Essa semana. Não aparece na página da casa." atualizando={false} aoAtualizar={() => { void carregar(offset); void carregarExtras(); }} aoVoltar={() => router.back()}>

      <View style={{ marginTop: ESP.l }}>
        <Chips preencher opcoes={[{ valor: 0, rotulo: 'Esta semana' }, { valor: 1, rotulo: 'Próxima semana' }]} valor={offset} aoMudar={trocarSemana} />
        <Text style={a.semana}><Feather name="calendar" size={12} color={CP.dim} /> {rotuloSemana} · {preenchidos} de 7 dias preenchidos</Text>
      </View>

      {!!erro && <Text style={a.erro}>{erro}</Text>}
      {onde && !onde.aprovado && <Text style={a.alerta}>A página da casa ainda está em análise. A agenda fica salva e aparece no app quando ela for aprovada.</Text>}

      {/* Cota do plano (só o dono destaca) */}
      {dono && temPlano === true && (
        <View style={a.cota}>
          <View style={{ flex: 1 }}>
            <Text style={a.cotaTitulo}>Destaques de {nomeDoMes(hoje)}: {usadas ?? '–'} de {LIMITE_DESTAQUES}</Text>
            <Text style={a.cotaSub}>4 destaques por mês, só da agenda (eventos têm cota própria). Aparecem em Bares › Agenda.</Text>
          </View>
          <View style={a.pontos}>
            {Array.from({ length: LIMITE_DESTAQUES }, (_, i) => <View key={i} style={[a.ponto, i < (usadas ?? 0) && { backgroundColor: '#FFD54F' }]} />)}
          </View>
        </View>
      )}
      {dono && temPlano === false && (
        <TouchableOpacity style={a.cota} onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero destacar a agenda no topo de Eventos.`)} accessibilityRole="button">
          <Feather name="lock" size={16} color={CP.dim} />
          <View style={{ flex: 1 }}>
            <Text style={a.cotaTitulo}>Destacar no topo de Eventos</Text>
            <Text style={a.cotaSub}>Incluído nos planos Premium e Fundador (4 por mês). Toque para falar com a equipe.</Text>
          </View>
        </TouchableOpacity>
      )}

      {carregando ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} />
      ) : (
        <>
          {/* Cartaz da semana */}
          <TituloSecao texto="Cartaz da semana (opcional)" info="Já tem a arte com a programação da semana inteira? Envie aqui. Ela aparece no topo de Eventos › Essa semana." />
          <TouchableOpacity style={a.cartao} onPress={() => setEditCartaz({ ...cartaz })} activeOpacity={0.85} accessibilityRole="button">
            <View style={a.linha}>
              <View style={[a.icone, { backgroundColor: cartaz.id ? '#7E57C2' : '#2A2938' }]}><Feather name="image" size={16} color="#FFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={a.diaTitulo}>{cartaz.id ? cartaz.titulo || 'Programação da semana' : 'Enviar o cartaz da semana'}</Text>
                <Text style={a.diaSub} numberOfLines={1}>
                  {cartaz.id ? (cartaz.ativo ? (cartaz.foto_url ? 'Com imagem' : 'Só texto') : 'Desligado: não aparece no app') : 'Uma arte com tudo o que rola de segunda a domingo'}
                </Text>
              </View>
              <Feather name="edit-2" size={16} color={CP.fraco} />
            </View>
            {dono && temPlano && cartazNoAr && (
              <BotaoDestaque
                ligado={destaques.has(kCartaz)}
                rotulo="Destacar o cartaz da semana"
                carregando={destacando === kCartaz}
                aoTocar={() => alternarDestaque(cartaz.id!, chaveSegunda, `O cartaz de ${rotuloSemana}`, destaques.has(kCartaz), true)}
              />
            )}
          </TouchableOpacity>

          {/* Os 7 dias */}
          <TituloSecao texto="Dia a dia" />
          <View style={{ gap: ESP.s }}>
            {dias.map((d) => {
              const id = idDoDia(d);
              const k = id ? chaveDestaque(id, d.chave) : '';
              const ligado = !!id && destaques.has(k);
              return (
                <TouchableOpacity key={d.chave} style={[a.cartao, d.passou && { opacity: 0.5 }]} onPress={() => setEditDia({ ...d })} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${rotuloDia(d.chave)}. ${d.titulo || 'Vazio'}. Toque para editar`}>
                  <View style={a.linha}>
                    <View style={a.data}>
                      <Text style={a.dataDia}>{NOMES_DIA[d.diaSemana].slice(0, 3)}</Text>
                      <Text style={a.dataNum}>{ddmm(dataDaChave(d.chave))}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      {id ? (
                        <>
                          <Text style={a.diaTitulo} numberOfLines={1}>{d.titulo}</Text>
                          <Text style={a.diaSub} numberOfLines={1}>
                            {[d.horario, !d.datadaId && d.fixaId ? 'repete toda semana' : null, !d.ativo ? 'desligado' : null, d.passou ? 'já passou' : null].filter(Boolean).join(' · ') || 'Só nesta semana'}
                          </Text>
                        </>
                      ) : (
                        <Text style={a.vazio}>{d.passou ? 'Já passou' : 'Toque para contar o que rola'}</Text>
                      )}
                    </View>
                    {ligado ? <Feather name="star" size={16} color="#FFD54F" /> : <Feather name={id ? 'edit-2' : 'plus'} size={16} color={id ? CP.fraco : CP.rosa} />}
                  </View>
                  {dono && temPlano && !!id && d.ativo && !d.passou && (
                    <BotaoDestaque ligado={ligado} rotulo="Destacar este dia" carregando={destacando === k} aoTocar={() => alternarDestaque(id, d.chave, `${rotuloDia(d.chave)} · ${d.titulo}`, ligado, false)} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Prévia */}
          <TituloSecao texto="Como o cliente vê" />
          <Previa onde="Eventos › Essa semana" vazio="Preencha um dia ou o cartaz para ver a prévia.">
            {fotoDestaques.length > 0 && (
              <View style={{ marginBottom: ESP.m }}>
                <Text style={a.previaRotulo}>Bares › Agenda · Em destaque nessa semana</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: ESP.s }}>
                  {fotoDestaques.map((x) => <DestaquePrevia key={x.k} foto_url={x.foto || undefined} titulo={x.titulo} />)}
                </ScrollView>
              </View>
            )}
            {cartazNoAr && <CartazPrevia foto_url={cartaz.foto_url || undefined} descricao={cartaz.descricao} nomeLocal={localAtivo.nome} ondeLocal={ondeLocal} />}
            {noAr.map((d) => (
              <CartaoAgendaPrevia key={d.chave} dia={rotuloDia(d.chave)} titulo={d.titulo} horario={d.horario} descricao={d.descricao} foto_url={d.foto_url || undefined} link={d.link} nomeLocal={localAtivo.nome} ondeLocal={ondeLocal} />
            ))}
          </Previa>

          {/* Compartilhar */}
          <TituloSecao texto="Compartilhar" />
          <Text style={a.dica}>Manda a agenda com o link da casa no app. No Instagram, cole o texto no story ou na legenda.</Text>
          <View style={a.botoes}>
            {/* 18/11: botões mais sóbrios — cartão escuro com ícone colorido, no padrão do resto do Modo parceiro. */}
            <TouchableOpacity style={a.compartilhar} onPress={() => void compartilharWhatsApp()} accessibilityRole="button" accessibilityLabel="Compartilhar no WhatsApp">
              <View style={[a.compartilharIcone, { backgroundColor: '#25D36622' }]}><Feather name="message-circle" size={17} color="#25D366" /></View>
              <View style={{ flex: 1 }}>
                <Text style={a.compartilharTxt}>WhatsApp</Text>
                <Text style={a.compartilharSub} numberOfLines={1}>Grupos e contatos</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={a.compartilhar} onPress={compartilharOutros} accessibilityRole="button" accessibilityLabel="Compartilhar no Instagram e outros apps">
              <View style={[a.compartilharIcone, { backgroundColor: '#E1306C22' }]}><Feather name="instagram" size={17} color="#E1306C" /></View>
              <View style={{ flex: 1 }}>
                <Text style={a.compartilharTxt}>Instagram</Text>
                <Text style={a.compartilharSub} numberOfLines={1}>Story, legenda e outros</Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {editDia && (
      <EditorDia
        key={editDia.chave}
        dia={editDia}
        localId={localId}
        aoFechar={() => setEditDia(null)}
        aoSalvo={() => { setEditDia(null); void carregar(offset); }}
      />
      )}
      {editCartaz && (
      <EditorCartaz
        cartaz={editCartaz}
        localId={localId}
        chaveSegunda={chaveSegunda}
        rotuloSemana={rotuloSemana}
        aoFechar={() => setEditCartaz(null)}
        aoSalvo={() => { setEditCartaz(null); void carregar(offset); }}
      />
      )}
    </TelaParceiro>
  );
}

function BotaoDestaque({ ligado, rotulo, carregando, aoTocar }: { ligado: boolean; rotulo: string; carregando: boolean; aoTocar: () => void }) {
  return (
    <TouchableOpacity style={[a.destacar, ligado && a.destacarOn]} onPress={aoTocar} disabled={carregando} accessibilityRole="button" accessibilityState={{ selected: ligado, busy: carregando }}>
      {carregando ? <ActivityIndicator size="small" color="#FFD54F" /> : <Feather name="star" size={14} color={ligado ? '#1A1020' : '#FFD54F'} />}
      <Text style={[a.destacarTxt, ligado && { color: '#1A1020' }]}>{ligado ? 'Em destaque · toque para tirar' : rotulo}</Text>
    </TouchableOpacity>
  );
}

// ---------- folha de edição de um dia ----------
// Montada só enquanto está aberta (key = dia), então o rascunho começa sempre do que está salvo.
function EditorDia({ dia, localId, aoFechar, aoSalvo }: { dia: DiaAgenda; localId: string; aoFechar: () => void; aoSalvo: () => void }) {
  const [d, setD] = useState<DiaAgenda>(dia);
  const [salvando, setSalvando] = useState(false);
  const [erroTitulo, setErroTitulo] = useState<string | null>(null);
  const [original] = useState(() => JSON.stringify(dia));
  const sujo = JSON.stringify(d) !== original;
  const existe = !!idDoDia(dia);
  const fechar = () => confirmarSair(sujo, aoFechar);

  const salvar = async () => {
    const e = validarDia(d);
    if (e) return setErroTitulo(e);
    setSalvando(true);
    try {
      await salvarDia(localId, d);
      aoSalvo();
    } catch (x: any) {
      Alert.alert('Agenda', x?.message || 'Não deu para salvar.');
    } finally {
      setSalvando(false);
    }
  };
  const limpar = () => {
    if (!existe) return aoFechar();
    const fixa = !dia.datadaId;
    Alert.alert(
      fixa ? 'Parar de repetir?' : 'Limpar este dia?',
      fixa ? `Isso para de repetir "${NOMES_DIA[dia.diaSemana]}" em todas as semanas.` : `Remove a atração de ${rotuloDia(dia.chave)}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: fixa ? 'Parar de repetir' : 'Limpar', style: 'destructive',
          onPress: async () => {
            setSalvando(true);
            try { await limparDia(dia); aoSalvo(); } catch (x: any) { Alert.alert('Agenda', x?.message || 'Não deu para limpar.'); } finally { setSalvando(false); }
          },
        },
      ],
    );
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={fechar}>
      <KeyboardAvoidingView style={f.fundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={f.folha}>
          <View style={f.folhaTopo}>
            <Text style={f.folhaTitulo}>{rotuloDia(d.chave)}</Text>
            <TouchableOpacity style={f.fechar} onPress={fechar} accessibilityLabel="Fechar"><Feather name="x" size={22} color={CP.texto} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: ESP.m }}>
            <Campo rotulo="O que rola?" valor={d.titulo} aoMudar={(v) => { setD({ ...d, titulo: v }); setErroTitulo(null); }} erro={erroTitulo} max={80} exemplo="Ex.: Noite do Karaokê com a Drag Lola" ajuda="É o título que aparece em Eventos." />
            <Campo rotulo="Horário" valor={d.horario} aoMudar={(v) => setD({ ...d, horario: v })} max={40} exemplo="Ex.: 21h ou a partir das 22h" />
            <Campo rotulo="Detalhes (opcional)" valor={d.descricao} aoMudar={(v) => setD({ ...d, descricao: v })} max={300} linhas exemplo="Entrada, atrações, dress code…" />
            <Campo rotulo="Link (opcional)" valor={d.link} aoMudar={(v) => setD({ ...d, link: v })} icone="link" teclado="url" autoCapitalize="none" exemplo="Post do Instagram, ingressos…" ajuda='Vira o botão "Ver mais" no cartão.' />
            <FotoUpload rotulo="Arte ou foto (opcional)" valor={d.foto_url || null} aoMudar={(u) => setD({ ...d, foto_url: u || '' })} bucket="fotos-locais" pasta={localId} prefixo={`agenda-${d.chave}`} altura={140} ajuda="Aparece pequena no cartão e grande se o dia for destacado." />
            <Chips
              rotulo="Público da noite"
              opcoes={PUBLICOS_AGENDA}
              valor={d.publico || ''}
              aoMudar={(v) => setD({ ...d, publico: v === d.publico ? '' : v })}
              ajuda={d.publico ? 'Aparece na Agenda do app e entra no filtro "Público".' : 'Usa a predominância de público do cadastro do bar. Escolha se esta noite for diferente.'}
            />
            <Chips
              rotulo="Entrada"
              opcoes={[{ valor: 'gratis', rotulo: 'Grátis' }, { valor: 'pago', rotulo: 'Paga' }]}
              valor={d.entrada || null}
              aoMudar={(v) => setD({ ...d, entrada: v === d.entrada ? '' : v })}
              ajuda="Toque de novo para deixar sem informar."
            />
            <Interruptor titulo="Nome na lista" explicacao="A noite tem lista. Explique como colocar o nome no link ou nos detalhes." valor={!!d.lista} aoMudar={(v) => setD({ ...d, lista: v })} />
            <Chips
              rotulo="Vale para"
              preencher
              opcoes={[{ valor: 'semana', rotulo: 'Só nesta semana' }, { valor: 'toda', rotulo: 'Repetir toda semana' }]}
              valor={d.modo}
              aoMudar={(m) => setD({ ...d, modo: m as DiaAgenda['modo'] })}
              ajuda={d.modo === 'toda' ? `Repete toda ${NOMES_DIA[d.diaSemana].toLowerCase()}. Ótimo para "toda quinta tem karaokê".` : `Vale só para ${ddmm(dataDaChave(d.chave))}.`}
            />
            <Interruptor titulo="Aparece no app" explicacao="Desligue para guardar sem mostrar em Eventos." valor={d.ativo} aoMudar={(v) => setD({ ...d, ativo: v })} />
          </ScrollView>
          <BarraSalvar emFolha rotulo="Salvar" salvando={salvando} aoSalvar={() => void salvar()} secundario={existe || d.titulo ? { rotulo: 'Limpar', aoTocar: limpar, perigo: true } : undefined} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- folha do cartaz da semana ----------
function EditorCartaz({ cartaz, localId, chaveSegunda, rotuloSemana, aoFechar, aoSalvo }: {
  cartaz: CartazAgenda; localId: string; chaveSegunda: string; rotuloSemana: string; aoFechar: () => void; aoSalvo: () => void;
}) {
  const [c, setC] = useState<CartazAgenda>(cartaz);
  const [original] = useState(() => JSON.stringify(cartaz));
  const [salvando, setSalvando] = useState(false);
  const sujo = JSON.stringify(c) !== original;
  const fechar = () => confirmarSair(sujo, aoFechar);

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarCartaz(localId, chaveSegunda, c);
      aoSalvo();
    } catch (x: any) {
      Alert.alert('Cartaz da semana', x?.message || 'Não deu para salvar.');
    } finally {
      setSalvando(false);
    }
  };
  const remover = () => {
    if (!cartaz.id) return aoFechar();
    Alert.alert('Remover o cartaz desta semana?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          setSalvando(true);
          try { await removerCartaz(cartaz.id!); aoSalvo(); } catch (x: any) { Alert.alert('Cartaz', x?.message || 'Não deu para remover.'); } finally { setSalvando(false); }
        },
      },
    ]);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={fechar}>
      <KeyboardAvoidingView style={f.fundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={f.folha}>
          <View style={f.folhaTopo}>
            <Text style={f.folhaTitulo}>Cartaz de {rotuloSemana}</Text>
            <TouchableOpacity style={f.fechar} onPress={fechar} accessibilityLabel="Fechar"><Feather name="x" size={22} color={CP.texto} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: ESP.m }}>
            <FotoUpload rotulo="Imagem do cartaz" valor={c.foto_url || null} aoMudar={(u) => setC({ ...c, foto_url: u || '' })} bucket="fotos-locais" pasta={localId} prefixo="agenda-cartaz" altura={220} encaixe="contain" ajuda="Aparece no topo de Eventos › Essa semana." />
            <Campo rotulo="Ou escreva a programação" valor={c.descricao} aoMudar={(v) => setC({ ...c, descricao: v })} max={1200} linhas exemplo="Uma linha por dia" />
            <Campo rotulo="Link (opcional)" valor={c.link} aoMudar={(v) => setC({ ...c, link: v })} icone="link" teclado="url" autoCapitalize="none" exemplo="Post do Instagram, ingressos…" />
            <Interruptor titulo="Aparece no app" explicacao="Desligue para guardar sem mostrar em Eventos." valor={c.ativo} aoMudar={(v) => setC({ ...c, ativo: v })} />
          </ScrollView>
          <BarraSalvar emFolha rotulo="Salvar cartaz" salvando={salvando} aoSalvar={() => void salvar()} secundario={cartaz.id ? { rotulo: 'Remover', aoTocar: remover, perigo: true } : undefined} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  semana: { color: CP.dim, fontSize: 12, marginTop: ESP.s },
  erro: { color: '#FF7A7A', fontSize: 13, backgroundColor: '#FF7A7A14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  alerta: { color: '#FFD54F', fontSize: 12, lineHeight: 17, backgroundColor: '#FFD54F14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  cota: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, marginTop: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, minHeight: 56 },
  cotaTitulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  cotaSub: { color: CP.dim, fontSize: 12, lineHeight: 16, marginTop: 2 },
  pontos: { flexDirection: 'row', gap: 4 },
  ponto: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2A2938' },
  cartao: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, minHeight: 44 },
  icone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  data: { width: 52, height: 44, borderRadius: 12, backgroundColor: '#0F0E15', alignItems: 'center', justifyContent: 'center' },
  dataDia: { color: CP.rosa, fontSize: 11, fontWeight: '800' },
  dataNum: { color: CP.texto, fontSize: 13, fontWeight: '800' },
  diaTitulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  diaSub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  vazio: { color: CP.fraco, fontSize: 13 },
  destacar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: ESP.m, minHeight: 44, borderRadius: RAIO.s, borderWidth: 1, borderColor: '#FFD54F55', backgroundColor: '#FFD54F12' },
  destacarOn: { backgroundColor: '#FFD54F', borderColor: '#FFD54F' },
  destacarTxt: { color: '#FFD54F', fontSize: 13, fontWeight: '800' },
  previaRotulo: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginBottom: ESP.s },
  dica: { color: CP.dim, fontSize: 12, lineHeight: 17, marginBottom: ESP.s },
  botoes: { flexDirection: 'row', gap: ESP.s },
  compartilhar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: ESP.s + 2, minHeight: 60, borderRadius: RAIO.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, paddingHorizontal: ESP.m, paddingVertical: ESP.s + 2 },
  compartilharIcone: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  compartilharTxt: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  compartilharSub: { color: CP.dim, fontSize: 11, marginTop: 1 },
});
