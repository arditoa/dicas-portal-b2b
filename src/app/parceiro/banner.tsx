// Tela 5 do Modo parceiro — Banner (Divulgar › Banner; lousa › Banner). Regras do portal (dashboard/destaques +
// EditorEstiloBanner) e de src/lib/estiloBanner.ts (igual no portal); dados em src/lib/parceiro/banner.ts.
//   - só Premium e Fundador com plano efetivo; nos demais, cadeado e "Falar com a equipe" (sem preço);
//   - frase (60 com foto em meio banner, 90 nos outros estilos), botão, foto, estilo, cores do fundo,
//     cor dos dizeres, palavra de impacto com cor;
//   - prévia ao vivo com o próprio CarrosselAnuncios do app: Home (Fundador, com o nome na etiqueta) e topo da categoria;
//   - "trocado há N dias" (aviso a partir de 7), "Sua vaga no app" e o que o plano inclui.
// Permissão: 'banner' (dono e equipe). Não vale para marcas de festas (igual ao menu).
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CarrosselAnuncios, { Anuncio } from '../../components/CarrosselAnuncios';
import { BarraSalvar, Campo, FotoUpload, Previa, SeletorCor, estiloForm as f, useAvisoSairSemSalvar } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { CORES_DESTAQUE_BANNER, CORES_TEXTO_BANNER, DEGRADES_BANNER, ESTILOS_BANNER, estiloDoCartao } from '../../lib/estiloBanner';
import { useModoParceiro } from '../../lib/modoParceiro';
import {
  Banner, BANNER_VAZIO, diasDesde, ErrosBanner, MAX_CTA, MAX_DESTAQUE, maxChamada, meioBanner, obterBanner, PLANO_TEXTO, salvarBanner,
  textoDaVaga, Vaga, vagasDoLocal, validarBanner,
} from '../../lib/parceiro/banner';
import { falarComEquipe, nivelDoPlano } from '../../lib/parceiroMenu';
import { formatarNome } from '../../lib/texto';

// Degradês padrão do app quando o parceiro não escolhe cores (Home: CarrosselAnuncios da Home; categoria: VitrineCategoria).
const PADRAO_HOME: [string, string] = ['#B45309', '#9D174D'];
const PADRAO_CATEGORIA: [string, string] = ['#E1306C', '#7E57C2'];

