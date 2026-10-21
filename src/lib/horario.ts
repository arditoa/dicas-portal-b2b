// "Aberto agora" a partir de locais.horario_funcionamento
// ({"segunda": {"aberto": true, "abre": "18:00", "fecha": "02:00"}, ...}).
// Dia ausente = não informado → não entra. Funciona também quando fecha
// depois da meia-noite (abre 18:00, fecha 02:00). Usado na Home e na
// página de seção "O que fazer hoje".
const DIAS_CHAVE = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

type ComHorario = { horario_funcionamento?: any };

function minutos(hhmm?: string | null): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function horarioDe(item: ComHorario, dia: number) {
  return item.horario_funcionamento?.[DIAS_CHAVE[dia]] || null;
}

export function abertoAgora(item: ComHorario, agora = new Date()): boolean {
  const nowMin = agora.getHours() * 60 + agora.getMinutes();
  const hoje = horarioDe(item, agora.getDay());
  if (hoje?.aberto) {
    const a = minutos(hoje.abre);
    const f = minutos(hoje.fecha);
    if (a != null && f != null && (f > a ? nowMin >= a && nowMin < f : nowMin >= a)) return true;
  }
  // virada de ontem pra hoje (ex.: abriu sexta 22h, fecha sábado 04h)
  const ontem = horarioDe(item, (agora.getDay() + 6) % 7);
  if (ontem?.aberto) {
    const a = minutos(ontem.abre);
    const f = minutos(ontem.fecha);
    if (a != null && f != null && f < a && nowMin < f) return true;
  }
  return false;
}

export function fechaAs(item: ComHorario): string | null {
  const hoje = horarioDe(item, new Date().getDay());
  return hoje?.aberto && hoje?.fecha ? hoje.fecha : null;
}
