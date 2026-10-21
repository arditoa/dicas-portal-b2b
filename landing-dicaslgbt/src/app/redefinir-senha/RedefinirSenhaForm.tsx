'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Estado = 'verificando' | 'pronto' | 'invalido' | 'salvo';

export default function RedefinirSenhaForm() {
  const [estado, setEstado] = useState<Estado>('verificando');
  const [senha, setSenha] = useState('');
  const [repete, setRepete] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // O link do e-mail traz o token na parte "#..." do endereço; o Supabase
    // lê isso sozinho e avisa com o evento PASSWORD_RECOVERY.
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') setEstado('pronto');
    });
    const temToken = typeof window !== 'undefined' && /type=recovery|access_token|error_code/.test(window.location.hash);
    const t = setTimeout(() => {
      setEstado((atual) => (atual === 'verificando' ? 'invalido' : atual));
    }, temToken ? 4000 : 800);
    return () => {
      clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) {
      setErro('Use pelo menos 6 caracteres.');
      return;
    }
    if (senha !== repete) {
      setErro('As duas senhas precisam ser iguais.');
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) {
      const m = (error.message || '').toLowerCase();
      setErro(
        m.includes('same') || m.includes('different')
          ? 'A nova senha precisa ser diferente da anterior.'
          : m.includes('at least')
          ? 'Use pelo menos 6 caracteres.'
          : 'Não foi possível salvar. O link pode ter expirado: peça outro no app.'
      );
      return;
    }
    await supabase.auth.signOut();
    setEstado('salvo');
  }

  if (estado === 'verificando') {
    return <p className="text-[#A0A0B2] text-sm">Verificando o link…</p>;
  }

  if (estado === 'invalido') {
    return (
      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
        <h2 className="font-bold mb-2">Link inválido ou expirado</h2>
        <p className="text-[#A0A0B2] text-sm leading-relaxed">
          Esse link só funciona uma vez e por pouco tempo. Abra o app, toque em{' '}
          <strong className="text-white">Esqueci minha senha</strong> e peça um novo e-mail.
        </p>
      </div>
    );
  }

  if (estado === 'salvo') {
    return (
      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
        <h2 className="font-bold mb-2">Senha alterada</h2>
        <p className="text-[#A0A0B2] text-sm leading-relaxed">
          Pronto! Agora volte ao app Dicas LGBT+ e entre com a sua nova senha.
        </p>
      </div>
    );
  }

  const campo =
    'w-full bg-[#12121A] border border-[#232230] rounded-xl px-4 py-3 text-sm text-white placeholder-[#6B6B7E] focus:outline-none focus:border-[#E1306C]';

  return (
    <form onSubmit={salvar} className="bg-[#161520] border border-[#232230] rounded-2xl p-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[#A0A0B2]">Nova senha (mínimo 6 caracteres)</span>
        <input
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className={campo}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[#A0A0B2]">Repita a nova senha</span>
        <input
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={repete}
          onChange={(e) => setRepete(e.target.value)}
          className={campo}
        />
      </label>
      {erro && (
        <p role="alert" className="text-sm text-red-400">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="bg-[#E1306C] hover:opacity-90 disabled:opacity-60 text-white font-bold text-sm px-4 py-3 rounded-xl transition"
      >
        {enviando ? 'Salvando…' : 'Salvar nova senha'}
      </button>
    </form>
  );
}
