// Início do portal no app (Etapa 11): diagnóstico, lembretes e primeiros passos.
// REGRAS COPIADAS de portal-b2b-lgbt/src/lib/parceiro.ts (diagnosticar, montarLembretes, montarChecklist,
// adiarLembrete) e textos de lib/ajudaPaginas.ts. Diferenças de propósito (app):
//   - rotas do app (/parceiro/…) no lugar do portal; nada de preço (regra Apple): "fale com a equipe";
//   - cada lembrete só aparece para quem tem a permissão daquilo (pode()); página e fidelidade, só o dono;
//   - senha provisória não vira lembrete: no app a troca é obrigatória antes de entrar;
//   - "lembrar amanhã" fica guardado neste aparelho (AsyncStorage), como o portal faz no navegador.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalDoParceiro, Permissao, recursosDaCategoria } from '../modoParceiro';
import { supabase } from '../supabase';
import { oQueFalta } from './pagina';

export type Diagnostico = {
  status: string | null;
  perfilFaltando: string[];
  agendaEstaSemana: boolean | null;
  agendaProxima: boolean | null;
  uso: { limite: number | null; usadas: number; dias: number; periodo: 'dias' | 'mes'; liberaEm: string | null } | null;
  cuponsTotal: number | null;
  fraseDias: number | null | undefined;
  fidelidade: { existe: boolean; ativo: boolean; exibir: boolean } | null;
  festas: { total: number; proximas: number; destacadas: number } | null;
};

const pad = (n: number) => String(n).padStart(2, '0');
const chave = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const somar = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const segundaDe = (d: Date) => somar(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -((d.getDay() + 6) % 7));

export async function diagnosticar(local: LocalDoParceiro, pode: (p: Permissao) => boolean, agora = new Date()): Promise<Diagnostico> {
  const r = recursosDaCategoria(local.categoria, local.subcategoria);
  const dono = local.papel === 'dono';
  const premium = local.plano_comercial === 'premium' || local.plano_comercial === 'fundador';
  const ehFesta = local.categoria === 'eventos';
  const seg = segundaDe(agora);
  const [loc, agenda, uso, cupons, frase, fid, evs] = await Promise.all([
    supabase.from('locais').select('status, categoria, subcategoria, foto_capa_url, logo_url, galeria_fotos, descricao, instagram, horario_funcionamento').eq('id', local.local_id).maybeSingle(),
    r.agenda && pode('festa') ? supabase.from('agenda_semanal').select('data, tipo, ativo').eq('local_id', local.local_id) : Promise.resolve(null),
    r.cupom && pode('cupons') && local.plano_comercial ? supabase.rpc('uso_ofertas_periodo', { p_local_id: local.local_id }) : Promise.resolve(null),
    r.cupom && pode('cupons') ? supabase.from('cupons').select('id', { count: 'exact', head: true }).eq('local_id', local.local_id) : Promise.resolve(null),
    premium && pode('banner') && !ehFesta ? supabase.from('destaque_chamada').select('updated_at').eq('local_id', local.local_id).maybeSingle() : Promise.resolve(null),
    r.fidelidade && dono ? supabase.from('programas_fidelidade').select('id, ativo, exibir_no_app').eq('local_id', local.local_id).order('created_at').limit(1) : Promise.resolve(null),
    ehFesta && pode('festa') ? supabase.from('eventos').select('id, data_inicio, destaque_secoes').eq('local_id', local.local_id).in('status', ['pendente', 'aprovado']).limit(300) : Promise.resolve(null),
  ]);

  const l = (loc as any)?.data as any;
  const perfilFaltando = dono && l ? oQueFalta({ ...l, galeria_fotos: l.galeria_fotos || [], descricao: l.descricao || '', instagram: l.instagram || '', horario_funcionamento: l.horario_funcionamento || {} }).map((x) => x.txt) : [];

  let agendaEstaSemana: boolean | null = null;
  let agendaProxima: boolean | null = null;
  if (agenda && !(agenda as any).error) {
    const linhas = (((agenda as any).data as { data: string | null; tipo: string | null; ativo: boolean | null }[]) || []).filter((x) => x.ativo !== false);
    const fixa = linhas.some((x) => !x.data && x.tipo !== 'semana');
    const na = (x: { data: string | null }, ini: Date, fim: Date) => !!x.data && x.data >= chave(ini) && x.data <= chave(fim);
    agendaEstaSemana = fixa || linhas.some((x) => na(x, seg, somar(seg, 6)));
    agendaProxima = fixa || linhas.some((x) => na(x, somar(seg, 7), somar(seg, 13)));
  }

  let usoCupom: Diagnostico['uso'] = null;
  if (uso && !(uso as any).error) {
    const u = Array.isArray((uso as any).data) ? (uso as any).data[0] : (uso as any).data;
    if (u) usoCupom = { limite: u.limite ?? null, usadas: Number(u.usadas) || 0, dias: Number(u.dias) || 7, periodo: u.periodo === 'dias' ? 'dias' : 'mes', liberaEm: u.libera_em ?? null };
  }

  let fraseDias: number | null | undefined = undefined;
  if (frase && !(frase as any).error) {
    const q = ((frase as any).data as { updated_at?: string } | null)?.updated_at;
    fraseDias = q ? Math.floor((agora.getTime() - new Date(q).getTime()) / 864e5) : null;
  }

  let fidelidade: Diagnostico['fidelidade'] = null;
  if (fid && !(fid as any).error) {
    const p = (((fid as any).data as { ativo: boolean; exibir_no_app: boolean | null }[]) || [])[0];
    fidelidade = { existe: !!p, ativo: !!p?.ativo, exibir: p?.exibir_no_app !== false };
  }

  let festas: Diagnostico['festas'] = null;
  if (evs && !(evs as any).error) {
    const lista = ((evs as any).data as { data_inicio: string; destaque_secoes: string[] | null }[]) || [];
    const futuras = lista.filter((e) => new Date(e.data_inicio).getTime() >= agora.getTime());
    festas = { total: lista.length, proximas: futuras.length, destacadas: futuras.filter((e) => (e.destaque_secoes || []).some((s) => s === 'patrocinado' || s === 'plano_festa')).length };
  }

  return {
    status: l?.status ?? null,
    perfilFaltando,
    agendaEstaSemana,
    agendaProxima,
    uso: usoCupom,
    cuponsTotal: cupons && !(cupons as any).error ? (cupons as any).count ?? 0 : null,
    fraseDias,
    fidelidade,
    festas,
  };
}

