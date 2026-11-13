// Agenda da semana do Modo parceiro. REGRA COPIADA de portal-b2b-lgbt/src/app/dashboard/agenda/page.tsx:
//  - public.agenda_semanal (migrations 023 + 073). Cada dia pode ter "só nesta semana" (linha com `data`)
//    ou "toda semana" (linha sem `data`, repete naquele dia). Se tiver as duas, vale a datada.
//  - Cartaz da semana = linha tipo 'semana' com data = segunda-feira.
//  - Fotos no bucket fotos-locais em "<local_id>/agenda-<chave>-<hora>.<ext>".
//  - Aparece só no app, em Eventos › Essa semana (não aparece na página da casa).
// Destaque (migração 101): destacar_agenda_do_plano + cota única festas_do_plano_no_mes (4 por mês).
import { chaveData, dataDaChave } from '../../components/parceiro/form/CampoData';
import { supabase } from '../supabase';

export const NOMES_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const LIMITE_DESTAQUES = 4;

type Linha = {
  id: string; dia_semana: number; data: string | null; tipo: string; titulo: string;
  descricao: string | null; horario: string | null; foto_url: string | null; link: string | null; ativo: boolean;
};

export type DiaAgenda = {
  chave: string; // AAAA-MM-DD
  diaSemana: number;
  passou: boolean;
  datadaId: string | null;
  fixaId: string | null;
  modo: 'semana' | 'toda';
  titulo: string;
  horario: string;
  descricao: string;
  foto_url: string;
  link: string;
  ativo: boolean;
};
export type CartazAgenda = { id: string | null; titulo: string; descricao: string; foto_url: string; link: string; ativo: boolean };

export const cartazVazio = (): CartazAgenda => ({ id: null, titulo: '', descricao: '', foto_url: '', link: '', ativo: true });
export const idDoDia = (d: DiaAgenda) => d.datadaId || d.fixaId;

export function segundaDaSemana(offsetSemanas: number): Date {
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  base.setDate(base.getDate() - ((base.getDay() + 6) % 7) + offsetSemanas * 7);
  return base;
}
export const somarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function traduzirErro(e: { message?: string } | null | undefined): string {
  const m = (e?.message || '').toLowerCase();
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('row-level') || m.includes('policy') || m.includes('permission denied') || m.includes('42501'))
    return 'Seu acesso não permite mudar a agenda deste local. Fale com o dono.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet e tente de novo.';
  if (m.includes('function') && m.includes('does not exist')) return 'O banco ainda não recebeu esta atualização. Avise a equipe Dicas.';
  // As funções do banco já respondem em português (ex.: "Seu plano já usou os 4 destaques deste mês.").
  return e?.message || 'Algo deu errado. Tente de novo.';
}

function montarDias(segunda: Date, linhas: Linha[]): DiaAgenda[] {
  const hoje = chaveData(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = somarDias(segunda, i);
    const chave = chaveData(d);
    const dow = d.getDay();
    const datada = linhas.find((l) => l.tipo === 'dia' && l.data === chave) || null;
    const fixa = linhas.find((l) => l.tipo === 'dia' && !l.data && l.dia_semana === dow) || null;
    const ex = datada || fixa;
    return {
      chave, diaSemana: dow, passou: chave < hoje,
      datadaId: datada?.id || null, fixaId: fixa?.id || null,
      modo: datada ? 'semana' : fixa ? 'toda' : 'semana',
      titulo: ex?.titulo === '(sem título)' ? '' : ex?.titulo || '',
      horario: ex?.horario || '', descricao: ex?.descricao || '', foto_url: ex?.foto_url || '', link: ex?.link || '',
      ativo: ex ? ex.ativo : true,
    };
  });
}

export async function listarSemana(localId: string, offset: number): Promise<{ dias: DiaAgenda[]; cartaz: CartazAgenda }> {
  const seg = segundaDaSemana(offset);
  const dom = somarDias(seg, 6);
  const { data, error } = await supabase
    .from('agenda_semanal')
    .select('id, dia_semana, data, tipo, titulo, descricao, horario, foto_url, link, ativo')
    .eq('local_id', localId)
    .or(`data.is.null,and(data.gte.${chaveData(seg)},data.lte.${chaveData(dom)})`);
  if (error) throw new Error(traduzirErro(error));
  const linhas = (data || []) as Linha[];
  const c = linhas.find((l) => l.tipo === 'semana' && l.data === chaveData(seg));
  return {
    dias: montarDias(seg, linhas),
    cartaz: c
      ? { id: c.id, titulo: c.titulo === '(sem título)' ? '' : c.titulo, descricao: c.descricao || '', foto_url: c.foto_url || '', link: c.link || '', ativo: c.ativo }
      : cartazVazio(),
  };
}

export function validarDia(d: DiaAgenda): string | null {
  if (!d.titulo.trim()) return `Escreva o que rola ${d.diaSemana === 0 || d.diaSemana === 6 ? 'no' : 'na'} ${NOMES_DIA[d.diaSemana].toLowerCase()}.`;
  return null;
}

