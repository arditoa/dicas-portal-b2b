import { useState } from 'react';
import { Passo1Form } from './components/Passo1Form';
import { Passo2Form } from './components/Passo2Form';
import { AdminModeration } from './components/AdminModeration';
import { GestaoFestas } from './components/GestaoFestas';
import { GestaoCupons } from './components/GestaoCupons';

export function App() {
  const [modo, setModo] = useState<'cadastro' | 'admin' | 'festas' | 'cupons'>('cadastro');
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [partnerId, setPartnerId] = useState<string>('');

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌈</span>
            <h1 className="font-bold text-lg tracking-tight">Dicas LGBT <span className="text-purple-400 font-normal">| Portal</span></h1>
          </div>

          <nav className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setModo('cadastro')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modo === 'cadastro' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cadastro
            </button>
            <button
              onClick={() => setModo('festas')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modo === 'festas' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              🎉 Festas
            </button>
            <button
              onClick={() => setModo('cupons')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modo === 'cupons' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              🏷️ Cupons
            </button>
            <button
              onClick={() => setModo('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modo === 'admin' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {modo === 'admin' && <AdminModeration />}

        {modo === 'festas' && <GestaoFestas partnerId={partnerId} />}

        {modo === 'cupons' && <GestaoCupons partnerId={partnerId} />}

        {modo === 'cadastro' && (
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
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl text-center shadow-sm border border-slate-100 space-y-4">
                <div className="text-4xl">🎉</div>
                <h2 className="text-2xl font-bold text-slate-800">Cadastro Concluído!</h2>
                <p className="text-sm text-slate-500">Seu perfil foi enviado para moderação e em breve estará disponível no app.</p>
                
                <div className="pt-4 flex flex-col gap-2">
                  <button 
                    onClick={() => setModo('festas')}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-lg shadow-pink-500/20 text-sm transition-all"
                  >
                    Cadastrar uma Festa
                  </button>
                  <button 
                    onClick={() => { setEtapa(1); setPartnerId(''); }}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                  >
                    Cadastrar outro espaço
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
