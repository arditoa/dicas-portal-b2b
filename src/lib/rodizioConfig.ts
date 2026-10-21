// Lê do banco (app_config) o tamanho e o intervalo do rodízio, com limites de
// segurança. Se não houver nada gravado, usa 6 locais a cada 60 minutos.
import { supabase } from './supabase';
import { FUNDADORES_MAX_PADRAO, RODIZIO_INTERVALO_PADRAO_MIN, RODIZIO_TAMANHO_PADRAO } from './rodizio';

export type ConfigRodizio = { tamanho: number; intervaloMin: number; fundadoresMax: number; completarEmAlta: boolean };
export const CONFIG_RODIZIO_PADRAO: ConfigRodizio = {
  tamanho: RODIZIO_TAMANHO_PADRAO,
  intervaloMin: RODIZIO_INTERVALO_PADRAO_MIN,
  fundadoresMax: FUNDADORES_MAX_PADRAO,
  completarEmAlta: true,
};

export async function lerConfigRodizio(): Promise<ConfigRodizio> {
  try {
    const { data } = await supabase.from('app_config').select('chave, valor').in('chave', ['rodizio_tamanho', 'rodizio_intervalo_min', 'fundadores_max_topo', 'em_alta_completar']);
    const mapa: Record<string, string | null> = {};
    (data ?? []).forEach((r: { chave: string; valor: string | null }) => { mapa[r.chave] = r.valor; });
    const t = parseInt(mapa['rodizio_tamanho'] ?? '', 10);
    const i = parseInt(mapa['rodizio_intervalo_min'] ?? '', 10);
    const f = parseInt(mapa['fundadores_max_topo'] ?? '', 10);
    return {
      tamanho: Number.isFinite(t) ? Math.min(12, Math.max(1, t)) : RODIZIO_TAMANHO_PADRAO,
      intervaloMin: Number.isFinite(i) ? Math.min(240, Math.max(15, i)) : RODIZIO_INTERVALO_PADRAO_MIN,
      fundadoresMax: Number.isFinite(f) ? Math.min(20, Math.max(1, f)) : FUNDADORES_MAX_PADRAO,
      // Rodada 81 — ligado por padrão: completa as vagas de Em Alta com locais não pagos (com foto e nome válido).
      completarEmAlta: mapa['em_alta_completar'] !== '0',
    };
  } catch {
    return CONFIG_RODIZIO_PADRAO;
  }
}
