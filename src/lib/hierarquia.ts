// Nov/2026 — Hierarquia dos planos (pedido da Andrea, 18/11): Fundador > Premium > Intermediário > demais.
// Dentro do mesmo plano, quem se cadastrou primeiro vem antes (locais.created_at).
// Usada em "Hoje na cidade" (festas + agenda dos bares) e em "Experiências".
export type ComPlano = { plano_comercial?: string | null; plano_comercial_status?: string | null; created_at?: string | null } | null | undefined;

export function planoAtivo(l: ComPlano): 'fundador' | 'premium' | 'intermediario' | null {
  if (!l || (l.plano_comercial_status && l.plano_comercial_status !== 'ativo')) return null;
  const p = l.plano_comercial;
  return p === 'fundador' || p === 'premium' || p === 'intermediario' ? p : null;
}

// 0 Fundador · 1 Premium · 2 Intermediário · 3 demais
export function rankPlano(l: ComPlano): number {
  const p = planoAtivo(l);
  return p === 'fundador' ? 0 : p === 'premium' ? 1 : p === 'intermediario' ? 2 : 3;
}

const tempo = (s?: string | null) => (s ? new Date(s).getTime() : Number.MAX_SAFE_INTEGER);

// Compara dois locais: plano primeiro, depois ordem de cadastro.
export function compararHierarquia(a: ComPlano, b: ComPlano): number {
  return rankPlano(a) - rankPlano(b) || tempo(a?.created_at) - tempo(b?.created_at);
}
