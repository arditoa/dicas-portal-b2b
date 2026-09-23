'use client';
import { AlertCircle, Loader2, LogOut, Plus, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Nomes/preços comerciais em um só lugar — precisam bater com o enum
// public.plano_comercial (005_planos_comerciais_e_vinculo_local.sql) e com
// os cards mostrados em /planos.
const PLANO_INFO: Record<string, { nome: string; preco: string }> = {
  freemium: { nome: 'Freemium', preco: 'R$0' },
  starter: { nome: 'Starter', preco: 'R$59/mês' },
  intermediario: { nome: 'Intermediário', preco: 'R$249/mês' },
  premium: { nome: 'Premium', preco: 'R$599/mês' },
  // Rodada 59 — Andrea corrigiu: "esse 3500 esta equivocado". Fundador
  // não é mensalidade, é pacote único de 12 meses.
  // Atualização — "12x R$349" agora lidera (mais vendável).
  fundador: { nome: 'Fundador', preco: 'R$349/mês × 12 (ou R$3.490 à vista)' },
};

const STATUS_PLANO_INFO: Record<string, { label: string; cor: string }> = {
  ativo: { label: 'Ativo', cor: 'text-[#4CAF7D]' },
  interesse: { label: 'Interesse registrado — aguardando contato', cor: '#E1A93A' as any },
  aguardando_pagamento: { label: 'Aguardando confirmação de pagamento', cor: '#E1A93A' as any },
  cancelado: { label: 'Cancelado', cor: 'text-[#A0A0B2]' },
};

type ListaVip = { vagas_limite: number | null; vagas_ocupadas: number };
type Evento = {
  id: string;
  titulo: string;
  data_inicio: string;
  listas_vip: ListaVip[];
};

type Local = {
  id: string;
  nome: string;
  categoria: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  plano_comercial: string;
  plano_comercial_status: string;
  rating_media: number;
  rating_total: number;
  safe_space: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [local, setLocal] = useState<Local | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [semLocalVinculado, setSemLocalVinculado] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [analytics, setAnalytics] = useState<{
    visualizacao_perfil: number;
    clique_instagram: number;
    clique_cupom: number;
  } | null>(null);
  // true só quando a chamada falha de verdade (RPC ausente/negada) — nesse
  // caso mantém o texto antigo "Em breve" pra não sugerir que quebrou;
  // se a chamada funciona mas dá tudo zero, mostra zero mesmo (é a
  // realidade: o local ainda não teve visualização nenhuma).
  const [analyticsIndisponivel, setAnalyticsIndisponivel] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }

      const { data: perfil } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();
      const admin = perfil?.role === 'admin';
      setEhAdmin(admin);

      // A conta admin da Andrea não é dona de nenhum local — pra ela, o
      // painel útil é o de moderação, não o de "meu espaço".
      if (admin) {
        router.push('/admin');
        return;
      }

      const { data: localData, error } = await supabase
        .from('locais')
        .select(
          'id, nome, categoria, status, plano_comercial, plano_comercial_status, rating_media, rating_total, safe_space'
        )
        .eq('owner_id', userData.user.id)
        .maybeSingle();

      if (error || !localData) {
        // Rodada 36 — organizador de evento independente (aprovado com
        // login automático via /api/aprovar-evento) não tem `locais`
        // nenhum pra achar aqui -- mas gerencia pelo menos um evento via
        // meus_eventos_gerenciaveis() (020). Pra essa conta, a tela certa
        // é /dashboard/eventos, não o aviso de "cadastre/vincule um
        // local" que só faz sentido pra quem é dono de espaço físico.
        const { data: eventosGerenciaveis } = await supabase.rpc('meus_eventos_gerenciaveis');
        if ((eventosGerenciaveis || []).length > 0) {
          router.push('/dashboard/eventos');
          return;
        }
        setSemLocalVinculado(true);
        setCarregando(false);
        return;
      }

      setLocal(localData as Local);

      // Analytics real (Rodada 17) — RPC criada em
      // 006_analytics_cliques_visualizacoes.sql. `security definer` na
      // função já garante que só o dono do local (ou admin) recebe algo;
      // se a migration ainda não tiver sido aplicada em produção, a RPC
      // não existe e cai no catch — mantém o "Em breve" antigo em vez de
      // quebrar a tela.
      try {
        const { data: analyticsData, error: analyticsError } = await supabase.rpc(
          'resumo_analytics_local',
          { p_local_id: localData.id }
        );
        if (analyticsError) throw analyticsError;
        const totais = { visualizacao_perfil: 0, clique_instagram: 0, clique_cupom: 0 };
        for (const linha of (analyticsData as { tipo: string; total: number }[]) || []) {
          if (linha.tipo in totais) totais[linha.tipo as keyof typeof totais] = Number(linha.total);
        }
        setAnalytics(totais);
      } catch {
        setAnalyticsIndisponivel(true);
      }

      const { data: eventosData } = await supabase
        .from('eventos')
        .select('id, titulo, data_inicio, listas_vip(vagas_limite, vagas_ocupadas)')
        .eq('local_id', localData.id)
        .eq('status', 'aprovado')
        .gte('data_inicio', new Date().toISOString())
        .order('data_inicio', { ascending: true })
        .limit(3);

      setEventos((eventosData as unknown as Evento[]) || []);
      setCarregando(false);
    })();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  if (semLocalVinculado) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-16">
        <AlertCircle className="mx-auto text-[#E1306C] mb-4" size={32} />
        <h1 className="text-xl font-black text-white mb-2">Nenhum local vinculado a essa conta ainda</h1>
        <p className="text-[#A0A0B2] text-sm mb-6">
          Se você já cadastrou seu espaço pelo formulário público (sem login), ele já pode estar
          aprovado — só falta vincular essa conta a ele. Se ainda não cadastrou, comece por aí.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/vincular"
            className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-sm font-bold py-3 rounded-xl transition"
          >
            Já cadastrei meu local — vincular agora
          </Link>
          <Link
            href="/cadastro/local"
            className="bg-[#161520] border border-[#232230] hover:bg-[#1D1C29] text-white text-sm font-bold py-3 rounded-xl transition"
          >
            Ainda não cadastrei meu local
          </Link>
          <button onClick={handleLogout} className="text-xs text-[#626274] hover:text-white mt-2">
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (!local) return null;

  const planoInfo = PLANO_INFO[local.plano_comercial] ?? PLANO_INFO.freemium;
  const statusInfo = STATUS_PLANO_INFO[local.plano_comercial_status] ?? STATUS_PLANO_INFO.ativo;

  return (
    <div className="p-8">
      {local.status !== 'aprovado' && (
        <div
          className={`mb-6 p-4 rounded-xl border text-sm ${
            local.status === 'pendente'
              ? 'bg-[#E1A93A]/10 border-[#E1A93A]/30 text-[#E1A93A]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {local.status === 'pendente'
            ? 'Seu cadastro está em análise pela nossa equipe. Assim que for aprovado, seu local aparece no mapa e nas categorias do app — normalmente em até 48h.'
            : 'Seu cadastro não foi aprovado. Fale com a gente para entender o motivo.'}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Olá, {local.nome}</h1>
          <p className="text-[#A0A0B2] text-xs mt-1">Aqui está o resumo do seu espaço.</p>
        </div>
        <div className="flex items-center gap-3">
          {local.safe_space && (
            <span className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5">
              <ShieldCheck size={13} /> Espaço Seguro
            </span>
          )}
          <Link
            href="/dashboard/lista-vip"
            className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
          >
            Lista VIP
          </Link>
          <Link
            href="/dashboard/cupons"
            className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
          >
            Cupons
          </Link>
          <Link
            href="/dashboard/eventos"
            className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
          >
            Meus eventos
          </Link>
          <Link
            href="/dashboard/agenda"
            className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
          >
            Agenda da semana
          </Link>
          <Link
            href="/dashboard/perfil"
            className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
          >
            Fotos, tags e horário
          </Link>
          <Link
            href="/planos"
            className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
          >
            <Plus size={14} /> Ver planos
          </Link>
        </div>
      </div>

      {/* Métricas honestas: só o que já existe de verdade no banco hoje. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#161520] border border-[#232230] p-5 rounded-2xl">
          <span className="text-xs text-[#A0A0B2] font-semibold block mb-2">Avaliação média</span>
          <div className="text-3xl font-black text-white mb-1">
            {local.rating_total > 0 ? local.rating_media.toFixed(1) : '—'}
          </div>
          <span className="text-[#626274] text-[11px]">
            {local.rating_total > 0 ? `${local.rating_total} avaliações` : 'ainda sem avaliações'}
          </span>
        </div>

        <div className="bg-[#161520] border border-[#232230] p-5 rounded-2xl">
          <span className="text-xs text-[#A0A0B2] font-semibold block mb-2">Categoria no app</span>
          <div className="text-lg font-black text-white mb-1 capitalize">{local.categoria}</div>
          <span className="text-[#626274] text-[11px]">status: {local.status}</span>
        </div>

        <div className="bg-[#161520] border border-[#232230] p-5 rounded-2xl">
          <span className="text-xs text-[#A0A0B2] font-semibold block mb-2">Visualizações / cliques (30 dias)</span>
          {analytics ? (
            <>
              <div className="text-lg font-black text-white mb-1">{analytics.visualizacao_perfil} visualizações</div>
              <span className="text-[#626274] text-[11px]">
                {analytics.clique_instagram} cliques no Instagram · {analytics.clique_cupom} cliques em cupom
              </span>
            </>
          ) : (
            <>
              <div className="text-lg font-black text-white mb-1">Em breve</div>
              <span className="text-[#626274] text-[11px]">
                {analyticsIndisponivel
                  ? 'essas métricas ainda não são coletadas — não inventamos números aqui.'
                  : 'carregando...'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#161520] border border-[#232230] p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-white">Seu plano atual</h2>
              <span className="text-xs font-bold text-[#E1306C]">
                {planoInfo.nome} — {planoInfo.preco}
              </span>
            </div>
            <p className={`text-xs mb-4 ${statusInfo.cor === '#E1A93A' ? '' : statusInfo.cor}`} style={statusInfo.cor === '#E1A93A' ? { color: '#E1A93A' } : undefined}>
              {statusInfo.label}
            </p>
            {local.plano_comercial_status === 'interesse' && (
              <p className="text-[11px] text-[#A0A0B2] mb-4">
                Vamos entrar em contato pelo WhatsApp/e-mail cadastrado pra combinar o pagamento (Pix).
                Assim que confirmado, seu plano é ativado.
              </p>
            )}
          </div>
          <div>
            <Link
              href="/planos"
              className="inline-block bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-[#232230] transition"
            >
              Ver todos os planos
            </Link>
          </div>
        </div>

        <div className="bg-[#161520] border border-[#232230] p-6 rounded-2xl">
          <h2 className="text-sm font-bold text-white mb-4">Próximos eventos aprovados</h2>
          <div className="space-y-3">
            {eventos.length === 0 && (
              <p className="text-[11px] text-[#626274]">Nenhum evento futuro aprovado ainda.</p>
            )}
            {eventos.map((ev) => {
              const lista = ev.listas_vip?.[0];
              return (
                <div
                  key={ev.id}
                  className="bg-[#0B0B0E] p-3 rounded-xl border border-[#232230] flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-xs font-bold text-white">{ev.titulo}</h3>
                    <p className="text-[10px] text-[#A0A0B2]">
                      {new Date(ev.data_inicio).toLocaleString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {lista?.vagas_limite ? ` — Lista VIP: ${lista.vagas_ocupadas}/${lista.vagas_limite} vagas` : ''}
                    </p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#E1306C]" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
        {ehAdmin && (
          <Link href="/admin" className="text-xs text-[#E1306C] font-bold hover:underline">
            Painel de moderação (admin)
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="text-xs text-[#626274] hover:text-white flex items-center gap-1.5"
        >
          <LogOut size={13} /> Sair
        </button>
      </div>
    </div>
  );
}
