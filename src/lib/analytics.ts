/**
 * Registro de eventos de analytics do parceiro — visualização de perfil e
 * clique no Instagram (e, de brinde, clique em cupom) — pra alimentar os
 * números reais do dashboard do portal B2B, em vez do "Em breve" que
 * ficou lá desde a Rodada 15. Depende da tabela `eventos_analytics`
 * criada em `supabase-migration/006_analytics_cliques_visualizacoes.sql`
 * (Rodada 17 — o desenho é o mesmo já validado na Rodada 5, só que
 * FINALMENTE entrando no conjunto numerado de migrations e sendo
 * instrumentado no arquivo real que hoje existe, `business/[id].tsx` da
 * Rodada 13, em vez do arquivo antigo pra qual foi escrito originalmente).
 *
 * Duas decisões importantes:
 *
 * 1. FIRE-AND-FORGET: nenhuma função aqui é awaited no caminho de abrir o
 *    Instagram/carregar a tela. Se a escrita no banco demorar ou falhar,
 *    o usuário não pode notar. Erros só vão pro console.
 * 2. DEDUPE POR DISPOSITIVO/DIA: um mesmo tipo de evento só conta 1x por
 *    local por dia neste aparelho (AsyncStorage, sobrevive entre sessões).
 *    Evita inflar "visualizações" só porque a pessoa saiu/voltou na tela
 *    várias vezes na mesma tarde.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type TipoEventoAnalytics = 'visualizacao_perfil' | 'clique_instagram' | 'clique_cupom';

function chaveDedupe(tipo: TipoEventoAnalytics, localId: string): string {
  const hoje = new Date().toISOString().slice(0, 10);
  return `analytics:${tipo}:${localId}:${hoje}`;
}

async function registrarEvento(tipo: TipoEventoAnalytics, localId: string): Promise<void> {
  if (!localId) return;
  try {
    const chave = chaveDedupe(tipo, localId);
    const jaRegistradoHoje = await AsyncStorage.getItem(chave);
    if (jaRegistradoHoje) return;

    await AsyncStorage.setItem(chave, '1');

    const { error } = await supabase.from('eventos_analytics').insert({ local_id: localId, tipo });
    if (error) {
      console.warn(`[analytics] erro ao registrar "${tipo}":`, error);
    }
  } catch (erroInesperado) {
    console.warn(`[analytics] erro inesperado ao registrar "${tipo}":`, erroInesperado);
  }
}

/** Chame quando a tela de perfil de um local terminar de carregar. */
export function registrarVisualizacaoPerfil(localId: string): void {
  void registrarEvento('visualizacao_perfil', localId);
}

/** Chame no onPress do botão/ícone do Instagram, antes do Linking.openURL. */
export function registrarCliqueInstagram(localId: string): void {
  void registrarEvento('clique_instagram', localId);
}

/** Chame no onPress de "resgatar cupom" — mesmo mecanismo, de brinde. */
export function registrarCliqueCupom(localId: string): void {
  void registrarEvento('clique_cupom', localId);
}
