// Modo equipe · Roteiros de um destino da Dicas Trip (18/11): lista, criar e abrir para editar (paradas incluídas).
//   ?destino=<slug>&cidade=<nome>&uf=<UF>. Tabelas roteiros / roteiro_paradas (migração 039).
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../components/adm/TelaAdm';
import { supabase } from '../../lib/supabase';
import { normTxt } from '../../lib/subcategorias';

type Linha = { id: string; titulo: string; status: string; ordem: number; roteiro_paradas: { count: number }[] };

export default function RoteirosAdm() {
  const { destino, cidade, uf } = useLocalSearchParams<{ destino: string; cidade?: string; uf?: string }>();
  const router = useRouter();
  const [lista, setLista] = useState<Linha[] | null>(null);
  const nomeCidade = String(cidade || destino || '');

  const carregar = useCallback(async () => {
    const { data, error } = await (supabase.from('roteiros') as any)
      .select('id, titulo, status, ordem, roteiro_paradas(count)')
      .or(`destino_slug.eq.${destino},cidade.eq.${nomeCidade}`)
      .order('ordem');
    if (error) Alert.alert('Roteiros', error.message);
    setLista((data as Linha[]) || []);
  }, [destino, nomeCidade]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const novo = async () => {
    const titulo = `Novo roteiro em ${nomeCidade}`;
    const slug = `${normTxt(nomeCidade).replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const { data, error } = await (supabase.from('roteiros') as any)
      .insert({ slug, titulo, cidade: nomeCidade, uf: uf || null, destino_slug: destino, status: 'rascunho', ordem: (lista?.length || 0) })
      .select('id').single();
    if (error) return Alert.alert('Roteiro', error.message);
    router.push(`/adm/roteiro-editar?id=${(data as any).id}` as any);
  };

  return (
    <TelaAdm titulo={`Roteiros · ${nomeCidade}`} subtitulo="Aparecem na página da cidade, abaixo dos ícones" voltar>
      {lista === null ? <ActivityIndicator color={CA.rosa} /> : (
        <View style={sa.lista}>
          {lista.length === 0 && <Text style={[sa.vazio, { padding: 14 }]}>Nenhum roteiro ainda.</Text>}
          {lista.map((r, i) => (
            <TouchableOpacity key={r.id} style={[sa.linha, i < lista.length - 1 && sa.borda]} onPress={() => router.push(`/adm/roteiro-editar?id=${r.id}` as any)} accessibilityRole="button">
              <Feather name="map" size={16} color={r.status === 'publicado' ? CA.verde : CA.fraco} />
              <View style={{ flex: 1 }}>
                <Text style={sa.tit} numberOfLines={1}>{r.titulo}</Text>
                <Text style={sa.sub}>{r.status === 'publicado' ? 'No ar' : 'Rascunho'} · {r.roteiro_paradas?.[0]?.count ?? 0} paradas</Text>
              </View>
              <Feather name="chevron-right" size={16} color={CA.fraco} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TouchableOpacity style={[sa.botao, { marginTop: 6 }]} onPress={() => void novo()}><Text style={sa.botaoTxt}>+ Novo roteiro</Text></TouchableOpacity>
      <Text style={[sa.vazio, { marginTop: 10 }]}>Fotos e tags completas do roteiro continuam no portal (Admin › Roteiros).</Text>
    </TelaAdm>
  );
}
