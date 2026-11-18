// Tela 1 do Modo parceiro — Nova festa / Editar festa (?id=<festa>) / Repetir (?repetir=<festa>).
// Regras copiadas do portal (cadastro único FormularioFesta + dashboard/eventos); dados em src/lib/parceiro/festas.ts.
//   Obrigatórios: nome, início, relação com a comunidade LGBT+, tipo, para quem e (festa/show) 1 a 3 estilos.
//   162: casa aprovada publica direto (sem análise). Casa ainda em análise: a festa espera a equipe Dicas.
//   Cancelar não apaga: some do app e só o admin reativa.
// Novidades do app: cores, textura, chamada e destaques (migração 099), Lista VIP com vagas e
// "exigir foto de conferência", link do ingresso e prévia de como o cliente vê.
// Permissão: 'festa' (Lista VIP: 'lista_vip').
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  BarraSalvar, Campo, CampoData, CampoHora, Chips, chaveData, CORES_FORM, estiloForm as f, FotoUpload, Interruptor, Previa,
  SeletorCor, SeletorTextura, useAvisoSairSemSalvar,
} from '../../components/parceiro/form';
import { DestaqueFestaPrevia, LinhaFestaPrevia, TopoFestaPrevia, VisualNovoPrevia } from '../../components/parceiro/PreviaFesta';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import EscolherDoInstagram from '../../components/parceiro/EscolherDoInstagram';
import type { Sugestoes } from '../../lib/parceiro/instagram';
import { useAuth } from '../../lib/authContext';
import { CLASSIFICACOES_LGBT } from '../../lib/classificacaoLgbt';
import { DEGRADES_BANNER } from '../../lib/estiloBanner';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import {
  cancelarFesta, contatoDoParceiro, ErrosFesta, ESTILOS_TAGS, formDaFesta, FormFesta, formRepetido, formVazio,
  festaLonga, juntarDataHora, MAX_CHAMADA, MAX_DESTAQUE_TXT, MAX_DESTAQUES, obterFesta, salvarFesta, situacaoDaFesta, SLUGS_ESTILO,
  SLUGS_PUBLICO, SLUGS_TIPO, TEXTURAS_FESTA, validarFesta, voltaParaAnalise,
} from '../../lib/parceiro/festas';
import { supabase } from '../../lib/supabase';
import { carregarSubcategorias, SUBCATEGORIAS, SubDef } from '../../lib/subcategorias';
import { useIntegracaoLigada } from '../../lib/integracoes';
import {
  ESTILOS_MAX_CADASTRO, FORMATOS_CADASTRO, GRUPOS_EVENTO, PUBLICO_FESTA_CADASTRO, slugTag, TAGS_EVENTO_AUTOMATICAS, TAGS_RESERVADAS,
  TIPOS_EVENTO_CADASTRO,
} from '../../lib/taxonomia';

const GRUPOS_OPCIONAIS = GRUPOS_EVENTO.filter((g) => ['ingresso', 'estrutura', 'ambiente', 'classificacao'].includes(g.id)).map((g) => ({
  ...g,
  opcoes: g.tags.map((t) => ({ valor: slugTag(t), rotulo: t })).filter((o) => !TAGS_EVENTO_AUTOMATICAS.includes(o.valor) && !TAGS_RESERVADAS.includes(o.valor)),
}));

