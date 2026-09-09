import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { CadastroCompletoForm } from './components/CadastroCompletoForm';
import { CadastroCupomExpressForm } from './components/CadastroCupomExpressForm';

export default function App() {
  const [currentUrl, setCurrentUrl] = useState(() => window.location.href.toLowerCase());

  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentUrl(window.location.href.toLowerCase());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const isCupom = currentUrl.includes('/cupom') || currentUrl.includes('#/cupom') || currentUrl.includes('cupom');
  const isAdmin = currentUrl.includes('/admin') || currentUrl.includes('#/admin') || currentUrl.includes('admin');

  return (
    <div>
      <nav style={{
        backgroundColor: '#0B0A10',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <a 
          href="/" 
          onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/'); setCurrentUrl(window.location.href); }}
          style={{
            color: (!isCupom && !isAdmin) ? '#C084FC' : '#94A3B8',
            fontWeight: (!isCupom && !isAdmin) ? 'bold' : 'normal',
            textDecoration: 'none',
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: (!isCupom && !isAdmin) ? 'rgba(124, 58, 237, 0.2)' : 'transparent'
          }}
        >
          📝 Cadastro B2B
        </a>
        <a 
          href="/cupom" 
          onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/cupom'); setCurrentUrl(window.location.href); }}
          style={{
            color: isCupom ? '#C084FC' : '#94A3B8',
            fontWeight: isCupom ? 'bold' : 'normal',
            textDecoration: 'none',
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: isCupom ? 'rgba(124, 58, 237, 0.2)' : 'transparent'
          }}
        >
          ⚡ Cupons Express
        </a>
        <a 
          href="/admin" 
          onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/admin'); setCurrentUrl(window.location.href); }}
          style={{
            color: isAdmin ? '#C084FC' : '#94A3B8',
            fontWeight: isAdmin ? 'bold' : 'normal',
            textDecoration: 'none',
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: isAdmin ? 'rgba(124, 58, 237, 0.2)' : 'transparent'
          }}
        >
          🔐 Admin
        </a>
      </nav>

      {isCupom ? <CadastroCupomExpressForm /> : isAdmin ? <AdminDashboard /> : <CadastroCompletoForm />}
    </div>
  );
}