import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { slotAtual } from '../lib/rodizio';

// Número do slot do rodízio (muda a cada `intervaloMin` minutos). Confere a
// cada 30 s e quando o app volta para a frente, para a Home trocar os locais
// sozinha na virada da hora, sem precisar fechar o app.
export function useSlotHora(intervaloMin: number): number {
  const [slot, setSlot] = useState(() => slotAtual(Date.now(), intervaloMin));
  useEffect(() => {
    const checar = () => setSlot(slotAtual(Date.now(), intervaloMin));
    checar();
    const timer = setInterval(checar, 30000);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') checar(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [intervaloMin]);
  return slot;
}
