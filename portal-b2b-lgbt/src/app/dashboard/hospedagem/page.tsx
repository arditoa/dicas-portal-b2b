'use client';
// Rodada 64 — Cadastro completo de hospedagem em 9 etapas, com barra de
// progresso e checklist (obrigatório × recomendado). Substitui a tela
// simples da Rodada 63.
//
//   1 Dados básicos · 2 Fotos · 3 Quartos e espaços · 4 Estrutura ·
//   5 Políticas · 6 Acolhimento LGBT+ · 7 Locais próximos · 8 Reserva ·
//   9 Revisão e envio
//
// Tabelas: locais (tipo_hospedagem, atributos, fotos, endereço),
// hospedagem_perfil (público), hospedagem_validacao (privado),
// hospedagem_espacos, pontos_proximos. Precisa das migrations 036 e 037.
// O % de completude é gravado em hospedagem_perfil.completude e ordena as
// hospedagens no app. A equipe valida no /admin e concede o selo.
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Circle,
  Clock,
  ExternalLink,
  FileUp,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buscarCoordenadas } from '../../../lib/geocodificar';
import { calcularCompletude, DadosHospedagem, ETAPAS, montarChecklist } from '../../../lib/hospedagemChecklist';
import { supabase } from '../../../lib/supabase';
import {
  COMPROMISSOS_ACOLHIMENTO,
  FORMAS_PAGAMENTO,
  GRUPOS_HOSPEDAGEM,
  IDIOMAS_ATENDIMENTO,
  TAGS_RESERVADAS,
  TERMO_ACOLHIMENTO,
  TIPOS_CANCELAMENTO,
  TIPOS_ESPACO,
  TIPOS_HOSPEDAGEM,
  TIPOS_PROXIMOS,
  TipoEspaco,
  slugTag,
} from '../../../lib/taxonomia';
import { erroFotoNaoSuportada, TAMANHO_MAXIMO_FOTO_MB } from '../../../lib/validarFoto';

const input =
  'w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]';
const label = 'text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2';
const card = 'bg-[#161520] border border-[#232230] rounded-2xl p-6';
const LIMITE_GALERIA = 10;

type LocalCampos = DadosHospedagem['local'] & { id: string; nome: string; cidade: string | null; ehPremium: boolean };
type Perfil = DadosHospedagem['perfil'] & {
  cadastur_validade: string | null;
  idade_minima: number | null;
  cancelamento_texto: string | null;
  regras_casa: string | null;
};
type Validacao = DadosHospedagem['validacao'] & { status: string; observacao_equipe: string | null };
type Espaco = {
  id: string;
  tipo: TipoEspaco;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  capacidade: number | null;
  camas: string | null;
  preco_de: number | null;
  caracteristicas: string[];
};
type Ponto = { id: string; tipo: string; nome: string; endereco: string | null; lat: number | null; lng: number | null; status: string };

const PERFIL_VAZIO: Perfil = {
  cadastur_numero: null,
  cadastur_validade: null,
  total_quartos: null,
  checkin_hora: null,
  checkout_hora: null,
  idiomas: [],
  idade_minima: null,
  cancelamento_tipo: null,
  cancelamento_texto: null,
  regras_casa: null,
  formas_pagamento: [],
  link_reserva: null,
  whatsapp_reserva: null,
  email_reserva: null,
  site: null,
};

function alternar(lista: string[], v: string) {
  return lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];
}

function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed ${
        on ? 'bg-purple-600 border-purple-600 text-white' : 'border-[#232230] text-[#A0A0B2] hover:border-purple-500/50'
      }`}
    >
      {children}
    </button>
  );
}

function distanciaTexto(a: { lat: number | null; lng: number | null }, p: { lat: number | null; lng: number | null }) {
  if (a.lat == null || a.lng == null || p.lat == null || p.lng == null) return null;
  const rad = (g: number) => (g * Math.PI) / 180;
  const h = Math.sin(rad(p.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(p.lat)) * Math.sin(rad(p.lng - a.lng) / 2) ** 2;
  const m = 2 * 6371000 * Math.asin(Math.sqrt(h));
  return m < 1000 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

async function enviarFotoLocal(localId: string, arquivo: File, prefixo: string) {
  const erroFormato = erroFotoNaoSuportada(arquivo);
  if (erroFormato) throw new Error(erroFormato);
  if (arquivo.size > TAMANHO_MAXIMO_FOTO_MB * 1024 * 1024) throw new Error(`A foto passa de ${TAMANHO_MAXIMO_FOTO_MB} MB. Reduza e tente de novo.`);
  const ext = arquivo.name.split('.').pop() || 'jpg';
  const caminho = `${localId}/${prefixo}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('fotos-locais').upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return supabase.storage.from('fotos-locais').getPublicUrl(caminho).data.publicUrl;
}

