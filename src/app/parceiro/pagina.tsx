// Tela 8 do Modo parceiro — Minha página (Meu espaço › Minha página). Só o dono.
// Em seções curtas: cada linha abre o editor só daquela parte (pagina-editar?secao=…) e diz o que falta,
// com a mesma regra do lembrete "Complete a página" do portal. Status, selo e destaque só aparecem (são do admin).
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../lib/modoParceiro';
import { obterPagina, oQueFalta, Pagina, Secao } from '../../lib/parceiro/pagina';
import { falarComEquipe, IconeFeather } from '../../lib/parceiroMenu';

const SECOES: { secao: Secao; titulo: string; sub: string; icone: IconeFeather }[] = [
  { secao: 'fotos', titulo: 'Fotos e vídeo', sub: 'Capa, logo, galeria e vídeo', icone: 'image' },
  { secao: 'sobre', titulo: 'Sobre a casa', sub: 'Nome, descrição, relação LGBT+ e público', icone: 'file-text' },
  { secao: 'horarios', titulo: 'Horários', sub: 'Dias, abre e fecha, música ao vivo', icone: 'clock' },
  { secao: 'contato', titulo: 'Contato', sub: 'Instagram, WhatsApp e e-mail', icone: 'phone' },
  { secao: 'endereco', titulo: 'Endereço e mapa', sub: 'Endereço, bairro, cidade e ponto no mapa', icone: 'map-pin' },
];
const STATUS: Record<string, { txt: string; cor: string }> = {
  aprovado: { txt: 'Aprovada e no ar', cor: '#4CAF7D' },
  pendente: { txt: 'Em análise pela equipe Dicas (até 48h)', cor: '#E1A93A' },
  rejeitado: { txt: 'Não aprovada: fale com a equipe', cor: '#FF7A7A' },
  suspenso: { txt: 'Suspensa: fale com a equipe', cor: '#FF7A7A' },
};

export default function MinhaPagina() {
  const router = useRouter();
  const { localAtivo } = useModoParceiro();
  const dono = localAtivo?.papel === 'dono';
  const [p, setP] = useState<Pagina | null>(null);
  const [erro, setErro] = useState('');

  useFocusEffect(useCallback(() => {
    if (!localAtivo || !dono) return;
    obterPagina(localAtivo.local_id).then(setP).catch((e) => setErro(e?.message || 'Não deu para abrir a página.'));
  }, [localAtivo, dono]));

  if (!localAtivo || !dono) {
    return (
      <TelaParceiro titulo="Minha página">
        <Text style={a.aviso}>Só o dono do local mexe na página da casa.</Text>
        <TouchableOpacity style={a.voltar} onPress={() => router.back()}><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      </TelaParceiro>
    );
  }

  const falta = p ? oQueFalta(p) : [];
  const st = p ? STATUS[p.status] : null;

  return (
    <TelaParceiro titulo="Minha página" subtitulo="É assim que a casa aparece para o público no app.">
      <TouchableOpacity style={a.voltar} onPress={() => router.back()} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>
      {!!erro && <Text style={a.erro}>{erro}</Text>}
      {!p ? (
        <ActivityIndicator color={CP.rosa} style={{ marginTop: ESP.xl }} />
      ) : (
        <>
          {st && (
            <View style={[a.status, { borderColor: st.cor + '66' }]}>
              <View style={[a.ponto, { backgroundColor: st.cor }]} />
              <Text style={a.statusTxt}>{st.txt}</Text>
            </View>
          )}
          <View style={[a.resumo, falta.length ? a.resumoFalta : null]}>
            <Feather name={falta.length ? 'alert-circle' : 'check-circle'} size={16} color={falta.length ? '#FFD54F' : CP.verde} />
            <Text style={[a.resumoTxt, falta.length ? { color: '#FFD54F' } : null]}>
              {falta.length ? `Falta: ${falta.map((x) => x.txt).join(', ')}. Página completa aparece melhor na busca.` : 'Página completa. Mantenha as fotos e os horários em dia.'}
            </Text>
          </View>

          <TituloSecao texto="Seções" />
          <View style={a.lista}>
            {SECOES.map((x, i) => {
              const f = falta.filter((y) => y.secao === x.secao);
              return (
                <TouchableOpacity key={x.secao} style={[a.linha, i > 0 && a.borda]} onPress={() => router.push(`/parceiro/pagina-editar?secao=${x.secao}`)} accessibilityRole="button">
                  <View style={a.icone}><Feather name={x.icone} size={16} color={CP.rosa} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={a.titulo}>{x.titulo}</Text>
                    <Text style={[a.sub, f.length ? { color: '#FFD54F' } : null]}>{f.length ? `Falta ${f.map((y) => y.txt).join(', ')}` : x.sub}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={CP.fraco} />
                </TouchableOpacity>
              );
            })}
          </View>

          <TituloSecao texto="Categoria e selo" info="Status, selo e destaque são definidos pela equipe Dicas. Para mudar a categoria ou a subcategoria, fale com a equipe: assim a casa não sai da vitrine por engano." />
          <TouchableOpacity style={a.cartao} onPress={() => void falarComEquipe(`Olá! Sou do ${p.nome} e quero mudar a categoria ou a subcategoria da página.`)} accessibilityRole="button">
            <Text style={a.titulo}>{p.categoria}{p.subcategoria ? ` · ${p.subcategoria}` : ''}</Text>
            <Text style={a.sub}>Destaque: {p.plano_destaque || 'básico'} · toque para pedir mudança</Text>
          </TouchableOpacity>

          <TouchableOpacity style={a.verCliente} onPress={() => router.push(`/business/${p.id}` as any)} accessibilityRole="button">
            <Feather name="eye" size={16} color={CP.rosa} /><Text style={a.verClienteTxt}>Ver como o cliente vê</Text>
          </TouchableOpacity>
        </>
      )}
    </TelaParceiro>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  erro: { color: '#FF7A7A', fontSize: 13, backgroundColor: '#FF7A7A14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  status: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, marginTop: ESP.m, borderWidth: 1, borderRadius: RAIO.s, padding: ESP.m, backgroundColor: CP.card },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { flex: 1, color: CP.texto, fontSize: 13, fontWeight: '600' },
  resumo: { flexDirection: 'row', alignItems: 'flex-start', gap: ESP.s, marginTop: ESP.s, backgroundColor: '#4CAF7D14', borderRadius: RAIO.s, padding: ESP.m },
  resumoFalta: { backgroundColor: '#FFD54F14' },
  resumoTxt: { flex: 1, color: CP.verde, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  lista: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, paddingHorizontal: ESP.m, paddingVertical: 10, minHeight: 60 },
  borda: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth },
  icone: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E1306C22', alignItems: 'center', justifyContent: 'center' },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  cartao: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  verCliente: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESP.s, minHeight: 48, marginTop: ESP.l, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.rosa },
  verClienteTxt: { color: CP.rosa, fontSize: 14, fontWeight: '800' },
});
