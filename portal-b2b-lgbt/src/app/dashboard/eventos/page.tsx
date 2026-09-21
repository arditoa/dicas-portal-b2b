'use client';
import { AlertTriangle, ArrowLeft, Calendar, Check, ChevronDown, ChevronUp, Loader2, LogIn, Plus, Save, Upload, Users, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Rodada 36 — pedido direto da Andrea: organizador de evento/festa
// (aprovado com login automático via /api/aprovar-evento, ver
// admin/page.tsx) também precisa conseguir editar data, descrição e foto
// da própria festa, sem precisar da Andrea pra isso — igual o dono de
// local já pode em /dashboard/perfil desde a Rodada 22/23.
//
// Usa a RPC `meus_eventos_gerenciaveis()` (020_horario_funcionamento_...sql)
// em vez de um `.select()` direto -- ela já cobre os dois jeitos de
// "gerenciar" um evento (criado_por = eu, OU dono do local da festa =
// eu), então esta tela funciona tanto pro organizador independente
// quanto pro dono de local que quer editar a festa do próprio bar, sem
// duplicar lógica de permissão aqui.
//
// Rodada 41 — pedido da Andrea ("portal de eventos confuso, editar ou
// excluir"): o SALVAR já mandava titulo/descrição/datas/foto pro banco
// desde a Rodada 36 — o que faltava era o gatilho
// `protect_admin_fields_eventos` (023_destaque_rotativo_edicao_evento_
// agenda_semanal.sql) devolver o evento pra fila de análise quando o
// campo mudado é sensível (título/data), sem travar a edição de campos
// cosméticos (foto/descrição). Como isso acontece silenciosamente no
// banco, o SALVAR agora recarrega a lista de eventos depois de gravar,
// pra o status mostrado na tela sempre refletir o que o gatilho decidiu
// — nunca ficar mostrando "Aprovado" quando na verdade voltou pra
// análise. Também adicionado: aviso antes de editar título/data de um
// evento aprovado, e o cancelamento (soft — nunca apaga a linha).
const TAMANHO_MAXIMO_MB = 5;

type EventoEditavel = {
  id: string;
  titulo: string;
  tipo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  foto_capa_url: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
};

// Rodada 47 — pedido direto da Andrea: "em todo evento colocar a opção de
// envio de lista (temos que dar essa opção no portal de cadastro?)". A
// Lista VIP já existe de verdade desde a Rodada 17 (listas_vip +
// listas_vip_solicitacoes, RLS via pode_gerenciar_evento) mas até aqui só
// morava numa tela separada (/dashboard/lista-vip) que o organizador
// precisava descobrir por conta própria — exatamente o tipo de "portal
// confuso" que ela reportou como sensação geral. Corrigido trazendo a
// mesma gestão (criar lista, ver quem pediu entrada, aprovar/rejeitar/
// check-in) pra dentro de CADA card de evento aqui, onde o organizador já
// está editando aquele evento — nenhuma tela nova pra descobrir. A tela
// /dashboard/lista-vip continua existindo (não é removida), só deixou de
// ser o único caminho.
type ListaVip = {
  id: string;
  evento_id: string;
  titulo: string;
  vagas_limite: number | null;
  vagas_ocupadas: number;
  ativa: boolean;
};

type SolicitacaoListaVip = {
  id: string;
  user_id: string;
  status: 'solicitada' | 'aprovada' | 'rejeitada' | 'cancelada' | 'check_in';
  acompanhantes: number;
  created_at: string;
  nome?: string;
};

const STATUS_SOLICITACAO_LABEL: Record<string, { label: string; cor: string }> = {
  solicitada: { label: 'Aguardando', cor: '#E1A93A' },
  aprovada: { label: 'Aprovada', cor: '#4CAF7D' },
  rejeitada: { label: 'Rejeitada', cor: '#8A8A9A' },
  cancelada: { label: 'Cancelada pelo usuário', cor: '#8A8A9A' },
  check_in: { label: 'Check-in feito', cor: '#4CAF7D' },
};

// Rodada 36 — <input type="datetime-local"> exige "AAAA-MM-DDTHH:mm" sem
// fuso; timestamptz do banco vem em UTC com "Z" -- precisa converter os
// dois sentidos, senão o horário mostrado/salvo fica errado pro fuso do
// organizador.
function paraDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function paraISO(datetimeLocal: string): string | null {
  if (!datetimeLocal) return null;
  return new Date(datetimeLocal).toISOString();
}

export default function DashboardEventosPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [eventos, setEventos] = useState<EventoEditavel[]>([]);
  const [erro, setErro] = useState('');
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [salvoId, setSalvoId] = useState<string | null>(null);
  const [enviandoFotoId, setEnviandoFotoId] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [confirmandoCancelId, setConfirmandoCancelId] = useState<string | null>(null);
  const inputsArquivo = useRef<Record<string, HTMLInputElement | null>>({});

  // Rodada 47 — estado da Lista VIP inline (ver comentário do type acima).
  const [listasVip, setListasVip] = useState<Record<string, ListaVip>>({});
  const [listaVipAberta, setListaVipAberta] = useState<Record<string, boolean>>({});
  const [criandoListaId, setCriandoListaId] = useState<string | null>(null);
  const [rascunhoLista, setRascunhoLista] = useState<Record<string, { titulo: string; vagas: string }>>({});
  const [solicitacoesPorLista, setSolicitacoesPorLista] = useState<Record<string, SolicitacaoListaVip[]>>({});
  const [carregandoSolicitacoesId, setCarregandoSolicitacoesId] = useState<string | null>(null);
  const [erroListaVip, setErroListaVip] = useState<Record<string, string>>({});

  const carregarListasVip = useCallback(async (eventoIds: string[]) => {
    if (eventoIds.length === 0) {
      setListasVip({});
      return;
    }
    const { data } = await supabase
      .from('listas_vip')
      .select('id, evento_id, titulo, vagas_limite, vagas_ocupadas, ativa')
      .in('evento_id', eventoIds);
    const mapa: Record<string, ListaVip> = {};
    ((data as ListaVip[]) || []).forEach((l) => {
      mapa[l.evento_id] = l;
    });
    setListasVip(mapa);
  }, []);

  const carregarEventos = useCallback(async () => {
    const { data, error } = await supabase.rpc('meus_eventos_gerenciaveis');
    if (error) {
      setErro(error.message);
      return;
    }
    const lista = ((data || []) as EventoEditavel[]).slice().sort((a, b) =>
      a.data_inicio < b.data_inicio ? 1 : -1
    );
    setEventos(lista);
    await carregarListasVip(lista.map((ev) => ev.id));
  }, [carregarListasVip]);

  const carregarSolicitacoesLista = useCallback(async (listaId: string) => {
    setCarregandoSolicitacoesId(listaId);
    const { data } = await supabase
      .from('listas_vip_solicitacoes')
      .select('id, user_id, status, acompanhantes, created_at')
      .eq('lista_vip_id', listaId)
      .order('created_at', { ascending: true });

    const lista = (data as SolicitacaoListaVip[]) || [];
    if (lista.length > 0) {
      // perfis_publicos, não profiles bruta — mesmo motivo de sempre (RLS
      // só libera a própria conta em profiles; a leitura pública de
      // display_name é via perfis_publicos, ver dashboard/lista-vip).
      const { data: perfis } = await supabase
        .from('perfis_publicos')
        .select('id, display_name')
        .in('id', lista.map((s) => s.user_id));
      const nomeDoId = new Map((perfis || []).map((p: any) => [p.id, p.display_name]));
      lista.forEach((s) => (s.nome = nomeDoId.get(s.user_id) || 'Usuário'));
    }
    setSolicitacoesPorLista((atual) => ({ ...atual, [listaId]: lista }));
    setCarregandoSolicitacoesId(null);
  }, []);

  const alternarListaVipAberta = (eventoId: string) => {
    const abrindo = !listaVipAberta[eventoId];
    setListaVipAberta((atual) => ({ ...atual, [eventoId]: abrindo }));
    const lista = listasVip[eventoId];
    if (abrindo && lista && !solicitacoesPorLista[lista.id]) {
      carregarSolicitacoesLista(lista.id);
    }
  };

  const criarListaVip = async (eventoId: string) => {
    const rascunho = rascunhoLista[eventoId] || { titulo: 'Lista VIP', vagas: '' };
    setErroListaVip((atual) => ({ ...atual, [eventoId]: '' }));
    const { error } = await supabase.from('listas_vip').insert({
      evento_id: eventoId,
      titulo: rascunho.titulo || 'Lista VIP',
      vagas_limite: rascunho.vagas ? Number(rascunho.vagas) : null,
    });
    if (error) {
      setErroListaVip((atual) => ({ ...atual, [eventoId]: error.message }));
      return;
    }
    setCriandoListaId(null);
    await carregarListasVip(eventos.map((ev) => ev.id));
  };

  const mudarStatusSolicitacao = async (
    solicitacaoId: string,
    novoStatus: SolicitacaoListaVip['status'],
    listaId: string,
    eventoId: string
  ) => {
    const { error } = await supabase
      .from('listas_vip_solicitacoes')
      .update({ status: novoStatus })
      .eq('id', solicitacaoId);
    if (error) {
      setErroListaVip((atual) => ({ ...atual, [eventoId]: error.message }));
      return;
    }
    await carregarSolicitacoesLista(listaId);
    await carregarListasVip(eventos.map((ev) => ev.id));
  };

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      await carregarEventos();
      setCarregando(false);
    })();
  }, [router, carregarEventos]);

  const atualizarCampo = (id: string, patch: Partial<EventoEditavel>) => {
    setEventos((atual) => atual.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)));
  };

  const salvarEvento = async (ev: EventoEditavel) => {
    setSalvandoId(ev.id);
    setErro('');
    const { error } = await supabase
      .from('eventos')
      .update({
        titulo: ev.titulo,
        descricao: ev.descricao,
        data_inicio: ev.data_inicio,
        data_fim: ev.data_fim,
        foto_capa_url: ev.foto_capa_url,
      })
      .eq('id', ev.id);
    if (error) {
      setErro(error.message);
    } else {
      // Rodada 41 — recarrega do banco: se título/data mudaram num evento
      // que já estava aprovado, o gatilho devolveu ele pra 'pendente' sem
      // avisar (por design) — sem isso a tela continuaria mostrando
      // "Aprovado" errado até a próxima visita.
      await carregarEventos();
      setSalvoId(ev.id);
      setTimeout(() => setSalvoId((atual) => (atual === ev.id ? null : atual)), 2500);
    }
    setSalvandoId(null);
  };

  const cancelarEvento = async (ev: EventoEditavel) => {
    setCancelandoId(ev.id);
    setErro('');
    const { error } = await supabase.from('eventos').update({ status: 'cancelado' }).eq('id', ev.id);
    if (error) {
      setErro(error.message);
    } else {
      await carregarEventos();
    }
    setConfirmandoCancelId(null);
    setCancelandoId(null);
  };

  const enviarFotoCapa = async (ev: EventoEditavel, arquivo: File) => {
    setErro('');
    if (!arquivo.type.startsWith('image/')) {
      setErro('Envie um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setErro(`A imagem precisa ter até ${TAMANHO_MAXIMO_MB}MB.`);
      return;
    }
    setEnviandoFotoId(ev.id);
    const extensao = arquivo.name.split('.').pop() || 'jpg';
    const caminho = `${ev.id}/capa-${Date.now()}.${extensao}`;
    const { error: erroUpload } = await supabase.storage
      .from('fotos-eventos')
      .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    if (erroUpload) {
      setErro(`Não deu pra enviar a foto: ${erroUpload.message}`);
      setEnviandoFotoId(null);
      return;
    }
    const { data } = supabase.storage.from('fotos-eventos').getPublicUrl(caminho);
    atualizarCampo(ev.id, { foto_capa_url: data.publicUrl });
    setEnviandoFotoId(null);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-6">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-black">Meus eventos</h1>
        <p className="text-[#A0A0B2] text-xs mt-1">
          Data, descrição e foto de capa das suas festas — o título é o mesmo que aparece no app.
          Mudar título ou data de uma festa já aprovada manda ela de volta pra análise antes de
          voltar ao ar; foto e descrição valem na hora. Cada evento também tem sua própria{' '}
          <b className="text-[#D0D0E0]">Lista VIP</b> aqui embaixo — abra quando quiser e aprove
          quem pedir entrada.
        </p>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      {eventos.length === 0 && (
        <p className="text-xs text-[#626274]">
          Nenhum evento seu por aqui ainda. Cadastre uma festa em{' '}
          <Link href="/cadastro/evento" className="underline hover:text-white">/cadastro/evento</Link>.
        </p>
      )}

      <div className="space-y-6">
        {eventos.map((ev) => (
          <div key={ev.id} className="bg-[#161520] border border-[#232230] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  ev.status === 'aprovado'
                    ? 'bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30'
                    : ev.status === 'pendente'
                    ? 'bg-[#E1A93A]/10 text-[#E1A93A] border border-[#E1A93A]/30'
                    : ev.status === 'cancelado'
                    ? 'bg-[#626274]/10 text-[#A0A0B2] border border-[#626274]/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}
              >
                {ev.status === 'aprovado'
                  ? 'Aprovado'
                  : ev.status === 'pendente'
                  ? 'Em análise'
                  : ev.status === 'cancelado'
                  ? 'Cancelado'
                  : 'Rejeitado'}
              </span>
              <span className="text-[10px] text-[#626274] uppercase font-bold">{ev.tipo}</span>
            </div>

            {ev.status === 'cancelado' ? (
              <div className="space-y-3">
                <p className="text-sm text-white font-bold">{ev.titulo}</p>
                <p className="text-xs text-[#626274]">
                  Esse evento foi cancelado e não aparece mais no app. Se foi engano ou você quer
                  reativar, fale com a Andrea — só o admin pode reverter um cancelamento.
                </p>
              </div>
            ) : (
              <>
            {ev.status === 'aprovado' && (
              <div className="flex items-start gap-2 bg-[#E1A93A]/10 border border-[#E1A93A]/30 rounded-xl p-3">
                <AlertTriangle size={14} className="text-[#E1A93A] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#E1A93A]">
                  Essa festa já está aprovada. Se você mudar o título ou a data, ela volta pra fila
                  de análise antes de aparecer de novo no app — foto e descrição podem ser trocadas
                  sem travar nada.
                </p>
              </div>
            )}

            {ev.foto_capa_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ev.foto_capa_url}
                alt={`Foto de capa de ${ev.titulo}`}
                className="w-full h-40 object-cover rounded-xl border border-[#232230]"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            )}
            <input
              ref={(elemento) => {
                inputsArquivo.current[ev.id] = elemento;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) enviarFotoCapa(ev, arquivo);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={enviandoFotoId === ev.id}
              onClick={() => inputsArquivo.current[ev.id]?.click()}
              className="w-full bg-[#0B0B0E] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-3 px-4 text-[#D0D0E0] text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              {enviandoFotoId === ev.id ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {enviandoFotoId === ev.id ? 'Enviando...' : ev.foto_capa_url ? 'Trocar foto de capa' : 'Enviar foto de capa'}
            </button>

            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Título</label>
              <input
                type="text"
                value={ev.titulo}
                onChange={(e) => atualizarCampo(ev.id, { titulo: e.target.value })}
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Descrição</label>
              <textarea
                value={ev.descricao || ''}
                onChange={(e) => atualizarCampo(ev.id, { descricao: e.target.value })}
                rows={3}
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2 flex items-center gap-1.5">
                  <Calendar size={12} /> Início
                </label>
                <input
                  type="datetime-local"
                  value={paraDatetimeLocal(ev.data_inicio)}
                  onChange={(e) => atualizarCampo(ev.id, { data_inicio: paraISO(e.target.value) || ev.data_inicio })}
                  className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Fim (opcional)</label>
                <input
                  type="datetime-local"
                  value={paraDatetimeLocal(ev.data_fim)}
                  onChange={(e) => atualizarCampo(ev.id, { data_fim: paraISO(e.target.value) })}
                  className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            <button
              onClick={() => salvarEvento(ev)}
              disabled={salvandoId === ev.id}
              className="w-full bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              {salvandoId === ev.id ? (
                <Loader2 className="animate-spin" size={16} />
              ) : salvoId === ev.id ? (
                'Salvo!'
              ) : (
                <>
                  <Save size={16} /> Salvar
                </>
              )}
            </button>

            {/* Rodada 47 — Lista VIP, agora vivendo dentro do próprio card
                do evento (ver comentário do type ListaVip acima). O "+"
                pra expandir/recolher segue o mesmo padrão que a Andrea já
                pediu pro /admin, pra não virar bagunça visual conforme
                cresce o número de eventos. */}
            {(() => {
              const lista = listasVip[ev.id];
              const aberto = !!listaVipAberta[ev.id];
              const rascunho = rascunhoLista[ev.id] || { titulo: 'Lista VIP', vagas: '' };
              const erroLista = erroListaVip[ev.id];
              const solicitacoes = lista ? solicitacoesPorLista[lista.id] : undefined;
              return (
                <div className="border-t border-[#232230] pt-3">
                  <button
                    type="button"
                    onClick={() => alternarListaVipAberta(ev.id)}
                    className="w-full flex items-center justify-between text-xs font-bold text-[#D0D0E0]"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users size={13} className="text-[#E1306C]" /> Lista VIP
                      {lista && (
                        <span className="text-[#A0A0B2] font-normal">
                          · {lista.vagas_ocupadas}{lista.vagas_limite ? ` / ${lista.vagas_limite}` : ''} vagas
                        </span>
                      )}
                      {!lista && <span className="text-[#626274] font-normal">· nenhuma ainda</span>}
                    </span>
                    {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {aberto && (
                    <div className="mt-3 space-y-3">
                      {erroLista && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-lg text-[11px]">
                          {erroLista}
                        </div>
                      )}

                      {!lista && criandoListaId !== ev.id && (
                        <button
                          type="button"
                          onClick={() => setCriandoListaId(ev.id)}
                          className="w-full bg-[#0B0B0E] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-2.5 px-4 text-[#D0D0E0] text-xs font-bold flex items-center justify-center gap-2 transition"
                        >
                          <Plus size={13} /> Abrir Lista VIP pra este evento
                        </button>
                      )}

                      {!lista && criandoListaId === ev.id && (
                        <div className="bg-[#0B0B0E] border border-[#232230] rounded-xl p-3 space-y-2.5">
                          <input
                            type="text"
                            value={rascunho.titulo}
                            onChange={(e) =>
                              setRascunhoLista((atual) => ({ ...atual, [ev.id]: { ...rascunho, titulo: e.target.value } }))
                            }
                            placeholder="Nome da lista (ex: Lista VIP)"
                            className="w-full bg-[#161520] border border-[#232230] rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-[#E1306C]"
                          />
                          <input
                            type="number"
                            min="1"
                            value={rascunho.vagas}
                            onChange={(e) =>
                              setRascunhoLista((atual) => ({ ...atual, [ev.id]: { ...rascunho, vagas: e.target.value } }))
                            }
                            placeholder="Limite de vagas (opcional)"
                            className="w-full bg-[#161520] border border-[#232230] rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-[#E1306C]"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => criarListaVip(ev.id)}
                              className="flex-1 bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-2 rounded-lg transition text-xs"
                            >
                              Criar lista
                            </button>
                            <button
                              type="button"
                              onClick={() => setCriandoListaId(null)}
                              className="flex-1 bg-[#161520] border border-[#232230] text-[#D0D0E0] font-bold py-2 rounded-lg transition text-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {lista && (
                        <div className="space-y-2">
                          {carregandoSolicitacoesId === lista.id && <Loader2 className="animate-spin text-[#E1306C]" size={16} />}
                          {carregandoSolicitacoesId !== lista.id && (solicitacoes?.length ?? 0) === 0 && (
                            <p className="text-[11px] text-[#626274]">Ninguém pediu entrada nessa lista ainda.</p>
                          )}
                          {(solicitacoes || []).map((s) => {
                            const info = STATUS_SOLICITACAO_LABEL[s.status];
                            return (
                              <div
                                key={s.id}
                                className="bg-[#0B0B0E] border border-[#232230] rounded-lg p-3 flex items-center justify-between gap-3"
                              >
                                <div>
                                  <div className="text-[11px] font-bold">{s.nome}</div>
                                  <div className="text-[10px] text-[#A0A0B2] mt-0.5">
                                    {s.acompanhantes > 0 ? `+ ${s.acompanhantes} acompanhante(s)` : 'sem acompanhantes'}
                                  </div>
                                  <div className="text-[10px] mt-1" style={{ color: info.cor }}>
                                    {info.label}
                                  </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  {s.status === 'solicitada' && (
                                    <>
                                      <button
                                        onClick={() => mudarStatusSolicitacao(s.id, 'aprovada', lista.id, ev.id)}
                                        className="bg-[#4CAF7D]/10 text-[#4CAF7D] border border-[#4CAF7D]/30 p-1.5 rounded-lg hover:bg-[#4CAF7D]/20"
                                        title="Aprovar"
                                      >
                                        <Check size={13} />
                                      </button>
                                      <button
                                        onClick={() => mudarStatusSolicitacao(s.id, 'rejeitada', lista.id, ev.id)}
                                        className="bg-red-500/10 text-red-400 border border-red-500/30 p-1.5 rounded-lg hover:bg-red-500/20"
                                        title="Rejeitar"
                                      >
                                        <X size={13} />
                                      </button>
                                    </>
                                  )}
                                  {s.status === 'aprovada' && (
                                    <button
                                      onClick={() => mudarStatusSolicitacao(s.id, 'check_in', lista.id, ev.id)}
                                      className="bg-[#232230] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-[#2D2B3D] flex items-center gap-1"
                                      title="Marcar check-in (chegou no evento)"
                                    >
                                      <LogIn size={12} /> Check-in
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {confirmandoCancelId === ev.id ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                <p className="text-xs text-red-400">
                  Cancelar &quot;{ev.titulo}&quot;? Ela some do app na hora. Não apaga o evento — só
                  marca como cancelado, e só a Andrea consegue reativar depois.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => cancelarEvento(ev)}
                    disabled={cancelandoId === ev.id}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2"
                  >
                    {cancelandoId === ev.id ? <Loader2 className="animate-spin" size={14} /> : 'Sim, cancelar'}
                  </button>
                  <button
                    onClick={() => setConfirmandoCancelId(null)}
                    className="flex-1 bg-[#0B0B0E] border border-[#232230] text-[#D0D0E0] font-bold py-2.5 rounded-xl transition text-xs"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmandoCancelId(ev.id)}
                className="w-full text-[#626274] hover:text-red-400 font-bold py-2 rounded-xl transition text-xs flex items-center justify-center gap-1.5"
              >
                <XCircle size={13} /> Cancelar este evento
              </button>
            )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
