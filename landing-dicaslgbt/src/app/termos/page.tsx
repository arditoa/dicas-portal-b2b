import { redirect } from 'next/navigation';
import { URL_PORTAL } from '../../lib/constants';

// Rodada 58 — Guia pede uma página /termos própria com "o texto jurídico
// aprovado". Esse texto já existe e está em produção no portal
// (${URL_PORTAL}/termos, "Termos de cadastro de parceiro") — em vez de
// duplicar (e arriscar as duas cópias ficarem diferentes com o tempo),
// esta rota só redireciona pra lá. Se um dia o texto precisar viver aqui
// de fato (domínio próprio, por exemplo), é só trazer o conteúdo real de
// portal-b2b-lgbt/src/app/termos/page.tsx pra cá.
export default function TermosPage() {
  redirect(`${URL_PORTAL}/termos`);
}
