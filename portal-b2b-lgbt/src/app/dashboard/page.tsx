'use client';

// Rodada 129 — Início do painel do parceiro, refeito: saudação, status do
// cadastro, "O que fazer esta semana" (lembretes), primeiros passos,
// números do espaço e plano. O menu e o cabeçalho vêm do layout (ParceiroShell).
import { AlertCircle, CheckCircle2, Circle, Eye, Instagram, Star, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ListaLembretes } from '../../components/parceiro/ParceiroShell';
import { useParceiro } from '../../components/parceiro/ParceiroContext';
import { PLANO_INFO } from '../../lib/parceiro';
import { supabase } from '../../lib/supabase';

type Evento = { id: string; titulo: string; data_inicio: string; listas_vip: { vagas_limite: number | null; vagas_ocupadas: number }[] };

const STATUS_PLANO: Record<string, string> = {
  ativo: 'Ativo',
  interesse: 'Interesse registrado — aguardando nosso contato',
  aguardando_pagamento: 'Aguardando confirmação do pagamento',
  cancelado: 'Cancelado',
};

export default function InicioPage() {
  const p = useParceiro();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<{ visualizacao_perfil: number; clique_instagram: number; clique_cupom: number } | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);

  const localId = p?.local.id;
  useEffect(() => {
    if (!localId) return;
    (async () => {
      const { data, error } = await supabase.rpc('resumo_analytics_local', { p_local_id: localId });
      if (!error) {
        const t = { visualizacao_perfil: 0, clique_instagram: 0, clique_cupom: 0 };
        for (const l of (data as { tipo: string; total: number }[]) || []) if (l.tipo in t) t[l.tipo as keyof typeof t] = Number(l.total);
        setAnalytics(t);
      }
      const { data: ev } = await supabase
        .from('eventos')
        .select('id, titulo, data_inicio, listas_vip(vagas_limite, vagas_ocupadas)')
        .eq('local_id', localId)
        .eq('status', 'aprovado')
        .gte('data_inicio', new Date().toISOString())
        .order('data_inicio', { ascending: true })
        .limit(3);
      setEventos((ev as unknown as Evento[]) || []);
    })();
  }, [localId]);

  // Sem espaço vinculado (o layout já tratou admin e organizador de evento).
  if (!p) {
    return (
      <div className="mx-auto mt-16 max-w-lg p-8 text-center">
        <AlertCircle className="mx-auto mb-4 text-[#E1306C]" size={32} />
        <h1 className="mb-2 text-xl font-black text-white">Nenhum espaço vinculado a esta conta ainda</h1>
        <p className="mb-6 text-sm text-[#A0A0B2]">
          Se você já fez o cadastro do seu espaço, ele pode estar aprovado — só falta vincular esta conta a ele. Se ainda não
          cadastrou, comece pelo cadastro.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/vincular" className="rounded-xl bg-[#E1306C] py-3 text-sm font-bold text-white transition hover:bg-[#C2285C]">
            Já cadastrei meu espaço — vincular agora
          </Link>
          <Link href="/onboarding" className="rounded-xl border border-[#232230] bg-[#161520] py-3 text-sm font-bold text-white transition hover:bg-[#1D1C29]">
            Ainda não cadastrei meu espaço
          </Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            className="mt-2 text-xs text-[#626274] hover:text-white"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  const { local, plano, lembretes, checklist, adiar, abrirTrocaSenha } = p;
  const feitos = checklist.filter((c) => c.feito).length;
  const pct = checklist.length ? Math.round((feitos / checklist.length) * 100) : 100;
  const info = PLANO_INFO[plano];
  const statusPlano = STATUS_PLANO[local.plano_comercial_status] ?? 'Ativo';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const paraFazer = lembretes.filter((l) => l.nivel !== 'dica');
  const dicas = lembretes.filter((l) => l.nivel === 'dica');

  return (
    <div className="space-y-8 p-5 md:p-8">
      <div>
        <h1 className="text-2xl font-black">{saudacao}, {local.nome}!</h1>
        <p className="mt-1 text-sm text-[#A0A0B2]">Veja o que vale fazer agora para o seu espaço render mais no app.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* O QUE FAZER ESTA SEMANA */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-base font-bold">O que fazer esta semana</h2>
          {paraFazer.length === 0 ? (
            <div className="rounded-2xl border border-[#4CAF7D]/25 bg-[#4CAF7D]/10 p-5 text-sm text-[#7ED9A6]">
              Tudo em dia por aqui. Quando surgir algo para fazer, avisamos neste lugar e no sino lá em cima. 🎉
            </div>
          ) : (
            <ListaLembretes lembretes={paraFazer} adiar={adiar} onEspecial={abrirTrocaSenha} />
          )}
          {dicas.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#626274]">Ideias para crescer</h3>
              <ListaLembretes lembretes={dicas} adiar={adiar} onEspecial={abrirTrocaSenha} />
            </div>
          )}
        </section>

        {/* PRIMEIROS PASSOS */}
        <section className="rounded-2xl border border-[#232230] bg-[#161520] p-5 self-start">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-bold">Primeiros passos</h2>
            <span className="text-xs font-bold text-[#FF7AA8]">{feitos}/{checklist.length}</span>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#232230]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#E1306C] to-[#A855F7] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <ul className="space-y-3">
            {checklist.map((c) => (
              <li key={c.id} className="flex gap-3">
                {c.feito ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#4CAF7D]" /> : <Circle size={18} className="mt-0.5 shrink-0 text-[#626274]" />}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${c.feito ? 'text-[#8888A0] line-through' : 'text-white'}`}>{c.titulo}</p>
                  {!c.feito && (
                    <>
                      <p className="text-xs text-[#8888A0]">{c.texto}</p>
                      <Link href={c.href} className="mt-1 inline-block text-xs font-bold text-[#FF7AA8] hover:underline">{c.acao} →</Link>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {pct === 100 && <p className="mt-4 text-xs text-[#7ED9A6]">Parabéns, seu espaço está prontinho! ✨</p>}
        </section>
      </div>

      {/* NÚMEROS */}
      <section>
        <h2 className="mb-3 text-base font-bold">Seus números (últimos 30 dias)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cartao icone={Eye} rotulo="Visualizações do perfil" valor={analytics ? String(analytics.visualizacao_perfil) : '—'} nota={analytics ? 'vezes que sua página foi aberta' : 'ainda sem dados'} />
          <Cartao icone={Instagram} rotulo="Cliques no Instagram" valor={analytics ? String(analytics.clique_instagram) : '—'} nota="a partir da sua página" />
          <Cartao icone={Ticket} rotulo="Cliques em cupom" valor={analytics ? String(analytics.clique_cupom) : '—'} nota="interesse nos seus cupons" />
          <Cartao icone={Star} rotulo="Avaliação média" valor={local.rating_total > 0 ? local.rating_media.toFixed(1) : '—'} nota={local.rating_total > 0 ? `${local.rating_total} avaliações` : 'ainda sem avaliações'} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PLANO */}
        <section className="rounded-2xl border border-[#232230] bg-[#161520] p-5 lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">Seu plano</h2>
            <span className="text-sm font-bold text-[#FF7AA8]">{info.nome} — {info.preco}</span>
          </div>
          <p className="mb-4 text-xs text-[#A0A0B2]">{statusPlano}</p>
          {local.plano_comercial_status === 'interesse' && (
            <p className="mb-4 text-xs text-[#A0A0B2]">
              Vamos entrar em contato pelo WhatsApp ou e-mail cadastrado para combinar o pagamento (Pix). Assim que confirmado, o plano é ativado.
            </p>
          )}
          <Link href="/planos" className="inline-block rounded-xl bg-[#232230] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2D2B3D]">
            Ver o que cada plano libera
          </Link>
        </section>

        {/* PRÓXIMOS EVENTOS */}
        <section className="rounded-2xl border border-[#232230] bg-[#161520] p-5">
          <h2 className="mb-3 text-sm font-bold">Próximos eventos aprovados</h2>
          {eventos.length === 0 ? (
            <p className="text-xs text-[#626274]">Nenhum evento futuro aprovado ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {eventos.map((ev) => {
                const lista = ev.listas_vip?.[0];
                return (
                  <div key={ev.id} className="rounded-xl border border-[#232230] bg-[#0B0B0E] p-3">
                    <h3 className="text-xs font-bold text-white">{ev.titulo}</h3>
                    <p className="text-[11px] text-[#A0A0B2]">
                      {new Date(ev.data_inicio).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {lista?.vagas_limite ? ` — Lista VIP: ${lista.vagas_ocupadas}/${lista.vagas_limite}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Cartao({ icone: Icone, rotulo, valor, nota }: { icone: React.ComponentType<{ size?: number; className?: string }>; rotulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-2xl border border-[#232230] bg-[#161520] p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#A0A0B2]">
        <Icone size={14} className="text-[#E1306C]" /> {rotulo}
      </div>
      <div className="text-3xl font-black">{valor}</div>
      <p className="mt-1 text-[11px] text-[#626274]">{nota}</p>
    </div>
  );
}
