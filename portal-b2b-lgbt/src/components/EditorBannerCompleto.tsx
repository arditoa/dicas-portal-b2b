'use client';
// Rodada 141 — editor de UM banner (frase, botão, foto e visual) com prévia. Usado para o banner da Home do
// Fundador quando ele quer dizeres diferentes dos da categoria (destaque_chamada.home, migration 096).
import { supabase } from '../lib/supabase';
import { erroFotoNaoSuportada } from '../lib/validarFoto';
import { useState } from 'react';
import EditorEstiloBanner, { EstiloValor } from './EditorEstiloBanner';

export type BannerValor = EstiloValor & { chamada: string; cta: string; imagem_url: string };
export const BANNER_VAZIO: BannerValor = {
  chamada: '', cta: 'Conhecer', imagem_url: '',
  estilo: 'degrade', cor1: null, cor2: null, cor_texto: null, destaque_texto: '', cor_destaque: null,
};

// Lê o jsonb `home` do banco para o formato do editor.
export function bannerDeJson(j: any): BannerValor | null {
  if (!j || typeof j !== 'object') return null;
  return {
    chamada: j.chamada || '', cta: j.cta || 'Conhecer', imagem_url: j.imagem_url || '',
    estilo: j.estilo || (j.imagem_url ? 'foto_metade' : 'degrade'),
    cor1: j.cor1 ?? null, cor2: j.cor2 ?? null, cor_texto: j.cor_texto ?? null,
    destaque_texto: j.destaque_texto || '', cor_destaque: j.cor_destaque ?? null,
  };
}
export function bannerParaJson(b: BannerValor) {
  return {
    chamada: b.chamada.trim(), cta: b.cta.trim() || 'Conhecer', imagem_url: b.imagem_url || null,
    estilo: b.estilo, cor1: b.cor1, cor2: b.cor2, cor_texto: b.cor_texto,
    destaque_texto: b.destaque_texto.trim() || null, cor_destaque: b.cor_destaque,
  };
}

export default function EditorBannerCompleto({
  valor, onChange, localId, etiquetaHome, rotuloCategoria, onErro,
}: {
  valor: BannerValor;
  onChange: (v: BannerValor) => void;
  localId: string;
  etiquetaHome?: string | null;
  rotuloCategoria?: string;
  onErro?: (m: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const metade = !!valor.imagem_url && (valor.estilo === 'foto_metade' || valor.estilo === 'foto_esquerda');
  const limite = metade ? 60 : 90;
  const enviar = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    const problema = erroFotoNaoSuportada(arquivo);
    if (problema) { onErro?.(problema); return; }
    setEnviando(true);
    const ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
    const caminho = `${localId}/banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('fotos-locais').upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    setEnviando(false);
    if (error) { onErro?.(`Não deu para enviar a foto: ${error.message}`); return; }
    const url = supabase.storage.from('fotos-locais').getPublicUrl(caminho).data.publicUrl;
    onChange({ ...valor, imagem_url: url, estilo: valor.estilo === 'degrade' ? 'foto_metade' : valor.estilo });
  };
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-2">
        <div>
          <input value={valor.chamada} maxLength={limite} onChange={(e) => onChange({ ...valor, chamada: e.target.value })}
            placeholder="Frase do banner" className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2" />
          <p className="text-[10px] text-[#626274] mt-0.5">{valor.chamada.length}/{limite}{metade ? ' (foto em meio banner: até 60)' : ''}</p>
        </div>
        <input value={valor.cta} maxLength={24} onChange={(e) => onChange({ ...valor, cta: e.target.value })}
          placeholder="Texto do botão" className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2 h-fit" />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-bold text-[#E1306C] cursor-pointer hover:underline">
          {enviando ? 'Enviando...' : valor.imagem_url ? 'Trocar foto do banner' : 'Subir foto do banner'}
          <input type="file" accept="image/*" className="hidden" disabled={enviando} onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {valor.imagem_url && <button type="button" onClick={() => onChange({ ...valor, imagem_url: '', estilo: 'degrade' })} className="text-xs font-bold text-[#A0A0B2] hover:underline">Tirar foto</button>}
      </div>
      <EditorEstiloBanner
        valor={valor}
        onChange={(e) => onChange({ ...valor, ...e })}
        chamada={valor.chamada}
        cta={valor.cta}
        foto={valor.imagem_url}
        etiquetaHome={etiquetaHome}
        rotuloCategoria={rotuloCategoria}
        soHome={!!etiquetaHome && !rotuloCategoria}
        soCategoria={!etiquetaHome}
      />
    </div>
  );
}
