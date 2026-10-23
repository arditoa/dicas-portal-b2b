// Banners do carrossel (Home e Trip), vindos da tabela `banners_app` (migration 050).
// Regras: só ativos e dentro do prazo (a própria política do banco filtra); cada
// banner escolhe em quais telas aparece; a ordem é sorteada com PESO (quem paga
// ou está em período de destaque tem mais chance de abrir na frente); no máximo 4.
// Se a tabela ainda não existir ou a consulta falhar, devolve `null` e a tela usa a lista antiga do código.
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';

import type { Anuncio } from '../components/CarrosselAnuncios';
import { useAuth } from './authContext';
import { registrarAviso } from './avisos';
import { useI18n } from './i18n';
import { supabase } from './supabase';

export type BannerDB = {
  id: string;
  chave: string | null;
  tag: string;
  titulo: string;
  cta: string;
  icone: string;
  cor: string;
  logo_url: string | null;
  destino: string;
  telas: string[];
  parceria: 'patrocinio' | 'institucional' | 'proprio';
  peso: number;
  peso_periodo: number | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  traducoes: Record<string, { tag?: string; titulo?: string; cta?: string }> | null;
};

const MAX_BANNERS = 4;

function pesoEfetivo(b: BannerDB, hoje: string): number {
  const dentro = !!b.peso_periodo && !!b.periodo_inicio && !!b.periodo_fim && hoje >= b.periodo_inicio && hoje <= b.periodo_fim;
  return Math.max(1, dentro ? (b.peso_periodo as number) : b.peso);
}

// Sorteio com peso, sem repetir: o primeiro lugar muda a cada abertura.
function ordenarPorPeso(lista: BannerDB[], hoje: string): BannerDB[] {
  const pool = lista.map((b) => ({ b, p: pesoEfetivo(b, hoje) }));
  const saida: BannerDB[] = [];
  while (pool.length > 0 && saida.length < MAX_BANNERS) {
    const total = pool.reduce((s, x) => s + x.p, 0);
    let r = Math.random() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= pool[i].p;
      if (r <= 0) break;
    }
    saida.push(pool[i].b);
    pool.splice(i, 1);
  }
  return saida;
}

const ROTULO_PARCERIA: Record<string, Record<string, string>> = {
  patrocinio: { pt: 'APOIO', en: 'SPONSORED', es: 'PATROCINADO' },
  institucional: { pt: 'PARCEIRO INSTITUCIONAL', en: 'INSTITUTIONAL PARTNER', es: 'SOCIO INSTITUCIONAL' },
};

/** Devolve a lista de anúncios da tela ('home' | 'trip') ou null (usar a lista do código). */
export function useAnunciosApp(
  tela: 'home' | 'trip',
  extras?: { custom?: Record<string, Anuncio['custom']> }
): { anuncios: Anuncio[] | null; aoExibir: (id: string) => void } {
  const router = useRouter();
  const { user } = useAuth();
  const { t, idioma } = useI18n();
  const [banners, setBanners] = useState<BannerDB[] | null>(null);
  const vistos = useRef<Set<string>>(new Set());

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data, error } = await supabase.from('banners_app').select('*');
      if (!ativo) return;
      if (error || !data || data.length === 0) {
        setBanners(null);
        return;
      }
      const hoje = new Date().toISOString().slice(0, 10);
      const daTela = (data as BannerDB[]).filter((b) => (b.telas || []).includes(tela));
      setBanners(daTela.length > 0 ? ordenarPorPeso(daTela, hoje) : null);
    })();
    return () => {
      ativo = false;
    };
  }, [tela]);

  const registrar = useCallback(
    (id: string, tipo: 'exibicao' | 'clique') => {
      // Medição anônima: só banner, tipo e tela.
      supabase.from('banners_eventos').insert({ banner_id: id, tipo, tela }).then(() => {}, () => {});
    },
    [tela]
  );

  const abrir = useCallback(
    (b: BannerDB) => {
      const d = (b.destino || '').trim();
      if (d === 'aviso:brasil2027') {
        registrarAviso({
          userId: user?.id,
          alvo: 'brasil2027',
          alvoLabel: 'Brasil 2027',
          t,
          irParaLogin: () => router.push('/(tabs)/profile'),
        });
      } else if (d.startsWith('http')) {
        Linking.openURL(d).catch(() => {});
      } else if (d.startsWith('local:')) {
        router.push(`/business/${d.slice(6)}` as any);
      } else if (d.startsWith('/')) {
        router.push(d as any);
      }
    },
    [router, user?.id, t]
  );

  const anuncios = useMemo<Anuncio[] | null>(() => {
    if (!banners) return null;
    return banners.map((b) => {
      const tr = (idioma !== 'pt' && b.traducoes?.[idioma]) || {};
      const rotulo = ROTULO_PARCERIA[b.parceria]?.[idioma] || ROTULO_PARCERIA[b.parceria]?.pt;
      return {
        id: b.id,
        tag: tr.tag || b.tag,
        titulo: tr.titulo || b.titulo,
        cta: tr.cta || b.cta,
        icone: (b.icone || 'star') as Anuncio['icone'],
        cor: b.cor || '#7E57C2',
        logoUrl: b.logo_url || undefined,
        rotulo,
        custom: b.chave ? extras?.custom?.[b.chave] : undefined,
        onPress: () => {
          registrar(b.id, 'clique');
          abrir(b);
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners, idioma, registrar, abrir]);

  const aoExibir = useCallback(
    (id: string) => {
      if (!banners || !banners.some((b) => b.id === id)) return;
      if (vistos.current.has(id)) return;
      vistos.current.add(id);
      registrar(id, 'exibicao');
    },
    [banners, registrar]
  );

  return { anuncios, aoExibir };
}
