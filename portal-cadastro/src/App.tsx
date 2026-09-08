import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { CadastroCompletoForm } from './components/CadastroCompletoForm';
import { CadastroCupomExpressForm } from './components/CadastroCupomExpressForm';

export default function App() {
  const [routePath, setRoutePath] = useState(() => 
    window.location.pathname.toLowerCase() + window.location.hash.toLowerCase()
  );

  useEffect(() => {
    const handleUrlChange = () => {
      setRoutePath(window.location.pathname.toLowerCase() + window.location.hash.toLowerCase());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  if (routePath.includes('/cupom') || routePath.includes('cupom')) {
    return <CadastroCupomExpressForm />;
  }

  if (routePath.includes('/admin') || routePath.includes('admin')) {
    return <AdminDashboard />;
  }

  return <CadastroCompletoForm />;
}