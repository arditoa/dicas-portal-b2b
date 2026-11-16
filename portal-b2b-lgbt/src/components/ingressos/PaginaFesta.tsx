'use client';
// Página pública da festa: flyer, dados, lotes e compra (mesmas regras do app: nominal, até 10 por compra,
// reserva de 15 min, meia-entrada, cupom, taxa mostrada antes de pagar). Pix aparece aqui mesmo; cartão abre o Mercado Pago.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import {
  comprar, conferirCupom, Cupom, custoPagamento, IngressosDaFesta, ingressosDaFesta, ItemCompra, LoteVenda, Pix, precoItem, quandoFesta, reais, statusDoPedido, taxaItem,
} from '../../lib/ingressosWeb';
import ContaComprador from './ContaComprador';

type Festa = { id: string; titulo: string; descricao: string | null; data_inicio: string; data_fim: string | null; foto_capa_url: string | null;
  locais: { nome: string; endereco: string | null; bairro: string | null; cidade: string | null } | null };
type Item = ItemCompra & { chave: number };
const MAX = 10;
let seq = 1;

export default function PaginaFesta({ id }: { id: string }) {
  const [festa, setFesta] = useState<Festa | null | undefined>(undefined);
  const [ing, setIng] = useState<IngressosDaFesta | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [cupomTxt, setCupomTxt] = useState('');
  const [cupom, setCupom] = useState<Cupom | null>(null);
  const [cupomErro, setCupomErro] = useState('');
  const [forma, setForma] = useState<'pix' | 'cartao'>('pix');
  const [comprando, setComprando] = useState(false);
  const [erro, setErro] = useState('');
  const [pix, setPix] = useState<Pix | null>(null);
  const [pago, setPago] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const nomeConta = (u: User | null) => (u?.user_metadata?.social_name || u?.user_metadata?.full_name || '') as string;

  const carregar = useCallback(async () => {
    const [{ data }, i] = await Promise.all([
      supabase.from('eventos').select('id, titulo, descricao, data_inicio, data_fim, foto_capa_url, locais(nome, endereco, bairro, cidade)').eq('id', id).eq('status', 'aprovado').maybeSingle(),
      ingressosDaFesta(id),
    ]);
    setFesta((data as unknown as Festa) || null);
    setIng(i);
  }, [id]);

  useEffect(() => {
    void carregar();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [carregar]);

  // Pix: confere a cada 4 s se o pagamento caiu
  useEffect(() => {
    if (!pix || pago) return;
    const t = setInterval(async () => { if ((await statusDoPedido(pix.pedido_id)) === 'pago') { setPago(true); clearInterval(t); } }, 4000);
    return () => clearInterval(t);
  }, [pix, pago]);

  const lotes = ing?.lotes || [];
  const loteDe = (lid: string) => lotes.find((l) => l.id === lid);
  const add = (l: LoteVenda) => {
    if (itens.length >= MAX) return;
    setItens([...itens, { chave: seq++, lote_id: l.id, meia: false, titular: itens.length === 0 ? nomeConta(user) : '' }]);
  };
  const tirar = (lid: string) => { const i = [...itens].reverse().findIndex((x) => x.lote_id === lid); if (i >= 0) setItens(itens.filter((_, k) => k !== itens.length - 1 - i)); };
  const mudar = (chave: number, p: Partial<Item>) => setItens(itens.map((x) => (x.chave === chave ? { ...x, ...p } : x)));

  const conta = useMemo(() => {
    const pct = ing?.taxa_pct ?? 5;
    let bruto = 0;
    const precos: number[] = [];
    for (const it of itens) { const l = loteDe(it.lote_id); if (!l) continue; const p = precoItem(l, it.meia); precos.push(p); bruto += p; }
    const desconto = cupom ? Math.min(bruto, cupom.tipo === 'pct' ? Math.round(bruto * cupom.valor / 100) : cupom.valor) : 0;
    // igual ao banco: desconto dividido entre os ingressos, taxa sobre o preço com desconto
    const finais = precos.map((p) => (bruto ? Math.max(p - Math.round((desconto * p) / bruto), 0) : p));
    const sub = finais.reduce((a, b) => a + b, 0);
    const taxaDicas = finais.reduce((s, p) => s + taxaItem(p, pct, ing?.taxa_min_centavos ?? 100), 0);
    const info = { taxa_paga_por: ing?.taxa_paga_por || 'comprador', custo_pix_pct: ing?.custo_pix_pct, custo_cartao_pct: ing?.custo_cartao_pct };
    const servico = info.taxa_paga_por === 'casa' ? 0 : taxaDicas + custoPagamento(sub, taxaDicas, forma, info);
    return { subtotal: bruto, desconto, taxa: servico, total: sub + servico };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, cupom, ing, forma]);

  const aplicarCupom = async () => {
    setCupomErro('');
    const c = await conferirCupom(id, cupomTxt);
    if (c) setCupom(c); else { setCupom(null); setCupomErro('Cupom inválido, esgotado ou desligado.'); }
  };

  const pagar = async () => {
    setErro('');
    if (!itens.length) return setErro('Escolha pelo menos um ingresso.');
    const semNome = itens.find((i) => i.titular.trim().length < 2);
    if (semNome) return setErro('Escreva o nome de quem vai usar cada ingresso (o ingresso é nominal).');
    setComprando(true);
    try {
      const r = await comprar(id, itens.map(({ lote_id, titular, meia }) => ({ lote_id, titular: titular.trim(), meia })), conta.total > 0 ? forma : 'pix', cupom?.codigo);
      if (r.tipo === 'gratis') { setPago(true); }
      else if (r.tipo === 'pix') { setPix(r); }
      else { window.location.href = r.url; }
    } catch (e) {
      setErro((e as Error).message);
      void carregar();
    } finally { setComprando(false); }
  };

  if (festa === undefined) return <Moldura><p className="text-[#A0A0B2]">Carregando…</p></Moldura>;
  if (festa === null) return <Moldura><h1 className="text-xl font-black">Festa não encontrada</h1><p className="text-[#A0A0B2] mt-2">Ela pode ter sido cancelada ou ainda não foi aprovada.</p></Moldura>;

  const passou = new Date(festa.data_fim || new Date(festa.data_inicio).getTime() + 8 * 36e5).getTime() < Date.now();
  const vendendo = !!ing?.ativos && !passou && lotes.length > 0;

  return (
    <Moldura>
      {festa.foto_capa_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={festa.foto_capa_url} alt={`Flyer de ${festa.titulo}`} className="w-full rounded-2xl mb-5 bg-[#161520] object-contain max-h-[560px]" />
      )}
      <h1 className="text-2xl font-black leading-tight">{festa.titulo}</h1>
      <p className="text-[#F9A8D4] font-bold mt-2 capitalize">{quandoFesta(festa.data_inicio)}</p>
      {festa.locais && (
        <p className="text-[#A0A0B2] text-sm mt-1">
          {festa.locais.nome}{festa.locais.endereco ? ` · ${festa.locais.endereco}` : ''}{festa.locais.cidade ? ` · ${festa.locais.cidade}` : ''}
          {festa.locais.endereco && <> · <a className="underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(`${festa.locais.nome} ${festa.locais.endereco} ${festa.locais.cidade || ''}`)}`}>Ver no mapa</a></>}
        </p>
      )}
      {!!festa.descricao && <p className="text-[#D6D3E0] text-sm mt-4 whitespace-pre-line leading-relaxed">{festa.descricao}</p>}

      <h2 className="text-lg font-black mt-8 mb-3">Ingressos</h2>
      {pago ? (
        <Caixa><p className="text-emerald-300 font-bold text-lg">Pronto! Ingresso garantido 🎉</p>
          <p className="text-[#A0A0B2] text-sm mt-1">Seu QR já está em Meus ingressos, aqui no site e no app Dicas LGBT+. Mostre na porta.</p>
          <a href="/meus-ingressos" className="inline-block mt-4 bg-[#E1306C] text-white font-bold px-5 py-3 rounded-xl">Ver meus ingressos</a></Caixa>
      ) : pix ? (
        <Caixa>
          <p className="font-bold">Pague {reais(pix.total_centavos)} com Pix</p>
          <p className="text-[#A0A0B2] text-xs mt-1">Abra o app do seu banco e leia o QR, ou copie o código. Confirmamos sozinhos aqui. Vale até {new Date(pix.vence_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${pix.qr_base64}`} alt="QR do Pix" className="w-56 h-56 mx-auto my-4 bg-white rounded-xl p-2" />
          <button onClick={async () => { await navigator.clipboard.writeText(pix.copia_e_cola); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }}
            className="w-full border border-[#2A2840] rounded-xl py-3 text-sm font-bold">{copiado ? 'Código copiado ✓' : 'Copiar código Pix'}</button>
          <p className="text-[#A0A0B2] text-xs mt-3 text-center">Aguardando o pagamento…</p>
        </Caixa>
      ) : !vendendo ? (
        <Caixa><p className="text-[#A0A0B2] text-sm">{passou ? 'Esta festa já aconteceu.' : 'A venda de ingressos desta festa não está aberta pelo app. Fale com a casa.'}</p></Caixa>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {lotes.map((l) => {
              const n = itens.filter((i) => i.lote_id === l.id).length;
              const pode = l.disponivel && !l.encerrado && !l.em_breve && !l.bloqueado_virada;
              return (
                <Caixa key={l.id}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-bold">{l.nome}{l.ultimos && pode ? <span className="ml-2 text-xs text-amber-300">Últimos!</span> : null}</p>
                      <p className="text-sm text-[#A0A0B2]">
                        {l.preco_centavos === 0 ? 'Grátis' : reais(l.preco_centavos)}{l.permite_meia && l.preco_centavos > 0 ? ` · meia ${reais(Math.floor(l.preco_centavos / 2))}` : ''}
                        {!pode && (l.encerrado || !l.disponivel ? ' · Esgotado' : l.abre_em ? ` · Abre ${new Date(l.abre_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : ' · Abre quando o lote anterior acabar')}
                      </p>
                    </div>
                    {pode && (
                      <div className="flex items-center gap-3">
                        <button aria-label={`Menos ${l.nome}`} onClick={() => tirar(l.id)} disabled={!n} className="w-9 h-9 rounded-full border border-[#2A2840] disabled:opacity-30 text-lg">−</button>
                        <span className="w-4 text-center font-bold">{n}</span>
                        <button aria-label={`Mais ${l.nome}`} onClick={() => add(l)} disabled={itens.length >= MAX} className="w-9 h-9 rounded-full bg-[#E1306C] disabled:opacity-30 text-lg">+</button>
                      </div>
                    )}
                  </div>
                </Caixa>
              );
            })}
          </div>

          {itens.length > 0 && (
            <div className="mt-6 flex flex-col gap-4">
              <Caixa>
                <p className="font-bold mb-1">Quem vai usar cada ingresso</p>
                <p className="text-[#A0A0B2] text-xs mb-3">O ingresso é nominal. A porta confere o nome.</p>
                {itens.map((it, k) => {
                  const l = loteDe(it.lote_id)!;
                  return (
                    <div key={it.chave} className="flex flex-col sm:flex-row gap-2 mb-3">
                      <input value={it.titular} onChange={(e) => mudar(it.chave, { titular: e.target.value })} placeholder={`Nome no ingresso ${k + 1} (${l.nome})`} maxLength={80}
                        className="flex-1 bg-[#0B0B0E] border border-[#2A2840] rounded-xl py-3 px-4 text-sm" />
                      {l.permite_meia && l.preco_centavos > 0 && (
                        <label className="flex items-center gap-2 text-xs text-[#A0A0B2] px-1">
                          <input type="checkbox" checked={it.meia} onChange={(e) => mudar(it.chave, { meia: e.target.checked })} /> Meia-entrada
                        </label>
                      )}
                    </div>
                  );
                })}
                {itens.some((i) => i.meia) && <p className="text-[#A0A0B2] text-xs">Meia-entrada: leve o documento que dá direito (estudante, PcD, jovem de baixa renda, idoso). A porta pode pedir.</p>}
              </Caixa>

              {ing?.tem_cupom && (
                <Caixa>
                  <div className="flex gap-2">
                    <input value={cupomTxt} onChange={(e) => setCupomTxt(e.target.value.toUpperCase())} placeholder="Cupom de desconto" className="flex-1 bg-[#0B0B0E] border border-[#2A2840] rounded-xl py-3 px-4 text-sm uppercase" />
                    <button onClick={aplicarCupom} disabled={!cupomTxt.trim()} className="border border-[#2A2840] rounded-xl px-4 text-sm font-bold disabled:opacity-40">Aplicar</button>
                  </div>
                  {cupom && <p className="text-emerald-300 text-xs mt-2">Cupom {cupom.codigo} aplicado.</p>}
                  {cupomErro && <p className="text-red-300 text-xs mt-2">{cupomErro}</p>}
                </Caixa>
              )}

              <Caixa>
                <Linha r="Ingressos" v={reais(conta.subtotal)} />
                {conta.desconto > 0 && <Linha r="Desconto" v={`− ${reais(conta.desconto)}`} />}
                {conta.taxa > 0 && <Linha r={`Taxa de serviço (${forma === 'pix' ? 'Pix' : 'cartão'})`} v={reais(conta.taxa)} />}
                <div className="border-t border-[#232230] my-2" />
                <Linha r="Total" v={reais(conta.total)} forte />
                <p className="text-[#626274] text-xs mt-2">Desistiu? Reembolso total, taxa incluída, até 7 dias depois da compra e até 48h antes da festa.</p>
              </Caixa>

              {!user ? (
                <ContaComprador aoEntrar={() => supabase.auth.getUser().then(({ data }) => {
                  setUser(data.user);
                  if (data.user && itens[0] && !itens[0].titular) mudar(itens[0].chave, { titular: nomeConta(data.user) });
                })} />
              ) : (
                <>
                  {conta.total > 0 && (
                    <div className="flex gap-2">
                      {(['pix', 'cartao'] as const).map((f) => (
                        <button key={f} onClick={() => setForma(f)} className={`flex-1 py-3 rounded-xl text-sm font-bold ${forma === f ? 'bg-white text-black' : 'border border-[#2A2840]'}`}>
                          {f === 'pix' ? 'Pix' : 'Cartão'}
                        </button>
                      ))}
                    </div>
                  )}
                  {erro && <div className="text-xs p-3 rounded-xl border bg-red-500/10 border-red-500/20 text-red-300">{erro}</div>}
                  <button onClick={pagar} disabled={comprando} className="bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base">
                    {comprando ? 'Reservando…' : conta.total === 0 ? 'Garantir meu ingresso' : forma === 'pix' ? `Pagar ${reais(conta.total)} com Pix` : `Pagar ${reais(conta.total)} com cartão`}
                  </button>
                  <p className="text-[#626274] text-xs text-center">Comprando como {nomeConta(user) || user.email} · <button className="underline" onClick={() => supabase.auth.signOut()}>trocar conta</button></p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Moldura>
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      <div className="max-w-xl mx-auto px-5 py-8">
        <p className="text-xs font-black tracking-[0.2em] text-[#E1306C] mb-6">DICAS LGBT+</p>
        {children}
        <p className="text-[#626274] text-xs mt-10 text-center">Pagamento pelo Mercado Pago. O dinheiro vai direto para a casa. <a href="/meus-ingressos" className="underline">Meus ingressos</a></p>
      </div>
    </main>
  );
}
const Caixa = ({ children }: { children: React.ReactNode }) => <div className="bg-[#161520] border border-[#232230] rounded-2xl p-4">{children}</div>;
const Linha = ({ r, v, forte }: { r: string; v: string; forte?: boolean }) => (
  <div className={`flex justify-between text-sm ${forte ? 'font-black text-base' : 'text-[#D6D3E0]'}`}><span>{r}</span><span>{v}</span></div>
);
