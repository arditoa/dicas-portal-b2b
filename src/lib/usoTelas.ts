/**
 * Tempo por tela — ANÔNIMO (migration 048, tabela uso_telas).
 * Não envia user_id, nome, e-mail, telefone nem localização. O "dispositivo" é
 * um código aleatório criado no aparelho (AsyncStorage) só para contar aparelhos
 * distintos; a "sessão" é outro código que muda a cada abertura do app ou depois
 * de 30 min parado. Tudo fire-and-forget: se falhar, o usuário não percebe.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from './supabase';

export type TelaRastreada =
  | 'home' | 'mapa' | 'eventos' | 'trip' | 'conta' | 'categoria' | 'perfil_local'
  | 'secao' | 'experiencia' | 'evento' | 'busca' | 'roteiro' | 'destino' | 'outras';

const CHAVE_DISPOSITIVO = 'uso:dispositivo';
const INATIVIDADE_MS = 30 * 60 * 1000;
const MIN_SEG = 2;
const MAX_SEG = 1800;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function codigo(): string {
  const parte = () => Math.random().toString(36).slice(2, 10);
  return `${parte()}${parte()}${Date.now().toString(36)}`;
}

let dispositivoCache: string | null = null;
async function dispositivoId(): Promise<string> {
  if (dispositivoCache) return dispositivoCache;
  try {
    const salvo = await AsyncStorage.getItem(CHAVE_DISPOSITIVO);
    if (salvo) return (dispositivoCache = salvo);
    const novo = codigo();
    await AsyncStorage.setItem(CHAVE_DISPOSITIVO, novo);
    return (dispositivoCache = novo);
  } catch {
    return (dispositivoCache = codigo());
  }
}

let sessaoId = codigo();
let ultimaAtividade = Date.now();
function sessaoAtual(): string {
  const agora = Date.now();
  if (agora - ultimaAtividade > INATIVIDADE_MS) sessaoId = codigo();
  ultimaAtividade = agora;
  return sessaoId;
}

// Em desenvolvimento (Expo Go) não conta, para não sujar os números; para testar,
// abra com EXPO_PUBLIC_RASTREAR_DEV=1.
const ATIVO = !__DEV__ || process.env.EXPO_PUBLIC_RASTREAR_DEV === '1';

async function enviar(tela: TelaRastreada, segundos: number, detalhe: string | null, localId: string | null) {
  if (!ATIVO) return;
  const seg = Math.min(MAX_SEG, Math.round(segundos));
  if (seg < MIN_SEG) return;
  try {
    const dispositivo = await dispositivoId();
    const { error } = await supabase.from('uso_telas').insert({
      dispositivo,
      sessao: sessaoAtual(),
      tela,
      detalhe: detalhe ? detalhe.slice(0, 60) : null,
      local_id: localId && UUID_RE.test(localId) ? localId : null,
      segundos: seg,
      plataforma: Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web' ? Platform.OS : null,
    });
    if (error) console.warn('[uso_telas]', error.message);
  } catch (e) {
    console.warn('[uso_telas] erro inesperado', e);
  }
}

/**
 * Mede quanto tempo a tela fica em primeiro plano. Chame na primeira linha do
 * componente da tela. `detalheParam` = nome do parâmetro de rota que vira o
 * "detalhe" (ex.: 'tipo' em /secao/[tipo]); `localParam` = parâmetro que é o id
 * de um local (ex.: 'id' em /business/[id]).
 */
export function useRastrearTela(tela: TelaRastreada, opts?: { detalheParam?: string; localParam?: string }) {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const detalhe = opts?.detalheParam ? um(params[opts.detalheParam]) : null;
  const localId = opts?.localParam ? um(params[opts.localParam]) : null;

  const inicio = useRef<number | null>(null);
  const focada = useRef(false);
  const dados = useRef({ detalhe, localId });
  dados.current = { detalhe, localId };

  const fechar = useCallback(() => {
    if (inicio.current == null) return;
    const seg = (Date.now() - inicio.current) / 1000;
    inicio.current = null;
    void enviar(tela, seg, dados.current.detalhe, dados.current.localId);
  }, [tela]);

  // Tela em foco (e app em primeiro plano) = contando.
  useFocusEffect(
    useCallback(() => {
      focada.current = true;
      inicio.current = Date.now();
      return () => {
        focada.current = false;
        fechar();
      };
    }, [fechar])
  );

  // App indo para segundo plano fecha a passagem; voltando, abre outra.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        if (focada.current && inicio.current == null) inicio.current = Date.now();
      } else {
        fechar();
      }
    });
    return () => sub.remove();
  }, [fechar]);
}
