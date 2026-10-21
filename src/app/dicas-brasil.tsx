// "Dicas úteis sobre o Brasil" (aba Trip) — conteúdo editorial pra quem
// está viajando, em PT/EN/ES. Só informação pública e estável (telefones
// oficiais de emergência, direitos garantidos por decisões do STF/CNJ),
// sem dado inventado. Revisar o texto uma vez por ano.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n, type Idioma } from '../lib/i18n';

type Secao = 'seguranca' | 'direitos' | 'transporte' | 'pagamentos';

const CONTEUDO: Record<Secao, { icone: string; titulo: Record<Idioma, string>; itens: Record<Idioma, string[]> }> = {
  seguranca: {
    icone: 'shield',
    titulo: { pt: 'Segurança e ajuda', en: 'Safety & help', es: 'Seguridad y ayuda' },
    itens: {
      pt: [
        'Emergência: 190 (Polícia Militar), 192 (SAMU, ambulância) e 193 (Bombeiros). As ligações são gratuitas.',
        'Disque 100 (Direitos Humanos): canal gratuito para denunciar LGBTfobia e outras violações.',
        'À noite, prefira táxi ou app de transporte em vez de caminhar por ruas vazias, e evite deixar o celular à mostra na rua.',
        'Sofreu ou viu discriminação num local do app? Use "Denunciar ocorrência" em Conta.',
      ],
      en: [
        'Emergency: 190 (Military Police), 192 (SAMU ambulance) and 193 (Fire department). Calls are free.',
        'Disque 100 (Human Rights hotline): free line to report LGBTQ+phobia and other violations.',
        'At night, take a taxi or ride-hailing app instead of walking empty streets, and keep your phone out of sight.',
        'Faced or witnessed discrimination at a venue? Use "Report an incident" in Account.',
      ],
      es: [
        'Emergencia: 190 (Policía Militar), 192 (SAMU, ambulancia) y 193 (Bomberos). Las llamadas son gratuitas.',
        'Disque 100 (Derechos Humanos): línea gratuita para denunciar LGBTfobia y otras violaciones.',
        'De noche, usa taxi o app de transporte en lugar de caminar por calles vacías, y no dejes el celular a la vista.',
        '¿Sufriste o viste discriminación en un lugar? Usa "Denunciar" en Cuenta.',
      ],
    },
  },
  direitos: {
    icone: 'heart',
    titulo: { pt: 'Seus direitos LGBT+', en: 'Your LGBTQ+ rights', es: 'Tus derechos LGBT+' },
    itens: {
      pt: [
        'Casamento civil entre pessoas do mesmo gênero é garantido em todo o país desde 2013 (Resolução 175 do CNJ).',
        'Desde 2019, o STF enquadra a LGBTfobia como crime de racismo.',
        'Pessoas trans podem mudar nome e gênero direto no cartório, sem cirurgia e sem processo judicial (STF, 2018).',
      ],
      en: [
        'Same-sex civil marriage has been guaranteed nationwide since 2013 (CNJ Resolution 175).',
        'Since 2019, Brazil’s Supreme Court treats LGBTQ+phobia as a crime of racism.',
        'Trans people can change name and gender at a registry office, with no surgery or court case required (Supreme Court, 2018).',
      ],
      es: [
        'El matrimonio civil entre personas del mismo género está garantizado en todo el país desde 2013 (Resolución 175 del CNJ).',
        'Desde 2019, el Supremo Tribunal Federal considera la LGBTfobia un crimen de racismo.',
        'Las personas trans pueden cambiar nombre y género en el registro civil, sin cirugía ni proceso judicial (STF, 2018).',
      ],
    },
  },
  transporte: {
    icone: 'navigation',
    titulo: { pt: 'Como se locomover', en: 'Getting around', es: 'Cómo moverse' },
    // Rodada 68 — Uber/99, apps de rota e compra de bilhete do Metrô/CPTM de
    // SP pelo TOP (app ou WhatsApp (11) 3888-2200, pagamento por Pix).
    itens: {
      pt: [
        'Uber e 99 funcionam em todas as capitais e são a opção mais segura à noite. Confira placa, modelo e nome do motorista antes de entrar e compartilhe a viagem com alguém pelo próprio app.',
        'Para traçar rotas de metrô, trem e ônibus, use Google Maps ou Moovit — mostram horários e baldeações em tempo real.',
        'São Paulo — Metrô e CPTM: compre o bilhete digital (QR Code) pelo app TOP ou pelo WhatsApp do TOP: (11) 3888-2200. Mande "oi", pague com Pix e mostre o QR Code no leitor da catraca. Sem fila na bilheteria.',
        'O metrô costuma fechar por volta da meia-noite. Na volta da festa, prefira Uber, 99 ou táxi.',
        'Entre cidades, voos domésticos e ônibus rodoviários são os meios mais comuns.',
      ],
      en: [
        'Uber and 99 work in every state capital and are the safest choice at night. Check the plate, car model and driver name before getting in, and share your trip from the app.',
        'For metro, train and bus routes, use Google Maps or Moovit — they show real-time schedules and transfers.',
        'São Paulo — Metro and CPTM trains: buy a digital ticket (QR Code) in the TOP app or via TOP on WhatsApp: +55 11 3888-2200. Send "oi", pay with Pix and scan the QR Code at the turnstile. No ticket lines.',
        'The metro usually closes around midnight. After a party, take Uber, 99 or a taxi.',
        'Between cities, domestic flights and intercity buses are the usual options.',
      ],
      es: [
        'Uber y 99 funcionan en todas las capitales y son la opción más segura de noche. Revisa la placa, el modelo y el nombre del conductor antes de subir, y comparte el viaje desde la app.',
        'Para rutas de metro, tren y bus, usa Google Maps o Moovit: muestran horarios y conexiones en tiempo real.',
        'São Paulo — Metro y trenes CPTM: compra el boleto digital (código QR) en la app TOP o por WhatsApp de TOP: +55 11 3888-2200. Envía "oi", paga con Pix y muestra el QR en el lector del torniquete. Sin filas.',
        'El metro suele cerrar alrededor de la medianoche. Al volver de la fiesta, usa Uber, 99 o taxi.',
        'Entre ciudades, los vuelos nacionales y los buses interurbanos son lo más común.',
      ],
    },
  },
  pagamentos: {
    icone: 'credit-card',
    titulo: { pt: 'Pix e pagamentos', en: 'Pix & payments', es: 'Pix y pagos' },
    itens: {
      pt: [
        'Pix é o pagamento instantâneo do Banco Central e é aceito quase em todo lugar.',
        'Cartões de crédito e débito são amplamente aceitos; quem vem de fora em geral usa cartão internacional.',
        'Em bares e restaurantes, a taxa de serviço de 10% costuma vir na conta e é opcional.',
      ],
      en: [
        'Pix is the Central Bank’s instant payment system and is accepted almost everywhere.',
        'Credit and debit cards are widely accepted; visitors usually pay with an international card.',
        'At bars and restaurants a 10% service charge is usually added to the bill and is optional.',
      ],
      es: [
        'Pix es el pago instantáneo del Banco Central y se acepta casi en todas partes.',
        'Las tarjetas de crédito y débito se aceptan ampliamente; quien viene de fuera suele usar tarjeta internacional.',
        'En bares y restaurantes, la tasa de servicio del 10% suele venir en la cuenta y es opcional.',
      ],
    },
  },
};

