// Cabeçalho único do app (Rodada 106/107).
//  • BotaoVoltar: seta de retorno (nas abas volta ao Início quando não há histórico).
//  • TituloTela: título 22px com setinha ∨ ao lado; o conjunto é clicável e abre um menu de
//    visões/atalhos (Hoje · Amanhã · Fim de semana, atalhos da Trip, etc.). Subtítulo 13px cinza.
//  • CabecalhoTela: voltar + logo + TituloTela, para as telas de lista.
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MarcaApp from './MarcaApp';

const C = { card: '#161520', border: '#232230', text: '#FFFFFF', dim: '#8A8A9E', chevron: '#B4B4C6', pink: '#E1306C' };

export type OpcaoTitulo = { id: string; label: string; icone?: string };

export function BotaoVoltar() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.voltar}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
    >
      <Feather name="arrow-left" size={18} color={C.text} />
    </TouchableOpacity>
  );
}

type TituloProps = {
  titulo: string;
  subtitulo?: string;
  // Opções do menu aberto ao tocar no título (∨). Sem opções, o título é só texto.
  opcoes?: OpcaoTitulo[];
  valor?: string;
  onEscolher?: (id: string) => void;
  tituloMenu?: string;
  // Espaços laterais (as abas usam 16 como as demais telas).
  semMargem?: boolean;
};

export function TituloTela({ titulo, subtitulo, opcoes, valor, onEscolher, tituloMenu, semMargem }: TituloProps) {
  const [aberto, setAberto] = useState(false);
  const menu = !!opcoes && opcoes.length > 0 && !!onEscolher;

  return (
    <View style={[styles.bloco, semMargem && { paddingHorizontal: 0, paddingBottom: 0 }]}>
      {menu ? (
        <TouchableOpacity style={styles.tituloLinha} onPress={() => setAberto(true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${titulo}. Toque para escolher a visão`}>
          <Text style={styles.titulo} numberOfLines={2}>{titulo}</Text>
          <Feather name="chevron-down" size={20} color={C.chevron} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      ) : (
        <Text style={styles.titulo} numberOfLines={2}>{titulo}</Text>
      )}
      {!!subtitulo && <Text style={styles.sub}>{subtitulo}</Text>}

      {menu && (
        <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAberto(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet}>
              {!!tituloMenu && <Text style={styles.sheetTitulo}>{tituloMenu}</Text>}
              {opcoes!.map((o) => {
                const ativo = o.id === valor;
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={styles.opcao}
                    onPress={() => {
                      setAberto(false);
                      onEscolher!(o.id);
                    }}
                  >
                    {!!o.icone && <Feather name={o.icone as any} size={16} color={ativo ? C.pink : C.dim} style={{ marginRight: 10 }} />}
                    <Text style={[styles.opcaoTxt, ativo && { color: C.pink, fontWeight: '700' }]}>{o.label}</Text>
                    {ativo && <Feather name="check" size={16} color={C.pink} />}
                  </TouchableOpacity>
                );
              })}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

type Props = {
  titulo: string;
  subtitulo?: string;
  opcoesTitulo?: OpcaoTitulo[];
  valorTitulo?: string;
  onTrocarTitulo?: (id: string) => void;
  tituloSeletor?: string;
};

export default function CabecalhoTela({ titulo, subtitulo, opcoesTitulo, valorTitulo, onTrocarTitulo, tituloSeletor }: Props) {
  return (
    <View style={{ paddingBottom: 2 }}>
      <View style={styles.topo}>
        <BotaoVoltar />
        <MarcaApp />
      </View>
      <TituloTela titulo={titulo} subtitulo={subtitulo} opcoes={opcoesTitulo} valor={valorTitulo} onEscolher={onTrocarTitulo} tituloMenu={tituloSeletor} />
    </View>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, marginBottom: 18 },
  voltar: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  bloco: { paddingHorizontal: 16, paddingBottom: 10 },
  tituloLinha: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  titulo: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.3, lineHeight: 28, flexShrink: 1 },
  sub: { fontSize: 13, fontWeight: '400', color: C.dim, marginTop: 0, lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: C.card, borderRadius: 18, padding: 8, borderWidth: 1, borderColor: C.border },
  sheetTitulo: { color: C.dim, fontSize: 12, fontWeight: '700', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  opcao: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  opcaoTxt: { flex: 1, color: C.text, fontSize: 16, fontWeight: '500' },
});
