import type { Metadata } from 'next';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import RedefinirSenhaForm from './RedefinirSenhaForm';

export const metadata: Metadata = {
  title: 'Redefinir senha — Dicas LGBT+',
  robots: { index: false, follow: false },
};

// Página aberta pelo link do e-mail "Esqueci minha senha" do app.
// O link traz uma sessão temporária de recuperação (Supabase Auth); o
// formulário abaixo só funciona com esse link.
export default function RedefinirSenhaPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      <Header />
      <div className="max-w-md mx-auto px-6 py-12">
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Criar uma nova senha</h1>
        <p className="text-[#A0A0B2] text-sm leading-relaxed mb-8">
          Escolha uma nova senha para a sua conta no Dicas LGBT+. Depois é só voltar ao app e entrar.
        </p>
        <RedefinirSenhaForm />
      </div>
      <Footer />
    </main>
  );
}