export async function salvarDia(localId: string, dia: DiaAgenda): Promise<void> {
  const erro = validarDia(dia);
  if (erro) throw new Error(erro);
  const base = {
    local_id: localId, tipo: 'dia', dia_semana: dia.diaSemana, titulo: dia.titulo.trim(),
    horario: dia.horario.trim() || null, descricao: dia.descricao.trim() || null,
    foto_url: dia.foto_url || null, link: dia.link.trim() || null, ativo: dia.ativo,
  };
  const t = () => supabase.from('agenda_semanal');
  if (dia.modo === 'toda') {
    const payload = { ...base, data: null };
    const r = dia.fixaId ? await t().update(payload).eq('id', dia.fixaId) : await t().insert(payload);
    if (r.error) throw new Error(traduzirErro(r.error));
    if (dia.datadaId) {
      // virou "toda semana": a versão só desta semana não precisa mais existir
      const d = await t().delete().eq('id', dia.datadaId);
      if (d.error) throw new Error(traduzirErro(d.error));
    }
  } else {
    const payload = { ...base, data: dia.chave };
    const r = dia.datadaId ? await t().update(payload).eq('id', dia.datadaId) : await t().insert(payload);
    if (r.error) throw new Error(traduzirErro(r.error));
  }
}

// Apaga o que está valendo no dia (a datada, se existir; senão a que repete toda semana).
export async function limparDia(dia: DiaAgenda): Promise<void> {
  const id = idDoDia(dia);
  if (!id) return;
  const { error } = await supabase.from('agenda_semanal').delete().eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}

export async function salvarCartaz(localId: string, chaveSegunda: string, c: CartazAgenda): Promise<void> {
  if (!c.foto_url && !c.descricao.trim()) throw new Error('Envie a imagem do cartaz ou escreva a programação.');
  const payload = {
    local_id: localId, tipo: 'semana', data: chaveSegunda, dia_semana: 1,
    titulo: c.titulo.trim() || 'Programação da semana', descricao: c.descricao.trim() || null,
    foto_url: c.foto_url || null, link: c.link.trim() || null, horario: null, ativo: c.ativo,
  };
  const r = c.id ? await supabase.from('agenda_semanal').update(payload).eq('id', c.id) : await supabase.from('agenda_semanal').insert(payload);
  if (r.error) throw new Error(traduzirErro(r.error));
}

export async function removerCartaz(id: string): Promise<void> {
  const { error } = await supabase.from('agenda_semanal').delete().eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}

// ---------- destaque com o plano (migração 101) ----------
export const chaveDestaque = (agendaId: string, dataInicio: string) => `${agendaId}|${dataInicio}`;

// Destaques ainda no ar deste local (o dono lê os dele pela RLS da 101).
export async function listarDestaques(localId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('destaques_agenda')
    .select('agenda_id, data_inicio')
    .eq('local_id', localId)
    .gte('data_fim', chaveData(new Date()));
  if (error) return new Set();
  return new Set(((data || []) as { agenda_id: string; data_inicio: string }[]).map((d) => chaveDestaque(d.agenda_id, d.data_inicio)));
}

// Fundador/Premium ativo ou selo Membro Fundador (mesma função que o banco usa para travar).
export async function temDestaqueNoPlano(localId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('marca_tem_festa_do_plano', { p_local: localId });
  return !error && data === true;
}

// Quantos dos 4 do mês já foram usados (festas do plano + agenda), no mês da data.
export async function destaquesUsadosNoMes(localId: string, data: string): Promise<number | null> {
  const { data: n, error } = await supabase.rpc('festas_do_plano_no_mes', { p_local: localId, p_data: `${data}T12:00:00-03:00` });
  return error ? null : Number(n) || 0;
}

export async function destacar(agendaId: string, data: string, ligar: boolean): Promise<{ usadas: number; limite: number }> {
  const { data: r, error } = await supabase.rpc('destacar_agenda_do_plano', { p_agenda: agendaId, p_data: data, p_ligar: ligar });
  if (error) throw new Error(traduzirErro(error));
  const j = (r || {}) as { usadas?: number; limite?: number };
  return { usadas: Number(j.usadas) || 0, limite: Number(j.limite) || LIMITE_DESTAQUES };
}

export const nomeDoMes = (data: string) => dataDaChave(data).toLocaleDateString('pt-BR', { month: 'long' });

// ---------- compartilhar ----------
// Link que abre a página da casa no app (esquema "dicaslgbt" do app.json). Ainda não há página pública
// da casa na web; quando houver, troque aqui (vale para todo o Modo parceiro).
export const URL_SITE = 'https://www.dicaslgbt.com.br';
export const linkDaCasa = (localId: string) => `dicaslgbt://business/${localId}`;

export function textoDaAgenda(nomeLocal: string, localId: string, dias: DiaAgenda[], cartaz: CartazAgenda): string {
  const fmt = (k: string) => {
    const d = dataDaChave(k);
    return `${NOMES_DIA[d.getDay()].slice(0, 3)} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const linhas = dias
    .filter((d) => idDoDia(d) && d.ativo && !d.passou && d.titulo.trim())
    .map((d) => `• ${fmt(d.chave)}: ${d.titulo.trim()}${d.horario.trim() ? ` · ${d.horario.trim()}` : ''}`);
  const corpo = linhas.length ? linhas.join('\n') : cartaz.id && cartaz.descricao.trim() ? cartaz.descricao.trim() : 'Vem conferir a programação!';
  return `🏳️‍🌈 Agenda da semana no ${nomeLocal}\n\n${corpo}\n\nVeja no app Dicas LGBT+: ${linkDaCasa(localId)}\nBaixe o app: ${URL_SITE}`;
}
