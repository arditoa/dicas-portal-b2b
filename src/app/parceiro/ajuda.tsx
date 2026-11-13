// Etapa 11 — Central de ajuda (Meu espaço › Ajuda). Mesma fonte do portal (dashboard/ajuda + lib/ajudaPaginas),
// textos em src/lib/parceiro/ajuda.ts: como usar cada tela (só as que a casa e o acesso usam), perguntas
// frequentes e falar com a equipe pelo WhatsApp.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../lib/modoParceiro';
import { AJUDA_TELAS, FAQ } from '../../lib/parceiro/ajuda';
import { falarComEquipe } from '../../lib/parceiroMenu';

export default function Ajuda() {
  const router = useRouter();
  const { localAtivo, pode } = useModoParceiro();
  const [aberta, setAberta] = useState<string | null>(null);
  const [faq, setFaq] = useState<number | null>(null);
  if (!localAtivo) return null;
  const telas = AJUDA_TELAS.filter((t) => t.mostrar(localAtivo, pode));
  return (
    <TelaParceiro titulo="Ajuda" subtitulo="Passo a passo de cada tela e como falar com a gente.">
      <TouchableOpacity style={a.voltar} onPress={() => router.back()} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Voltar</Text></TouchableOpacity>

      <TouchableOpacity style={a.equipe} onPress={() => void falarComEquipe(`Olá! Sou do ${localAtivo.nome} e preciso de ajuda no app.`)} accessibilityRole="button">
        <Feather name="message-circle" size={18} color="#FFF" />
        <Text style={a.equipeTxt}>Falar com a equipe no WhatsApp</Text>
      </TouchableOpacity>

      <TituloSecao texto="Como usar cada tela" />
      <View style={{ gap: ESP.s }}>
        {telas.map((t) => {
          const on = aberta === t.chave;
          return (
            <View key={t.chave} style={a.cartao}>
              <TouchableOpacity style={a.cab} onPress={() => setAberta(on ? null : t.chave)} accessibilityRole="button" accessibilityState={{ expanded: on }}>
                <Text style={a.titulo}>{t.titulo}</Text>
                <Feather name={on ? 'chevron-up' : 'chevron-down'} size={16} color={CP.dim} />
              </TouchableOpacity>
              {on && (
                <View style={a.corpo}>
                  <Text style={a.texto}>{t.paraQue}</Text>
                  {t.passos.map((p, i) => <Text key={p} style={a.passo}>{i + 1}. {p}</Text>)}
                  {!!t.dica && <Text style={a.dica}>{t.dica}</Text>}
                  <TouchableOpacity onPress={() => router.push(t.rota as any)} style={a.ir} accessibilityRole="button"><Text style={a.irTxt}>Ir para {t.titulo} →</Text></TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <TituloSecao texto="Perguntas frequentes" />
      <View style={{ gap: ESP.s }}>
        {FAQ.map((f, i) => (
          <TouchableOpacity key={f.p} style={a.cartao} onPress={() => setFaq(faq === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: faq === i }}>
            <View style={a.cab}><Text style={a.titulo}>{f.p}</Text><Feather name={faq === i ? 'chevron-up' : 'chevron-down'} size={16} color={CP.dim} /></View>
            {faq === i && <Text style={[a.texto, { paddingHorizontal: ESP.m, paddingBottom: ESP.m }]}>{f.r}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </TelaParceiro>
  );
}

const a = StyleSheet.create({
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  equipe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESP.s, minHeight: 52, borderRadius: RAIO.m, backgroundColor: '#25D366', marginTop: ESP.m },
  equipeTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  cartao: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, overflow: 'hidden' },
  cab: { flexDirection: 'row', alignItems: 'center', gap: ESP.s, paddingHorizontal: ESP.m, minHeight: 52 },
  titulo: { flex: 1, color: CP.texto, fontSize: 14, fontWeight: '800' },
  corpo: { borderTopColor: CP.borda, borderTopWidth: StyleSheet.hairlineWidth, padding: ESP.m, gap: 6 },
  texto: { color: '#C8C8D8', fontSize: 13, lineHeight: 19 },
  passo: { color: CP.dim, fontSize: 13, lineHeight: 19 },
  dica: { color: CP.dim, fontSize: 12, lineHeight: 17, backgroundColor: '#FFFFFF0D', borderRadius: RAIO.s, padding: ESP.m, marginTop: 4 },
  ir: { minHeight: 44, justifyContent: 'center' },
  irTxt: { color: CP.rosa, fontSize: 13, fontWeight: '800' },
});
