import { useState, useEffect } from 'react';
import { CadastroCompletoForm } from './components/CadastroCompletoForm';
import { AdminDashboard } from './components/AdminDashboard';

export function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (route === '/admin') {
    return <AdminDashboard />;
  }

  return <CadastroCompletoForm />;
}

export default App;
