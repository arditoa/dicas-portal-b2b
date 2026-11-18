// Faixa "AÇÕES DA SEMANA" (Home e Eventos): as ações de marca no ar. Só a equipe Dicas (admin) coloca
// uma ação aqui — o bar cria, mas `mostrar_no_app` só o admin liga (migração 119).
// Cartão no MESMO tamanho dos cupons da vitrine (128 × 92), degradê na cor da marca.
// Cada cartão abre a página da ação (/marca/[id]) com os cupons e festas participantes.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TITULO_SECAO } from '../constants/theme';
import { corDaMarca, textoRestam, useMarcasAtivas } from '../lib/marcas';
import { estiloCartaoOferta, useLarguraCaixa } from './CartaoCupomVitrine';
import FundoCaixaDegrade from './FundoCaixaDegrade';

// Escurece a cor da marca para o texto branco ficar legível (amarelo vira dourado escuro, etc.).
function escurecer(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (x: number) => Math.round(x * f).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

// Cor clara (amarelo, verde-limão…) precisa escurecer mais; vermelho e azul ficam quase na cor da marca.
function claro(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

export default function FaixaMarcas({ estiloTitulo, margem = 16 }: { estiloTitulo?: object; margem?: number }) {
  const router = useRouter();
  const largura = useLarguraCaixa();
  const lista = useMarcasAtivas().filter((a) => a.cupom_ids.length + a.festa_ids.length + (a.local_ids || []).length > 0);
  if (lista.length === 0) return null;
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={[s.titulo, { marginHorizontal: margem }, estiloTitulo]}>Ações da semana</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: margem, gap: 8 }}>
        {lista.map((a) => {
          const cor = /^#[0-9A-Fa-f]{6}$/.test(corDaMarca(a)) ? corDaMarca(a) : '#F2C94C';
          const fim = a.fim.split('-').reverse().slice(0, 2).join('/');
          return (
            <TouchableOpacity
              key={a.id}
              style={[estiloCartaoOferta, { width: largura }]}
              activeOpacity={0.85}
              onPress={() => router.push(`/marca/${a.id}` as any)}
              accessibilityRole="button"
              accessibilityLabel={`Ação da semana, apoio ${a.marca}: ${a.chamada || a.nome}. Até ${fim}`}
            >
              <FundoCaixaDegrade id={`acao-${a.id}`} cores={[escurecer(cor, claro(cor) ? 0.62 : 0.9), '#1B1530']} ondas />
              {a.logo_url ? (
                <Image source={{ uri: a.logo_url }} style={s.marcaDagua} resizeMode="contain" />
              ) : (
                <Feather name="gift" size={44} color="rgba(255,255,255,0.2)" style={s.icone} />
              )}
              <View style={s.pilula}>
                <Text style={s.pilulaTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Apoio · {a.marca}</Text>
              </View>
              <Text style={s.chamada} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{(a.chamada || a.brinde || a.nome).toLocaleUpperCase('pt-BR')}</Text>
              <Text style={s.detalhe} numberOfLines={1}>{textoRestam(a) || `Até ${fim}`}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  // Mesmo título das outras seções ("Festas em destaque"…): branco, 15, sem caixa alta.
  titulo: { ...TITULO_SECAO, marginBottom: 10 },
  icone: { position: 'absolute', right: -6, bottom: -6, transform: [{ rotate: '-14deg' }] },
  marcaDagua: { position: 'absolute', right: 4, bottom: 4, width: 34, height: 34, opacity: 0.5 },
  pilula: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: 'rgba(255,255,255,0.24)', borderRadius: 999, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 5 },
  pilulaTxt: { fontSize: 8.5, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  chamada: { fontSize: 13, lineHeight: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.2, paddingRight: 8 },
  detalhe: { fontSize: 9.5, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
});
