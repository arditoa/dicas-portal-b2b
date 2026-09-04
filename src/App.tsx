import React, { useState } from 'react';
import Passo1Form from '../portal-cadastro/src/components/Passo1Form';
import Passo2Form from '../portal-cadastro/src/components/Passo2Form';
import AdminModeration from '../portal-cadastro/src/components/AdminModeration';
import GestaoFestas from '../portal-cadastro/src/components/GestaoFestas';
import GestaoCupons from '../portal-cadastro/src/components/GestaoCupons';

export default function App() {
  const [activeTab, setActiveTab] = useState<'cadastro' | 'festas' | 'cupons' | 'admin'>('cadastro');
  const [step, setStep] = useState<1 | 2>(1);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Header / Menu de Navegação Superior */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌈</span>
            <div>
              <h1 className="font-bold text-lg text-white leading-none">Dicas LGBT</h1>
              <p className="text-xs text-purple-400">Portal de Parceiros & Gestão B2B</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('cadastro')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'cadastro'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              📝 Cadastro
            </button>
            <button
              onClick={() => setActiveTab('festas')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'festas'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🎉 Festas
            </button>
            <button
              onClick={() => setActiveTab('cupons')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'cupons'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🏷️ Cupons
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🛡️ Admin
            </button>
          </nav>
        </div>
      </header>

      {/* Conteúdo das Abas */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'cadastro' && (
          <div>
            {step === 1 ? (
              <Passo1Form
                onSuccess={(id: string) => {
                  setPartnerId(id);
                  setStep(2);
                }}
              />
            ) : (
              <Passo2Form
                partnerId={partnerId || ''}
                onSuccess={() => {
                  alert('Cadastro enviado com sucesso para moderação!');
                  setActiveTab('admin');
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'festas' && <GestaoFestas partnerId={partnerId || 'partner-demo'} />}
        {activeTab === 'cupons' && <GestaoCupons partnerId={partnerId || 'partner-demo'} />}
        {activeTab === 'admin' && <AdminModeration />}
      </main>
    </div>
  );
}
