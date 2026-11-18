// Modo equipe · Banners: todos os banners do app, filtrados por lugar e situação. "Novo banner" abre o editor.
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BannerLinha from '../../../components/adm/BannerLinha';
import TelaAdm, { CA, sa } from '../../../components/adm/TelaAdm';
import { BannerAdm, LUGARES, situacaoBanner } from '../../../lib/admin';
import { supabase } from '../../../lib/supabase';

const FILTROS = ['Todos', 'No ar', 'Home', 'Trip', 'Categorias', 'Agendados', 'Desligados'] as const;

export default function BannersAdm() {
  const router = useRouter();
  const [lista, setLista] = useState<BannerAdm[] | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('Todos');
  const [busca, setBusca] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('banners_app').select('*').order('updated_at', { ascending: false });
    setLista((data as BannerAdm[]) || []);
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const grupo = (b: BannerAdm, g: string) => (b.telas || []).some((t) => LUGARES.find((l) => l.tela === t)?.grupo === g);
  const visiveis = (lista || []).filter((b) => {
    const sit = situacaoBanner(b).txt;
    if (busca.trim() && !`${b.titulo} ${b.tag} ${b.chave || ''}`.toLowerCase().includes(busca.trim().toLowerCase())) return false;
    switch (filtro) {
      case 'No ar': return sit === 'No ar';
      case 'Agendados': return sit === 'Agendado';
      case 'Desligados': return sit === 'Desligado' || sit === 'Vencido';
      case 'Home': case 'Trip': case 'Categorias': return grupo(b, filtro);
      default: return true;
    }
  });

  return (
    <TelaAdm titulo="Banners" subtitulo="Crie e troque banners: aparece no app na hora, sem passar pela Apple." atualizando={atualizando}
      aoAtualizar={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }}>
      <TouchableOpacity style={sa.botao} onPress={() => router.push('/adm/banner-editar' as any)} accessibilityRole="button">
        <Feather name="plus" size={16} color="#FFF" /><Text style={sa.botaoTxt}>Novo banner</Text>
      </TouchableOpacity>
      <TextInput style={[sa.campoBusca, { marginTop: 12 }]} value={busca} onChangeText={setBusca} placeholder="Buscar banner" placeholderTextColor={CA.fraco} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
        {FILTROS.map((f) => (
          <TouchableOpacity key={f} style={[e.chip, filtro === f && e.chipOn]} onPress={() => setFiltro(f)} accessibilityRole="button">
            <Text style={[e.chipTxt, filtro === f && { color: '#FFF' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {lista === null ? <ActivityIndicator color={CA.rosa} /> : visiveis.length === 0 ? <Text style={sa.vazio}>Nenhum banner neste filtro.</Text> : (
        <View style={sa.lista}>{visiveis.map((b, i) => <BannerLinha key={b.id} b={b} ultimo={i === visiveis.length - 1} />)}</View>
      )}
    </TelaAdm>
  );
}

const e = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: CA.rosa, borderColor: CA.rosa },
  chipTxt: { color: CA.dim, fontSize: 12.5, fontWeight: '700' },
});
