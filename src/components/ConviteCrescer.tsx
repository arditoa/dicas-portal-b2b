// Rodada 145 — convite "Aumente suas vendas" na entrada do Modo parceiro (no estilo do aviso do Shopee Ads).
// Só para o dono, e só quem ainda não é Fundador. Aparece no máximo uma vez a cada 7 dias; "Não exibir novamente" desliga.
// Sem preço e sem pagamento no app: o botão só abre a conversa com a equipe no WhatsApp (regra da Apple, ver Rodada 145).
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FundoCaixaDegrade from './FundoCaixaDegrade';
import { LocalDoParceiro } from '../lib/modoParceiro';

const WHATSAPP_EQUIPE = '5511942942028';
const SETE_DIAS = 7 * 864e5;
const chave = (localId: string) => `dicas:convite_crescer:${localId}`;

const BENEFICIOS: { icone: keyof typeof Feather.glyphMap; texto: string }[] = [
  { icone: 'trending-up', texto: 'Mais destaque no app' },
  { icone: 'users', texto: 'Mais clientes na porta' },
  { icone: 'repeat', texto: 'Clientes que voltam' },
];

export default function ConviteCrescer({ local }: { local: LocalDoParceiro | null }) {
  const [visivel, setVisivel] = useState(false);
  const mostrar = !!local && local.papel === 'dono' && local.plano_comercial !== 'fundador';

  useEffect(() => {
    if (!mostrar || !local) return;
    let ativo = true;
    (async () => {
      const salvo = await AsyncStorage.getItem(chave(local.local_id)).catch(() => null);
      if (salvo === 'nunca') return;
      if (salvo && Date.now() - Number(salvo) < SETE_DIAS) return;
      // pequena espera: a tela inicial aparece primeiro, o convite vem logo depois
      setTimeout(() => { if (ativo) setVisivel(true); }, 900);
    })();
    return () => { ativo = false; };
  }, [mostrar, local]);

  if (!mostrar || !local) return null;

  const fechar = (nunca = false) => {
    setVisivel(false);
    void AsyncStorage.setItem(chave(local.local_id), nunca ? 'nunca' : String(Date.now())).catch(() => {});
  };

  const falar = async () => {
    fechar();
    const texto = encodeURIComponent(
      `Olá, equipe Dicas! Sou do ${local.nome} e quero aumentar minhas vendas pelo app. Podem me mostrar as opções?`
    );
    const app = `whatsapp://send?phone=${WHATSAPP_EQUIPE}&text=${texto}`;
    try {
      if (await Linking.canOpenURL(app)) await Linking.openURL(app);
      else await Linking.openURL(`https://api.whatsapp.com/send?phone=${WHATSAPP_EQUIPE}&text=${texto}`);
    } catch {
      // sem WhatsApp: nada a fazer além de fechar
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={() => fechar()}>
      <View style={s.fundo}>
        <View style={s.caixa}>
          <TouchableOpacity style={s.fechar} onPress={() => fechar()} accessibilityLabel="Fechar">
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={s.arte}>
            <FundoCaixaDegrade id="convite-crescer" cores={['#4A1C8C', '#E1306C']} />
            <View style={s.grafico}>
              {[28, 44, 62, 86].map((h, i) => <View key={i} style={[s.barra, { height: h }]} />)}
            </View>
            <Feather name="trending-up" size={56} color="#FFFFFF" style={s.seta} />
          </View>

          <Text style={s.titulo}>Aumente suas vendas com o Dicas LGBT+</Text>
          <Text style={s.texto}>
            A equipe mostra como aparecer mais para o público LGBT+ da sua cidade e trazer mais gente para o {local.nome}.
          </Text>

          <View style={s.beneficios}>
            {BENEFICIOS.map((b) => (
              <View key={b.texto} style={s.beneficio}>
                <View style={s.beneficioIcone}><Feather name={b.icone} size={20} color="#E1306C" /></View>
                <Text style={s.beneficioTexto}>{b.texto}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.botao} onPress={falar} activeOpacity={0.85} accessibilityRole="button">
            <Feather name="message-circle" size={18} color="#FFFFFF" />
            <Text style={s.botaoTexto}>Fale com a equipe</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => fechar(true)} style={s.nunca} accessibilityRole="button">
            <Text style={s.nuncaTexto}>Não exibir novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  caixa: { width: '100%', maxWidth: 380, backgroundColor: '#14131C', borderRadius: 22, overflow: 'hidden', borderColor: '#2A2838', borderWidth: 1 },
  fechar: {
    position: 'absolute', top: 10, right: 10, zIndex: 2, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  arte: { height: 150, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 18 },
  grafico: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  barra: { width: 22, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.85)' },
  seta: { position: 'absolute', top: 22, right: '24%' },
  titulo: { color: '#FFFFFF', fontSize: 21, fontWeight: '800', textAlign: 'center', marginTop: 18, paddingHorizontal: 20 },
  texto: { color: '#A0A0B2', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, paddingHorizontal: 22 },
  beneficios: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 18, paddingHorizontal: 10 },
  beneficio: { alignItems: 'center', width: '32%' },
  beneficioIcone: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#2A1420', alignItems: 'center', justifyContent: 'center' },
  beneficioTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  botao: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E1306C',
    marginHorizontal: 20, marginTop: 22, minHeight: 52, borderRadius: 26,
  },
  botaoTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  nunca: { alignItems: 'center', paddingVertical: 16 },
  nuncaTexto: { color: '#8A8A9E', fontSize: 13 },
});
