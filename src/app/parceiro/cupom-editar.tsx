// Tela 4 do Modo parceiro — Novo cupom / Editar cupom (?id=). Regras do portal (dashboard/cupons);
// dados em src/lib/parceiro/cupons.ts. Tipo segue a categoria: "cupom da casa" (bares, restaurantes…) ou
// "cupom de desconto" (saúde, lojas, beleza, serviços). Título, regra, código, validade, limite de uso,
// dias e horários (janela do cupom) e pausar/retomar. Prévia igual ao cartão da página da casa.
// Novo cupom respeita o limite do plano (o banco trava; aqui só explica). Permissão: 'cupons'.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BarraSalvar, Campo, CampoData, CampoHora, Chips, Interruptor, Previa, estiloForm as f, useAvisoSairSemSalvar,
} from '../../components/parceiro/form';
import { PreviaCupom } from '../../components/parceiro/PreviaCupom';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { NOMES_DIAS, textoJanela } from '../../lib/janelaCupom';
import { recursosDaCategoria, useModoParceiro } from '../../lib/modoParceiro';
import {
  chaveHoje, ErrosCupom, etiquetaDoPlano, FormCupom, formDoCupom, formVazio, MAX_CODIGO, MAX_REGRA, MAX_TITULO, obterCupom,
  salvarCupom, situacaoDoCupom, textoDoLimite, usoDoPlano, UsoPlano, usoDosCupons, validarCupom,
} from '../../lib/parceiro/cupons';
import { falarComEquipe, MSG_CUPOM_PLANO_PAGO, nivelDoPlano } from '../../lib/parceiroMenu';

const ATALHOS: { rotulo: string; dias: number[] }[] = [
  { rotulo: 'Ter a Qui', dias: [2, 3, 4] },
  { rotulo: 'Sex a Dom', dias: [0, 5, 6] },
  { rotulo: 'Todos os dias', dias: [] },
];

