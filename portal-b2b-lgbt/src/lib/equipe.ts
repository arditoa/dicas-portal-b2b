// Rodada 129 — contato da equipe Dicas LGBT+ para o parceiro pedir ajuda
// (esqueci a senha, dúvida de plano etc.).
//
// O número NÃO fica fixo no código: defina NEXT_PUBLIC_WHATSAPP_EQUIPE na
// Vercel (só dígitos, com 55 + DDD, ex.: 5511999999999). Enquanto não estiver
// definido, as telas mostram "chame o time no WhatsApp que enviou seu acesso"
// em vez de um botão — nenhuma tela quebra.
export const WHATSAPP_EQUIPE = (process.env.NEXT_PUBLIC_WHATSAPP_EQUIPE || '').replace(/\D/g, '');

export function linkWhatsappEquipe(texto: string): string | null {
  if (!WHATSAPP_EQUIPE) return null;
  return `https://wa.me/${WHATSAPP_EQUIPE}?text=${encodeURIComponent(texto)}`;
}
