import { useState, useEffect } from 'react';
import { CadastroCompletoForm } from './components/CadastroCompletoForm';
import { CadastroCupomExpressForm } from './components/CadastroCupomExpressForm';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [currentUrl, setCurrentUrl] = useState(window.location.href);

  useEffect(() => {
    const handleUrlChange = () => setCurrentUrl(window.location.href);
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (pathname.includes('/cupom') || hash.includes('cupom')) {
    return <CadastroCupomExpressForm />;
  }

  if (pathname.includes('/admin') || hash.includes('admin')) {
    return <AdminDashboard />;
  }

  return <CadastroCompletoForm />;
}
