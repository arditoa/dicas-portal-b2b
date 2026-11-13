// Equipe e senha da porta do Modo parceiro. Funções e regras da migração 099:
//   - local_equipe (quem trabalha no local; só o dono vê, edita e remove; a própria pessoa pode sair);
//   - convites: criar_convite_equipe (código de 8 letras, vale 7 dias, só o dono) e aceitar_convite_equipe
//     (precisa de conta de verdade, não anônima);
//   - senha da porta: definir_pin_porta (6 números; trocar derruba quem entrou com a senha antiga),
//     porta_do_local (código da casa + aparelhos conectados) e entrar_modo_porta (código + PIN, funciona
//     com login anônimo; 5 erros por aparelho ou 20 por casa em 15 min bloqueiam; o acesso vence às 6h).
// Modelos e permissões: mesmo permissoes_do_modelo() do banco.
import { Alert, Linking } from 'react-native';
import type { Permissao } from '../modoParceiro';
import { supabase } from '../supabase';

export type Modelo = 'gerente' | 'porteiro' | 'social_media' | 'personalizado';
export const TODAS_PERMISSOES: Permissao[] = ['porta', 'checkins', 'lista_vip', 'festa', 'banner', 'cupons', 'resultados'];

// Espelho de permissoes_do_modelo() (099).
export const PERMISSOES_DO_MODELO: Record<Modelo, Permissao[]> = {
  gerente: ['porta', 'checkins', 'lista_vip', 'festa', 'banner', 'cupons', 'resultados'],
  porteiro: ['porta', 'checkins'],
  social_media: ['festa', 'banner', 'cupons', 'resultados'],
  personalizado: [],
};
export const MODELOS: { valor: Modelo; rotulo: string; dica: string }[] = [
  { valor: 'gerente', rotulo: 'Gerente', dica: 'Pode tudo, menos equipe, senha da porta e plano.' },
  { valor: 'porteiro', rotulo: 'Porteiro', dica: 'Abre a porta e confirma check-ins.' },
  { valor: 'social_media', rotulo: 'Social media', dica: 'Festas, agenda, banner, cupons e números.' },
  { valor: 'personalizado', rotulo: 'Personalizado', dica: 'Você escolhe o que a pessoa pode fazer.' },
];
export const NOME_MODELO: Record<string, string> = { gerente: 'Gerente', porteiro: 'Porteiro', social_media: 'Social media', personalizado: 'Personalizado', porta_pin: 'Aparelho da porta' };

// Permissões em linguagem simples.
export const TEXTO_PERMISSAO: Record<Permissao, string> = {
  porta: 'Abrir a porta: ler o QR e confirmar entradas (só perto do horário da festa)',
  checkins: 'Confirmar check-ins e liberar cupons',
  lista_vip: 'Aprovar e recusar a Lista VIP e as reservas',
  festa: 'Subir e editar festas e a agenda da semana',
  banner: 'Trocar o banner',
  cupons: 'Criar e editar cupons',
  resultados: 'Ver os números da casa',
};
export const CURTO_PERMISSAO: Record<Permissao, string> = {
  porta: 'Porta', checkins: 'Check-ins', lista_vip: 'Lista VIP', festa: 'Festas e agenda', banner: 'Banner', cupons: 'Cupons', resultados: 'Números',
};

export function traduzirErro(e: { message?: string } | null | undefined): string {
  const m = (e?.message || '').toLowerCase();
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('anonymous') && m.includes('disabled')) return 'A entrada da porta ainda não foi ligada no app. Avise a equipe Dicas.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet e tente de novo.';
  if (m.includes('does not exist')) return 'O banco ainda não recebeu esta atualização. Avise a equipe Dicas.';
  if (m.includes('row-level') || m.includes('policy') || m.includes('permission denied')) return 'Só o dono do local pode fazer isso.';
  // As funções da 099 já respondem em português.
  return e?.message || 'Algo deu errado. Tente de novo.';
}

