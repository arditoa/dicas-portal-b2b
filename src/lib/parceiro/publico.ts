// Modo parceiro — "Eu vou" da casa e Relatório de público (migrações 113 e 114).
//   • euVouDoLocal: quantas pessoas marcaram "Eu vou" em cada festa / item da agenda que ainda não acabou.
//     Só números, nunca quem (eu_vou_do_local; 'festa', 'resultados', 'lista_vip' ou 'porta').
//   • relatorio: números somados da casa num período ou de uma festa (relatorio_publico). Menos de 30 pessoas
//     = "dados insuficientes"; grupos com menos de 10 = "menos de 10"; o resto arredondado de 5 em 5.
//     Premium e Fundador (o banco confere); admin gera de qualquer casa no /admin.
import { supabase } from '../supabase';

export type EuVouDoLocal = { porEvento: Record<string, number>; porAgenda: Record<string, number>; total: number };
export async function euVouDoLocal(localId: string): Promise<EuVouDoLocal | null> {
  const { data, error } = await supabase.rpc('eu_vou_do_local', { p_local: localId });
  if (error) return null; // sem a 113 ou sem permissão: não mostra
  const r: EuVouDoLocal = { porEvento: {}, porAgenda: {}, total: 0 };
  for (const x of (data as { evento_id: string | null; agenda_id: string | null; data: string; total: number }[]) || []) {
    const n = Number(x.total) || 0;
    r.total += n;
    if (x.evento_id) r.porEvento[x.evento_id] = n;
    else if (x.agenda_id) r.porAgenda[`${x.agenda_id}:${x.data}`] = n;
  }
  return r;
}
export const vao = (n: number) => (n === 1 ? '1 vai' : `${n} vão`);

// ---------- Relatório ----------
export type Num = number | string; // "menos de 10"
export type Grupo = { valor: string; n: Num };
export type Relatorio = {
  status: 'ok' | 'dados_insuficientes';
  local: { id: string; nome: string };
  evento: { id: string; titulo: string; data_inicio: string } | null;
  de: string;
  ate: string;
  gerado_em: string;
  regras: { minimo_pessoas: number; grupo_minimo: number; arredondamento: number };
  pessoas?: Num;
  novas?: Num;
  recorrentes?: Num;
  idade?: Record<string, Num>;
  chegada_hora?: { hora: number; n: Num }[];
  chegada_dia?: { dia: number; n: Num }[];
  gostos?: { musica: Grupo[]; experiencia: Grupo[]; responderam: Num };
  genero?: { consentiram: Num; grupos: Grupo[]; outros_ocultos: boolean };
  totais?: { checkins: Num; lista_pedidos: Num; lista_aprovados: Num; lista_entraram: Num; cupons_usados: Num; eu_vou: Num };
};
export type Escopo = { evento: string } | { de: string; ate: string };

export async function relatorio(localId: string, escopo: Escopo): Promise<Relatorio> {
  const { data, error } = await supabase.rpc('relatorio_publico', {
    p_local: localId,
    p_evento: 'evento' in escopo ? escopo.evento : null,
    p_de: 'de' in escopo ? escopo.de : null,
    p_ate: 'ate' in escopo ? escopo.ate : null,
  });
  if (error) {
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) throw new Error('O relatório ainda não está ligado. Peça à equipe Dicas para rodar a atualização 114.');
    throw new Error(error.message || 'Não deu para gerar o relatório.');
  }
  return data as Relatorio;
}

export const IDADES = ['18–24', '25–34', '35–44', '45+'];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const texto = (n: Num | undefined) => (n == null ? '—' : typeof n === 'number' ? n.toLocaleString('pt-BR') : n);
// Para desenhar barras: "menos de 10" vira um tracinho (5), nunca o número de verdade.
export const valorBarra = (n: Num | undefined) => (typeof n === 'number' ? n : n ? 5 : 0);
export const porcento = (n: Num | undefined, total: Num | undefined) =>
  typeof n === 'number' && typeof total === 'number' && total > 0 ? `${Math.round((n / total) * 100)}%` : '';
// "Hoje" e "N dias atrás" no fuso de Brasília (YYYY-MM-DD).
export const diaBrasilia = (deslocamentoDias = 0) =>
  new Date(Date.now() + deslocamentoDias * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
