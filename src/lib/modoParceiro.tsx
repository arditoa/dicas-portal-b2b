// Rodada 145 — Modo parceiro dentro do app.
//
// Quem é dono de um local (ou faz parte da equipe dele) já entra no Modo parceiro.
// A lista de locais e permissões vem do banco: função meus_locais_parceiro() (migration 099).
// Se a 099 ainda não rodou, a função não existe: o app segue normal, só no modo cliente.
//
// Regras por categoria: ESPELHO de POR_CATEGORIA em portal-b2b-lgbt/src/lib/parceiro.ts.
// Se mudar lá, mude aqui.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './authContext';
import { ehContaWhatsApp } from './parceiroAuth';
import { supabase } from './supabase';

export type Permissao = 'porta' | 'checkins' | 'lista_vip' | 'festa' | 'banner' | 'cupons' | 'resultados';

export type LocalDoParceiro = {
  local_id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  // Plano que VALE (plano efetivo, igual ao planoEfetivo do portal): pago só com status 'ativo'.
  // Em interesse / aguardando pagamento / cancelado, fica null (= Gratuito). Calculado ao carregar.
  plano_comercial: string | null;
  plano_contratado?: string | null; // o que está no cadastro, mesmo sem estar ativo (só para mostrar)
  plano_comercial_status?: string | null; // vem da migração 104
  pode_subir_pacotes?: boolean | null; // vem da migração 111 (sem ela: categoria turismo)
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
  pedeHorario: boolean; // pede horário de funcionamento na página (espelho do portal)
  pedePagina: boolean; // false = não cobrar "completar a página" (festa avulsa)
};
const PADRAO: Recursos = { cupom: 'cupom', agenda: true, eventos: true, listaVip: true, checkins: true, fidelidade: true, reservas: true, pedeHorario: true, pedePagina: true };
const POR_CATEGORIA: Record<string, Partial<Recursos>> = {
  eventos: { cupom: false, agenda: false, checkins: false, fidelidade: false, reservas: false, pedeHorario: false },
  saude: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, checkins: false, fidelidade: false, reservas: false },
  lojas: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, reservas: false },
  produtos: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, reservas: false, pedeHorario: false },
  beleza: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, reservas: false },
  servicos: { cupom: 'desconto', agenda: false, eventos: false, listaVip: false, reservas: false, pedeHorario: false },
  turismo: { agenda: false, eventos: false, listaVip: false, reservas: false, pedeHorario: false },
};
// Plano efetivo (espelho de planoEfetivo em portal-b2b-lgbt/src/lib/parceiro.ts): plano pago só conta com
// status 'ativo'. Sem status (antes da migração 104, ou campo vazio) vale como 'ativo', igual ao banco
// (coalesce(plano_comercial_status, 'ativo') em local_tem_plano_pago e marca_tem_festa_do_plano).
const PLANOS_PAGOS = ['intermediario', 'premium', 'fundador'];
export function planoEfetivo(plano: string | null | undefined, status: string | null | undefined): string | null {
  if (!plano || !PLANOS_PAGOS.includes(plano)) return null;
  return (status ?? 'ativo') === 'ativo' ? plano : null;
}

export function recursosDaCategoria(categoria: string, subcategoria?: string | null): Recursos {
  const r = { ...PADRAO, ...(POR_CATEGORIA[categoria] ?? {}) };
  // Festa avulsa: o organizador só quer divulgar a festa; não cobramos página completa (igual ao portal).
  if (categoria === 'eventos' && (subcategoria || '').trim().toLowerCase() === 'festa avulsa') r.pedePagina = false;
  return r;
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
  const carregadoParaRef = useRef<string | null>(null);

  // Só o id importa: o Supabase troca o objeto `user` a cada renovação de sessão (TOKEN_REFRESHED),
  // e recarregar por isso desmontava as abas do parceiro e jogava a pessoa de volta no Início.
  const userId = user?.id ?? null;
  // Revisão (Etapa 10): o recarregar lê a conta ATUAL. Antes ele guardava o id da hora em que foi criado, e quem
  // chamava logo depois de entrar (ex.: aparelho da porta, login anônimo) zerava a lista e ficava no "carregando".
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;
  const recarregar = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) {
      setLocais([]);
      setCarregadoPara(null);
      setCarregando(false);
      return;
    }
    // Recarga silenciosa quando já carregou para esta conta (não mostra o carregando de novo).
    setCarregando((c) => (carregadoParaRef.current === userId ? c : true));
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
        const lista = ((data as LocalDoParceiro[]) || []).map((l) => ({
          ...l,
          plano_contratado: l.plano_comercial,
          plano_comercial: planoEfetivo(l.plano_comercial, l.plano_comercial_status),
        }));
        setLocais(lista);
        const valido = lista.find((l) => l.local_id === localSalvo);
        setLocalId(valido ? valido.local_id : lista[0]?.local_id ?? null);
      }
      setModo(modoSalvo === 'cliente' ? 'cliente' : 'parceiro');
    } finally {
      carregadoParaRef.current = userId;
      setCarregadoPara(userId);
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void recarregar();
  }, [authLoading, userId, recarregar]);

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

  // Memorizado: sem isso, cada renderização do contexto refazia as consultas de quem depende de pode() (ex.: lembretes do Início).
  const pode = useCallback((p: Permissao) => !!localAtivo?.permissoes?.includes(p), [localAtivo]);

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
    pode,
    recarregar,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useModoParceiro = () => useContext(Ctx);
