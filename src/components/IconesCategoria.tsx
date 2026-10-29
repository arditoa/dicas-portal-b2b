// Linha de ícones redondos das categorias (mesmo visual da Home) usada nas páginas da Home
// (Em Alta etc.): filtra a lista pela categoria tocada; tocar de novo volta para todas.
// Só aparecem as categorias que têm locais na lista.
import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CATEGORIA_ORDER, CATEGORIAS } from '../lib/categorias';

const ROTULO_CURTO: Record<string, string> = {
  turismo: 'Dicas Trip', bares: 'Bares', festas: 'Festas', gastronomia: 'Gastronomia', lazer: 'Lazer', cultura: 'Cultura',
  saude: 'Saúde', beleza: 'Beleza', servicos: 'Serviços', educacao: 'Educação', produtos: 'Produtos', mais18: '18+', lojas: 'Lojas',
};

export type IconeFiltro = { id: string; label: string; icone: string; cor: string };

// Ícones padrão: uma entrada por categoria (id = locais.categoria; Festas usa 'eventos').
export function iconesPadraoCategorias(): IconeFiltro[] {
  return CATEGORIA_ORDER.map((slug) => CATEGORIAS[slug])
    .filter((c) => !c.emBreve && (c.categoriaReal || c.slug === 'festas'))
    .map((c) => ({ id: c.slug === 'festas' ? 'eventos' : (c.categoriaReal as string), label: ROTULO_CURTO[c.slug] || c.label, icone: c.icon, cor: c.color }));
}

type Props = {
  icones: IconeFiltro[]; // já filtrados: só os que têm itens na lista
  selecionada: string | null;
  onSelecionar: (id: string | null) => void;
};

export default function IconesCategoria({ icones, selecionada, onSelecionar }: Props) {
  if (icones.length < 2) return null;
  return (
    <View style={s.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.linha}>
        {icones.map((c) => {
          const sel = selecionada === c.id;
          const dim = !!selecionada && !sel;
          return (
            <TouchableOpacity
              key={c.id}
              style={s.item}
              activeOpacity={0.75}
              onPress={() => onSelecionar(sel ? null : c.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={c.label}
            >
              <View style={[s.circulo, { borderColor: sel ? c.cor : '#232230', backgroundColor: sel ? c.cor + '26' : '#161520', opacity: dim ? 0.5 : 1 }]}>
                <Feather name={c.icone as any} size={20} color={c.cor} />
              </View>
              <Text style={s.rotulo} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14, marginHorizontal: -16 },
  linha: { paddingHorizontal: 16, gap: 8 },
  item: { width: 66, alignItems: 'center', gap: 5 },
  circulo: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rotulo: { fontSize: 10, lineHeight: 12, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', width: 66, minHeight: 24 },
});
