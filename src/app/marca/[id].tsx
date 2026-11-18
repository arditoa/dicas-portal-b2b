// Rodada 148 — página de uma ação de marca (migração 118): "Happy hour Skol" com os bares (cupons) e festas participantes.
// Abre pela faixa "Ações da semana", pelo selo "Apoio · <marca>" e pelos banners que apontam para /marca/<id>.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FotoComMoldura from '../../components/FotoComMoldura';
import PresencaMarca from '../../components/PresencaMarca';
import TopoApp from '../../components/TopoApp';
import { useAuth } from '../../lib/authContext';
import { corDaMarca, textoRestam } from '../../lib/marcas';
import { supabase } from '../../lib/supabase';

type Cupom = { id: string; titulo: string; descricao: string | null; local_id: string; local: string; bairro: string | null; cidade: string | null; foto: string | null };
type Festa = { id: string; titulo: string; data_inicio: string; foto: string | null; local: string | null; bairro: string | null };
type Acao = { id: string; marca: string; nome: string; chamada: string | null; cor: string | null; logo_url: string | null; moldura_url?: string | null; moldura_texto?: string | null; participacao?: string | null; inicio: string; fim: string; cupons: Cupom[]; festas: Festa[];
  brinde?: string | null; regra?: string | null; brinde_pergunta?: string | null; brinde_opcoes?: string[] | null;
  feitos?: number | null; restam?: number | null;
  casas?: { local_id: string; local: string; bairro: string | null; cidade: string | null; foto: string | null }[] };

const br = (iso: string) => iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
const quando = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Uma linha por casa (a mesma casa pode ter mais de um cupom na ação).
function porCasa(cupons: Cupom[]) {
  const mapa = new Map<string, Cupom & { titulos: string[] }>();
  for (const c of cupons) {
    const x = mapa.get(c.local_id);
    if (x) x.titulos.push(c.titulo);
    else mapa.set(c.local_id, { ...c, titulos: [c.titulo] });
  }
  return Array.from(mapa.values());
}

