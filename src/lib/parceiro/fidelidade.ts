// Cartão fidelidade e Histórico de visitas do Modo parceiro.
// REGRAS COPIADAS do portal:
//   - dashboard/fidelidade: 1 cartão por local (o mais antigo); visitas 1–60; brinde obrigatório (120);
//     nome padrão "Cartão fidelidade" (60); observações (300); contagem "no mês" (zera dia 1º) ou "sempre";
//     nível VIP opcional: a partir de 2 visitas (até 200) e, com número, benefício obrigatório (120);
//     "Mostrar no app" e "Programa ativo"; "Entreguei o brinde" (resgatar_fidelidade); confirmar visita pelo código
//     (validar_checkin + contar_visitas_fidelidade). Só o dono (as funções do banco conferem owner_id).
//   - dashboard/checkins: histórico 24h / 2 / 7 / 30 dias (checkins_do_local), situação confirmado/pendente/
//     cancelado, como foi (GPS com distância, automático às 6h, pela casa) e cancelar (visita e cupom voltam atrás).
//     Permissão 'checkins'.
import { supabase } from '../supabase';

export type Janela = 'mes' | 'sempre';
export type Programa = {
  id: string | null;
  nome: string;
  descricao: string;
  visitas: string; // texto do campo (1–60)
  recompensa: string;
  janela: Janela;
  exibir: boolean;
  ativo: boolean;
  vipVisitas: string; // vazio = sem nível VIP
  vipBeneficio: string;
};
export const PROGRAMA_VAZIO: Programa = {
  id: null, nome: 'Cartão fidelidade', descricao: '', visitas: '7', recompensa: '', janela: 'mes', exibir: true, ativo: true, vipVisitas: '', vipBeneficio: '',
};
export const MAX = { nome: 60, recompensa: 120, descricao: 300, beneficio: 120 };

export function traduzirErro(e: { message?: string } | null | undefined): string {
  const m = (e?.message || '').toLowerCase();
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('visitas_vip') || m.includes('beneficio_vip')) return 'O banco ainda não recebeu a fidelidade com nível VIP (migração 081). Avise a equipe Dicas.';
  if (m.includes('janela') || m.includes('exibir_no_app')) return 'O banco ainda não recebeu a fidelidade mensal (migração 074). Avise a equipe Dicas.';
  if (m.includes('row-level') || m.includes('policy') || m.includes('permission denied')) return 'Só o dono do local mexe no cartão fidelidade.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet e tente de novo.';
  return e?.message || 'Algo deu errado. Tente de novo.';
}

export const fraseRegra = (visitas: number, recompensa: string, janela: Janela) =>
  `A cada ${visitas || '…'} visita${visitas === 1 ? '' : 's'}${janela === 'mes' ? ' no mês' : ''}, o cliente ganha: ${recompensa.trim() || '…'}`;

