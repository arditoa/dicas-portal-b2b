// Migração 142 — Mapa de serviços LGBT+: denúncia, centros de referência, saúde/PrEP, Defensoria, acolhimento, ONGs,
// apoio jurídico e emocional. Canais nacionais + os da cidade escolhida. Funciona sem conta.
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TopoApp from '../components/TopoApp';
import { TituloTela } from '../components/CabecalhoTela';
import { TIPOS_SERVICO } from '../lib/acolhimento';
import { supabase } from '../lib/supabase';

type Servico = { id: string; tipo: string; nome: string; descricao: string | null; cidade: string | null; uf: string | null; endereco: string | null;
  telefone: string | null; whatsapp: string | null; site: string | null; horario: string | null; gratuito: boolean; conferido_em: string | null };

export default function Servicos() {
  const [cidades, setCidades] = useState<{ cidade: string; uf: string | null }[]>([]);
  const [cidade, setCidade] = useState<string | null>(null);
  const [lista, setLista] = useState<Servico[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase.rpc('cidades_com_servicos').then(({ data }) => setCidades((data as { cidade: string; uf: string | null }[]) || []), () => {});
  }, []);
  const carregar = useCallback(async () => {
    setLista(null);
    const { data, error } = await supabase.rpc('servicos_da_cidade', { p_cidade: cidade });
    if (error) { setErro('O mapa de serviços ainda não está ligado.'); setLista([]); } else { setErro(''); setLista((data as Servico[]) || []); }
  }, [cidade]);
  useEffect(() => { void carregar(); }, [carregar]);

  const tipos = Array.from(new Set((lista || []).map((s) => s.tipo)));
  return (
    <View style={s.tela}>
      <TopoApp voltar />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View style={{ marginBottom: 12 }}><TituloTela titulo="Serviços LGBT+" subtitulo="Ajuda, saúde e acolhimento, conferidos pela equipe Dicas." discreto semMargem /></View>
        {cidades.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {[{ cidade: null as string | null, uf: null }, ...cidades].map((c) => (
              <TouchableOpacity key={c.cidade || 'br'} style={[s.filtro, cidade === c.cidade && s.filtroOn]} onPress={() => setCidade(c.cidade)}>
                <Text style={[s.filtroTxt, cidade === c.cidade && { color: '#0B0A10' }]}>{c.cidade ? `${c.cidade}${c.uf ? ` · ${c.uf}` : ''}` : 'Brasil'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {!!erro && <Text style={s.lead}>{erro}</Text>}
        {lista === null ? <ActivityIndicator color="#E1306C" style={{ marginTop: 24 }} /> : tipos.map((t) => (
          <View key={t} style={{ marginBottom: 8 }}>
            <View style={s.secao}><Feather name={(TIPOS_SERVICO[t]?.icone || 'circle') as any} size={14} color="#C4B5FD" /><Text style={s.secaoTxt}>{TIPOS_SERVICO[t]?.rotulo || t}</Text></View>
            {(lista || []).filter((x) => x.tipo === t).map((x) => (
              <View key={x.id} style={s.card}>
                <Text style={s.nome}>{x.nome}</Text>
                {!!x.descricao && <Text style={s.sub}>{x.descricao}</Text>}
                <Text style={s.info}>{[x.cidade ? `${x.cidade}${x.uf ? ` - ${x.uf}` : ''}` : 'Todo o Brasil', x.horario, x.gratuito ? 'Gratuito' : null].filter(Boolean).join(' · ')}</Text>
                {!!x.endereco && <Text style={s.info}>{x.endereco}</Text>}
                <View style={s.botoes}>
                  {!!x.telefone && <TouchableOpacity style={s.botao} onPress={() => Linking.openURL(`tel:${x.telefone!.replace(/\D/g, '')}`)}><Feather name="phone" size={13} color="#FFF" /><Text style={s.botaoTxt}>{x.telefone}</Text></TouchableOpacity>}
                  {!!x.whatsapp && <TouchableOpacity style={[s.botao, { backgroundColor: '#25D366' }]} onPress={() => Linking.openURL(`https://wa.me/${x.whatsapp!.replace(/\D/g, '')}`)}><Text style={s.botaoTxt}>WhatsApp</Text></TouchableOpacity>}
                  {!!x.endereco && <TouchableOpacity style={s.botaoSec} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(`${x.nome} ${x.endereco} ${x.cidade || ''}`)}`)}><Text style={s.botaoTxt}>Mapa</Text></TouchableOpacity>}
                  {!!x.site && <TouchableOpacity style={s.botaoSec} onPress={() => Linking.openURL(x.site!)}><Text style={s.botaoTxt}>Site</Text></TouchableOpacity>}
                </View>
              </View>
            ))}
          </View>
        ))}
        <Text style={s.nota}>Em perigo agora? Ligue 190. Conhece um serviço que não está aqui? Fale com a gente em Conta › Ajuda.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0A10' },
  titulo: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  lead: { color: '#A0A0B2', fontSize: 13.5, lineHeight: 19, marginTop: 4, marginBottom: 14 },
  filtro: { borderWidth: 1, borderColor: '#2A2840', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  filtroOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
  filtroTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  secao: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 8 },
  secaoTxt: { color: '#C4B5FD', fontSize: 12.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#161520', borderWidth: 1, borderColor: '#232230', borderRadius: 14, padding: 14, marginBottom: 8 },
  nome: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  sub: { color: '#D6D3E0', fontSize: 13, lineHeight: 18, marginTop: 4 },
  info: { color: '#8E8BA3', fontSize: 12, marginTop: 4 },
  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  botao: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E1306C', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  botaoSec: { borderWidth: 1, borderColor: '#2A2840', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  botaoTxt: { color: '#FFF', fontSize: 12.5, fontWeight: '800' },
  nota: { color: '#626274', fontSize: 12, lineHeight: 17, marginTop: 16 },
});
