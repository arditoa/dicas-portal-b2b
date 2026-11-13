// Cadastro da hospedagem do Modo parceiro (Etapa 13). Só o dono e só a categoria turismo.
// REGRAS COPIADAS do portal: dashboard/hospedagem/page.tsx e lib/hospedagemChecklist.ts (checklist e % de completude:
// obrigatório vale 2, recomendado vale 1; o % ordena as listas do app). Tabelas: locais (tipo_hospedagem, atributos,
// cnpj, endereço, lat/lng, capa, galeria), hospedagem_perfil, hospedagem_validacao, hospedagem_espacos, pontos_proximos.
//   - salva tudo de uma vez (locais + perfil + validação), como o portal ao trocar de etapa;
//   - tags reservadas (dadas pela equipe) saem ao salvar; termo de acolhimento trava depois de aceito;
//   - status: rascunho → enviado (análise) → ajustes / aprovado. Aprovado não perde o selo ao salvar;
//   - galeria até 10 fotos; espaços: quarto (capacidade, camas, preço, características), área comum, lazer;
//   - locais próximos manuais ficam "em análise" (os de dentro do Dicas entram sozinhos).
// Fica no portal: o comprovante (PDF ou imagem até 10 MB no bucket documentos-hospedagem) — o app mostra se já foi enviado.
import { supabase } from '../supabase';
import { TAGS_RESERVADAS } from '../taxonomia';

export const LIMITE_GALERIA = 10;
export const ETAPAS = [
  { n: 1, titulo: 'Dados básicos' }, { n: 2, titulo: 'Fotos' }, { n: 3, titulo: 'Quartos e espaços' }, { n: 4, titulo: 'Estrutura' },
  { n: 5, titulo: 'Políticas' }, { n: 6, titulo: 'Acolhimento LGBT+' }, { n: 7, titulo: 'Locais próximos' }, { n: 8, titulo: 'Reserva' },
  { n: 9, titulo: 'Revisão e envio' },
] as const;

export type LocalHosp = { id: string; nome: string; cidade: string | null; tipo_hospedagem: string | null; cnpj: string | null; endereco: string | null; lat: number | null; lng: number | null; foto_capa_url: string | null; galeria_fotos: string[]; atributos: Record<string, string[]>; ehPremium: boolean };
export type Perfil = {
  cadastur_numero: string | null; cadastur_validade: string | null; total_quartos: number | null; checkin_hora: string | null; checkout_hora: string | null;
  idiomas: string[]; idade_minima: number | null; cancelamento_tipo: string | null; cancelamento_texto: string | null; regras_casa: string | null;
  formas_pagamento: string[]; link_reserva: string | null; whatsapp_reserva: string | null; email_reserva: string | null; site: string | null;
};
export type Validacao = { compromissos: string[]; comprovante_path: string | null; termo_aceito_em: string | null; status: string; observacao_equipe: string | null };
export type Espaco = { id: string; tipo: 'quarto' | 'area_comum' | 'lazer'; nome: string; descricao: string | null; foto_url: string | null; capacidade: number | null; camas: string | null; preco_de: number | null; caracteristicas: string[] };
export type Ponto = { id: string; tipo: string; nome: string; endereco: string | null; lat: number | null; lng: number | null; status: string };
export type Dados = { local: LocalHosp; perfil: Perfil; validacao: Validacao; espacos: Espaco[]; pontos: Ponto[]; termoMarcado: boolean };

export const PERFIL_VAZIO: Perfil = {
  cadastur_numero: null, cadastur_validade: null, total_quartos: null, checkin_hora: null, checkout_hora: null, idiomas: [], idade_minima: null,
  cancelamento_tipo: null, cancelamento_texto: null, regras_casa: null, formas_pagamento: [], link_reserva: null, whatsapp_reserva: null, email_reserva: null, site: null,
};
const VALIDACAO_VAZIA: Validacao = { compromissos: [], comprovante_path: null, termo_aceito_em: null, status: 'rascunho', observacao_equipe: null };

