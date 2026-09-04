import React, { useState } from 'react';

interface AdminLoginProps {
  aoLogar: () => void;
}

export function AdminLogin({ aoLogar }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    // Validação temporária com fallback rápido enquanto conecta ao Supabase
    setTimeout(() => {
      if (email.toLowerCase() === 'andrea@dicaslgbt.com' && senha === 'SenhaForte1234!') {
        localStorage.setItem('admin_session', 'true');
        aoLogar();
      } else {
        setErro('E-mail ou senha incorretos.');
      }
      setCarregando(false);
    }, 600);
  };

  return (
    <div className="max-w-sm mx-auto bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl my-12">
      <h3 className="text-xl font-bold text-white mb-1">Acesso da Equipe</h3>
      <p className="text-xs text-slate-400 mb-6">Área restrita à moderação do Dicas LGBT.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="andrea@dicaslgbt.com"
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••••"
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        {erro && <p className="text-xs text-rose-400 font-semibold">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-lg shadow-purple-600/30"
        >
          {carregando ? 'Entrando...' : 'Entrar no Painel'}
        </button>
      </form>
    </div>
  );
}
