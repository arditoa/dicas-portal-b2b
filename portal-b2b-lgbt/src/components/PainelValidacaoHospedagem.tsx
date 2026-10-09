'use client';
// Rodada 64 — validação das hospedagens pela equipe (/admin, aba Aprovações).
// Lista as hospedagens enviadas para validação com o que foi declarado
// (Cadastur, compromissos, comprovante, completude) e o checklist interno da
// equipe. Aprovar concede o selo "Verificado pelo Dicas" (trigger da
// migration 037); "Pedir ajustes" devolve com observação para o parceiro.
// Se as tabelas ainda não existirem, o painel não aparece.
import { BadgeCheck, Check, ExternalLink, FileText, Hotel, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CHECKLIST_EQUIPE_HOSPEDAGEM, COMPROMISSOS_ACOLHIMENTO, rotuloTag } from '../lib/taxonomia';

type Linha = {
  local_id: string;
  status: string;
  compromissos: string[];
  comprovante_path: string | null;
  termo_aceito_em: string | null;
  enviado_em: string | null;
  checklist_equipe: string[];
  observacao_equipe: string | null;
  locais: { nome: string; cidade: string | null; cnpj: string | null; tipo_hospedagem: string | null; contato_telefone: string | null } | null;
  perfil?: { cadastur_numero: string | null; cadastur_validade: string | null; completude: number } | null;
};

const ROTULO_STATUS: Record<string, string> = { enviado: 'Aguardando', ajustes: 'Ajustes pedidos', aprovado: 'Verificada', rascunho: 'Rascunho' };