export function traduzirErro(e: { message?: string } | null | undefined): string {
  const m = (e?.message || '').toLowerCase();
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('does not exist') || m.includes('schema cache')) return 'Esta área precisa da atualização do banco (migrações 036 e 037). Fale com a equipe Dicas.';
  if (m.includes('row-level') || m.includes('policy') || m.includes('permission denied')) return 'Só o dono do local mexe no cadastro da hospedagem.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet e tente de novo.';
  return e?.message || 'Algo deu errado. Tente de novo.';
}

export async function carregar(localId: string): Promise<Dados> {
  const { data, error } = await supabase
    .from('locais')
    .select('id, nome, categoria, cidade, cnpj, endereco, lat, lng, foto_capa_url, galeria_fotos, plano_comercial, plano_comercial_status, tipo_hospedagem, atributos')
    .eq('id', localId).maybeSingle();
  if (error || !data) throw new Error(traduzirErro(error) || 'Não foi possível carregar.');
  const d = data as any;
  const [pf, vl, es, pt] = await Promise.all([
    supabase.from('hospedagem_perfil').select('*').eq('local_id', localId).maybeSingle(),
    supabase.from('hospedagem_validacao').select('compromissos, comprovante_path, termo_aceito_em, status, observacao_equipe').eq('local_id', localId).maybeSingle(),
    supabase.from('hospedagem_espacos').select('id, tipo, nome, descricao, foto_url, capacidade, camas, preco_de, caracteristicas').eq('local_id', localId).order('tipo').order('ordem'),
    supabase.from('pontos_proximos').select('id, tipo, nome, endereco, lat, lng, status').eq('local_id', localId).order('created_at'),
  ]);
  if (pf.error || vl.error) throw new Error(traduzirErro(pf.error || vl.error));
  const p = pf.data as any;
  const v = vl.data as any;
  return {
    local: {
      id: d.id, nome: d.nome, cidade: d.cidade, cnpj: d.cnpj, endereco: d.endereco, lat: d.lat, lng: d.lng, foto_capa_url: d.foto_capa_url,
      galeria_fotos: d.galeria_fotos || [], tipo_hospedagem: d.tipo_hospedagem, atributos: d.atributos || {},
      ehPremium: (d.plano_comercial_status ?? 'ativo') === 'ativo' && ['premium', 'fundador'].includes(d.plano_comercial),
    },
    perfil: p ? { ...PERFIL_VAZIO, ...p, idiomas: p.idiomas || [], formas_pagamento: p.formas_pagamento || [] } : { ...PERFIL_VAZIO },
    validacao: v ? { ...VALIDACAO_VAZIA, ...v, compromissos: v.compromissos || [] } : { ...VALIDACAO_VAZIA },
    espacos: ((es.data as any[]) || []).map((x) => ({ ...x, caracteristicas: x.caracteristicas || [] })),
    pontos: (pt.data as Ponto[]) || [],
    termoMarcado: !!v?.termo_aceito_em,
  };
}

