// Rodada 129 — regras compartilhadas do painel do parceiro: plano efetivo,
// diagnóstico do que está faltando, lembretes ("o que fazer esta semana") e
// checklist de primeiros passos. Tudo é CALCULADO a partir do que já existe no
// banco — nenhuma tabela nova — e cada consulta é tolerante: se uma migration
// ainda não foi aplicada, aquele lembrete simplesmente não aparece.
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type LocalParceiro = {
  id: string;
  nome: string;
  categoria: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  plano_comercial: string;
  plano_comercial_status: string;
  rating_media: number;
  rating_total: number;
  safe_space: boolean;
  descricao: string | null;
  foto_capa_url: string | null;
  logo_url: string | null;
  galeria_fotos: string[] | null;
  instagram: string | null;
  horario_funcionamento: Record<string, { aberto?: boolean }> | null;
};

export const CAMPOS_LOCAL =
  'id, nome, categoria, status, plano_comercial, plano_comercial_status, rating_media, rating_total, safe_space, descricao, foto_capa_url, logo_url, galeria_fotos, instagram, horario_funcionamento';

export type PlanoSlug = 'freemium' | 'intermediario' | 'premium' | 'fundador';

// Precisam bater com o enum public.plano_comercial e com /planos.
export const PLANO_INFO: Record<PlanoSlug, { nome: string; preco: string }> = {
  freemium: { nome: 'Freemium', preco: 'R$0' },
  intermediario: { nome: 'Intermediário', preco: 'R$359/mês' },
  premium: { nome: 'Premium', preco: 'R$499/mês' },
  fundador: { nome: 'Fundador', preco: 'R$349/mês × 12 (ou R$3.490 à vista)' },
};

// Plano que vale de fato: plano pago só conta com o status "ativo"
// (mesma regra do banco em uso_ofertas_periodo e dos triggers de oferta).
export function planoEfetivo(local: Pick<LocalParceiro, 'plano_comercial' | 'plano_comercial_status'>): PlanoSlug {
  if (local.plano_comercial_status !== 'ativo') return 'freemium';
  const p = local.plano_comercial;
  return p === 'intermediario' || p === 'premium' || p === 'fundador' ? p : 'freemium';
}

// Lista VIP, Meus eventos e Agenda da semana são conceitos de bar/festa.
const CATEGORIAS_SEM_AGENDA = ['servicos', 'turismo', 'produtos'];
export const categoriaComAgenda = (categoria: string) => !CATEGORIAS_SEM_AGENDA.includes(categoria);

export const ehContaWhatsApp = (user: User | null | undefined) => !!user?.email?.endsWith('@login.vezpabar.app');

// ---------- datas (sempre no relógio do aparelho do parceiro) ----------
const dois = (n: number) => String(n).padStart(2, '0');
export const chaveData = (d: Date) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
export function segundaDaSemana(base: Date, deslocamentoSemanas = 0): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const diasDesdeSegunda = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diasDesdeSegunda + deslocamentoSemanas * 7);
  return d;
}
const somarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// ---------- diagnóstico ----------
export type UsoCupom = {
  plano: string;
  periodo: 'dias' | 'mes';
  limite: number | null;
  usadas: number;
  dias: number;
  liberaEm: string | null;
};

export type Diagnostico = {
  senhaProvisoria: boolean;
  perfilFaltando: string[];
  agendaEstaSemana: boolean | null; // null = não deu pra saber
  agendaProxima: boolean | null;
  uso: UsoCupom | null;
  cuponsTotal: number | null;
  fraseDias: number | null | undefined; // undefined = não se aplica; null = nunca escreveu
  fidelidade: { existe: boolean; ativo: boolean; exibir: boolean } | null;
  // Só para a categoria Festas & Eventos: festas cadastradas (todas), próximas e quantas das próximas já são pagas (destaque).
  festas: { total: number; proximas: number; pagasProximas: number } | null;
};

