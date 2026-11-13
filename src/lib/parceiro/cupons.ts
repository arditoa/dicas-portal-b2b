// Cupons do Modo parceiro (telas Cupons e Novo/Editar cupom).
// REGRAS COPIADAS de portal-b2b-lgbt/src/app/dashboard/cupons/page.tsx:
//   - título obrigatório; descrição (regra), código em maiúsculas, validade e limite de uso (≥ 1) opcionais;
//   - dias da semana (nenhum ou os 7 = todos → grava null) e horário de início/fim (horário de Brasília);
//     o check-in do cliente só libera o cupom nessa janela (migração 078, src/lib/janelaCupom.ts);
//   - limite por plano (uso_ofertas_periodo, 075/104): Premium e Fundador 1 a cada 7 dias, Intermediário
//     1 a cada 14; Gratuito não cria cupom (trava no banco, 104). O banco é quem trava; o app só explica;
//   - ativar/desativar = pausar/retomar.
// Diferenças de propósito: o app não apaga cupom (apagar libera a cota do período e apaga os usos);
// "válido até" vale até 23h59 do dia escolhido (o portal gravava meia-noite UTC, 21h do dia anterior).
// Uso de cada cupom: uso_dos_cupons (migração 106; só a contagem, nunca quem usou).
import { supabase } from '../supabase';

export type Cupom = {
  id: string;
  titulo: string;
  descricao: string | null;
  codigo: string | null;
  valido_de: string | null;
  valido_ate: string | null;
  limite_uso: number | null;
  dias_semana: number[] | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  ativo: boolean;
  created_at: string;
  // Aparência opcional na faixa de Ofertas (migração 109, "um cupom, dois lugares")
  vitrine_oferta?: string | null;
  vitrine_detalhe?: string | null;
  vitrine_foto_url?: string | null;
  vitrine_estilo?: string | null;
  vitrine_cor1?: string | null;
  vitrine_cor2?: string | null;
  vitrine_cor_texto?: string | null;
};
const CAMPOS = 'id, titulo, descricao, codigo, valido_de, valido_ate, limite_uso, dias_semana, hora_inicio, hora_fim, ativo, created_at';
const CAMPOS_VITRINE = 'vitrine_oferta, vitrine_detalhe, vitrine_foto_url, vitrine_estilo, vitrine_cor1, vitrine_cor2, vitrine_cor_texto';
export const MAX_VITRINE_OFERTA = 24;
export const MAX_VITRINE_DETALHE = 30;

export type UsoPlano = { plano: string; periodo: 'dias' | 'mes'; limite: number | null; usadas: number; dias: number; liberaEm: string | null };
export type UsoCupom = { resgates: number; ultimoUso: string | null };

export const MAX_TITULO = 80;
export const MAX_REGRA = 300;
export const MAX_CODIGO = 20;

const pad = (n: number) => String(n).padStart(2, '0');
export const ddmm = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
export const chaveHoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function traduzirErro(e: { message?: string } | null | undefined): string {
  const m = (e?.message || '').toLowerCase();
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('row-level') || m.includes('policy') || m.includes('permission denied')) return 'Seu acesso não permite mudar os cupons deste local. Fale com o dono.';
  if (m.includes('cupons_dias_semana_valido')) return 'Confira os dias da semana do cupom.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet e tente de novo.';
  if (m.includes('does not exist')) return 'O banco ainda não recebeu esta atualização. Avise a equipe Dicas.';
  // Os gatilhos do banco já respondem em português ("Seu plano permite 1 cupom a cada 7 dias…",
  // "Os cupons aparecem na página da casa… planos pagos.").
  return e?.message || 'Algo deu errado. Tente de novo.';
}

// ---------- situação ----------
export type Situacao = { txt: string; cor: string; noAr: boolean };
export function situacaoDoCupom(c: Pick<Cupom, 'ativo' | 'valido_de' | 'valido_ate' | 'limite_uso'>, uso?: UsoCupom, agora = Date.now()): Situacao {
  if (c.valido_ate && new Date(c.valido_ate).getTime() < agora) return { txt: 'Vencido', cor: '#A0A0B2', noAr: false };
  if (!c.ativo) return { txt: 'Pausado', cor: '#E1A93A', noAr: false };
  if (c.limite_uso != null && uso && uso.resgates >= c.limite_uso) return { txt: 'Esgotado', cor: '#A0A0B2', noAr: false };
  if (c.valido_de && new Date(c.valido_de).getTime() > agora) return { txt: `Começa ${ddmm(c.valido_de)}`, cor: '#3FA0A7', noAr: false };
  return { txt: 'No ar', cor: '#4CAF7D', noAr: true };
}