// ---------- checklist (espelho de lib/hospedagemChecklist.ts do portal) ----------
export type ItemChecklist = { id: string; etapa: number; label: string; obrigatorio: boolean; ok: boolean };
const qtd = (a: Record<string, string[]>, g: string) => (a[g] || []).length;
export function montarChecklist(d: Dados): ItemChecklist[] {
  const a = d.local.atributos || {};
  const termo = d.validacao.termo_aceito_em || (d.termoMarcado ? 'agora' : null);
  const quartosComFoto = d.espacos.filter((e) => e.tipo === 'quarto' && e.foto_url).length;
  const p = d.perfil;
  return [
    { id: 'tipo', etapa: 1, label: 'Tipo de hospedagem', obrigatorio: true, ok: !!d.local.tipo_hospedagem },
    { id: 'cadastur', etapa: 1, label: 'Número do Cadastur', obrigatorio: true, ok: !!p.cadastur_numero?.trim() },
    { id: 'horarios', etapa: 1, label: 'Horários de check-in e check-out', obrigatorio: true, ok: !!p.checkin_hora && !!p.checkout_hora },
    { id: 'mapa', etapa: 1, label: 'Endereço com localização no mapa', obrigatorio: true, ok: !!d.local.endereco && d.local.lat != null && d.local.lng != null },
    { id: 'cnpj', etapa: 1, label: 'CNPJ', obrigatorio: false, ok: !!d.local.cnpj },
    { id: 'total_quartos', etapa: 1, label: 'Total de quartos/unidades', obrigatorio: false, ok: !!p.total_quartos },
    { id: 'idiomas', etapa: 1, label: 'Idiomas de atendimento', obrigatorio: false, ok: p.idiomas.length > 0 },
    { id: 'capa', etapa: 2, label: 'Foto de capa', obrigatorio: true, ok: !!d.local.foto_capa_url },
    { id: 'galeria', etapa: 2, label: 'Pelo menos 4 fotos na galeria', obrigatorio: false, ok: d.local.galeria_fotos.length >= 4 },
    { id: 'quarto', etapa: 3, label: 'Pelo menos 1 quarto com foto', obrigatorio: true, ok: quartosComFoto >= 1 },
    { id: 'area_comum', etapa: 3, label: 'Área em comum cadastrada', obrigatorio: false, ok: d.espacos.some((e) => e.tipo === 'area_comum') },
    { id: 'lazer', etapa: 3, label: 'Espaço de lazer cadastrado', obrigatorio: false, ok: d.espacos.some((e) => e.tipo === 'lazer') },
    { id: 'comodidades', etapa: 4, label: 'Pelo menos 3 comodidades', obrigatorio: true, ok: qtd(a, 'comodidades') >= 3 },
    { id: 'acessibilidade', etapa: 4, label: 'Acessibilidade informada', obrigatorio: false, ok: qtd(a, 'acessibilidade') > 0 },
    { id: 'servicos', etapa: 4, label: 'Serviços ao hóspede', obrigatorio: false, ok: qtd(a, 'servicos') > 0 },
    { id: 'quartos_caract', etapa: 4, label: 'Características dos quartos', obrigatorio: false, ok: qtd(a, 'quartos') > 0 },
    { id: 'cancelamento', etapa: 5, label: 'Política de cancelamento', obrigatorio: true, ok: !!p.cancelamento_tipo },
    { id: 'pagamento', etapa: 5, label: 'Formas de pagamento', obrigatorio: false, ok: p.formas_pagamento.length > 0 },
    { id: 'politicas', etapa: 5, label: 'Regras (pets, crianças, day use…)', obrigatorio: false, ok: qtd(a, 'politicas') > 0 },
    { id: 'termo', etapa: 6, label: 'Termo de compromisso aceito', obrigatorio: true, ok: !!termo },
    { id: 'compromissos', etapa: 6, label: 'Pelo menos 3 compromissos de acolhimento', obrigatorio: false, ok: d.validacao.compromissos.length >= 3 },
    { id: 'comprovante', etapa: 6, label: 'Comprovante enviado (política, certificado…)', obrigatorio: false, ok: !!d.validacao.comprovante_path },
    { id: 'proximos', etapa: 7, label: 'Pelo menos 3 locais próximos indicados', obrigatorio: false, ok: d.pontos.filter((x) => x.status !== 'recusado').length >= 3 },
    { id: 'canal_reserva', etapa: 8, label: 'Pelo menos 1 canal de reserva', obrigatorio: true, ok: !!(p.link_reserva || p.whatsapp_reserva || p.email_reserva || p.site) },
  ];
}
export function calcularCompletude(itens: ItemChecklist[]): number {
  let total = 0, feito = 0;
  for (const i of itens) { const peso = i.obrigatorio ? 2 : 1; total += peso; if (i.ok) feito += peso; }
  return total === 0 ? 0 : Math.round((feito / total) * 100);
}