export default function PainelValidacaoHospedagem() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [filtro, setFiltro] = useState<'enviado' | 'todos'>('enviado');
  const [obs, setObs] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    let q = supabase
      .from('hospedagem_validacao')
      .select('local_id, status, compromissos, comprovante_path, termo_aceito_em, enviado_em, checklist_equipe, observacao_equipe, locais(nome, cidade, cnpj, tipo_hospedagem, contato_telefone)')
      .order('enviado_em', { ascending: true, nullsFirst: false });
    q = filtro === 'enviado' ? q.eq('status', 'enviado') : q.neq('status', 'rascunho');
    const { data, error } = await q;
    if (error) {
      setLinhas(null);
      return;
    }
    const base = (data as unknown as Linha[]) || [];
    const ids = base.map((l) => l.local_id);
    if (ids.length) {
      const { data: perfis } = await supabase.from('hospedagem_perfil').select('local_id, cadastur_numero, cadastur_validade, completude').in('local_id', ids);
      const mapa = Object.fromEntries(((perfis as { local_id: string }[]) || []).map((p) => [p.local_id, p]));
      base.forEach((l) => (l.perfil = (mapa[l.local_id] as unknown as Linha["perfil"]) || null));
    }
    setLinhas(base);
  }, [filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alternarItem = async (l: Linha, item: string) => {
    const novo = l.checklist_equipe.includes(item) ? l.checklist_equipe.filter((x) => x !== item) : [...l.checklist_equipe, item];
    setLinhas((ls) => ls && ls.map((x) => (x.local_id === l.local_id ? { ...x, checklist_equipe: novo } : x)));
    await supabase.from('hospedagem_validacao').update({ checklist_equipe: novo }).eq('local_id', l.local_id);
  };

  const abrirComprovante = async (path: string) => {
    const { data } = await supabase.storage.from('documentos-hospedagem').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const decidir = async (l: Linha, status: 'aprovado' | 'ajustes' | 'enviado') => {
    const texto = (obs[l.local_id] ?? l.observacao_equipe ?? '').trim();
    if (status === 'ajustes' && !texto) {
      alert('Escreva o que precisa ser ajustado — o parceiro vê essa mensagem no portal.');
      return;
    }
    if (status === 'aprovado' && l.checklist_equipe.length < CHECKLIST_EQUIPE_HOSPEDAGEM.length) {
      if (!confirm('Nem todos os itens do checklist da equipe estão marcados. Aprovar mesmo assim?')) return;
    }
    setSalvando(l.local_id);
    await supabase.from('hospedagem_validacao').update({ status, observacao_equipe: texto || null }).eq('local_id', l.local_id);
    setSalvando(null);
    carregar();
  };

  if (linhas === null) return null;
  if (filtro === 'enviado' && linhas.length === 0) {
    return (
      <div className="mb-6 text-xs text-[#626274] flex items-center gap-2">
        <Hotel size={14} /> Nenhuma hospedagem aguardando validação.
        <button onClick={() => setFiltro('todos')} className="text-[#B39DDB] font-bold">Ver todas</button>
      </div>
    );
  }

  return (
    <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5 mb-8">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Hotel size={14} className="text-[#E1306C]" /> Hospedagens para validar ({linhas.length})
        </h2>
        <div className="flex gap-2">
          {(['enviado', 'todos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-[11px] px-3 py-1 rounded-full border ${filtro === f ? 'bg-[#7E57C2] border-[#7E57C2]' : 'border-[#232230] text-[#A0A0B2]'}`}
            >
              {f === 'enviado' ? 'Aguardando' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {linhas.map((l) => {
          const cad = l.perfil?.cadastur_numero;
          const vencido = l.perfil?.cadastur_validade && new Date(l.perfil.cadastur_validade) < new Date();
          return (
            <div key={l.local_id} className="border border-[#232230] rounded-xl p-4">
              <div className="flex justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-bold">
                    {l.locais?.nome}{' '}
                    <span className="text-[11px] font-normal text-[#A0A0B2]">
                      · {l.locais?.tipo_hospedagem ? rotuloTag(l.locais.tipo_hospedagem) : 'Hospedagem'} · {l.locais?.cidade}
                    </span>
                  </p>
                  <p className="text-[11px] text-[#A0A0B2] mt-1">
                    {ROTULO_STATUS[l.status] || l.status}
                    {l.enviado_em ? ` · enviado em ${new Date(l.enviado_em).toLocaleDateString('pt-BR')}` : ''} · cadastro {l.perfil?.completude ?? 0}% completo
                  </p>
                </div>
                <div className="text-right text-[11px]">
                  <p>
                    Cadastur: <b>{cad || '—'}</b>
                    {vencido && <span className="text-red-400"> (vencido)</span>}
                  </p>
                  <p>CNPJ: {l.locais?.cnpj || '—'}</p>
                  <a href="https://cadastur.turismo.gov.br/cadastur/#!/public/qualquer-pessoa/consulta" target="_blank" rel="noreferrer" className="text-[#B39DDB] inline-flex items-center gap-1">
                    Consultar Cadastur <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-[11px] font-bold text-[#A0A0B2] uppercase mb-2">Declarado pela hospedagem</p>
                  <ul className="space-y-1 text-xs">
                    {COMPROMISSOS_ACOLHIMENTO.map((c) => (
                      <li key={c.id} className={`flex gap-2 ${l.compromissos.includes(c.id) ? 'text-white' : 'text-[#626274] line-through'}`}>
                        {l.compromissos.includes(c.id) ? <Check size={13} className="text-[#4CAF7D] shrink-0" /> : <X size={13} className="shrink-0" />} {c.label}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2">
                    Termo: {l.termo_aceito_em ? `aceito em ${new Date(l.termo_aceito_em).toLocaleDateString('pt-BR')}` : <span className="text-red-400">não aceito</span>}
                  </p>
                  {l.comprovante_path ? (
                    <button onClick={() => abrirComprovante(l.comprovante_path!)} className="text-xs text-[#B39DDB] font-bold mt-1 inline-flex items-center gap-1">
                      <FileText size={12} /> Abrir comprovante
                    </button>
                  ) : (
                    <p className="text-xs text-[#626274] mt-1">Sem comprovante</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#A0A0B2] uppercase mb-2">Checklist da equipe</p>
                  <div className="space-y-1">
                    {CHECKLIST_EQUIPE_HOSPEDAGEM.map((c) => {
                      const on = l.checklist_equipe.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => alternarItem(l, c.id)} className="w-full text-left flex gap-2 items-start text-xs">
                          <span className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-[#4CAF7D] border-[#4CAF7D] text-black' : 'border-[#3A3850]'}`}>
                            {on && <Check size={10} />}
                          </span>
                          <span className={on ? 'text-white' : 'text-[#A0A0B2]'}>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <textarea
                value={obs[l.local_id] ?? l.observacao_equipe ?? ''}
                onChange={(e) => setObs({ ...obs, [l.local_id]: e.target.value })}
                rows={2}
                placeholder="Observação para o parceiro (obrigatória ao pedir ajustes)"
                className="w-full mt-4 bg-[#0B0B0E] border border-[#232230] rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-[#E1306C]"
              />
              <div className="flex gap-2 mt-3 flex-wrap">
                {l.status !== 'aprovado' && (
                  <button disabled={salvando === l.local_id} onClick={() => decidir(l, 'aprovado')} className="bg-[#4CAF7D] text-black text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
                    <BadgeCheck size={13} /> Aprovar e conceder selo
                  </button>
                )}
                <button disabled={salvando === l.local_id} onClick={() => decidir(l, 'ajustes')} className="bg-red-500/10 text-red-300 border border-red-500/30 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
                  <X size={13} /> {l.status === 'aprovado' ? 'Retirar selo e pedir ajustes' : 'Pedir ajustes'}
                </button>
                {l.status === 'ajustes' && (
                  <button disabled={salvando === l.local_id} onClick={() => decidir(l, 'enviado')} className="bg-[#232230] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
                    <RotateCcw size={13} /> Voltar para análise
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
