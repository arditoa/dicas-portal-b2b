// Rodada 145 — login do parceiro no app com WhatsApp + senha, igual ao portal.
//
// ESPELHO de portal-b2b-lgbt/src/lib/parceiroAuth.ts (normalizarTelefoneBR e emailSinteticoParceiro).
// O cálculo PRECISA ser idêntico nos dois lados: a conta do parceiro é criada pelo portal
// (/api/aprovar-local e /api/aprovar-evento) com o e-mail interno parceiro.<55DDDNUMERO>@login.vezpabar.app,
// e o app só consegue entrar se calcular exatamente o mesmo e-mail. Se mudar lá, mude aqui.

// Tamanho decide se já tem o 55 do país (não o conteúdo: DDD 55 existe). Ver comentário da Rodada 31 no portal.
export function normalizarTelefoneBR(whatsapp: string): string {
  const digitos = whatsapp.replace(/\D/g, '').replace(/^0+/, '');
  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  return digitos;
}

export function emailSinteticoParceiro(telefoneNormalizado: string): string {
  return `parceiro.${telefoneNormalizado}@login.vezpabar.app`;
}

export const DOMINIO_LOGIN_PARCEIRO = '@login.vezpabar.app';

// Conta criada pelo portal a partir do WhatsApp (e-mail interno).
export function ehContaWhatsApp(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(DOMINIO_LOGIN_PARCEIRO);
}

// O que a pessoa digitou parece um WhatsApp (e não um e-mail)?
export function pareceWhatsApp(entrada: string): boolean {
  const t = entrada.trim();
  if (!t || t.includes('@')) return false;
  const digitos = t.replace(/\D/g, '');
  return digitos.length >= 10 && digitos.length <= 13 && /^[\d\s()+\-.]+$/.test(t);
}

// Campo único "E-mail ou WhatsApp": devolve o e-mail que o Supabase Auth entende.
export function emailDeLogin(entrada: string): string {
  const t = entrada.trim();
  if (pareceWhatsApp(t)) return emailSinteticoParceiro(normalizarTelefoneBR(t));
  return t.toLowerCase();
}