export default function BannerParceiro() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const localId = localAtivo?.local_id || '';
  const liberado = !!localAtivo && pode('banner') && localAtivo.categoria !== 'eventos';
  const premium = nivelDoPlano(localAtivo?.plano_comercial) === 'premium'; // Premium ou Fundador, plano efetivo
  const fundador = localAtivo?.plano_comercial === 'fundador';

  const [b, setB] = useState<Banner>({ ...BANNER_VAZIO });
  const [base, setBase] = useState(() => JSON.stringify(BANNER_VAZIO));
  const [atualizado, setAtualizado] = useState<string | null>(null);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<ErrosBanner>({});
  const [verPlano, setVerPlano] = useState(false);

  const sujo = JSON.stringify(b) !== base;
  useAvisoSairSemSalvar(sujo && !salvando);

  const carregar = useCallback(async () => {
    if (!localId || !premium) { setCarregando(false); return; }
    try {
      const [r, v] = await Promise.all([obterBanner(localId), vagasDoLocal(localId)]);
      setB(r.banner);
      setBase(JSON.stringify(r.banner));
      setAtualizado(r.atualizado);
      setVagas(v);
    } catch (e: any) {
      Alert.alert('Banner', e?.message || 'Não deu para abrir o banner.');
    } finally {
      setCarregando(false);
    }
  }, [localId, premium]);
  useEffect(() => { void carregar(); }, [carregar]);

  const mudar = (p: Partial<Banner>) => {
    setB((x) => {
      const novo = { ...x, ...p };
      // Igual ao portal: subiu foto com "Só cor" → passa para "Foto à direita".
      if ('imagem_url' in p && p.imagem_url && x.estilo === 'degrade') novo.estilo = 'foto_metade';
      return novo;
    });
    setErros({});
  };

  const salvar = async () => {
    const e = validarBanner(b);
    if (Object.keys(e).length) {
      setErros(e);
      return Alert.alert('Falta ajustar', Object.values(e).join('\n'));
    }
    setSalvando(true);
    try {
      const r = await salvarBanner(localId, b);
      setBase(JSON.stringify(b));
      setAtualizado(r.atualizado);
      Alert.alert(r.aviso ? 'Salvo em parte' : 'Banner salvo', r.aviso || 'O banner já usa essa frase no app.');
    } catch (x: any) {
      Alert.alert('Banner', x?.message || 'Não deu para salvar.');
    } finally {
      setSalvando(false);
    }
  };

  // Prévia ao vivo: o mesmo cartão que a Home e a categoria montam (estiloDoCartao + CarrosselAnuncios).
  const anuncio = useCallback((tag: string, padrao: [string, string], icone: Anuncio['icone']): Anuncio => {
    const est = estiloDoCartao({ ...b, destaque_texto: b.destaque_texto || null }, padrao);
    return {
      id: `previa-${tag || 'cat'}`, tag, titulo: b.chamada.trim() || 'Sua frase aparece aqui', cta: b.cta.trim() || 'Conhecer',
      ...est, icone, cor: est.degrade[0], onPress: () => {},
    };
  }, [b]);
  const nomeTag = useMemo(() => formatarNome(localAtivo?.nome || '').toUpperCase(), [localAtivo?.nome]);

  if (!localAtivo || !liberado) {
    return (
      <TelaParceiro titulo="Banner">
        <Text style={a.aviso}>Seu acesso não inclui o banner deste local. Peça para o dono liberar a permissão de banner.</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  if (!premium) {
    return (
      <TelaParceiro titulo="Banner" subtitulo="Na Home e no topo da categoria.">
        <TouchableOpacity style={a.voltar} onPress={() => router.back()} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
        <View style={a.trava}>
          <View style={a.travaIcone}><Feather name="lock" size={18} color="#FFF" /></View>
          <Text style={a.travaTitulo}>Banner nos planos Premium e Fundador</Text>
          <Text style={a.travaTxt}>O banner grande roda no topo da categoria (12 vagas, 4 por hora) e, para Fundadores, também na Home. Você escreve a frase e troca quando quiser.</Text>
          <TouchableOpacity style={a.travaBtn} onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero ter o banner no app.`)} accessibilityRole="button">
            <Feather name="message-circle" size={16} color="#FFF" />
            <Text style={a.travaBtnTxt}>Falar com a equipe</Text>
          </TouchableOpacity>
        </View>
      </TelaParceiro>
    );
  }
  if (carregando) return <View style={[a.tela, a.centro]}><ActivityIndicator color={CP.rosa} /></View>;

  const dias = diasDesde(atualizado);
  const plano = PLANO_TEXTO[fundador ? 'fundador' : 'premium'];
  const max = maxChamada(b);
  const destaqueFora = !!b.destaque_texto.trim() && !!b.chamada && !b.chamada.toLowerCase().includes(b.destaque_texto.trim().toLowerCase());
  const degradeEscolhido = DEGRADES_BANNER.find((d) => d.cores[0] === b.cor1 && d.cores[1] === b.cor2)?.chave ?? null;

  return (
    <View style={a.tela}>
      <TelaParceiro titulo="Banner" subtitulo={fundador ? 'Na Home, nos Destaques e no topo da categoria.' : 'No topo da sua categoria.'}>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>

        {/* Trocado há N dias */}
        <View style={[a.dias, dias !== null && dias >= 7 && a.diasAlerta]}>
          <Feather name={dias === null || dias >= 7 ? 'alert-circle' : 'check-circle'} size={16} color={dias === null || dias >= 7 ? '#FFD54F' : '#4CAF7D'} />
          <Text style={[a.diasTxt, (dias === null || dias >= 7) && { color: '#FFD54F' }]}>
            {dias === null ? 'Você ainda não escreveu a frase do seu banner.'
              : dias >= 7 ? `Trocado há ${dias} dias. Que tal uma novidade da semana? Banner novo chama mais atenção.`
              : dias === 0 ? 'Trocado hoje. O ideal é trocar toda semana.'
              : `Trocado há ${dias} dia${dias === 1 ? '' : 's'}. O ideal é trocar toda semana.`}
          </Text>
        </View>

        {/* Plano e vaga */}
        <TouchableOpacity style={[a.plano, { borderColor: plano.cor + '66' }]} onPress={() => setVerPlano((v) => !v)} activeOpacity={0.85} accessibilityRole="button">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: ESP.s }}>
            <Text style={[a.planoNome, { color: plano.cor }]}>{plano.nome}</Text>
            <View style={{ flex: 1 }} />
            <Text style={a.planoVer}>{verPlano ? 'Fechar' : 'O que inclui'}</Text>
            <Feather name={verPlano ? 'chevron-up' : 'chevron-down'} size={16} color={CP.dim} />
          </View>
          <Text style={a.vaga}>
            <Text style={{ fontWeight: '800', color: CP.texto }}>Sua vaga no app: </Text>
            {vagas.length ? `${vagas.map((v) => textoDaVaga(v, fundador)).join(' · ')}.` : 'a posição do seu banner entre as vagas é definida pela equipe Dicas; você já entra na rotação.'}
          </Text>
          {verPlano && plano.itens.map((t) => (
            <View key={t} style={a.item}><Feather name="check" size={13} color={plano.cor} /><Text style={a.itemTxt}>{t}</Text></View>
          ))}
        </TouchableOpacity>

        {/* 1 · Frase */}
        <TituloSecao texto="1 · Frase" info="No banner do topo da categoria seu nome não aparece: aparece uma chamada que dá vontade de conhecer. Quem toca vai para a página da casa." />
        <Campo
          rotulo={meioBanner(b) ? 'Chamada (com foto em meio banner: até 60)' : 'Chamada (até 90)'}
          valor={b.chamada}
          aoMudar={(v) => mudar({ chamada: v })}
          max={max}
          erro={erros.chamada}
          linhas
          exemplo="Ex.: Conheça o nosso queridinho drink de Lichia"
        />
        <Campo rotulo="Texto do botão" valor={b.cta} aoMudar={(v) => mudar({ cta: v })} max={MAX_CTA} erro={erros.cta} exemplo="Conhecer" />

        {/* 2 · Foto e estilo */}
        <TituloSecao texto="2 · Foto e estilo" />
        <FotoUpload
          rotulo="Foto do banner (opcional)"
          valor={b.imagem_url}
          aoMudar={(u) => mudar({ imagem_url: u })}
          bucket="fotos-locais"
          pasta={localId}
          prefixo="banner"
          altura={150}
          ajuda="Prefira foto sem texto escrito, com o drink, o prato ou o ambiente no centro. Letreiro ou flyer com texto fica ruim."
        />
        <View style={f.bloco}>
          <Text style={f.rotulo}>Estilo</Text>
          <View style={a.opcoes}>
            {ESTILOS_BANNER.map((e) => {
              const on = b.estilo === e.v;
              return (
                <TouchableOpacity key={e.v} style={[a.opcao, on && a.opcaoOn]} onPress={() => mudar({ estilo: e.v })} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                  <Text style={[a.opcaoTitulo, on && { color: '#FFF' }]}>{e.rotulo}</Text>
                  <Text style={a.opcaoDica}>{e.dica}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!erros.foto && <Text style={[f.erro, { marginTop: 4 }]}>{erros.foto}</Text>}
          {!erros.foto && b.estilo !== 'degrade' && !b.imagem_url && <Text style={[f.ajuda, { color: '#FFD54F', marginTop: 4 }]}>Suba a foto do banner para este estilo aparecer.</Text>}
        </View>

        {/* 3 · Cores */}
        <TituloSecao texto="3 · Cores" />
        <SeletorCor
          rotulo={b.estilo === 'foto_fundo' ? 'Cores do fundo (aparecem se a foto não carregar)' : 'Cores do fundo'}
          valor={degradeEscolhido}
          aoMudar={(o) => mudar(degradeEscolhido === o.chave ? { cor1: null, cor2: null } : { cor1: o.cores[0], cor2: o.cores[1] })}
          ajuda="Toque de novo para voltar ao padrão do app."
        />
        <CorChips
          rotulo="Cor dos dizeres"
          opcoes={CORES_TEXTO_BANNER.map((c) => ({ cor: c.cor, rotulo: c.rotulo }))}
          valor={b.cor_texto || '#FFFFFF'}
          aoMudar={(c) => mudar({ cor_texto: c === '#FFFFFF' ? null : c })}
        />
        <Campo
          rotulo="Palavra de impacto (opcional)"
          valor={b.destaque_texto}
          aoMudar={(v) => mudar({ destaque_texto: v })}
          max={MAX_DESTAQUE}
          exemplo="Ex.: drink de Lichia"
          ajuda={destaqueFora ? 'Este trecho não está na frase: vai aparecer no fim dela.' : 'O trecho da frase que ganha outra cor. A cor também pinta o botão.'}
        />
        <CorChips
          rotulo="Cor da palavra e do botão"
          opcoes={[...CORES_DESTAQUE_BANNER.map((c) => ({ cor: c.cor, rotulo: c.rotulo })), { cor: null, rotulo: 'Botão branco' }]}
          valor={b.cor_destaque}
          aoMudar={(c) => mudar({ cor_destaque: c })}
        />

        {/* Prévia ao vivo */}
        <TituloSecao texto="Como aparece no app" />
        <View style={{ gap: ESP.s }}>
          {fundador && (
            <Previa onde="Home · Membros Fundadores">
              <CarrosselAnuncios anuncios={[anuncio(nomeTag, PADRAO_HOME, 'star')]} />
            </Previa>
          )}
          <Previa onde="Topo da categoria">
            <CarrosselAnuncios anuncios={[anuncio('', PADRAO_CATEGORIA, fundador ? 'star' : 'map-pin')]} />
          </Previa>
        </View>
        <View style={{ height: ESP.xl }} />
      </TelaParceiro>
      <BarraSalvar rotulo="Salvar banner" salvando={salvando} aoSalvar={() => void salvar()} desabilitado={!sujo} />
    </View>
  );
}

function CorChips({ rotulo, opcoes, valor, aoMudar }: { rotulo: string; opcoes: { cor: string | null; rotulo: string }[]; valor: string | null; aoMudar: (c: string | null) => void }) {
  return (
    <View style={f.bloco}>
      <Text style={f.rotulo}>{rotulo}</Text>
      <View style={a.cores}>
        {opcoes.map((o) => {
          const on = valor === o.cor;
          return (
            <TouchableOpacity key={o.rotulo} style={[a.cor, on && a.corOn]} onPress={() => aoMudar(o.cor)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.rotulo}>
              <View style={[a.bolinha, { backgroundColor: o.cor || '#FFFFFF' }, !o.cor && { borderStyle: 'dashed' }]} />
              <Text style={[a.corTxt, on && { color: '#FFF' }]}>{o.rotulo}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const a = StyleSheet.create({
  tela: { flex: 1, backgroundColor: CP.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  trava: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.l, marginTop: ESP.m, alignItems: 'center', gap: ESP.s },
  travaIcone: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2A2938', alignItems: 'center', justifyContent: 'center' },
  travaTitulo: { color: CP.texto, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  travaTxt: { color: CP.dim, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  travaBtn: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, minHeight: 48, paddingHorizontal: ESP.l, borderRadius: RAIO.s, backgroundColor: '#25D366', marginTop: ESP.s },
  travaBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  dias: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, marginTop: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, padding: ESP.m },
  diasAlerta: { backgroundColor: '#FFD54F14', borderColor: '#FFD54F55' },
  diasTxt: { flex: 1, color: CP.texto, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  plano: { marginTop: ESP.s, backgroundColor: CP.card, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, gap: ESP.s },
  planoNome: { fontSize: 15, fontWeight: '900' },
  planoVer: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  vaga: { color: CP.dim, fontSize: 12, lineHeight: 17 },
  item: { flexDirection: 'row', gap: ESP.s, alignItems: 'flex-start' },
  itemTxt: { flex: 1, color: '#D0D0E0', fontSize: 12, lineHeight: 17 },
  opcoes: { gap: ESP.s },
  opcao: { borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda, backgroundColor: '#0F0E15', padding: ESP.m, minHeight: 44 },
  opcaoOn: { borderColor: CP.rosa, backgroundColor: '#E1306C1F' },
  opcaoTitulo: { color: CP.dim, fontSize: 13, fontWeight: '800' },
  opcaoDica: { color: CP.fraco, fontSize: 11, marginTop: 2 },
  cores: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s },
  cor: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: ESP.m, borderRadius: 18, borderWidth: 1, borderColor: CP.borda, backgroundColor: '#0F0E15' },
  corOn: { borderColor: CP.rosa, backgroundColor: '#E1306C1F' },
  bolinha: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  corTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
});