const ORDEM: Secao[] = ['seguranca', 'direitos', 'transporte', 'pagamentos'];

const TELEFONES = [
  { numero: '190', rotulo: 'Polícia' },
  { numero: '192', rotulo: 'SAMU' },
  { numero: '193', rotulo: 'Bombeiros' },
  { numero: '100', rotulo: 'Disque 100' },
];

export default function DicasBrasilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { idioma, t } = useI18n();
  const { secao } = useLocalSearchParams<{ secao?: Secao }>();
  const [aberta, setAberta] = useState<Secao>(secao && CONTEUDO[secao] ? secao : 'seguranca');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topo}>
        <TouchableOpacity onPress={() => router.back()} style={styles.voltar} accessibilityRole="button" accessibilityLabel="Voltar">
          <Feather name="chevron-left" size={26} color="#F5F5F7" />
        </TouchableOpacity>
        <Text style={styles.titulo}>{t('trip.dicasBrasil')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
        {ORDEM.map((s) => {
          const c = CONTEUDO[s];
          const ativa = aberta === s;
          return (
            <View key={s} style={styles.card}>
              <TouchableOpacity style={styles.cardTopo} onPress={() => setAberta(s)} accessibilityRole="button" accessibilityState={{ expanded: ativa }}>
                <Feather name={c.icone as any} size={20} color="#0B0B0E" />
                <Text style={styles.cardTitulo}>{c.titulo[idioma]}</Text>
                <Feather name={ativa ? 'chevron-up' : 'chevron-down'} size={18} color="#55546A" />
              </TouchableOpacity>
              {ativa && (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {c.itens[idioma].map((txt) => (
                    <Text key={txt} style={styles.item}>• {txt}</Text>
                  ))}
                  {s === 'transporte' && (
                    <TouchableOpacity
                      style={styles.waBtn}
                      onPress={() => Linking.openURL('https://wa.me/551138882200?text=oi')}
                      accessibilityRole="button"
                      accessibilityLabel="WhatsApp TOP (11) 3888-2200"
                    >
                      <Feather name="message-circle" size={18} color="#0B0B0E" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.waTitulo}>
                          {idioma === 'en' ? 'Buy SP metro ticket on WhatsApp' : idioma === 'es' ? 'Comprar boleto del metro SP por WhatsApp' : 'Comprar bilhete do metrô SP no WhatsApp'}
                        </Text>
                        <Text style={styles.waSub}>TOP · (11) 3888-2200 · Pix</Text>
                      </View>
                      <Feather name="external-link" size={16} color="#0B0B0E" />
                    </TouchableOpacity>
                  )}
                  {s === 'seguranca' && (
                    <View style={styles.telefones}>
                      {TELEFONES.map((tel) => (
                        <TouchableOpacity
                          key={tel.numero}
                          style={styles.telBtn}
                          onPress={() => Linking.openURL(`tel:${tel.numero}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`${tel.rotulo} ${tel.numero}`}
                        >
                          <Text style={styles.telNum}>{tel.numero}</Text>
                          <Text style={styles.telRot}>{tel.rotulo}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0E' },
  topo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, gap: 4 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 18, fontWeight: '800', color: '#F5F5F7', flexShrink: 1 },
  card: { backgroundColor: '#E8E0F6', borderRadius: 14, padding: 14 },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  cardTitulo: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0B0B0E' },
  item: { fontSize: 13, lineHeight: 19, color: '#1C1B26' },
  telefones: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  waBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#25D366', borderRadius: 12, padding: 12, marginTop: 4 },
  waTitulo: { color: '#0B0B0E', fontSize: 13, fontWeight: '800' },
  waSub: { color: '#0B3D1E', fontSize: 11, marginTop: 1 },
  telBtn: { backgroundColor: '#0B0B0E', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 70 },
  telNum: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  telRot: { color: '#E8E0F6', fontSize: 11, fontWeight: '600' },
});
