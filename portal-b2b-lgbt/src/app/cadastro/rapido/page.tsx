import { redirect } from 'next/navigation';

// Rodada 130 — o cadastro rápido saiu: existe uma única tela de cadastro (/onboarding).
export default function CadastroRapidoRedirect() {
  redirect('/onboarding');
}
