// Pacotes de viagem das agências e operadoras parceiras (tabela pacotes_turismo).
// Diferente de "Agências" (lista de empresas): aqui aparece cada PACOTE, com
// foto, preço e o nome da agência. Só agências liberadas no portal
// (locais.pode_subir_pacotes) conseguem cadastrar. Nada é vendido no app:
// a reserva é feita direto com a agência (regra da App Store).
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FiltrosPilulas, { FiltroDef } from '../components/FiltrosPilulas';
import FundoCaixaDegrade from '../components/FundoCaixaDegrade';
import CabecalhoTela from '../components/CabecalhoTela';
import { useI18n } from '../lib/i18n';
import { supabase } from '../lib/supabase';

const C = { bg: '#0B0B0E', card: '#161520', border: '#232230', text: '#F5F5F7', dim: '#A0A0B2', pink: '#E1306C' };

type Item = {
  id: string;
  local_id: string;
  nome: string;
  descricao: string | null;
  preco_de: number | null;
  foto_url: string | null;
  destino?: string | null;
  duracao_texto?: string | null;
  tags?: string[] | null;
  locais: { nome: string; cidade: string | null; logo_url: string | null } | null;
};

const FAIXAS_PRECO: { label: string; min: number; max: number }[] = [
  { label: 'Até R$ 1.000', min: 0, max: 1000 },
  { label: 'R$ 1.000 a R$ 3.000', min: 1000, max: 3000 },
  { label: 'Acima de R$ 3.000', min: 3000, max: Infinity },
];
const ORDEM_DURACAO = ['Bate-volta', '2 a 3 dias', '4 a 7 dias', '8 dias ou mais'];
const destinoDe = (i: Item) => i.destino || i.locais?.cidade || null;

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PacotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    let ativo = true;
    (async () => {
      const consulta = (cols: string) =>
        supabase
          .from('pacotes_turismo')
          .select(`id, local_id, nome, descricao, preco_de, foto_url, ${cols}locais!inner(nome, cidade, logo_url, status)`)
          .eq('ativo', true)
          .eq('locais.status', 'aprovado')
          .order('ordem', { ascending: true })
          .limit(200);
      // destino/duração/tags chegam com a migration 054; sem ela a tela continua funcionando.
      let r: any = await consulta('destino, duracao_texto, tags, ');
      if (r.error) r = await consulta('');
      if (!ativo) return;
      setItens(((r.data as any) || []) as Item[]);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const filtrosDef = useMemo<FiltroDef[]>(() => {
    const unicos = (xs: (string | null | undefined)[]) =>
      Array.from(new Set(xs.filter((x): x is string => !!x && x.trim().length > 0))).sort((x, y) => x.localeCompare(y, 'pt-BR'));
    const duracoes = unicos(itens.map((i) => i.duracao_texto)).sort((x, y) => ORDEM_DURACAO.indexOf(x) - ORDEM_DURACAO.indexOf(y));
    return [
      { id: 'destino', label: 'Destino', icone: 'map-pin', opcoes: unicos(itens.map(destinoDe)), valor: filtros.destino },
      { id: 'duracao', label: 'Duração', icone: 'calendar', opcoes: duracoes, valor: filtros.duracao },
      { id: 'estilo', label: 'Estilo', icone: 'sliders', opcoes: unicos(itens.flatMap((i) => i.tags || [])), valor: filtros.estilo },
      {
        id: 'preco',
        label: 'Preço',
        icone: 'tag',
        opcoes: FAIXAS_PRECO.filter((f) => itens.some((i) => i.preco_de != null && Number(i.preco_de) >= f.min && Number(i.preco_de) < f.max)).map((f) => f.label),
        valor: filtros.preco,
      },
    ];
  }, [itens, filtros]);

  const lista = useMemo(() => {
    const q = semAcento(busca.trim());
    const faixa = FAIXAS_PRECO.find((f) => f.label === filtros.preco);
    return itens.filter((i) => {
      if (filtros.destino && destinoDe(i) !== filtros.destino) return false;
      if (filtros.duracao && i.duracao_texto !== filtros.duracao) return false;
      if (filtros.estilo && !(i.tags || []).includes(filtros.estilo)) return false;
      if (faixa && !(i.preco_de != null && Number(i.preco_de) >= faixa.min && Number(i.preco_de) < faixa.max)) return false;
      if (!q) return true;
      return semAcento([i.nome, i.descricao, i.locais?.nome, destinoDe(i)].filter(Boolean).join(' ')).includes(q);
    });
  }, [itens, busca, filtros]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CabecalhoTela titulo={t('trip.pacotes')} subtitulo={t('pacotes.sub')} />

      <View style={styles.busca}>
        <Feather name="search" size={18} color={C.dim} />
        <TextInput
          style={styles.buscaInput}
          value={busca}
          onChangeText={setBusca}
          placeholder={t('pacotes.buscar')}
          placeholderTextColor={C.dim}
          returnKeyType="search"
          accessibilityLabel={t('pacotes.buscar')}
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <FiltrosPilulas
          filtros={filtrosDef}
          onSelecionar={(id, v) => setFiltros((f) => ({ ...f, [id]: v }))}
          onLimpar={() => setFiltros({})}
        />
      </View>

      {carregando ? (
        <ActivityIndicator color={C.pink} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
          ListEmptyComponent={<Text style={styles.vazio}>{t('trip.semPacotes')}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => router.push(`/business/${item.local_id}` as any)} accessibilityRole="button" accessibilityLabel={item.nome}>
              <View style={styles.foto}>
                <FundoCaixaDegrade id={`pct-${item.id}`} cores={['#FF8A3D', '#E1306C']} />
                {item.foto_url ? (
                  <Image source={{ uri: item.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Feather name="package" size={30} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.corpo}>
                <Text style={styles.nome} numberOfLines={2}>{item.nome}</Text>
                {!!item.descricao && <Text style={styles.desc} numberOfLines={2}>{item.descricao}</Text>}
                <Text style={styles.agencia} numberOfLines={1}>
                  {t('pacotes.por')} {[item.locais?.nome, destinoDe(item)].filter(Boolean).join(' · ')}
                </Text>
                {item.preco_de != null && (
                  <Text style={styles.preco}>
                    {t('trip.aPartirDe')} R$ {Number(item.preco_de).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerBlock: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  headerLogo: { width: 140, height: 34 },
  titulo: { fontSize: 18, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, lineHeight: 17, color: C.dim, marginTop: 2 },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 46 },
  buscaInput: { flex: 1, color: C.text, fontSize: 14 },
  vazio: { color: C.dim, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  card: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  foto: { width: 110, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  corpo: { flex: 1, padding: 12, gap: 3 },
  nome: { color: C.text, fontSize: 15, fontWeight: '800' },
  desc: { color: C.dim, fontSize: 12, lineHeight: 17 },
  agencia: { color: '#B39DDB', fontSize: 12, fontWeight: '600', marginTop: 2 },
  preco: { color: C.pink, fontSize: 13, fontWeight: '800', marginTop: 2 },
});
