'use client';
// Rodada 137 — banner do parceiro dentro da ficha do /admin. Grava em destaque_chamada, a mesma tabela que o parceiro
// edita no portal (Destaques e resultados) e que o app lê em buscarComunicacao (src/lib/vitrine.ts).
// Rodada 140 — visual: fundo (degradê ou foto à direita/esquerda/de fundo), cor dos dizeres e palavra de impacto.
// Rodada 141 — banner padrão + versões por lugar (Home, cada categoria, Destaques) em destaque_chamada.variantes.
import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BANNER_VAZIO, BannerValor, bannerDeJson, bannerParaJson } from './EditorBannerCompleto';
import EditorBannerCompleto from './EditorBannerCompleto';
import VariantesBanner, { LugarBanner, lugaresDoLocal } from './VariantesBanner';

type Props = {
  localId: string;
  nome: string;
  etiqueta?: string;
  temBanner: boolean; // plano Fundador ou Premium ativo
  ondeAparece: string;
  ehFundador?: boolean;
  categoriaRotulo?: string;
  categoria?: string; // locais.categoria (para saber em quais páginas o banner gira)
};

const COLS_TODAS = 'chamada, cta, imagem_url, estilo, cor1, cor2, cor_texto, destaque_texto, cor_destaque, variantes';
const COLS_095 = 'chamada, cta, imagem_url, estilo, cor1, cor2, cor_texto, destaque_texto, cor_destaque';

export default function BannerDestaqueAdmin({ localId, nome, temBanner, ondeAparece, ehFundador = false, categoriaRotulo = '', categoria = '' }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [padrao, setPadrao] = useState<BannerValor>(BANNER_VAZIO);
  const [variantes, setVariantes] = useState<Record<string, BannerValor>>({});
  const [lugares, setLugares] = useState<LugarBanner[]>([]);
  const [nivel, setNivel] = useState<'todas' | '095' | 'basico'>('todas');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let n: 'todas' | '095' | 'basico' = 'todas';
      let r: any = await supabase.from('destaque_chamada').select(COLS_TODAS).eq('local_id', localId).maybeSingle();
      if (r.error) { n = '095'; r = await supabase.from('destaque_chamada').select(COLS_095).eq('local_id', localId).maybeSingle(); }
      if (r.error) { n = 'basico'; r = await supabase.from('destaque_chamada').select('chamada, cta, imagem_url').eq('local_id', localId).maybeSingle(); }
      const ls = await lugaresDoLocal(localId, categoria, ehFundador);
      if (!vivo) return;
      setNivel(n);
      setLugares(ls);
      const d = r.data as any;
      if (d) {
        setPadrao(bannerDeJson(d) || BANNER_VAZIO);
        const v: Record<string, BannerValor> = {};
        for (const [k, j] of Object.entries((d.variantes || {}) as Record<string, unknown>)) {
          const b = bannerDeJson(j);
          if (b) v[k] = b;
        }
        setVariantes(v);
      }
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [localId, categoria, ehFundador]);

  const salvar = async () => {
    if (!padrao.chamada.trim()) { setMsg({ tipo: 'erro', texto: 'Escreva a frase do banner padrão.' }); return; }
    const semFrase = Object.entries(variantes).find(([, v]) => !v.chamada.trim());
    if (semFrase) { setMsg({ tipo: 'erro', texto: `Escreva a frase do banner de ${lugares.find((l) => l.chave === semFrase[0])?.rotulo || semFrase[0]} (ou desmarque).` }); return; }
    setSalvando(true); setMsg(null);
    const j = bannerParaJson(padrao);
    let dados: Record<string, unknown> = { local_id: localId, chamada: j.chamada, cta: j.cta, imagem_url: j.imagem_url, ativo: true, escrito_por: 'equipe' };
    if (nivel !== 'basico') dados = { ...dados, estilo: j.estilo, cor1: j.cor1, cor2: j.cor2, cor_texto: j.cor_texto, destaque_texto: j.destaque_texto, cor_destaque: j.cor_destaque };
    if (nivel === 'todas') {
      const vs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(variantes)) if (lugares.some((l) => l.chave === k)) vs[k] = bannerParaJson(v);
      dados = { ...dados, variantes: Object.keys(vs).length ? vs : null };
    }
    const { error } = await supabase.from('destaque_chamada').upsert(dados);
    setSalvando(false);
    setMsg(error ? { tipo: 'erro', texto: error.message }
      : { tipo: 'ok', texto: nivel === 'todas' ? 'Banner salvo. Já aparece no app.' : 'Salvo. Para guardar cores e banners por lugar, rode as migrations 095 e 096 no Supabase.' });
  };

  if (carregando) return <div className="text-xs text-[#626274] flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Carregando banner...</div>;

  return (
    <div id={`banner-${localId}`} className="border border-[#E1306C]/40 bg-[#E1306C]/5 rounded-xl p-3 space-y-3 scroll-mt-24">
      <div>
        <p className="text-xs font-bold text-[#D0D0E0]">Banners deste local {ehFundador ? '(Fundador)' : '(Premium)'}</p>
        <p className="text-[10px] text-[#A0A0B2]">
          São os cartões grandes que giram {ondeAparece}. Não usam a capa nem o logo.
          {!temBanner && <span className="text-amber-300"> Este local não tem plano Fundador ou Premium ativo: o banner fica guardado e só aparece quando o plano for ativado.</span>}
        </p>
      </div>

      <p className="text-xs font-bold text-[#D0D0E0] -mb-1">Banner padrão (vale em todos os lugares)</p>
      <EditorBannerCompleto
        valor={padrao}
        onChange={setPadrao}
        localId={localId}
        etiquetaHome={ehFundador ? nome : null}
        rotuloCategoria={categoriaRotulo || ' '}
        onErro={(m) => setMsg({ tipo: 'erro', texto: m })}
      />

      {nivel === 'todas'
        ? <VariantesBanner lugares={lugares} padrao={padrao} variantes={variantes} onChange={setVariantes} localId={localId} nome={nome} onErro={(m) => setMsg({ tipo: 'erro', texto: m })} />
        : lugares.length > 1 && <p className="text-[11px] text-amber-300">Para ter um banner diferente na Home ou em cada categoria, rode a migration 096 no Supabase.</p>}

      <div className="flex items-center gap-3">
        <button type="button" onClick={salvar} disabled={salvando} className="bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-40">
          <Save size={12} /> {salvando ? 'Salvando...' : 'Salvar banner'}
        </button>
        {msg && <p className={`text-[11px] ${msg.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.texto}</p>}
      </div>
    </div>
  );
}
