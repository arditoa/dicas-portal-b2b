'use client';
// Quadro "Para onde cada clique vai" — aba Categorias do /admin (nov/2026).
// Só leitura: explica, em linguagem simples, o que acontece quando a pessoa toca em cada banner/cartão do app
// e onde você muda isso. A parte "Patrocínio Master hoje" lê o banco ao vivo (categoria_patrocinio).
// Regras conferidas no código do app: VitrineCategoria.tsx, BannerMaster.tsx, BannersHome.tsx e (tabs)/index.tsx.
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Linha = { onde: string; o_que: string; vai: string; editar: string };

const GRUPOS: { titulo: string; cor: string; linhas: Linha[] }[] = [
  {
    titulo: 'Home',
    cor: '#E1306C',
    linhas: [
      { onde: 'Banner rotativo do topo — Museu', o_que: 'Cartão fixo, sempre no começo', vai: 'Página do Museu da Diversidade (apoiador)', editar: 'Fixo no app (precisa de atualização do app para mudar)' },
      { onde: 'Banner rotativo do topo — Dicas Trip', o_que: 'Cartão fixo, sempre no começo', vai: 'Aba Dicas Trip', editar: 'Fixo no app' },
      { onde: 'Banner rotativo do topo — Fundadores', o_que: '12 vagas, 4 por vez, troca a cada hora (ordem automática)', vai: 'Perfil do local Fundador', editar: 'Frase do banner: Locais › Comunicação do Fundador' },
      { onde: 'Quadradinhos de Fundadores (abaixo da busca)', o_que: 'Fundadores e patrocinados', vai: 'Perfil do local', editar: 'Quem aparece: plano/selo do local' },
      { onde: 'Banners de parceiros', o_que: 'Banners da aba Banners', vai: 'O destino escrito em cada banner (perfil, tela do app ou link)', editar: 'Aba Banners › campo "Para onde leva"' },
    ],
  },
  {
    titulo: 'Destaques (Fundadores)',
    cor: '#FFD54F',
    linhas: [
      { onde: 'Faixa Patrocínio Master', o_que: '1 vaga, faixa grande do topo', vai: 'O destino definido na faixa (perfil, tela ou link)', editar: 'Categorias › Destaques › Patrocínio Master' },
      { onde: 'Banner Fundador', o_que: '12 vagas, 4 por vez, troca a cada hora', vai: 'Link de Comunicação do local; sem link, o perfil dele', editar: 'Vaga: Locais › Posição no app. Link: Comunicação do local' },
      { onde: 'Cupons / ofertas', o_que: 'Quadradinhos, 6 por vez', vai: 'Perfil do local', editar: 'Vaga: Posição no app' },
    ],
  },
  {
    titulo: 'Cada categoria (Bares, Festas, Serviços, Turismo…)',
    cor: '#7E57C2',
    linhas: [
      { onde: 'Patrocínio Master', o_que: '1 faixa grande, logo abaixo da busca', vai: 'O destino definido na faixa (perfil, tela ou link)', editar: 'Categorias › escolha a categoria › Patrocínio Master' },
      { onde: 'Banner Premium', o_que: '12 vagas, 4 por vez, troca a cada hora', vai: 'Link de Comunicação do local; sem link, o perfil dele', editar: 'Vaga: Locais › Posição no app (um quadro por página)' },
      { onde: 'Subcategorias (ícones redondos)', o_que: 'Atalhos da categoria', vai: 'Filtra a lista daquela subcategoria', editar: 'Categorias › Subcategorias (liga/desliga)' },
      { onde: 'Cupons (quadradinhos)', o_que: '24 posições, 6 por vez (Premium/Fundador a cada 10 min, Intermediário a cada 30 min)', vai: 'Perfil do local', editar: 'Vaga: Locais › Posição no app' },
      { onde: 'Lista de locais', o_que: 'Cartões da categoria', vai: 'Perfil do local', editar: 'Categoria/subcategoria: Locais › Posição no app' },
    ],
  },
];

type Master = { categoria: string; titulo: string | null; destino: string | null; ativo: boolean; local_id: string | null };

function descreveDestino(d: string | null): string {
  if (!d) return 'sem destino definido';
  if (d.startsWith('local:')) return 'perfil de um local';
  if (d.startsWith('http')) return `link externo (${d.replace(/^https?:\/\//, '').slice(0, 40)})`;
  return `tela do app (${d})`;
}

export default function QuadroCliques() {
  const [aberto, setAberto] = useState(false);
  const [masters, setMasters] = useState<Master[] | null>(null);

  useEffect(() => {
    if (!aberto || masters) return;
    (async () => {
      const { data } = await supabase.from('categoria_patrocinio').select('categoria, titulo, destino, ativo, local_id').order('categoria');
      setMasters(((data as any[]) || []) as Master[]);
    })();
  }, [aberto, masters]);

  return (
    <div className="bg-[#161520] border border-[#232230] rounded-2xl mb-6 overflow-hidden">
      <button type="button" onClick={() => setAberto((a) => !a)} className="w-full flex items-center justify-between gap-3 text-left p-4">
        <span>
          <span className="block text-sm font-black text-white">Para onde cada clique vai</span>
          <span className="block text-[11px] text-[#A0A0B2]">Fundadores, Patrocínio Master, banners e cupons — o que abre ao tocar e onde você muda.</span>
        </span>
        <ChevronDown size={18} className={`text-[#A0A0B2] shrink-0 transition ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-5">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <p className="text-xs font-black mb-2" style={{ color: g.cor }}>{g.titulo}</p>
              <div className="space-y-2">
                {g.linhas.map((l) => (
                  <div key={l.onde} className="bg-[#13121A] border border-[#232230] rounded-xl p-3">
                    <p className="text-xs font-bold text-white">{l.onde}</p>
                    <p className="text-[11px] text-[#A0A0B2] mt-0.5">{l.o_que}</p>
                    <p className="text-[12px] text-white mt-2"><span className="text-[#E1306C] font-bold">Ao tocar:</span> {l.vai}</p>
                    <p className="text-[11px] text-[#A0A0B2] mt-1"><span className="font-bold text-[#C9C9D6]">Onde mudar:</span> {l.editar}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="text-xs font-black mb-2 text-[#4CAF7D]">Patrocínio Master hoje (ao vivo)</p>
            {!masters ? (
              <p className="text-[11px] text-[#A0A0B2]">Carregando…</p>
            ) : masters.length === 0 ? (
              <p className="text-[11px] text-[#A0A0B2]">Nenhum Patrocínio Master cadastrado ainda.</p>
            ) : (
              <div className="space-y-1.5">
                {masters.map((m) => (
                  <div key={m.categoria} className="flex flex-wrap items-baseline justify-between gap-2 bg-[#13121A] border border-[#232230] rounded-xl px-3 py-2">
                    <span className="text-xs font-bold text-white">{m.categoria}{!m.ativo && <span className="text-[#A0A0B2] font-normal"> (desligado)</span>}</span>
                    <span className="text-[11px] text-[#C9C9D6]">{m.titulo || '—'} → {descreveDestino(m.destino)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
