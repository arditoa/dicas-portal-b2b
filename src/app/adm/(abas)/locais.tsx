// Modo equipe · Locais: buscar uma casa e abrir a ficha (onde aparece, plano, caixas da Home).
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TelaAdm, { CA, sa } from '../../../components/adm/TelaAdm';
import { PLANOS } from '../../../lib/admin';
import { CATEGORIA_REAL_LABEL } from '../../../lib/categorias';
import { supabase } from '../../../lib/supabase';

type Casa = { id: string; nome: string; categoria: string; bairro: string | null; cidade: string | null; status: string; plano_comercial: string | null; plano_comercial_status: string | null; foto_capa_url: string | null; logo_url?: string | null };
const FILTROS = [{ valor: '', rotulo: 'Todas' }, ...PLANOS, { valor: 'interesse', rotulo: 'Querem plano pago' }, { valor: 'pendente', rotulo: 'Em análise' }];
const NOME_PLANO: Record<string, string> = Object.fromEntries(PLANOS.map((p) => [p.valor, p.rotulo]));

export default function LocaisAdm() {
  const router = useRouter();
  const { plano } = useLocalSearchParams<{ plano?: string }>();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState(plano || '');
  const [lista, setLista] = useState<Casa[] | null>(null);
  useEffect(() => { if (plano !== undefined) setFiltro(plano); }, [plano]);

  useEffect(() => {
    const t = setTimeout(async () => {
      let q = supabase.from('locais').select('id, nome, categoria, bairro, cidade, status, plano_comercial, plano_comercial_status, foto_capa_url, logo_url').order('nome').limit(80);
      if (busca.trim().length >= 2) q = q.ilike('nome', `%${busca.trim()}%`);
      if (filtro === 'interesse') q = q.in('plano_comercial_status', ['interesse', 'aguardando_pagamento']);
      else if (filtro === 'pendente') q = q.eq('status', 'pendente');
      else if (filtro) q = q.eq('plano_comercial', filtro).eq('status', 'aprovado');
      const { data } = await q;
      setLista((data as Casa[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [busca, filtro]);

  return (
    <TelaAdm titulo="Locais" subtitulo="Busque uma casa para ver onde ela aparece e mudar plano e caixas.">
      <TextInput style={sa.campoBusca} value={busca} onChangeText={setBusca} placeholder="Nome da casa" placeholderTextColor={CA.fraco} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
        {FILTROS.map((f) => (
          <TouchableOpacity key={f.valor} style={[e.chip, filtro === f.valor && e.chipOn]} onPress={() => setFiltro(f.valor)} accessibilityRole="button">
            <Text style={[e.chipTxt, filtro === f.valor && { color: '#FFF' }]}>{f.rotulo}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {lista === null ? <ActivityIndicator color={CA.rosa} /> : lista.length === 0 ? <Text style={sa.vazio}>Nenhuma casa encontrada.</Text> : (
        <View style={sa.lista}>
          {lista.map((c, i) => (
            <TouchableOpacity key={c.id} style={[sa.linha, i < lista.length - 1 && sa.borda]} onPress={() => router.push(`/adm/local/${c.id}` as any)} accessibilityRole="button">
              {c.logo_url || c.foto_capa_url ? <Image source={{ uri: (c.logo_url || c.foto_capa_url) as string }} style={[e.foto, !!c.logo_url && { backgroundColor: '#FFF' }]} resizeMode={c.logo_url ? 'contain' : 'cover'} /> : <View style={[e.foto, { alignItems: 'center', justifyContent: 'center' }]}><Feather name="map-pin" size={14} color={CA.fraco} /></View>}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={sa.tit} numberOfLines={1}>{c.nome}</Text>
                <Text style={sa.sub} numberOfLines={1}>{CATEGORIA_REAL_LABEL[c.categoria] || c.categoria} · {c.bairro || c.cidade || ''}</Text>
              </View>
              <View style={[sa.selo, { backgroundColor: c.status !== 'aprovado' ? '#F2C94C22' : '#9B3CFF22' }]}>
                <Text style={[sa.seloTxt, { color: c.status !== 'aprovado' ? CA.amarelo : '#C9A7FF' }]}>{c.status !== 'aprovado' ? c.status : NOME_PLANO[c.plano_comercial || 'freemium'] || c.plano_comercial}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TelaAdm>
  );
}

const e = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: CA.borda, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: CA.rosa, borderColor: CA.rosa },
  chipTxt: { color: CA.dim, fontSize: 12.5, fontWeight: '700' },
  foto: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1B1A26' },
});
