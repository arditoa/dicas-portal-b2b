'use client';
import { Check, Loader2, LogOut, MessageCircle, ShieldAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { normalizarTelefoneBR } from '../../lib/parceiroAuth';

const URL_PORTAL = 'https://dicas-portal-b2b-dun.vercel.app'; // ajuste aqui quando o domínio definitivo (ex.: portal.vezpabar.com) estiver configurado

// Painel admin mínimo — reaproveita is_admin()/RLS que já existe em todas as
// tabelas (nenhuma migration nova precisou ser feita pra segurança daqui;
// o filtro de acesso abaixo é só de UX, a segurança real já está no banco).
// Cobre as 4 filas de aprovação/ação manual que a investigação encontrou
// sem nenhuma interface: cadastros de local pendentes, pedidos de vínculo
// de conta, leads institucionais, e — a mais importante pra sustentar o
// negócio — parceiros que pediram um plano pago e estão esperando a Andrea
// cobrar (Pix/WhatsApp) e confirmar.

type LocalPendente = {
  id: string;
  nome: string;
  categoria: string;
  cidade: string;
  bairro: string | null;
  cnpj: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  created_at: string;
};

// Rodada 25 — a festa/evento cadastrado em /cadastro/evento nasce
// `status='pendente'` (mesmo trigger enforce_evento_seguro_insert de
// sempre) mas NUNCA teve fila nenhuma aqui pra aprovar — o /admin só
// tinha filas pra `locais`. A Andrea reportou que uma festa cadastrada
// não aparecia pra aprovação; essa é a causa: a fila simplesmente não
// existia, não é um bug de RLS/trigger (is_admin() já cobre SELECT e
// UPDATE de eventos pendentes, ver pode_gerenciar_evento() na 008).
//
// eventos.descricao carrega o contato/local digitados no cadastro
// (não existe coluna own própria pra isso — ver cadastro/evento/page.tsx,
// "Descrição carrega os dados de contato/local"), por isso é mostrada
// inteira aqui em vez de só um resumo.
type EventoPendente = {
  id: string;
  titulo: string;
  tipo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  contato_nome: string | null;
  contato_whatsapp: string | null;
  created_at: string;
};

// Rodada 26 — compatibilidade com eventos cadastrados ANTES da migration
// 015: nesses, o contato só existe como texto solto dentro da descrição
// ("Contato: nome — whatsapp", formato exato que cadastro/evento/page.tsx
// sempre gerou). Eventos novos já chegam com contato_nome/contato_whatsapp
// de verdade — isso aqui é só pra não perder o aviso automático nos que já
// estavam pendentes antes da coluna existir.
function extrairContatoDescricao(descricao: string): { nome: string | null; whatsapp: string | null } | null {
  const m = descricao.match(/Contato:\s*([^\n—]+?)\s*—\s*([^\n]+)/);
  if (!m) return null;
  return { nome: m[1].trim() || null, whatsapp: m[2].trim() || null };
}

// Rodada 30 — melhorias sugeridas pela própria consultoria de UX (a
// Andrea pediu "todos que sugerir"): mostrar há quanto tempo cada item
// está esperando, em vez de só ordenar por data e deixar ela adivinhar.
// Mais crítico na fila de plano pago (Prioridade 1 do roadmap: "cada dia
// sem contato é o pior tipo de fricção"), mas útil nas outras filas
// também.
function diasDesde(dataISO: string): number {
  const ms = Date.now() - new Date(dataISO).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function textoDias(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} dias`;
}

// Quanto mais tempo esperando, mais chamativo — sem cor nenhuma até 2
// dias (normal), amarelo a partir de 3, vermelho e em negrito a partir
// de 7 (o limiar que o roadmap já discutia como "esfriando").
function corDias(dias: number): string {
  if (dias >= 7) return 'text-red-400 font-bold';
  if (dias >= 3) return 'text-amber-400';
  return 'text-[#626274]';
}

const PLANO_PRECO: Record<string, string> = {
  starter: 'R$59/mês',
  intermediario: 'R$249/mês',
  premium: 'R$599/mês',
  fundador: 'R$3.500/mês',
};

type InteresseNoPlano = {
  id: string;
  nome: string;
  plano_comercial: string;
  plano_comercial_status: string;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  plano_comercial_atualizado_em: string;
};

type AprovadoSemConta = {
  id: string;
  nome: string;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  owner_id: string | null;
};

// Rodada 29 — pedido direto da Andrea: sem parceiro pagante ainda, como
// deixar "Em Alta"/"Destaque da semana" atraentes? `locais.plano_destaque`
// já existe e já é respeitado pela Home (ordenação + badge "Destaque"/
// "VIP" em (tabs)/index.tsx), mas até agora só dava pra mudar rodando SQL
// na mão — não existia UI nenhuma pra isso. Isso aqui é o seletor manual
// que faltava, pra usar como selo editorial/"Fundador" antes de cobrar de
// verdade. Sem relação com `plano_comercial` (o plano PAGO) — os dois
// aparecem juntos aqui só pra dar contexto, nunca são a mesma coisa.
type LocalDestaque = {
  id: string;
  nome: string;
  categoria: string;
  cidade: string;
  bairro: string | null;
  plano_destaque: 'basico' | 'destaque' | 'vip';
  plano_comercial: string;
  plano_comercial_status: string;
  fundador: boolean;
};

// Rodada 38 — pedido direto da Andrea: organizador de evento paga uma
// taxa única (R$69, cobrança manual por Pix/WhatsApp — mesmo fluxo que já
// existe pra plano_comercial de bar, sem gateway de pagamento nenhum) pra
// ter destaque numa festa específica. `eventos.plano_destaque` já existe
// desde a 001 e o app já mostra o selo quando != 'basico'
// ((tabs)/events.tsx linha ~465) — só faltava esse seletor manual aqui,
// igual ao que já existe pra locais acima.
type EventoDestaque = {
  id: string;
  titulo: string;
  tipo: string;
  data_inicio: string;
  plano_destaque: 'basico' | 'destaque' | 'vip';
};

type VinculoPendente = {
  id: string;
  local_id: string;
  user_id: string;
  documento_informado: string;
  criado_em: string;
  locais: { nome: string; contato_telefone: string | null; contato_email: string | null } | null;
};

type LeadInstitucional = {
  id: string;
  origem: string;
  nome_organizacao: string;
  nome_contato: string | null;
  email: string | null;
  whatsapp: string | null;
  mensagem: string | null;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  const [locaisPendentes, setLocaisPendentes] = useState<LocalPendente[]>([]);
  const [eventosPendentes, setEventosPendentes] = useState<EventoPendente[]>([]);
  const [aprovadosSemConta, setAprovadosSemConta] = useState<AprovadoSemConta[]>([]);
  const [locaisDestaque, setLocaisDestaque] = useState<LocalDestaque[]>([]);
  const [eventosDestaque, setEventosDestaque] = useState<EventoDestaque[]>([]);
  const [vinculosPendentes, setVinculosPendentes] = useState<VinculoPendente[]>([]);
  const [leads, setLeads] = useState<LeadInstitucional[]>([]);
  const [interessesPlano, setInteressesPlano] = useState<InteresseNoPlano[]>([]);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  // Rodada 22 (correção): window.open() depois de um await é bloqueado
  // silenciosamente por pop-up blocker em vários navegadores — a Andrea
  // confirmou que a aprovação funcionava mas o WhatsApp nunca abria. Em
  // vez de depender de abrir sozinho, mostra um cartão fixo na tela com
  // o link (ela clica) e o telefone/senha em texto (pra copiar também).
  const [contaCriada, setContaCriada] = useState<{ nomeLocal: string; telefone: string; senha: string; link: string } | null>(null);
  // Rodada 26 — aviso simples pro organizador quando aprovar o evento NÃO
  // cria login (porque o dono do local já gerencia esse evento, ou o
  // organizador já tinha conta) — só avisa que já pode ver o evento no app.
  const [eventoAprovado, setEventoAprovado] = useState<{ titulo: string; telefone: string; link: string } | null>(null);
  // Rodada 36 — mesmo espírito do card de contaCriada (locais) acima, mas
  // pra organizador de evento independente sem conta ainda — aprovar já
  // cria o login (senha por WhatsApp) via /api/aprovar-evento.
  const [eventoContaCriada, setEventoContaCriada] = useState<{ titulo: string; telefone: string; senha: string; contaNova: boolean; link: string } | null>(null);

  const carregarFilas = useCallback(async () => {
    const [
      { data: locaisData },
      { data: eventosData },
      { data: aprovadosSemContaData },
      { data: vinculosData },
      { data: leadsData },
      { data: interessesData },
      { data: locaisDestaqueData },
      { data: badgesFundadorData },
      { data: eventosDestaqueData },
    ] = await Promise.all([
        supabase
          .from('locais')
          .select('id, nome, categoria, cidade, bairro, cnpj, contato_nome, contato_telefone, contato_email, created_at')
          .eq('status', 'pendente')
          .order('created_at', { ascending: true }),
        supabase
          .from('eventos')
          .select('id, titulo, tipo, descricao, data_inicio, data_fim, contato_nome, contato_whatsapp, created_at')
          .eq('status', 'pendente')
          .order('created_at', { ascending: true }),
        supabase
          .from('locais')
          .select('id, nome, contato_nome, contato_telefone, contato_email, owner_id')
          .eq('status', 'aprovado')
          .order('created_at', { ascending: true }),
        supabase
          .from('solicitacoes_vinculo_local')
          .select('id, local_id, user_id, documento_informado, criado_em, locais(nome, contato_telefone, contato_email)')
          .eq('status', 'pendente')
          .order('criado_em', { ascending: true }),
        supabase
          .from('leads_institucionais')
          .select('id, origem, nome_organizacao, nome_contato, email, whatsapp, mensagem, status, created_at')
          .eq('status', 'novo')
          .order('created_at', { ascending: true }),
        supabase
          .from('locais')
          .select('id, nome, plano_comercial, plano_comercial_status, contato_nome, contato_telefone, contato_email, plano_comercial_atualizado_em')
          .in('plano_comercial_status', ['interesse', 'aguardando_pagamento'])
          .order('plano_comercial_atualizado_em', { ascending: true }),
        supabase
          .from('locais')
          .select('id, nome, categoria, cidade, bairro, plano_destaque, plano_comercial, plano_comercial_status')
          .eq('status', 'aprovado')
          .order('nome', { ascending: true }),
        // Rodada 37 — selo "Membro Fundador" é um local_badges (não é
        // plano_destaque, ver experience/[tag].tsx no app) — busca junto
        // pra saber quem já tem, e mostrar o toggle certo abaixo.
        supabase
          .from('local_badges')
          .select('local_id, ativo')
          .ilike('rotulo', '%fundador%'),
        // Rodada 38 — eventos aprovados e futuros, pra dar destaque manual
        // (mesma lógica do bloco de locais acima) depois de cobrar o R$69.
        supabase
          .from('eventos')
          .select('id, titulo, tipo, data_inicio, plano_destaque')
          .eq('status', 'aprovado')
          .gte('data_inicio', new Date().toISOString())
          .order('data_inicio', { ascending: true }),
      ]);

    setLocaisPendentes((locaisData as LocalPendente[]) || []);
    setEventosPendentes((eventosData as EventoPendente[]) || []);
    setAprovadosSemConta((aprovadosSemContaData as AprovadoSemConta[]) || []);
    setVinculosPendentes((vinculosData as unknown as VinculoPendente[]) || []);
    setLeads((leadsData as LeadInstitucional[]) || []);
    setInteressesPlano((interessesData as InteresseNoPlano[]) || []);
    const idsComFundadorAtivo = new Set(
      ((badgesFundadorData as { local_id: string; ativo: boolean }[]) || [])
        .filter((b) => b.ativo)
        .map((b) => b.local_id)
    );
    setLocaisDestaque(
      ((locaisDestaqueData as Omit<LocalDestaque, 'fundador'>[]) || []).map((l) => ({
        ...l,
        fundador: idsComFundadorAtivo.has(l.id),
      }))
    );
    setEventosDestaque((eventosDestaqueData as EventoDestaque[]) || []);
  }, []);

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

      if (perfil?.role !== 'admin') {
        setCarregando(false);
        setAutorizado(false);
        return;
      }

      setAutorizado(true);
      await carregarFilas();
      setCarregando(false);
    })();
  }, [router, carregarFilas]);

  // Rodada 22: aprovar já cria a conta de login do parceiro (por WhatsApp,
  // sem e-mail) e vincula o local, tudo numa chamada só, via
  // /api/aprovar-local (roda com a service_role key, nunca a chave anon do
  // navegador — precisa disso pra poder criar contas de autenticação). Ver
  // 012_aprovacao_gera_login_automatico.sql.
  const aprovarLocal = async (id: string) => {
    setProcessando(id);
    setErro('');
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao?.session?.access_token;
      const resp = await fetch('/api/aprovar-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ local_id: id }),
      });
      const resultado = await resp.json();
      if (!resp.ok) throw new Error(resultado.error || 'Erro ao aprovar.');

      if (resultado.senha) {
        const mensagem = `Boas notícias! Seu cadastro do "${resultado.nomeLocal}" foi aprovado no Dicas LGBT+ 🏳️‍🌈\n\nJá criamos seu acesso ao Portal de Parceiros (fotos, cupons, lista VIP, plano):\n\nLink: ${URL_PORTAL}/login\nLogin (seu WhatsApp): ${resultado.telefone}\nSenha ${resultado.contaNova ? '' : 'nova '}temporária: ${resultado.senha}\n\nDepois de entrar, você pode trocar a senha em "Minha Página". Qualquer dúvida me chama por aqui!`;
        setContaCriada({
          nomeLocal: resultado.nomeLocal,
          telefone: resultado.telefone,
          senha: resultado.senha,
          link: `https://wa.me/${resultado.telefone}?text=${encodeURIComponent(mensagem)}`,
        });
      }
    } catch (e: any) {
      setErro(e.message || 'Erro ao aprovar.');
    }
    await carregarFilas();
    setProcessando(null);
  };

  const rejeitarLocal = async (l: LocalPendente) => {
    if (!window.confirm(`Rejeitar o cadastro de "${l.nome}"? Ele para de aparecer nesta fila.`)) return;
    setProcessando(l.id);
    setErro('');
    const { error } = await supabase.from('locais').update({ status: 'rejeitado' }).eq('id', l.id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  // Rodada 36 — aprovar evento agora passa por /api/aprovar-evento (roda
  // com a service_role key, igual /api/aprovar-local): quando o
  // organizador é independente (sem local com dono, sem conta ainda) e
  // informou WhatsApp no cadastro, a aprovação já cria o login dele pro
  // portal (mesmo espírito da Rodada 22/23 pra locais). Quando o dono do
  // local já gerencia esse evento, ou o organizador já tinha conta, a
  // rota só troca o status — sem criar nada — e aqui cai no aviso simples
  // de sempre (mesmo texto da Rodada 26).
  const aprovarEvento = async (ev: EventoPendente) => {
    setProcessando(ev.id);
    setErro('');
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao?.session?.access_token;
      const resp = await fetch('/api/aprovar-evento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ evento_id: ev.id }),
      });
      const resultado = await resp.json();
      if (!resp.ok) throw new Error(resultado.error || 'Erro ao aprovar.');

      if (resultado.loginCriado && resultado.senha) {
        const mensagem = `Boas notícias! Seu evento "${resultado.tituloEvento}" foi aprovado no Dicas LGBT+ 🏳️‍🌈 e já está aparecendo no app.

Já criamos seu acesso ao Portal de Parceiros pra você editar data, descrição e fotos da festa quando quiser:

Link: ${URL_PORTAL}/login
Login (seu WhatsApp): ${resultado.telefone}
Senha ${resultado.contaNova ? '' : 'nova '}temporária: ${resultado.senha}

Depois de entrar, você pode trocar a senha. Qualquer dúvida me chama por aqui!`;
        setEventoContaCriada({
          titulo: resultado.tituloEvento,
          telefone: resultado.telefone,
          senha: resultado.senha,
          contaNova: resultado.contaNova,
          link: `https://wa.me/${resultado.telefone}?text=${encodeURIComponent(mensagem)}`,
        });
      } else {
        // Sem login novo — mesmo aviso simples de antes. Prioriza as
        // colunas de verdade (015); só cai pro texto da descrição se o
        // evento foi cadastrado ANTES dessa migration.
        const extraido = !ev.contato_whatsapp && ev.descricao ? extrairContatoDescricao(ev.descricao) : null;
        const nomeContato = ev.contato_nome || extraido?.nome || null;
        const whatsappBruto = ev.contato_whatsapp || extraido?.whatsapp || null;
        if (whatsappBruto) {
          const telefone = normalizarTelefoneBR(whatsappBruto);
          const mensagem = `Boas notícias${nomeContato ? `, ${nomeContato}` : ''}! Seu evento "${ev.titulo}" foi aprovado no Dicas LGBT+ 🏳️‍🌈 e já está aparecendo no app. Qualquer dúvida me chama por aqui!`;
          setEventoAprovado({
            titulo: ev.titulo,
            telefone,
            link: `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`,
          });
        }
      }
    } catch (e: any) {
      setErro(e.message || 'Erro ao aprovar.');
    }
    await carregarFilas();
    setProcessando(null);
  };

  const rejeitarEvento = async (ev: EventoPendente) => {
    if (!window.confirm(`Rejeitar o evento "${ev.titulo}"? Ele para de aparecer nesta fila.`)) return;
    setProcessando(ev.id);
    setErro('');
    const { error } = await supabase.from('eventos').update({ status: 'rejeitado' }).eq('id', ev.id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  const resolverVinculo = async (v: VinculoPendente, status: 'aprovado' | 'rejeitado') => {
    if (status === 'rejeitado' && !window.confirm(`Rejeitar o pedido de vínculo de "${v.locais?.nome || 'esse local'}"?`)) return;
    setProcessando(v.id);
    setErro('');
    const { error } = await supabase.from('solicitacoes_vinculo_local').update({ status }).eq('id', v.id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const marcarLeadEmContato = async (id: string) => {
    setProcessando(id);
    setErro('');
    const { error } = await supabase.from('leads_institucionais').update({ status: 'em_contato' }).eq('id', id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  // Atualizar plano_comercial_status é a única ação de admin que precisa
  // do banco confirmar de verdade que quem está chamando é admin (o
  // trigger protect_plano_comercial_status, na 005, reverte a mudança se
  // não for) — mas como esta tela já é admin-only, o botão só aparece pra
  // quem tem is_admin() = true de qualquer forma.
  const marcarAguardandoPagamento = async (id: string) => {
    setProcessando(id);
    setErro('');
    const { error } = await supabase.from('locais').update({ plano_comercial_status: 'aguardando_pagamento' }).eq('id', id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  const confirmarPagamento = async (id: string) => {
    setProcessando(id);
    setErro('');
    const { error } = await supabase.from('locais').update({ plano_comercial_status: 'ativo' }).eq('id', id);
    if (error) setErro(error.message);
    await carregarFilas();
    setProcessando(null);
  };

  // Rodada 29 — seletor manual de plano_destaque (básico/destaque/vip). É
  // a mesma coluna que a Home já usa pra ordenar "Em Alta"/"Dicas Trip" e
  // mostrar o badge "Destaque"/"VIP" — só que até aqui só dava pra mudar
  // rodando SQL direto no Supabase. Atualização local otimista (não
  // espera o recarregamento de toda fila) pra o select responder na hora.
  const atualizarDestaque = async (id: string, plano: 'basico' | 'destaque' | 'vip') => {
    setProcessando(id);
    setErro('');
    setLocaisDestaque((atual) => atual.map((l) => (l.id === id ? { ...l, plano_destaque: plano } : l)));
    const { error } = await supabase.from('locais').update({ plano_destaque: plano }).eq('id', id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 38 — mesma ação, mas pra eventos (tabela/coluna diferente).
  const atualizarDestaqueEvento = async (id: string, plano: 'basico' | 'destaque' | 'vip') => {
    setProcessando(id);
    setErro('');
    setEventosDestaque((atual) => atual.map((ev) => (ev.id === id ? { ...ev, plano_destaque: plano } : ev)));
    const { error } = await supabase.from('eventos').update({ plano_destaque: plano }).eq('id', id);
    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  // Rodada 37 — toggle do selo "Membro Fundador" (local_badges), separado
  // do plano_destaque acima — é o que faz um local aparecer na seção
  // "Membro Fundador" do app (experience/[tag].tsx). Faz upsert manual
  // porque local_badges não tem unique constraint em (local_id, rotulo).
  const alternarFundador = async (id: string, ativar: boolean) => {
    setProcessando(id);
    setErro('');
    setLocaisDestaque((atual) => atual.map((l) => (l.id === id ? { ...l, fundador: ativar } : l)));

    const { data: existente } = await supabase
      .from('local_badges')
      .select('id')
      .eq('local_id', id)
      .ilike('rotulo', '%fundador%')
      .maybeSingle();

    const { error } = existente
      ? await supabase.from('local_badges').update({ ativo: ativar }).eq('id', existente.id)
      : await supabase
          .from('local_badges')
          .insert({ local_id: id, rotulo: 'Membro Fundador', cor_tag: 'dourado', ativo: ativar });

    if (error) {
      setErro(error.message);
      await carregarFilas();
    }
    setProcessando(null);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="text-[#E1306C] mb-4" size={32} />
        <h1 className="text-xl font-black mb-2">Acesso restrito</h1>
        <p className="text-[#A0A0B2] text-sm">Essa área é só para administradores.</p>
      </div>
    );
  }

  // Rodada 30 — resumo rápido do que precisa de atenção, pra não ter que
  // rolar as 7 seções pra saber o que tem pendente. Cada pill pula
  // direto pra seção correspondente (âncora), sem precisar de estado
  // novo — só soma o que já está carregado.
  const resumoFilas = [
    { id: 'fila-interesse', label: 'interesses em plano pago', total: interessesPlano.length, cor: 'text-[#E1306C]' },
    { id: 'fila-locais', label: 'locais pendentes', total: locaisPendentes.length, cor: 'text-white' },
    { id: 'fila-eventos', label: 'eventos pendentes', total: eventosPendentes.length, cor: 'text-white' },
    { id: 'fila-vinculos', label: 'vínculos pendentes', total: vinculosPendentes.length, cor: 'text-white' },
    { id: 'fila-leads', label: 'leads novos', total: leads.length, cor: 'text-white' },
  ];
  const totalPendente = resumoFilas.reduce((soma, f) => soma + f.total, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-2xl font-black">Painel de moderação</h1>
        <button
          onClick={handleLogout}
          className="text-xs text-[#626274] hover:text-white flex items-center gap-1.5 shrink-0 mt-1"
        >
          <LogOut size={13} /> Sair
        </button>
      </div>
      <p className="text-[#A0A0B2] text-xs mb-4">Aprovações manuais — cadastros, vínculos de conta e leads institucionais.</p>

      <div className="flex flex-wrap gap-2 mb-8">
        {totalPendente === 0 && (
          <span className="text-xs bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 px-3 py-1.5 rounded-full font-bold">
            Tudo em dia — nada pendente agora
          </span>
        )}
        {resumoFilas.map((f) => (
          <a
            key={f.id}
            href={`#${f.id}`}
            className={`text-xs px-3 py-1.5 rounded-full font-bold border ${
              f.total > 0
                ? 'bg-[#161520] border-[#232230] hover:bg-[#1D1C29] ' + f.cor
                : 'bg-transparent border-[#232230]/50 text-[#626274]'
            }`}
          >
            {f.total} {f.label}
          </a>
        ))}
      </div>

      {contaCriada && (
        <div className="bg-[#4CAF7D]/10 border border-[#4CAF7D]/30 text-[#4CAF7D] p-4 rounded-xl text-xs mb-6">
          <p className="font-bold mb-2">
            ✅ "{contaCriada.nomeLocal}" aprovado e conta criada — o navegador pode ter bloqueado a
            abertura automática do WhatsApp, então aqui está tudo pra enviar manualmente:
          </p>
          <p className="text-[#D0D0E0] mb-2">
            Telefone: <b>{contaCriada.telefone}</b> · Senha temporária: <b>{contaCriada.senha}</b>
          </p>
          <div className="flex items-center gap-3">
            <a
              href={contaCriada.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-black font-bold px-3 py-1.5 rounded-lg inline-block"
            >
              Abrir WhatsApp
            </a>
            <button onClick={() => setContaCriada(null)} className="text-[#A0A0B2] hover:text-white">
              Fechar
            </button>
          </div>
        </div>
      )}

      {eventoContaCriada && (
        <div className="bg-[#4CAF7D]/10 border border-[#4CAF7D]/30 text-[#4CAF7D] p-4 rounded-xl text-xs mb-6">
          <p className="font-bold mb-2">
            ✅ "{eventoContaCriada.titulo}" aprovado e conta criada — o navegador pode ter bloqueado a
            abertura automática do WhatsApp, então aqui está tudo pra enviar manualmente:
          </p>
          <p className="text-[#D0D0E0] mb-2">
            Telefone: <b>{eventoContaCriada.telefone}</b> · Senha temporária: <b>{eventoContaCriada.senha}</b>
          </p>
          <div className="flex items-center gap-3">
            <a
              href={eventoContaCriada.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-black font-bold px-3 py-1.5 rounded-lg inline-block"
            >
              Abrir WhatsApp
            </a>
            <button onClick={() => setEventoContaCriada(null)} className="text-[#A0A0B2] hover:text-white">
              Fechar
            </button>
          </div>
        </div>
      )}

      {eventoAprovado && (
        <div className="bg-[#4CAF7D]/10 border border-[#4CAF7D]/30 text-[#4CAF7D] p-4 rounded-xl text-xs mb-6">
          <p className="font-bold mb-2">
            ✅ "{eventoAprovado.titulo}" aprovado — clique pra avisar o organizador por WhatsApp:
          </p>
          <p className="text-[#D0D0E0] mb-2">
            Telefone: <b>{eventoAprovado.telefone}</b>
          </p>
          <div className="flex items-center gap-3">
            <a
              href={eventoAprovado.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-black font-bold px-3 py-1.5 rounded-lg inline-block"
            >
              Abrir WhatsApp
            </a>
            <button onClick={() => setEventoAprovado(null)} className="text-[#A0A0B2] hover:text-white">
              Fechar
            </button>
          </div>
        </div>
      )}

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      <section className="mb-10" id="fila-interesse">
        <h2 className="text-base font-bold mb-3 text-[#E1306C]">
          💰 Parceiros interessados em plano pago ({interessesPlano.length})
        </h2>
        <p className="text-xs text-[#626274] mb-3">
          Esta é a fila que sustenta o negócio — ninguém vira assinante sem alguém aqui cobrar por
          Pix/WhatsApp e confirmar.
        </p>
        <div className="space-y-3">
          {interessesPlano.length === 0 && <p className="text-xs text-[#626274]">Nenhum interesse pendente agora.</p>}
          {interessesPlano.map((it) => (
            <div key={it.id} className="bg-[#161520] border border-[#E1306C]/30 rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">{it.nome}</h3>
                <p className="text-xs text-[#E1306C] font-bold capitalize">
                  {it.plano_comercial} — {PLANO_PRECO[it.plano_comercial] || ''}
                  {it.plano_comercial_status === 'aguardando_pagamento' ? ' (já em contato)' : ' (novo pedido)'}
                </p>
                <p className="text-xs text-[#626274] mt-1">
                  Contato: {it.contato_nome || '—'} · {it.contato_telefone || '—'} · {it.contato_email || '—'}
                </p>
                <p className={`text-xs mt-1 ${corDias(diasDesde(it.plano_comercial_atualizado_em))}`}>
                  Esperando {textoDias(diasDesde(it.plano_comercial_atualizado_em))}
                  {diasDesde(it.plano_comercial_atualizado_em) >= 7 ? ' — esfriando, chama de novo' : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {it.plano_comercial_status === 'interesse' && (
                  <button
                    onClick={() => marcarAguardandoPagamento(it.id)}
                    disabled={processando === it.id}
                    className="bg-[#232230] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#2D2B3D]"
                  >
                    Já entrei em contato
                  </button>
                )}
                <button
                  onClick={() => confirmarPagamento(it.id)}
                  disabled={processando === it.id}
                  className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#4CAF7D]/20"
                >
                  Pagamento confirmado — ativar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10" id="fila-locais">
        <h2 className="text-base font-bold mb-3">Locais pendentes de aprovação ({locaisPendentes.length})</h2>
        <div className="space-y-3">
          {locaisPendentes.length === 0 && <p className="text-xs text-[#626274]">Nenhum pendente.</p>}
          {locaisPendentes.map((l) => (
            <div key={l.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">{l.nome}</h3>
                <p className="text-xs text-[#A0A0B2] capitalize">
                  {l.categoria} · {l.bairro ? `${l.bairro}, ` : ''}{l.cidade} · CNPJ {l.cnpj || '—'}
                </p>
                <p className="text-xs text-[#626274] mt-1">
                  Contato: {l.contato_nome || '—'} · {l.contato_telefone || '—'} · {l.contato_email || '—'}
                </p>
                <p className={`text-xs mt-1 ${corDias(diasDesde(l.created_at))}`}>
                  Esperando {textoDias(diasDesde(l.created_at))}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => aprovarLocal(l.id)}
                  disabled={processando === l.id}
                  className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 p-2 rounded-lg hover:bg-[#4CAF7D]/20"
                  title="Aprovar (já cria o login do parceiro e manda por WhatsApp)"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => rejeitarLocal(l)}
                  disabled={processando === l.id}
                  className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg hover:bg-red-500/20"
                  title="Rejeitar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10" id="fila-eventos">
        <h2 className="text-base font-bold mb-3">Eventos/festas pendentes de aprovação ({eventosPendentes.length})</h2>
        <div className="space-y-3">
          {eventosPendentes.length === 0 && <p className="text-xs text-[#626274]">Nenhum pendente.</p>}
          {eventosPendentes.map((ev) => (
            <div key={ev.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">
                  {ev.titulo} <span className="text-[#626274] font-normal capitalize">— {ev.tipo}</span>
                </h3>
                <p className="text-xs text-[#A0A0B2] mt-1">
                  {new Date(ev.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  {ev.data_fim ? ` até ${new Date(ev.data_fim).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                </p>
                {ev.descricao && (
                  <p className="text-xs text-[#626274] mt-1 whitespace-pre-line">{ev.descricao}</p>
                )}
                <p className={`text-xs mt-1 ${corDias(diasDesde(ev.created_at))}`}>
                  Esperando {textoDias(diasDesde(ev.created_at))}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => aprovarEvento(ev)}
                  disabled={processando === ev.id}
                  className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 p-2 rounded-lg hover:bg-[#4CAF7D]/20"
                  title="Aprovar"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => rejeitarEvento(ev)}
                  disabled={processando === ev.id}
                  className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg hover:bg-red-500/20"
                  title="Rejeitar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base font-bold mb-3">
          Locais aprovados — enviar/reenviar acesso ao portal ({aprovadosSemConta.length})
        </h2>
        <p className="text-xs text-[#626274] mb-3">
          Já estão no app. Use "Enviar acesso" pra criar a conta de login (se ainda não tiver),
          reparar uma conta antiga que ficou sem jeito de entrar, ou só gerar e mandar uma senha
          temporária nova de novo pelo WhatsApp.
        </p>
        <div className="space-y-3">
          {aprovadosSemConta.length === 0 && <p className="text-xs text-[#626274]">Nenhum aprovado ainda.</p>}
          {aprovadosSemConta.map((l) => (
            <div key={l.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-sm">{l.nome}</h3>
                <p className="text-xs text-[#626274] mt-1">
                  {l.contato_nome || '—'} · {l.contato_telefone || 'sem telefone cadastrado'} · {l.contato_email || '—'}
                  {l.owner_id ? ' · já tem conta' : ' · sem conta ainda'}
                </p>
              </div>
              <button
                onClick={() => aprovarLocal(l.id)}
                disabled={processando === l.id || !l.contato_telefone}
                className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#25D366]/20 flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                title={!l.contato_telefone ? 'Sem WhatsApp cadastrado' : 'Enviar acesso'}
              >
                <MessageCircle size={14} /> Enviar acesso
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base font-bold mb-3">⭐ Destaque manual dos locais ({locaisDestaque.length})</h2>
        <p className="text-xs text-[#626274] mb-3">
          O select controla a ordenação e o selo &quot;Destaque&quot;/&quot;VIP&quot; que aparecem no app
          (Em Alta, Dicas Trip). O checkbox &quot;Membro Fundador&quot; é separado — é o que faz o local
          aparecer na seção Membro Fundador do app. Os dois são independentes do plano pago —
          dá pra usar como selo editorial gratuito enquanto ainda não há parceiro pagante.
        </p>
        <div className="space-y-2">
          {locaisDestaque.length === 0 && <p className="text-xs text-[#626274]">Nenhum local aprovado ainda.</p>}
          {locaisDestaque.map((l) => (
            <div key={l.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-sm">{l.nome}</h3>
                <p className="text-xs text-[#626274] mt-1">
                  {l.categoria} · {[l.bairro, l.cidade].filter(Boolean).join(', ') || '—'}
                  {l.plano_comercial_status === 'ativo'
                    ? ` · plano pago: ${l.plano_comercial}`
                    : ' · sem plano pago ainda'}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#FFD54F] shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={l.fundador}
                  disabled={processando === l.id}
                  onChange={(e) => alternarFundador(l.id, e.target.checked)}
                  className="accent-[#FFD54F]"
                />
                Membro Fundador
              </label>
              <select
                value={l.plano_destaque}
                onChange={(e) => atualizarDestaque(l.id, e.target.value as 'basico' | 'destaque' | 'vip')}
                disabled={processando === l.id}
                className="bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs font-bold px-3 py-2 shrink-0 disabled:opacity-40"
              >
                <option value="basico">Básico</option>
                <option value="destaque">Destaque</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-base font-bold mb-3">⭐ Destaque manual dos eventos ({eventosDestaque.length})</h2>
        <p className="text-xs text-[#626274] mb-3">
          Taxa única de R$69 por evento (cobrança manual por Pix/WhatsApp, igual ao fluxo de
          plano pago dos bares) — depois de confirmar o pagamento, marca aqui como
          &quot;Destaque&quot; ou &quot;VIP&quot;. O app já mostra o selo quando o evento não está
          &quot;Básico&quot;. Só lista eventos já aprovados e com data futura.
        </p>
        <div className="space-y-2">
          {eventosDestaque.length === 0 && (
            <p className="text-xs text-[#626274]">Nenhum evento aprovado e futuro por aqui ainda.</p>
          )}
          {eventosDestaque.map((ev) => (
            <div key={ev.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-sm">{ev.titulo}</h3>
                <p className="text-xs text-[#626274] mt-1">
                  {ev.tipo} · {new Date(ev.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <select
                value={ev.plano_destaque}
                onChange={(e) => atualizarDestaqueEvento(ev.id, e.target.value as 'basico' | 'destaque' | 'vip')}
                disabled={processando === ev.id}
                className="bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs font-bold px-3 py-2 shrink-0 disabled:opacity-40"
              >
                <option value="basico">Básico</option>
                <option value="destaque">Destaque (R$69)</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10" id="fila-vinculos">
        <h2 className="text-base font-bold mb-3">Pedidos de vínculo de conta ({vinculosPendentes.length})</h2>
        <div className="space-y-3">
          {vinculosPendentes.length === 0 && <p className="text-xs text-[#626274]">Nenhum pendente.</p>}
          {vinculosPendentes.map((v) => (
            <div key={v.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">{v.locais?.nome || '(local não encontrado)'}</h3>
                <p className="text-xs text-[#A0A0B2]">CNPJ informado: {v.documento_informado}</p>
                <p className="text-xs text-[#626274] mt-1">
                  Confira o telefone/e-mail do cadastro original ({v.locais?.contato_telefone || '—'} /{' '}
                  {v.locais?.contato_email || '—'}) antes de aprovar.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => resolverVinculo(v, 'aprovado')}
                  disabled={processando === v.id}
                  className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 p-2 rounded-lg hover:bg-[#4CAF7D]/20"
                  title="Aprovar vínculo"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => resolverVinculo(v, 'rejeitado')}
                  disabled={processando === v.id}
                  className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg hover:bg-red-500/20"
                  title="Rejeitar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="fila-leads">
        <h2 className="text-base font-bold mb-3">Leads institucionais novos ({leads.length})</h2>
        <div className="space-y-3">
          {leads.length === 0 && <p className="text-xs text-[#626274]">Nenhum novo.</p>}
          {leads.map((lead) => (
            <div key={lead.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-sm">{lead.nome_organizacao}</h3>
                <p className="text-xs text-[#A0A0B2] capitalize">{lead.origem.replace(/_/g, ' ')}</p>
                <p className="text-xs text-[#626274] mt-1">
                  {lead.nome_contato || '—'} · {lead.whatsapp || '—'} · {lead.email || '—'}
                </p>
                {lead.mensagem && <p className="text-xs text-[#A0A0B2] mt-1">"{lead.mensagem}"</p>}
              </div>
              <button
                onClick={() => marcarLeadEmContato(lead.id)}
                disabled={processando === lead.id}
                className="bg-[#232230] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#2D2B3D] shrink-0"
              >
                Marcar em contato
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
