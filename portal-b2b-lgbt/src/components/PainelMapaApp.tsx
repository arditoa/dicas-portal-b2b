'use client';
// Rodada 141 — "Mapa do app" (1ª tela de Vitrine do app no /admin). Pedido da Andrea: "como saber qual roda logo no
// início com os fundadores e logo abaixo? ... deixe o portal adm o menos confuso". Mostra a Home e a página de uma
// categoria de cima para baixo, o que está no ar agora em cada parte e o botão para editar.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import EditorTopoInstitucional from './EditorTopoInstitucional';

type Parte = { n: number; nome: string; mostra: string; regra: string; aba: string; botao: string; agora?: string[] };

export default function PainelMapaApp({ onIrPara }: { onIrPara: (aba: string) => void }) {
  const [fundadores, setFundadores] = useState<string[]>([]);
  const [parceirosHome, setParceirosHome] = useState<string[]>([]);
  const [masters, setMasters] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [f, b, m] = await Promise.all([
        supabase.from('local_badges').select('locais!inner(nome, status)').ilike('rotulo', '%fundador%').eq('ativo', true).eq('locais.status', 'aprovado'),
        supabase.from('banners_app').select('tag, titulo, peso, telas, ativo').eq('ativo', true),
        supabase.from('categoria_patrocinio').select('categoria, titulo, ativo').eq('ativo', true),
      ]);
      setFundadores(Array.from(new Set(((f.data as any[]) || []).map((r) => r.locais?.nome).filter(Boolean))));
      setParceirosHome(((b.data as any[]) || []).filter((x) => (x.telas || []).includes('home')).map((x) => `${x.titulo} (chance ${x.peso})`));
      setMasters(((m.data as any[]) || []).map((x) => `${x.categoria}: ${x.titulo}`));
    })();
  }, []);

  const home: Parte[] = [
    { n: 1, nome: 'Carrossel do topo', mostra: 'Museu da Diversidade e "Viaje pelo Brasil" (sempre os primeiros) + os banners dos Membros Fundadores.', regra: 'Passa sozinho a cada 5 s. Dos Fundadores, 4 aparecem por vez e o grupo troca no rodízio.', aba: 'mapa', botao: 'Museu e Trip: logo abaixo, nesta tela · Fundadores: Membros Fundadores > Editar banner', agora: fundadores },
    { n: 2, nome: 'Carrossel logo abaixo', mostra: 'Parceiros e campanhas: Copa, Embratur, Câmara LGBT…', regra: 'Até 4. A ordem é sorteada a cada abertura: chance 2 abre na frente o dobro de vezes que chance 1. Todos aparecem.', aba: 'banners', botao: 'Banners e parceiros', agora: parceirosHome },
    { n: 3, nome: 'Ícones das categorias', mostra: 'Destaques, Bares & Noite, Festas, Serviços, Dicas Trip…', regra: 'Ordem fixa.', aba: 'categorias', botao: 'Categorias e vagas' },
    { n: 4, nome: 'Bloco "Destaques"', mostra: '1 parceiro pago (Fundador ou Premium) com foto e oferta.', regra: 'Troca a cada hora. Só plano pago.', aba: 'rodizio', botao: 'Rodízio e Destaques' },
    { n: 5, nome: 'Caixas', mostra: 'Em Alta, Recomendados, O que fazer hoje, Top da semana, Experiências, Serviços.', regra: 'Em Alta e O que fazer hoje aceitam locais escolhidos pela equipe (também sem plano). Recomendados = Selo Dicas.', aba: 'locais', botao: 'Locais e marcas > Caixas da Home' },
    { n: 6, nome: 'Rodapé', mostra: 'Logos dos Membros Fundadores passando devagar.', regra: 'Usa o logo da ficha do local.', aba: 'fundador', botao: 'Membros Fundadores' },
  ];
  const categoria: Parte[] = [
    { n: 1, nome: 'Patrocínio Master', mostra: 'Faixa fixa com foto de fundo (ex.: "Bares by Vezpa"). 1 por categoria.', regra: 'Sempre no topo.', aba: 'categorias', botao: 'Categorias e vagas', agora: masters },
    { n: 2, nome: 'Carrossel da categoria', mostra: 'Banners dos Premium e Fundadores da categoria + parceiros marcados para ela.', regra: '12 vagas, 4 aparecem por vez. Cada parceiro pode ter frase, foto e cores próprias para esta categoria.', aba: 'fundador', botao: 'Editar banner (ficha do local)' },
    { n: 3, nome: 'Ícones de subcategoria', mostra: 'Ex.: Botecos, Baladas, Café Bar…', regra: 'Ligar, "em breve" ou esconder.', aba: 'categorias', botao: 'Categorias e vagas' },
    { n: 4, nome: 'Ofertas (quadradinhos)', mostra: 'Cupons dos parceiros da categoria e da equipe.', regra: 'Fundador/Premium a cada 10 min, Intermediário a cada 30 min. A aba Festas não tem ofertas.', aba: 'vitrine', botao: 'Frases e desempenho > Ofertas' },
    { n: 5, nome: 'Festas em destaque (só Festas)', mostra: 'Só o flier.', regra: '6 por vez. R$ 89: 1 dia antes e no dia. Festa do plano: todo dia até a festa.', aba: 'eventos', botao: 'Festas e eventos' },
    { n: 6, nome: 'Lista de locais', mostra: 'Todos os locais da categoria. Fundador com borda de arco-íris.', regra: 'Ordem pelo plano.', aba: 'locais', botao: 'Locais e marcas' },
  ];

  const coluna = (titulo: string, partes: Parte[]) => (
    <div className="bg-[#161520] border border-[#232230] rounded-xl p-4">
      <p className="text-sm font-bold mb-3">{titulo}</p>
      <ol className="space-y-2">
        {partes.map((p) => (
          <li key={p.n} className="flex gap-3 rounded-xl border border-[#232230] p-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[#E1306C] text-white text-xs font-black flex items-center justify-center">{p.n}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{p.nome}</p>
              <p className="text-xs text-[#C9C9D6] mt-0.5">{p.mostra}</p>
              <p className="text-[11px] text-[#8888A0] mt-0.5">{p.regra}</p>
              {p.agora && p.agora.length > 0 && (
                <p className="text-[11px] text-emerald-300 mt-1">No ar agora: {p.agora.join(' · ')}</p>
              )}
              <button type="button" onClick={() => onIrPara(p.aba)} className="text-[11px] font-bold text-[#E1306C] mt-1.5 hover:underline">Editar em: {p.botao} →</button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-[#E1306C]/10 border border-[#E1306C]/40 rounded-xl p-4 text-xs text-[#F3C6D6]">
        <p className="font-bold text-white text-sm mb-1">Como ler este mapa</p>
        Cada bloco é uma parte da tela do app, na ordem em que aparece de cima para baixo. O botão leva direto para onde se edita.
        {' '}<b>Chance</b> (antes &quot;peso&quot;): vale só para os banners de parceiros. Chance 2 abre na frente o dobro de vezes que chance 1; todos aparecem, a chance só muda quem vem primeiro.
      </div>
      <EditorTopoInstitucional />
      <div className="grid lg:grid-cols-2 gap-4">
        {coluna('Tela inicial (Home)', home)}
        {coluna('Página de uma categoria (ex.: Bares, Festas)', categoria)}
      </div>
    </div>
  );
}
