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

import FundoCaixaDegrade from '../components/FundoCaixaDegrade';
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
  locais: { nome: string; cidade: string | null; logo_url: string | null } | null;
};

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PacotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [cidade, setCidade] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      let r: any = await supabase
        .from('pacotes_turismo')
        .select('id, local_id, nome, descricao, preco_de, foto_url, locais!inner(nome, cidade, logo_url, status)')
        .eq('ativo', true)
        .eq('locais.status', 'aprovado')
        .order('ordem', { ascending: true })
        .limit(200);
      if (!ativo) return;
      setItens(((r.data as any) || []) as Item[]);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const cidades = useMemo(
    () => Array.from(new Set(itens.map((i) => i.locais?.cidade).filter((c): c is string => !!c))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [itens]
  );

  const lista = useMemo(() => {
    const q = semAcento(busca.trim());
    return itens.filter((i) => {
      if (cidade && i.locais?.cidade !== cidade) return false;
      if (!q) return true;
      return semAcento([i.nome, i.descricao, i.locais?.nome, i.locais?.cidade].filter(Boolean).join(' ')).includes(q);
    });
  }, [itens, busca, cidade]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => router.back()} style={styles.voltar} accessibilityRole="button" accessibilityLabel="Voltar">
          <Feather name="chevron-left" size={26} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>{t('trip.pacotes')}</Text>
          <Text style={styles.sub}>{t('pacotes.sub')}</Text>
        </View>
      </View>

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

      {cidades.length > 1 && (
        <View style={styles.chips}>
          {[null, ...cidades].map((c) => {
            const ativo = cidade === c;
            return (
              <TouchableOpacity key={c ?? 'todos'} style={[styles.chip, ativo && styles.chipAtivo]} onPress={() => setCidade(c)} accessibilityRole="button" accessibilityState={{ selected: ativo }}>
                <Text style={[styles.chipTxt, ativo && { color: '#FFF' }]}>{c ?? t('pacotes.todos')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

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
                  {t('pacotes.por')} {[item.locais?.nome, item.locais?.cidade].filter(Boolean).join(' · ')}
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
  topo: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8, paddingTop: 8, gap: 4 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 4 },
  sub: { fontSize: 12, lineHeight: 17, color: C.dim, marginTop: 2, paddingRight: 12 },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 46 },
  buscaInput: { flex: 1, color: C.text, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingVertical: 8, paddingHorizontal: 14 },
  chipAtivo: { backgroundColor: C.pink, borderColor: C.pink },
  chipTxt: { color: C.dim, fontSize: 13, fontWeight: '700' },
  vazio: { color: C.dim, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  card: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  foto: { width: 110, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  corpo: { flex: 1, padding: 12, gap: 3 },
  nome: { color: C.text, fontSize: 15, fontWeight: '800' },
  desc: { color: C.dim, fontSize: 12, lineHeight: 17 },
  agencia: { color: '#B39DDB', fontSize: 12, fontWeight: '600', marginTop: 2 },
  preco: { color: C.pink, fontSize: 13, fontWeight: '800', marginTop: 2 },
});
