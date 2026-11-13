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

export type TipoEventoAnalytics =
  | 'visualizacao_perfil' | 'clique_instagram' | 'clique_cupom'
  // Migração 098 (painel de resultados do parceiro)
  | 'visualizacao_banner' | 'clique_banner' | 'clique_whatsapp' | 'clique_rota' | 'clique_telefone'
  | 'visualizacao_festa' | 'clique_ingresso' | 'favoritou';

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

// ---------------------------------------------------------------------------------------------
// Etapa 3 — tipos da migração 098, com a festa (evento_id, migração 099) quando houver.
// Aqui o filtro é por janela curta, não por dia: a mesma visualização não conta 2x em 30 s
// (sair e voltar na tela, a lista recarregar) e o mesmo clique não conta 2x em 3 s (toque duplo).
// Fica só na memória: reabrir o app depois conta de novo, como deve ser.
// O banco confere: local precisa estar aprovado e a festa precisa ser do mesmo local (senão vira null).
const JANELA_VISUALIZACAO_MS = 30_000;
const JANELA_CLIQUE_MS = 3_000;
const ultimoRegistro = new Map<string, number>();
let semEventoId = false; // banco sem a 099: grava sem a festa

async function gravar(tipo: TipoEventoAnalytics, localId: string, eventoId?: string | null): Promise<void> {
  if (!localId) return;
  const janela = tipo.startsWith('visualizacao_') ? JANELA_VISUALIZACAO_MS : JANELA_CLIQUE_MS;
  const chave = `${tipo}|${localId}|${eventoId || '-'}`;
  const agora = Date.now();
  const antes = ultimoRegistro.get(chave);
  if (antes && agora - antes < janela) return;
  ultimoRegistro.set(chave, agora);
  try {
    const linha: Record<string, unknown> = { local_id: localId, tipo };
    if (eventoId && !semEventoId) linha.evento_id = eventoId;
    let { error } = await supabase.from('eventos_analytics').insert(linha);
    if (error && linha.evento_id && /evento_id/.test(error.message || '')) {
      semEventoId = true;
      delete linha.evento_id;
      ({ error } = await supabase.from('eventos_analytics').insert(linha));
    }
    if (error) console.warn(`[analytics] erro ao registrar "${tipo}":`, error.message);
  } catch (erroInesperado) {
    console.warn(`[analytics] erro inesperado ao registrar "${tipo}":`, erroInesperado);
  }
}

/** Abriu a página da festa. */
export function registrarVisualizacaoFesta(localId: string | null | undefined, eventoId: string): void {
  if (localId) void gravar('visualizacao_festa', localId, eventoId);
}
/** Tocou em "Comprar ingresso". */
export function registrarCliqueIngresso(localId: string | null | undefined, eventoId: string): void {
  if (localId) void gravar('clique_ingresso', localId, eventoId);
}
/** Abriu o WhatsApp da casa (reserva, hospedagem…). */
export function registrarCliqueWhatsapp(localId: string | null | undefined, eventoId?: string | null): void {
  if (localId) void gravar('clique_whatsapp', localId, eventoId);
}
/** Tocou em "Como chegar" / abrir no mapa. */
export function registrarCliqueRota(localId: string | null | undefined, eventoId?: string | null): void {
  if (localId) void gravar('clique_rota', localId, eventoId);
}
/** Tocou para ligar. (Hoje o app cliente não tem botão de telefone; fica pronto para quando tiver.) */
export function registrarCliqueTelefone(localId: string | null | undefined, eventoId?: string | null): void {
  if (localId) void gravar('clique_telefone', localId, eventoId);
}
/** Salvou a casa nos favoritos (só quando adiciona, não quando tira). */
export function registrarFavoritou(localId: string | null | undefined): void {
  if (localId) void gravar('favoritou', localId);
}
/** Banner da casa apareceu (Home ou categoria). */
export function registrarVisualizacaoBanner(localId: string | null | undefined): void {
  if (localId) void gravar('visualizacao_banner', localId);
}
/** Tocou no banner da casa (Home ou categoria). */
export function registrarCliqueBanner(localId: string | null | undefined): void {
  if (localId) void gravar('clique_banner', localId);
}
