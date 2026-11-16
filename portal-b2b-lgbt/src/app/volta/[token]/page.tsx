// "Cheguei bem" (migração 136): o que o amigo vê pelo link, sem precisar do app. Atualiza a cada 30 segundos.
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

type Publica = { nome: string; status: 'a_caminho' | 'atrasada' | 'chegou' | 'cancelada'; previsao: string; chegou_em: string | null; saiu_de: string | null; lat: number | null; lng: number | null; loc_em: string | null };
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

export default function Volta() {
  const { token } = useParams<{ token: string }>();
  const [v, setV] = useState<Publica | null | undefined>(undefined);

  useEffect(() => {
    const carregar = async () => {
      const { data, error } = await supabase.rpc('volta_publica', { p_token: token });
      setV(error ? null : ((data as Publica) || null));
    };
    void carregar();
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [token]);

  const cor = v?.status === 'chegou' ? '#34D399' : v?.status === 'atrasada' ? '#F2C94C' : v?.status === 'cancelada' ? '#8E8BA3' : '#A78BFA';
  const titulo = !v ? '' : v.status === 'chegou' ? `${v.nome} chegou bem 💚` : v.status === 'atrasada' ? `${v.nome} ainda não confirmou que chegou`
    : v.status === 'cancelada' ? `${v.nome} cancelou o aviso` : `${v.nome} está voltando para casa`;
  const btn: React.CSSProperties = { display: 'block', textAlign: 'center', marginTop: 12, padding: '14px 18px', borderRadius: 14, fontWeight: 800, textDecoration: 'none', color: '#fff' };

  return (
    <main style={{ minHeight: '100vh', background: '#0B0B0E', color: '#fff', display: 'flex', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 440, width: '100%', marginTop: 32 }}>
        <p style={{ color: '#A0A0B2', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>DICAS LGBT+ · CHEGUEI BEM</p>
        {v === undefined && <p style={{ color: '#A0A0B2' }}>Carregando…</p>}
        {v === null && (<><h1 style={{ fontSize: 22 }}>Link expirado</h1><p style={{ color: '#A0A0B2' }}>Este aviso some 12 horas depois do horário combinado.</p></>)}
        {v && (
          <>
            <div style={{ border: `1px solid ${cor}88`, background: '#161520', borderRadius: 18, padding: 20 }}>
              <h1 style={{ fontSize: 22, margin: 0 }}>{titulo}</h1>
              <p style={{ color: '#A0A0B2', lineHeight: 1.5, marginBottom: 0 }}>
                {v.status === 'chegou' && v.chegou_em ? `Confirmou às ${hhmm(v.chegou_em)}.` : `Combinou de chegar até ${hhmm(v.previsao)}${v.saiu_de ? `, saindo do ${v.saiu_de}` : ''}.`}
              </p>
              {v.status === 'atrasada' && <p style={{ color: '#F2C94C', lineHeight: 1.5 }}>Tente falar com ela(e). Se não conseguir e achar que é grave, ligue 190.</p>}
            </div>
            {v.lat != null && v.lng != null && (
              <a href={`https://maps.google.com/?q=${v.lat},${v.lng}`} target="_blank" rel="noreferrer" style={{ ...btn, background: '#1D1C29', border: '1px solid #232230' }}>
                Ver última localização{v.loc_em ? ` (${hhmm(v.loc_em)})` : ''}
              </a>
            )}
            {v.status === 'atrasada' && <a href="tel:190" style={{ ...btn, background: '#EF4444' }}>Ligar 190</a>}
            {(v.status === 'a_caminho' || v.status === 'atrasada') && (
              <a href={`dicaslgbt://volta/${token}`} style={{ ...btn, background: '#E1306C' }}>Tenho o app: quero receber o alerta</a>
            )}
            <p style={{ color: '#626274', fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>Esta página atualiza sozinha. A localização só aparece enquanto a pessoa não confirma que chegou e some depois.</p>
          </>
        )}
      </div>
    </main>
  );
}