// ---------- lembretes ----------
export type Lembrete = {
  id: string;
  nivel: 'agora' | 'semana' | 'dica';
  titulo: string;
  texto: string;
  rota: string | null; // null = falar com a equipe
  acao: string;
  fixo?: boolean; // não dá para adiar
};
const ORDEM = { agora: 0, semana: 1, dica: 2 } as const;
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function montarLembretes(local: LocalDoParceiro, d: Diagnostico, agora = new Date()): Lembrete[] {
  const r = recursosDaCategoria(local.categoria, local.subcategoria);
  const ehFesta = local.categoria === 'eventos';
  const premium = local.plano_comercial === 'premium' || local.plano_comercial === 'fundador';
  const gratuito = !local.plano_comercial;
  const l: Lembrete[] = [];

  if (d.status === 'pendente') {
    l.push({ id: 'status', nivel: 'agora', fixo: true, titulo: 'Seu cadastro está em análise', texto: 'Assim que a equipe aprovar, sua página entra no mapa e nas categorias do app, normalmente em até 48h. Enquanto isso, você já pode completar a página.', rota: local.papel === 'dono' ? '/parceiro/pagina' : null, acao: local.papel === 'dono' ? 'Completar minha página' : 'Falar com a equipe' });
  } else if (d.status === 'rejeitado' || d.status === 'suspenso') {
    l.push({ id: 'status', nivel: 'agora', fixo: true, titulo: d.status === 'suspenso' ? 'Sua página está suspensa' : 'Seu cadastro não foi aprovado', texto: 'Fale com a equipe para entender o motivo e ver o que ajustar.', rota: null, acao: 'Falar com a equipe' });
  }

  if (r.pedePagina && d.perfilFaltando.length > 0) {
    const essencial = d.perfilFaltando.includes('foto') || d.perfilFaltando.includes('descrição');
    l.push({ id: 'perfil', nivel: essencial ? 'agora' : 'dica', titulo: 'Complete a página do seu espaço', texto: `Ainda falta: ${d.perfilFaltando.join(', ')}. Uma página completa passa mais confiança para quem está escolhendo onde ir.`, rota: '/parceiro/pagina', acao: 'Completar agora' });
  }

  if (ehFesta && d.festas) {
    if (d.festas.proximas === 0) {
      l.push({ id: 'festa-nova', nivel: 'semana', titulo: 'Cadastre a sua próxima festa', texto: 'Festa aprovada aparece na aba Eventos do app e já pode ter Lista VIP. Leva poucos minutos.', rota: '/parceiro/festa-editar', acao: 'Cadastrar festa' });
    } else if (d.festas.destacadas === 0) {
      l.push({
        id: 'festa-destaque', nivel: 'dica', titulo: 'Coloque sua festa em "Em destaque nessa semana"',
        texto: premium ? 'Seu plano inclui 4 destaques por mês da agenda e 1 evento em destaque por mês (7 dias).' : 'O destaque coloca a festa no topo da aba Eventos. Fale com a equipe para saber como.',
        rota: premium && local.papel === 'dono' ? '/parceiro/festas' : null, acao: premium && local.papel === 'dono' ? 'Destacar com o plano' : 'Falar com a equipe',
      });
    }
  }

  if (r.agenda) {
    if (d.agendaEstaSemana === false) {
      l.push({ id: 'agenda-semana', nivel: 'semana', titulo: 'Sua agenda desta semana está vazia', texto: 'Conte o que rola em cada dia. Ela aparece para o público em Eventos › Essa semana, sem mexer na sua página.', rota: '/parceiro/agenda', acao: 'Montar a agenda' });
    } else if (d.agendaProxima === false && [5, 6, 0].includes(agora.getDay())) {
      l.push({ id: 'agenda-proxima', nivel: 'semana', titulo: 'Hora de subir a agenda da próxima semana', texto: 'Deixe a programação pronta antes de segunda-feira para o público já se planejar.', rota: '/parceiro/agenda', acao: 'Montar a agenda' });
    }
  }

  if (r.cupom && d.cuponsTotal !== null) {
    const nome = r.cupom === 'desconto' ? 'cupom de desconto' : 'cupom';
    if (gratuito) {
      l.push({ id: 'plano-cupom', nivel: 'dica', titulo: r.cupom === 'desconto' ? 'Cupom de desconto chega com os planos pagos' : 'Cupons chegam com os planos pagos', texto: `Com plano ativo, seu ${nome} entra na faixa de cupons da categoria no app. Fale com a equipe para saber como.`, rota: null, acao: 'Falar com a equipe' });
    } else if (d.uso && d.uso.periodo === 'dias' && d.uso.limite !== null) {
      if (d.uso.usadas < d.uso.limite) {
        l.push({ id: 'cupom-livre', nivel: 'semana', titulo: d.uso.dias === 7 ? 'Você pode publicar um cupom esta semana' : 'Você já pode publicar um novo cupom', texto: `Seu plano libera ${d.uso.limite} cupom a cada ${d.uso.dias} dias. Ele entra na faixa de cupons da sua categoria no app.`, rota: '/parceiro/cupom-editar', acao: 'Criar cupom' });
      } else if (d.uso.liberaEm) {
        l.push({ id: 'cupom-libera', nivel: 'dica', titulo: `Seu próximo cupom libera em ${dataCurta(d.uso.liberaEm)}`, texto: 'Seu cupom atual segue valendo. Quando chegar o dia, aparece um lembrete aqui.', rota: '/parceiro/cupons', acao: 'Ver meus cupons' });
      }
    }
  }

  if (d.fraseDias !== undefined) {
    if (d.fraseDias === null) l.push({ id: 'frase', nivel: 'semana', titulo: 'Escreva a frase do seu banner', texto: 'No Premium e no Fundador, a frase do banner da sua categoria é sua. Dá para trocar toda semana.', rota: '/parceiro/banner', acao: 'Escrever a frase' });
    else if (d.fraseDias >= 7) l.push({ id: 'frase', nivel: 'semana', titulo: 'Troque a frase da semana do seu banner', texto: `A frase atual está no ar há ${d.fraseDias} dias. Uma novidade por semana mantém o banner chamando atenção.`, rota: '/parceiro/banner', acao: 'Trocar a frase' });
  }

  if (d.fidelidade && r.fidelidade) {
    if (!d.fidelidade.existe) l.push({ id: 'fidelidade', nivel: 'dica', titulo: 'Crie o cartão fidelidade da sua casa', texto: 'Defina quantas visitas no mês dão um brinde. Você escolhe se aparece no app.', rota: '/parceiro/fidelidade', acao: 'Criar o cartão' });
    else if (d.fidelidade.ativo && !d.fidelidade.exibir) l.push({ id: 'fidelidade-oculta', nivel: 'dica', titulo: 'Seu cartão fidelidade está escondido do app', texto: 'Os clientes só veem o cartão se "Mostrar no app" estiver ligado.', rota: '/parceiro/fidelidade', acao: 'Revisar' });
  }

  return l.sort((a, b) => ORDEM[a.nivel] - ORDEM[b.nivel]);
}

