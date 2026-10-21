'use client';
// Rodada 76 — aba "Denúncias" do /admin: fila de ocorrências registradas no
// app (migration 045). Mostra relato, provas (links temporários), histórico,
// permite mudar a situação, responder à pessoa, anotar internamente e
// imprimir um resumo para apoiar o Boletim de Ocorrência.
import { Loader2, Printer, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const STATUS: { v: string; rotulo: string; cor: string }[] = [
  { v: 'recebida', rotulo: 'Recebida', cor: '#6C8CFF' },
  { v: 'em_analise', rotulo: 'Em análise', cor: '#F5A524' },
  { v: 'aguardando_informacoes', rotulo: 'Aguardando informações', cor: '#E1306C' },
  { v: 'encaminhada', rotulo: 'Encaminhada', cor: '#9B7BFF' },
  { v: 'concluida', rotulo: 'Concluída', cor: '#3DD68C' },
  { v: 'arquivada', rotulo: 'Arquivada', cor: '#8A8AA0' },
];
const CATEGORIAS: Record<string, string> = {
  agressao_fisica: 'Agressão física',
  ameaca: 'Ameaça',
  injuria_discriminacao: 'Ofensa ou discriminação',
  discriminacao_local: 'Discriminação em local ou evento',
  assedio: 'Assédio',
  golpe_extorsao: 'Golpe ou extorsão',
  perseguicao_online: 'Perseguição ou ataque online',
  outro: 'Outro',
};
const LOCAL: Record<string, string> = {
  estabelecimento: 'Bar, festa, loja ou hotel',
  via_publica: 'Rua ou espaço público',
  online: 'Online / aplicativo',
  outro: 'Outro',
};

type Oc = {
  id: string;
  protocolo: string;
  reporter_id: string | null;
  categoria: string;
  risco_imediato: boolean;
  data_fato: string;
  hora_fato: string | null;
  local_tipo: string;
  local_nome: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  descricao: string;
  envolvidos: string | null;
  testemunhas: string | null;
  bo_situacao: string;
  bo_numero: string | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_whatsapp: string | null;
  contato_preferido: string;
  quer_orientacao: boolean;
  consentimento_em: string;
  status: string;
  encaminhamento: string | null;
  created_at: string;
};
type Anexo = { id: string; caminho: string; tipo: string; mime: string | null; url?: string };
type Evento = {
  id: string;
  autor_papel: string;
  acao: string;
  status_novo: string | null;
  texto: string | null;
  visivel_usuario: boolean;
  created_at: string;
};

const dh = (iso: string) => new Date(iso).toLocaleString('pt-BR');
const d = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export default function PainelOcorrencias() {
  const [lista, setLista] = useState<Oc[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<string>('abertas');
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<Oc | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [novoStatus, setNovoStatus] = useState('');
  const [encaminhamento, setEncaminhamento] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const carregarLista = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase.from('ocorrencias').select('*').order('created_at', { ascending: false }).limit(300);
    setLista((data as Oc[]) ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  const abrir = useCallback(async (o: Oc) => {
    setSel(o);
    setNovoStatus(o.status);
    setEncaminhamento(o.encaminhamento ?? '');
    setMensagem('');
    setNota('');
    setAviso(null);
    setAnexos([]);
    const [a, h] = await Promise.all([
      supabase.from('ocorrencia_anexos').select('id, caminho, tipo, mime').eq('ocorrencia_id', o.id).order('created_at'),
      supabase.from('ocorrencia_historico').select('*').eq('ocorrencia_id', o.id).order('created_at'),
    ]);
    setEventos((h.data as Evento[]) ?? []);
    const base = (a.data as Anexo[]) ?? [];
    const comUrl = await Promise.all(
      base.map(async (x) => {
        const { data } = await supabase.storage.from('ocorrencias').createSignedUrl(x.caminho, 3600);
        return { ...x, url: data?.signedUrl };
      })
    );
    setAnexos(comUrl);
  }, []);

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((o) => {
      if (filtro === 'abertas' && ['concluida', 'arquivada'].includes(o.status)) return false;
      if (filtro !== 'abertas' && filtro !== 'todas' && o.status !== filtro) return false;
      if (q && !(o.protocolo.toLowerCase().includes(q) || o.descricao.toLowerCase().includes(q) || (o.local_nome ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [lista, filtro, busca]);

  const novas = lista.filter((o) => o.status === 'recebida').length;

  async function recarregarSelecionada(id: string) {
    const { data } = await supabase.from('ocorrencias').select('*').eq('id', id).maybeSingle();
    if (data) await abrir(data as Oc);
    carregarLista();
  }

  async function salvarSituacao() {
    if (!sel) return;
    setSalvando(true);
    setAviso(null);
    const { error } = await supabase
      .from('ocorrencias')
      .update({ status: novoStatus, encaminhamento: encaminhamento.trim() || null })
      .eq('id', sel.id);
    setSalvando(false);
    if (error) return setAviso({ ok: false, texto: error.message });
    setAviso({ ok: true, texto: 'Situação atualizada e registrada no histórico.' });
    recarregarSelecionada(sel.id);
  }

  async function enviarMsg(tipo: 'mensagem_equipe' | 'nota_interna') {
    if (!sel) return;
    const texto = (tipo === 'mensagem_equipe' ? mensagem : nota).trim();
    if (!texto) return;
    setSalvando(true);
    setAviso(null);
    const { error } = await supabase.from('ocorrencia_historico').insert({
      ocorrencia_id: sel.id,
      autor_papel: 'equipe',
      acao: tipo,
      texto,
      visivel_usuario: tipo === 'mensagem_equipe',
    });
    setSalvando(false);
    if (error) return setAviso({ ok: false, texto: error.message });
    if (tipo === 'mensagem_equipe') setMensagem('');
    else setNota('');
    recarregarSelecionada(sel.id);
  }

  function imprimir() {
    if (!sel) return;
    const o = sel;
    const w = window.open('', '_blank');
    if (!w) return;
    const linhas: [string, string][] = [
      ['Protocolo', o.protocolo],
      ['Registrado em', dh(o.created_at)],
      ['Tipo', CATEGORIAS[o.categoria] ?? o.categoria],
      ['Data do fato', `${d(o.data_fato)}${o.hora_fato ? ` · ${o.hora_fato}` : ''}`],
      ['Local', `${LOCAL[o.local_tipo] ?? o.local_tipo}: ${[o.local_nome, o.endereco, [o.cidade, o.uf].filter(Boolean).join('/')].filter(Boolean).join(' — ') || 'não informado'}`],
      ['Relato', o.descricao],
      ['Envolvidos', o.envolvidos ?? '—'],
      ['Testemunhas', o.testemunhas ?? '—'],
      ['B.O.', o.bo_situacao === 'sim' ? `Já registrado: ${o.bo_numero ?? ''}` : o.bo_situacao === 'pretende' ? 'Pretende registrar' : 'Não registrado'],
      ['Provas anexadas no sistema', String(anexos.length)],
    ];
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Resumo ${esc(o.protocolo)}</title>
<style>body{font-family:Arial,sans-serif;max-width:760px;margin:32px auto;color:#111;line-height:1.5}h1{font-size:20px}small{color:#555}
table{width:100%;border-collapse:collapse;margin-top:16px}td{border:1px solid #ccc;padding:8px;vertical-align:top;font-size:14px;white-space:pre-wrap}td:first-child{width:170px;font-weight:bold;background:#f4f4f4}</style></head><body>
<h1>Resumo de ocorrência — ${esc(o.protocolo)}</h1>
<small>Gerado pelo Dicas LGBT+ em ${esc(new Date().toLocaleString('pt-BR'))}. Documento de apoio: não é um boletim de ocorrência oficial e não substitui o registro na Polícia Civil.</small>
<table>${linhas.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  }

  const campo = 'w-full bg-[#12121A] border border-[#232230] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#626274] focus:outline-none focus:border-[#E1306C]';
  const corDe = (s: string) => STATUS.find((x) => x.v === s)?.cor ?? '#8A8AA0';
  const rotDe = (s: string) => STATUS.find((x) => x.v === s)?.rotulo ?? s;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-4 flex flex-col gap-3 h-fit">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">Ocorrências</h3>
          {novas > 0 && <span className="text-[11px] font-bold bg-[#6C8CFF]/20 text-[#6C8CFF] rounded-full px-2 py-0.5">{novas} nova(s)</span>}
        </div>
        <input className={campo} placeholder="Buscar protocolo, local ou texto" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className={campo} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="abertas">Em aberto</option>
          <option value="todas">Todas</option>
          {STATUS.map((s) => <option key={s.v} value={s.v}>{s.rotulo}</option>)}
        </select>
        {carregando ? (
          <Loader2 className="animate-spin text-[#E1306C] mx-auto my-4" size={18} />
        ) : filtrada.length === 0 ? (
          <p className="text-xs text-[#626274]">Nenhuma ocorrência neste filtro.</p>
        ) : (
          <ul className="flex flex-col gap-2 max-h-[560px] overflow-y-auto">
            {filtrada.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => abrir(o)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${sel?.id === o.id ? 'border-[#E1306C] bg-[#E1306C]/10' : 'border-[#232230] hover:border-[#3a3950]'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <b className="text-sm">{o.protocolo}</b>
                    <span className="text-[10px] font-bold" style={{ color: corDe(o.status) }}>{rotDe(o.status)}</span>
                  </span>
                  <span className="block text-xs text-[#A0A0B2] mt-0.5">
                    {CATEGORIAS[o.categoria] ?? o.categoria} · fato em {d(o.data_fato)}
                    {o.risco_imediato && <b className="text-[#FF6B6B]"> · RISCO</b>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-6">
        {!sel ? (
          <p className="text-sm text-[#626274]">Selecione uma ocorrência para ver o relato, as provas e o histórico.</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{sel.protocolo}</h3>
                <p className="text-xs text-[#A0A0B2]">Registrada em {dh(sel.created_at)} · consentimento em {dh(sel.consentimento_em)}</p>
              </div>
              <button onClick={imprimir} className="flex items-center gap-2 text-xs font-bold border border-[#232230] rounded-lg px-3 py-2 hover:border-[#E1306C]">
                <Printer size={14} /> Imprimir resumo para B.O.
              </button>
            </div>

            {sel.risco_imediato && (
              <p className="text-sm bg-[#FF6B6B]/10 border border-[#FF6B6B]/40 text-[#FF9A9A] rounded-xl px-4 py-3">
                A pessoa informou que ainda existe risco. Priorize o contato e oriente sobre 190 e Disque 100.
              </p>
            )}

            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Campo t="Tipo" v={CATEGORIAS[sel.categoria] ?? sel.categoria} />
              <Campo t="Data do fato" v={`${d(sel.data_fato)}${sel.hora_fato ? ` · ${sel.hora_fato}` : ''}`} />
              <Campo t="Local" v={`${LOCAL[sel.local_tipo] ?? sel.local_tipo}: ${[sel.local_nome, sel.endereco, [sel.cidade, sel.uf].filter(Boolean).join('/')].filter(Boolean).join(' — ') || 'não informado'}`} />
              <Campo t="B.O." v={sel.bo_situacao === 'sim' ? `Já registrado: ${sel.bo_numero}` : sel.bo_situacao === 'pretende' ? 'Pretende registrar' : 'Não registrado'} />
              <Campo t="Contato preferido" v={sel.contato_preferido === 'app' ? 'Pelo app' : sel.contato_preferido === 'whatsapp' ? 'WhatsApp' : 'E-mail'} />
              <Campo t="Contato informado" v={[sel.contato_nome, sel.contato_whatsapp, sel.contato_email].filter(Boolean).join(' · ') || 'nenhum (usar o app)'} />
              <Campo t="Quer orientação" v={sel.quer_orientacao ? 'Sim (B.O., apoio jurídico/psicológico)' : 'Não'} />
            </dl>
            <Bloco t="Relato" v={sel.descricao} />
            {sel.envolvidos && <Bloco t="Envolvidos" v={sel.envolvidos} />}
            {sel.testemunhas && <Bloco t="Testemunhas" v={sel.testemunhas} />}

            <div>
              <p className="text-xs font-bold text-[#A0A0B2] mb-2">Provas ({anexos.length})</p>
              {anexos.length === 0 ? (
                <p className="text-xs text-[#626274]">Nenhum arquivo anexado.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {anexos.map((a) => (
                    <div key={a.id} className="border border-[#232230] rounded-xl overflow-hidden bg-[#12121A]">
                      {!a.url ? (
                        <p className="text-[11px] text-[#626274] p-3">Arquivo indisponível.</p>
                      ) : a.tipo === 'video' ? (
                        <video src={a.url} controls className="w-full max-h-48" />
                      ) : /heic|heif/.test(a.mime ?? '') ? (
                        <a href={a.url} target="_blank" rel="noreferrer" className="block text-xs text-[#E1306C] p-3 underline">Baixar foto (HEIC)</a>
                      ) : (
                        <a href={a.url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.url} alt="Prova anexada" className="w-full h-40 object-cover" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-[#626274] mt-2">Os links dos arquivos expiram em 1 hora. Não compartilhe fora da equipe.</p>
            </div>

            <div className="border-t border-[#232230] pt-4 grid gap-3">
              <p className="text-xs font-bold text-[#A0A0B2]">Atendimento</p>
              <select className={campo} value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
                {STATUS.map((s) => <option key={s.v} value={s.v}>{s.rotulo}</option>)}
              </select>
              <textarea className={`${campo} h-20`} placeholder="Encaminhamento (visível para a pessoa): ex. orientada a registrar B.O. na DECRADI" maxLength={1000} value={encaminhamento} onChange={(e) => setEncaminhamento(e.target.value)} />
              <button onClick={salvarSituacao} disabled={salvando} className="self-start bg-[#E1306C] rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50">
                Salvar situação
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <p className="text-xs font-bold text-[#A0A0B2]">Responder à pessoa (aparece no app dela)</p>
                <textarea className={`${campo} h-24`} maxLength={3000} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
                <button onClick={() => enviarMsg('mensagem_equipe')} disabled={salvando || !mensagem.trim()} className="self-start flex items-center gap-2 bg-[#E1306C] rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50">
                  <Send size={14} /> Enviar resposta
                </button>
              </div>
              <div className="grid gap-2">
                <p className="text-xs font-bold text-[#A0A0B2]">Nota interna (só a equipe vê)</p>
                <textarea className={`${campo} h-24`} maxLength={3000} value={nota} onChange={(e) => setNota(e.target.value)} />
                <button onClick={() => enviarMsg('nota_interna')} disabled={salvando || !nota.trim()} className="self-start border border-[#232230] rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50">
                  Salvar nota
                </button>
              </div>
            </div>

            {aviso && <p role="alert" className={`text-sm ${aviso.ok ? 'text-[#4CAF7D]' : 'text-red-400'}`}>{aviso.texto}</p>}

            <div className="border-t border-[#232230] pt-4">
              <p className="text-xs font-bold text-[#A0A0B2] mb-3">Histórico (não pode ser editado)</p>
              <ul className="flex flex-col gap-2">
                {eventos.map((e) => (
                  <li key={e.id} className={`rounded-xl border px-3 py-2 text-sm ${e.acao === 'nota_interna' ? 'border-[#F5A524]/40 bg-[#F5A524]/5' : 'border-[#232230]'}`}>
                    <span className="block text-[11px] text-[#A0A0B2]">
                      {e.autor_papel === 'usuario' ? 'Pessoa' : e.autor_papel === 'equipe' ? 'Equipe' : 'Sistema'}
                      {e.acao === 'nota_interna' ? ' · nota interna' : ''} · {dh(e.created_at)}
                    </span>
                    {e.acao === 'status' && e.status_novo && <span className="block">Situação: {rotDe(e.status_novo)}</span>}
                    {e.texto && <span className="block whitespace-pre-wrap">{e.texto}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold text-[#A0A0B2] uppercase">{t}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Bloco({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-[#A0A0B2] uppercase mb-1">{t}</p>
      <p className="text-sm whitespace-pre-wrap bg-[#12121A] border border-[#232230] rounded-xl px-4 py-3">{v}</p>
    </div>
  );
}
