// Linha de pílulas de filtro que abrem uma lista (mesmo padrão de "Experiências e roteiros").
// Usada em Hospedagem, Passeios, Agências e Pacotes da Trip. As opções vêm sempre da lista
// já filtrada pelo tipo da tela — nunca de tudo —, para não aparecer pílula sem resultado.
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const C = { card: '#161520', border: '#232230', text: '#F5F5F7', dim: '#A0A0B2', pink: '#E1306C' };

export type FiltroDef = {
  id: string;
  label: string;
  icone: string;
  opcoes: string[];
  valor?: string;
  curto?: string; // rótulo enxuto da pílula nas páginas de categoria (compacto)
  titulo?: string; // título da lista que abre (padrão: label)
};

type Props = {
  filtros: FiltroDef[];
  onSelecionar: (id: string, valor?: string) => void;
  onLimpar?: () => void;
  compacto?: boolean; // pílulas menores (páginas de categoria)
};

export default function FiltrosPilulas({ filtros, onSelecionar, onLimpar, compacto }: Props) {
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const visiveis = filtros.filter((f) => f.opcoes.length > 0 || f.valor);
  if (visiveis.length === 0) return null;
  const aberto = visiveis.find((f) => f.id === abrindo);
  const algumAtivo = visiveis.some((f) => !!f.valor);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.linha, compacto && styles.linhaCompacta]}>
        {visiveis.map((f) => {
          const ativo = !!f.valor;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.pilula, compacto && styles.pilulaCompacta, ativo && styles.pilulaAtiva]}
              onPress={() => setAbrindo(f.id)}
              accessibilityRole="button"
              accessibilityLabel={`${f.label}${f.valor ? `: ${f.valor}` : ''}`}
            >
              <Feather name={f.icone as any} size={compacto ? 12 : 14} color={ativo ? '#FFF' : C.pink} />
              <Text style={[styles.pilulaTxt, compacto && { fontSize: 11 }, ativo && { color: '#FFF' }]} numberOfLines={1}>{f.valor || (compacto && f.curto) || f.label}</Text>
              <Feather name="chevron-down" size={compacto ? 12 : 14} color={ativo ? '#FFF' : C.dim} />
            </TouchableOpacity>
          );
        })}
        {algumAtivo && onLimpar && (
          <TouchableOpacity style={styles.pilula} onPress={onLimpar} accessibilityRole="button">
            <Feather name="x" size={14} color={C.dim} />
            <Text style={styles.pilulaTxt}>Limpar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={!!aberto} transparent animationType="fade" onRequestClose={() => setAbrindo(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAbrindo(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            {aberto && (
              <>
                <Text style={styles.sheetTitulo}>{aberto.titulo || aberto.label}</Text>
                <ScrollView style={{ maxHeight: 380 }}>
                  {[undefined, ...aberto.opcoes].map((v) => {
                    const ativo = aberto.valor === v;
                    return (
                      <TouchableOpacity
                        key={v || 'todos'}
                        style={styles.opcao}
                        onPress={() => {
                          onSelecionar(aberto.id, v);
                          setAbrindo(null);
                        }}
                      >
                        <Text style={[styles.opcaoTxt, ativo && { color: C.pink, fontWeight: '800' }]}>{v === undefined ? 'Todos' : v}</Text>
                        {ativo && <Feather name="check" size={16} color={C.pink} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  linha: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  pilula: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, height: 38, maxWidth: 220 },
  linhaCompacta: { paddingVertical: 0, gap: 6 },
  pilulaCompacta: { height: 28, paddingHorizontal: 10, gap: 5, borderRadius: 10 },
  pilulaAtiva: { backgroundColor: C.pink, borderColor: C.pink },
  pilulaTxt: { color: C.text, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  sheetTitulo: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  opcao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  opcaoTxt: { color: C.text, fontSize: 14 },
});
