// lib/whatsapp.ts
// Porta 1 do cadastro e CTA de duplicidade centralizados com o número real de testes.

export const WHATSAPP_COMERCIAL_E164 = '5511976002048';

export function linkWhatsApp(mensagem: string, numero: string = WHATSAPP_COMERCIAL_E164): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export const MENSAGEM_CADASTRO_PARCEIRO = 'Olá! Quero cadastrar meu espaço no Dicas LGBT 🏳️‍🌈';

export const MENSAGEM_DOCUMENTO_DUPLICADO =
  'Oi! Tentei cadastrar meu espaço no Dicas LGBT mas o sistema disse que meu CPF/CNPJ já está cadastrado. Podem me ajudar?';

export function linkCadastroPorWhatsApp(): string {
  return linkWhatsApp(MENSAGEM_CADASTRO_PARCEIRO);
}

export function linkFalarSobreDuplicidade(): string {
  return linkWhatsApp(MENSAGEM_DOCUMENTO_DUPLICADO);
}

export function formatarWhatsApp(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 10) {
    return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}