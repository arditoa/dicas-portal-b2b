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
  Banner, BANNER_VAZIO, diasDesde, ErrosBanner, LugarBanner, MAX_CTA, MAX_DESTAQUE, maxChamada, meioBanner, NOME_CATEGORIA_APP, obterBanners, PLANO_TEXTO,
  salvarBannerNoLugar, textoDaVaga, Vaga, vagasDoLocal, validarBanner,
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

  // Rodada 146 — dois banners: Home (Fundador) e topo da categoria. A pessoa escolhe qual está editando.
  const [lugar, setLugar] = useState<LugarBanner>('categoria');
  const [bs, setBs] = useState<Record<LugarBanner, Banner>>({ home: { ...BANNER_VAZIO }, categoria: { ...BANNER_VAZIO } });
  const [bases, setBases] = useState<Record<LugarBanner, string>>({ home: JSON.stringify(BANNER_VAZIO), categoria: JSON.stringify(BANNER_VAZIO) });
  const b = bs[lugar];
  const [atualizado, setAtualizado] = useState<string | null>(null);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<ErrosBanner>({});
  const [verPlano, setVerPlano] = useState(false);

  const sujoEm = (l: LugarBanner) => JSON.stringify(bs[l]) !== bases[l];
  const sujo = sujoEm('home') || sujoEm('categoria');
  const voltar = useAvisoSairSemSalvar(sujo && !salvando);

  const carregar = useCallback(async () => {
    if (!localId || !premium) { setCarregando(false); return; }
    try {
      const [r, v] = await Promise.all([obterBanners(localId), vagasDoLocal(localId)]);
      setBs({ home: r.home, categoria: r.categoria });
      setBases({ home: JSON.stringify(r.home), categoria: JSON.stringify(r.categoria) });
      setAtualizado(r.atualizado);
      setVagas(v);
    } catch (e: any) {
      Alert.alert('Banner', e?.message || 'Não deu para abrir o banner.');
    } finally {
      setCarregando(false);
    }
  }, [localId, premium, fundador]);
  useEffect(() => { void carregar(); }, [carregar]);

  const mudar = (p: Partial<Banner>) => {
    setBs((todos) => {
      const x = todos[lugar];
      const novo = { ...x, ...p };
      // Igual ao portal: subiu foto com "Só cor" → passa para "Foto à direita".
      if ('imagem_url' in p && p.imagem_url && x.estilo === 'degrade') novo.estilo = 'foto_metade';
      return { ...todos, [lugar]: novo };
    });
    setErros({});
  };

  const salvar = async () => {
    const sujos = (['categoria', 'home'] as LugarBanner[]).filter(sujoEm);
    for (const l of sujos) {
      const e = validarBanner(bs[l]);
      if (Object.keys(e).length) {
        setLugar(l);
        setErros(e);
        return Alert.alert('Falta ajustar', `${l === 'home' ? 'Banner da Home' : 'Banner da categoria'}:\n${Object.values(e).join('\n')}`);
      }
    }
    setSalvando(true);
    try {
      let ult: string | null = null;
      const salvos = { home: JSON.parse(bases.home) as Banner, categoria: JSON.parse(bases.categoria) as Banner };
      for (const l of sujos) {
        const r = await salvarBannerNoLugar(localId, l, bs[l], { fundador, homeAtual: salvos.home, categoriaAtual: salvos.categoria });
        salvos[l] = bs[l];
        ult = r.atualizado;
      }
      setBases({ home: JSON.stringify(salvos.home), categoria: JSON.stringify(salvos.categoria) });
      if (ult) setAtualizado(ult);
      Alert.alert('Banner salvo', sujos.length > 1 ? 'Os dois banners já estão atualizados no app.' : sujos[0] === 'home' ? 'O banner da Home já usa essa frase.' : 'O banner da categoria já usa essa frase.');
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
        <TouchableOpacity style={a.voltar} onPress={voltar}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  if (!premium) {
    return (
      <TelaParceiro titulo="Banner" subtitulo="Na Home e no topo da categoria." aoVoltar={voltar}>
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
      <TelaParceiro titulo="Banner" subtitulo={fundador ? 'Um banner só: roda na Home e no topo da categoria.' : 'No topo da sua categoria.'} aoVoltar={voltar}>

        {/* Qual banner (Fundador tem Home e categoria; Premium só categoria) */}
        {false && (
          <>
            <TituloSecao texto="Qual banner você quer mudar?" />
            <View style={a.lugares}>
              {([
                ['home', 'Home', 'Membros Fundadores', 'star'],
                ['categoria', 'Categoria', NOME_CATEGORIA_APP[localAtivo?.categoria === 'lugares' ? 'bares' : localAtivo?.categoria || ''] || 'Topo da categoria', 'grid'],
              ] as [LugarBanner, string, string, keyof typeof Feather.glyphMap][]).map(([l, t1, t2, ic]) => {
                const on = lugar === l;
                return (
                  <TouchableOpacity key={l} style={[a.lugar, on && a.lugarOn]} onPress={() => { setLugar(l); setErros({}); }} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <Feather name={ic} size={15} color={on ? '#FFF' : CP.dim} />
                    <View style={{ flex: 1 }}>
                      <Text style={[a.lugarTitulo, on && { color: '#FFF' }]}>{t1}{sujoEm(l) ? ' •' : ''}</Text>
                      <Text style={a.lugarSub} numberOfLines={1}>{t2}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

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

        {/* Onde o banner roda (só as vagas de banner; os quadradinhos de cupom não entram aqui) */}
        {vagas.some((v) => v.tipo === 'premium') && (
          <Text style={a.vagaLinha}>
            <Feather name="map-pin" size={12} color={CP.fraco} />{' '}
            Seu banner roda em: {vagas.filter((v) => v.tipo === 'premium').map((v) => NOME_CATEGORIA_APP[v.categoria] || v.categoria).join(' · ')}
            {fundador ? ' · Home' : ''}
          </Text>
        )}

        {/* 1 · Frase */}
        <TituloSecao texto="1 · Frase" info="No banner do topo da categoria seu nome não aparece: aparece uma chamada que dá vontade de conhecer. Quem toca vai para a página da casa." />
        <Campo
          rotulo={meioBanner(b) ? 'Chamada (com foto em meio banner: até 60)' : 'Chamada (até 90)'}
          valor={b.chamada}
          aoMudar={(v) => mudar({ chamada: v })}
          max={max}
          erro={erros.chamada}
          linhas
          exemplo={lugar === 'home' ? 'Ex.: Já conhece o Vezpa Queen?' : 'Ex.: Conheça o nosso queridinho drink de Lichia'}
          ajuda={b.chamada.trim() && b.chamada === (JSON.parse(bases[lugar]) as Banner).chamada
            ? `É o texto que aparece hoje ${lugar === 'home' ? 'na Home' : 'na categoria'}. Pode mudar quando quiser.`
            : undefined}
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
          {lugar === 'home' ? (
            <Previa onde="Home · Membros Fundadores">
              <CarrosselAnuncios anuncios={[anuncio(nomeTag, PADRAO_HOME, 'star')]} />
            </Previa>
          ) : (
            <Previa onde="Topo da categoria">
              <CarrosselAnuncios anuncios={[anuncio('', PADRAO_CATEGORIA, fundador ? 'star' : 'map-pin')]} />
            </Previa>
          )}
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
  lugares: { flexDirection: 'row', gap: ESP.s, marginBottom: ESP.s },
  vagaLinha: { color: CP.fraco, fontSize: 12, lineHeight: 17, marginTop: ESP.m },
  lugar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, minHeight: 56 },
  lugarOn: { backgroundColor: '#E1306C1F', borderColor: CP.rosa },
  lugarTitulo: { color: CP.dim, fontSize: 14, fontWeight: '800' },
  lugarSub: { color: CP.fraco, fontSize: 11, marginTop: 1 },
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
