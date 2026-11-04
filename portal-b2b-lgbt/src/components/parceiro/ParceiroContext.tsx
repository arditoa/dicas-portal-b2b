'use client';

// Rodada 129 — dados do parceiro logado, carregados UMA vez pelo layout do
// dashboard (ParceiroShell) e compartilhados com as telas, pra não repetir
// as mesmas consultas em cada página.
import type { User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import type { Diagnostico, Lembrete, LocalParceiro, PassoChecklist, PlanoSlug } from '../../lib/parceiro';

export type ParceiroCtx = {
  user: User;
  local: LocalParceiro;
  plano: PlanoSlug;
  /** Plano pago E com status ativo. */
  pago: boolean;
  podePacotes: boolean | null;
  diagnostico: Diagnostico | null;
  /** Lembretes de hoje, já sem os que o parceiro adiou. */
  lembretes: Lembrete[];
  checklist: PassoChecklist[];
  adiar: (id: string) => void;
  recarregar: () => Promise<void>;
  abrirTrocaSenha: () => void;
};

const Contexto = createContext<ParceiroCtx | null>(null);
export const ParceiroProvider = Contexto.Provider;

/** null = conta sem espaço vinculado (organizador de evento, admin ou ainda sem vínculo). */
export const useParceiro = () => useContext(Contexto);
