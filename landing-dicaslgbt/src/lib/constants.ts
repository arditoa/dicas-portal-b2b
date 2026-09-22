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
// (Instagram @dicaslgbt, WhatsApp oficial), já preenchidos em
// .env.local no computador dela; ainda faltam as mesmas variáveis nas
// Environment Variables do projeto na Vercel antes do deploy valer pra
// produção (.env.local só vale local).
// URL real do site institucional (Rodada 59 — domínio próprio confirmado
// pela Andrea). Usado no metadata do layout (Open Graph / canonical).
export const URL_SITE = 'https://www.dicaslgbt.com.br';
export const SUPORTE_EMAIL = process.env.NEXT_PUBLIC_SUPORTE_EMAIL || '';
export const SUPORTE_WHATSAPP = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP || '';
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || '';
// WhatsApp comercial do time (Seção 1/2 da página Parceiro Fundador pede
// "conversa comercial no WhatsApp") — pode ser o mesmo número de
// SUPORTE_WHATSAPP ou um diferente; variável própria pra dar liberdade.
export const WHATSAPP_COMERCIAL = process.env.NEXT_PUBLIC_WHATSAPP_COMERCIAL || SUPORTE_WHATSAPP;

export function linkWhatsapp(numero: string, mensagem: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

// Seção 1 do Guia — Mapa do site. Usado pelo Header/Footer compartilhados
// pra não repetir a mesma lista de links em cada componente.
export const NAV_ITEMS = [
  { label: 'Cadastrar empresa', href: '/#cadastro' },
  { label: 'Parceiro Fundador', href: '/parceiro-fundador' },
  { label: 'Sobre o Dicas', href: '/sobre' },
  { label: 'Aplicativo', href: '/app' },
  { label: 'Dicas Trip', href: '/dicas-trip' },
  { label: 'Lista de lançamento', href: '/lancamento' },
  { label: 'Área do Parceiro', href: '/entrar' },
] as const;
