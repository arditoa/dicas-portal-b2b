// 18/11 — Liga/desliga das integrações que dependem de credenciais externas (Mercado Pago e Instagram).
//   app_config 'integracoes' = JSON {"mp": false, "ig": false} desliga (mostra "Em breve"). Padrão: LIGADAS
//   (decisão da Andrea, 18/11). Serve só de chave de emergência, sem build novo.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

let cache: { em: number; v: Record<string, boolean> } | null = null;
export async function lerIntegracoes(): Promise<Record<string, boolean>> {
  if (cache && Date.now() - cache.em < 60_000) return cache.v;
  try {
    const { data } = await supabase.from('app_config').select('valor').eq('chave', 'integracoes').maybeSingle();
    const v = JSON.parse(((data as any)?.valor as string) || '{}');
    cache = { em: Date.now(), v };
    return v;
  } catch {
    return {};
  }
}
export function useIntegracaoLigada(chave: 'mp' | 'ig'): boolean | null {
  const [lig, setLig] = useState<boolean | null>(null);
  useEffect(() => { let vivo = true; void lerIntegracoes().then((v) => { if (vivo) setLig(v[chave] !== false); }); return () => { vivo = false; }; }, [chave]);
  return lig;
}
