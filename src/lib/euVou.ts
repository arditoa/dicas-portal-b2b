// Comunidade, fase 1 — "Eu vou" (migração 113).
// A pessoa marca presença numa festa (eventos) ou num item da agenda do bar numa data. Invisível por padrão:
// só conta no "N pessoas vão". Quem liga "aparecer" mostra primeiro nome + foto (até 8 rostos e "+N").
// Tudo passa por funções do banco (marcar_eu_vou, desmarcar_eu_vou, resumo_eu_vou, contar_eu_vou):
// a tabela presencas só deixa cada pessoa ler as próprias linhas. Só maiores de 18.
import { supabase } from './supabase';

export type AlvoEuVou = { evento: string } | { agenda: string; data: string /* YYYY-MM-DD */ };
export type Rosto = { id: string; nome: string | null; foto: string | null };
export type ResumoEuVou = { total: number; euVou: boolean; euApareco: boolean; rostos: Rosto[]; mais: number; possoVerRostos: boolean };
export const RESUMO_VAZIO: ResumoEuVou = { total: 0, euVou: false, euApareco: false, rostos: [], mais: 0, possoVerRostos: false };

export const chaveDoAlvo = (a: AlvoEuVou) => ('evento' in a ? `e:${a.evento}` : `a:${a.agenda}:${a.data}`);
const params = (a: AlvoEuVou) =>
  'evento' in a ? { p_evento: a.evento, p_agenda: null, p_data: null } : { p_evento: null, p_agenda: a.agenda, p_data: a.data };

// Sem a migração 113 o app não quebra: o "Eu vou" simplesmente não aparece.
export const semMigracao = (e: { message?: string; code?: string } | null) =>
  !!e && (e.code === 'PGRST202' || /could not find the function|does not exist/i.test(e.message || ''));

function lerResumo(d: any): ResumoEuVou {
  return {
    total: Number(d?.total) || 0,
    euVou: !!d?.eu_vou,
    euApareco: !!d?.eu_apareco,
    rostos: Array.isArray(d?.rostos) ? d.rostos : [],
    mais: Number(d?.mais) || 0,
    possoVerRostos: !!d?.posso_ver_rostos,
  };
}

export function traduzirErro(e: { message?: string; code?: string } | null | undefined): string {
  const m = e?.message || '';
  if (/network|fetch/i.test(m)) return 'Sem conexão. Confira a internet e tente de novo.';
  if (semMigracao(e || null)) return 'O "Eu vou" ainda não está ligado. Tente mais tarde.';
  return m || 'Não deu certo agora. Tente de novo.';
}

export async function resumo(a: AlvoEuVou): Promise<ResumoEuVou | null> {
  const { data, error } = await supabase.rpc('resumo_eu_vou', params(a));
  if (error) return null;
  return lerResumo(data);
}

export async function marcar(a: AlvoEuVou, aparecer?: boolean): Promise<ResumoEuVou> {
  const { data, error } = await supabase.rpc('marcar_eu_vou', { ...params(a), p_aparecer: aparecer ?? null });
  if (error) throw new Error(traduzirErro(error));
  return lerResumo(data);
}

export async function desmarcar(a: AlvoEuVou): Promise<ResumoEuVou> {
  const { data, error } = await supabase.rpc('desmarcar_eu_vou', params(a));
  if (error) throw new Error(traduzirErro(error));
  return lerResumo(data);
}

export type Contagem = { total: number; eu: boolean };
export async function contar(alvos: AlvoEuVou[]): Promise<Record<string, Contagem> | null> {
  if (!alvos.length) return {};
  const itens = alvos.slice(0, 200).map((a) => ('evento' in a ? { e: a.evento } : { a: a.agenda, d: a.data }));
  const { data, error } = await supabase.rpc('contar_eu_vou', { p_itens: itens });
  if (error) return null;
  const r: Record<string, Contagem> = {};
  for (const x of (data as { chave: string; total: number; eu: boolean }[]) || []) r[x.chave] = { total: Number(x.total) || 0, eu: !!x.eu };
  return r;
}

// As fotos ficam no bucket privado "avatares"; o banco só libera a de quem está aparecendo (migração 113).
export async function fotosAssinadas(caminhos: string[]): Promise<Record<string, string>> {
  const lista = [...new Set(caminhos.filter((c) => !!c && !/^https?:/i.test(c)))];
  const r: Record<string, string> = {};
  for (const c of caminhos) if (c && /^https?:/i.test(c)) r[c] = c;
  if (!lista.length) return r;
  const { data } = await supabase.storage.from('avatares').createSignedUrls(lista, 3600);
  for (const x of data || []) if (x.signedUrl && x.path) r[x.path] = x.signedUrl;
  return r;
}

export const MOTIVOS: { valor: string; rotulo: string }[] = [
  { valor: 'assedio', rotulo: 'Assédio ou mensagem ofensiva' },
  { valor: 'ameaca', rotulo: 'Ameaça ou violência' },
  { valor: 'foto_impropria', rotulo: 'Foto imprópria' },
  { valor: 'perfil_falso', rotulo: 'Perfil falso' },
  { valor: 'menor_de_idade', rotulo: 'Parece menor de 18' },
  { valor: 'outro', rotulo: 'Outro motivo' },
];

export async function denunciar(pessoa: string, motivo: string, alvo: AlvoEuVou | null, descricao?: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Entre na sua conta para denunciar.');
  const onde = !alvo ? {} : 'evento' in alvo ? { evento_id: alvo.evento } : { agenda_id: alvo.agenda, data: alvo.data };
  const { error } = await supabase.from('denuncias_comunidade').insert({
    reporter_id: u.user.id, denunciado_id: pessoa, motivo, descricao: descricao?.trim() || null, ...onde,
  });
  if (error) throw new Error(traduzirErro(error));
}

export async function bloquear(pessoa: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Entre na sua conta para bloquear.');
  const { error } = await supabase
    .from('bloqueios')
    .upsert({ bloqueador_id: u.user.id, bloqueado_id: pessoa }, { onConflict: 'bloqueador_id,bloqueado_id', ignoreDuplicates: true });
  if (error) throw new Error(traduzirErro(error));
}

export async function apagarHistorico(): Promise<number> {
  const { data, error } = await supabase.rpc('apagar_historico_presenca');
  if (error) throw new Error(traduzirErro(error));
  return Number(data) || 0;
}

// "N pessoas vão" / "1 pessoa vai"
export const textoTotal = (n: number) => (n === 1 ? '1 pessoa vai' : `${n} pessoas vão`);
