import { useState, useEffect } from 'react';
import { CadastroCompletoForm } from './components/CadastroCompletoForm';
import { CadastroCupomExpressForm } from './components/CadastroCupomExpressForm';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (path.startsWith('/cupom')) {
    return <CadastroCupomExpressForm />;
  }

  if (path.startsWith('/admin')) {
    return <AdminDashboard />;
  }

  return <CadastroCompletoForm />;
}
