'use client';

// Rodada 129 — "casca" profissional do painel do parceiro (mesmo padrão do
// portal admin): menu lateral agrupado, cabeçalho com plano e sino de
// lembretes, caixa "Como funciona" em cada tela e assistente de primeiro
// acesso (troca da senha provisória).
//
// Carrega o parceiro uma vez e o compartilha por contexto (useParceiro).
// Contas sem espaço vinculado (admin, organizador de evento, sem vínculo)
// continuam funcionando como antes: a casca só renderiza as páginas.
import type { User } from '@supabase/supabase-js';
import {
  Bell,
  BedDouble,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  Gift,
  House,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Package,
  PartyPopper,
  Plane,
  ShieldCheck,
  Store,
  Ticket,
  TrendingUp,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CAMPOS_LOCAL,
  PLANO_INFO,
  adiarLembrete,
  categoriaComAgenda,
  diagnosticar,
  ehContaWhatsApp,
  lerAdiados,
  montarChecklist,
  montarLembretes,
  planoEfetivo,
  type Diagnostico,
  type Lembrete,
  type LocalParceiro,
} from '../../lib/parceiro';
import CaixaComoFunciona from './CaixaComoFunciona';
import { ParceiroProvider } from './ParceiroContext';
import { gravarMarcaAtiva, lerMarcaAtiva } from '../../lib/marcaAtiva';

type ItemMenu = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  visivel?: (l: LocalParceiro, podePacotes: boolean | null) => boolean;
  /** Texto do cadeado quando o plano atual ainda não libera o recurso. */
  bloqueio?: (plano: ReturnType<typeof planoEfetivo>) => string | null;
};

const GRUPOS: { titulo: string | null; itens: ItemMenu[] }[] = [
  { titulo: null, itens: [{ href: '/dashboard', rotulo: 'Início', icone: House }] },
  {
    titulo: 'Divulgar',
    itens: [
      {
        href: '/dashboard/cupons',
        rotulo: 'Cupons',
        icone: Ticket,
        bloqueio: (p) => (p === 'freemium' ? 'Cupons chegam com o plano Intermediário ou superior.' : null),
      },
      { href: '/dashboard/agenda', rotulo: 'Agenda da semana', icone: CalendarDays, visivel: (l) => categoriaComAgenda(l.categoria) && l.categoria !== 'eventos' },
      { href: '/dashboard/eventos', rotulo: 'Meus eventos', icone: PartyPopper, visivel: (l) => categoriaComAgenda(l.categoria) },
      { href: '/dashboard/lista-vip', rotulo: 'Lista VIP', icone: Users, visivel: (l) => categoriaComAgenda(l.categoria) },
      { href: '/dashboard/destaques', rotulo: 'Destaques e resultados', icone: TrendingUp },
      { href: '/dashboard/pacotes', rotulo: 'Pacotes e roteiros', icone: Plane, visivel: (l, pp) => (pp ?? l.categoria === 'turismo') },
      { href: '/dashboard/produtos', rotulo: 'Catálogo de produtos', icone: Package, visivel: (l) => l.categoria === 'produtos' },
      { href: '/dashboard/hospedagem', rotulo: 'Cadastro da hospedagem', icone: BedDouble, visivel: (l) => l.categoria === 'turismo' },
    ],
  },
  {
    titulo: 'Fidelizar',
    itens: [
      { href: '/dashboard/checkins', rotulo: 'Check-ins', icone: ClipboardCheck },
      { href: '/dashboard/fidelidade', rotulo: 'Fidelidade', icone: Gift },
    ],
  },
  {
    titulo: 'Meu espaço',
    itens: [
      { href: '/dashboard/perfil', rotulo: 'Minha página', icone: Store },
      { href: '/planos', rotulo: 'Meu plano', icone: CreditCard },
    ],
  },
];

const COR_NIVEL = { agora: 'bg-[#E1306C]', semana: 'bg-amber-400', dica: 'bg-[#8888A0]' } as const;

