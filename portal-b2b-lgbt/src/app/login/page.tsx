'use client';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeEspaco, setNomeEspaco] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nome_estabelecimento: nomeEspaco } },
        });
        if (error) throw error;
        router.push('/onboarding');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error("Erro no login:", err);
      setErrorMsg(err.message || 'Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] flex flex-col md:flex-row text-white">
      <div className="hidden md:flex md:w-1/2 bg-[#161520] border-r border-[#232230] p-12 flex-col justify-between relative overflow-hidden">
        <div className="flex items-center gap-3 z-10">
          <div className="w-9 h-9 rounded-full bg-[#E1306C] flex items-center justify-center text-white font-bold text-sm">♥</div>
          <span className="text-white font-black text-lg">Dicas LGBT+ <span className="text-[#A0A0B2] font-normal text-sm">Parceiros</span></span>
        </div>
        <div className="max-w-md z-10 my-auto">
          <div className="inline-flex items-center gap-2 bg-[#E1306C]/10 border border-[#E1306C]/20 px-3 py-1.5 rounded-full text-[#E1306C] text-xs font-extrabold mb-6">
            <Sparkles size={14} /> PORTAL B2B EXCLUSIVO
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Conecte seu espaço à maior rede de turismo e lazer LGBT+.
          </h1>
          <p className="text-[#A0A0B2] text-sm leading-relaxed mb-8">
            Gerencie sua presença no mapa, disponibilize listas VIP e acompanhe suas métricas em tempo real.
          </p>
        </div>
        <div className="z-10 pt-6 border-t border-[#232230] text-xs text-[#626274]">
          © 2026 Dicas Trip LGBT+
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="text-center md:text-left mb-8">
            <h2 className="text-2xl font-black text-white">{isRegister ? 'Cadastre seu espaço' : 'Acesse o portal'}</h2>
            <p className="text-[#A0A0B2] text-xs mt-1">
              {isRegister ? 'Preencha os dados básicos para criar sua conta.' : 'Insira suas credenciais para gerenciar seu espaço.'}
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6 text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Nome do Local</label>
                <input
                  type="text"
                  required
                  value={nomeEspaco}
                  onChange={(e) => setNomeEspaco(e.target.value)}
                  placeholder="Ex: Bar Aurora"
                  className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                />
              </div>
            )}
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-3.5 rounded-xl transition text-sm"
            >
              {loading ? 'Carregando...' : isRegister ? 'Cadastrar' : 'Entrar no Painel'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#232230] text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); }}
              className="text-xs text-[#A0A0B2] hover:text-white"
            >
              {isRegister ? 'Já possui conta? Entrar' : 'Ainda não é parceiro? Cadastrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}