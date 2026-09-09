import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { CadastroCompletoForm } from './components/CadastroCompletoForm';
import { CadastroCupomExpressForm } from './components/CadastroCupomExpressForm';

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname.toLowerCase());
  const [hash, setHash] = useState(() => window.location.hash.toLowerCase());

  useEffect(() => {
    const handleUrlChange = () => {
      setPathname(window.location.pathname.toLowerCase());
      setHash(window.location.hash.toLowerCase());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Verifica se é estritamente a rota de cupons
  const isCupomRoute = pathname === '/cupom' || pathname.startsWith('/cupom/') || hash === '#/cupom' || hash.startsWith('#/cupom');
  
  // Verifica se é estritamente a rota admin
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/') || hash === '#/admin' || hash.startsWith('#/admin');

  if (isCupomRoute) {
    return <CadastroCupomExpressForm />;
  }

  if (isAdminRoute) {
    return <AdminDashboard />;
  }

  // Rota padrão (Home / Cadastro B2B Geral)
  return <CadastroCompletoForm />;
}