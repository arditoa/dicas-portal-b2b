export const WHATSAPP_COMERCIAL = '5511999999999';

export function linkWhatsApp(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent(mensagem)}`;
}

export function linkCadastroPorWhatsApp(): string {
  return linkWhatsApp('Olá! Quero cadastrar meu espaço no Dicas LGBT.');
}

export function linkFalarSobreDuplicidade(): string {
  return linkWhatsApp('Olá! Meu CPF/CNPJ já consta como cadastrado no Dicas LGBT.');
}

export function formatarWhatsApp(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 10) {
    return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}
