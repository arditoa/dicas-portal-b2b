'use client';
// Entrar ou criar conta para comprar ingresso pelo site. É a MESMA conta do app Dicas LGBT+:
// os ingressos comprados aqui aparecem em "Meus ingressos" no app e no site. Mesmas regras do cadastro do app:
// 18 anos ou mais, nome como quer ser chamada(o), aceite dos termos.
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const paraISO = (v: string) => {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(iso + 'T12:00:00');
  return Number.isNaN(d.getTime()) || d.getDate() !== Number(m[1]) ? null : iso;
};
const maisDe18 = (iso: string) => { const n = new Date(iso + 'T12:00:00'); const lim = new Date(); lim.setFullYear(lim.getFullYear() - 18); return n <= lim; };
const mascaraData = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 8); return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
const traduz = (m: string) => /Invalid login/i.test(m) ? 'E-mail ou senha incorretos.' : /already registered/i.test(m) ? 'Este e-mail já tem conta. Use "Entrar".'
  : /Email not confirmed/i.test(m) ? 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).' : /Password should/i.test(m) ? 'A senha precisa ter pelo menos 8 caracteres.' : m;

const campo = 'w-full bg-[#0B0B0E] border border-[#2A2840] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]';

export default function ContaComprador({ aoEntrar }: { aoEntrar?: () => void }) {
  const [modo, setModo] = useState<'entrar' | 'criar'>('criar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nasc, setNasc] = useState('');
  const [tel, setTel] = useState('');
  const [aceito, setAceito] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; txt: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (modo === 'entrar') {
      setEnviando(true);
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
      setEnviando(false);
      if (error) return setMsg({ tipo: 'erro', txt: traduz(error.message) });
      return aoEntrar?.();
    }
    const iso = paraISO(nasc);
    if (nome.trim().length < 2) return setMsg({ tipo: 'erro', txt: 'Como você quer ser chamada(o)?' });
    if (!iso) return setMsg({ tipo: 'erro', txt: 'Data de nascimento no formato DD/MM/AAAA.' });
    if (!maisDe18(iso)) return setMsg({ tipo: 'erro', txt: 'Você precisa ter 18 anos ou mais.' });
    if (senha.length < 8) return setMsg({ tipo: 'erro', txt: 'A senha precisa ter pelo menos 8 caracteres.' });
    if (!aceito) return setMsg({ tipo: 'erro', txt: 'Para criar a conta, aceite os Termos de uso e a Política de privacidade.' });
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password: senha,
      options: { data: { full_name: nome.trim(), social_name: nome.trim(), phone: tel.replace(/\D/g, '') || null, birth_date: iso },
                 emailRedirectTo: typeof window !== 'undefined' ? window.location.href : undefined },
    });
    setEnviando(false);
    if (error) return setMsg({ tipo: 'erro', txt: traduz(error.message) });
    if (data.session) return aoEntrar?.();
    setMsg({ tipo: 'ok', txt: 'Quase lá! Enviamos um e-mail de confirmação. Confirme e volte para esta página para comprar.' });
  };

  return (
    <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5">
      <div className="flex gap-2 mb-4">
        {(['criar', 'entrar'] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setModo(m); setMsg(null); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold ${modo === m ? 'bg-white text-black' : 'border border-[#2A2840] text-white'}`}>
            {m === 'criar' ? 'Criar conta' : 'Já tenho conta'}
          </button>
        ))}
      </div>
      <p className="text-[#A0A0B2] text-xs mb-4">É a mesma conta do app Dicas LGBT+. Seus ingressos ficam no site e no app.</p>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        {modo === 'criar' && <input className={campo} placeholder="Como quer ser chamada(o)" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} autoComplete="name" />}
        <input className={campo} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input className={campo} type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} />
        {modo === 'criar' && (
          <>
            <input className={campo} placeholder="Nascimento (DD/MM/AAAA)" inputMode="numeric" value={nasc} onChange={(e) => setNasc(mascaraData(e.target.value))} />
            <input className={campo} placeholder="WhatsApp (opcional)" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" />
            <label className="flex items-start gap-2 text-xs text-[#A0A0B2]">
              <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5" />
              <span>Li e aceito os <a href="/termos" target="_blank" className="underline text-white">Termos de uso e a Política de privacidade</a>. Tenho 18 anos ou mais.</span>
            </label>
          </>
        )}
        {msg && <div className={`text-xs p-3 rounded-xl border ${msg.tipo === 'erro' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>{msg.txt}</div>}
        <button disabled={enviando} className="bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl">
          {enviando ? 'Aguarde…' : modo === 'criar' ? 'Criar conta e continuar' : 'Entrar e continuar'}
        </button>
        {modo === 'entrar' && <a href="/redefinir-senha" className="text-xs text-[#A0A0B2] underline text-center">Esqueci a senha</a>}
      </form>
    </div>
  );
}