export default function ParceiroShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const caminhoInicial = useRef(pathname);

  const [carregando, setCarregando] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [local, setLocal] = useState<LocalParceiro | null>(null);
  const [marcas, setMarcas] = useState<{ id: string; nome: string; categoria: string }[]>([]);
  const [podePacotes, setPodePacotes] = useState<boolean | null>(null);
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [adiados, setAdiados] = useState<Record<string, number>>({});
  const [menuAberto, setMenuAberto] = useState(false);
  const [sinoAberto, setSinoAberto] = useState(false);
  const [modalSenha, setModalSenha] = useState(false);
  const sinoRef = useRef<HTMLDivElement>(null);
  const corrida = useRef(0);

  // ---- carga inicial: sessão, perfil, espaço ----
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        router.replace('/login');
        return;
      }
      setUser(u.user);
      const naRaiz = caminhoInicial.current === '/dashboard';

      const { data: perfil } = await supabase.from('profiles').select('role').eq('id', u.user.id).maybeSingle();
      const admin = perfil?.role === 'admin';

      // Portal único: o dono pode ter várias marcas (locais). A ativa é a última escolhida neste navegador.
      const { data: lista, error } = await supabase
        .from('locais')
        .select(CAMPOS_LOCAL)
        .eq('owner_id', u.user.id)
        .order('created_at', { ascending: true });
      const marcasDoDono = (lista || []) as unknown as LocalParceiro[];
      const guardada = lerMarcaAtiva();
      const l = marcasDoDono.find((m) => m.id === guardada) || marcasDoDono[0] || null;

      if (error || !l) {
        // A conta admin da Andrea não é dona de local: o painel dela é o /admin.
        if (admin && naRaiz) { router.replace('/admin'); return; }
        // Organizador de evento independente: a tela dele é /dashboard/eventos.
        if (!admin && naRaiz) {
          const { data: ev } = await supabase.rpc('meus_eventos_gerenciaveis');
          if ((ev || []).length > 0) { router.replace('/dashboard/eventos'); return; }
        }
        setCarregando(false);
        return;
      }

      if (admin && naRaiz) { router.replace('/admin'); return; }
      gravarMarcaAtiva(l.id);
      setMarcas(marcasDoDono.map((m) => ({ id: m.id, nome: m.nome, categoria: m.categoria })));
      setLocal(l as unknown as LocalParceiro);
      const { data: pp, error: ePP } = await supabase.from('locais').select('pode_subir_pacotes').eq('id', (l as { id: string }).id).maybeSingle();
      if (!ePP && pp) setPodePacotes(!!(pp as { pode_subir_pacotes: boolean }).pode_subir_pacotes);
      setAdiados(lerAdiados((l as { id: string }).id));
      setCarregando(false);
    })();
  }, [router]);

  // ---- diagnóstico: a cada tela visitada (pega o que o parceiro acabou de salvar) ----
  const recarregar = useCallback(async () => {
    if (!local || !user) return;
    const minha = ++corrida.current;
    // espaço pode ter mudado (foto, descrição...) — relê antes de diagnosticar
    const { data: l } = await supabase.from('locais').select(CAMPOS_LOCAL).eq('id', local.id).maybeSingle();
    const atual = (l as unknown as LocalParceiro) || local;
    const d = await diagnosticar(supabase, atual, user);
    if (minha !== corrida.current) return;
    setLocal(atual);
    setDiag(d);
  }, [local?.id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (local && user) recarregar();
  }, [pathname, local?.id, user, recarregar]); // eslint-disable-line react-hooks/exhaustive-deps

  // trocou a senha em qualquer lugar → atualiza usuário e lembretes
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'USER_UPDATED') {
        supabase.auth.getUser().then(({ data: u }) => u?.user && setUser(u.user));
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // fecha menus ao navegar / clicar fora
  useEffect(() => { setMenuAberto(false); setSinoAberto(false); }, [pathname]);
  useEffect(() => {
    if (!sinoAberto) return;
    const fora = (e: MouseEvent) => {
      if (sinoRef.current && !sinoRef.current.contains(e.target as Node)) setSinoAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [sinoAberto]);

  // primeiro acesso: abre o assistente de senha uma vez por sessão
  useEffect(() => {
    if (!diag?.senhaProvisoria) return;
    try {
      if (window.sessionStorage.getItem('senha_assistente_visto') === '1') return;
      window.sessionStorage.setItem('senha_assistente_visto', '1');
    } catch { /* abre mesmo assim */ }
    setModalSenha(true);
  }, [diag?.senhaProvisoria]);

  const plano = local ? planoEfetivo(local) : 'freemium';
  const pago = plano !== 'freemium';

  const todosLembretes = useMemo(() => (local && diag ? montarLembretes(local, diag) : []), [local, diag]);
  const lembretes = useMemo(
    () => todosLembretes.filter((l) => l.fixo || !(adiados[l.id] > Date.now())),
    [todosLembretes, adiados]
  );
  const checklist = useMemo(
    () => (local && diag && user ? montarChecklist(local, diag, ehContaWhatsApp(user)) : []),
    [local, diag, user]
  );
  const pendentesNoSino = lembretes.filter((l) => l.nivel !== 'dica').length;
  const hrefComPendencia = useMemo(
    () => new Set(lembretes.filter((l) => l.nivel !== 'dica').map((l) => l.href)),
    [lembretes]
  );

  const adiar = useCallback((id: string) => {
    if (local) setAdiados(adiarLembrete(local.id, id, 24));
  }, [local]);

  const sair = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  // Sem espaço vinculado: sem menu, a página decide o que mostrar.
  if (!local || !user) return <>{children}</>;

  const planoInfo = PLANO_INFO[plano];
  const ativo = (href: string) => (href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(href + '/'));

  const Menu_ = (
    <nav className="px-3 pb-4" aria-label="Menu do parceiro">
      {GRUPOS.map((g, gi) => {
        const itens = g.itens.filter((it) => !it.visivel || it.visivel(local, podePacotes));
        if (itens.length === 0) return null;
        return (
          <div key={gi} className="mb-4">
            {g.titulo && <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-[#626274]">{g.titulo}</p>}
            {itens.map((it) => {
              const Icone = it.icone;
              const on = ativo(it.href);
              const bloqueio = it.bloqueio?.(plano) ?? null;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={bloqueio ?? undefined}
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition ${
                    on ? 'bg-[#E1306C]/15 text-white' : 'text-[#A0A0B2] hover:bg-[#1D1C29] hover:text-white'
                  }`}
                >
                  <Icone size={16} className={on ? 'text-[#E1306C]' : ''} />
                  <span className="flex-1 truncate">{it.rotulo}</span>
                  {bloqueio && <Lock size={12} className="text-[#8888A0]" aria-label="Plano necessário" />}
                  {!bloqueio && hrefComPendencia.has(it.href) && (
                    <span className="h-2 w-2 rounded-full bg-amber-400" aria-label="Tem algo para fazer aqui" />
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
      <div className="mt-2 border-t border-[#232230] pt-3">
        <Link
          href="/dashboard/ajuda"
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition ${
            ativo('/dashboard/ajuda') ? 'bg-[#E1306C]/15 text-white' : 'text-[#A0A0B2] hover:bg-[#1D1C29] hover:text-white'
          }`}
        >
          <CircleHelp size={16} className={ativo('/dashboard/ajuda') ? 'text-[#E1306C]' : ''} /> Ajuda
        </Link>
        <button onClick={sair} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#626274] transition hover:bg-[#1D1C29] hover:text-white">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </nav>
  );

  return (
    <ParceiroProvider
      value={{
        user,
        local,
        plano,
        pago,
        podePacotes,
        diagnostico: diag,
        lembretes,
        checklist,
        adiar,
        recarregar,
        abrirTrocaSenha: () => setModalSenha(true),
      }}
    >
      <div className="min-h-screen text-white md:flex">
        {/* MENU LATERAL (desktop) */}
        <aside className="hidden border-r border-[#232230] bg-[#0E0D14] md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto">
          <div className="px-5 py-5">
            <div className="relative mb-1 h-11 w-36">
              <Image src="/logos-dicasapp-semfundo (2).png" alt="Dicas LGBT+" fill className="object-contain object-left" />
            </div>
            <p className="text-[11px] text-[#8888A0]">Portal do parceiro</p>
          </div>
          {Menu_}
        </aside>

        {/* MENU (celular) — gaveta */}
        {menuAberto && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button aria-label="Fechar menu" className="absolute inset-0 bg-black/60" onClick={() => setMenuAberto(false)} />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-[#0E0D14] shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-base font-black">Portal do parceiro</p>
                <button onClick={() => setMenuAberto(false)} aria-label="Fechar" className="text-[#A0A0B2]"><X size={20} /></button>
              </div>
              {Menu_}
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* CABEÇALHO */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#232230] bg-[#0B0B0E]/85 px-4 py-3 backdrop-blur md:px-8">
            <button className="rounded-lg border border-[#232230] p-2 text-[#C8C8D8] md:hidden" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              {marcas.length > 1 ? (
                <select
                  value={local.id}
                  onChange={(e) => { gravarMarcaAtiva(e.target.value); window.location.href = '/dashboard'; }}
                  aria-label="Trocar de marca"
                  className="max-w-full truncate rounded-lg border border-[#232230] bg-[#161520] px-2 py-1 text-sm font-bold text-white focus:border-[#E1306C] focus:outline-none"
                >
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              ) : (
                <p className="truncate text-sm font-bold">{local.nome}</p>
              )}
              <p className="flex items-center gap-2 text-[11px] text-[#8888A0]">
                <span className="rounded-full bg-[#E1306C]/15 px-2 py-0.5 font-bold text-[#FF7AA8]">Plano {planoInfo.nome}</span>
                {local.status === 'pendente' && <span className="text-amber-300">em análise</span>}
                {local.safe_space && (
                  <span className="inline-flex items-center gap-1 text-[#4CAF7D]"><ShieldCheck size={11} /> Espaço Seguro</span>
                )}
              </p>
            </div>

            {/* SINO DE LEMBRETES */}
            <div className="relative" ref={sinoRef}>
              <button
                onClick={() => setSinoAberto((v) => !v)}
                aria-label={`Lembretes${pendentesNoSino ? `, ${pendentesNoSino} pendentes` : ''}`}
                aria-expanded={sinoAberto}
                className="relative rounded-lg border border-[#232230] p-2 text-[#C8C8D8] transition hover:text-white"
              >
                <Bell size={18} />
                {pendentesNoSino > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E1306C] px-1 text-[10px] font-bold text-white">
                    {pendentesNoSino}
                  </span>
                )}
              </button>
              {sinoAberto && (
                <div className="absolute right-0 mt-2 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-[#232230] bg-[#12111A] shadow-2xl shadow-black/50">
                  <p className="border-b border-[#232230] px-4 py-3 text-sm font-bold">Lembretes</p>
                  <ListaLembretes
                    lembretes={lembretes}
                    adiar={adiar}
                    onEspecial={() => { setSinoAberto(false); setModalSenha(true); }}
                    compacto
                  />
                </div>
              )}
            </div>

            <button onClick={sair} className="hidden items-center gap-1.5 text-xs text-[#8888A0] transition hover:text-white md:flex">
              <LogOut size={14} /> Sair
            </button>
          </header>

          <main className="min-w-0 flex-1">
            <CaixaComoFunciona caminho={pathname} />
            {children}
          </main>
        </div>
      </div>

      {modalSenha && user && (
        <AssistenteSenha
          aoFechar={() => setModalSenha(false)}
          aoSalvar={async () => {
            const { data: u } = await supabase.auth.getUser();
            if (u?.user) setUser(u.user);
            setModalSenha(false);
            recarregar();
          }}
        />
      )}
    </ParceiroProvider>
  );
}

// ---------- lista de lembretes (sino e Início usam a mesma) ----------
export function ListaLembretes({
  lembretes,
  adiar,
  onEspecial,
  compacto,
}: {
  lembretes: Lembrete[];
  adiar: (id: string) => void;
  onEspecial?: () => void;
  compacto?: boolean;
}) {
  if (lembretes.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-[#8888A0]">Tudo em dia por aqui. 🎉</p>;
  }
  return (
    <ul className={compacto ? 'max-h-[60vh] divide-y divide-[#232230] overflow-y-auto' : 'space-y-3'}>
      {lembretes.map((l) => (
        <li
          key={l.id}
          className={compacto ? 'px-4 py-3' : 'rounded-2xl border border-[#232230] bg-[#161520] p-4'}
        >
          <div className="flex gap-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${COR_NIVEL[l.nivel]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">{l.titulo}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#A0A0B2]">{l.texto}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                {l.acaoEspecial === 'trocar-senha' && onEspecial ? (
                  <button onClick={onEspecial} className="rounded-lg bg-[#E1306C] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#C2285C]">
                    {l.acao}
                  </button>
                ) : (
                  <Link href={l.href} className="rounded-lg bg-[#E1306C] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#C2285C]">
                    {l.acao}
                  </Link>
                )}
                {!l.fixo && (
                  <button onClick={() => adiar(l.id)} className="text-xs text-[#8888A0] transition hover:text-white">
                    Lembrar amanhã
                  </button>
                )}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------- assistente de primeiro acesso ----------
function AssistenteSenha({ aoFechar, aoSalvar }: { aoFechar: () => void; aoSalvar: () => void | Promise<void> }) {
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (nova.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (nova !== confirmar) { setErro('As duas senhas não são iguais.'); return; }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: nova, data: { senha_trocada: true } });
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    await aoSalvar();
  };

  const campo =
    'w-full rounded-xl border border-white/10 bg-[#0B0B12]/70 px-4 py-3 text-sm text-white placeholder:text-[#626274] focus:border-[#E1306C] focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={aoFechar} />
      <form
        onSubmit={salvar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-senha"
        className="relative w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-[#12111A] p-7 shadow-2xl"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E1306C] to-[#A855F7]">
          <UserRound size={22} />
        </div>
        <div className="text-center">
          <h2 id="titulo-senha" className="text-xl font-black">Bem-vindo(a) ao portal!</h2>
          <p className="mt-1 text-sm text-[#A0A0B2]">
            Sua senha atual é provisória. Crie uma só sua para proteger o acesso ao seu espaço.
          </p>
        </div>
        {erro && <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">{erro}</div>}
        <input type="password" required minLength={6} autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova senha (mínimo 6 caracteres)" className={campo} />
        <input type="password" required minLength={6} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repita a nova senha" className={campo} />
        <button type="submit" disabled={salvando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E1306C] to-[#A855F7] py-3 text-sm font-bold disabled:opacity-60">
          {salvando && <Loader2 size={16} className="animate-spin" />} Salvar minha senha
        </button>
        <button type="button" onClick={aoFechar} className="block w-full text-center text-xs text-[#8888A0] transition hover:text-white">
          Fazer isso depois
        </button>
      </form>
    </div>
  );
}