function perfilFaltando(local: LocalParceiro): string[] {
  const falta: string[] = [];
  const temFoto = !!local.foto_capa_url || !!local.logo_url || (local.galeria_fotos?.length ?? 0) > 0;
  if (!temFoto) falta.push('foto');
  if ((local.descricao || '').trim().length < 20) falta.push('descrição');
  if (!(local.instagram || '').trim()) falta.push('Instagram');
  if (categoriaComAgenda(local.categoria) && local.categoria !== 'eventos') {
    const h = local.horario_funcionamento || {};
    if (!Object.values(h).some((d) => d?.aberto)) falta.push('horário de funcionamento');
  }
  return falta;
}

export async function diagnosticar(
  supabase: SupabaseClient,
  local: LocalParceiro,
  user: User,
  agora: Date = new Date()
): Promise<Diagnostico> {
  const plano = planoEfetivo(local);
  const comAgenda = categoriaComAgenda(local.categoria) && local.categoria !== 'eventos';
  const ehFesta = local.categoria === 'eventos';
  const segunda = segundaDaSemana(agora);
  const domingo = somarDias(segunda, 6);
  const segundaProx = somarDias(segunda, 7);
  const domingoProx = somarDias(segunda, 13);

  const [agenda, uso, cupons, frase, fid, evs] = await Promise.all([
    comAgenda
      ? supabase.from('agenda_semanal').select('data, tipo, ativo').eq('local_id', local.id)
      : Promise.resolve(null),
    supabase.rpc('uso_ofertas_periodo', { p_local_id: local.id }),
    supabase.from('cupons').select('id', { count: 'exact', head: true }).eq('local_id', local.id),
    plano === 'premium' || plano === 'fundador'
      ? supabase.from('destaque_chamada').select('updated_at').eq('local_id', local.id).maybeSingle()
      : Promise.resolve(null),
    supabase.from('programas_fidelidade').select('id, ativo, exibir_no_app').eq('local_id', local.id).limit(1),
    ehFesta
      ? supabase.from('eventos').select('id, data_inicio, destaque_secoes').eq('local_id', local.id).in('status', ['pendente', 'aprovado']).limit(300)
      : Promise.resolve(null),
  ]);

  // Agenda: linha fixa (data nula) vale pra todas as semanas; linha com data vale só pra aquela semana.
  let agendaEstaSemana: boolean | null = null;
  let agendaProxima: boolean | null = null;
  if (agenda && !agenda.error) {
    const linhas = ((agenda.data as { data: string | null; tipo: string | null; ativo: boolean | null }[]) || []).filter(
      (l) => l.ativo !== false
    );
    const fixa = linhas.some((l) => !l.data && l.tipo !== 'semana');
    const na = (l: { data: string | null }, ini: Date, fim: Date) =>
      !!l.data && l.data >= chaveData(ini) && l.data <= chaveData(fim);
    agendaEstaSemana = fixa || linhas.some((l) => na(l, segunda, domingo));
    agendaProxima = fixa || linhas.some((l) => na(l, segundaProx, domingoProx));
  }

  let usoCupom: UsoCupom | null = null;
  if (!uso.error) {
    const l = Array.isArray(uso.data) ? uso.data[0] : uso.data;
    if (l) {
      usoCupom = {
        plano: l.plano,
        periodo: l.periodo === 'dias' ? 'dias' : 'mes',
        limite: l.limite ?? null,
        usadas: Number(l.usadas) || 0,
        dias: Number(l.dias) || 7,
        liberaEm: l.libera_em ?? null,
      };
    }
  }

  let fraseDias: number | null | undefined = undefined;
  if (frase && !frase.error) {
    const quando = (frase.data as { updated_at?: string } | null)?.updated_at;
    fraseDias = quando ? Math.floor((agora.getTime() - new Date(quando).getTime()) / 86400000) : null;
  }

  let fidelidade: Diagnostico['fidelidade'] = null;
  if (!fid.error) {
    const p = ((fid.data as { ativo: boolean; exibir_no_app: boolean | null }[]) || [])[0];
    fidelidade = { existe: !!p, ativo: !!p?.ativo, exibir: p?.exibir_no_app !== false };
  }

  let festas: Diagnostico['festas'] = null;
  if (evs && !evs.error) {
    const lista = (evs.data as { data_inicio: string; destaque_secoes: string[] | null }[]) || [];
    const futuras = lista.filter((e) => new Date(e.data_inicio).getTime() >= agora.getTime());
    festas = {
      total: lista.length,
      proximas: futuras.length,
      pagasProximas: futuras.filter((e) => (e.destaque_secoes || []).includes('patrocinado')).length,
    };
  }

  return {
    senhaProvisoria: ehContaWhatsApp(user) && user.user_metadata?.senha_trocada !== true,
    perfilFaltando: perfilFaltando(local),
    agendaEstaSemana,
    agendaProxima,
    uso: usoCupom,
    cuponsTotal: cupons.error ? null : cupons.count ?? 0,
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
  href: string;
  acao: string;
  acaoEspecial?: 'trocar-senha';
  fixo?: boolean; // não pode ser adiado
};

const ORDEM = { agora: 0, semana: 1, dica: 2 } as const;
const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function montarLembretes(local: LocalParceiro, d: Diagnostico, agora: Date = new Date()): Lembrete[] {
  const plano = planoEfetivo(local);
  const ehFesta = local.categoria === 'eventos';
  const l: Lembrete[] = [];

  if (local.status === 'pendente') {
    l.push({
      id: 'status',
      nivel: 'agora',
      fixo: true,
      titulo: 'Seu cadastro está em análise',
      texto:
        'Assim que a equipe aprovar, sua página entra no mapa e nas categorias do app — normalmente em até 48h. Enquanto isso, você já pode completar a página.',
      href: '/dashboard/perfil',
      acao: 'Completar minha página',
    });
  } else if (local.status === 'rejeitado') {
    l.push({
      id: 'status',
      nivel: 'agora',
      fixo: true,
      titulo: 'Seu cadastro não foi aprovado',
      texto: 'Fale com a equipe para entender o motivo e ver o que ajustar.',
      href: '/dashboard/ajuda',
      acao: 'Falar com a equipe',
    });
  }

  if (d.senhaProvisoria) {
    l.push({
      id: 'senha',
      nivel: 'agora',
      titulo: 'Troque sua senha provisória',
      texto: 'A senha que enviamos no WhatsApp é temporária. Crie uma só sua para proteger o acesso ao seu painel.',
      href: '/dashboard/perfil',
      acao: 'Trocar agora',
      acaoEspecial: 'trocar-senha',
    });
  }

  if (d.perfilFaltando.length > 0) {
    const essencial = d.perfilFaltando.includes('foto') || d.perfilFaltando.includes('descrição');
    l.push({
      id: 'perfil',
      nivel: essencial ? 'agora' : 'dica',
      titulo: 'Complete a página do seu espaço',
      texto: `Ainda falta: ${d.perfilFaltando.join(', ')}. Uma página completa passa mais confiança para quem está escolhendo onde ir.`,
      href: '/dashboard/perfil',
      acao: 'Completar agora',
    });
  }

  if (ehFesta && d.festas) {
    if (d.festas.proximas === 0) {
      l.push({
        id: 'festa-nova',
        nivel: 'semana',
        titulo: 'Cadastre a sua próxima festa',
        texto: 'Festa aprovada aparece na aba Eventos do app e já pode ter Lista VIP. Leva poucos minutos.',
        href: '/dashboard/eventos/novo',
        acao: 'Cadastrar festa',
      });
    } else if (d.festas.pagasProximas === 0) {
      l.push({
        id: 'festa-destaque',
        nivel: 'dica',
        titulo: 'Coloque sua festa na faixa "Festas em destaque"',
        texto:
          plano === 'premium' || plano === 'fundador'
            ? 'Seu plano inclui até 4 festas em destaque por mês. Peça à equipe para destacar a próxima.'
            : 'Por R$ 89 a festa aparece no topo da aba Eventos, 1 dia antes e no dia, na frente da lista. Combine com a equipe.',
        href: plano === 'premium' || plano === 'fundador' ? '/dashboard/ajuda' : '/planos',
        acao: plano === 'premium' || plano === 'fundador' ? 'Falar com a equipe' : 'Ver planos de eventos',
      });
    }
  }

  if (categoriaComAgenda(local.categoria) && !ehFesta) {
    if (d.agendaEstaSemana === false) {
      l.push({
        id: 'agenda-semana',
        nivel: 'semana',
        titulo: 'Sua agenda desta semana está vazia',
        texto: 'Conte o que rola em cada dia. Ela aparece para o público em Eventos → Essa semana, sem mexer no seu perfil.',
        href: '/dashboard/agenda',
        acao: 'Montar a agenda',
      });
    } else if (d.agendaProxima === false && [5, 6, 0].includes(agora.getDay())) {
      l.push({
        id: 'agenda-proxima',
        nivel: 'semana',
        titulo: 'Hora de subir a agenda da próxima semana',
        texto: 'Deixe a programação pronta antes de segunda-feira para o público já se planejar.',
        href: '/dashboard/agenda',
        acao: 'Montar a agenda',
      });
    }
  }

  if (ehFesta) {
    // Em Festas & Eventos não há cupom: nada de lembrete de cupom.
  } else if (plano === 'freemium') {
    l.push({
      id: 'plano-cupom',
      nivel: 'dica',
      titulo: 'Cupons chegam com o plano Intermediário',
      texto: 'Com plano ativo, seu cupom entra na faixa de cupons da categoria no app. Veja o que cada plano libera.',
      href: '/planos',
      acao: 'Conhecer os planos',
    });
  } else if (d.uso && d.uso.periodo === 'dias' && d.uso.limite !== null) {
    if (d.uso.usadas < d.uso.limite) {
      l.push({
        id: 'cupom-livre',
        nivel: 'semana',
        titulo: d.uso.dias === 7 ? 'Você pode publicar um cupom esta semana' : 'Você já pode publicar um novo cupom',
        texto: `Seu plano libera ${d.uso.limite} cupom a cada ${d.uso.dias} dias. Ele entra na faixa de cupons da sua categoria no app.`,
        href: '/dashboard/cupons',
        acao: 'Criar cupom',
      });
    } else if (d.uso.liberaEm) {
      l.push({
        id: 'cupom-libera',
        nivel: 'dica',
        titulo: `Seu próximo cupom libera em ${dataCurta(d.uso.liberaEm)}`,
        texto: 'Seu cupom atual segue valendo. Quando chegar o dia, aparece um lembrete aqui.',
        href: '/dashboard/cupons',
        acao: 'Ver meus cupons',
      });
    }
  }

  if (d.fraseDias !== undefined) {
    if (d.fraseDias === null) {
      l.push({
        id: 'frase',
        nivel: 'semana',
        titulo: 'Escreva a frase do seu banner',
        texto: ehFesta
          ? 'No plano Premium/Fundador, a frase do banner de Festas & Eventos é sua. Use para anunciar a próxima festa e troque toda semana.'
          : 'No plano Premium/Fundador, a frase do banner da sua categoria é sua. Dá para trocar toda semana.',
        href: '/dashboard/destaques',
        acao: 'Escrever a frase',
      });
    } else if (d.fraseDias >= 7) {
      l.push({
        id: 'frase',
        nivel: 'semana',
        titulo: 'Troque a frase da semana do seu banner',
        texto: `A frase atual está no ar há ${d.fraseDias} dias. Uma novidade por semana mantém o banner chamando atenção.`,
        href: '/dashboard/destaques',
        acao: 'Trocar a frase',
      });
    }
  }

  if (d.fidelidade && !ehFesta) {
    if (!d.fidelidade.existe) {
      l.push({
        id: 'fidelidade',
        nivel: 'dica',
        titulo: 'Crie o cartão fidelidade da sua casa',
        texto: 'Defina quantas visitas no mês dão um brinde. Você escolhe se aparece no app.',
        href: '/dashboard/fidelidade',
        acao: 'Criar o cartão',
      });
    } else if (d.fidelidade.ativo && !d.fidelidade.exibir) {
      l.push({
        id: 'fidelidade-oculta',
        nivel: 'dica',
        titulo: 'Seu cartão fidelidade está escondido do app',
        texto: 'Os clientes só veem o cartão se a opção "Mostrar no app" estiver ligada.',
        href: '/dashboard/fidelidade',
        acao: 'Revisar',
      });
    }
  }

  return l.sort((a, b) => ORDEM[a.nivel] - ORDEM[b.nivel]);
}

// ---------- primeiros passos ----------
export type PassoChecklist = { id: string; titulo: string; texto: string; feito: boolean; href: string; acao: string };

export function montarChecklist(local: LocalParceiro, d: Diagnostico, contaWhatsApp: boolean): PassoChecklist[] {
  const plano = planoEfetivo(local);
  const ehFesta = local.categoria === 'eventos';
  const p: PassoChecklist[] = [];
  if (contaWhatsApp) {
    p.push({
      id: 'senha',
      titulo: 'Criar sua senha pessoal',
      texto: 'Troque a senha provisória do WhatsApp por uma só sua.',
      feito: !d.senhaProvisoria,
      href: '/dashboard/perfil',
      acao: 'Trocar senha',
    });
  }
  p.push({
    id: 'perfil',
    titulo: 'Completar a página do espaço',
    texto: 'Foto, descrição' + (categoriaComAgenda(local.categoria) && !ehFesta ? ', horário' : '') + ' e Instagram.',
    feito: d.perfilFaltando.length === 0,
    href: '/dashboard/perfil',
    acao: 'Abrir minha página',
  });
  if (ehFesta && d.festas) {
    p.push({
      id: 'festa',
      titulo: 'Cadastrar a sua festa',
      texto: 'Aparece na aba Eventos do app e pode ter Lista VIP.',
      feito: d.festas.total > 0,
      href: '/dashboard/eventos/novo',
      acao: 'Cadastrar festa',
    });
    p.push({
      id: 'festa-destaque',
      titulo: 'Colocar uma festa em destaque',
      texto: 'Faixa "Festas em destaque" no topo de Eventos: R$ 89 por festa, ou incluída no Premium e no Fundador.',
      feito: d.festas.pagasProximas > 0,
      href: '/planos',
      acao: 'Ver como destacar',
    });
  }
  if (categoriaComAgenda(local.categoria) && !ehFesta && d.agendaEstaSemana !== null) {
    p.push({
      id: 'agenda',
      titulo: 'Subir a agenda da semana',
      texto: 'Aparece em Eventos → Essa semana no app.',
      feito: d.agendaEstaSemana === true,
      href: '/dashboard/agenda',
      acao: 'Montar agenda',
    });
  }
  if (!ehFesta && plano !== 'freemium' && d.cuponsTotal !== null) {
    p.push({
      id: 'cupom',
      titulo: 'Publicar o primeiro cupom',
      texto: 'Entra na faixa de cupons da sua categoria.',
      feito: d.cuponsTotal > 0,
      href: '/dashboard/cupons',
      acao: 'Criar cupom',
    });
  }
  if (d.fidelidade && !ehFesta) {
    p.push({
      id: 'fidelidade',
      titulo: 'Criar o cartão fidelidade',
      texto: 'Ex.: 7 visitas no mês = um brinde da casa.',
      feito: d.fidelidade.existe,
      href: '/dashboard/fidelidade',
      acao: 'Criar cartão',
    });
  }
  return p;
}

// ---------- "adiar" lembrete (só neste aparelho) ----------
const chaveAdiado = (localId: string) => `lembretes_adiados:${localId}`;

export function lerAdiados(localId: string): Record<string, number> {
  try {
    const bruto = window.localStorage.getItem(chaveAdiado(localId));
    const obj = bruto ? (JSON.parse(bruto) as Record<string, number>) : {};
    const agora = Date.now();
    return Object.fromEntries(Object.entries(obj).filter(([, ate]) => ate > agora));
  } catch {
    return {};
  }
}

export function adiarLembrete(localId: string, id: string, horas = 24): Record<string, number> {
  const atual = lerAdiados(localId);
  atual[id] = Date.now() + horas * 3600 * 1000;
  try {
    window.localStorage.setItem(chaveAdiado(localId), JSON.stringify(atual));
  } catch {
    /* sem armazenamento: o lembrete só some até a próxima carga */
  }
  return atual;
}
