// Horário de funcionamento por dia da semana (Rodada 35) — ver
// 020_horario_funcionamento_galeria_e_fix_foto_evento.sql pra explicação
// do formato gravado em `locais.horario_funcionamento` (jsonb).
//
// Chaves fixas em português sem acento, pra bater exatamente com o que é
// gravado no banco -- nunca renomear sem migrar os dados já salvos.
export const DIAS_SEMANA = [
  { chave: 'segunda', label: 'Segunda' },
  { chave: 'terca', label: 'Terça' },
  { chave: 'quarta', label: 'Quarta' },
  { chave: 'quinta', label: 'Quinta' },
  { chave: 'sexta', label: 'Sexta' },
  { chave: 'sabado', label: 'Sábado' },
  { chave: 'domingo', label: 'Domingo' },
] as const;

export type HorarioDia = {
  aberto: boolean;
  abre?: string;
  fecha?: string;
  musica_ao_vivo?: string;
};

export type HorarioFuncionamento = Record<string, HorarioDia>;

export function horarioFuncionamentoVazio(): HorarioFuncionamento {
  const obj: HorarioFuncionamento = {};
  DIAS_SEMANA.forEach((d) => {
    obj[d.chave] = { aberto: false };
  });
  return obj;
}

// Usado ao carregar um horário já salvo (dashboard/perfil) -- garante que
// os 7 dias sempre existem no objeto, mesmo que o registro salvo seja
// antigo/vazio ({} ou faltando algum dia).
export function normalizarHorarioFuncionamento(
  h: HorarioFuncionamento | null | undefined
): HorarioFuncionamento {
  const base = horarioFuncionamentoVazio();
  if (!h) return base;
  DIAS_SEMANA.forEach((d) => {
    if (h[d.chave]) base[d.chave] = { ...h[d.chave] };
  });
  return base;
}

// Limpa antes de gravar: um dia marcado como fechado nunca guarda
// horário nenhum junto (evita lixo tipo abre/fecha preenchido com
// aberto=false, que ninguém nunca vai ler de volta).
export function limparHorarioFuncionamento(h: HorarioFuncionamento): HorarioFuncionamento {
  const limpo: HorarioFuncionamento = {};
  DIAS_SEMANA.forEach((d) => {
    const dia = h[d.chave];
    if (!dia || !dia.aberto) {
      limpo[d.chave] = { aberto: false };
    } else {
      limpo[d.chave] = {
        aberto: true,
        ...(dia.abre ? { abre: dia.abre } : {}),
        ...(dia.fecha ? { fecha: dia.fecha } : {}),
        ...(dia.musica_ao_vivo ? { musica_ao_vivo: dia.musica_ao_vivo } : {}),
      };
    }
  });
  return limpo;
}
