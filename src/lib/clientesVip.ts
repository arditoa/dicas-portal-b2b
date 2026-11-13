// Rodada 145 — Clientes VIP da casa (migração 100: clientes_vip_do_local).
// Aniversário vem só como 'DD/MM' e só de quem autorizou na Conta (LGPD) — nunca ano nem idade.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type ClienteVip = {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  visitas_total: number;
  visitas_periodo: number;
  ultima_visita: string | null;
  vip: boolean;
  meta_vip: number;
  aniversario: string | null;
  dias_para_aniversario: number | null;
};

export function useClientesVip(localId?: string, dias = 90) {
  const [clientes, setClientes] = useState<ClienteVip[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!localId) return;
    setCarregando(true);
    const { data, error } = await supabase.rpc('clientes_vip_do_local', { p_local: localId, p_dias: dias });
    if (error) {
      setErro(/function|does not exist|schema cache/i.test(error.message) ? 'atualizar' : error.message);
      setClientes([]);
    } else {
      setErro(null);
      setClientes((data as ClienteVip[]) || []);
    }
    setCarregando(false);
  }, [localId, dias]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const vips = clientes.filter((c) => c.vip);
  const aniversariantes = clientes
    .filter((c) => c.dias_para_aniversario !== null && c.dias_para_aniversario <= 30)
    .sort((a, b) => (a.dias_para_aniversario ?? 99) - (b.dias_para_aniversario ?? 99));

  return { clientes, vips, aniversariantes, carregando, erro, recarregar: carregar };
}

export function quandoAniversario(dias: number | null) {
  if (dias === null) return '';
  if (dias === 0) return 'Hoje!';
  if (dias === 1) return 'Amanhã';
  return `Em ${dias} dias`;
}

export function haQuanto(iso: string | null) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'hoje';
  if (d === 1) return 'ontem';
  if (d < 30) return `há ${d} dias`;
  const m = Math.floor(d / 30);
  return m === 1 ? 'há 1 mês' : `há ${m} meses`;
}

export const inicial = (n: string) => (n.trim()[0] || '?').toUpperCase();
