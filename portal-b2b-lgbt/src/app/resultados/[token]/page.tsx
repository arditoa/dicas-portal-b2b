'use client';
// Resultados ao vivo de uma ação de marca (migração 144), pelo link que a equipe Dicas manda para a marca. Sem login.
// Atualiza a cada 60 s. Mesmas proteções do relatório: perfil só com 30+ pessoas, grupos com menos de 10 fora.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Barras, Bloco, Numeros, Pagina } from '../../../components/RelatorioVisual';

type Grupo = { valor: string; n: number | string };
type R = {
  acao: { marca: string; nome: string; inicio: string; fim: string; brinde: string | null; limite_total: number | null; casas: string[] };
  contagem: { feitos: number; restam: number | null };
  relatorio: { funil: Record<string, number | string>; custo_por_presenca: number | null; aceitam_ofertas_de_marcas: number | string;
    pesquisa: { pergunta: string; responderam: number | string; respostas: Grupo[] } | null;
    perfil: { status: string; idade?: Record<string, number | string>; chegada_hora?: { hora: number; n: number | string }[]; genero?: { grupos: Grupo[] } } };
  questionario: { responderam: number | string; perguntas: { texto: string; tipo: string; responderam: number | string; opcoes?: Grupo[]; media?: number | null; promotores?: number | null; detratores?: number | null }[] } | null;
  escolhas: { pergunta: string; total: number; opcoes?: Grupo[] } | null;
  fotos: Record<string, number> | null;
  gerado_em: string;
};
const data = (d: string) => d.split('-').reverse().join('/');

export default function ResultadosMarca() {
  const { token } = useParams<{ token: string }>();
  const [r, setR] = useState<R | null | undefined>(undefined);
  useEffect(() => {
    const ler = async () => { const { data: d, error } = await supabase.rpc('resultado_para_marca', { p_token: token }); setR(error ? null : ((d as R) || null)); };
    void ler();
    const t = setInterval(ler, 60000);
    return () => clearInterval(t);
  }, [token]);

  if (r === undefined) return <Pagina selo="DICAS LGBT+ · RESULTADOS" titulo="Carregando…">{null}</Pagina>;
  if (r === null) return <Pagina selo="DICAS LGBT+ · RESULTADOS" titulo="Link inválido ou vencido" sub="Peça um link novo à equipe Dicas LGBT+.">{null}</Pagina>;
  const f = r.relatorio?.funil || {};
  const p = r.relatorio?.perfil;
  return (
    <Pagina selo="DICAS LGBT+ · RESULTADOS AO VIVO" titulo={`${r.acao.marca} · ${r.acao.nome}`}
      sub={`${data(r.acao.inicio)} a ${data(r.acao.fim)}${r.acao.casas.length ? ` · ${r.acao.casas.join(', ')}` : ''} · atualizado ${new Date(r.gerado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}>
      <Bloco titulo={r.acao.brinde ? `Provas: ${r.acao.brinde}` : 'Participação'}>
        <Numeros itens={[['Entregues', r.contagem.feitos], ['Restam', r.contagem.restam ?? 'sem limite'], ['Pessoas que foram', f.pessoas_que_foram], ['Custo por presença', r.relatorio.custo_por_presenca != null ? `R$ ${r.relatorio.custo_por_presenca}` : '–']]} />
      </Bloco>
      <Bloco titulo="Funil">
        <Barras linhas={[
          { rotulo: 'Viram o banner', valor: f.banner_exibicoes as number }, { rotulo: 'Visitas à festa', valor: f.festa_visitas as number },
          { rotulo: 'Cliques', valor: f.banner_cliques as number }, { rotulo: '"Eu vou"', valor: f.eu_vou as number },
          { rotulo: 'Cupons usados', valor: f.cupons_usados as number }, { rotulo: 'Foram à casa', valor: f.pessoas_que_foram as number },
        ]} />
        <p className="text-xs text-[#A0A0B2] mt-3">Aceitam ofertas de marcas: {String(r.relatorio.aceitam_ofertas_de_marcas)}</p>
      </Bloco>
      {r.escolhas && r.escolhas.opcoes && (
        <Bloco titulo={r.escolhas.pergunta}><Barras linhas={r.escolhas.opcoes.map((o) => ({ rotulo: o.valor, valor: o.n }))} /></Bloco>
      )}
      {r.relatorio.pesquisa && (
        <Bloco titulo={`Pesquisa · ${r.relatorio.pesquisa.pergunta}`}><Barras linhas={r.relatorio.pesquisa.respostas.map((o) => ({ rotulo: o.valor, valor: o.n }))} /></Bloco>
      )}
      {r.questionario?.perguntas?.map((q, i) => (
        <Bloco key={i} titulo={`Questionário · ${q.texto}`}>
          {q.tipo === 'escolha' && q.opcoes && <Barras linhas={q.opcoes.map((o) => ({ rotulo: o.valor, valor: o.n }))} />}
          {q.tipo === 'nota' && <Numeros itens={[['Nota média', q.media], ['Promotores', q.promotores != null ? `${q.promotores}%` : '–'], ['Detratores', q.detratores != null ? `${q.detratores}%` : '–'], ['Responderam', q.responderam]]} />}
          {q.tipo === 'aberta' && <p className="text-sm text-[#A0A0B2]">{String(q.responderam)} respostas abertas. A equipe Dicas envia o resumo.</p>}
        </Bloco>
      ))}
      {r.fotos && <Bloco titulo="Fotos"><Numeros itens={Object.entries(r.fotos).slice(0, 4).map(([k, v]) => [k.replace(/_/g, ' '), v])} /></Bloco>}
      <Bloco titulo="Perfil de quem participou">
        {p?.status !== 'ok' ? <p className="text-sm text-[#A0A0B2]">O perfil aparece a partir de 30 pessoas.</p> : (
          <div className="flex flex-col gap-6">
            {p.idade && <Barras linhas={Object.entries(p.idade).filter(([k]) => k !== 'sem_info').map(([k, v]) => ({ rotulo: `${k} anos`, valor: v as number }))} />}
            {p.chegada_hora && <Barras linhas={p.chegada_hora.filter((h) => typeof h.n === 'number').map((h) => ({ rotulo: `${h.hora}h`, valor: h.n as number }))} />}
            {!!p.genero?.grupos?.length && <Barras linhas={p.genero.grupos.map((g) => ({ rotulo: g.valor, valor: g.n }))} />}
          </div>
        )}
      </Bloco>
    </Pagina>
  );
}
