// Festas do Modo parceiro (telas Minhas festas e Nova/Editar festa).
// REGRAS COPIADAS do portal:
//   - portal-b2b-lgbt/src/components/cadastro/FormularioFesta.tsx (cadastro único, rodada 130)
//   - portal-b2b-lgbt/src/app/dashboard/eventos/page.tsx (editar, cancelar, Lista VIP)
//   - portal-b2b-lgbt/src/components/DestaqueFestaPlano.tsx (destacar com o plano)
// Banco: eventos (+ colunas da 099: cor1, cor2, textura, chamada, destaques, link_ingresso, exigir_foto),
// listas_vip, storage fotos-eventos "<evento_id>/...", resumo_da_festa (099), destacar_festa_do_plano (093).
// Gatilhos que valem sozinhos: festa nova entra "em análise" (enforce_evento_seguro_insert); festa aprovada
// que muda título, data ou local volta para análise (protect_admin_fields_eventos); a Lista VIP marcada nasce
// na aprovação se ainda não existir (criar_lista_vip_ao_aprovar_evento).
import { chaveData, dataDaChave } from '../../components/parceiro/form/CampoData';
import { DEGRADES_BANNER } from '../estiloBanner';
import { supabase } from '../supabase';
import {
  ESTILOS_MAX_CADASTRO, GRUPOS_EVENTO, LEGADO_EVENTO, PUBLICO_FESTA_CADASTRO, TIPOS_EVENTO_CADASTRO, slugTag,
} from '../taxonomia';
import { formatarNome } from '../texto';
import { enviarFoto } from './fotos';

export type StatusFesta = 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
export const LIMITE_DESTAQUES_FESTA = 4; // cota única festas + agenda (migrações 093 e 101)

// Texturas aceitas pelo banco (constraint eventos_layout_valido, migração 099).
export const TEXTURAS_FESTA = [
  { chave: 'glitter', rotulo: 'Glitter', icone: 'star' as const },
  { chave: 'neon', rotulo: 'Neon', icone: 'zap' as const },
  { chave: 'holografico', rotulo: 'Holográfico', icone: 'disc' as const },
  { chave: 'papel', rotulo: 'Papel', icone: 'file' as const },
  { chave: 'tijolo', rotulo: 'Tijolo', icone: 'grid' as const },
];
export const MAX_CHAMADA = 80; // banco: chamada <= 80
export const MAX_DESTAQUES = 6; // banco: até 6 destaques
export const MAX_DESTAQUE_TXT = 30;

// Mesmos enums do cadastro (public.estilo_musical / public.publico_tag) — campos antigos coerentes com as tags.
const ESTILOS_LEGADO_VALIDOS = new Set(['funk', 'pop_eletronica', 'sertanejo', 'drag_cabare', 'mpb_samba', 'techno_house', 'rock', 'forro']);
const PUBLICOS_LEGADO_VALIDOS = new Set(['lesbica', 'gay', 'bi', 'trans', 'nao_binario', 'queer', 'ursos', 'daddy', 'leather', 'drag', 'misto_lgbt', 'aliados', 'todos']);
export const SLUGS_TIPO: string[] = TIPOS_EVENTO_CADASTRO.map((t) => t.slug);
export const SLUGS_PUBLICO: string[] = PUBLICO_FESTA_CADASTRO.map((t) => t.slug);
export const ESTILOS_TAGS = (GRUPOS_EVENTO.find((g) => g.id === 'musica')?.tags || []).map((t) => ({ t, s: slugTag(t) }));
export const SLUGS_ESTILO: string[] = ESTILOS_TAGS.map((e) => e.s);

export type Festa = {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  foto_capa_url: string | null;
  status: StatusFesta;
  tags: string[] | null;
  publico_tags: string[] | null;
  classificacao_lgbt: string | null;
  destaque_secoes: string[] | null;
  quer_lista_vip: boolean | null;
  cor1: string | null;
  cor2: string | null;
  textura: string | null;
  chamada: string | null;
  destaques: string[] | null;
  link_ingresso: string | null;
  exigir_foto: boolean | null;
  listas_vip: { id: string; vagas_limite: number | null; vagas_ocupadas: number; ativa: boolean }[] | null;
};
const CAMPOS =
  'id, titulo, descricao, data_inicio, data_fim, foto_capa_url, status, tags, publico_tags, classificacao_lgbt, destaque_secoes, quer_lista_vip, ' +
  'cor1, cor2, textura, chamada, destaques, link_ingresso, exigir_foto, listas_vip(id, vagas_limite, vagas_ocupadas, ativa)';