// ---------- equipe ----------
export type Membro = { id: string; user_id: string; modelo: string; permissoes: Permissao[]; apelido: string | null; nome: string; criado_em: string };

export async function listarEquipe(localId: string): Promise<Membro[]> {
  const { data, error } = await supabase
    .from('local_equipe')
    .select('id, user_id, modelo, permissoes, apelido, criado_em')
    .eq('local_id', localId)
    .neq('modelo', 'porta_pin')
    .order('criado_em', { ascending: true });
  if (error) throw new Error(traduzirErro(error));
  const linhas = (data as Omit<Membro, 'nome'>[]) || [];
  let nomes = new Map<string, string | null>();
  if (linhas.length) {
    const { data: p } = await supabase.from('perfis_publicos').select('id, display_name').in('id', linhas.map((l) => l.user_id));
    nomes = new Map(((p as { id: string; display_name: string | null }[]) || []).map((x) => [x.id, x.display_name]));
  }
  return linhas.map((l) => ({ ...l, nome: l.apelido || nomes.get(l.user_id) || 'Pessoa da equipe' }));
}

export async function salvarMembro(id: string, modelo: Modelo, permissoes: Permissao[], apelido: string): Promise<void> {
  if (!permissoes.length) throw new Error('Escolha pelo menos uma coisa que a pessoa pode fazer.');
  const { error } = await supabase.from('local_equipe').update({ modelo, permissoes, apelido: apelido.trim() || null }).eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}

export async function removerDaEquipe(id: string): Promise<void> {
  const { error } = await supabase.from('local_equipe').delete().eq('id', id);
  if (error) throw new Error(traduzirErro(error));
}

// ---------- convites ----------
export type Convite = { codigo: string; modelo: Modelo; permissoes: Permissao[]; apelido: string | null; expira_em: string };

export async function listarConvites(localId: string): Promise<Convite[]> {
  const { data, error } = await supabase
    .from('local_equipe_convites')
    .select('codigo, modelo, permissoes, apelido, expira_em')
    .eq('local_id', localId)
    .is('usado_em', null)
    .gt('expira_em', new Date().toISOString())
    .order('criado_em', { ascending: false });
  if (error) return [];
  return (data as Convite[]) || [];
}

export async function criarConvite(localId: string, modelo: Modelo, permissoes: Permissao[], apelido: string): Promise<string> {
  const perms = modelo === 'personalizado' ? permissoes : null; // modelos prontos usam o padrão do banco
  if (modelo === 'personalizado' && !permissoes.length) throw new Error('Escolha pelo menos uma coisa que a pessoa pode fazer.');
  const { data, error } = await supabase.rpc('criar_convite_equipe', { p_local: localId, p_modelo: modelo, p_permissoes: perms, p_apelido: apelido.trim() || null });
  if (error) throw new Error(traduzirErro(error));
  return String(data);
}

export async function cancelarConvite(codigo: string): Promise<void> {
  const { error } = await supabase.from('local_equipe_convites').delete().eq('codigo', codigo);
  if (error) throw new Error(traduzirErro(error));
}

export async function aceitarConvite(codigo: string): Promise<{ local_id: string; nome: string }> {
  const { data, error } = await supabase.rpc('aceitar_convite_equipe', { p_codigo: codigo });
  if (error) throw new Error(traduzirErro(error));
  const j = data as { local_id: string; nome: string };
  return { local_id: j.local_id, nome: j.nome };
}

export const formatarCodigo = (c: string) => (c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);

export function mensagemDoConvite(nomeLocal: string, codigo: string, modelo: string): string {
  return [
    `Oi! Você recebeu um convite para a equipe do ${nomeLocal} no app Dicas LGBT+ (${NOME_MODELO[modelo] || 'equipe'}).`,
    '',
    `Seu código: ${formatarCodigo(codigo)}`,
    '',
    'Como entrar:',
    '1. Baixe o app Dicas LGBT+ (www.dicaslgbt.com.br) e entre com a sua conta (ou crie uma).',
    '2. Vá em Conta › "Tenho um código de equipe".',
    '3. Digite o código. Pronto: o Modo parceiro abre já com a casa.',
    '',
    'O código vale por 7 dias e só pode ser usado uma vez.',
  ].join('\n');
}

