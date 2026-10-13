import { Barlow_Condensed, Permanent_Marker } from 'next/font/google';

// Home nova (modelo enviado pela Andrea): títulos em sans condensada bem
// pesada + um toque de "letra de marcador" no bloco final. Carregadas via
// next/font (self-host no build, sem chamada externa em tempo de acesso).
export const fontDisplay = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const fontMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marker',
  display: 'swap',
});