export type Situacao = { txt: string; cor: string };
export const encerrada = (f: Pick<Festa, 'data_inicio' | 'data_fim'>) => new Date(f.data_fim || f.data_inicio).getTime() < Date.now();
export function situacaoDaFesta(f: Pick<Festa, 'status' | 'data_inicio' | 'data_fim'>): Situacao {
  if (f.status === 'cancelado') return { txt: 'Cancelada', cor: '#A0A0B2' };
  if (f.status === 'rejeitado') return { txt: 'Não aprovada', cor: '#FF7A7A' };
  if (encerrada(f)) return { txt: 'Encerrada', cor: '#A0A0B2' };
  if (f.status === 'pendente') return { txt: 'Em análise', cor: '#E1A93A' };
  return { txt: 'Aprovada', cor: '#4CAF7D' };
}
export const emDestaque = (f: Pick<Festa, 'destaque_secoes'>) => (f.destaque_secoes || []).includes('plano_festa');

export function traduzirErro(e: { message?: string } | null | undefined): string {
  const m = (e?.message || '').toLowerCase();
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('row-level') || m.includes('policy') || m.includes('permission denied') || m.includes('42501'))
    return 'Seu acesso não permite mudar as festas deste local. Fale com o dono.';
  if (m.includes('eventos_layout_valido')) return 'Confira o link do ingresso (começa com https://), a chamada (até 80 letras) e os destaques (até 6).';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet e tente de novo.';
  if (m.includes('does not exist')) return 'O banco ainda não recebeu esta atualização. Avise a equipe Dicas.';
  return e?.message || 'Algo deu errado. Tente de novo.';
}

// ---------- lista ----------
export async function listarFestas(localId: string): Promise<Festa[]> {
  const desde = new Date(Date.now() - 60 * 864e5).toISOString(); // próximas + últimos 60 dias
  const { data, error } = await supabase
    .from('eventos')
    .select(CAMPOS)
    .eq('local_id', localId)
    .gte('data_inicio', desde)
    .order('data_inicio', { ascending: false })
    .limit(80);
  if (error) throw new Error(traduzirErro(error));
  return (data as unknown as Festa[]) || [];
}

export async function obterFesta(id: string): Promise<Festa | null> {
  const { data, error } = await supabase.from('eventos').select(CAMPOS).eq('id', id).maybeSingle();
  if (error) throw new Error(traduzirErro(error));
  return (data as unknown as Festa) || null;
}

export type ResumoFesta = { vistas: number; cliquesIngresso: number; pedidos: number; aprovados: number; entraram: number; pessoasEntraram: number };
// Precisa da permissão 'resultados' (o banco confere). Sem permissão ou sem a 099, devolve null.
export async function resumoDaFesta(id: string): Promise<ResumoFesta | null> {
  const { data, error } = await supabase.rpc('resumo_da_festa', { p_evento: id });
  if (error || !data) return null;
  const d = data as { cliques?: Record<string, number> | null; lista_vip?: { pedidos: number; aprovados: number; entraram: number; pessoas_entraram: number } | null };
  const c = d.cliques || {};
  const l = d.lista_vip || { pedidos: 0, aprovados: 0, entraram: 0, pessoas_entraram: 0 };
  return {
    vistas: Number(c.visualizacao_festa) || 0, cliquesIngresso: Number(c.clique_ingresso) || 0,
    pedidos: Number(l.pedidos) || 0, aprovados: Number(l.aprovados) || 0, entraram: Number(l.entraram) || 0, pessoasEntraram: Number(l.pessoas_entraram) || 0,
  };
}

export async function cancelarFesta(id: string): Promise<void> {
  // Cancelar não apaga: marca 'cancelado' e some do app; só o admin reativa.
  const { error } = await supabase.from('eventos').update({ status: 'cancelado' }).eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}

