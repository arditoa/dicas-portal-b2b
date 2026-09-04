import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';

export interface Festa {
  id: string;
  nome_evento: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  preco_ingressos?: string;
  link_vendas?: string;
  foto_banner: string;
  tags_musica: string[];
}

interface PartyFeedProps {
  festas: Festa[];
}

export function PartyFeed({ festas }: PartyFeedProps) {
  const [tagSelecionada, setTagSelecionada] = useState<string | null>(null);

  const festasFiltradas = tagSelecionada
    ? festas.filter(f => f.tags_musica.includes(tagSelecionada))
    : festas;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>🎉 Festas & Eventos</Text>
        <Text style={styles.subtitle}>Confira o que está rolando na cena LGBT</Text>
      </View>

      {/* Carrossel de Filtros por Estilo Musical */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity
          onPress={() => setTagSelecionada(null)}
          style={[styles.chip, !tagSelecionada && styles.chipActive]}
        >
          <Text style={[styles.chipText, !tagSelecionada && styles.chipTextActive]}>Todas</Text>
        </TouchableOpacity>
        {['Pop', 'Funk', 'Eletrônico', 'House', 'Techno', 'Sertanejo', 'Reggaeton'].map(tag => (
          <TouchableOpacity
            key={tag}
            onPress={() => setTagSelecionada(tagSelecionada === tag ? null : tag)}
            style={[styles.chip, tagSelecionada === tag && styles.chipActive]}
          >
            <Text style={[styles.chipText, tagSelecionada === tag && styles.chipTextActive]}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de Festas */}
      <View style={styles.list}>
        {festasFiltradas.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma festa encontrada para este estilo.</Text>
        ) : (
          festasFiltradas.map(festa => (
            <View key={festa.id} style={styles.card}>
              <Image source={{ uri: festa.foto_banner }} style={styles.banner} resizeMode="cover" />
              <View style={styles.cardBody}>
                <Text style={styles.partyName}>{festa.nome_evento}</Text>
                <Text style={styles.dateText}>
                  📅 {new Date(festa.data_inicio).toLocaleDateString('pt-BR')} • {new Date(festa.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.description} numberOfLines={2}>{festa.descricao}</Text>

                {/* Tags de Musica */}
                <View style={styles.tagsRow}>
                  {festa.tags_musica.map(tag => (
                    <View key={tag} style={styles.tagBadge}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                {/* Botao de Compra / Ingressos */}
                {festa.link_vendas && (
                  <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => Linking.openURL(festa.link_vendas!)}
                  >
                    <Text style={styles.buyButtonText}>
                      Garantir Ingressos {festa.preco_ingressos ? `• ${festa.preco_ingressos}` : ''}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFF' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  filterContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  chipActive: { backgroundColor: '#DB2777' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  list: { padding: 16 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  banner: { width: '100%', height: 180 },
  cardBody: { padding: 16 },
  partyName: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  dateText: { fontSize: 13, color: '#DB2777', fontWeight: '600', marginTop: 4 },
  description: { fontSize: 14, color: '#64748B', marginTop: 6, lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagBadge: { backgroundColor: '#FCE7F3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { color: '#9D174D', fontSize: 11, fontWeight: 'bold' },
  buyButton: { backgroundColor: '#DB2777', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  buyButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});
