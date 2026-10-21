// Respeita a configuração "Reduzir movimento" do aparelho (iOS e Android):
// com ela ligada, a Home não passa nada sozinha (faixa, carrossel, ticker).
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduzirMovimento(): boolean {
  const [reduzir, setReduzir] = useState(false);
  useEffect(() => {
    let ativo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (ativo) setReduzir(!!v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduzir(!!v));
    return () => {
      ativo = false;
      sub.remove();
    };
  }, []);
  return reduzir;
}