// ---------- destacar com o plano (só o dono; o banco confere plano, aprovação, data e cota) ----------
export async function destacarFesta(id: string, ligar: boolean): Promise<{ usadas: number; limite: number }> {
  const { data, error } = await supabase.rpc('destacar_festa_do_plano', { p_evento: id, p_ligar: ligar });
  if (error) throw new Error(traduzirErro(error));
  const j = (data || {}) as { usadas?: number; limite?: number };
  return { usadas: Number(j.usadas) || 0, limite: Number(j.limite) || LIMITE_DESTAQUES_FESTA };
}

// ---------- formulário ----------
export type FormFesta = {
  id: string | null; // null = nova
  status: StatusFesta | null;
  titulo: string;
  descricao: string;
  inicioData: string | null; // AAAA-MM-DD
  inicioHora: string | null; // HH:MM
  fimData: string | null;
  fimHora: string | null;
  classificacao: string;
  tags: string[];
  publicoTagsAntigos: string[]; // preserva o que não vem das tags (igual ao portal)
  foto: string | null; // URL pública ou, em festa nova, a foto no aparelho (file://)
  degrade: string | null; // chave em DEGRADES_BANNER
  textura: string | null;
  chamada: string;
  destaques: string[];
  linkIngresso: string;
  listaVip: boolean;
  vagas: string; // vazio = sem limite
  exigirFoto: boolean;
  listaId: string | null;
  vagasOcupadas: number;
  destacada: boolean; // em "Festas em destaque" pelo plano (só leitura aqui; liga/desliga em Minhas festas)
  // originais, para saber se a festa aprovada volta para análise
  original?: { titulo: string; inicio: string | null; fim: string | null };
};

