// Volta do Checkout Pro do Mercado Pago (no navegador do celular): leva a pessoa de volta ao app, em "Meus ingressos".
'use client';
import { useEffect } from 'react';

export default function RetornoIngresso() {
  useEffect(() => { window.location.href = 'dicaslgbt://ingressos'; }, []);
  return (
    <main style={{ minHeight: '100vh', background: '#0B0B0E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 22 }}>Pronto! Volte ao app</h1>
        <p style={{ color: '#A0A0B2', lineHeight: 1.5 }}>Assim que o Mercado Pago confirmar o pagamento, seus ingressos aparecem em &quot;Meus ingressos&quot;. Com Pix, é na hora.</p>
        <a href="dicaslgbt://ingressos" style={{ display: 'inline-block', marginTop: 16, background: '#E1306C', color: '#fff', textDecoration: 'none', padding: '14px 22px', borderRadius: 999, fontWeight: 800 }}>Abrir meus ingressos</a>
      </div>
    </main>
  );
}