// ---------- senha da porta ----------
export type Aparelho = { id: string; apelido: string | null; desde: string; expira_em: string };
export type Porta = { codigo: string | null; temPin: boolean; atualizadoEm: string | null; aparelhos: Aparelho[] };

export async function portaDoLocal(localId: string): Promise<Porta> {
  const { data, error } = await supabase.rpc('porta_do_local', { p_local: localId });
  if (error) throw new Error(traduzirErro(error));
  const j = (data || {}) as { codigo: string | null; tem_pin: boolean | null; atualizado_em: string | null; aparelhos: Aparelho[] | null };
  return { codigo: j.codigo ?? null, temPin: !!j.tem_pin, atualizadoEm: j.atualizado_em ?? null, aparelhos: j.aparelhos || [] };
}

export function validarPin(pin: string, confirma: string): string | null {
  if (!/^[0-9]{6}$/.test(pin)) return 'A senha da porta precisa ter 6 números.';
  if (['000000', '111111', '123456', '654321', '121212', '999999'].includes(pin)) return 'Escolha uma senha menos óbvia.';
  if (pin !== confirma) return 'As duas senhas não estão iguais.';
  return null;
}

export async function definirPin(localId: string, pin: string): Promise<string> {
  const { data, error } = await supabase.rpc('definir_pin_porta', { p_local: localId, p_pin: pin });
  if (error) throw new Error(traduzirErro(error));
  return String((data as { codigo: string }).codigo);
}

export function mensagemDaPorta(nomeLocal: string, codigo: string): string {
  return [
    `Acesso da porta do ${nomeLocal} no app Dicas LGBT+:`,
    '',
    `Código da casa: ${codigo}`,
    'A senha (6 números) eu te passo pessoalmente.',
    '',
    'Como entrar:',
    '1. Abra o app Dicas LGBT+ (não precisa ter conta).',
    '2. Vá em Conta › "Sou da equipe da porta".',
    '3. Digite o código da casa e a senha.',
    '',
    'O acesso vale até as 6h da manhã e mostra só a porta e as aprovações da festa.',
  ].join('\n');
}

// ---------- entrada do porteiro ----------
export type ResultadoPorta = { ok: true; local_id: string; nome: string; expira_em: string } | { ok: false; erro: string; restantes: number | null };

// Sem sessão, entra como anônimo (precisa estar ligado no Supabase: Authentication › Allow anonymous sign-ins).
export async function entrarNaPorta(codigo: string, pin: string, apelido: string): Promise<ResultadoPorta> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) return { ok: false, erro: traduzirErro(error), restantes: null };
  }
  const { data, error } = await supabase.rpc('entrar_modo_porta', { p_codigo: codigo, p_pin: pin, p_apelido: apelido.trim() || null });
  if (error) return { ok: false, erro: traduzirErro(error), restantes: null };
  const j = (data || {}) as { ok: boolean; erro?: string; tentativas_restantes?: number; local_id?: string; nome?: string; expira_em?: string };
  if (!j.ok) return { ok: false, erro: j.erro || 'Código da casa ou senha incorretos.', restantes: j.tentativas_restantes ?? null };
  return { ok: true, local_id: j.local_id!, nome: j.nome || 'a casa', expira_em: j.expira_em! };
}

export async function compartilharWhatsApp(texto: string) {
  const t = encodeURIComponent(texto);
  try {
    const app = `whatsapp://send?text=${t}`;
    if (await Linking.canOpenURL(app)) await Linking.openURL(app);
    else await Linking.openURL(`https://api.whatsapp.com/send?text=${t}`);
  } catch {
    Alert.alert('WhatsApp', 'Não foi possível abrir o WhatsApp agora.');
  }
}

export const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const dataHora = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${hora(iso)}`;
};
