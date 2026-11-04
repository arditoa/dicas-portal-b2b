// Cupom com dia da semana e horário (migration 078). Dias: 0 = domingo ... 6 = sábado.
// Horário sempre de Brasília (America/Sao_Paulo). Cópia idêntica em app e portal.
export const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function horaCurta(h?: string | null): string {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  const n = Number(hh);
  if (!Number.isFinite(n)) return '';
  return mm && mm !== '00' ? `${n}h${mm}` : `${n}h`;
}

function minutos(h?: string | null): number | null {
  if (!h) return null;
  const [hh, mm] = h.split(':');
  const n = Number(hh), m = Number(mm || 0);
  return Number.isFinite(n) && Number.isFinite(m) ? n * 60 + m : null;
}

// Ex.: "Ter a Qui · até 21h", "Sex, Sáb · das 18h às 22h", "" (sem restrição).
export function textoJanela(dias?: number[] | null, ini?: string | null, fim?: string | null): string {
  const partes: string[] = [];
  const d = Array.from(new Set((dias || []).filter((x) => x >= 0 && x <= 6))).sort((a, b) => a - b);
  if (d.length > 0 && d.length < 7) {
    const grupos: string[] = [];
    let i = 0;
    while (i < d.length) {
      let j = i;
      while (j + 1 < d.length && d[j + 1] === d[j] + 1) j++;
      if (j - i >= 2) grupos.push(`${NOMES_DIAS[d[i]]} a ${NOMES_DIAS[d[j]]}`);
      else for (let k = i; k <= j; k++) grupos.push(NOMES_DIAS[d[k]]);
      i = j + 1;
    }
    partes.push(grupos.length > 1 ? `${grupos.slice(0, -1).join(', ')} e ${grupos[grupos.length - 1]}` : grupos[0]);
  }
  const a = horaCurta(ini), b = horaCurta(fim);
  if (a && b) partes.push(`das ${a} às ${b}`);
  else if (b) partes.push(`até ${b}`);
  else if (a) partes.push(`a partir das ${a}`);
  return partes.join(' · ');
}

function agoraBrasilia(d: Date): { dia: number; min: number } {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.find((x) => x.type === 'weekday')?.value || '');
    const h = Number(p.find((x) => x.type === 'hour')?.value) % 24;
    const m = Number(p.find((x) => x.type === 'minute')?.value);
    if (wd >= 0 && Number.isFinite(h) && Number.isFinite(m)) return { dia: wd, min: h * 60 + m };
  } catch {}
  return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
}

// true quando o cupom vale neste momento (sem restrição = sempre vale).
export function dentroDaJanela(dias?: number[] | null, ini?: string | null, fim?: string | null, agora: Date = new Date()): boolean {
  const { dia, min } = agoraBrasilia(agora);
  if (dias && dias.length > 0 && dias.length < 7 && !dias.includes(dia)) return false;
  const a = minutos(ini), b = minutos(fim);
  if (a === null && b === null) return true;
  if (a === null) return min <= (b as number);
  if (b === null) return min >= a;
  return a <= b ? min >= a && min <= b : min >= a || min <= b;
}
