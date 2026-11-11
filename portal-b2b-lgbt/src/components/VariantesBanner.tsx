'use client';
// Rodada 141 — banner diferente em cada lugar onde o local aparece (destaque_chamada.variantes, migration 096).
// O banner "padrão" (colunas de destaque_chamada) vale em todos os lugares; aqui a pessoa liga, por lugar,
// "Usar um banner diferente em <lugar>" e edita frase, botão, foto e visual só daquele lugar.
// Usado no /admin (ficha do local) e no portal do parceiro (Destaques e resultados).
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import EditorBannerCompleto, { BannerValor } from './EditorBannerCompleto';

export type LugarBanner = { chave: string; rotulo: string; ehHome?: boolean };

// Categoria do banco (locais.categoria) -> página do app onde o banner gira.
export const PAGINA_DA_CATEGORIA: Record<string, { slug: string; rotulo: string }> = {
  lugares: { slug: 'bares', rotulo: 'Bares & Noite' },
  eventos: { slug: 'festas', rotulo: 'Festas' },
  gastronomia: { slug: 'gastronomia', rotulo: 'Gastronomia' },
  cultura: { slug: 'cultura', rotulo: 'Cultura' },
  turismo: { slug: 'turismo', rotulo: 'Dicas Trip' },
  servicos: { slug: 'servicos', rotulo: 'Serviços' },
  produtos: { slug: 'produtos', rotulo: 'Moda & Acessórios' },
  artistas: { slug: 'artistas', rotulo: 'Artistas' },
  beleza: { slug: 'beleza', rotulo: 'Beleza' },
  mais18: { slug: 'mais18', rotulo: 'Espaços 18+' },
  saude: { slug: 'saude', rotulo: 'Saúde & Bem-estar' },
  educacao: { slug: 'educacao', rotulo: 'Educação' },
  lazer: { slug: 'lazer', rotulo: 'Lazer' },
  lojas: { slug: 'lojas', rotulo: 'Lojas' },
};

// Lugares onde o banner deste local gira: Home e Destaques (Fundador), categoria principal e categorias extras.
export async function lugaresDoLocal(localId: string, categoria: string, ehFundador: boolean): Promise<LugarBanner[]> {
  const lugares: LugarBanner[] = [];
  if (ehFundador) lugares.push({ chave: 'home', rotulo: 'Home (Membros Fundadores)', ehHome: true });
  const principal = PAGINA_DA_CATEGORIA[categoria];
  if (principal) lugares.push({ chave: `cat:${principal.slug}`, rotulo: `Categoria ${principal.rotulo}` });
  try {
    const { data } = await supabase.from('local_categorias_extra').select('categoria').eq('local_id', localId);
    for (const r of (data as { categoria: string }[]) || []) {
      const p = PAGINA_DA_CATEGORIA[r.categoria];
      if (p && !lugares.some((l) => l.chave === `cat:${p.slug}`)) lugares.push({ chave: `cat:${p.slug}`, rotulo: `Categoria ${p.rotulo}` });
    }
  } catch { /* sem a tabela de categorias extras: segue */ }
  if (ehFundador) lugares.push({ chave: 'cat:destaques', rotulo: 'Categoria Destaques' });
  return lugares;
}

export default function VariantesBanner({
  lugares, padrao, variantes, onChange, localId, nome, onErro,
}: {
  lugares: LugarBanner[];
  padrao: BannerValor;
  variantes: Record<string, BannerValor>;
  onChange: (v: Record<string, BannerValor>) => void;
  localId: string;
  nome: string;
  onErro?: (m: string) => void;
}) {
  // Rodada 142 — uma aba por lugar (pedido da Andrea: "editar separadamente"). Cada aba mostra se usa o padrão
  // ou um banner próprio; "Personalizar" copia o padrão para começar e "Voltar ao padrão" apaga a versão do lugar.
  const [aba, setAba] = useState<string>(lugares[0]?.chave || '');
  if (lugares.length < 2) return null;
  const lugar = lugares.find((l) => l.chave === aba) || lugares[0];
  const ligado = !!variantes[lugar.chave];
  return (
    <div className="border-t border-[#E1306C]/30 pt-3 space-y-3">
      <div>
        <p className="text-xs font-bold text-[#D0D0E0]">Editar cada lugar separadamente</p>
        <p className="text-[11px] text-[#A0A0B2]">
          Escolha o lugar. Sem personalizar, ele usa o banner padrão acima.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {lugares.map((l) => {
          const proprio = !!variantes[l.chave];
          const ativa = l.chave === lugar.chave;
          return (
            <button
              key={l.chave}
              type="button"
              onClick={() => setAba(l.chave)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${ativa ? 'bg-[#E1306C] border-[#E1306C] text-white' : 'border-[#2E2E3D] text-[#D0D0E0] hover:border-[#E1306C]/60'}`}
            >
              {l.rotulo.replace('Categoria ', '')}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${proprio ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-[#A0A0B2]'}`}>
                {proprio ? 'próprio' : 'padrão'}
              </span>
            </button>
          );
        })}
      </div>
      <div className={`rounded-xl border p-3 space-y-3 ${ligado ? 'border-[#E1306C]/50' : 'border-[#232230]'}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-[#D0D0E0]">{lugar.rotulo}</p>
          {ligado ? (
            <button
              type="button"
              className="text-[11px] font-bold text-[#A0A0B2] hover:text-white"
              onClick={() => { const novo = { ...variantes }; delete novo[lugar.chave]; onChange(novo); }}
            >
              Voltar ao padrão
            </button>
          ) : (
            <button
              type="button"
              className="text-[11px] font-bold text-white bg-[#E1306C] hover:bg-[#C2285C] px-3 py-1.5 rounded-lg"
              onClick={() => onChange({ ...variantes, [lugar.chave]: { ...padrao } })}
            >
              Personalizar este lugar
            </button>
          )}
        </div>
        {ligado ? (
          <EditorBannerCompleto
            valor={variantes[lugar.chave]}
            onChange={(v) => onChange({ ...variantes, [lugar.chave]: v })}
            localId={localId}
            etiquetaHome={lugar.ehHome || lugar.chave === 'cat:destaques' ? nome : null}
            rotuloCategoria={lugar.ehHome ? '' : lugar.rotulo.replace('Categoria ', '')}
            onErro={onErro}
          />
        ) : (
          <p className="text-[11px] text-[#A0A0B2]">Usando o banner padrão. Toque em "Personalizar este lugar" para trocar frase, foto e cores só aqui.</p>
        )}
      </div>
    </div>
  );
}