// Salva tudo (locais + perfil + validação), como o portal. enviar = manda para análise.
export async function salvar(d: Dados, opcoes: { enviar?: boolean } = {}): Promise<Validacao> {
  const atributosLimpos = Object.fromEntries(Object.entries(d.local.atributos).map(([g, tags]) => [g, tags.filter((t) => !TAGS_RESERVADAS.includes(t))]));
  const r1 = await supabase.from('locais').update({
    tipo_hospedagem: d.local.tipo_hospedagem || null, atributos: atributosLimpos, cnpj: d.local.cnpj || null, endereco: d.local.endereco || null,
    lat: d.local.lat, lng: d.local.lng, foto_capa_url: d.local.foto_capa_url, galeria_fotos: d.local.galeria_fotos.slice(0, LIMITE_GALERIA),
  }).eq('id', d.local.id);
  if (r1.error) throw new Error(traduzirErro(r1.error));
  const completude = calcularCompletude(montarChecklist(d));
  const r2 = await supabase.from('hospedagem_perfil').upsert({ local_id: d.local.id, ...d.perfil, completude, updated_at: new Date().toISOString() });
  if (r2.error) throw new Error(traduzirErro(r2.error));
  const termo = d.validacao.termo_aceito_em || (d.termoMarcado ? new Date().toISOString() : null);
  const status = opcoes.enviar ? 'enviado' : d.validacao.status === 'aprovado' || d.validacao.status === 'enviado' ? d.validacao.status : 'rascunho';
  const r3 = await supabase.from('hospedagem_validacao').upsert({ local_id: d.local.id, compromissos: d.validacao.compromissos, comprovante_path: d.validacao.comprovante_path, termo_aceito_em: termo, status });
  if (r3.error) throw new Error(traduzirErro(r3.error));
  return { ...d.validacao, termo_aceito_em: termo, status };
}

export async function criarEspaco(localId: string, e: Omit<Espaco, 'id'>, ordem: number): Promise<void> {
  const quarto = e.tipo === 'quarto';
  const { error } = await supabase.from('hospedagem_espacos').insert({
    local_id: localId, tipo: e.tipo, nome: e.nome.trim(), descricao: e.descricao?.trim() || null, foto_url: e.foto_url,
    capacidade: quarto ? e.capacidade : null, camas: quarto ? e.camas || null : null, preco_de: quarto ? e.preco_de : null,
    caracteristicas: quarto ? e.caracteristicas : [], ordem,
  });
  if (error) throw new Error(traduzirErro(error));
}
export async function apagar(tabela: 'hospedagem_espacos' | 'pontos_proximos', id: string): Promise<void> {
  const { error } = await supabase.from(tabela).delete().eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}
export async function criarPonto(localId: string, p: { tipo: string; nome: string; endereco: string | null; lat: number | null; lng: number | null }): Promise<void> {
  const { error } = await supabase.from('pontos_proximos').insert({ local_id: localId, tipo: p.tipo, nome: p.nome.trim(), endereco: p.endereco?.trim() || null, lat: p.lat, lng: p.lng });
  if (error) throw new Error(traduzirErro(error));
}

export function distanciaTexto(a: { lat: number | null; lng: number | null }, p: { lat: number | null; lng: number | null }): string | null {
  if (a.lat == null || a.lng == null || p.lat == null || p.lng == null) return null;
  const rad = (g: number) => (g * Math.PI) / 180;
  const h = Math.sin(rad(p.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(p.lat)) * Math.sin(rad(p.lng - a.lng) / 2) ** 2;
  const m = 2 * 6371000 * Math.asin(Math.sqrt(h));
  return m < 1000 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}
