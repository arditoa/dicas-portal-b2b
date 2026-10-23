'use client';
// Rodada 87 — oferta do bloco "Destaques" da Home (1 parceiro pago por hora).
// O app escolhe o parceiro sozinho; aqui a Andrea define a OFERTA (texto curto
// + validade + botão). Sem oferta válida, o parceiro aparece sem texto de oferta.
// Tabela: destaque_hora_ofertas (migration 047).
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { pagaPlanoComDireitoADestaque } from '../lib/destaque';

type LocalOpcao = { id: string; nome: string; plano_destaque: string; plano_comercial: string | null; plano_comercial_status: string | null; destaque_secoes: string[] | null; destaque_ate: string | null };
type Oferta = { local_id: string; oferta: string; oferta_ate: string; botao: string; ativo: boolean };

const BOTOES: { v: string; r: string }[] = [
  { v: 'ver_local', r: 'Ver local' },
  { v: 'como_chegar', r: 'Como chegar' },
  { v: 'ver_beneficio', r: 'Ver benefício' },
  { v: 'garantir', r: 'Garantir (só com cupom ou lista VIP real no local)' },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function PainelDestaqueHora() {
  const [locais, setLocais] = useState<LocalOpcao[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [localId, setLocalId] = useState('');
  const [texto, setTexto] = useState('');
  const [ate, setAte] = useState('');
  const [botao, setBotao] = useState('ver_local');

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [l, o] = await Promise.all([
      supabase.from('locais').select('id, nome, plano_destaque, plano_comercial, plano_comercial_status, destaque_secoes, destaque_ate').eq('status', 'aprovado').order('nome').limit(500),
      supabase.from('destaque_hora_ofertas').select('local_id, oferta, oferta_ate, botao, ativo').order('oferta_ate', { ascending: false }),
    ]);
    if (l.data) setLocais((l.data as LocalOpcao[]).filter((x) => pagaPlanoComDireitoADestaque(x as any)));
    if (o.error) setErro('Tabela de ofertas indisponível (rode a migration 047 no Supabase).');
    else { setErro(null); setOfertas((o.data as Oferta[]) || []); }
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeDe = (id: string) => locais.find((x) => x.id === id)?.nome || id.slice(0, 8);

  async function salvar() {
    if (!localId || texto.trim().length < 3 || !ate) { setErro('Escolha o parceiro, escreva a oferta (3 a 80 letras) e a validade.'); return; }
    if (new Date(ate).getTime() <= Date.now()) { setErro('A validade precisa ser no futuro.'); return; }
    setSalvando(true); setErro(null);
    const { error } = await supabase.from('destaque_hora_ofertas').upsert(
      { local_id: localId, oferta: texto.trim(), oferta_ate: new Date(ate).toISOString(), botao, ativo: true },
      { onConflict: 'local_id' }
    );
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    setTexto(''); setAte(''); setLocalId(''); setBotao('ver_local');
    carregar();
  }

  async function encerrar(id: string) {
    const { error } = await supabase.from('destaque_hora_ofertas').delete().eq('local_id', id);
    if (error) setErro(error.message); else carregar();
  }

  return (
    <section className="mt-10 mb-10">
      <h2 className="text-base font-bold mb-1">⚡ Oferta do bloco &quot;Destaques&quot; (Home)</h2>
      <p className="text-xs text-[#626274] mb-3">
        O app mostra 1 parceiro pago por hora. Quem tem oferta válida entra primeiro no rodízio. A oferta some sozinha na validade.
        Não prometa preço ou desconto que o parceiro não confirmou.
      </p>
      {carregando ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#A0A0B2]" />
      ) : (
        <div className="bg-[#161520] border border-[#232230] rounded-xl p-4 space-y-3 text-sm">
          <select value={localId} onChange={(e) => setLocalId(e.target.value)} className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg px-3 py-2">
            <option value="">Parceiro (plano pago ativo)…</option>
            {locais.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
          <input value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 80))} placeholder="Oferta (ex.: Drink de boas-vindas para quem mostrar o app)" className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg px-3 py-2" />
          <div className="flex gap-3 flex-wrap">
            <label className="text-xs text-[#A0A0B2]">Válida até
              <input type="datetime-local" value={ate} onChange={(e) => setAte(e.target.value)} className="block mt-1 bg-[#0B0B0E] border border-[#232230] rounded-lg px-3 py-2 text-white [color-scheme:dark]" />
            </label>
            <label className="text-xs text-[#A0A0B2] flex-1 min-w-[200px]">Botão
              <select value={botao} onChange={(e) => setBotao(e.target.value)} className="block w-full mt-1 bg-[#0B0B0E] border border-[#232230] rounded-lg px-3 py-2 text-white">
                {BOTOES.map((b) => <option key={b.v} value={b.v}>{b.r}</option>)}
              </select>
            </label>
          </div>
          {erro && <p className="text-xs text-red-400">{erro}</p>}
          <button type="button" onClick={salvar} disabled={salvando} className="font-bold px-4 py-2 rounded-lg bg-[#E1306C] text-white disabled:opacity-50">
            {salvando ? 'Salvando…' : 'Salvar oferta'}
          </button>
          {ofertas.length > 0 && (
            <ul className="divide-y divide-[#232230] border-t border-[#232230] pt-2">
              {ofertas.map((o) => {
                const vencida = new Date(o.oferta_ate).getTime() <= Date.now();
                return (
                  <li key={o.local_id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{nomeDe(o.local_id)}</p>
                      <p className="text-xs text-[#A0A0B2]">{o.oferta}</p>
                      <p className={`text-[11px] ${vencida ? 'text-red-400' : 'text-[#4CAF7D]'}`}>{vencida ? 'Vencida em ' : 'Ativa até '}{fmt(o.oferta_ate)}</p>
                    </div>
                    <button type="button" onClick={() => encerrar(o.local_id)} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border border-[#232230] text-[#A0A0B2] hover:bg-[#1D1C29]">Encerrar</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
