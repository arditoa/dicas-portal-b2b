'use client';
// Segundo fator (app autenticador, TOTP) para entrar no /admin — nov/2026.
// modo 'cadastrar': primeira vez; mostra o QR code, a pessoa lê no Google Authenticator / Authy / 1Password e digita o código.
// modo 'verificar': a cada novo login; pede o código de 6 dígitos do app.
// Usa o MFA nativo do Supabase Auth: depois de confirmar, a sessão sobe para o nível "aal2".
import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Props = { modo: 'cadastrar' | 'verificar'; onConcluido: () => void; onSair: () => void };

const NOME_FATOR = 'App autenticador (admin)';

export default function AdminMfa({ modo, onConcluido, onSair }: Props) {
  const [fatorId, setFatorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [segredo, setSegredo] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setErro('');
      const lista = await supabase.auth.mfa.listFactors();
      if (lista.error) {
        if (vivo) { setErro('Não foi possível consultar o segundo fator: ' + lista.error.message); setCarregando(false); }
        return;
      }
      if (modo === 'verificar') {
        const f = lista.data?.totp?.[0];
        if (!f) { if (vivo) { setErro('Nenhum app autenticador cadastrado nesta conta.'); setCarregando(false); } return; }
        if (vivo) { setFatorId(f.id); setCarregando(false); }
        return;
      }
      // cadastrar: limpa tentativas antigas que ficaram pela metade (fator "unverified") e cria um novo
      for (const f of (lista.data?.all || []).filter((x) => x.factor_type === 'totp' && x.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const r = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: NOME_FATOR + ' ' + new Date().toISOString().slice(0, 10) });
      if (!vivo) return;
      if (r.error || !r.data) {
        setErro('Não foi possível iniciar o cadastro: ' + (r.error?.message || 'erro desconhecido') + '. Confirme que o MFA (TOTP) está ligado em Authentication > Multi-Factor no Supabase.');
        setCarregando(false);
        return;
      }
      setFatorId(r.data.id);
      setQr(r.data.totp.qr_code);
      setSegredo(r.data.totp.secret);
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [modo]);

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fatorId || codigo.trim().length !== 6) return;
    setEnviando(true);
    setErro('');
    const r = await supabase.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo.trim() });
    setEnviando(false);
    if (r.error) {
      setErro('Código incorreto ou expirado. Confira o código atual no app e tente de novo.');
      setCodigo('');
      return;
    }
    onConcluido();
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-[#161520] border border-[#232230] rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <ShieldCheck className="text-[#E1306C]" size={22} />
          <h1 className="text-lg font-black">{modo === 'cadastrar' ? 'Proteja o painel com um segundo fator' : 'Confirme que é você'}</h1>
        </div>
        <p className="text-xs text-[#A0A0B2] mb-5">
          {modo === 'cadastrar'
            ? 'O painel de gestão mexe em dados de usuários e parceiros, então exige um código do seu celular além da senha. Leva 1 minuto e só precisa ser feito uma vez.'
            : 'Abra o app autenticador no celular e digite o código de 6 dígitos de “Dicas LGBT+”.'}
        </p>

        {carregando && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#E1306C]" size={24} /></div>}

        {!carregando && modo === 'cadastrar' && qr && (
          <div className="mb-5 space-y-3">
            <ol className="text-xs text-[#D0D0E0] list-decimal list-inside space-y-1">
              <li>Instale um app autenticador (Google Authenticator, Microsoft Authenticator, Authy ou 1Password).</li>
              <li>Toque em adicionar conta e leia o QR code abaixo.</li>
              <li>Digite aqui o código de 6 dígitos que o app mostrar.</li>
            </ol>
            <div className="bg-white rounded-xl p-3 w-fit mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code do app autenticador" className="w-44 h-44" />
            </div>
            {segredo && (
              <details className="text-[11px] text-[#8888A0]">
                <summary className="cursor-pointer">Não consegue ler o QR? Use a chave manual</summary>
                <p className="mt-1 break-all font-mono text-[#D0D0E0] select-all">{segredo}</p>
              </details>
            )}
          </div>
        )}

        {!carregando && fatorId && (
          <form onSubmit={confirmar} className="space-y-3">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              className="w-full bg-[#0B0B0E] border border-[#232230] focus:border-[#E1306C] rounded-xl px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono focus:outline-none"
              aria-label="Código de 6 dígitos"
            />
            <button
              type="submit"
              disabled={enviando || codigo.length !== 6}
              className="w-full bg-[#E1306C] hover:bg-[#C2285C] disabled:opacity-40 text-white text-sm font-bold py-3 rounded-xl"
            >
              {enviando ? 'Confirmando…' : modo === 'cadastrar' ? 'Ativar e entrar' : 'Entrar'}
            </button>
          </form>
        )}

        {erro && <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">{erro}</div>}

        <button onClick={onSair} className="mt-5 text-xs text-[#626274] hover:text-white">Sair desta conta</button>
      </div>
    </div>
  );
}
