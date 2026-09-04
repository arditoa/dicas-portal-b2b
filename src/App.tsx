import { useState } from 'react';
import { AdminModeration } from './components/AdminModeration';
import { Passo1Form } from './components/Passo1Form';
import { Passo2Form } from './components/Passo2Form';

export function App() {
  const [modo, setModo] = useState<'cadastro' | 'admin'>('cadastro');
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [partnerId, setPartnerId] = useState<string>('');

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px 24px', 
        backgroundColor: '#1E1B4B', 
        color: '#FFF' 
      }}>
        <h1 style={{ fontSize: 18, margin: 0, fontWeight: 'bold' }}>Dicas LGBT — Portal</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setModo('cadastro')}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: modo === 'cadastro' ? '#6D28D9' : 'transparent',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: modo === 'cadastro' ? 'bold' : 'normal'
            }}
          >
            Formulário de Cadastro
          </button>
          <button
            onClick={() => setModo('admin')}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: modo === 'admin' ? '#6D28D9' : 'transparent',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: modo === 'admin' ? 'bold' : 'normal'
            }}
          >
            Painel Admin (Moderação)
          </button>
        </div>
      </header>

      <main style={{ padding: 20 }}>
        {modo === 'admin' ? (
          <AdminModeration />
        ) : (
          <div>
            {etapa === 1 && (
              <Passo1Form 
                onSuccess={(idGerado: string) => {
                  setPartnerId(idGerado);
                  setEtapa(2);
                }} 
              />
            )}

            {etapa === 2 && (
              <Passo2Form 
                partnerId={partnerId} 
                onSuccess={() => setEtapa(3)} 
              />
            )}

            {etapa === 3 && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <h2>🎉 Cadastro Concluído!</h2>
                <p>Seu perfil foi enviado para moderação.</p>
                <button 
                  onClick={() => { setEtapa(1); setPartnerId(''); }}
                  style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
                >
                  Cadastrar outro espaço
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
