import { redirect } from 'next/navigation';

// Rodada 130 — existe uma única tela de cadastro: /onboarding (Local e Festa juntos).
export default function CadastroLocalRedirect() {
  redirect('/onboarding');
}
