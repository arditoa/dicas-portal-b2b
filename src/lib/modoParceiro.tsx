// Rodada 145 — Modo parceiro dentro do app.
//
// Quem é dono de um local (ou faz parte da equipe dele) já entra no Modo parceiro.
// A lista de locais e permissões vem do banco: função meus_locais_parceiro() (migration 099).
// Se a 099 ainda não rodou, a função não existe: o app segue normal, só no modo cliente.
//
// Regras por categoria: ESPELHO de POR_CATEGORIA em portal-b2b-lgbt/src/lib/parceiro.ts.
// Se mudar lá, mude aqui.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './authContext';
import { ehContaWhatsApp } from './parceiroAuth';
import { supabase } from './supabase';

export type Permissao = 'porta' | 'checkins' | 'lista_vip' | 'festa' | 'banner' | 'cupons' | 'resultados';

export type LocalDoParceiro = {
  local_id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  plano_comercial: string | null;
  papel: 'dono' | 'porteiro' | 'gerente' | 'social_media' | 'personalizado' | 'porta_pin';
  permissoes: Permissao[];
  expira_em: string | null;
};

// ---------- o que cada categoria usa (espelho do portal) ----------
export type Recursos = {
  cupom: 'cupom' | 'desconto' | false;
  agenda: boolean;
  eventos: boolean;
  listaVip: boolean;
  checkins: boolean;
  fidelidade: boolean;
  reservas: boolean; // Rodada 146 — reserva de mesa (bares, restaurantes e afins)
};
const PADRAO: Recursos = { cupom: 'cupom', agenda: true, eventos: true, listaVip: true, checkins: true, fidelidade: true, reservas: true };
const POR_CATEGORIA: Record<string, Partial<Recursos>> = {
  eventos: { cupom: false, agenda: false, checkins: false, fidelidade: false, reservas: false },
  saude: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, checkins: false, fidelidade: false, reservas: false },
  lojas: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, reservas: false },
  produtos: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, reservas: false },
  beleza: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, reservas: false },
  servicos: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, reservas: false },
  turismo: { agenda: false, eventos: false, listaVip: false, reservas: false },
};
export function recursosDaCategoria(categoria: string): Recursos {
  return { ...PADRAO, ...(POR_CATEGORIA[categoria] ?? {}) };
}

export const NOME_PAPEL: Record<LocalDoParceiro['papel'], string> = {
  dono: 'Dono',
  porteiro: 'Porteiro',
  gerente: 'Gerente',
  social_media: 'Social media',
  personalizado: 'Equipe',
  porta_pin: 'Porta',
};

// ---------- contexto ----------
type Modo = 'parceiro' | 'cliente';
const CHAVE_MODO = 'dicas:modo_app';
const CHAVE_LOCAL = 'dicas:local_parceiro';

type ModoParceiroCtx = {
  carregando: boolean;
  locais: LocalDoParceiro[];
  localAtivo: LocalDoParceiro | null;
  escolherLocal: (localId: string) => void;
  modo: Modo;
  definirModo: (m: Modo) => void;
  ehParceiro: boolean;
  senhaProvisoria: boolean;
  pode: (p: Permissao) => boolean;
  recarregar: () => Promise<void>;
};

const Ctx = createContext<ModoParceiroCtx>({
  carregando: true,
  locais: [],
  localAtivo: null,
  escolherLocal: () => {},
  modo: 'parceiro',
  definirModo: () => {},
  ehParceiro: false,
  senhaProvisoria: false,
  pode: () => false,
  recarregar: async () => {},
});

export function ModoParceiroProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [locais, setLocais] = useState<LocalDoParceiro[]>([]);
  const [localId, setLocalId] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>('parceiro');
  // Para quem a lista já foi carregada: evita decidir a entrada com a lista da conta anterior (ou vazia) logo após o login.
  const [carregadoPara, setCarregadoPara] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!user) {
      setLocais([]);
      setCarregadoPara(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const [{ data, error }, modoSalvo, localSalvo] = await Promise.all([
        supabase.rpc('meus_locais_parceiro'),
        AsyncStorage.getItem(CHAVE_MODO).catch(() => null),
        AsyncStorage.getItem(CHAVE_LOCAL).catch(() => null),
      ]);
      if (error) {
        // 099 ainda não rodou (função inexistente) ou sem rede: fica só no modo cliente.
        console.warn('[modoParceiro] meus_locais_parceiro:', error.message);
        setLocais([]);
      } else {
        const lista = (data as LocalDoParceiro[]) || [];
        setLocais(lista);
        const valido = lista.find((l) => l.local_id === localSalvo);
        setLocalId(valido ? valido.local_id : lista[0]?.local_id ?? null);
      }
      setModo(modoSalvo === 'cliente' ? 'cliente' : 'parceiro');
    } finally {
      setCarregadoPara(user.id);
      setCarregando(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void recarregar();
  }, [authLoading, recarregar]);

  const escolherLocal = useCallback((id: string) => {
    setLocalId(id);
    void AsyncStorage.setItem(CHAVE_LOCAL, id).catch(() => {});
  }, []);

  const definirModo = useCallback((m: Modo) => {
    setModo(m);
    void AsyncStorage.setItem(CHAVE_MODO, m).catch(() => {});
  }, []);

  const localAtivo = useMemo(
    () => locais.find((l) => l.local_id === localId) ?? locais[0] ?? null,
    [locais, localId]
  );

  const valor: ModoParceiroCtx = {
    carregando: authLoading || carregando || (!!user && carregadoPara !== user.id),
    locais,
    localAtivo,
    escolherLocal,
    modo,
    definirModo,
    ehParceiro: locais.length > 0,
    // Conta criada pelo portal com a senha "dica + 4 últimos números": precisa trocar antes de usar o Modo parceiro.
    senhaProvisoria: ehContaWhatsApp(user?.email) && user?.user_metadata?.senha_trocada !== true,
    pode: (p) => !!localAtivo?.permissoes?.includes(p),
    recarregar,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useModoParceiro = () => useContext(Ctx);