// "Liberado agora" / "Libera dd/mm" (mesma etiqueta da lousa e da Divulgar).
export function etiquetaDoPlano(u: UsoPlano | null): { txt: string; livre: boolean } | null {
  if (!u) return null;
  if (u.limite == null) return { txt: 'Liberado agora', livre: true };
  if (u.usadas < u.limite) return { txt: 'Liberado agora', livre: true };
  return { txt: u.liberaEm ? `Libera ${ddmm(u.liberaEm)}` : 'Já usado neste período', livre: false };
}
export function textoDoLimite(u: UsoPlano | null): string | null {
  if (!u) return null;
  if (u.periodo === 'dias' && u.limite != null) {
    return `Seu plano libera ${u.limite} cupom a cada ${u.dias} dias${u.dias === 7 ? ' (1 por semana)' : u.dias === 14 ? ' (1 a cada 2 semanas)' : ''}. Nos últimos ${u.dias} dias: ${u.usadas}.`;
  }
  if (u.periodo === 'mes' && u.limite != null) return `Seu plano libera ${u.limite} cupom(ns) por mês. Neste mês: ${u.usadas}.`;
  return null;
}

// ---------- leitura ----------
export async function listarCupons(localId: string): Promise<Cupom[]> {
  const { data, error } = await supabase.from('cupons').select(CAMPOS).eq('local_id', localId).order('created_at', { ascending: false }).limit(60);
  if (error) throw new Error(traduzirErro(error));
  return (data as unknown as Cupom[]) || [];
}

export async function obterCupom(id: string): Promise<Cupom | null> {
  let r: any = await supabase.from('cupons').select(`${CAMPOS}, ${CAMPOS_VITRINE}`).eq('id', id).maybeSingle();
  if (r.error) r = await supabase.from('cupons').select(CAMPOS).eq('id', id).maybeSingle(); // sem a 109
  if (r.error) throw new Error(traduzirErro(r.error));
  return (r.data as Cupom) || null;
}

export async function usoDoPlano(localId: string): Promise<UsoPlano | null> {
  const { data, error } = await supabase.rpc('uso_ofertas_periodo', { p_local_id: localId });
  if (error) return null;
  const l = (Array.isArray(data) ? data[0] : data) as { plano: string; periodo: string; limite: number | null; usadas: number; dias: number; libera_em: string | null } | null;
  if (!l) return null;
  return { plano: l.plano, periodo: l.periodo === 'mes' ? 'mes' : 'dias', limite: l.limite ?? null, usadas: Number(l.usadas) || 0, dias: Number(l.dias) || 7, liberaEm: l.libera_em ?? null };
}

// Sem a 106 (ou sem permissão), devolve vazio e a tela só não mostra o uso.
export async function usoDosCupons(localId: string): Promise<Record<string, UsoCupom>> {
  const { data, error } = await supabase.rpc('uso_dos_cupons', { p_local: localId });
  if (error || !data) return {};
  return Object.fromEntries(((data as { cupom_id: string; resgates: number; ultimo_uso: string | null }[]) || [])
    .map((x) => [x.cupom_id, { resgates: Number(x.resgates) || 0, ultimoUso: x.ultimo_uso }]));
}

// ---------- formulário ----------
export type FormCupom = {
  id: string | null;
  titulo: string;
  descricao: string;
  codigo: string;
  validoAte: string | null; // AAAA-MM-DD
  limiteUso: string; // vazio = sem limite
  dias: number[]; // vazio = todos
  horaInicio: string | null;
  horaFim: string | null;
  ativo: boolean;
  validoDe: string | null; // preservado do cadastro (o portal não preenche)
  // Aparência na faixa de Ofertas. Oferta vazia = automático (como antes).
  vitrine: { oferta: string; detalhe: string; foto: string | null; estilo: 'degrade' | 'foto'; cor1: string | null; cor2: string | null; corTexto: string | null };
};
const VITRINE_VAZIA: FormCupom['vitrine'] = { oferta: '', detalhe: '', foto: null, estilo: 'degrade', cor1: null, cor2: null, corTexto: null };

export function formVazio(): FormCupom {
  return { id: null, titulo: '', descricao: '', codigo: '', validoAte: null, limiteUso: '', dias: [], horaInicio: null, horaFim: null, ativo: true, validoDe: null, vitrine: { ...VITRINE_VAZIA } };
}

export function formDoCupom(c: Cupom): FormCupom {
  const dataDe = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  return {
    id: c.id, titulo: c.titulo, descricao: c.descricao || '', codigo: c.codigo || '',
    validoAte: dataDe(c.valido_ate), limiteUso: c.limite_uso ? String(c.limite_uso) : '',
    dias: c.dias_semana && c.dias_semana.length < 7 ? [...c.dias_semana].sort((a, b) => a - b) : [],
    horaInicio: c.hora_inicio ? c.hora_inicio.slice(0, 5) : null, horaFim: c.hora_fim ? c.hora_fim.slice(0, 5) : null,
    ativo: c.ativo, validoDe: c.valido_de,
    vitrine: {
      oferta: c.vitrine_oferta || '', detalhe: c.vitrine_detalhe || '', foto: c.vitrine_foto_url || null,
      estilo: c.vitrine_estilo === 'foto' ? 'foto' : 'degrade', cor1: c.vitrine_cor1 || null, cor2: c.vitrine_cor2 || null, corTexto: c.vitrine_cor_texto || null,
    },
  };
}