export default function HospedagemPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [etapa, setEtapa] = useState(1);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);

  const [local, setLocal] = useState<LocalCampos | null>(null);
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_VAZIO);
  const [validacao, setValidacao] = useState<Validacao>({ compromissos: [], comprovante_path: null, termo_aceito_em: null, status: 'rascunho', observacao_equipe: null });
  const [termoMarcado, setTermoMarcado] = useState(false);
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [pontos, setPontos] = useState<Ponto[]>([]);

  // formulário de espaço
  const [novoEspaco, setNovoEspaco] = useState({ tipo: 'quarto' as TipoEspaco, nome: '', descricao: '', capacidade: '', camas: '', preco: '', caracteristicas: [] as string[] });
  const [fotoEspaco, setFotoEspaco] = useState<File | null>(null);
  // formulário de ponto próximo
  const [novoPonto, setNovoPonto] = useState({ tipo: 'metro', nome: '', endereco: '' });

  const carregarListas = useCallback(async (id: string) => {
    const [e, p] = await Promise.all([
      supabase
        .from('hospedagem_espacos')
        .select('id, tipo, nome, descricao, foto_url, capacidade, camas, preco_de, caracteristicas')
        .eq('local_id', id)
        .order('ordem')
        .order('created_at'),
      supabase.from('pontos_proximos').select('id, tipo, nome, endereco, lat, lng, status').eq('local_id', id).order('created_at'),
    ]);
    setEspacos(((e.data as Espaco[]) || []).map((x) => ({ ...x, caracteristicas: x.caracteristicas || [] })));
    setPontos((p.data as Ponto[]) || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      const { data, error } = await supabase
        .from('locais')
        .select('id, nome, categoria, cidade, cnpj, endereco, lat, lng, foto_capa_url, galeria_fotos, plano_comercial, plano_comercial_status, tipo_hospedagem, atributos')
        .eq('owner_id', userData.user.id)
        .maybeSingle();
      if (error) {
        setErro('Esta área precisa da atualização do banco (migrations 036 e 037). Fale com a equipe Dicas.');
        setCarregando(false);
        return;
      }
      if (!data || data.categoria !== 'turismo') {
        router.push('/dashboard');
        return;
      }
      setLocal({
        id: data.id,
        nome: data.nome,
        cidade: data.cidade,
        cnpj: data.cnpj,
        endereco: data.endereco,
        lat: data.lat,
        lng: data.lng,
        foto_capa_url: data.foto_capa_url,
        galeria_fotos: data.galeria_fotos || [],
        tipo_hospedagem: data.tipo_hospedagem,
        atributos: (data.atributos as Record<string, string[]>) || {},
        ehPremium: data.plano_comercial_status === 'ativo' && ['premium', 'fundador'].includes(data.plano_comercial),
      });
      const [pf, vl] = await Promise.all([
        supabase.from('hospedagem_perfil').select('*').eq('local_id', data.id).maybeSingle(),
        supabase.from('hospedagem_validacao').select('compromissos, comprovante_path, termo_aceito_em, status, observacao_equipe').eq('local_id', data.id).maybeSingle(),
      ]);
      if (pf.error || vl.error) setErro('Falta rodar a migration 037 no Supabase para salvar o cadastro completo.');
      if (pf.data) setPerfil({ ...PERFIL_VAZIO, ...pf.data, idiomas: pf.data.idiomas || [], formas_pagamento: pf.data.formas_pagamento || [] });
      if (vl.data) {
        setValidacao({ ...vl.data, compromissos: vl.data.compromissos || [] });
        setTermoMarcado(!!vl.data.termo_aceito_em);
      }
      await carregarListas(data.id);
      const etapaUrl = Number(new URLSearchParams(window.location.search).get('etapa'));
      if (etapaUrl >= 1 && etapaUrl <= 9) setEtapa(etapaUrl);
      setCarregando(false);
    })();
  }, [router, carregarListas]);

  const checklist = useMemo(() => {
    if (!local) return [];
    return montarChecklist({
      local,
      perfil,
      validacao: { ...validacao, termo_aceito_em: validacao.termo_aceito_em || (termoMarcado ? 'agora' : null) },
      espacos,
      pontos,
    });
  }, [local, perfil, validacao, termoMarcado, espacos, pontos]);
  const completude = calcularCompletude(checklist);
  const faltamObrigatorios = checklist.filter((i) => i.obrigatorio && !i.ok);

  const setAtr = (grupo: string, slug: string) =>
    local && setLocal({ ...local, atributos: { ...local.atributos, [grupo]: alternar(local.atributos[grupo] || [], slug) } });

  // Salva tudo de uma vez (locais + perfil + validação). Chamado ao trocar de etapa.
  const salvar = async (opcoes: { enviar?: boolean } = {}) => {
    if (!local) return false;
    setSalvando(true);
    setErro('');
    try {
      const atributosLimpos = Object.fromEntries(
        Object.entries(local.atributos).map(([g, tags]) => [g, tags.filter((t) => !TAGS_RESERVADAS.includes(t))])
      );
      const r1 = await supabase
        .from('locais')
        .update({
          tipo_hospedagem: local.tipo_hospedagem || null,
          atributos: atributosLimpos,
          cnpj: local.cnpj || null,
          endereco: local.endereco || null,
          lat: local.lat,
          lng: local.lng,
          foto_capa_url: local.foto_capa_url,
          galeria_fotos: local.galeria_fotos || [],
        })
        .eq('id', local.id);
      if (r1.error) throw r1.error;

      const r2 = await supabase.from('hospedagem_perfil').upsert({ local_id: local.id, ...perfil, completude, updated_at: new Date().toISOString() });
      if (r2.error) throw r2.error;

      const termo = validacao.termo_aceito_em || (termoMarcado ? new Date().toISOString() : null);
      const status = opcoes.enviar ? 'enviado' : validacao.status === 'aprovado' || validacao.status === 'enviado' ? validacao.status : 'rascunho';
      const r3 = await supabase.from('hospedagem_validacao').upsert({
        local_id: local.id,
        compromissos: validacao.compromissos,
        comprovante_path: validacao.comprovante_path,
        termo_aceito_em: termo,
        status,
      });
      if (r3.error) throw r3.error;
      setValidacao((v) => ({ ...v, termo_aceito_em: termo, status: opcoes.enviar ? 'enviado' : v.status }));
      return true;
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const irPara = async (n: number) => {
    await salvar();
    setAviso('');
    setEtapa(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const localizarNoMapa = async () => {
    if (!local?.endereco) return;
    setAviso('');
    const coord = await buscarCoordenadas([local.endereco, local.cidade].filter(Boolean).join(', '));
    if (!coord) {
      setErro('Não encontramos esse endereço no mapa. Confira número, rua e cidade.');
      return;
    }
    setErro('');
    setLocal({ ...local, lat: coord.lat, lng: coord.lng });
    setAviso('Endereço localizado. Confira no mapa pelo link e salve.');
  };

  const subirCapa = async (f: File | undefined) => {
    if (!f || !local) return;
    setEnviandoArquivo(true);
    setErro('');
    try {
      const url = await enviarFotoLocal(local.id, f, 'capa');
      setLocal({ ...local, foto_capa_url: url });
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar foto.');
    } finally {
      setEnviandoArquivo(false);
    }
  };

  const subirGaleria = async (arquivos: FileList | null) => {
    if (!arquivos || !local) return;
    setEnviandoArquivo(true);
    setErro('');
    try {
      const novas: string[] = [];
      for (const f of Array.from(arquivos).slice(0, LIMITE_GALERIA - (local.galeria_fotos || []).length)) {
        novas.push(await enviarFotoLocal(local.id, f, 'galeria'));
      }
      setLocal({ ...local, galeria_fotos: [...(local.galeria_fotos || []), ...novas] });
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar foto.');
    } finally {
      setEnviandoArquivo(false);
    }
  };

  const subirComprovante = async (f: File | undefined) => {
    if (!f || !local) return;
    if (f.size > 10 * 1024 * 1024) {
      setErro('O arquivo passa de 10 MB.');
      return;
    }
    setEnviandoArquivo(true);
    setErro('');
    const ext = f.name.split('.').pop() || 'pdf';
    const caminho = `${local.id}/comprovante-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documentos-hospedagem').upload(caminho, f, { upsert: false });
    setEnviandoArquivo(false);
    if (error) setErro(`Não deu pra enviar o arquivo: ${error.message}`);
    else setValidacao({ ...validacao, comprovante_path: caminho });
  };

  const criarEspaco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!local) return;
    setEnviandoArquivo(true);
    setErro('');
    try {
      const foto_url = fotoEspaco ? await enviarFotoLocal(local.id, fotoEspaco, `espaco-${novoEspaco.tipo}`) : null;
      const { error } = await supabase.from('hospedagem_espacos').insert({
        local_id: local.id,
        tipo: novoEspaco.tipo,
        nome: novoEspaco.nome,
        descricao: novoEspaco.descricao || null,
        foto_url,
        capacidade: novoEspaco.tipo === 'quarto' && novoEspaco.capacidade ? Number(novoEspaco.capacidade) : null,
        camas: novoEspaco.tipo === 'quarto' ? novoEspaco.camas || null : null,
        preco_de: novoEspaco.tipo === 'quarto' && novoEspaco.preco ? Number(novoEspaco.preco) : null,
        caracteristicas: novoEspaco.tipo === 'quarto' ? novoEspaco.caracteristicas : [],
        ordem: espacos.filter((x) => x.tipo === novoEspaco.tipo).length,
      });
      if (error) throw error;
      setNovoEspaco({ ...novoEspaco, nome: '', descricao: '', capacidade: '', camas: '', preco: '', caracteristicas: [] });
      setFotoEspaco(null);
      await carregarListas(local.id);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setEnviandoArquivo(false);
    }
  };

  const criarPonto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!local) return;
    setEnviandoArquivo(true);
    setErro('');
    try {
      const coord = await buscarCoordenadas([novoPonto.endereco || novoPonto.nome, local.cidade].filter(Boolean).join(', '));
      const { error } = await supabase.from('pontos_proximos').insert({
        local_id: local.id,
        tipo: novoPonto.tipo,
        nome: novoPonto.nome,
        endereco: novoPonto.endereco || null,
        lat: coord?.lat ?? null,
        lng: coord?.lng ?? null,
      });
      if (error) throw error;
      setNovoPonto({ ...novoPonto, nome: '', endereco: '' });
      await carregarListas(local.id);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setEnviandoArquivo(false);
    }
  };

  const apagar = async (tabela: 'hospedagem_espacos' | 'pontos_proximos', id: string) => {
    if (!local) return;
    await supabase.from(tabela).delete().eq('id', id);
    await carregarListas(local.id);
  };

  const enviarValidacao = async () => {
    if (faltamObrigatorios.length > 0) return;
    if (validacao.status === 'aprovado') {
      // Já verificada: só salva as atualizações, sem tirar o selo.
      if (await salvar()) setAviso('Atualizações salvas e publicadas no app.');
      return;
    }
    const ok = await salvar({ enviar: true });
    if (ok) setAviso('Cadastro enviado! A equipe Dicas vai conferir e avisar você pelo WhatsApp.');
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }
  if (!local) {
    return <div className="p-8 text-red-400 text-sm">{erro || 'Não foi possível carregar.'}</div>;
  }

  const itensDaEtapa = (n: number) => checklist.filter((i) => i.etapa === n);
  const etapaOk = (n: number) => itensDaEtapa(n).every((i) => !i.obrigatorio || i.ok) && itensDaEtapa(n).some((i) => i.ok);
  const linkMapa = local.lat != null ? `https://www.google.com/maps?q=${local.lat},${local.lng}` : null;

  const StatusBanner = () => {
    const s = validacao.status;
    if (s === 'aprovado')
      return (
        <div className="bg-[#4CAF7D]/10 border border-[#4CAF7D]/30 text-[#4CAF7D] p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
          <BadgeCheck size={18} /> Hospedagem verificada pelo Dicas. O selo já aparece no app.
        </div>
      );
    if (s === 'enviado')
      return (
        <div className="bg-[#FFD54F]/10 border border-[#FFD54F]/30 text-[#FFD54F] p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
          <Clock size={18} /> Cadastro em análise pela equipe Dicas. Você pode continuar editando.
        </div>
      );
    if (s === 'ajustes')
      return (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm mb-6">
          <p className="font-bold flex items-center gap-2"><AlertTriangle size={16} /> A equipe pediu alguns ajustes</p>
          {validacao.observacao_equipe && <p className="mt-1 text-xs">{validacao.observacao_equipe}</p>}
          <p className="mt-1 text-xs">Depois de ajustar, envie de novo na etapa 9.</p>
        </div>
      );
    return null;
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto text-white">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-4">
        <ArrowLeft size={14} /> Voltar
      </Link>

      {/* Cabeçalho com progresso */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black">Cadastro da hospedagem</h1>
          <p className="text-[#A0A0B2] text-xs mt-1">{local.nome} · quanto mais completo, mais destaque no app.</p>
        </div>
        <div className="md:w-72">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-bold">{completude}% completo</span>
            <span className="text-[#A0A0B2]">
              {faltamObrigatorios.length === 0 ? 'Obrigatórios ok' : `${faltamObrigatorios.length} obrigatório(s) faltando`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#232230] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#7E57C2] to-[#E1306C] transition-all" style={{ width: `${completude}%` }} />
          </div>
        </div>
      </div>

      <StatusBanner />
      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}
      {aviso && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-xs mb-6">{aviso}</div>}

      <div className="grid md:grid-cols-[230px_1fr] gap-6">
        {/* Etapas */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {ETAPAS.map((e) => {
            const ativa = etapa === e.n;
            const ok = e.n === 9 ? faltamObrigatorios.length === 0 : etapaOk(e.n);
            return (
              <button
                key={e.n}
                onClick={() => irPara(e.n)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold whitespace-nowrap transition ${
                  ativa ? 'bg-[#232230] text-white' : 'text-[#A0A0B2] hover:bg-[#161520]'
                }`}
              >
                {ok ? (
                  <span className="w-5 h-5 rounded-full bg-[#4CAF7D] text-black flex items-center justify-center shrink-0"><Check size={12} /></span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-[#3A3850] text-[10px] flex items-center justify-center shrink-0">{e.n}</span>
                )}
                {e.titulo}
              </button>
            );
          })}
        </nav>

        <div className="space-y-6 min-w-0">
          {/* O que falta nesta etapa */}
          {etapa < 9 && itensDaEtapa(etapa).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {itensDaEtapa(etapa).map((i) => (
                <span
                  key={i.id}
                  className={`text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                    i.ok ? 'border-[#4CAF7D]/40 text-[#4CAF7D]' : i.obrigatorio ? 'border-[#E1306C]/40 text-[#FF8FB1]' : 'border-[#232230] text-[#A0A0B2]'
                  }`}
                >
                  {i.ok ? <Check size={11} /> : <Circle size={9} />} {i.label}
                  {!i.ok && (i.obrigatorio ? ' · obrigatório' : ' · recomendado')}
                </span>
              ))}
            </div>
          )}

          {/* 1. DADOS BÁSICOS */}
          {etapa === 1 && (
            <>
              <div className={card}>
                <label className={label}>Tipo de hospedagem *</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_HOSPEDAGEM.map((t) => (
                    <Chip key={t} on={local.tipo_hospedagem === slugTag(t)} onClick={() => setLocal({ ...local, tipo_hospedagem: local.tipo_hospedagem === slugTag(t) ? null : slugTag(t) })}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className={`${card} grid md:grid-cols-2 gap-4`}>
                <div>
                  <label className={label}>Número do Cadastur *</label>
                  <input className={input} value={perfil.cadastur_numero || ''} onChange={(e) => setPerfil({ ...perfil, cadastur_numero: e.target.value })} placeholder="Ex: 35.012345.10.0001-2" />
                  <p className="text-[11px] text-[#626274] mt-1">
                    Registro obrigatório para meios de hospedagem.{' '}
                    <a href="https://cadastur.turismo.gov.br" target="_blank" rel="noreferrer" className="text-[#B39DDB] underline">Consultar ou cadastrar (grátis)</a>
                  </p>
                </div>
                <div>
                  <label className={label}>Validade do Cadastur</label>
                  <input type="date" className={input} value={perfil.cadastur_validade || ''} onChange={(e) => setPerfil({ ...perfil, cadastur_validade: e.target.value || null })} />
                </div>
                <div>
                  <label className={label}>CNPJ</label>
                  <input className={input} value={local.cnpj || ''} onChange={(e) => setLocal({ ...local, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <label className={label}>Total de quartos / unidades</label>
                  <input type="number" min={1} className={input} value={perfil.total_quartos ?? ''} onChange={(e) => setPerfil({ ...perfil, total_quartos: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <label className={label}>Check-in a partir de *</label>
                  <input type="time" className={input} value={perfil.checkin_hora || ''} onChange={(e) => setPerfil({ ...perfil, checkin_hora: e.target.value || null })} />
                </div>
                <div>
                  <label className={label}>Check-out até *</label>
                  <input type="time" className={input} value={perfil.checkout_hora || ''} onChange={(e) => setPerfil({ ...perfil, checkout_hora: e.target.value || null })} />
                </div>
              </div>
              <div className={card}>
                <label className={label}>Endereço completo *</label>
                <div className="flex gap-2">
                  <input className={input} value={local.endereco || ''} onChange={(e) => setLocal({ ...local, endereco: e.target.value, lat: null, lng: null })} placeholder="Rua, número, bairro" />
                  <button type="button" onClick={localizarNoMapa} className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 rounded-xl whitespace-nowrap flex items-center gap-1">
                    <MapPin size={14} /> Localizar
                  </button>
                </div>
                <p className="text-[11px] mt-2">
                  {linkMapa ? (
                    <a href={linkMapa} target="_blank" rel="noreferrer" className="text-[#4CAF7D] inline-flex items-center gap-1">
                      <Check size={12} /> Localizado no mapa — conferir <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="text-[#FFD54F]">Ainda sem localização. Clique em “Localizar” — é com ela que calculamos os locais próximos.</span>
                  )}
                </p>
              </div>
              <div className={card}>
                <label className={label}>Idiomas de atendimento</label>
                <div className="flex flex-wrap gap-2">
                  {IDIOMAS_ATENDIMENTO.map((i) => (
                    <Chip key={i} on={perfil.idiomas.includes(slugTag(i))} onClick={() => setPerfil({ ...perfil, idiomas: alternar(perfil.idiomas, slugTag(i)) })}>
                      {i}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 2. FOTOS */}
          {etapa === 2 && (
            <>
              <div className={card}>
                <label className={label}>Foto de capa *</label>
                <p className="text-[11px] text-[#626274] mb-3">A primeira impressão: fachada, piscina ou a vista mais bonita. Horizontal, JPG/PNG até {TAMANHO_MAXIMO_FOTO_MB} MB.</p>
                <label className="flex items-center gap-4 border border-dashed border-[#232230] rounded-xl p-4 cursor-pointer hover:border-[#E1306C]/50">
                  {local.foto_capa_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={local.foto_capa_url} alt="Capa" className="w-40 h-24 rounded-lg object-cover" />
                  ) : (
                    <div className="w-40 h-24 rounded-lg bg-[#0B0B0E] border border-[#232230] flex items-center justify-center"><ImagePlus className="text-[#A0A0B2]" size={20} /></div>
                  )}
                  <span className="text-xs text-[#A0A0B2]">{local.foto_capa_url ? 'Trocar foto de capa' : 'Escolher foto de capa'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => subirCapa(e.target.files?.[0])} />
                </label>
              </div>
              <div className={card}>
                <label className={label}>Galeria ({(local.galeria_fotos || []).length}/{LIMITE_GALERIA}) · recomendado 4 ou mais</label>
                <p className="text-[11px] text-[#626274] mb-3">Recepção, áreas comuns, café da manhã, detalhes. Fotos dos quartos entram na etapa 3.</p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {(local.galeria_fotos || []).map((url) => (
                    <div key={url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-20 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => setLocal({ ...local, galeria_fotos: (local.galeria_fotos || []).filter((u) => u !== url) })}
                        className="absolute top-1 right-1 bg-black/70 rounded-full p-1"
                        title="Remover"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {(local.galeria_fotos || []).length < LIMITE_GALERIA && (
                    <label className="h-20 rounded-lg border border-dashed border-[#232230] flex items-center justify-center cursor-pointer hover:border-[#E1306C]/50">
                      <Plus size={18} className="text-[#A0A0B2]" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => subirGaleria(e.target.files)} />
                    </label>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 3. QUARTOS E ESPAÇOS */}
          {etapa === 3 && (
            <>
              {!local.ehPremium && (
                <div className="bg-[#FFD54F]/10 border border-[#FFD54F]/30 text-[#FFD54F] p-3 rounded-xl text-xs">
                  Pode cadastrar à vontade. As fotos dos espaços aparecem no app nos planos Premium e Fundador.
                </div>
              )}
              <form onSubmit={criarEspaco} className={`${card} space-y-4`}>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_ESPACO.map((t) => (
                    <Chip key={t.id} on={novoEspaco.tipo === t.id} onClick={() => setNovoEspaco({ ...novoEspaco, tipo: t.id })}>
                      {t.titulo}
                    </Chip>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Nome *</label>
                    <input
                      required
                      className={input}
                      value={novoEspaco.nome}
                      onChange={(e) => setNovoEspaco({ ...novoEspaco, nome: e.target.value })}
                      placeholder={novoEspaco.tipo === 'quarto' ? 'Quarto Deluxe Vista Mar' : novoEspaco.tipo === 'lazer' ? 'Piscina aquecida, academia, sala de jogos' : 'Rooftop, lobby, coworking'}
                    />
                  </div>
                  <div>
                    <label className={label}>Descrição curta</label>
                    <input className={input} value={novoEspaco.descricao} onChange={(e) => setNovoEspaco({ ...novoEspaco, descricao: e.target.value })} placeholder="Conforto e vista incrível." />
                  </div>
                  {novoEspaco.tipo === 'quarto' && (
                    <>
                      <div>
                        <label className={label}>Capacidade (pessoas)</label>
                        <input type="number" min={1} className={input} value={novoEspaco.capacidade} onChange={(e) => setNovoEspaco({ ...novoEspaco, capacidade: e.target.value })} />
                      </div>
                      <div>
                        <label className={label}>Camas</label>
                        <input className={input} value={novoEspaco.camas} onChange={(e) => setNovoEspaco({ ...novoEspaco, camas: e.target.value })} placeholder="1 cama king / 2 de solteiro" />
                      </div>
                      <div>
                        <label className={label}>Diária a partir de (R$)</label>
                        <input type="number" min={0} step="0.01" className={input} value={novoEspaco.preco} onChange={(e) => setNovoEspaco({ ...novoEspaco, preco: e.target.value })} placeholder="390.00" />
                      </div>
                    </>
                  )}
                </div>
                {novoEspaco.tipo === 'quarto' && (
                  <div>
                    <label className={label}>Características deste quarto</label>
                    <div className="flex flex-wrap gap-2">
                      {GRUPOS_HOSPEDAGEM.find((g) => g.id === 'quartos')!.tags.map((t) => (
                        <Chip key={t} on={novoEspaco.caracteristicas.includes(slugTag(t))} onClick={() => setNovoEspaco({ ...novoEspaco, caracteristicas: alternar(novoEspaco.caracteristicas, slugTag(t)) })}>
                          {t}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-3 border border-dashed border-[#232230] rounded-xl p-4 cursor-pointer hover:border-[#E1306C]/50">
                  {fotoEspaco ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={URL.createObjectURL(fotoEspaco)} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#0B0B0E] border border-[#232230] flex items-center justify-center"><ImagePlus size={18} className="text-[#A0A0B2]" /></div>
                  )}
                  <span className="text-xs text-[#A0A0B2]">{fotoEspaco ? fotoEspaco.name : 'Escolher foto (recomendado)'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoEspaco(e.target.files?.[0] || null)} />
                </label>
                <button type="submit" disabled={enviandoArquivo} className="w-full bg-[#232230] hover:bg-[#2D2B3D] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                  <Plus size={14} /> {enviandoArquivo ? 'Salvando...' : 'Adicionar'}
                </button>
              </form>

              {TIPOS_ESPACO.map((t) => {
                const lista = espacos.filter((e) => e.tipo === t.id);
                return (
                  <div key={t.id}>
                    <h2 className="text-sm font-bold mb-2">{t.titulo} ({lista.length})</h2>
                    {lista.length === 0 && <p className="text-xs text-[#626274]">Nada cadastrado ainda.</p>}
                    <div className="grid md:grid-cols-3 gap-3">
                      {lista.map((e) => (
                        <div key={e.id} className="bg-[#161520] border border-[#232230] rounded-xl overflow-hidden">
                          {e.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={e.foto_url} alt={e.nome} className="w-full h-28 object-cover" />
                          ) : (
                            <div className="w-full h-28 bg-[#0B0B0E] flex items-center justify-center text-[11px] text-[#FFD54F]">Sem foto</div>
                          )}
                          <div className="p-3 flex justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{e.nome}</p>
                              <p className="text-[11px] text-[#A0A0B2] mt-0.5">
                                {[e.capacidade ? `${e.capacidade} pessoas` : null, e.camas, e.preco_de != null ? `a partir de R$ ${Number(e.preco_de).toFixed(0)}` : null]
                                  .filter(Boolean)
                                  .join(' · ') || e.descricao}
                              </p>
                            </div>
                            <button onClick={() => apagar('hospedagem_espacos', e.id)} className="text-red-400 shrink-0" title="Excluir">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* 4. ESTRUTURA */}
          {etapa === 4 &&
            ['comodidades', 'quartos', 'acessibilidade', 'servicos', 'bem_estar', 'transporte', 'localizacao', 'perfil'].map((gid) => {
              const g = GRUPOS_HOSPEDAGEM.find((x) => x.id === gid)!;
              return (
                <div key={g.id} className={card}>
                  <label className={label}>
                    {g.titulo}
                    {g.id === 'comodidades' ? ' * (mínimo 3)' : ''}
                    {g.id === 'quartos' ? ' (o que todos ou a maioria dos quartos têm)' : ''}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {g.tags.map((t) => (
                      <Chip key={t} on={(local.atributos[g.id] || []).includes(slugTag(t))} onClick={() => setAtr(g.id, slugTag(t))}>
                        {t}
                      </Chip>
                    ))}
                  </div>
                </div>
              );
            })}

          {/* 5. POLÍTICAS */}
          {etapa === 5 && (
            <>
              <div className={card}>
                <label className={label}>Política de cancelamento *</label>
                <div className="grid md:grid-cols-2 gap-2">
                  {TIPOS_CANCELAMENTO.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPerfil({ ...perfil, cancelamento_tipo: c.id })}
                      className={`text-left border rounded-xl p-3 transition ${
                        perfil.cancelamento_tipo === c.id ? 'border-purple-500 bg-purple-500/10' : 'border-[#232230] hover:border-purple-500/40'
                      }`}
                    >
                      <p className="text-sm font-bold">{c.label}</p>
                      <p className="text-[11px] text-[#A0A0B2]">{c.ajuda}</p>
                    </button>
                  ))}
                </div>
                <textarea
                  className={`${input} mt-3`}
                  rows={2}
                  value={perfil.cancelamento_texto || ''}
                  onChange={(e) => setPerfil({ ...perfil, cancelamento_texto: e.target.value })}
                  placeholder="Detalhes da regra (opcional)"
                />
              </div>
              <div className={card}>
                <label className={label}>Regras e serviços</label>
                <div className="flex flex-wrap gap-2">
                  {GRUPOS_HOSPEDAGEM.find((g) => g.id === 'politicas')!.tags.map((t) => (
                    <Chip key={t} on={(local.atributos.politicas || []).includes(slugTag(t))} onClick={() => setAtr('politicas', slugTag(t))}>
                      {t}
                    </Chip>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className={label}>Idade mínima para se hospedar</label>
                    <input type="number" min={0} className={input} value={perfil.idade_minima ?? ''} onChange={(e) => setPerfil({ ...perfil, idade_minima: e.target.value ? Number(e.target.value) : null })} placeholder="18" />
                  </div>
                </div>
              </div>
              <div className={card}>
                <label className={label}>Formas de pagamento</label>
                <div className="flex flex-wrap gap-2">
                  {FORMAS_PAGAMENTO.map((f) => (
                    <Chip key={f} on={perfil.formas_pagamento.includes(slugTag(f))} onClick={() => setPerfil({ ...perfil, formas_pagamento: alternar(perfil.formas_pagamento, slugTag(f)) })}>
                      {f}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className={card}>
                <label className={label}>Regras da casa (opcional)</label>
                <textarea className={input} rows={3} value={perfil.regras_casa || ''} onChange={(e) => setPerfil({ ...perfil, regras_casa: e.target.value })} placeholder="Silêncio após 22h, visitas na recepção…" />
              </div>
            </>
          )}

          {/* 6. ACOLHIMENTO LGBT+ */}
          {etapa === 6 && (
            <>
              <div className={card}>
                <label className={label}>Nossos compromissos de acolhimento</label>
                <p className="text-[11px] text-[#626274] mb-3">Marque o que já é realidade hoje. A equipe confere antes de conceder o selo “Verificado pelo Dicas”.</p>
                <div className="space-y-2">
                  {COMPROMISSOS_ACOLHIMENTO.map((c) => {
                    const on = validacao.compromissos.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setValidacao({ ...validacao, compromissos: alternar(validacao.compromissos, c.id) })}
                        className={`w-full text-left flex gap-3 items-start border rounded-xl p-3 transition ${on ? 'border-purple-500 bg-purple-500/10' : 'border-[#232230] hover:border-purple-500/40'}`}
                      >
                        <span className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-purple-600 border-purple-600' : 'border-[#3A3850]'}`}>
                          {on && <Check size={12} />}
                        </span>
                        <span>
                          <span className="text-sm font-bold block">{c.label}</span>
                          {c.ajuda && <span className="text-[11px] text-[#A0A0B2]">{c.ajuda}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={card}>
                <label className={label}>Tags de diversidade que aparecem no app</label>
                <div className="flex flex-wrap gap-2">
                  {GRUPOS_HOSPEDAGEM.find((g) => g.id === 'diversidade')!.tags.map((t) => {
                    const s = slugTag(t);
                    const reservada = TAGS_RESERVADAS.includes(s);
                    return (
                      <Chip key={s} on={(local.atributos.diversidade || []).includes(s)} disabled={reservada} onClick={() => setAtr('diversidade', s)}>
                        {t}
                        {reservada ? ' · concedido pela equipe' : ''}
                      </Chip>
                    );
                  })}
                </div>
              </div>
              <div className={card}>
                <label className={label}>Comprovante (recomendado)</label>
                <p className="text-[11px] text-[#626274] mb-3">
                  Política antidiscriminação, certificado de treinamento, selo de outra entidade… PDF ou imagem até 10 MB. Só a equipe Dicas vê.
                </p>
                <label className="flex items-center gap-3 border border-dashed border-[#232230] rounded-xl p-4 cursor-pointer hover:border-[#E1306C]/50">
                  <FileUp size={18} className="text-[#A0A0B2]" />
                  <span className="text-xs text-[#A0A0B2]">
                    {validacao.comprovante_path ? `Enviado: ${validacao.comprovante_path.split('/').pop()} — clique para trocar` : 'Escolher arquivo'}
                  </span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => subirComprovante(e.target.files?.[0])} />
                </label>
              </div>
              <div className={card}>
                <label className={label}>Termo de compromisso *</label>
                <p className="text-xs text-[#C0C0D0] leading-relaxed bg-[#0B0B0E] border border-[#232230] rounded-xl p-4">{TERMO_ACOLHIMENTO}</p>
                <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                  <input type="checkbox" checked={termoMarcado} disabled={!!validacao.termo_aceito_em} onChange={(e) => setTermoMarcado(e.target.checked)} className="accent-purple-600 w-4 h-4" />
                  {validacao.termo_aceito_em
                    ? `Aceito em ${new Date(validacao.termo_aceito_em).toLocaleDateString('pt-BR')}`
                    : 'Li e aceito o termo em nome da hospedagem'}
                </label>
              </div>
            </>
          )}

          {/* 7. LOCAIS PRÓXIMOS */}
          {etapa === 7 && (
            <>
              <div className={`${card} text-xs text-[#A0A0B2] leading-relaxed`}>
                <p className="text-white font-bold text-sm mb-1">Como funciona</p>
                Bares, festas, restaurantes, cafés, saunas, espaços culturais e eventos que já estão no Dicas aparecem sozinhos, com a distância calculada pelo mapa (até 3 km).
                Aqui você indica os <b>outros pontos principais</b> perto da hospedagem: metrô, avenida, praia, percurso da Parada, hospital… A equipe confere a localização antes de liberar.
                {local.lat == null && <span className="block mt-2 text-[#FFD54F]">Localize o endereço da hospedagem na etapa 1 para calcular as distâncias.</span>}
                {!local.ehPremium && <span className="block mt-2 text-[#FFD54F]">Locais próximos aparecem no app nos planos Premium e Fundador.</span>}
              </div>
              <form onSubmit={criarPonto} className={`${card} grid md:grid-cols-3 gap-4 items-end`}>
                <div>
                  <label className={label}>Tipo</label>
                  <select value={novoPonto.tipo} onChange={(e) => setNovoPonto({ ...novoPonto, tipo: e.target.value })} className={input}>
                    {TIPOS_PROXIMOS.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Nome</label>
                  <input required className={input} value={novoPonto.nome} onChange={(e) => setNovoPonto({ ...novoPonto, nome: e.target.value })} placeholder="Metrô Consolação" />
                </div>
                <div>
                  <label className={label}>Endereço</label>
                  <input className={input} value={novoPonto.endereco} onChange={(e) => setNovoPonto({ ...novoPonto, endereco: e.target.value })} placeholder="Av. Paulista, 2163" />
                </div>
                <button type="submit" disabled={enviandoArquivo} className="md:col-span-3 bg-[#232230] hover:bg-[#2D2B3D] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                  <MapPin size={14} /> {enviandoArquivo ? 'Localizando no mapa...' : 'Enviar para validação'}
                </button>
              </form>
              <div className="space-y-2">
                {pontos.length === 0 && <p className="text-xs text-[#626274]">Nenhum ponto indicado ainda.</p>}
                {pontos.map((p) => {
                  const dist = distanciaTexto(local, p);
                  return (
                    <div key={p.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{TIPOS_PROXIMOS.find((t) => t.id === p.tipo)?.label || p.tipo} · {p.nome}</p>
                        <p className="text-xs text-[#A0A0B2] mt-0.5">
                          {p.endereco || 'Sem endereço'}
                          {dist ? ` · a ${dist}` : p.lat == null ? ' · não achado no mapa (a equipe ajusta)' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {p.status === 'aprovado' ? (
                          <span className="text-green-400 text-xs font-bold flex items-center gap-1"><Check size={12} /> Validado</span>
                        ) : p.status === 'recusado' ? (
                          <span className="text-red-400 text-xs font-bold flex items-center gap-1"><X size={12} /> Recusado</span>
                        ) : (
                          <span className="text-[#FFD54F] text-xs font-bold flex items-center gap-1"><Clock size={12} /> Em análise</span>
                        )}
                        <button onClick={() => apagar('pontos_proximos', p.id)} className="text-red-400" title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* 8. RESERVA */}
          {etapa === 8 && (
            <div className={`${card} space-y-4`}>
              <p className="text-xs text-[#A0A0B2]">
                Informe pelo menos um canal. O botão “Consultar disponibilidade” do app leva a pessoa direto para o seu canal — a reserva e o pagamento acontecem com vocês, sem comissão do Dicas.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Link de reserva (motor de reservas, Booking…)</label>
                  <input className={input} value={perfil.link_reserva || ''} onChange={(e) => setPerfil({ ...perfil, link_reserva: e.target.value || null })} placeholder="https://reservas.seuhotel.com.br" />
                </div>
                <div>
                  <label className={label}>WhatsApp de reservas</label>
                  <input className={input} value={perfil.whatsapp_reserva || ''} onChange={(e) => setPerfil({ ...perfil, whatsapp_reserva: e.target.value || null })} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className={label}>E-mail de reservas</label>
                  <input type="email" className={input} value={perfil.email_reserva || ''} onChange={(e) => setPerfil({ ...perfil, email_reserva: e.target.value || null })} placeholder="reservas@seuhotel.com.br" />
                </div>
                <div>
                  <label className={label}>Site oficial</label>
                  <input className={input} value={perfil.site || ''} onChange={(e) => setPerfil({ ...perfil, site: e.target.value || null })} placeholder="https://seuhotel.com.br" />
                </div>
              </div>
            </div>
          )}

          {/* 9. REVISÃO */}
          {etapa === 9 && (
            <>
              {ETAPAS.filter((e) => e.n < 9).map((e) => {
                const itens = itensDaEtapa(e.n);
                if (itens.length === 0) return null;
                return (
                  <div key={e.n} className={card}>
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-sm font-bold">{e.n}. {e.titulo}</h2>
                      <button onClick={() => irPara(e.n)} className="text-xs text-[#B39DDB] font-bold">Editar</button>
                    </div>
                    <ul className="space-y-1.5">
                      {itens.map((i) => (
                        <li key={i.id} className="flex items-center gap-2 text-xs">
                          {i.ok ? <Check size={14} className="text-[#4CAF7D]" /> : i.obrigatorio ? <X size={14} className="text-[#E1306C]" /> : <Circle size={10} className="text-[#626274] mx-0.5" />}
                          <span className={i.ok ? 'text-white' : 'text-[#A0A0B2]'}>{i.label}</span>
                          {!i.ok && <span className={`text-[10px] ${i.obrigatorio ? 'text-[#FF8FB1]' : 'text-[#626274]'}`}>{i.obrigatorio ? 'obrigatório' : 'recomendado'}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              <div className={card}>
                <p className="text-sm font-bold">{completude}% completo</p>
                <p className="text-xs text-[#A0A0B2] mt-1 mb-4">
                  {faltamObrigatorios.length > 0
                    ? `Faltam ${faltamObrigatorios.length} item(ns) obrigatório(s) para enviar: ${faltamObrigatorios.map((i) => i.label.toLowerCase()).join(', ')}.`
                    : 'Tudo certo para enviar. Os itens recomendados podem ser completados depois e melhoram sua posição no app.'}
                </p>
                <button
                  onClick={enviarValidacao}
                  disabled={faltamObrigatorios.length > 0 || salvando || validacao.status === 'enviado'}
                  className="w-full bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  {validacao.status === 'enviado' ? 'Em análise pela equipe' : validacao.status === 'aprovado' ? 'Salvar atualizações' : 'Enviar para validação'}
                </button>
              </div>
            </>
          )}

          {/* Navegação */}
          <div className="flex justify-between gap-3 pt-2">
            <button
              onClick={() => irPara(Math.max(1, etapa - 1))}
              disabled={etapa === 1 || salvando}
              className="bg-[#161520] border border-[#232230] text-white text-xs font-bold px-4 py-3 rounded-xl disabled:opacity-30 flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            <button onClick={() => salvar().then((ok) => ok && setAviso('Salvo!'))} disabled={salvando} className="text-xs text-[#A0A0B2] hover:text-white">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            {etapa < 9 && (
              <button
                onClick={() => irPara(etapa + 1)}
                disabled={salvando || enviandoArquivo}
                className="bg-[#7E57C2] hover:bg-[#6A46B0] text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center gap-2"
              >
                Salvar e continuar <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
