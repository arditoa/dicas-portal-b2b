import { useState } from 'react';
import { CadastroCompletoForm } from './components/CadastroCompletoForm';
import AdminModeration from './components/AdminModeration';
import GestaoFestas from './components/GestaoFestas';
import GestaoCupons from './components/GestaoCupons';
import { AdminLogin } from './components/AdminLogin';

export default function App() {
  const [activeTab] = useState<'cadastro' | 'festas' | 'cupons' | 'admin'>('cadastro');
  const [partnerId] = useState<string | null>(null);
  const [isAdminLogged, setIsAdminLogged] = useState<boolean>(() => {
    return localStorage.getItem('admin_session') === 'true';
  });

  // A tela pública de cadastro renderiza o formulário puro sem cabeçalho/menu interno
  if (activeTab === 'cadastro') {
    return (
      <main className="min-h-screen bg-slate-900 py-8 px-4">
        <CadastroCompletoForm />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'festas' && <GestaoFestas partnerId={partnerId || 'partner-demo'} />}
        {activeTab === 'cupons' && <GestaoCupons partnerId={partnerId || 'partner-demo'} />}
        {activeTab === 'admin' && (
          isAdminLogged ? (
            <AdminModeration />
          ) : (
            <AdminLogin aoLogar={() => setIsAdminLogged(true)} />
          )
        )}
      </main>
    </div>
  );
}
