'use client';
// 24/11 — botão "Baixe" da página /baixe (QR Code). Abre a loja certa pelo celular da pessoa:
// iPhone → App Store; Android → Google Play; computador → mostra as duas. Sem os links das lojas ainda
// (constants.ts), leva para a Lista Antecipada.
import { useEffect, useState } from 'react';
import { URL_APP_STORE, URL_PLAY_STORE } from '../lib/constants';

type Sistema = 'ios' | 'android' | 'outro';

export default function BotaoBaixar({ texto, onde, grande = false }: { texto: string; onde: string; grande?: boolean }) {
  const [so, setSo] = useState<Sistema>('outro');
  useEffect(() => {
    const ua = navigator.userAgent || '';
    setSo(/iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'outro');
  }, []);
  const lojas = !!(URL_APP_STORE || URL_PLAY_STORE);
  const href = !lojas
    ? '/lista-antecipada'
    : so === 'ios' ? URL_APP_STORE || URL_PLAY_STORE
    : so === 'android' ? URL_PLAY_STORE || URL_APP_STORE
    : URL_APP_STORE || URL_PLAY_STORE;
  const classe = `inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#E1306C] to-[#7E57C2] hover:opacity-90 text-white font-extrabold rounded-2xl transition shadow-lg shadow-[#E1306C]/30 ${grande ? 'text-base px-8 py-4 w-full sm:w-auto' : 'text-sm px-6 py-3.5'}`;
  return (
    <div className="flex flex-col items-center gap-2">
      <a href={href} data-track="baixar_app" data-onde={onde} className={classe}>
        {texto}
      </a>
      {lojas && so === 'outro' && (
        <div className="flex gap-3 text-xs text-[#A0A0B2]">
          {URL_APP_STORE && <a className="underline" href={URL_APP_STORE}>App Store</a>}
          {URL_PLAY_STORE && <a className="underline" href={URL_PLAY_STORE}>Google Play</a>}
        </div>
      )}
      {!lojas && <p className="text-[11px] text-[#7A7790]">O app chega às lojas em dezembro. Deixe seu contato e avisamos no lançamento.</p>}
    </div>
  );
}