export default function CupomEditar() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const r = localAtivo ? recursosDaCategoria(localAtivo.categoria) : null;
  const liberado = !!localAtivo && !!r && r.cupom !== false && pode('cupons');
  const gratuito = nivelDoPlano(localAtivo?.plano_comercial) === 'gratuito';
  const desconto = r?.cupom === 'desconto';

  const [form, setForm] = useState<FormCupom>(formVazio());
  const [base, setBase] = useState(() => JSON.stringify(formVazio()));
  const [carregando, setCarregando] = useState(!!id);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<ErrosCupom>({});
  const [plano, setPlano] = useState<UsoPlano | null>(null);
  const [usadas, setUsadas] = useState(0);
  const [original, setOriginal] = useState<{ valido_de: string | null; valido_ate: string | null; limite_uso: number | null; ativo: boolean } | null>(null);

  const sujo = JSON.stringify(form) !== base;
  useAvisoSairSemSalvar(sujo && !salvando);

  const carregar = useCallback(async () => {
    if (!localId) return;
    try {
      const [c, p, usos] = await Promise.all([
        id ? obterCupom(id) : Promise.resolve(null),
        !id && !gratuito ? usoDoPlano(localId) : Promise.resolve(null),
        id ? usoDosCupons(localId) : Promise.resolve({}),
      ]);
      setPlano(p);
      if (id) {
        if (!c) throw new Error('Cupom não encontrado.');
        const novo = formDoCupom(c);
        setForm(novo);
        setBase(JSON.stringify(novo));
        setOriginal({ valido_de: c.valido_de, valido_ate: c.valido_ate, limite_uso: c.limite_uso, ativo: c.ativo });
        setUsadas((usos as Record<string, { resgates: number }>)[c.id]?.resgates ?? 0);
      }
    } catch (e: any) {
      Alert.alert('Cupom', e?.message || 'Não deu para abrir o cupom.');
      router.back();
    } finally {
      setCarregando(false);
    }
  }, [id, localId, gratuito, router]);

  useEffect(() => { void carregar(); }, [carregar]);

  const mudar = (p: Partial<FormCupom>) => {
    setForm((x) => ({ ...x, ...p }));
    setErros((e) => {
      const n = { ...e };
      if ('titulo' in p) delete n.titulo;
      if ('limiteUso' in p) delete n.limite;
      if ('validoAte' in p) delete n.validade;
      return n;
    });
  };

  const etiqueta = etiquetaDoPlano(plano);
  // Novo cupom: Gratuito não cria; pago só cria quando o período liberou.
  const travadoNovo = !form.id && (gratuito || (etiqueta ? !etiqueta.livre : false));

  const salvar = async () => {
    if (travadoNovo) return;
    const e = validarCupom(form, usadas);
    if (Object.keys(e).length) {
      setErros(e);
      return Alert.alert('Falta ajustar', Object.values(e).join('\n'));
    }
    setSalvando(true);
    try {
      await salvarCupom(localId, form, usadas);
      setBase(JSON.stringify(form)); // não perguntar "sair sem salvar"
      Alert.alert(
        form.id ? 'Cupom salvo' : 'Cupom publicado',
        form.ativo ? 'Já aparece na página da casa e na faixa de cupons da categoria.' : 'Está pausado: não aparece para o público até você retomar.',
        [{ text: 'OK', onPress: () => router.replace('/parceiro/cupons') }],
      );
    } catch (x: any) {
      Alert.alert('Cupom', x?.message || 'Não deu para salvar.');
    } finally {
      setSalvando(false);
    }
  };

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Cupom">
        <Text style={a.aviso}>Seu acesso não inclui os cupons deste local. Peça para o dono liberar a permissão de cupons.</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }
  if (carregando) return <View style={[a.tela, a.centro]}><ActivityIndicator color={CP.rosa} /></View>;

  const sit = original ? situacaoDoCupom({ ...original, ativo: form.ativo }, { resgates: usadas, ultimoUso: null }) : null;
  const janela = textoJanela(form.dias, form.horaInicio, form.horaFim);
  const nomeTipo = desconto ? 'Cupom de desconto' : 'Cupom da casa';

  return (
    <View style={a.tela}>
      <TelaParceiro titulo={form.id ? 'Editar cupom' : 'Novo cupom'} subtitulo="Aparece na página da casa e na faixa de cupons da categoria.">
        <TouchableOpacity style={a.voltar} onPress={() => router.back()} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>

        {/* Bloqueio do plano (só para cupom novo) */}
        {travadoNovo && (
          <TouchableOpacity
            style={a.trava}
            onPress={() => gratuito && void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero liberar os cupons no app.`)}
            disabled={!gratuito}
            accessibilityRole="button"
          >
            <Feather name="lock" size={16} color="#FFD54F" />
            <Text style={a.travaTxt}>
              {gratuito ? `${MSG_CUPOM_PLANO_PAGO} Toque para falar com a equipe.` : `${textoDoLimite(plano) || ''} ${etiqueta?.txt || ''}.`.trim()}
            </Text>
          </TouchableOpacity>
        )}
        {sit && (
          <View style={[a.situacao, { borderColor: sit.cor + '66' }]}>
            <View style={[a.ponto, { backgroundColor: sit.cor }]} />
            <Text style={a.situacaoTxt}>{sit.txt}{usadas ? ` · usado ${usadas} ${usadas === 1 ? 'vez' : 'vezes'}` : ''}</Text>
          </View>
        )}

        {/* 1 · O cupom */}
        <TituloSecao texto="1 · O cupom" />
        <View style={a.tipo}>
          <Feather name="tag" size={15} color="#F2A900" />
          <View style={{ flex: 1 }}>
            <Text style={a.tipoTitulo}>{nomeTipo}</Text>
            <Text style={a.tipoSub}>{desconto ? 'Desconto no serviço ou na compra (pela categoria da casa).' : 'Um benefício na casa: drink, entrada, porção… (pela categoria da casa).'}</Text>
          </View>
        </View>
        <Campo
          rotulo="O que o cliente ganha"
          valor={form.titulo}
          aoMudar={(v) => mudar({ titulo: v })}
          erro={erros.titulo}
          max={MAX_TITULO}
          exemplo={desconto ? 'Ex.: 10% de desconto na primeira consulta' : 'Ex.: 1 drink grátis na primeira visita'}
          ajuda="É o título do cupom na página da casa."
        />
        <Campo rotulo="Regra (opcional)" valor={form.descricao} aoMudar={(v) => mudar({ descricao: v })} linhas max={MAX_REGRA} exemplo="Ex.: Válido para 1 pessoa por mesa, não cumulativo." />
        <View style={a.duas}>
          <View style={{ flex: 1 }}>
            <Campo rotulo="Código (opcional)" valor={form.codigo} aoMudar={(v) => mudar({ codigo: v.toUpperCase().replace(/\s/g, '') })} max={MAX_CODIGO} exemplo="LGBT10" autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Campo rotulo="Limite de uso" valor={form.limiteUso} aoMudar={(v) => mudar({ limiteUso: v.replace(/\D/g, '') })} teclado="number-pad" erro={erros.limite} exemplo="Sem limite" />
          </View>
        </View>
        <CampoData rotulo="Válido até (opcional)" valor={form.validoAte} aoMudar={(v) => mudar({ validoAte: v })} erro={erros.validade} min={chaveHoje()} exemplo="Sem data de fim" ajuda="Vale até as 23h59 desse dia." />
        {!!form.validoAte && (
          <TouchableOpacity style={a.link} onPress={() => mudar({ validoAte: null })} accessibilityRole="button"><Text style={a.linkTxt}>Tirar a data de fim</Text></TouchableOpacity>
        )}

        {/* 2 · Quando vale */}
        <TituloSecao texto="2 · Quando vale" info="Sem nada marcado, o cupom vale todos os dias e o dia todo. O app só libera o check-in nos dias e horários escolhidos (horário de Brasília)." />
        <Chips multiplo rotulo="Dias" opcoes={NOMES_DIAS.map((n, i) => ({ valor: i, rotulo: n }))} valor={form.dias} aoMudar={(d) => mudar({ dias: [...d].sort((x, y) => x - y) })} />
        <View style={a.atalhos}>
          {ATALHOS.map((x) => (
            <TouchableOpacity key={x.rotulo} style={a.atalho} onPress={() => mudar({ dias: x.dias })} accessibilityRole="button"><Text style={a.atalhoTxt}>{x.rotulo}</Text></TouchableOpacity>
          ))}
        </View>
        <View style={a.duas}>
          <View style={{ flex: 1 }}><CampoHora rotulo="A partir das" valor={form.horaInicio} aoMudar={(v) => mudar({ horaInicio: v })} limpar exemplo="--:--" /></View>
          <View style={{ flex: 1 }}><CampoHora rotulo="Até às" valor={form.horaFim} aoMudar={(v) => mudar({ horaFim: v })} limpar exemplo="--:--" /></View>
        </View>
        <Text style={[f.ajuda, { marginTop: ESP.s }]}>{janela ? `Vale: ${janela}` : 'Vale todos os dias, o dia todo.'}</Text>

        {/* 3 · No ar */}
        <TituloSecao texto="3 · No ar" />
        <Interruptor
          titulo={form.ativo ? 'No ar' : 'Pausado'}
          explicacao={form.ativo ? 'Aparece na página da casa e na faixa de cupons.' : 'Fica guardado sem aparecer para o público.'}
          valor={form.ativo}
          aoMudar={(v) => mudar({ ativo: v })}
        />

        {/* Prévia */}
        <TituloSecao texto="Como o cliente vê" />
        <Previa onde="Página da casa">
          <PreviaCupom titulo={form.titulo} descricao={form.descricao} dias={form.dias} horaInicio={form.horaInicio} horaFim={form.horaFim} />
        </Previa>
        <View style={{ height: ESP.xl }} />
      </TelaParceiro>
      <BarraSalvar rotulo={form.id ? 'Salvar' : 'Publicar cupom'} salvando={salvando} aoSalvar={() => void salvar()} desabilitado={travadoNovo || (!!form.id && !sujo)} />
    </View>
  );
}

const a = StyleSheet.create({
  tela: { flex: 1, backgroundColor: CP.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  trava: { flexDirection: 'row', alignItems: 'flex-start', gap: ESP.s, marginTop: ESP.m, backgroundColor: '#FFD54F14', borderRadius: RAIO.s, padding: ESP.m },
  travaTxt: { flex: 1, color: '#FFD54F', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  situacao: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, marginTop: ESP.m, borderWidth: 1, borderRadius: RAIO.s, padding: ESP.m, backgroundColor: CP.card },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  situacaoTxt: { flex: 1, color: CP.texto, fontSize: 13, fontWeight: '600' },
  tipo: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, padding: ESP.m },
  tipoTitulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  tipoSub: { color: CP.dim, fontSize: 12, marginTop: 2, lineHeight: 16 },
  duas: { flexDirection: 'row', gap: ESP.s },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkTxt: { color: CP.rosa, fontSize: 12, fontWeight: '800' },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s, marginTop: ESP.s },
  atalho: { minHeight: 36, justifyContent: 'center', paddingHorizontal: ESP.m, borderRadius: 18, borderWidth: 1, borderColor: CP.borda },
  atalhoTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
});