export default function PaginaMarca() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [a, setA] = useState<Acao | null | undefined>(undefined);

  useEffect(() => {
    let vivo = true;
    const buscar = () => supabase.rpc('acao_marca_publica', { p_acao: id }).then(({ data, error }) => {
      if (!vivo) return;
      if (error || !data) return setA(null);
      const x = data as Acao;
      // Festa que já passou, ou de antes do início da ação, não aparece.
      const inicio = new Date(`${x.inicio}T00:00:00-03:00`).getTime();
      x.festas = (x.festas || []).filter((f) => { const t = new Date(f.data_inicio).getTime(); return t >= inicio && t + 12 * 3600e3 > Date.now(); });
      setA(x);
    }, () => { if (vivo) setA(null); });
    void buscar();
    // "Restam 37" acompanha quem vai ganhando.
    const t = setInterval(() => { void buscar(); }, 30 * 1000);
    return () => { vivo = false; clearInterval(t); };
  }, [id]);

  const cor = corDaMarca(a ? ({ cor: a.cor } as any) : null);

  return (
    <View style={s.tela}>
      <TopoApp voltar />
      {a === undefined ? (
        <ActivityIndicator color="#E1306C" style={{ marginTop: 40 }} />
      ) : a === null ? (
        <View style={s.vazio}>
          <Feather name="calendar" size={26} color="#626274" />
          <Text style={s.vazioTxt}>Esta ação de marca já terminou ou não está mais no ar.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          <View style={[s.topo, { borderColor: `${cor}55` }]}>
            <View style={s.topoLinha}>
              <View style={[s.logo, { backgroundColor: `${cor}22` }]}>
                {a.logo_url ? <Image source={{ uri: a.logo_url }} style={s.logoImg} resizeMode="contain" /> : <Text style={[s.inicial, { color: cor }]}>{a.marca.slice(0, 1).toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.apoio, { color: cor }]}>PROVE GRÁTIS · AÇÃO DA SEMANA</Text>
                <Text style={s.marca}>{a.marca}</Text>
              </View>
            </View>
            <Text style={s.nome}>{a.brinde || a.nome}</Text>
            {!!a.chamada && a.chamada.trim() !== (a.brinde || a.nome).trim() && <Text style={s.chamada}>{a.chamada}</Text>}
            <View style={s.infoLinha}>
              <Text style={s.periodo}>De {br(a.inicio)} a {br(a.fim)}{a.regra ? ` · ${a.regra}` : ''}</Text>
              {!!textoRestam(a) && <View style={[s.restam, { backgroundColor: `${cor}22` }]}><Text style={[s.restamTxt, { color: cor }]}>{textoRestam(a)}</Text></View>}
            </View>
            {/* Uma casa só: dá para ganhar daqui mesmo. Várias: escolha a casa em "Onde aproveitar". */}
            {(a.participacao || 'ambos') !== 'foto' && (a.casas || []).length === 1 ? (
              <PresencaMarca acao={a} localId={a.casas![0].local_id} cor={cor}
                foto={!!user && a.participacao !== 'checkin' ? <FotoComMoldura acaoId={a.id} marca={a.marca} nome={a.nome} cor={cor} logoUrl={a.logo_url} molduraUrl={a.moldura_url} molduraTexto={a.moldura_texto} textoBotao="Foto" estiloBotao={s.botaoMenor} /> : null} />
            ) : (
              !!user && a.participacao !== 'checkin' && <FotoComMoldura acaoId={a.id} marca={a.marca} nome={a.nome} cor={cor} logoUrl={a.logo_url} molduraUrl={a.moldura_url} molduraTexto={a.moldura_texto} />
            )}
          </View>

          {(a.casas || []).length > 0 && (
            <>
              <Text style={s.secao}>ONDE APROVEITAR</Text>
              <View style={s.lista}>
                {a.casas!.map((c, i, arr) => (
                  <TouchableOpacity key={c.local_id} style={[s.linha, i < arr.length - 1 && s.borda]} activeOpacity={0.7} onPress={() => router.push(`/business/${c.local_id}` as any)} accessibilityRole="button">
                    <View style={s.thumb}>
                      {c.foto ? <Image source={{ uri: c.foto }} style={s.thumbImg} /> : <Feather name="map-pin" size={18} color={cor} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.linhaTitulo} numberOfLines={1}>{c.local}</Text>
                      <Text style={s.linhaSub} numberOfLines={1}>{[c.bairro, c.cidade].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#8E8BA3" />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.dica}>Chegou na casa? Toque em "Estou aqui" e mostre a tela no balcão. Um por pessoa.</Text>
            </>
          )}

          {!(a.casas || []).length && a.cupons.length > 0 && (
            <>
              <Text style={s.secao}>ONDE APROVEITAR</Text>
              <View style={s.lista}>
                {porCasa(a.cupons).map((c, i, arr) => (
                  <TouchableOpacity key={c.local_id} style={[s.linha, i < arr.length - 1 && s.borda]} activeOpacity={0.7} onPress={() => router.push(`/business/${c.local_id}` as any)} accessibilityRole="button">
                    <View style={s.thumb}>
                      {c.foto ? <Image source={{ uri: c.foto }} style={s.thumbImg} /> : <Feather name="tag" size={18} color={cor} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.linhaTitulo} numberOfLines={1}>{c.local}</Text>
                      <Text style={[s.cupom, { color: cor }]} numberOfLines={2}>{c.titulos.join(' · ')}</Text>
                      <Text style={s.linhaSub} numberOfLines={1}>{[c.bairro, c.cidade].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#8E8BA3" />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.dica}>Faça check-in na casa e use o cupom na hora. Cada pessoa tem o seu código.</Text>
            </>
          )}

          {a.festas.length > 0 && (
            <>
              <Text style={s.secao}>FESTAS</Text>
              <View style={s.lista}>
                {a.festas.map((f, i) => (
                  <TouchableOpacity key={f.id} style={[s.linha, i < a.festas.length - 1 && s.borda]} activeOpacity={0.7} onPress={() => router.push(`/evento/${f.id}` as any)} accessibilityRole="button">
                    <View style={s.thumb}>
                      {f.foto ? <Image source={{ uri: f.foto }} style={s.thumbImg} /> : <Feather name="music" size={18} color={cor} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.cupom, { color: '#FF6FA0' }]}>{quando(f.data_inicio)}</Text>
                      <Text style={s.linhaTitulo} numberOfLines={1}>{f.titulo}</Text>
                      <Text style={s.linhaSub} numberOfLines={1}>{[f.local, f.bairro].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#8E8BA3" />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {a.cupons.length === 0 && a.festas.length === 0 && !(a.casas || []).length && (
            <Text style={s.dica}>Em breve as casas e festas desta ação aparecem aqui.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#0B0A10' },
  vazio: { alignItems: 'center', gap: 10, padding: 40 },
  vazioTxt: { color: '#A0A0B2', fontSize: 14, textAlign: 'center' },
  topo: { backgroundColor: '#161520', borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 8 },
  infoLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  restam: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  restamTxt: { fontSize: 12, fontWeight: '900' },
  botaoMenor: { flex: 1, minHeight: 38, marginTop: 0, gap: 6 },
  topoLinha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 44, height: 44 },
  inicial: { fontSize: 22, fontWeight: '900' },
  apoio: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  marca: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  nome: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 14 },
  chamada: { color: '#D6D3E0', fontSize: 14, lineHeight: 20, marginTop: 4 },
  periodo: { color: '#A0A0B2', fontSize: 12, marginTop: 8 },
  secao: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: '#B9B6CC', marginTop: 24, marginBottom: 10, marginLeft: 4 },
  lista: { backgroundColor: '#161520', borderColor: '#232230', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  borda: { borderBottomWidth: 1, borderBottomColor: '#232230' },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#232230', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: 52, height: 52 },
  linhaTitulo: { color: '#F5F5F7', fontSize: 14, fontWeight: '800' },
  cupom: { fontSize: 12.5, fontWeight: '800', marginTop: 1 },
  linhaSub: { color: '#A0A0B2', fontSize: 12, marginTop: 1 },
  dica: { color: '#8E8BA3', fontSize: 12, marginTop: 8, marginLeft: 4, lineHeight: 17 },
});
