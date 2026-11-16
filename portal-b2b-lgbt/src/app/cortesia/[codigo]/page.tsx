// Link de cortesia que a casa manda no WhatsApp. Quem tem o app abre lá; quem não tem guarda pelo site
// (mesma conta) e o QR fica em /meus-ingressos.
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import ContaComprador from '../../../components/ingressos/ContaComprador';

export default function Cortesia() {
  const { codigo } = useParams<{ codigo: string }>();
  const link = `dicaslgbt://cortesia/${codigo}`;
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [peloSite, setPeloSite] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState<{ titular: string; festa: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const guardar = async () => {
    setMsg('');
    const { data, error } = await supabase.rpc('resgatar_cortesia', { p_codigo: codigo });
    if (error) return setMsg(error.message);
    setOk(data as { titular: string; festa: string });
  };

  const botao: React.CSSProperties = { display: 'inline-block', marginTop: 12, background: '#E1306C', color: '#fff', textDecoration: 'none', padding: '14px 22px', borderRadius: 999, fontWeight: 800, border: 0, cursor: 'pointer' };
  return (
    <main style={{ minHeight: '100vh', background: '#0B0B0E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ fontSize: 22 }}>Você ganhou uma cortesia 🎉</h1>
        {ok ? (
          <>
            <p style={{ color: '#A0A0B2', lineHeight: 1.5 }}>Ingresso de {ok.titular} para {ok.festa} guardado na sua conta.</p>
            <a href="/meus-ingressos" style={botao}>Ver meu ingresso</a>
          </>
        ) : !peloSite ? (
          <>
            <p style={{ color: '#A0A0B2', lineHeight: 1.5 }}>Guarde o ingresso na sua conta Dicas LGBT+ e mostre o QR na porta.</p>
            <a href={link} style={botao}>Abrir no app</a>
            <div><button onClick={() => setPeloSite(true)} style={{ ...botao, background: 'transparent', border: '1px solid #2A2840' }}>Não tenho o app: guardar pelo site</button></div>
          </>
        ) : user === undefined ? <p style={{ color: '#A0A0B2' }}>Carregando…</p> : !user ? (
          <div style={{ textAlign: 'left', marginTop: 16 }}><ContaComprador /></div>
        ) : (
          <>
            <p style={{ color: '#A0A0B2', lineHeight: 1.5 }}>Guardar na conta {user.email}?</p>
            <button onClick={guardar} style={botao}>Guardar meu ingresso</button>
            {msg && <p style={{ color: '#FCA5A5', marginTop: 12 }}>{msg}</p>}
          </>
        )}
      </div>
    </main>
  );
}