export type ErrosCupom = Partial<Record<'titulo' | 'limite' | 'validade' | 'vitrine', string>>;
export function validarCupom(f: FormCupom, usadas = 0): ErrosCupom {
  const e: ErrosCupom = {};
  if (!f.titulo.trim()) e.titulo = 'Escreva o que o cliente ganha.';
  if (f.limiteUso.trim()) {
    const n = Number(f.limiteUso);
    if (!Number.isInteger(n) || n < 1) e.limite = 'Use um número inteiro (1 ou mais), ou deixe vazio para sem limite.';
    else if (f.id && n < usadas) e.limite = `Este cupom já foi usado ${usadas} vezes. Use ${usadas} ou mais.`;
  }
  if (!f.id && f.validoAte && f.validoAte < chaveHoje()) e.validade = 'A data já passou.';
  const v = f.vitrine;
  if (v.oferta.trim().length > MAX_VITRINE_OFERTA) e.vitrine = `A oferta em destaque tem até ${MAX_VITRINE_OFERTA} letras.`;
  else if (v.detalhe.trim().length > MAX_VITRINE_DETALHE) e.vitrine = `O detalhe tem até ${MAX_VITRINE_DETALHE} letras.`;
  else if (v.oferta.trim() && v.estilo === 'foto' && !v.foto) e.vitrine = 'Suba a foto do cartão (ou escolha "Degradê").';
  else if (!v.oferta.trim() && (v.detalhe.trim() || v.foto)) e.vitrine = 'Escreva a oferta em destaque (ou deixe tudo vazio para o cartão automático).';
  return e;
}

// Válido até o fim do dia escolhido, no horário de Brasília.
const fimDoDia = (k: string) => `${k}T23:59:59-03:00`;

export async function salvarCupom(localId: string, f: FormCupom, usadas = 0): Promise<string> {
  const erro = Object.values(validarCupom(f, usadas))[0];
  if (erro) throw new Error(erro);
  const campos = {
    titulo: f.titulo.trim(),
    descricao: f.descricao.trim() || null,
    codigo: f.codigo.trim().toUpperCase() || null,
    valido_ate: f.validoAte ? fimDoDia(f.validoAte) : null,
    limite_uso: f.limiteUso.trim() ? Number(f.limiteUso) : null,
    dias_semana: f.dias.length > 0 && f.dias.length < 7 ? [...f.dias].sort((a, b) => a - b) : null,
    hora_inicio: f.horaInicio || null,
    hora_fim: f.horaFim || null,
    ativo: f.ativo,
  };
  // Aparência na faixa (109). Sem oferta em destaque = tudo null = cartão automático.
  const v = f.vitrine;
  const proprio = !!v.oferta.trim();
  const vitrine = {
    vitrine_oferta: proprio ? v.oferta.trim() : null,
    vitrine_detalhe: proprio ? v.detalhe.trim() || null : null,
    vitrine_estilo: proprio ? v.estilo : null,
    vitrine_foto_url: proprio && v.estilo === 'foto' ? v.foto : null,
    vitrine_cor1: proprio ? v.cor1 : null,
    vitrine_cor2: proprio ? v.cor2 : null,
    vitrine_cor_texto: proprio ? v.corTexto : null,
  };
  // Só a coluna que não existe (banco sem a 109). Regra violada (cupons_vitrine_valida) é erro de verdade.
  const semColunas = (e: { message?: string } | null) => !!e && /vitrine_/.test(e.message || '') && /does not exist|schema cache|could not find/i.test(e.message || '');
  if (f.id) {
    let { error } = await supabase.from('cupons').update({ ...campos, ...vitrine }).eq('id', f.id);
    if (semColunas(error)) { ultimoAvisoVitrine = AVISO_SEM_109; ({ error } = await supabase.from('cupons').update(campos).eq('id', f.id)); } else ultimoAvisoVitrine = null;
    if (error) throw new Error(traduzirErro(error));
    return f.id;
  }
  let r = await supabase.from('cupons').insert({ local_id: localId, ...campos, ...vitrine }).select('id').maybeSingle();
  if (semColunas(r.error)) { ultimoAvisoVitrine = AVISO_SEM_109; r = await supabase.from('cupons').insert({ local_id: localId, ...campos }).select('id').maybeSingle(); } else ultimoAvisoVitrine = null;
  if (r.error) throw new Error(traduzirErro(r.error));
  return (r.data as { id: string } | null)?.id || '';
}

const AVISO_SEM_109 = 'O cupom foi salvo, mas a aparência na faixa de Ofertas ainda não: falta a atualização 109 no banco. Avise a equipe Dicas.';
// Aviso do último salvarCupom (aparência não gravada porque o banco não tem a 109).
let ultimoAvisoVitrine: string | null = null;
export const avisoDaAparencia = () => ultimoAvisoVitrine;

export async function pausarCupom(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('cupons').update({ ativo }).eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}