const pad = (n: number) => String(n).padStart(2, '0');
const horaDe = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export function juntarDataHora(data: string | null, hora: string | null): string | null {
  if (!data || !hora) return null;
  const d = dataDaChave(data);
  const [h, m] = hora.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function formVazio(): FormFesta {
  return {
    id: null, status: null, titulo: '', descricao: '', inicioData: null, inicioHora: '22:00', fimData: null, fimHora: null,
    classificacao: '', tags: [], publicoTagsAntigos: [], foto: null, degrade: null, textura: null, chamada: '', destaques: [],
    linkIngresso: '', listaVip: false, vagas: '', exigirFoto: false, listaId: null, vagasOcupadas: 0, destacada: false,
  };
}

export function formDaFesta(f: Festa): FormFesta {
  const lista = f.listas_vip?.[0] || null;
  const deg = DEGRADES_BANNER.find((d) => d.cores[0] === f.cor1 && d.cores[1] === f.cor2);
  return {
    id: f.id, status: f.status, titulo: f.titulo, descricao: f.descricao || '',
    inicioData: chaveData(new Date(f.data_inicio)), inicioHora: horaDe(f.data_inicio),
    fimData: f.data_fim ? chaveData(new Date(f.data_fim)) : null, fimHora: f.data_fim ? horaDe(f.data_fim) : null,
    classificacao: f.classificacao_lgbt || '', tags: f.tags || [], publicoTagsAntigos: f.publico_tags || [],
    foto: f.foto_capa_url, degrade: deg?.chave ?? null, textura: f.textura, chamada: f.chamada || '', destaques: f.destaques || [],
    linkIngresso: f.link_ingresso || '', listaVip: lista ? lista.ativa : !!f.quer_lista_vip,
    vagas: lista?.vagas_limite ? String(lista.vagas_limite) : '', exigirFoto: !!f.exigir_foto,
    listaId: lista?.id ?? null, vagasOcupadas: lista?.vagas_ocupadas ?? 0, destacada: emDestaque(f),
    original: { titulo: f.titulo, inicio: f.data_inicio, fim: f.data_fim },
  };
}

// "Repetir da semana passada": mesma festa, data +7 dias, nova (vai para análise), Lista VIP vazia.
export function formRepetido(f: Festa): FormFesta {
  const base = formDaFesta(f);
  const mais7 = (k: string | null) => (k ? chaveData(new Date(dataDaChave(k).getTime() + 7 * 864e5)) : null);
  return {
    ...base, id: null, status: null, original: undefined, listaId: null, vagasOcupadas: 0, destacada: false,
    inicioData: mais7(base.inicioData), fimData: mais7(base.fimData),
  };
}

export type ErrosFesta = Partial<Record<'titulo' | 'inicio' | 'fim' | 'classificacao' | 'tipo' | 'publico' | 'estilos' | 'link' | 'vagas' | 'chamada', string>>;

export function validarFesta(f: FormFesta): ErrosFesta {
  const e: ErrosFesta = {};
  if (!f.titulo.trim()) e.titulo = 'Escreva o nome da festa.';
  const ini = juntarDataHora(f.inicioData, f.inicioHora);
  if (!ini) e.inicio = 'Escolha o dia e a hora de início.';
  const fim = juntarDataHora(f.fimData, f.fimHora);
  if ((f.fimData && !f.fimHora) || (!f.fimData && f.fimHora)) e.fim = 'Escolha o dia e a hora do fim, ou deixe os dois vazios.';
  else if (ini && fim && fim <= ini) e.fim = 'O fim precisa ser depois do início.';
  if (!f.classificacao) e.classificacao = 'Escolha a relação da festa com a comunidade LGBT+.';
  const tipo = TIPOS_EVENTO_CADASTRO.find((t) => f.tags.includes(t.slug));
  if (!tipo) e.tipo = 'Escolha o tipo de evento.';
  if (!PUBLICO_FESTA_CADASTRO.some((p) => f.tags.includes(p.slug))) e.publico = 'Escolha para quem é a festa.';
  const qtdEstilos = f.tags.filter((t) => SLUGS_ESTILO.includes(t)).length;
  if (tipo?.musica && qtdEstilos === 0) e.estilos = `Escolha de 1 a ${ESTILOS_MAX_CADASTRO} estilos musicais.`;
  if (f.linkIngresso.trim() && !/^https?:\/\//i.test(f.linkIngresso.trim())) e.link = 'O link precisa começar com https://';
  if (f.chamada.length > MAX_CHAMADA) e.chamada = `Até ${MAX_CHAMADA} letras.`;
  if (f.listaVip && f.vagas.trim()) {
    const n = Number(f.vagas);
    if (!Number.isInteger(n) || n < 1) e.vagas = 'Use um número inteiro (1 ou mais), ou deixe vazio para sem limite.';
    else if (n < f.vagasOcupadas) e.vagas = `Já tem ${f.vagasOcupadas} vagas ocupadas. Use ${f.vagasOcupadas} ou mais.`;
  }
  return e;
}

// Festa aprovada que muda título, data ou fim volta para análise (gatilho do banco). Para avisar antes.
export function voltaParaAnalise(f: FormFesta): boolean {
  if (f.status !== 'aprovado' || !f.original) return false;
  const ini = juntarDataHora(f.inicioData, f.inicioHora);
  const fim = juntarDataHora(f.fimData, f.fimHora);
  const igual = (a: string | null, b: string | null) => (a && b ? new Date(a).getTime() === new Date(b).getTime() : a === b);
  return formatarNome(f.titulo) !== f.original.titulo || !igual(ini, f.original.inicio) || !igual(fim, f.original.fim);
}

function novoId(): string {
  // UUID v4 (a coluna eventos.id é uuid). Igual ao portal, que gera o id antes para subir o flyer.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function salvarFesta(
  localId: string,
  f: FormFesta,
  contato: { nome: string | null; whatsapp: string | null },
  podeLista: boolean,
): Promise<{ id: string; aviso: string | null }> {
  const erros = validarFesta(f);
  const primeiro = Object.values(erros)[0];
  if (primeiro) throw new Error(primeiro);

  // Mesmo tratamento do portal: tipo sem música limpa os estilos; campos antigos derivados das tags.
  const tipo = TIPOS_EVENTO_CADASTRO.find((t) => f.tags.includes(t.slug));
  const tags = tipo?.musica ? f.tags : f.tags.filter((t) => !SLUGS_ESTILO.includes(t));
  const legado = tags.flatMap((t) => LEGADO_EVENTO[t] || []);
  const estilos = Array.from(new Set(legado.filter((v) => ESTILOS_LEGADO_VALIDOS.has(v))));
  const publicoBase = f.publicoTagsAntigos.filter((v) => !['lesbica', 'gay', 'todos'].includes(v));
  const publico = Array.from(new Set([...publicoBase, ...legado.filter((v) => PUBLICOS_LEGADO_VALIDOS.has(v) && v !== 'todos')]));
  const deg = DEGRADES_BANNER.find((d) => d.chave === f.degrade);
  const fotoNoAparelho = !!f.foto && !/^https?:\/\//.test(f.foto);

  const campos: Record<string, unknown> = {
    titulo: formatarNome(f.titulo),
    descricao: f.descricao.trim() || null,
    data_inicio: juntarDataHora(f.inicioData, f.inicioHora),
    data_fim: juntarDataHora(f.fimData, f.fimHora),
    classificacao_lgbt: f.classificacao,
    tags,
    estilos_musicais: estilos,
    publico_tags: publico.length ? publico : ['todos'],
    foto_capa_url: fotoNoAparelho ? null : f.foto,
    cor1: deg?.cores[0] ?? null,
    cor2: deg?.cores[1] ?? null,
    textura: f.textura,
    chamada: f.chamada.trim() || null,
    destaques: f.destaques.map((d) => d.trim()).filter(Boolean).slice(0, MAX_DESTAQUES),
    link_ingresso: f.linkIngresso.trim() || null,
    exigir_foto: f.listaVip && f.exigirFoto,
    quer_lista_vip: f.listaVip,
  };

  let id = f.id;
  if (!id) {
    id = novoId();
    const { error } = await supabase.from('eventos').insert({
      id, local_id: localId, contato_nome: contato.nome, contato_whatsapp: contato.whatsapp, ...campos,
      // foto do aparelho sobe depois que a festa existe (regra do Storage)
      ...(fotoNoAparelho ? { foto_capa_url: null } : {}),
    });
    if (error) throw new Error(traduzirErro(error));
  } else {
    const { error } = await supabase.from('eventos').update(campos).eq('id', id);
    if (error) throw new Error(traduzirErro(error));
  }

  let aviso: string | null = null;
  if (fotoNoAparelho && f.foto) {
    try {
      const url = await enviarFoto('fotos-eventos', id, 'flier', f.foto);
      const { error } = await supabase.from('eventos').update({ foto_capa_url: url }).eq('id', id);
      if (error) throw error;
    } catch {
      aviso = 'A festa foi salva, mas o flyer não subiu. Abra a festa e envie de novo.';
    }
  }

  // Lista VIP (criar/editar = permissão 'lista_vip'; a 104 libera para a equipe). Sem permissão, só fica marcada
  // e nasce sozinha quando a festa for aprovada (gatilho da 031).
  if (podeLista) {
    const vagas = f.vagas.trim() ? Number(f.vagas) : null;
    if (f.listaVip) {
      const r = f.listaId
        ? await supabase.from('listas_vip').update({ vagas_limite: vagas, ativa: true }).eq('id', f.listaId)
        : await supabase.from('listas_vip').insert({ evento_id: id, titulo: 'Lista VIP', vagas_limite: vagas, ativa: true });
      if (r.error) aviso = aviso || 'A festa foi salva, mas a Lista VIP não. Tente salvar de novo.';
    } else if (f.listaId) {
      const r = await supabase.from('listas_vip').update({ ativa: false }).eq('id', f.listaId);
      if (r.error) aviso = aviso || 'A festa foi salva, mas a Lista VIP não foi desligada. Tente de novo.';
    }
  }
  return { id, aviso };
}

// Contato da festa nova: o WhatsApp vem do login do parceiro (parceiro.<número>@login...) e o nome do último
// contato informado numa festa deste local (igual a dashboard/eventos/novo do portal).
export async function contatoDoParceiro(localId: string, email: string | null | undefined, nomeLocal: string) {
  const m = (email || '').match(/^parceiro\.(\d+)@/);
  const { data } = await supabase
    .from('eventos')
    .select('contato_nome')
    .eq('local_id', localId)
    .not('contato_nome', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { nome: ((data as { contato_nome: string } | null)?.contato_nome as string) || nomeLocal, whatsapp: m ? m[1] : null };
}