// ---------- primeiros passos ----------
export type Passo = { id: string; titulo: string; texto: string; feito: boolean; rota: string; acao: string };

export function montarPrimeirosPassos(local: LocalDoParceiro, d: Diagnostico, contaWhatsApp: boolean, senhaProvisoria: boolean): Passo[] {
  const r = recursosDaCategoria(local.categoria, local.subcategoria);
  const ehFesta = local.categoria === 'eventos';
  const dono = local.papel === 'dono';
  const p: Passo[] = [];
  if (contaWhatsApp) p.push({ id: 'senha', titulo: 'Criar sua senha pessoal', texto: 'Troque a senha provisória do WhatsApp por uma só sua.', feito: !senhaProvisoria, rota: '/parceiro/trocar-senha', acao: 'Trocar senha' });
  if (dono && r.pedePagina) p.push({ id: 'perfil', titulo: 'Completar a página do espaço', texto: `Foto, descrição${r.pedeHorario ? ', horário' : ''} e Instagram.`, feito: d.perfilFaltando.length === 0, rota: '/parceiro/pagina', acao: 'Abrir minha página' });
  if (ehFesta && d.festas) {
    p.push({ id: 'festa', titulo: 'Cadastrar a sua festa', texto: 'Aparece na aba Eventos do app e pode ter Lista VIP.', feito: d.festas.total > 0, rota: '/parceiro/festa-editar', acao: 'Cadastrar festa' });
    p.push({ id: 'festa-destaque', titulo: 'Colocar uma festa em destaque', texto: 'Faixa "Em destaque nessa semana" no topo de Eventos.', feito: d.festas.destacadas > 0, rota: '/parceiro/festas', acao: 'Ver como destacar' });
  }
  if (r.agenda && d.agendaEstaSemana !== null) p.push({ id: 'agenda', titulo: 'Subir a agenda da semana', texto: 'Aparece em Eventos › Essa semana no app.', feito: d.agendaEstaSemana === true, rota: '/parceiro/agenda', acao: 'Montar agenda' });
  if (r.cupom && local.plano_comercial && d.cuponsTotal !== null) p.push({ id: 'cupom', titulo: r.cupom === 'desconto' ? 'Publicar o primeiro cupom de desconto' : 'Publicar o primeiro cupom', texto: 'Entra na faixa de cupons da sua categoria.', feito: d.cuponsTotal > 0, rota: '/parceiro/cupom-editar', acao: 'Criar cupom' });
  if (d.fidelidade && r.fidelidade) p.push({ id: 'fidelidade', titulo: 'Criar o cartão fidelidade', texto: 'Ex.: 7 visitas no mês = um brinde da casa.', feito: d.fidelidade.existe, rota: '/parceiro/fidelidade', acao: 'Criar cartão' });
  return p;
}
export const porcentagem = (p: Passo[]) => (p.length ? Math.round((p.filter((x) => x.feito).length / p.length) * 100) : 100);

// ---------- "lembrar amanhã" (só neste aparelho) ----------
const chaveAdiado = (localId: string) => `dicas:lembretes_adiados:${localId}`;
export async function lerAdiados(localId: string): Promise<Record<string, number>> {
  try {
    const bruto = await AsyncStorage.getItem(chaveAdiado(localId));
    const obj = bruto ? (JSON.parse(bruto) as Record<string, number>) : {};
    const agora = Date.now();
    return Object.fromEntries(Object.entries(obj).filter(([, ate]) => ate > agora));
  } catch {
    return {};
  }
}
export async function adiarLembrete(localId: string, id: string, horas = 24): Promise<Record<string, number>> {
  const atual = await lerAdiados(localId);
  atual[id] = Date.now() + horas * 3600 * 1000;
  try { await AsyncStorage.setItem(chaveAdiado(localId), JSON.stringify(atual)); } catch { /* segue só nesta sessão */ }
  return atual;
}
