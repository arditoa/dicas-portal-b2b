// Rodada 23 — extraído de /api/aprovar-local pra ser compartilhado com
// /login também (precisa calcular o MESMO e-mail sintético dos dois
// lados: na criação da conta e na hora de entrar).
//
// Por que e-mail sintético em vez de telefone de verdade no Supabase Auth:
// o parceiro digita o WhatsApp e é assim que ele pensa no próprio login,
// mas o provedor "Phone" do Supabase Auth está desativado neste projeto
// (dá "Phone logins are disabled" ao tentar entrar) — ativá-lo pelo
// painel normalmente exige configurar um provedor de SMS (Twilio etc.),
// que é exatamente o custo/complexidade que a Andrea queria evitar ao
// pedir login por WhatsApp em vez de e-mail. Como o provedor de e-mail
// já está ativo e funcionando (usado pelo cadastro manual), a conta do
// parceiro é criada com um e-mail fixo e determinístico calculado a
// partir do próprio WhatsApp (nunca enviado a lugar nenhum, só usado
// internamente pelo Supabase Auth) — o parceiro nunca vê nem digita esse
// e-mail, só o WhatsApp e a senha.

// Rodada 31 — bug real reportado pela Andrea: o link de WhatsApp com a
// senha (montado com este número) "direcionava errado" pra alguns
// locais. Causa: a checagem antiga (`startsWith('55')`) decidia se o
// número JÁ tinha código do país olhando os 2 primeiros dígitos — mas
// DDD 55 é um DDD real (Santa Maria/RS e região). Um celular de lá sem
// código do país já COMEÇA com "55" só por coincidência do DDD
// (ex.: "55999998888", 11 dígitos), e a checagem antiga achava que já
// tinha código do país e não completava — o link saía sem o "55" de
// verdade, apontando pra um número errado/inválido no wa.me.
//
// Corrigido decidindo por TAMANHO em vez de conteúdo: um número
// brasileiro sem código do país sempre tem 10 (fixo, DDD+8) ou 11
// (celular, DDD+9+8) dígitos; com código do país, 12 ou 13. Isso não
// tem ambiguidade nenhuma, porque DDD é sempre 2 dígitos e número local
// é sempre 8 ou 9 — não existe outra leitura possível pra cada tamanho.
// Zeros de tronco (alguém digitando "0" antes do DDD, comum em discagem
// de fixo) são removidos antes de contar, senão o tamanho também engana.
export function normalizarTelefoneBR(whatsapp: string): string {
  const digitos = whatsapp.replace(/\D/g, '').replace(/^0+/, '');
  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  return digitos;
}

// Rodada 31 — os campos de WhatsApp em todo o portal são texto livre,
// sem máscara nem validação (qualquer coisa passa: número sem DDD,
// número incompleto, etc.), o que também pode ter contribuído pro link
// "errado" que a Andrea reportou — o link fica coerente pro que foi
// digitado, mas se o que foi digitado já estava incompleto, nenhuma
// normalização resolve. Esta função dá um aviso ANTES de enviar, sem
// travar o formulário pra sempre (ainda dá pra confirmar mesmo assim se
// a pessoa tiver certeza que está certo — número de fora do Brasil, por
// exemplo, tem outro tamanho).
export function telefoneParecCurto(whatsapp: string): boolean {
  const digitos = whatsapp.replace(/\D/g, '').replace(/^0+/, '');
  return digitos.length > 0 && digitos.length < 10;
}

export function emailSinteticoParceiro(telefoneNormalizado: string): string {
  return `parceiro.${telefoneNormalizado}@login.vezpabar.app`;
}

// Rodada 36 — extraído de /api/aprovar-local pra ser compartilhado com
// /api/aprovar-evento (mesmo padrão de senha temporária pros dois
// fluxos de login automático por WhatsApp).
export function gerarSenhaTemporaria(): string {
  // Sem O/0, I/1/L — evita confusão comum ao digitar uma senha recebida
  // por WhatsApp num teclado de celular.
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let senha = '';
  for (let i = 0; i < 8; i++) {
    senha += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return senha;
}
