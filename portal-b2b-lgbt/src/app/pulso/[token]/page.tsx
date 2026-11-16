'use client';
// Pulso LGBT+ (migração 144): retrato mensal publicado pela equipe Dicas. Página pública, sem login, imprimível.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Barras, Bloco, Numeros, Pagina } from '../../../components/RelatorioVisual';

type P = { mes: string; cidade: string | null; pessoas: number | string; crescimento_pct: number | null; casas_com_movimento: number; idade_pct: Record<string, number | null>;
  dias_pct: { dia: number; pct: number }[]; pico_hora: number | null; categorias_pct: { categoria: string; pct: number }[]; bairros: { bairro: string; pessoas: number | string }[] | null;
  gostos_musica: { valor: string; pct: number }[]; gostos_experiencia: { valor: string; pct: number }[]; ingressos: { vendidos: number | string; preco_medio_centavos: number | null }; publicado_em: string };
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const CAT: Record<string, string> = { bar: 'Bares', balada: 'Baladas', festa: 'Festas', restaurante: 'Restaurantes', turismo: 'Turismo', cultura: 'Cultura' };

export default function PulsoPublico() {
  const { token } = useParams<{ token: string }>();
  const [p, setP] = useState<P | null | undefined>(undefined);
  useEffect(() => { supabase.rpc('pulso_publico', { p_token: token }).then(({ data, error }) => setP(error ? null : ((data as P) || null))); }, [token]);
  if (p === undefined) return <Pagina selo="PULSO LGBT+" titulo="Carregando…">{null}</Pagina>;
  if (p === null) return <Pagina selo="PULSO LGBT+" titulo="Link inválido" sub="Peça o link à equipe Dicas LGBT+.">{null}</Pagina>;
  const mes = new Date(p.mes + '-15T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <Pagina selo="PULSO LGBT+ · DICAS LGBT+" titulo={`A noite LGBT+ ${p.cidade ? `em ${p.cidade}` : 'no Brasil'}`} sub={`${mes.charAt(0).toUpperCase() + mes.slice(1)} · com base em quem usou o app nas casas parceiras`}>
      <Bloco titulo="Em números">
        <Numeros itens={[['Pessoas ativas', p.pessoas], ['vs mês anterior', p.crescimento_pct == null ? '–' : `${p.crescimento_pct > 0 ? '+' : ''}${p.crescimento_pct}%`], ['Casas com movimento', p.casas_com_movimento], ['Pico de chegada', p.pico_hora == null ? '–' : `${p.pico_hora}h`]]} />
      </Bloco>
      <Bloco titulo="Idade"><Barras sufixo="%" linhas={Object.entries(p.idade_pct).map(([k, v]) => ({ rotulo: `${k} anos`, valor: v }))} /></Bloco>
      <Bloco titulo="Dias da semana"><Barras sufixo="%" linhas={p.dias_pct.map((d) => ({ rotulo: DIAS[d.dia], valor: d.pct }))} /></Bloco>
      {p.categorias_pct.length > 0 && <Bloco titulo="Onde o público vai"><Barras sufixo="%" linhas={p.categorias_pct.map((c) => ({ rotulo: CAT[c.categoria] || c.categoria, valor: c.pct }))} /></Bloco>}
      {!!p.bairros?.length && <Bloco titulo="Bairros mais movimentados"><Barras linhas={p.bairros.map((b) => ({ rotulo: b.bairro, valor: b.pessoas }))} /></Bloco>}
      {p.gostos_musica.length > 0 && <Bloco titulo="Música preferida"><Barras sufixo="%" linhas={p.gostos_musica.map((g) => ({ rotulo: g.valor, valor: g.pct }))} /></Bloco>}
      {p.gostos_experiencia.length > 0 && <Bloco titulo="Tipo de rolê"><Barras sufixo="%" linhas={p.gostos_experiencia.map((g) => ({ rotulo: g.valor, valor: g.pct }))} /></Bloco>}
      <Bloco titulo="Ingressos"><Numeros itens={[['Vendidos', p.ingressos.vendidos], ['Ingresso médio', p.ingressos.preco_medio_centavos ? (p.ingressos.preco_medio_centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '–']]} /></Bloco>
    </Pagina>
  );
}
