'use client';

// Rodada 129 — tela de entrada do portal do parceiro, refeita:
//  - fundo animado (constelação rosa/roxo) — pedido da Andrea;
//  - login por WhatsApp OU e-mail (como já era), com mostrar/ocultar senha;
//  - "Esqueci minha senha" de verdade (e-mail: link por e-mail; WhatsApp: time);
//  - SEM cadastro solto por e-mail aqui: ele criava conta sem espaço vinculado
//    e a pessoa caía em "Nenhum local vinculado". Quem quer ser parceiro vai
//    pelo cadastro rápido (/onboarding): cadastro → aprovação → acesso por
//    WhatsApp + senha provisória.
import { ArrowLeft, Eye, EyeOff, Loader2, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import FundoAnimado from '../../components/FundoAnimado';
import { linkWhatsappEquipe } from '../../lib/equipe';
import { emailSinteticoParceiro, normalizarTelefoneBR, telefoneParecCurto } from '../../lib/parceiroAuth';
import { supabase } from '../../lib/supabase';

const input =
  'w-full bg-[#0B0B12]/70 border border-white/10 rounded-xl py-3.5 px-4 text-white text-sm placeholder:text-[#626274] focus:outline-none focus:border-[#E1306C] focus:ring-2 focus:ring-[#E1306C]/20 transition';
const rotulo = 'text-xs font-bold text-[#C8C8D8] block mb-1.5';

// Traduz as mensagens do Supabase pro português do dia a dia do parceiro.
function mensagemAmigavel(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'WhatsApp, e-mail ou senha não conferem. No primeiro acesso, use a senha que enviamos no WhatsApp quando seu cadastro foi aprovado.';
  if (m.includes('email not confirmed')) return 'Falta confirmar seu e-mail. Abra o link que enviamos para você.';
  if (m.includes('rate limit') || m.includes('for security purposes'))
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com a internet. Confira e tente de novo.';
  return msg || 'Não foi possível entrar agora. Tente de novo.';
}

export default function LoginPage() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [modo, setModo] = useState<'entrar' | 'esqueci'>('entrar');

  // Quem já está logado vai direto pro painel.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  const ehEmail = identificador.includes('@');

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setAviso('');
    const digitado = identificador.trim();
    if (!digitado) {
      setErro('Digite o WhatsApp ou o e-mail do seu cadastro.');
      return;
    }
    if (!ehEmail && telefoneParecCurto(digitado)) {
      setErro('O WhatsApp parece incompleto. Digite com o DDD, por exemplo (11) 99999-9999.');
      return;
    }
    setCarregando(true);
    try {
      // O login por telefone do Supabase está desligado: por baixo, a conta do
      // parceiro usa um e-mail calculado a partir do WhatsApp (parceiroAuth.ts).
      const email = ehEmail ? digitado : emailSinteticoParceiro(normalizarTelefoneBR(digitado));
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      router.push('/dashboard');
    } catch (err) {
      setErro(mensagemAmigavel(err instanceof Error ? err.message : ''));
    } finally {
      setCarregando(false);
    }
  };

  const enviarLinkPorEmail = async () => {
    setErro('');
    setAviso('');
    setCarregando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(identificador.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      setAviso('Enviamos um link para o seu e-mail. Abra-o para criar uma senha nova (veja também a caixa de spam).');
    } catch (err) {
      setErro(mensagemAmigavel(err instanceof Error ? err.message : ''));
    } finally {
      setCarregando(false);
    }
  };

  const linkTime = linkWhatsappEquipe(
    `Olá! Esqueci a senha do portal do parceiro Dicas LGBT+. Meu WhatsApp de cadastro: ${identificador.trim() || '(informar)'}`
  );

  return (
    <div className="relative min-h-screen text-white">
      <FundoAnimado />

      <Link
        href="/"
        className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition"
      >
        <ArrowLeft size={16} /> Voltar à página inicial
      </Link>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12111A]/80 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
          <div className="relative mx-auto mb-6 h-16 w-48">
            <Image
              src="/logos-dicasapp-semfundo (2).png"
              alt="Dicas LGBT+ Parceiros"
              fill
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-center text-2xl font-black">
            {modo === 'entrar' ? 'Portal do parceiro' : 'Recuperar acesso'}
          </h1>
          <p className="mb-7 mt-1 text-center text-sm text-[#A0A0B2]">
            {modo === 'entrar'
              ? 'Entre para cuidar da sua página, cupons, agenda e fidelidade.'
              : 'Informe o WhatsApp ou e-mail do seu cadastro.'}
          </p>

          {erro && (
            <div role="alert" className="mb-5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-300">
              {erro}
            </div>
          )}
          {aviso && (
            <div role="status" className="mb-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-300">
              {aviso}
            </div>
          )}

          {modo === 'entrar' ? (
            <form onSubmit={entrar} className="space-y-4">
              <div>
                <label htmlFor="identificador" className={rotulo}>WhatsApp ou e-mail</label>
                <input
                  id="identificador"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  required
                  autoFocus
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="(11) 99999-9999 ou seu@email.com"
                  className={input}
                />
                <p className="mt-1.5 text-[11px] text-[#7C7C90]">Use o mesmo WhatsApp ou e-mail do cadastro.</p>
              </div>

              <div>
                <label htmlFor="senha" className={rotulo}>Senha</label>
                <div className="relative">
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Sua senha"
                    className={`${input} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888A0] hover:text-white transition"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E1306C] to-[#A855F7] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#E1306C]/20 transition hover:brightness-110 disabled:opacity-60"
              >
                {carregando && <Loader2 size={16} className="animate-spin" />}
                {carregando ? 'Entrando...' : 'Entrar no painel'}
              </button>

              <button
                type="button"
                onClick={() => { setModo('esqueci'); setErro(''); setAviso(''); }}
                className="block w-full text-center text-xs font-bold uppercase tracking-wide text-[#C8C8D8] hover:text-white transition"
              >
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="identificador2" className={rotulo}>WhatsApp ou e-mail</label>
                <input
                  id="identificador2"
                  type="text"
                  inputMode="email"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="(11) 99999-9999 ou seu@email.com"
                  className={input}
                />
              </div>

              {ehEmail ? (
                <button
                  type="button"
                  disabled={carregando}
                  onClick={enviarLinkPorEmail}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E1306C] to-[#A855F7] py-3.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {carregando && <Loader2 size={16} className="animate-spin" />}
                  Enviar link para o meu e-mail
                </button>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-[#C8C8D8]">
                  <p className="mb-3">
                    Contas criadas com o WhatsApp não têm e-mail para receber link. Nosso time redefine a sua senha rapidinho
                    pelo mesmo WhatsApp que enviou o seu acesso.
                  </p>
                  {linkTime ? (
                    <a
                      href={linkTime}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-xs font-bold text-black transition hover:brightness-110"
                    >
                      <MessageCircle size={15} /> Pedir nova senha no WhatsApp
                    </a>
                  ) : (
                    <p className="font-bold text-white">Chame o time pelo WhatsApp que enviou o seu acesso e peça uma senha nova.</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => { setModo('entrar'); setErro(''); setAviso(''); }}
                className="block w-full text-center text-xs font-bold text-[#C8C8D8] hover:text-white transition"
              >
                Voltar para o login
              </button>
            </div>
          )}

          <div className="mt-7 border-t border-white/10 pt-5 text-center">
            <p className="text-xs text-[#A0A0B2]">Ainda não é parceiro?</p>
            <Link href="/onboarding" className="mt-1 inline-block text-sm font-bold text-[#FF6FA0] hover:text-white transition">
              Quero ser parceiro do Dicas LGBT+
            </Link>
          </div>
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-3 z-10 text-center text-[11px] text-white/50">
        © {new Date().getFullYear()} Dicas LGBT+ ·{' '}
        <Link href="/termos" className="underline-offset-2 hover:text-white hover:underline">Termos de parceiro</Link>
      </footer>
    </div>
  );
}
