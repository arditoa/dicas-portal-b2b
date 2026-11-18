// Modo parceiro — Fotos da galera (Fidelizar › Fotos da galera). Migração 122.
// Fotos que clientes tiraram na casa e ENVIARAM para vocês. Cada uma mostra o que foi autorizado e quando:
//   • "Só para ver": uso interno (não publicar);
//   • "Pode publicar": a pessoa autorizou publicar nas redes da casa e confirmou que todos na foto concordam.
// Se a pessoa retirar a autorização ou apagar, a foto some daqui. Premium e Fundador.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { CP, ESP, RAIO, TelaParceiro } from '../../components/parceiro/TelaParceiro';
import { compartilharFoto, dataHora, fotosDaCasa, Memoria } from '../../lib/memorias';
import { useModoParceiro } from '../../lib/modoParceiro';
import { falarComEquipe, nivelDoPlano } from '../../lib/parceiroMenu';
import { supabase } from '../../lib/supabase';

export default function FotosDaGalera() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const { width } = useWindowDimensions();
  const localId = localAtivo?.local_id || '';
  const liberado = pode('resultados') || pode('banner');
  const premium = !!localAtivo && nivelDoPlano(localAtivo.plano_comercial) === 'premium';
  const [lista, setLista] = useState<Memoria[] | null>(null);
  const [aberta, setAberta] = useState<Memoria | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'publicar'>('todas');
  const lado = Math.floor((width - 32 - 8) / 3);

  const carregar = useCallback(async () => {
    if (!localId || !premium || !liberado) return;
    setLista(await fotosDaCasa(localId));
  }, [localId, premium, liberado]);
  useEffect(() => { void carregar(); }, [carregar]);

  const Voltar = (
    <TouchableOpacity style={a.voltar} onPress={() => router.back()} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
  );

  if (!localAtivo || !liberado) {
    return <TelaParceiro titulo="Fotos da galera">{Voltar}<Text style={a.aviso}>Seu acesso não inclui as fotos desta casa.</Text></TelaParceiro>;
  }
  if (!premium) {
    return (
      <TelaParceiro titulo="Fotos da galera" subtitulo="Fotos que os clientes tiram na sua casa e enviam para vocês.">
        {Voltar}
        <View style={a.trava}>
          <View style={a.travaIcone}><Feather name="lock" size={18} color="#FFF" /></View>
          <Text style={a.travaTitulo}>Fotos da galera nos planos Premium e Fundador</Text>
          <Text style={a.travaTxt}>O cliente tira a foto na página da sua casa, guarda em Minhas memórias e pode enviar para vocês, inclusive autorizando publicar nas redes da casa. Tudo com autorização registrada.</Text>
          <TouchableOpacity style={a.travaBtn} onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e quero receber as fotos da galera no app.`)} accessibilityRole="button">
            <Feather name="message-circle" size={16} color="#FFF" /><Text style={a.travaBtnTxt}>Falar com a equipe</Text>
          </TouchableOpacity>
        </View>
      </TelaParceiro>
    );
  }

  const visiveis = (lista || []).filter((m) => filtro === 'todas' || m.casa_pode_publicar);
  const ocultar = (m: Memoria) =>
    Alert.alert('Tirar da sua lista?', 'A foto continua com o cliente; só sai daqui.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('casa_ocultar_memoria', { p_memoria: m.id });
        if (error) return Alert.alert('Fotos', error.message);
        setAberta(null); void carregar();
      } },
    ]);

  return (
    <TelaParceiro titulo="Fotos da galera" subtitulo="Enviadas pelos clientes, com a autorização de cada uma." aoAtualizar={() => void carregar()}>
      {Voltar}
      <View style={a.filtros}>
        {(['todas', 'publicar'] as const).map((f) => (
          <TouchableOpacity key={f} style={[a.filtro, filtro === f && a.filtroOn]} onPress={() => setFiltro(f)} accessibilityRole="button" accessibilityState={{ selected: filtro === f }}>
            <Text style={[a.filtroTxt, filtro === f && { color: '#FFF' }]}>{f === 'todas' ? 'Todas' : 'Podem ser publicadas'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {lista === null ? <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} /> : visiveis.length === 0 ? (
        <Text style={a.vazio}>{filtro === 'todas' ? 'Nenhuma foto enviada ainda. O cliente tira em "Foto da galera", na página da sua casa.' : 'Nenhuma foto com autorização para publicar.'}</Text>
      ) : (
        <View style={a.grade}>
          {visiveis.map((m) => (
            <TouchableOpacity key={m.id} onPress={() => setAberta(m)} activeOpacity={0.85} accessibilityRole="button">
              {m.url ? <Image source={{ uri: m.url }} style={{ width: lado, height: lado * 1.25, borderRadius: 10, backgroundColor: '#222' }} /> : <View style={{ width: lado, height: lado * 1.25, borderRadius: 10, backgroundColor: '#222' }} />}
              <View style={[a.selo, { backgroundColor: m.casa_pode_publicar ? '#2E7D53' : 'rgba(0,0,0,0.65)' }]}>
                <Text style={a.seloTxt}>{m.casa_pode_publicar ? 'Pode publicar' : 'Só para ver'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={a.nota}>Publique só as fotos marcadas "Pode publicar" e dê o crédito ao Dicas LGBT+. Se o cliente retirar a autorização, a foto some daqui; se ela já estiver publicada, retire das redes quando ele pedir.</Text>

      <Modal visible={!!aberta} transparent animationType="slide" onRequestClose={() => setAberta(null)}>
        <Pressable style={a.veu} onPress={() => setAberta(null)}>
          <Pressable style={a.folha} onPress={() => {}}>
            {aberta && (
              <>
                {aberta.url && <Image source={{ uri: aberta.url }} style={a.grande} />}
                {!!aberta.legenda && <Text style={a.legenda}>"{aberta.legenda}"</Text>}
                <View style={a.autorizacao}>
                  <Text style={a.autTit}>{aberta.casa_pode_publicar ? 'Pode publicar' : 'Só para ver (uso interno)'}</Text>
                  <Text style={a.autTxt}>Enviada em {dataHora(aberta.enviado_em)}</Text>
                  {aberta.casa_pode_publicar && <Text style={a.autTxt}>Publicação autorizada em {dataHora(aberta.publicar_em)} · todos na foto concordam (confirmado pelo cliente)</Text>}
                  <Text style={a.autTxt}>Disponível até {new Date(aberta.expira_em).toLocaleDateString('pt-BR')}</Text>
                </View>
                <View style={a.botoes}>
                  <TouchableOpacity style={a.btnPri} onPress={() => aberta.url && compartilharFoto(aberta.url, aberta.casa_pode_publicar ? 'publicar' : 'interno').catch((e) => Alert.alert('Baixar', e?.message || 'Não deu agora.'))} accessibilityRole="button">
                    <Feather name="download" size={15} color="#FFF" /><Text style={a.btnPriTxt}>{aberta.casa_pode_publicar ? 'Baixar para publicar' : 'Baixar'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={a.btnSec} onPress={() => ocultar(aberta)} accessibilityRole="button">
                    <Text style={a.btnSecTxt}>Tirar da lista</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </TelaParceiro>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  trava: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.l, marginTop: ESP.l, gap: ESP.s },
  travaIcone: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3A3950', alignItems: 'center', justifyContent: 'center' },
  travaTitulo: { color: CP.texto, fontSize: 16, fontWeight: '800' },
  travaTxt: { color: CP.dim, fontSize: 13, lineHeight: 19 },
  travaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CP.rosa, borderRadius: RAIO.s, minHeight: 48, marginTop: ESP.s },
  travaBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  filtros: { flexDirection: 'row', gap: ESP.s, marginVertical: ESP.s },
  filtro: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, borderColor: CP.borda, justifyContent: 'center' },
  filtroOn: { backgroundColor: '#2A2938', borderColor: '#2A2938' },
  filtroTxt: { color: CP.dim, fontSize: 13, fontWeight: '700' },
  vazio: { color: CP.fraco, fontSize: 13, marginTop: ESP.l, lineHeight: 19 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  selo: { position: 'absolute', left: 6, bottom: 6, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  seloTxt: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  nota: { color: CP.fraco, fontSize: 11.5, lineHeight: 16, marginTop: ESP.l },
  veu: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  folha: { backgroundColor: '#14131C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: ESP.l, borderColor: CP.borda, borderWidth: 1 },
  grande: { width: '100%', aspectRatio: 4 / 5, borderRadius: 14, backgroundColor: '#222', maxHeight: 380, alignSelf: 'center' },
  legenda: { color: '#D6D3E0', fontSize: 13, marginTop: ESP.s },
  autorizacao: { backgroundColor: CP.card, borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m, gap: 3 },
  autTit: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  autTxt: { color: CP.dim, fontSize: 12, lineHeight: 17 },
  botoes: { flexDirection: 'row', gap: ESP.s, marginTop: ESP.m },
  btnPri: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 23, backgroundColor: CP.rosa },
  btnPriTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  btnSec: { paddingHorizontal: 16, height: 46, borderRadius: 23, borderWidth: 1, borderColor: CP.borda, alignItems: 'center', justifyContent: 'center' },
  btnSecTxt: { color: CP.dim, fontSize: 13, fontWeight: '700' },
});
