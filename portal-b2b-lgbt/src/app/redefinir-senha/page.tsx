'use client';

// Rodada 129 — destino do link "Esqueci minha senha" enviado por e-mail.
// O Supabase abre esta página já com uma sessão temporária de recuperação;
// aqui o parceiro só digita a senha nova.
//
// Pré-requisito no painel do Supabase (Authentication → URL Configuration):
// incluir <endereço do portal>/redefinir-senha na lista "Redirect URLs".
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import FundoAnimado from '../../components/FundoAnimado';
import { supabase } from '../../lib/supabase';

const input =
  'w-full bg-[#0B0B12]/70 border border-white/10 rounded-xl py-3.5 px-4 text-white text-sm placeholder:text-[#626274] focus:outline-none focus:border-[#E1306C] focus:ring-2 focus:ring-[#E1306C]/20 transition';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [pronto, setPronto] = useState<'verificando' | 'ok' | 'invalido'>('verificando');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    let ativo = true;
    const { data: ouvinte } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY' && ativo) setPronto('ok');
    });
    // Dá um instante pro Supabase ler o link; se não houver sessão, o link venceu.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (ativo) setPronto(data.session ? 'ok' : 'invalido');
    }, 1200);
    return () => {
      ativo = false;
      clearTimeout(t);
      ouvinte.subscription.unsubscribe();
    };
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (nova.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (nova !== confirmar) { setErro('As duas senhas não são iguais.'); return; }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: nova, data: { senha_trocada: true } });
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    setFeito(true);
    setTimeout(() => router.push('/dashboard'), 1600);
  };

  return (
    <div className="relative min-h-screen text-white">
      <FundoAnimado />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12111A]/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="relative mx-auto mb-6 h-14 w-44">
            <Image src="/logos-dicasapp-semfundo (2).png" alt="Dicas LGBT+ Parceiros" fill className="object-contain" priority />
          </div>

          {pronto === 'verificando' && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#A0A0B2]">
              <Loader2 className="animate-spin" size={18} /> Conferindo o seu link...
            </div>
          )}

          {pronto === 'invalido' && (
            <div className="text-center">
              <h1 className="mb-2 text-xl font-black">Link vencido ou já usado</h1>
              <p className="mb-6 text-sm text-[#A0A0B2]">Peça um link novo na tela de login, em &quot;Esqueci minha senha&quot;.</p>
              <Link href="/login" className="inline-block rounded-xl bg-gradient-to-r from-[#E1306C] to-[#A855F7] px-6 py-3 text-sm font-bold">
                Voltar para o login
              </Link>
            </div>
          )}

          {pronto === 'ok' && !feito && (
            <form onSubmit={salvar} className="space-y-4">
              <h1 className="text-center text-xl font-black">Crie sua nova senha</h1>
              {erro && <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">{erro}</div>}
              <div className="relative">
                <input type={mostrar ? 'text' : 'password'} required minLength={6} autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova senha (mínimo 6 caracteres)" className={`${input} pr-12`} />
                <button type="button" onClick={() => setMostrar((v) => !v)} aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888A0] hover:text-white">
                  {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <input type={mostrar ? 'text' : 'password'} required minLength={6} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repita a nova senha" className={input} />
              <button type="submit" disabled={salvando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E1306C] to-[#A855F7] py-3.5 text-sm font-bold disabled:opacity-60">
                {salvando && <Loader2 size={16} className="animate-spin" />} Salvar senha e entrar
              </button>
            </form>
          )}

          {feito && (
            <div className="py-4 text-center">
              <h1 className="mb-2 text-xl font-black">Senha atualizada!</h1>
              <p className="text-sm text-[#A0A0B2]">Levando você para o seu painel...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
