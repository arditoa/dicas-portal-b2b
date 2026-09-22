// Rodada 58 — constantes compartilhadas entre as páginas novas do site
// institucional (Guia_Configuracao_Site_Dicas_LGBT_App.docx). Centralizado
// aqui em vez de repetir em cada page.tsx, já que agora são 9 páginas
// usando a mesma URL do portal e os mesmos contatos oficiais.

// URL real do portal de parceiros já publicado (projeto Next separado,
// deploy próprio na Vercel) — ajustar aqui se/quando um domínio
// definitivo (ex.: portal.vezpabar.com) for configurado. Mesma constante
// que já existe em portal-b2b-lgbt/src/app/admin/page.tsx.
export const URL_PORTAL = 'https://dicas-portal-b2b-dun.vercel.app';

// Rodada 42 já tinha deixado SUPORTE_EMAIL/SUPORTE_WHATSAPP em branco de
// propósito (sem canal oficial confirmado pra preencher sem inventar).
// A Rodada 58 pediu também um Instagram oficial no rodapé e um WhatsApp
// comercial pro botão "Quero ser Parceiro Fundador" — mesmo princípio:
// variável de ambiente, com aviso visível em vez de link morto enquanto
// não for preenchida. Rodada 59 — Andrea passou os valores reais
// (Instagram @dicaslgbt, WhatsApp oficial).
// URL real do site institucional (Rodada 59 — domínio próprio confirmado
// pela Andrea). Usado no metadata do layout (Open Graph / canonical).
export const URL_SITE = 'https://www.dicaslgbt.com.br';
export const SUPORTE_EMAIL = process.env.NEXT_PUBLIC_SUPORTE_EMAIL || '';
// Rodada 59 (parte 3) — o rodapé estava caindo no aviso "contatos não
// configurados" em produção porque as Environment Variables ainda não
// tinham sido cadastradas na Vercel (o .env.local só vale local/build
// próprio). Andrea confirmou o WhatsApp e o Instagram oficiais mais de
// uma vez nesta rodada, então virou o valor padrão direto no código —
// funciona mesmo se a variável de ambiente da Vercel nunca for
// preenchida, e continua substituível por env var se precisar trocar.
export const SUPORTE_WHATSAPP = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP || '5511942942028';
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/dicaslgbt/';
// WhatsApp comercial do time (Seção 1/2 da página Parceiro Fundador pede
// "conversa comercial no WhatsApp") — pode ser o mesmo número de
// SUPORTE_WHATSAPP ou um diferente; variável própria pra dar liberdade.
export const WHATSAPP_COMERCIAL = process.env.NEXT_PUBLIC_WHATSAPP_COMERCIAL || SUPORTE_WHATSAPP;

export function linkWhatsapp(numero: string, mensagem: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

// Seção 1 do Guia — Mapa do site. Usado pelo Header/Footer compartilhados
// pra não repetir a mesma lista de links em cada componente.
// Rodada 59 (parte 3) — Andrea pediu pra melhorar o topo e notou que já
// existe o botão "Já sou parceiro" (também → /entrar): removido o item
// "Área do Parceiro" daqui pra não duplicar o mesmo destino duas vezes
// no cabeçalho.
export const NAV_ITEMS = [
  { label: 'Cadastrar empresa', href: '/#cadastro' },
  { label: 'Parceiro Fundador', href: '/parceiro-fundador' },
  { label: 'Sobre o Dicas', href: '/sobre' },
  { label: 'Aplicativo', href: '/app' },
  { label: 'Dicas Trip', href: '/dicas-trip' },
  { label: 'Lista de lançamento', href: '/lancamento' },
] as const;
