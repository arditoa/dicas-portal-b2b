// Nov/2026 (18/11) — Experiências editáveis pelo Modo equipe (app_config 'experiencias_config', valor = JSON):
//   • lista: as tags que aparecem em "Experiências" (nome, ícone, cor e ordem); dá para criar novas.
//   • limites: quantas tags cada plano pode ter (padrão Fundador 3 · Premium 3 · Intermediário 1 · demais 0).
//   • completarVazio: tag sem nenhuma casa paga mostra as demais casas que têm a tag (enquanto o app ainda está vazio).
// As tags de cada casa ficam em locais.experiencias (marcadas pela equipe). Ordem na lista:
// Fundador > Premium > Intermediário > demais; no mesmo plano, quem se cadastrou primeiro.
import { supabase } from './supabase';
import { planoAtivo } from './hierarquia';

export type ExperienciaDef = { slug: string; label: string; icone: string; cor: string };
export type LimitesExperiencia = { fundador: number; premium: number; intermediario: number; demais: number };
export type ConfigExperiencias = { lista: ExperienciaDef[]; limites: LimitesExperiencia; completarVazio: boolean };

export const CHAVE_EXPERIENCIAS = 'experiencias_config';
export const EXPERIENCIAS_PADRAO: ExperienciaDef[] = [
  { slug: 'aniversario', label: 'Aniversário', icone: 'mci:balloon', cor: '#C084FC' },
  { slug: 'dates', label: 'Dates', icone: 'heart', cor: '#E1306C' },
  { slug: 'dancar', label: 'Dançar', icone: 'music', cor: '#FFB74D' },
  { slug: 'musica_ao_vivo', label: 'Música ao vivo', icone: 'mic', cor: '#4FC3F7' },
  { slug: 'drag_show', label: 'Drag show', icone: 'star', cor: '#B39DDB' },
  { slug: 'karaoke', label: 'Karaokê', icone: 'radio', cor: '#4CAF7D' },
];
export const LIMITES_PADRAO: LimitesExperiencia = { fundador: 3, premium: 3, intermediario: 1, demais: 0 };
export const CONFIG_PADRAO: ConfigExperiencias = { lista: EXPERIENCIAS_PADRAO, limites: LIMITES_PADRAO, completarVazio: true };

export function lerConfig(valor?: string | null): ConfigExperiencias {
  try {
    const v = JSON.parse(valor || '{}');
    const lista = Array.isArray(v.lista) && v.lista.length ? (v.lista as ExperienciaDef[]).filter((x) => x && x.slug && x.label) : EXPERIENCIAS_PADRAO;
    return { lista, limites: { ...LIMITES_PADRAO, ...(v.limites || {}) }, completarVazio: v.completarVazio !== false };
  } catch {
    return CONFIG_PADRAO;
  }
}

let cache: { em: number; cfg: ConfigExperiencias } | null = null;
export async function carregarConfigExperiencias(semCache = false): Promise<ConfigExperiencias> {
  if (!semCache && cache && Date.now() - cache.em < 60_000) return cache.cfg;
  try {
    const { data } = await supabase.from('app_config').select('valor').eq('chave', CHAVE_EXPERIENCIAS).maybeSingle();
    const cfg = lerConfig((data as any)?.valor);
    cache = { em: Date.now(), cfg };
    return cfg;
  } catch {
    return CONFIG_PADRAO;
  }
}

export async function salvarConfigExperiencias(cfg: ConfigExperiencias): Promise<string | null> {
  const { error } = await supabase.from('app_config').upsert({ chave: CHAVE_EXPERIENCIAS, valor: JSON.stringify(cfg), atualizado_em: new Date().toISOString() });
  cache = error ? cache : { em: Date.now(), cfg };
  return error ? error.message : null;
}

export function limiteDoPlano(l: Parameters<typeof planoAtivo>[0], lim: LimitesExperiencia): number {
  const p = planoAtivo(l);
  return p ? lim[p] : lim.demais;
}

// Tags que valem para a casa: as primeiras N (pelo plano) entre as da lista.
export function tagsValidas(l: { experiencias?: string[] | null } & Parameters<typeof planoAtivo>[0], cfg: ConfigExperiencias): string[] {
  const slugs = cfg.lista.map((x) => x.slug);
  return ((l?.experiencias as string[]) || []).filter((x) => slugs.includes(x)).slice(0, limiteDoPlano(l, cfg.limites));
}

// Monta o mapa casa -> tags visíveis, completando as tags vazias com as demais casas (se ligado).
export function tagsVisiveis<T extends { id: string; experiencias?: string[] | null } & NonNullable<Parameters<typeof planoAtivo>[0]>>(
  locais: T[], cfg: ConfigExperiencias,
): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const l of locais) mapa.set(l.id, tagsValidas(l, cfg));
  if (cfg.completarVazio) {
    for (const e of cfg.lista) {
      const temPaga = locais.some((l) => (mapa.get(l.id) || []).includes(e.slug));
      if (temPaga) continue;
      for (const l of locais) if (((l.experiencias as string[]) || []).includes(e.slug)) mapa.set(l.id, [...(mapa.get(l.id) || []), e.slug]);
    }
  }
  return mapa;
}
