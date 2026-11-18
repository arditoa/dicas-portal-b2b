// Na página da casa: a ação de marca que está no ar AQUI ("Prove grátis · Apoio <marca>").
// Aparece quando a ação é desta casa (migração 128: local_ids) ou quando um cupom/festa da casa faz parte dela.
// Mostra o brinde, quanto ainda resta ("Restam 37"), o "Estou aqui" (ganhar o brinde) e/ou a foto com a moldura,
// conforme a marca escolheu (participacao). Só ações liberadas pela equipe Dicas aparecem.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/authContext';
import { buscarMarcasAtivas, corDaMarca, textoRestam, useMarcasAtivas } from '../lib/marcas';
import FotoComMoldura from './FotoComMoldura';
import PresencaMarca from './PresencaMarca';

export default function AcaoNaCasa({ cupomIds, festaIds = [], localId }: { cupomIds: string[]; festaIds?: string[]; localId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const marcas = useMarcasAtivas();
  const a = marcas.find((m) =>
    (!!localId && (m.local_ids || []).includes(localId)) ||
    m.cupom_ids.some((id) => cupomIds.includes(id)) || m.festa_ids.some((id) => festaIds.includes(id)));
  if (!a) return null;

  const modo = a.participacao || 'ambos';
  const temCheckin = !!localId && (modo === 'checkin' || modo === 'ambos');
  const temFoto = modo === 'foto' || modo === 'ambos';
  const cor = corDaMarca(a);
  const fim = a.fim.split('-').reverse().slice(0, 2).join('/');
  const restam = textoRestam(a);
  const linha = [`Até ${fim}`, a.regra].filter(Boolean).join(' · ');
  const foto = user && temFoto ? (
    <FotoComMoldura acaoId={a.id} marca={a.marca} nome={a.nome} cor={cor} logoUrl={a.logo_url} molduraUrl={a.moldura_url} molduraTexto={a.moldura_texto}
      textoBotao={temCheckin ? 'Foto' : 'Foto com a moldura'} estiloBotao={s.botaoMenor} />
  ) : null;

  return (
    <View style={[s.card, { borderColor: `${cor}44` }]}>
      <TouchableOpacity style={s.topo} onPress={() => router.push(`/marca/${a.id}` as any)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Prove grátis, ${a.marca}. Ver a ação`}>
        <View style={[s.logo, { backgroundColor: `${cor}22` }]}>
          {a.logo_url ? <Image source={{ uri: a.logo_url }} style={s.logoImg} resizeMode="contain" /> : <Feather name="gift" size={18} color={cor} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.tag, { color: cor }]}>PROVE GRÁTIS · {a.marca.toUpperCase()}</Text>
          <Text style={s.titulo} numberOfLines={2}>{a.brinde || a.chamada || a.nome}</Text>
          <Text style={s.sub} numberOfLines={2}>{linha}</Text>
        </View>
        {!!restam && (
          <View style={[s.restam, { backgroundColor: `${cor}22` }]}>
            <Text style={[s.restamTxt, { color: cor }]}>{restam}</Text>
          </View>
        )}
      </TouchableOpacity>
      {temCheckin && localId ? (
        <PresencaMarca acao={a} localId={localId} cor={cor} foto={foto} aoGanhar={() => void buscarMarcasAtivas(true)} />
      ) : (
        foto && <View style={s.linha}>{foto}</View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#161520', borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 30, height: 30 },
  tag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  titulo: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginTop: 1 },
  sub: { color: '#A0A0B2', fontSize: 11.5, marginTop: 1 },
  restam: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  restamTxt: { fontSize: 11.5, fontWeight: '900' },
  linha: { flexDirection: 'row', gap: 8, marginTop: 10 },
  botaoMenor: { flex: 1, minHeight: 38, marginTop: 0, gap: 6 },
});