export default function FestaEditar() {
  const router = useRouter();
  const { id, repetir } = useLocalSearchParams<{ id?: string; repetir?: string }>();
  const { user } = useAuth();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const r = localAtivo ? recursosDaCategoria(localAtivo.categoria) : null;
  const liberado = !!localAtivo && !!r?.eventos && pode('festa');
  const podeLista = pode('lista_vip') && !!r?.listaVip;

  const [form, setForm] = useState<FormFesta>(formVazio());
  const [base, setBase] = useState(() => JSON.stringify(formVazio()));
  const [carregando, setCarregando] = useState(!!(id || repetir));
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<ErrosFesta>({});
  const [maisDetalhes, setMaisDetalhes] = useState(false);
  const [novoDestaque, setNovoDestaque] = useState('');
  const [onde, setOnde] = useState<string | undefined>(undefined);
  // Migração 138 — "Puxar do Instagram": flyer de um post da casa + sugestões da legenda (só preenche o que está vazio)
  const [igAberto, setIgAberto] = useState(false);
  const igLigado = useIntegracaoLigada('ig');
  const mpLigado = useIntegracaoLigada('mp');
  // 18/11: tique "Vender ingresso pelo app". Depois de salvar, leva para Ingressos com a festa aberta (lotes e preços).
  const [venderApp, setVenderApp] = useState(false);
  const usarDoInstagram = (url: string, sg: Sugestoes) => {
    const p: Partial<FormFesta> = { foto: url };
    const preenchidos: string[] = [];
    if (!form.titulo.trim() && sg.titulo) { p.titulo = sg.titulo; preenchidos.push('nome'); }
    if (!form.descricao.trim() && sg.descricao) { p.descricao = sg.descricao; preenchidos.push('descrição'); }
    if (!form.inicioData && sg.data) { p.inicioData = sg.data; preenchidos.push('data'); if (sg.hora) { p.inicioHora = sg.hora; preenchidos.push('hora'); } }
    mudar(p);
    Alert.alert('Flyer puxado', preenchidos.length ? `Também preenchemos ${preenchidos.join(', ')} pela legenda. Confira antes de enviar.` : 'Confira os dados antes de enviar.');
  };

  const sujo = JSON.stringify(form) !== base;
  const voltar = useAvisoSairSemSalvar(sujo && !salvando);

  const carregar = useCallback(async () => {
    const alvo = id || repetir;
    if (!alvo) return;
    try {
      const festa = await obterFesta(alvo);
      if (!festa) throw new Error('Festa não encontrada.');
      const novo = id ? formDaFesta(festa) : formRepetido(festa);
      setForm(novo);
      // repetida já começa "suja": é uma festa nova para revisar e enviar
      setBase(id ? JSON.stringify(novo) : JSON.stringify(formVazio()));
    } catch (e: any) {
      Alert.alert('Festa', e?.message || 'Não deu para abrir a festa.');
      router.back();
    } finally {
      setCarregando(false);
    }
  }, [id, repetir, router]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    if (!localId) return;
    void supabase.from('locais').select('bairro, cidade').eq('id', localId).maybeSingle().then(({ data }) => {
      const l = data as { bairro: string | null; cidade: string | null } | null;
      setOnde(l?.bairro || l?.cidade || undefined);
    });
  }, [localId]);

  const mudar = (p: Partial<FormFesta>) => {
    setForm((x) => ({ ...x, ...p }));
    setErros((e) => {
      const n = { ...e };
      (Object.keys(p) as string[]).forEach((k) => {
        const mapa: Record<string, keyof ErrosFesta> = { onde: 'onde', entrada: 'entrada', titulo: 'titulo', inicioData: 'inicio', inicioHora: 'inicio', fimData: 'fim', fimHora: 'fim', classificacao: 'classificacao', linkIngresso: 'link', vagas: 'vagas', chamada: 'chamada' };
        if (mapa[k]) delete n[mapa[k]];
        if (k === 'tags') { delete n.tipo; delete n.publico; delete n.estilos; }
      });
      return n;
    });
  };

  // ---------- tags (mesmas regras do portal) ----------
  const tipoAtual = TIPOS_EVENTO_CADASTRO.find((t) => form.tags.includes(t.slug));
  // "Também é": subcategorias de Festas criadas pela equipe no Modo equipe (ex.: Festas afro). Marcar põe a tag
  // da subcategoria na festa, e ela aparece também naquela página.
  const [extrasFesta, setExtrasFesta] = useState<SubDef[]>([]);
  useEffect(() => {
    void carregarSubcategorias('festas').then((d) => setExtrasFesta(d.filter((x) => !(SUBCATEGORIAS.festas || []).some((p) => p.chave === x.chave))));
  }, []);
  const tagDaSub = (d: SubDef) => d.chave.replace(/\s+/g, '_');
  const escolherUnica = (grupo: string[], s: string) => mudar({ tags: [...form.tags.filter((x) => !grupo.includes(x)), s] });
  const estilos = form.tags.filter((t) => SLUGS_ESTILO.includes(t));
  const mudarEstilos = (lista: string[]) => {
    if (lista.length > ESTILOS_MAX_CADASTRO) return Alert.alert('Estilos', `Escolha até ${ESTILOS_MAX_CADASTRO} estilos.`);
    mudar({ tags: [...form.tags.filter((t) => !SLUGS_ESTILO.includes(t)), ...lista] });
  };
  const mudarGrupo = (slugsDoGrupo: string[], lista: string[]) => mudar({ tags: [...form.tags.filter((t) => !slugsDoGrupo.includes(t)), ...lista] });

  const adicionarDestaque = () => {
    const t = novoDestaque.trim();
    if (!t) return;
    if (form.destaques.length >= MAX_DESTAQUES) return Alert.alert('Destaques', `Até ${MAX_DESTAQUES} destaques.`);
    if (form.destaques.some((d) => d.toLowerCase() === t.toLowerCase())) return setNovoDestaque('');
    mudar({ destaques: [...form.destaques, t] });
    setNovoDestaque('');
  };

  // ---------- salvar ----------
  const enviar = async () => {
    setSalvando(true);
    try {
      const contato = form.id ? { nome: null, whatsapp: null } : await contatoDoParceiro(localId, user?.email, localAtivo?.nome || '');
      const { id: salvoId, aviso } = await salvarFesta(localId, form, contato, podeLista);
      if (!form.id) {
        setBase(JSON.stringify(form)); // não perguntar "sair sem salvar"
        // 162: casa aprovada publica direto; casa ainda em análise fica esperando a equipe Dicas.
        const criada = await obterFesta(salvoId).catch(() => null);
        const noAr = criada?.status === 'aprovado';
        Alert.alert(
          noAr ? 'Festa publicada' : 'Festa enviada para análise',
          (noAr ? `“${form.titulo.trim()}” já está na aba Eventos do app.` : `“${form.titulo.trim()}” foi enviada. Como o perfil da casa ainda está em análise, a equipe Dicas confere antes de a festa entrar no app.`) + (aviso ? `\n\n${aviso}` : ''),
          venderApp
            ? [{ text: 'Depois', style: 'cancel', onPress: () => router.replace('/parceiro/festas') }, { text: 'Montar os ingressos', onPress: () => router.replace({ pathname: '/parceiro/ingressos', params: { festa: salvoId } } as any) }]
            : [{ text: 'Ver minhas festas', onPress: () => router.replace('/parceiro/festas') }],
        );
        return;
      }
      const atual = await obterFesta(salvoId);
      if (atual) {
        const novo = formDaFesta(atual);
        setForm(novo);
        setBase(JSON.stringify(novo));
        const voltou = form.status === 'aprovado' && atual.status === 'pendente';
        Alert.alert(voltou ? 'Salvo · voltou para análise' : 'Salvo', voltou ? 'Como o nome ou a data mudaram, a equipe Dicas confere de novo antes de voltar ao app.' : aviso || 'As mudanças já valem no app.');
      }
    } catch (e: any) {
      Alert.alert('Festa', e?.message || 'Não deu para salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const salvar = () => {
    const e = validarFesta(form);
    if (Object.keys(e).length) {
      setErros(e);
      return Alert.alert('Falta preencher', Object.values(e).join('\n'));
    }
    if (festaLonga(form)) {
      return Alert.alert('Festa de vários dias?', 'Essa festa dura mais de 2 dias. Se é uma programação que se repete (toda sexta, por exemplo), cadastre na Agenda da semana: assim ela aparece só nos dias certos. Se é um evento contínuo de vários dias, pode salvar.', [
        { text: 'Revisar datas', style: 'cancel' },
        { text: 'É de vários dias, salvar', onPress: () => (voltaParaAnalise(form) ? Alert.alert('Volta para análise', 'Essa festa já está aprovada. Mudando o nome ou a data, ela volta para análise antes de aparecer de novo no app.', [{ text: 'Revisar', style: 'cancel' }, { text: 'Salvar mesmo assim', onPress: () => void enviar() }]) : void enviar()) },
      ]);
    }
    if (voltaParaAnalise(form)) {
      return Alert.alert('Volta para análise', 'Essa festa já está aprovada. Mudando o nome ou a data, ela volta para análise antes de aparecer de novo no app. Flyer, descrição, estilos e visual podem mudar sem travar.', [
        { text: 'Revisar', style: 'cancel' },
        { text: 'Salvar mesmo assim', onPress: () => void enviar() },
      ]);
    }
    void enviar();
  };

  const cancelar = () => {
    if (!form.id) return;
    Alert.alert('Cancelar esta festa?', 'Ela some do app e não pode ser reativada por aqui (só a equipe Dicas reativa). Quem pediu Lista VIP deixa de ver a festa.', [
      { text: 'Manter festa', style: 'cancel' },
      {
        text: 'Cancelar festa', style: 'destructive',
        onPress: async () => {
          setSalvando(true);
          try { await cancelarFesta(form.id!); setBase(JSON.stringify(form)); router.replace('/parceiro/festas'); }
          catch (e: any) { Alert.alert('Festa', e?.message || 'Não deu para cancelar.'); }
          finally { setSalvando(false); }
        },
      },
    ]);
  };

  const inicioIso = juntarDataHora(form.inicioData, form.inicioHora);
  const cores = useMemo(() => DEGRADES_BANNER.find((d) => d.chave === form.degrade)?.cores ?? null, [form.degrade]);
  const destacada = form.destacada;

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Festa">
        <Text style={a.aviso}>Seu acesso não inclui as festas deste local. Peça para o dono liberar a permissão de festas.</Text>
        <TouchableOpacity style={a.voltar} onPress={voltar}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }
  if (carregando) return <View style={[a.tela, a.centro]}><ActivityIndicator color={CP.rosa} /></View>;

  const sit = form.id && form.status ? situacaoDaFesta({ status: form.status, data_inicio: inicioIso || new Date().toISOString(), data_fim: juntarDataHora(form.fimData, form.fimHora) }) : null;
  const cancelada = form.status === 'cancelado';
  const titulo = form.id ? 'Editar festa' : repetir ? 'Repetir festa' : 'Nova festa';
  const sub = 'Aparece na aba Eventos do app assim que você publicar.';

  return (
    <View style={a.tela}>
      <TelaParceiro titulo={titulo} subtitulo={sub} aoVoltar={voltar}>

        {sit && (
          <View style={[a.situacao, { borderColor: sit.cor + '66' }]}>
            <View style={[a.ponto, { backgroundColor: sit.cor }]} />
            <Text style={a.situacaoTxt}>
              {sit.txt}
              {form.status === 'pendente' ? ' · a equipe Dicas confere antes de entrar no app' : ''}
              
            </Text>
          </View>
        )}
        {!!repetir && <Text style={a.dicaTopo}>Copiamos a festa com a data 7 dias depois. Revise e publique.</Text>}

        {cancelada ? (
          <Text style={a.aviso}>Esta festa foi cancelada e não aparece mais no app. Se foi engano, fale com a equipe Dicas: só ela reativa.</Text>
        ) : (
          <>
            {/* 1 · Flyer e nome */}
            <TituloSecao texto="1 · Flyer e nome" />
            <FotoUpload
              rotulo="Flyer (opcional)"
              valor={form.foto}
              aoMudar={(u) => mudar({ foto: u })}
              bucket="fotos-eventos"
              pasta={form.id || 'nova'}
              prefixo="capa"
              enviarDepois={!form.id}
              altura={260}
              encaixe="contain"
              ajuda={form.id ? 'Aparece na lista de Eventos, na página da festa e em Em destaque nessa semana.' : 'Sobe junto quando você enviar a festa.'}
            />
            {igLigado !== false && (
              <TouchableOpacity style={a.igBotao} onPress={() => setIgAberto(true)} accessibilityRole="button">
                <Feather name="instagram" size={16} color="#FFF" />
                <Text style={a.igBotaoTxt}>Puxar do Instagram</Text>
              </TouchableOpacity>
            )}
            <EscolherDoInstagram visivel={igAberto} localId={localId} aoFechar={() => setIgAberto(false)} aoEscolher={usarDoInstagram} />
            <Campo rotulo="Nome da festa" valor={form.titulo} aoMudar={(v) => mudar({ titulo: v })} erro={erros.titulo} max={90} exemplo="Ex.: Festa Aurora — Edição Verão" />
            <Campo rotulo="Descrição (opcional)" valor={form.descricao} aoMudar={(v) => mudar({ descricao: v })} linhas max={1200} exemplo="Conte um pouco sobre a festa: atrações, entrada, dress code…" />

            {/* 2 · Quando */}
            <TituloSecao texto="2 · Quando" />
            <View style={a.duas}>
              <View style={{ flex: 1.3 }}>
                <CampoData rotulo="Começa no dia" valor={form.inicioData} aoMudar={(v) => mudar({ inicioData: v })} erro={erros.inicio} min={form.id ? undefined : chaveData(new Date())} />
              </View>
              <View style={{ flex: 1 }}>
                <CampoHora rotulo="às" valor={form.inicioHora} aoMudar={(v) => mudar({ inicioHora: v })} />
              </View>
            </View>
            <View style={a.duas}>
              <View style={{ flex: 1.3 }}>
                <CampoData rotulo="Termina (opcional)" valor={form.fimData} aoMudar={(v) => mudar({ fimData: v })} erro={erros.fim} min={form.inicioData || undefined} exemplo="Sem data" />
              </View>
              <View style={{ flex: 1 }}>
                <CampoHora rotulo="às" valor={form.fimHora} aoMudar={(v) => mudar({ fimHora: v })} limpar exemplo="--:--" />
              </View>
            </View>

            {/* 3 · Para quem e estilo */}
            <TituloSecao texto="3 · Para quem e estilo" info="Os mesmos filtros que o público usa na aba Eventos. Tipo, para quem e relação com a comunidade são obrigatórios." />
            <Chips
              rotulo="Relação com a comunidade LGBT+"
              opcoes={CLASSIFICACOES_LGBT.map((c) => ({ valor: c.value as string, rotulo: `${c.emoji} ${c.label}` }))}
              valor={form.classificacao || null}
              aoMudar={(v) => mudar({ classificacao: v })}
              erro={erros.classificacao}
              ajuda="Método da Câmara de Comércio LGBT+. Escolha a que melhor descreve a festa."
            />
            <Chips rotulo="Tipo de evento" opcoes={TIPOS_EVENTO_CADASTRO.map((t) => ({ valor: t.slug as string, rotulo: t.rotulo }))} valor={tipoAtual?.slug ?? null} aoMudar={(v) => escolherUnica(SLUGS_TIPO, v)} erro={erros.tipo} />
            {extrasFesta.length > 0 && (
              <Chips rotulo="Também é (opcional)" multiplo opcoes={extrasFesta.map((d) => ({ valor: tagDaSub(d), rotulo: d.rotulo }))}
                valor={extrasFesta.map(tagDaSub).filter((t) => form.tags.includes(t))}
                aoMudar={(v) => { const escolhidas = v as string[]; const todas = extrasFesta.map(tagDaSub); mudar({ tags: [...form.tags.filter((t) => !todas.includes(t)), ...escolhidas] }); }} />
            )}
            <Chips rotulo="Para quem é" opcoes={PUBLICO_FESTA_CADASTRO.map((p) => ({ valor: p.slug as string, rotulo: p.rotulo }))} valor={PUBLICO_FESTA_CADASTRO.find((p) => form.tags.includes(p.slug))?.slug ?? null} aoMudar={(v) => escolherUnica(SLUGS_PUBLICO, v)} erro={erros.publico} />
            {(!tipoAtual || tipoAtual.musica) && (
              <Chips multiplo rotulo={`Estilo musical (1 a ${ESTILOS_MAX_CADASTRO})`} opcoes={ESTILOS_TAGS.map((e) => ({ valor: e.s, rotulo: e.t }))} valor={estilos} aoMudar={mudarEstilos} erro={erros.estilos} />
            )}
            <TouchableOpacity style={a.mais} onPress={() => setMaisDetalhes((v) => !v)} accessibilityRole="button">
              <Text style={a.maisTxt}>Mais detalhes (opcional): formato, entrada, estrutura, ambiente</Text>
              <Feather name={maisDetalhes ? 'chevron-up' : 'chevron-down'} size={16} color={CP.dim} />
            </TouchableOpacity>
            {maisDetalhes && (
              <>
                <Chips multiplo rotulo="Formato" opcoes={FORMATOS_CADASTRO.map((x) => ({ valor: x.slug as string, rotulo: x.rotulo }))} valor={form.tags.filter((t) => FORMATOS_CADASTRO.some((x) => x.slug === t))} aoMudar={(l) => mudarGrupo(FORMATOS_CADASTRO.map((x) => x.slug), l)} />
                {GRUPOS_OPCIONAIS.map((g) => {
                  const slugs = g.opcoes.map((o) => o.valor);
                  return <Chips key={g.id} multiplo rotulo={g.titulo} opcoes={g.opcoes} valor={form.tags.filter((t) => slugs.includes(t))} aoMudar={(l) => mudarGrupo(slugs, l)} />;
                })}
              </>
            )}

            {/* 4 · Visual */}
            <TituloSecao texto="4 · Visual da festa" info="Cores, textura, chamada e destaques ficam guardados com a festa e aparecem na página dela quando o app for atualizado. Hoje o público vê o flyer." />
            <SeletorCor rotulo="Cores" valor={form.degrade} aoMudar={(o) => mudar({ degrade: form.degrade === o.chave ? null : o.chave })} ajuda="Toque de novo para tirar." />
            <SeletorTextura valor={form.textura} aoMudar={(t) => mudar({ textura: t })} opcoes={TEXTURAS_FESTA} />
            <Campo rotulo="Chamada (opcional)" valor={form.chamada} aoMudar={(v) => mudar({ chamada: v })} max={MAX_CHAMADA} erro={erros.chamada} exemplo="Ex.: A noite mais quente do verão" />
            <View style={f.bloco}>
              <Text style={f.rotulo}>Destaques (até {MAX_DESTAQUES})</Text>
              <View style={a.destaqueLinha}>
                <TextInput
                  style={[f.input, { flex: 1 }]} value={novoDestaque} onChangeText={setNovoDestaque} maxLength={MAX_DESTAQUE_TXT}
                  placeholder="Ex.: Open bar até 0h" placeholderTextColor={CP.fraco} onSubmitEditing={adicionarDestaque} returnKeyType="done"
                  accessibilityLabel="Novo destaque"
                />
                <TouchableOpacity style={a.add} onPress={adicionarDestaque} accessibilityLabel="Adicionar destaque"><Feather name="plus" size={18} color="#FFF" /></TouchableOpacity>
              </View>
              {form.destaques.length > 0 && (
                <View style={a.chips}>
                  {form.destaques.map((d) => (
                    <TouchableOpacity key={d} style={a.chip} onPress={() => mudar({ destaques: form.destaques.filter((x) => x !== d) })} accessibilityLabel={`Tirar ${d}`}>
                      <Text style={a.chipTxt}>{d}</Text>
                      <Feather name="x" size={12} color={CP.dim} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 5 · Lista VIP e ingresso */}
            <TituloSecao texto={r?.listaVip ? '5 · Lista VIP e ingresso' : '5 · Ingresso'} />
            {r?.listaVip && (
              <>
                <Interruptor
                  titulo="Lista VIP"
                  explicacao={podeLista ? 'O público entra na lista pelo app e já recebe um QR code. Na porta, é só ler o QR.' : form.listaId ? 'A lista já está aberta. Quem cuida da Lista VIP na casa liga, desliga e ajusta as vagas.' : 'Fica marcada e a lista abre quando a festa for aprovada. Quem cuida da lista na casa ajusta as vagas.'}
                  valor={form.listaVip}
                  aoMudar={(v) => mudar({ listaVip: v })}
                  desabilitado={!podeLista && !!form.listaId}
                />
                {form.listaVip && podeLista && (
                  <Campo rotulo="Vagas (opcional)" valor={form.vagas} aoMudar={(v) => mudar({ vagas: v.replace(/\D/g, '') })} teclado="number-pad" erro={erros.vagas} exemplo="Sem limite" ajuda={form.vagasOcupadas ? `${form.vagasOcupadas} já ocupadas. Com a lista cheia, ninguém mais é aprovado.` : 'Com a lista cheia, ninguém mais é aprovado.'} />
                )}
                {/* Rodada 148 — escolha em um toque: conferir só com documento ou também com foto. */}
                {form.listaVip && (
                  <Chips
                    rotulo="Como conferir na porta?"
                    opcoes={[
                      { valor: 'doc', rotulo: 'Só documento' },
                      { valor: 'foto', rotulo: 'Documento + foto' },
                    ]}
                    valor={form.exigirFoto ? 'foto' : 'doc'}
                    aoMudar={(v) => { if (!podeLista && !!form.listaId) return; mudar({ exigirFoto: v === 'foto' }); }}
                    preencher
                    ajuda={form.exigirFoto
                      ? 'Quem entra na lista manda uma foto do rosto. Na porta, vocês leem o QR e veem a foto para conferir.'
                      : 'Quem entra na lista recebe o QR na hora. Na porta, é só ler o QR e pedir um documento.'}
                  />
                )}
              </>
            )}
            <Interruptor
              titulo="Vender ingresso pelo app"
              explicacao={!mpLigado
                ? 'Em breve: a venda pelo app abre assim que o Mercado Pago estiver liberado. Por enquanto, use o link do ingresso abaixo.'
                : venderApp
                  ? (form.id ? 'Toque em "Abrir ingressos" para montar os lotes (preço e quantidade). O dinheiro cai direto no Mercado Pago da casa.' : 'Depois de enviar a festa, você monta os lotes (preço e quantidade). O dinheiro cai direto no Mercado Pago da casa.')
                  : 'O público compra no app, recebe o QR e a porta lê na entrada.'}
              valor={!!mpLigado && venderApp}
              aoMudar={(v) => setVenderApp(v)}
              desabilitado={!mpLigado}
            />
            {!!mpLigado && venderApp && !!form.id && (
              <TouchableOpacity style={a.voltar} onPress={() => router.push({ pathname: '/parceiro/ingressos', params: { festa: form.id! } } as any)} accessibilityRole="button">
                <Feather name="credit-card" size={16} color={CP.rosa} /><Text style={[a.voltarTxt, { color: CP.rosa }]}> Abrir ingressos desta festa</Text>
              </TouchableOpacity>
            )}
            {!(mpLigado && venderApp) && (
              <Campo rotulo="Link do ingresso (opcional)" valor={form.linkIngresso} aoMudar={(v) => mudar({ linkIngresso: v })} icone="link" teclado="url" autoCapitalize="none" erro={erros.link} exemplo="https://…" ajuda="Sympla, Shotgun, site da festa. Começa com https://" />
            )}
            <Chips rotulo="Onde vai ser" opcoes={[{ valor: 'casa', rotulo: localAtivo?.nome ? `No ${localAtivo.nome}` : 'Na minha casa' }, { valor: 'outro', rotulo: 'Em outro lugar' }] as any}
              valor={form.ondeOutro ? 'outro' : 'casa'} aoMudar={(v) => mudar({ ondeOutro: v === 'outro' })} erro={erros.onde} />
            {form.ondeOutro && (
              <>
                <Campo rotulo="Nome do lugar" valor={form.ondeNome} aoMudar={(v) => mudar({ ondeNome: v })} max={80} exemplo="Ex.: Katarina Bar" erro={erros.onde} />
                <Campo rotulo="Endereço (opcional)" valor={form.ondeEndereco} aoMudar={(v) => mudar({ ondeEndereco: v })} max={140} exemplo="Ex.: Av. São Luís, 272" />
                <Campo rotulo="Bairro (opcional)" valor={form.ondeBairro} aoMudar={(v) => mudar({ ondeBairro: v })} max={60} exemplo="Ex.: República" />
              </>
            )}
            <Campo rotulo="Entrada (R$, opcional)" valor={form.entrada} aoMudar={(v) => mudar({ entrada: v.replace(/[^\d,]/g, '') })} teclado="decimal-pad" erro={erros.entrada} exemplo="Ex.: 30 · 0 = grátis" ajuda="Aparece no cartão da festa. Vendendo ingresso pelo app, mostra o lote mais barato." />

            {/* Prévia */}
            <TituloSecao texto="Como o cliente vê" />
            <View style={{ gap: ESP.s }}>
              <Previa onde="Eventos › lista do dia">
                <LinhaFestaPrevia titulo={form.titulo} inicio={inicioIso} nomeLocal={localAtivo.nome} ondeLocal={onde} listaVip={form.listaVip} destaque={destacada} />
              </Previa>
              <Previa onde="Eventos › Em destaque nessa semana (se destacar)">
                <DestaqueFestaPrevia foto={form.foto} titulo={form.titulo} />
              </Previa>
              <Previa onde="Página da festa">
                <TopoFestaPrevia foto={form.foto} titulo={form.titulo} listaVip={form.listaVip} destaque={destacada} />
              </Previa>
              {(cores || form.textura || form.chamada.trim() || form.destaques.length > 0) && (
                <Previa onde="Visual novo · chega quando o app for atualizado">
                  <VisualNovoPrevia cores={cores} textura={TEXTURAS_FESTA.find((t) => t.chave === form.textura)?.rotulo ?? null} chamada={form.chamada} destaques={form.destaques} />
                </Previa>
              )}
            </View>
            <View style={{ height: ESP.xl }} />
          </>
        )}
      </TelaParceiro>
      {!cancelada && (
        <BarraSalvar
          rotulo={form.id ? 'Salvar' : 'Publicar festa'}
          salvando={salvando}
          aoSalvar={salvar}
          desabilitado={!!form.id && !sujo}
          secundario={form.id ? { rotulo: 'Cancelar festa', aoTocar: cancelar, perigo: true } : undefined}
        />
      )}
    </View>
  );
}

const a = StyleSheet.create({
  igBotao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#C13584', borderRadius: 999, minHeight: 44, marginTop: 8, marginBottom: 8 },
  igBotaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  tela: { flex: 1, backgroundColor: CP.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  situacao: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, marginTop: ESP.m, borderWidth: 1, borderRadius: RAIO.s, padding: ESP.m, backgroundColor: CP.card },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  situacaoTxt: { flex: 1, color: CP.texto, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  dicaTopo: { color: '#B39DDB', fontSize: 12, lineHeight: 17, backgroundColor: '#7E57C21A', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  duas: { flexDirection: 'row', gap: ESP.s },
  mais: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, marginTop: ESP.m, minHeight: 44 },
  maisTxt: { flex: 1, color: CP.dim, fontSize: 13, fontWeight: '700' },
  destaqueLinha: { flexDirection: 'row', gap: ESP.s },
  add: { width: 46, height: 46, borderRadius: RAIO.s, backgroundColor: CP.rosa, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s, marginTop: ESP.s },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CORES_FORM.chipFundo, borderRadius: 16, paddingHorizontal: ESP.m, minHeight: 34 },
  chipTxt: { color: CP.texto, fontSize: 12, fontWeight: '700' },
});
