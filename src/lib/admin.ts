// Modo equipe (app admin) — migração 133. Tudo o que a equipe Dicas edita aqui fica no banco e aparece no app
// na hora: banners, caixas, planos, aprovações. Nada disso precisa de nova versão na Apple.
import { useEffect, useState } from 'react';
import { CATEGORIA_ORDER, CATEGORIAS } from './categorias';
import { URL_PORTAL } from './parceiroMenu';
import { supabase } from './supabase';

export function useEhAdmin(userId: string | null | undefined) {
  const [eh, setEh] = useState<boolean | null>(null);
  useEffect(() => {
    if (!userId) { setEh(false); return; }
    let vivo = true;
    supabase.rpc('is_admin').then(({ data }) => { if (vivo) setEh(data === true); }, () => { if (vivo) setEh(false); });
    return () => { vivo = false; };
  }, [userId]);
  return eh;
}

// A conta é da equipe (profiles.role = 'admin')? Diferente de is_admin(): esta não depende do código do autenticador.
// Serve só para MOSTRAR a entrada do Modo equipe; o banco continua exigindo senha + código (migração 085).
export function useContaAdmin(userId: string | null | undefined) {
  const [eh, setEh] = useState(false);
  useEffect(() => {
    if (!userId) { setEh(false); return; }
    let vivo = true;
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (vivo) setEh((data as any)?.role === 'admin'); }, () => { if (vivo) setEh(false); });
    return () => { vivo = false; };
  }, [userId]);
  return eh;
}

// A sessão já passou pelo código do autenticador (aal2)?
export async function sessaoComCodigo(): Promise<boolean> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === 'aal2';
}

// Confere os 6 dígitos do app autenticador (o mesmo cadastrado no portal /admin) e sobe a sessão para aal2.
export async function confirmarCodigoAdmin(codigo: string): Promise<void> {
  const lista = await supabase.auth.mfa.listFactors();
  const fator = lista.data?.totp?.find((f) => f.status === 'verified');
  if (!fator) throw new Error('Esta conta ainda não tem o app autenticador. Cadastre no portal (/admin) e volte aqui.');
  const r = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo.replace(/\D/g, '') });
  if (r.error) throw new Error('Código inválido ou vencido. Confira no app autenticador e tente de novo.');
}

// Lugares do app onde um banner (banners_app.telas) pode aparecer
export type Lugar = { tela: string; rotulo: string; grupo: 'Home' | 'Trip' | 'Categorias'; dica?: string };
export const LUGARES: Lugar[] = [
  { tela: 'home_topo', rotulo: 'Home · carrossel do topo', grupo: 'Home', dica: 'Primeiros cartões da Home (Museu, Trip, campanhas). Ordem = chance.' },
  { tela: 'home', rotulo: 'Home · 2º carrossel', grupo: 'Home', dica: 'Logo abaixo do topo: parceiros e campanhas.' },
  { tela: 'home_c3', rotulo: 'Home · 3º carrossel', grupo: 'Home', dica: 'Abaixo das caixas (só aparece com banner).' },
  { tela: 'home_c4', rotulo: 'Home · 4º carrossel', grupo: 'Home', dica: 'Fim da Home, antes dos Fundadores.' },
  { tela: 'trip', rotulo: 'Trip · Topo 2', grupo: 'Trip', dica: 'Aba Trip (a categoria Turismo da Home abre esta aba).' },
  ...(['destaques', ...CATEGORIA_ORDER.filter((x) => x !== 'turismo')] as const).map((slug) => ({
    tela: `cat:${slug}`, rotulo: `${CATEGORIAS[slug]?.label || slug} · Topo 2`, grupo: 'Categorias' as const,
  })),
];
export const rotuloDoLugar = (tela: string) => {
  const l = LUGARES.find((x) => x.tela === tela);
  if (l) return l.rotulo;
  const m = tela.match(/^cat:([^:]+):(.+)$/); // subcategoria: cat:<categoria>:<sub>
  if (m) return `${CATEGORIAS[m[1] as keyof typeof CATEGORIAS]?.label || m[1]} › ${m[2]} · Topo 2`;
  return tela;
};

export type BannerAdm = {
  id: string; chave: string | null; tag: string; titulo: string; cta: string; icone: string; cor: string; logo_url: string | null;
  destino: string; telas: string[]; parceria: 'patrocinio' | 'institucional' | 'proprio'; peso: number;
  inicio: string | null; fim: string | null; ativo: boolean; acao_marca_id?: string | null;
};

export function situacaoBanner(b: Pick<BannerAdm, 'ativo' | 'inicio' | 'fim'>): { txt: string; cor: string } {
  const agora = Date.now();
  if (!b.ativo) return { txt: 'Desligado', cor: '#626274' };
  if (b.inicio && new Date(b.inicio).getTime() > agora) return { txt: 'Agendado', cor: '#F2C94C' };
  if (b.fim && new Date(b.fim).getTime() < agora) return { txt: 'Vencido', cor: '#F87171' };
  return { txt: 'No ar', cor: '#34D399' };
}

export function descreverDestino(d: string): string {
  const x = (d || '').trim();
  if (!x) return 'Sem link';
  if (x.startsWith('local:')) return 'Abre a página de uma casa';
  if (x.startsWith('/marca/')) return 'Abre uma ação de marca';
  if (x.startsWith('categoria:')) return `Abre a categoria ${x.slice(10)}`;
  if (x.startsWith('/')) return `Abre ${x} no app`;
  if (/^https?:\/\//.test(x)) return 'Abre um site';
  return x;
}

// Ações que precisam do servidor (criam login do parceiro, por exemplo): mesmas rotas do /admin do portal.
export async function chamarPortalAdmin(rota: string, corpo: object) {
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) throw new Error('Entre de novo.');
  const r = await fetch(`${URL_PORTAL}${rota}`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Não deu agora.');
  return j;
}

export const PLANOS = [
  { valor: 'freemium', rotulo: 'Gratuito' }, { valor: 'intermediario', rotulo: 'Intermediário' },
  { valor: 'premium', rotulo: 'Premium' }, { valor: 'fundador', rotulo: 'Fundador' },
];
export const STATUS_PLANO = [
  { valor: 'ativo', rotulo: 'Ativo' }, { valor: 'interesse', rotulo: 'Interesse' },
  { valor: 'aguardando_pagamento', rotulo: 'Aguardando pagamento' }, { valor: 'cancelado', rotulo: 'Cancelado' },
];
export const reaisAdm = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
