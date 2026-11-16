'use client';
// Meus ingressos pelo site: o QR que a porta lê (mesmo do app: "dicasingresso:<código>"), status e reembolso.
// Mesma conta do app. Volta do cartão (Checkout Pro) cai aqui com ?pedido=<id>.
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { supabase } from '../../lib/supabase';
import { meusIngressos, MeuIngresso, pedirReembolso, podeReembolsar, quandoFesta, reais } from '../../lib/ingressosWeb';
import ContaComprador from '../../components/ingressos/ContaComprador';

function Qr({ codigo }: { codigo: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(`dicasingresso:${codigo}`, { width: 520, margin: 1 }).then(setSrc).catch(() => setSrc('')); }, [codigo]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={`QR do ingresso ${codigo}`} className="w-60 h-60 mx-auto bg-white rounded-xl p-2" /> : null;
}

export default function MeusIngressos() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [lista, setLista] = useState<MeuIngresso[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async (u: User | null) => { setLista(u ? await meusIngressos(u.id) : []); }, []);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); void carregar(data.user); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setUser(s?.user ?? null); void carregar(s?.user ?? null); });
    return () => sub.subscription.unsubscribe();
  }, [carregar]);
  // Recém-pago no cartão: o Mercado Pago avisa em segundos; confere de novo algumas vezes.
  useEffect(() => {
    if (!user || !lista?.some((i) => i.status === 'reservado')) return;
    const t = setInterval(() => { void carregar(user); }, 5000);
    return () => clearInterval(t);
  }, [user, lista, carregar]);

  const reembolsar = async (i: MeuIngresso) => {
    const n = (lista || []).filter((x) => x.pedido_id === i.pedido_id).length;
    if (!confirm(`Cancelar ${n > 1 ? `os ${n} ingressos desta compra` : 'este ingresso'} e devolver ${reais(i.ingresso_pedidos?.total_centavos || 0)}, inclusive a taxa?`)) return;
    setOcupado(i.pedido_id);
    try { await pedirReembolso(i.pedido_id); alert('Reembolso feito. Pix volta na hora; cartão, na próxima fatura ou na seguinte.'); await carregar(user!); }
    catch (e) { alert((e as Error).message); } finally { setOcupado(null); }
  };

  const passou = (i: MeuIngresso) => !!i.eventos && new Date(i.eventos.data_fim || new Date(i.eventos.data_inicio).getTime() + 8 * 36e5).getTime() < Date.now();
  const proximos = (lista || []).filter((i) => !passou(i) && i.status !== 'cancelado');
  const antigos = (lista || []).filter((i) => passou(i) || i.status === 'cancelado');

  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      <div className="max-w-xl mx-auto px-5 py-8">
        <p className="text-xs font-black tracking-[0.2em] text-[#E1306C] mb-6">DICAS LGBT+</p>
        <h1 className="text-2xl font-black mb-1">Meus ingressos</h1>
        <p className="text-[#A0A0B2] text-sm mb-6">Mostre o QR na porta. Os mesmos ingressos aparecem no app Dicas LGBT+.</p>

        {user === undefined ? <p className="text-[#A0A0B2]">Carregando…</p> : !user ? (
          <ContaComprador />
        ) : lista === null ? <p className="text-[#A0A0B2]">Carregando…</p> : (
          <>
            {proximos.length === 0 && <p className="text-[#A0A0B2] bg-[#161520] border border-[#232230] rounded-2xl p-5">Você ainda não tem ingressos para as próximas festas.</p>}
            <div className="flex flex-col gap-3">
              {proximos.map((i) => {
                const pend = i.status === 'reservado';
                return (
                  <div key={i.id} className="bg-[#161520] border border-[#232230] rounded-2xl p-4">
                    <button className="w-full text-left" onClick={() => setAberto(aberto === i.id ? null : i.id)}>
                      <p className="font-black">{i.eventos?.titulo}</p>
                      <p className="text-[#F9A8D4] text-sm capitalize">{i.eventos && quandoFesta(i.eventos.data_inicio)}</p>
                      <p className="text-[#A0A0B2] text-sm">{i.eventos?.locais?.nome} · {i.titular} · {i.ingresso_lotes?.nome}{i.meia ? ' (meia)' : ''}{i.cortesia ? ' · cortesia' : ''}</p>
                      <p className={`text-xs font-bold mt-1 ${pend ? 'text-amber-300' : i.status === 'usado' ? 'text-[#A0A0B2]' : 'text-emerald-300'}`}>
                        {pend ? 'Aguardando pagamento…' : i.status === 'usado' ? 'Já entrou' : 'Válido · toque para ver o QR'}
                      </p>
                    </button>
                    {aberto === i.id && !pend && i.status === 'valido' && (
                      <div className="mt-4">
                        <Qr codigo={i.codigo} />
                        <p className="text-center text-xs text-[#A0A0B2] mt-2 tracking-widest">{i.codigo}</p>
                        {podeReembolsar(i) && (
                          <button onClick={() => reembolsar(i)} disabled={ocupado === i.pedido_id} className="w-full mt-4 text-xs text-[#A0A0B2] underline">
                            {ocupado === i.pedido_id ? 'Reembolsando…' : 'Desistiu? Pedir reembolso'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {antigos.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-[#A0A0B2] mt-8 mb-3">ANTERIORES</h2>
                {antigos.map((i) => (
                  <p key={i.id} className="text-sm text-[#626274] mb-2">{i.eventos?.titulo} · {i.titular} · {i.status === 'cancelado' ? 'cancelado' : i.status === 'usado' ? 'entrou' : 'não usado'}</p>
                ))}
              </>
            )}
            <p className="text-[#626274] text-xs mt-10 text-center">{user.email} · <button className="underline" onClick={() => supabase.auth.signOut()}>sair</button></p>
          </>
        )}
      </div>
    </main>
  );
}
