import React, { useEffect, useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import { CadastroCompletoForm } from './components/CadastroCompletoForm';
import { supabase } from './lib/supabase';
// @ts-ignore
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState<'form' | 'login' | 'admin'>('form');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigateToAdmin = () => {
    if (session) {
      setCurrentView('admin');
    } else {
      setCurrentView('login');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#09090b', color: '#FFF' }}>
        <p>Carregando Portal B2B...</p>
      </div>
    );
  }

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#09090b' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#18181b', borderBottom: '1px solid #27272a' }}>
        <div style={{ cursor: 'pointer', fontWeight: 'bold', color: '#FFF' }} onClick={() => setCurrentView('form')}>
          📍 Portal Parceiros B2B
        </div>
        <div>
          {currentView === 'form' && (
            <button
              onClick={handleNavigateToAdmin}
              style={{ background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
            >
              Área Administrativa 🔒
            </button>
          )}
          {currentView !== 'form' && (
            <button
              onClick={() => setCurrentView('form')}
              style={{ background: '#8257e5', border: 'none', color: '#FFF', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            >
              ← Voltar ao Cadastro
            </button>
          )}
        </div>
      </nav>

      <main style={{ paddingBottom: '40px' }}>
        {currentView === 'form' && <CadastroCompletoForm />}
        {currentView === 'login' && (
          <AdminLogin
            onLoginSuccess={() => setCurrentView('admin')}
          />
        )}
        {currentView === 'admin' && (
          <AdminDashboard
            onLogout={() => {
              supabase.auth.signOut();
              setCurrentView('form');
            }}
          />
        )}
      </main>
    </div>
  );
}