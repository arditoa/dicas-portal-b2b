// Corpo de TODA página de categoria (out/2026): em vez de despejar a lista de locais, mostra banners
// segmentados — um por subcategoria — com a foto de um local da própria subcategoria e a contagem.
// Tocar abre a lista só daquela subcategoria. As subcategorias vêm dos próprios locais (texto livre do
// cadastro), agrupadas sem diferenciar maiúscula/minúscula; quem não informou cai em "Outros".
import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import { SubDef, subcategoriaFixa } from '../lib/subcategorias';

const C = { card: '#161520', border: '#232230', text: '#FFFFFF', dim: '#A0A0B2', pink: '#E1306C' };

export const chaveSubcategoria = (s?: string | null) => (s || '').trim().toLowerCase();

export type GrupoSub = { chave: string; rotulo: string; qtd: number; foto: string | null };

// Chave da subcategoria de um local: com lista fixa da categoria, a da subcategoria que ele encaixa ('' = Outros);
// sem lista fixa, o próprio texto livre normalizado.
export function chaveDoLocal(l: { subcategoria?: string | null }, defs?: SubDef[]): string {
  if (!defs) return chaveSubcategoria(l.subcategoria);
  return subcategoriaFixa(defs, l.subcategoria)?.chave ?? '';
}

export function agruparSubcategorias(
  locais: { subcategoria?: string | null; foto_capa_url?: string | null }[],
  defs?: SubDef[]
): GrupoSub[] {
  const m = new Map<string, GrupoSub>();
  // Com lista fixa, todas as subcategorias aparecem (mesmo com 0 locais), na ordem definida.
  if (defs) for (const d of defs) m.set(d.chave, { chave: d.chave, rotulo: d.rotulo, qtd: 0, foto: null });
  for (const l of locais) {
    const chave = chaveDoLocal(l, defs);
    const rotulo = defs ? (defs.find((d) => d.chave === chave)?.rotulo ?? 'Outros') : chave ? (l.subcategoria as string).trim() : 'Outros';
    const g = m.get(chave) || { chave, rotulo, qtd: 0, foto: null };
    g.qtd += 1;
    if (!g.foto && l.foto_capa_url) g.foto = l.foto_capa_url;
    m.set(chave, g);
  }
  const lista = Array.from(m.values());
  if (defs) return lista; // ordem definida; "Outros" já entra por último (inserido depois das fixas)
  // Sem lista fixa: maiores primeiro; "Outros" sempre por último.
  return lista.sort((a, b) => (a.chave === '' ? 1 : b.chave === '' ? -1 : b.qtd - a.qtd || a.rotulo.localeCompare(b.rotulo, 'pt-BR')));
}

type Props = { grupos: GrupoSub[]; onAbrir: (chave: string) => void; defs?: SubDef[]; selecionada?: string | null; compacto?: boolean; cor?: string }; // cor = a do ícone da categoria na Home

// Ícones redondos no mesmo desenho das categorias da Home (círculo 46, legenda de até 2 linhas, rolagem lateral).
export default function SubcategoriaBanners({ grupos, onAbrir, defs, selecionada, compacto, cor }: Props) {
  const { width } = useWindowDimensions();
  // Largura fixa por ícone: cabe a palavra mais longa (ex.: "Coquetelaria") sem quebrar no meio.
  // Compacto (Eventos): os ícones se dividem na largura da tela, bem juntos, sem precisar rolar.
  const corIcone = cor || C.pink;
  const larg = compacto ? Math.max(56, Math.floor((width - 32) / Math.max(grupos.length, 1))) : width < 360 ? 62 : 68;
  const refRolagem = useRef<ScrollView>(null);
  const [rol, setRol] = useState({ x: 0, conteudo: 0, visivel: 0 });
  const temMais = rol.conteudo > rol.visivel + 8 && rol.x + rol.visivel < rol.conteudo - 8;
  if (grupos.length === 0) return null;
  return (
    <View style={[s.raiz, compacto && { marginTop: 0 }]}>
      <ScrollView
        ref={refRolagem}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={[s.linha, compacto && { gap: 0 }]}
        scrollEventThrottle={32}
        onScroll={(e) => setRol((a) => ({ ...a, x: e.nativeEvent.contentOffset.x }))}
        onContentSizeChange={(w) => setRol((a) => ({ ...a, conteudo: w }))}
        onLayout={(e) => setRol((a) => ({ ...a, visivel: e.nativeEvent.layout.width }))}
      >
        {grupos.map((g) => {
          const def = defs?.find((d) => d.chave === g.chave);
          const icone = def?.icone || 'more-horizontal';
          const nomeCurto = def?.curto || g.rotulo;
          return (
            <TouchableOpacity
              key={g.chave || 'outros'}
              activeOpacity={0.8}
              style={[s.item, { width: larg }]}
              onPress={() => onAbrir(g.chave)}
              accessibilityRole="button"
              accessibilityLabel={`${g.rotulo}, ${g.qtd === 0 ? 'em breve' : `${g.qtd} ${g.qtd === 1 ? 'local' : 'locais'}`}`}
            >
              <View style={[s.circulo, g.qtd === 0 && { opacity: 0.55 }, selecionada === g.chave && { backgroundColor: corIcone, borderColor: corIcone }]}>
                <Feather name={icone as any} size={20} color={selecionada === g.chave ? '#0B0B0E' : corIcone} />
              </View>
              <View style={[s.rotuloBox, compacto && { marginTop: 4 }]}>
                <Text style={s.rotulo} numberOfLines={/[ \n]/.test(nomeCurto) ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1}>{nomeCurto}</Text>
              </View>
              {g.qtd === 0 && <Text style={s.breve}>em breve</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {temMais && (
        <TouchableOpacity
          style={s.setaMais}
          activeOpacity={0.85}
          onPress={() => refRolagem.current?.scrollTo({ x: Math.min(rol.x + larg * 3, Math.max(0, rol.conteudo - rol.visivel)), animated: true })}
          accessibilityRole="button"
          accessibilityLabel="Ver mais subcategorias"
        >
          <Feather name="chevron-right" size={18} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { marginTop: 8 },
  setaMais: { position: 'absolute', right: -8, top: 9, width: 28, height: 28, borderRadius: 14, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  circuloAtivo: { backgroundColor: C.pink, borderColor: C.pink },
  titulo: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 10 },
  linha: { paddingHorizontal: 16, gap: 4 },
  item: { alignItems: 'center' },
  circulo: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  rotuloBox: { height: 30, marginTop: 8, alignSelf: 'stretch', paddingHorizontal: 2, justifyContent: 'center', alignItems: 'center' },
  rotulo: { fontSize: 10, lineHeight: 12, fontWeight: '600', color: C.text, textAlign: 'center' },
  breve: { fontSize: 8, color: C.dim, marginTop: 1 },
});
