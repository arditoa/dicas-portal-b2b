// Modo parceiro — Ação de marca (Divulgar › Ação de marca). Migrações 117–119.
// A casa fechou um patrocínio com uma marca (ex.: happy hour com a Heineken): cria a ação, marca os cupons e
// festas que fazem parte e acompanha o resultado — quem FOI (cupom usado com check-in, entrada pela Lista VIP)
// e o custo por presença. No app, o cliente vê o selo "Apoio · <marca>" e a página da ação.
// Premium e Fundador (plano ativo). Só números somados e anônimos.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { BarraSalvar, Campo, CampoData, Chips } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import { falarComEquipe, nivelDoPlano } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

type Num = number | string;
type Acao = { id: string; marca: string; nome: string; inicio: string; fim: string; chamada: string | null; cor: string | null; investimento: number | null; pesquisa_pergunta: string | null; ativa: boolean;
  brinde?: string | null; limite_total?: number | null; regra?: string | null; evento_id?: string | null };
type Item = { id: string; titulo: string; extra: string; acao_marca_id: string | null };
type ResQ = { responderam: Num; perguntas: { id: string; texto: string; tipo: string; opcoes?: { valor: string; n: Num }[]; media?: number | null; promotores?: number | null }[] };
type Escolhas = { pergunta: string; total: number; opcoes: { valor: string; n: number }[] };
type Rel = { escolhas?: Escolhas | null; questionario?: ResQ | null; fotos?: { fotos: number; compartilhadas: number; salvas: number; checkins?: number } | null; funil: Record<string, Num>; custo_por_presenca: number | null; aceitam_ofertas_de_marcas: Num; pesquisa: { pergunta: string; responderam: Num; respostas: { valor: string; n: Num }[] } | null; perfil: { status: string; idade?: Record<string, Num> } };

const CORES = [
  { valor: '#F2C94C', rotulo: 'Amarelo' }, { valor: '#4CAF7D', rotulo: 'Verde' }, { valor: '#E5484D', rotulo: 'Vermelho' },
  { valor: '#4B8BF5', rotulo: 'Azul' }, { valor: '#FFFFFF', rotulo: 'Branco' },
];
const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const br = (iso: string) => iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
const txt = (n: Num | undefined | null) => (n == null ? '—' : typeof n === 'number' ? n.toLocaleString('pt-BR') : n);
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const VAZIA = { marca: '', nome: '', inicio: hoje(), fim: '', chamada: '', cor: '#F2C94C', investimento: '', moldura: '', brindePergunta: '', brindeOpcoes: '', participacao: 'ambos', brinde: '', limite: '', regra: '', eventoId: '' };
// Questionário para quem foi (migração 123): até 5 perguntas de 3 tipos.
type TipoQ = 'escolha' | 'nota' | 'aberta';
type PerguntaForm = { texto: string; tipo: TipoQ; opcoes: string };
const PARTICIPA = [{ valor: 'ambos', rotulo: 'Check-in ou foto' }, { valor: 'checkin', rotulo: 'Só check-in' }, { valor: 'foto', rotulo: 'Só foto' }];
const TIPOS_Q = [{ valor: 'escolha', rotulo: 'Opções' }, { valor: 'nota', rotulo: 'Nota 0 a 10' }, { valor: 'aberta', rotulo: 'Texto livre' }];
const PERGUNTA_VAZIA: PerguntaForm = { texto: '', tipo: 'escolha', opcoes: '' };
const MODELO_LANCAMENTO: PerguntaForm[] = [
  { texto: 'Você já conhecia o produto antes de hoje?', tipo: 'escolha', opcoes: 'Sim, já comprei, Conhecia mas nunca comprei, Não conhecia' },
  { texto: 'De 0 a 10, quanto você gostou?', tipo: 'nota', opcoes: '' },
  { texto: 'Você compraria?', tipo: 'escolha', opcoes: 'Com certeza, Talvez, Não' },
  { texto: 'De 0 a 10, quanto você recomendaria a um amigo?', tipo: 'nota', opcoes: '' },
  { texto: 'O que você mudaria no produto?', tipo: 'aberta', opcoes: '' },
];

const GANHOS: { icone: keyof typeof Feather.glyphMap; titulo: string; texto: string }[] = [
  { icone: 'check-circle', titulo: 'Presença comprovada', texto: 'Quantas pessoas foram de verdade: cupom da marca usado com check-in na casa ou QR da Lista VIP lido na porta.' },
  { icone: 'message-circle', titulo: 'A opinião de quem foi', texto: 'Um questionário de até 5 perguntas, montado com a marca: se conhecia o produto, nota de 0 a 10, se compraria, se recomendaria e o que mudaria. Só responde quem foi.' },
  { icone: 'bell', titulo: 'Gente que quer ouvir a marca', texto: 'Quantas dessas pessoas aceitaram receber ofertas de marcas parceiras no app. É público para a próxima ação.' },
  { icone: 'award', titulo: 'Marca à vista no app', texto: 'Selo "Apoio" nos cupons e festas, cartão em "Ações da semana" na Home e em Eventos (a equipe Dicas aprova) e uma página só da ação.' },
  { icone: 'dollar-sign', titulo: 'Custo por presença', texto: 'Quanto a marca investiu dividido por quem foi. O número que ajuda a renovar o patrocínio.' },
];