export async function obterPrograma(localId: string): Promise<Programa> {
  const { data, error } = await supabase
    .from('programas_fidelidade')
    .select('id, nome, descricao, visitas_necessarias, recompensa, janela, exibir_no_app, ativo, visitas_vip, beneficio_vip')
    .eq('local_id', localId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(traduzirErro(error));
  const p = data as any;
  if (!p) return { ...PROGRAMA_VAZIO };
  return {
    id: p.id, nome: p.nome, descricao: p.descricao || '', visitas: String(p.visitas_necessarias), recompensa: p.recompensa,
    janela: p.janela === 'sempre' ? 'sempre' : 'mes', exibir: !!p.exibir_no_app, ativo: !!p.ativo,
    vipVisitas: p.visitas_vip ? String(p.visitas_vip) : '', vipBeneficio: p.beneficio_vip || '',
  };
}

export type ErrosPrograma = Partial<Record<'visitas' | 'recompensa' | 'vipVisitas' | 'vipBeneficio', string>>;
export function validarPrograma(p: Programa): ErrosPrograma {
  const e: ErrosPrograma = {};
  const n = parseInt(p.visitas, 10) || 0;
  if (n < 1 || n > 60) e.visitas = 'De 1 a 60 visitas.';
  if (!p.recompensa.trim()) e.recompensa = 'Escreva o que o cliente ganha (ex.: 1 drink grátis).';
  const vip = parseInt(p.vipVisitas, 10) || 0;
  if (p.vipVisitas.trim() && (vip < 2 || vip > 200)) e.vipVisitas = 'O nível VIP vai de 2 a 200 visitas (ou deixe em branco para não usar).';
  if (vip >= 2 && !p.vipBeneficio.trim()) e.vipBeneficio = 'Escreva o que o cliente VIP ganha.';
  return e;
}

export async function salvarPrograma(localId: string, p: Programa): Promise<string> {
  const erro = Object.values(validarPrograma(p))[0];
  if (erro) throw new Error(erro);
  const vip = parseInt(p.vipVisitas, 10) || 0;
  const payload = {
    local_id: localId,
    nome: p.nome.trim() || 'Cartão fidelidade',
    descricao: p.descricao.trim() || null,
    visitas_necessarias: parseInt(p.visitas, 10),
    recompensa: p.recompensa.trim(),
    janela: p.janela,
    exibir_no_app: p.exibir,
    ativo: p.ativo,
    visitas_vip: vip >= 2 ? vip : null,
    beneficio_vip: vip >= 2 ? p.vipBeneficio.trim() : null,
  };
  if (p.id) {
    const { error } = await supabase.from('programas_fidelidade').update(payload).eq('id', p.id);
    if (error) throw new Error(traduzirErro(error));
    return p.id;
  }
  const { data, error } = await supabase.from('programas_fidelidade').insert(payload).select('id').single();
  if (error) throw new Error(traduzirErro(error));
  return (data as { id: string }).id;
}

export type ClienteFid = { user_id: string; nome: string; visitas: number; ultima_visita: string; ja_ganhou: boolean; visitas_periodo: number; visitas_total: number; vip: boolean };
export async function clientesDoPrograma(programaId: string): Promise<ClienteFid[]> {
  const { data, error } = await supabase.rpc('fidelidade_clientes', { p_programa_id: programaId });
  if (error) return [];
  return (data as ClienteFid[]) || [];
}

export async function entregarBrinde(programaId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('resgatar_fidelidade', { p_programa_id: programaId, p_user_id: userId });
  if (error) throw new Error(traduzirErro(error));
}

// Confirma a visita pelo código de 6 letras e devolve quantas visitas o cliente tem no cartão.
export async function confirmarVisita(codigo: string, programaId: string | null, ativo: boolean): Promise<{ userId: string | null; nome: string; visitas: number | null }> {
  const { data, error } = await supabase.rpc('validar_checkin', { p_codigo: codigo.trim().toUpperCase() });
  if (error) {
    const m = (error.message || '').toLowerCase();
    if (m.includes('não encontrado') || m.includes('nao encontrado') || m.includes('invál')) throw new Error('Código não encontrado. Confira as letras.');
    throw new Error(error.message);
  }
  const c = data as { user_id: string } | null;
  let nome = 'Cliente';
  let visitas: number | null = null;
  if (c?.user_id) {
    const { data: p } = await supabase.from('perfis_publicos').select('display_name').eq('id', c.user_id).maybeSingle();
    if ((p as any)?.display_name) nome = (p as any).display_name;
    if (programaId && ativo) {
      const { data: n } = await supabase.rpc('contar_visitas_fidelidade', { p_programa_id: programaId, p_user_id: c.user_id });
      if (typeof n === 'number') visitas = n;
    }
  }
  return { userId: c?.user_id ?? null, nome, visitas };
}

// ---------- histórico ----------
export type Visita = { checkin_id: string; criado_em: string; cliente: string; cupom: string | null; metodo: string | null; situacao: 'confirmado' | 'pendente' | 'cancelado'; distancia: number | null; codigo_checkin: string };
export const PERIODOS = [
  { dias: 1, rotulo: '24 horas' },
  { dias: 2, rotulo: '2 dias' },
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
];
export function comoFoi(v: Visita): string {
  if (v.situacao === 'pendente') return 'esperando confirmação (entra sozinho às 6h)';
  if (v.situacao === 'cancelado') return 'cancelado pela casa';
  if (v.metodo === 'gps') return v.distancia != null ? `pela localização (${v.distancia} m da casa)` : 'pela localização';
  if (v.metodo === 'automatico') return 'confirmado no fim da noite';
  return 'confirmado pela casa';
}
export async function historico(localId: string, dias: number): Promise<Visita[]> {
  const { data, error } = await supabase.rpc('checkins_do_local', { p_local_id: localId, p_dias: dias });
  if (error) throw new Error(/does not exist/i.test(error.message) ? 'O banco ainda não recebeu esta atualização. Avise a equipe Dicas.' : traduzirErro(error));
  return (data as Visita[]) || [];
}
export async function cancelarVisita(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_checkin_local', { p_checkin_id: id });
  if (error) throw new Error(traduzirErro(error));
}