function OQueAMarcaGanha() {
  return (
    <View style={a.pitch}>
      <Text style={a.pitchTag}>O QUE A MARCA GANHA</Text>
      {GANHOS.map((g) => (
        <View key={g.titulo} style={a.ganho}>
          <View style={a.ganhoIcone}><Feather name={g.icone} size={15} color="#F2C94C" /></View>
          <View style={{ flex: 1 }}>
            <Text style={a.ganhoTit}>{g.titulo}</Text>
            <Text style={a.ganhoTxt}>{g.texto}</Text>
          </View>
        </View>
      ))}
      <Text style={a.pitchNota}>Tudo em números somados e anônimos. A marca nunca recebe nome nem contato de ninguém.</Text>
    </View>
  );
}

export default function AcoesDeMarca() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const podeEditar = pode('cupons') || pode('festa');
  const podeVer = podeEditar || pode('resultados');
  const premium = !!localAtivo && nivelDoPlano(localAtivo.plano_comercial) === 'premium';
  const temFestas = !!localAtivo && recursosDaCategoria(localAtivo.categoria).eventos;

  const [acoes, setAcoes] = useState<Acao[] | null>(null);
  const [sel, setSel] = useState<Acao | null>(null);
  const [nova, setNova] = useState<typeof VAZIA | null>(null);
  const [comQuestionario, setComQuestionario] = useState(false);
  const [perguntas, setPerguntas] = useState<PerguntaForm[]>([{ ...PERGUNTA_VAZIA }]);
  const [salvando, setSalvando] = useState(false);
  const [cupons, setCupons] = useState<Item[]>([]);
  const [festas, setFestas] = useState<Item[]>([]);
  const [rel, setRel] = useState<Rel | null>(null);
  // Migração 128 — festas futuras da casa (para "Onde vale") e a contagem ao vivo da ação aberta
  const [festasFuturas, setFestasFuturas] = useState<{ id: string; titulo: string; data_inicio: string }[]>([]);
  const [contagem, setContagem] = useState<{ feitos: number; restam: number | null } | null>(null);
  const [gerando, setGerando] = useState(false);
  const [semTabela, setSemTabela] = useState(false);

  const carregar = useCallback(async () => {
    if (!localId) return;
    const { data, error } = await (supabase.from('acoes_marca') as any)
      .select('id, marca, nome, inicio, fim, chamada, cor, investimento, pesquisa_pergunta, ativa, brinde, limite_total, regra, evento_id').eq('local_id', localId).order('inicio', { ascending: false });
    if (error) { setSemTabela(true); setAcoes([]); return; }
    setAcoes((data as Acao[]) || []);
  }, [localId]);
  useEffect(() => { if (premium && podeVer) void carregar(); }, [carregar, premium, podeVer]);

  const carregarItens = useCallback(async () => {
    if (!localId || !sel) return;
    // Só o que vale DENTRO do período da ação: cupom não vencido e festa entre o início e o fim da ação.
    const agora = new Date().toISOString();
    const desde = `${sel.inicio}T00:00:00-03:00`;
    const ate = `${sel.fim}T23:59:59-03:00`;
    const [c, f] = await Promise.all([
      (supabase.from('cupons') as any).select('id, titulo, valido_ate, acao_marca_id').eq('local_id', localId).eq('ativo', true).or(`valido_ate.is.null,valido_ate.gte.${agora}`).order('created_at', { ascending: false }).limit(50),
      temFestas
        ? (supabase.from('eventos') as any).select('id, titulo, data_inicio, acao_marca_id').eq('local_id', localId).gte('data_inicio', desde).lte('data_inicio', ate).neq('status', 'cancelado').order('data_inicio').limit(50)
        : Promise.resolve({ data: [] }),
    ]);
    setCupons(((c.data as any[]) || []).map((x) => ({ id: x.id, titulo: x.titulo, extra: x.valido_ate ? `até ${br(x.valido_ate)}` : 'Sem data de fim', acao_marca_id: x.acao_marca_id })));
    setFestas(((f.data as any[]) || []).map((x) => ({ id: x.id, titulo: x.titulo, extra: br(x.data_inicio), acao_marca_id: x.acao_marca_id })));
  }, [localId, temFestas, sel]);
  useEffect(() => { if (sel) { void carregarItens(); setRel(null); } }, [sel, carregarItens]);

  const Voltar = (
    <TouchableOpacity style={a.voltar} onPress={() => (nova ? setNova(null) : sel ? setSel(null) : router.back())} accessibilityRole="button">
      <Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text>
    </TouchableOpacity>
  );

  if (!localAtivo || !podeVer) {
    return (
      <TelaParceiro titulo="Ação de marca">
        {Voltar}
        <Text style={a.aviso}>Seu acesso não inclui ações de marca desta casa. Peça ao dono para liberar cupons, festas ou resultados.</Text>
      </TelaParceiro>
    );
  }
  if (!premium) {
    return (
      <TelaParceiro titulo="Ação de marca" subtitulo="Patrocínio de uma marca na sua casa, com resultado medido.">
        {Voltar}
        <View style={a.hero}>
          <Text style={a.heroTit}>Venda patrocínio com números na mão</Text>
          <Text style={a.heroTxt}>Fechou um happy hour, uma festa ou um drink com uma marca? No app, a marca aparece para o público e, no fim, você mostra para ela quem foi de verdade.</Text>
        </View>
        <OQueAMarcaGanha />
        <View style={a.trava}>
          <View style={a.travaLinha}>
            <View style={a.travaIcone}><Feather name="lock" size={16} color="#FFF" /></View>
            <Text style={[a.travaTitulo, { flex: 1 }]}>Incluída nos planos Premium e Fundador</Text>
          </View>
          <Text style={a.travaTxt}>A equipe Dicas te ajuda a montar a primeira ação com a marca.</Text>
          <TouchableOpacity style={a.travaBtn} onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero fazer uma ação de marca no app.`)} accessibilityRole="button">
            <Feather name="message-circle" size={16} color="#FFF" />
            <Text style={a.travaBtnTxt}>Falar com a equipe</Text>
          </TouchableOpacity>
        </View>
      </TelaParceiro>
    );
  }

  useEffect(() => {
    if (!nova || !localId || !temFestas) return;
    (supabase.from('eventos') as any).select('id, titulo, data_inicio').eq('local_id', localId).gte('data_inicio', new Date().toISOString())
      .neq('status', 'cancelado').order('data_inicio').limit(30)
      .then(({ data }: any) => setFestasFuturas((data as any[]) || []), () => {});
  }, [!!nova, localId, temFestas]);
  useEffect(() => {
    if (!sel) return setContagem(null);
    let vivo = true;
    const ler = () => supabase.rpc('contagem_acao', { p_acao: sel.id }).then(({ data }) => { if (vivo && data) setContagem(data as any); }, () => {});
    void ler();
    const t = setInterval(() => { void ler(); }, 30 * 1000);
    return () => { vivo = false; clearInterval(t); };
  }, [sel?.id]);

  async function criar() {
    if (!nova) return;
    if (!nova.marca.trim() || !nova.nome.trim() || !nova.inicio || !nova.fim) return Alert.alert('Ação de marca', 'Preencha a marca, o nome e o período.');
    if (!nova.brinde.trim()) return Alert.alert('Ação de marca', 'Diga o que a pessoa ganha (ex.: Sorvete Kibon).');
    const limite = nova.limite.trim() ? parseInt(nova.limite.replace(/\D/g, ''), 10) : null;
    if (nova.limite.trim() && (!limite || limite < 1)) return Alert.alert('Ação de marca', 'Para os primeiros: coloque um número (ex.: 100) ou deixe em branco.');
    if (nova.fim < nova.inicio) return Alert.alert('Ação de marca', 'O fim vem antes do início.');
    const brindeOps = nova.brindeOpcoes.split(',').map((o) => o.trim()).filter(Boolean);
    if (brindeOps.length === 1 || brindeOps.length > 12) return Alert.alert('Brinde', 'Coloque de 2 a 12 opções do brinde, separadas por vírgula (ou deixe em branco).');
    const montadas: { id: string; texto: string; tipo: TipoQ; opcoes?: string[] }[] = [];
    if (comQuestionario) {
      for (const [i, q] of perguntas.entries()) {
        if (!q.texto.trim()) continue;
        const ops = q.opcoes.split(',').map((o) => o.trim()).filter(Boolean);
        if (q.tipo === 'escolha' && (ops.length < 2 || ops.length > 6)) return Alert.alert('Questionário', `Pergunta ${i + 1}: coloque de 2 a 6 opções, separadas por vírgula.`);
        montadas.push({ id: `p${i + 1}`, texto: q.texto.trim(), tipo: q.tipo, ...(q.tipo === 'escolha' ? { opcoes: ops } : {}) });
      }
      if (!montadas.length) return Alert.alert('Questionário', 'Escreva pelo menos uma pergunta, ou desligue o questionário.');
    }
    setSalvando(true);
    const { data, error } = await (supabase.from('acoes_marca') as any).insert({
      local_id: localId, marca: nova.marca.trim(), nome: nova.nome.trim(), inicio: nova.inicio, fim: nova.fim,
      chamada: nova.chamada.trim() || null, cor: nova.cor,
      investimento: nova.investimento ? Number(nova.investimento.replace(/\./g, '').replace(',', '.')) || null : null,
      ...(montadas.length ? { pesquisa_perguntas: montadas } : {}),
      participacao: nova.participacao,
      brinde: nova.brinde.trim().slice(0, 80), limite_total: limite, regra: nova.regra.trim().slice(0, 120) || null, evento_id: nova.eventoId || null,
      ...(nova.moldura.trim() ? { moldura_texto: nova.moldura.trim().slice(0, 60) } : {}),
      ...(brindeOps.length ? { brinde_opcoes: brindeOps, brinde_pergunta: nova.brindePergunta.trim() || 'Qual você quer?' } : {}),
    }).select('id, marca, nome, inicio, fim, chamada, cor, investimento, pesquisa_pergunta, ativa, brinde, limite_total, regra, evento_id').single();
    setSalvando(false);
    if (error) return Alert.alert('Ação de marca', error.message || 'Não deu para criar agora.');
    setNova(null);
    await carregar();
    setSel(data as Acao);
  }

  async function ligar(tabela: 'cupons' | 'eventos', id: string, v: boolean) {
    if (!sel || !podeEditar) return;
    const { error } = await (supabase.from(tabela) as any).update({ acao_marca_id: v ? sel.id : null }).eq('id', id);
    if (error) return Alert.alert('Ação de marca', error.message || 'Não deu para salvar.');
    await carregarItens();
  }

  async function encerrar() {
    if (!sel) return;
    Alert.alert('Encerrar a ação?', 'Ela sai do app (faixa, selo e página). O resultado continua aqui.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: async () => {
        const { error } = await (supabase.from('acoes_marca') as any).update({ ativa: false }).eq('id', sel.id);
        if (error) return Alert.alert('Ação de marca', error.message);
        setSel({ ...sel, ativa: false }); void carregar();
      } },
    ]);
  }

  async function verResultado() {
    if (!sel) return;
    setGerando(true);
    const [{ data, error }, fotos, qz] = await Promise.all([
      supabase.rpc('relatorio_acao_marca', { p_acao: sel.id }),
      supabase.rpc('fotos_da_acao', { p_acao: sel.id }),
      supabase.rpc('questionario_da_acao', { p_acao: sel.id }),
    ]);
    const esc = await supabase.rpc('escolhas_da_acao', { p_acao: sel.id });
    setGerando(false);
    if (error) return Alert.alert('Resultado', error.message || 'Não deu para gerar agora.');
    setRel({ ...(data as Rel), fotos: fotos.error ? null : (fotos.data as Rel['fotos']), questionario: qz.error ? null : (qz.data as ResQ | null), escolhas: esc.error ? null : (esc.data as Escolhas | null) });
  }

  // ---------- Nova ação ----------
  if (nova) {
    return (
      <TelaParceiro titulo="Nova ação de marca" subtitulo="A marca que está apoiando a sua casa.">
        {Voltar}
        <View style={{ gap: ESP.m, marginTop: ESP.s }}>
          <Campo rotulo="Marca" valor={nova.marca} aoMudar={(v) => setNova({ ...nova, marca: v })} exemplo="Ex.: Heineken" />
          <Campo rotulo="Nome da ação" valor={nova.nome} aoMudar={(v) => setNova({ ...nova, nome: v })} exemplo="Ex.: Happy hour de novembro" />
          <Campo rotulo="O que a pessoa ganha" valor={nova.brinde} aoMudar={(v) => setNova({ ...nova, brinde: v })} exemplo="Ex.: Sorvete Kibon" ajuda="É o brinde da ação. A pessoa toca em &quot;Estou aqui&quot; na casa e mostra a tela no balcão. Um por pessoa." />
          <Campo rotulo="Para os primeiros (opcional)" valor={nova.limite} aoMudar={(v) => setNova({ ...nova, limite: v.replace(/\D/g, '') })} teclado="number-pad" exemplo="Ex.: 100" ajuda="O público vê só quantos ainda restam (&quot;Restam 37&quot;), atualizado na hora. Em branco: sem limite." />
          <Campo rotulo="Regra (opcional)" valor={nova.regra} aoMudar={(v) => setNova({ ...nova, regra: v })} exemplo="Ex.: Das 18h às 21h" />
          {temFestas && festasFuturas.length > 0 && (
            <Chips rotulo="Onde vale?" opcoes={[{ valor: '', rotulo: 'Na casa, em todo o período' }, ...festasFuturas.map((f) => ({ valor: f.id, rotulo: `${f.titulo} · ${br(f.data_inicio)}` }))]}
              valor={nova.eventoId} aoMudar={(v) => setNova({ ...nova, eventoId: v })} ajuda="Numa festa: o brinde vale só no horário dela." />
          )}
          <Campo rotulo="Chamada no app" valor={nova.chamada} aoMudar={(v) => setNova({ ...nova, chamada: v })} exemplo="Ex.: Long neck em dobro até 21h" ajuda="A equipe Dicas revisa e decide onde a ação aparece no app (faixa, selo e página)." />
          <CampoData rotulo="Começa em" valor={nova.inicio} aoMudar={(v) => setNova({ ...nova, inicio: v })} min={hoje()} />
          <CampoData rotulo="Termina em" valor={nova.fim || null} aoMudar={(v) => setNova({ ...nova, fim: v })} min={nova.inicio || hoje()} />
          <Chips rotulo="Cor da marca" opcoes={CORES} valor={nova.cor} aoMudar={(v) => setNova({ ...nova, cor: v })} />
          <Campo rotulo="Quanto a marca investiu (opcional)" valor={nova.investimento} aoMudar={(v) => setNova({ ...nova, investimento: v.replace(/[^\d.,]/g, '') })} teclado="decimal-pad" exemplo="Ex.: 1500" ajuda="Só você e a equipe Dicas veem. Serve para calcular o custo por presença." />
          <Chips rotulo="Como o público participa?" opcoes={PARTICIPA} valor={nova.participacao} aoMudar={(v) => setNova({ ...nova, participacao: v })} />
          <Campo rotulo="Frase da moldura da foto (opcional)" valor={nova.moldura} aoMudar={(v) => setNova({ ...nova, moldura: v })} exemplo="Ex.: Sexta é com Heineken gelada" ajuda="Aparece embaixo da foto que o público tira com a moldura, na cor da marca. Moldura com arte da própria marca: a equipe Dicas coloca." />
          <Campo rotulo="Opções do brinde (opcional)" valor={nova.brindeOpcoes} aoMudar={(v) => setNova({ ...nova, brindeOpcoes: v })} exemplo="Ex.: Morango, Chocolate, Limão" ajuda="Se tiver opções (sabores, tamanhos), a pessoa escolhe ao tocar em &quot;Estou aqui&quot;. A marca vê a preferência somada." />
          {!!nova.brindeOpcoes.trim() && (
            <Campo rotulo="Pergunta da escolha" valor={nova.brindePergunta} aoMudar={(v) => setNova({ ...nova, brindePergunta: v })} exemplo="Ex.: Qual sabor você quer?" />
          )}
          {/* Questionário para quem foi: abre, monta e escolhe quantas perguntas (até 5) */}
          <View style={a.quest}>
            <View style={a.questTopo}>
              <View style={a.questIcone}><Feather name="message-circle" size={15} color="#F2C94C" /></View>
              <View style={{ flex: 1 }}>
                <Text style={a.itemTit}>Questionário para quem foi</Text>
                <Text style={a.itemSub}>Só responde quem foi de verdade, até 14 dias depois</Text>
              </View>
              <Switch value={comQuestionario} onValueChange={setComQuestionario} trackColor={{ true: CP.verde, false: '#3A3950' }} thumbColor="#FFF" accessibilityLabel="Fazer questionário" />
            </View>
            {comQuestionario && (
              <View style={{ gap: ESP.m, marginTop: ESP.m }}>
                <TouchableOpacity style={a.modelo} onPress={() => setPerguntas(MODELO_LANCAMENTO.map((q) => ({ ...q })))} accessibilityRole="button">
                  <Feather name="zap" size={14} color="#F2C94C" />
                  <Text style={a.modeloTxt}>Usar modelo: lançamento de produto (5 perguntas)</Text>
                </TouchableOpacity>
                {perguntas.map((q, i) => (
                  <View key={i} style={a.pergunta}>
                    <View style={a.perguntaTopo}>
                      <Text style={a.perguntaN}>Pergunta {i + 1}</Text>
                      {perguntas.length > 1 && (
                        <TouchableOpacity onPress={() => setPerguntas(perguntas.filter((_, k) => k !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Tirar pergunta ${i + 1}`}>
                          <Feather name="x" size={16} color={CP.fraco} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Campo rotulo="Pergunta" valor={q.texto} aoMudar={(v) => setPerguntas(perguntas.map((x, k) => (k === i ? { ...x, texto: v } : x)))} exemplo="Ex.: Você compraria?" />
                    <Chips rotulo="Tipo de resposta" opcoes={TIPOS_Q} valor={q.tipo} aoMudar={(v) => setPerguntas(perguntas.map((x, k) => (k === i ? { ...x, tipo: v as TipoQ } : x)))} />
                    {q.tipo === 'escolha' && (
                      <Campo rotulo="Opções, separadas por vírgula" valor={q.opcoes} aoMudar={(v) => setPerguntas(perguntas.map((x, k) => (k === i ? { ...x, opcoes: v } : x)))} exemplo="Com certeza, Talvez, Não" />
                    )}
                  </View>
                ))}
                {perguntas.length < 5 ? (
                  <TouchableOpacity style={a.addPergunta} onPress={() => setPerguntas([...perguntas, { ...PERGUNTA_VAZIA }])} accessibilityRole="button">
                    <Feather name="plus" size={15} color={CP.rosa} /><Text style={a.addTxt}>Adicionar pergunta ({perguntas.length} de 5)</Text>
                  </TouchableOpacity>
                ) : <Text style={a.itemSub}>Máximo de 5 perguntas.</Text>}
              </View>
            )}
          </View>
        </View>
        <View style={{ marginTop: ESP.l }}>
          <BarraSalvar rotulo="Criar ação" salvando={salvando} aoSalvar={() => void criar()} />
        </View>
      </TelaParceiro>
    );
  }

  // ---------- Uma ação ----------
  if (sel) {
    const ativaHoje = sel.ativa && sel.inicio <= hoje() && sel.fim >= hoje();
    const Linha = ({ it, tabela, ultimo }: { it: Item; tabela: 'cupons' | 'eventos'; ultimo: boolean }) => {
      const dentro = it.acao_marca_id === sel.id;
      const outra = !!it.acao_marca_id && !dentro;
      return (
        <View style={[a.item, !ultimo && a.itemBorda]}>
          <View style={{ flex: 1 }}>
            <Text style={a.itemTit} numberOfLines={1}>{it.titulo}</Text>
            <Text style={a.itemSub}>{outra ? 'Em outra ação' : it.extra}</Text>
          </View>
          <Switch value={dentro} disabled={!podeEditar || outra} onValueChange={(v) => void ligar(tabela, it.id, v)} trackColor={{ true: CP.verde, false: '#3A3950' }} thumbColor="#FFF" accessibilityLabel={`Incluir ${it.titulo} na ação`} />
        </View>
      );
    };
    return (
      <TelaParceiro titulo={sel.marca} subtitulo={sel.nome}>
        {Voltar}
        <View style={[a.resumo, { borderColor: `${sel.cor || '#F2C94C'}66` }]}>
          <Text style={[a.resumoTag, { color: sel.cor || '#F2C94C' }]}>{ativaHoje ? 'NO PERÍODO' : sel.ativa ? (sel.inicio > hoje() ? 'AGENDADA' : 'TERMINOU') : 'ENCERRADA'}</Text>
          <Text style={a.resumoSub}>Onde aparece no app: a equipe Dicas revisa e libera.</Text>
          <Text style={a.resumoTit}>{sel.brinde || sel.chamada || sel.nome}</Text>
          <Text style={a.resumoSub}>De {br(sel.inicio)} a {br(sel.fim)}{sel.investimento != null ? ` · ${reais(sel.investimento)}` : ''}</Text>
          <TouchableOpacity onPress={() => router.push(`/marca/${sel.id}` as any)} accessibilityRole="button">
            <Text style={a.link}>Ver como aparece no app</Text>
          </TouchableOpacity>
        </View>

        <TituloSecao texto="COMO FUNCIONA" info="A pessoa toca em &quot;Estou aqui&quot; na casa (o app confere a localização), ganha o brinde e mostra a tela no balcão. Um por pessoa." />
        <View style={a.lista}>
          {[
            ['Brinde', sel.brinde || sel.chamada || sel.nome],
            ['Onde vale', sel.evento_id ? (festas.find((f) => f.id === sel.evento_id)?.titulo || 'Numa festa da casa') : localAtivo?.nome || 'Na casa'],
            ['Quantidade', sel.limite_total ? `Para os primeiros ${sel.limite_total}` : 'Sem limite'],
            ...(sel.regra ? [['Regra', sel.regra]] : []),
            ['Já ganharam', contagem ? `${contagem.feitos}${contagem.restam != null ? ` · restam ${contagem.restam}` : ''}` : '—'],
          ].map(([r, v], i, arr) => (
            <View key={r} style={[a.item, i < arr.length - 1 && a.itemBorda]}>
              <Text style={[a.itemSub, { width: 96 }]}>{r}</Text>
              <Text style={[a.itemTit, { flex: 1 }]} numberOfLines={2}>{v}</Text>
            </View>
          ))}
        </View>
        {/* Ligados do jeito antigo (cupom/festa da casa com o selo da marca): só aparecem se tiver algum, para poder desligar. */}
        {[...cupons, ...festas].some((it) => it.acao_marca_id === sel.id) && (
          <>
            <Text style={a.grupo}>Também ligados a esta ação</Text>
            <View style={a.lista}>
              {cupons.filter((it) => it.acao_marca_id === sel.id).map((it, i, arr) => <Linha key={it.id} it={it} tabela="cupons" ultimo={i === arr.length - 1 && !festas.some((f) => f.acao_marca_id === sel.id)} />)}
              {festas.filter((it) => it.acao_marca_id === sel.id).map((it, i, arr) => <Linha key={it.id} it={it} tabela="eventos" ultimo={i === arr.length - 1} />)}
            </View>
          </>
        )}

        <TituloSecao texto="RESULTADO" info="Presença comprovada: quem tocou em &quot;Estou aqui&quot; na casa e ganhou o brinde, cupom da ação usado ou entrada pela Lista VIP lida na porta. Números somados; grupos com menos de 10 viram &quot;menos de 10&quot;." />
        {!rel ? (
          <TouchableOpacity style={a.botao} onPress={() => void verResultado()} disabled={gerando} accessibilityRole="button">
            {gerando ? <ActivityIndicator color="#FFF" /> : <><Feather name="bar-chart-2" size={16} color="#FFF" /><Text style={a.botaoTxt}>Ver resultado</Text></>}
          </TouchableOpacity>
        ) : (
          <View style={{ gap: ESP.s }}>
            <View style={a.numeros}>
              <View style={a.numero}><Text style={a.numeroN}>{txt(rel.funil.pessoas_que_foram)}</Text><Text style={a.numeroR}>pessoas que foram</Text></View>
              <View style={a.numero}><Text style={a.numeroN}>{rel.custo_por_presenca != null ? reais(rel.custo_por_presenca) : '—'}</Text><Text style={a.numeroR}>custo por presença</Text></View>
            </View>
            <View style={a.lista}>
              {[
                ['Visitas às festas', rel.funil.festa_visitas], ['Marcaram "Eu vou"', rel.funil.eu_vou], ['Entraram na Lista VIP', rel.funil.lista_entraram_na_lista],
                ['Cupons usados', rel.funil.cupons_usados], ['Entradas pela Lista VIP', rel.funil.entradas_lista], ['Aceitam ofertas de marcas', rel.aceitam_ofertas_de_marcas],
                ...(rel.fotos ? [['Check-ins na ação', rel.fotos.checkins ?? 0], ['Fotos com a moldura', rel.fotos.fotos], ['Fotos compartilhadas', rel.fotos.compartilhadas]] : []),
              ].map(([r, n], i, arr) => (
                <View key={r as string} style={[a.item, i < arr.length - 1 && a.itemBorda]}>
                  <Text style={[a.itemTit, { flex: 1 }]}>{r as string}</Text>
                  <Text style={a.valor}>{txt(n as Num)}</Text>
                </View>
              ))}
            </View>
            {rel.pesquisa && (
              <>
                <Text style={a.grupo}>{rel.pesquisa.pergunta} (responderam: {txt(rel.pesquisa.responderam)})</Text>
                <View style={a.lista}>
                  {rel.pesquisa.respostas.map((r, i) => (
                    <View key={r.valor} style={[a.item, i < rel.pesquisa!.respostas.length - 1 && a.itemBorda]}>
                      <Text style={[a.itemTit, { flex: 1 }]}>{r.valor}</Text><Text style={a.valor}>{txt(r.n)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            {!!rel.escolhas && (
              <>
                <Text style={a.grupo}>{rel.escolhas.pergunta} ({rel.escolhas.total} escolhas)</Text>
                <View style={a.lista}>
                  {rel.escolhas.opcoes.map((o, i, arr) => (
                    <View key={o.valor} style={[a.item, i < arr.length - 1 && a.itemBorda]}>
                      <Text style={[a.itemTit, { flex: 1 }]}>{o.valor}</Text><Text style={a.valor}>{o.n}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            {rel.questionario?.perguntas.map((q) => (
              <View key={q.id}>
                <Text style={a.grupo}>{q.texto}</Text>
                {q.tipo === 'escolha' ? (
                  <View style={a.lista}>
                    {(q.opcoes || []).map((o, i, arr) => (
                      <View key={o.valor} style={[a.item, i < arr.length - 1 && a.itemBorda]}>
                        <Text style={[a.itemTit, { flex: 1 }]}>{o.valor}</Text><Text style={a.valor}>{txt(o.n)}</Text>
                      </View>
                    ))}
                  </View>
                ) : q.tipo === 'nota' ? (
                  <Text style={a.itemSub}>Média {q.media ?? '— (com 10 respostas ou mais)'}{q.promotores != null ? ` · ${q.promotores}% deram 9 ou 10` : ''}</Text>
                ) : (
                  <Text style={a.itemSub}>Comentários: a equipe Dicas lê e manda o resumo.</Text>
                )}
              </View>
            ))}
            <Text style={a.nota}>Para um PDF completo para a marca (idade, dias e mais), fale com a equipe Dicas.</Text>
          </View>
        )}

        {podeEditar && sel.ativa && (
          <TouchableOpacity style={a.encerrar} onPress={() => void encerrar()} accessibilityRole="button">
            <Text style={a.encerrarTxt}>Encerrar a ação</Text>
          </TouchableOpacity>
        )}
      </TelaParceiro>
    );
  }

  // ---------- Lista ----------
  return (
    <TelaParceiro titulo="Ação de marca" subtitulo="Patrocínio de uma marca na sua casa, com resultado medido." aoAtualizar={() => void carregar()}>
      {Voltar}
      {semTabela ? (
        <Text style={a.aviso}>Esta função está sendo ligada. Tente de novo em instantes.</Text>
      ) : (
        <>
          <View style={a.explica}>
            <Text style={a.explicaTxt}>Fechou um happy hour ou uma festa com uma marca? Crie a ação, ligue os cupons e festas e o app mostra o selo "Apoio" para o cliente. No fim, você vê quantas pessoas foram de verdade.</Text>
          </View>
          {acoes !== null && acoes.length === 0 && <OQueAMarcaGanha />}
          {podeEditar && (
            <TouchableOpacity style={a.botao} onPress={() => { setNova({ ...VAZIA, inicio: hoje() }); setComQuestionario(false); setPerguntas([{ ...PERGUNTA_VAZIA }]); }} accessibilityRole="button">
              <Feather name="plus" size={16} color="#FFF" /><Text style={a.botaoTxt}>Nova ação de marca</Text>
            </TouchableOpacity>
          )}
          <TituloSecao texto="SUAS AÇÕES" />
          {acoes === null ? <ActivityIndicator color={CP.rosa} /> : acoes.length === 0 ? (
            <Text style={a.vazio}>Nenhuma ação ainda.</Text>
          ) : (
            <View style={a.lista}>
              {acoes.map((x, i) => (
                <TouchableOpacity key={x.id} style={[a.item, i < acoes.length - 1 && a.itemBorda]} onPress={() => setSel(x)} accessibilityRole="button">
                  <View style={[a.bolinha, { backgroundColor: x.cor || '#F2C94C' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={a.itemTit} numberOfLines={1}>{x.marca} · {x.nome}</Text>
                    <Text style={a.itemSub}>{br(x.inicio)} a {br(x.fim)}{!x.ativa ? ' · encerrada' : ''}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={CP.fraco} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </TelaParceiro>
  );
}

const a = StyleSheet.create({
  quest: { backgroundColor: CP.card, borderColor: '#F2C94C44', borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  questTopo: { flexDirection: 'row', alignItems: 'center', gap: ESP.m },
  questIcone: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F2C94C1F', alignItems: 'center', justifyContent: 'center' },
  modelo: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, borderWidth: 1, borderColor: '#F2C94C55', borderRadius: RAIO.s, padding: ESP.m },
  modeloTxt: { color: '#F2C94C', fontSize: 13, fontWeight: '700', flex: 1 },
  pergunta: { borderTopWidth: 1, borderTopColor: CP.borda, paddingTop: ESP.m, gap: ESP.s },
  perguntaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  perguntaN: { color: CP.secao, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  addPergunta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: CP.borda, borderRadius: RAIO.s, minHeight: 44 },
  addTxt: { color: CP.rosa, fontSize: 13, fontWeight: '800' },
  hero: { backgroundColor: '#1A1810', borderColor: '#F2C94C55', borderWidth: 1, borderRadius: RAIO.m, padding: ESP.l, marginTop: ESP.s, gap: ESP.s },
  heroTit: { color: CP.texto, fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  heroTxt: { color: '#D6D3E0', fontSize: 13.5, lineHeight: 20 },
  pitch: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.l, marginTop: ESP.m, gap: ESP.m },
  pitchTag: { color: '#F2C94C', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  ganho: { flexDirection: 'row', gap: ESP.m, alignItems: 'flex-start' },
  ganhoIcone: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F2C94C1F', alignItems: 'center', justifyContent: 'center' },
  ganhoTit: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  ganhoTxt: { color: CP.dim, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  pitchNota: { color: CP.fraco, fontSize: 11.5, lineHeight: 16 },
  travaLinha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  trava: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.l, marginTop: ESP.l, gap: ESP.s },
  travaIcone: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3A3950', alignItems: 'center', justifyContent: 'center' },
  travaTitulo: { color: CP.texto, fontSize: 16, fontWeight: '800' },
  travaTxt: { color: CP.dim, fontSize: 13, lineHeight: 19 },
  travaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CP.rosa, borderRadius: RAIO.s, minHeight: 48, marginTop: ESP.s },
  travaBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  explica: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.s },
  explicaTxt: { color: CP.dim, fontSize: 13, lineHeight: 19 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CP.rosa, borderRadius: RAIO.s, minHeight: 48, marginTop: ESP.m },
  botaoTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  lista: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, paddingHorizontal: ESP.m, minHeight: 56, paddingVertical: ESP.s },
  itemBorda: { borderBottomWidth: 1, borderBottomColor: CP.borda },
  itemTit: { color: CP.texto, fontSize: 14, fontWeight: '700' },
  itemSub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  valor: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  bolinha: { width: 12, height: 12, borderRadius: 6 },
  grupo: { color: CP.secao, fontSize: 12, fontWeight: '700', marginTop: ESP.m, marginBottom: ESP.s },
  vazio: { color: CP.fraco, fontSize: 13 },
  resumo: { backgroundColor: CP.card, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.l, marginTop: ESP.s, gap: 4 },
  resumoTag: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  resumoTit: { color: CP.texto, fontSize: 16, fontWeight: '800' },
  resumoSub: { color: CP.dim, fontSize: 12 },
  link: { color: CP.rosa, fontSize: 13, fontWeight: '700', marginTop: ESP.s },
  numeros: { flexDirection: 'row', gap: ESP.s },
  numero: { flex: 1, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, paddingVertical: ESP.m, alignItems: 'center' },
  numeroN: { color: CP.texto, fontSize: 20, fontWeight: '900' },
  numeroR: { color: CP.fraco, fontSize: 11, fontWeight: '700', marginTop: 2 },
  nota: { color: CP.fraco, fontSize: 11, lineHeight: 16 },
  encerrar: { alignSelf: 'center', paddingVertical: ESP.m, marginTop: ESP.xl },
  encerrarTxt: { color: '#FF6B6B', fontSize: 13, fontWeight: '700' },
});
