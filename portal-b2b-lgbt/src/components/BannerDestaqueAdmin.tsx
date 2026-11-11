'use client';
// Rodada 137 — banner do parceiro dentro da ficha do /admin. Grava em destaque_chamada (chamada, botão, imagem_url),
// a mesma tabela que o parceiro edita no portal (Destaques e resultados) e que o app lê em buscarComunicacao.
// Rodada 140 — visual escolhido aqui: fundo (degradê nas cores do app ou foto à direita/esquerda/de fundo),
// cor dos dizeres e palavra de impacto com cor própria (EditorEstiloBanner). Colunas da migration 095.
import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { erroFotoNaoSuportada } from '../lib/validarFoto';
import EditorEstiloBanner, { ESTILO_VAZIO, EstiloValor } from './EditorEstiloBanner';

type Props = {
  localId: string;
  nome: string;
  etiqueta?: string;
  temBanner: boolean; // plano Fundador ou Premium ativo
  ondeAparece: string;
  ehFundador?: boolean;
  categoriaRotulo?: string;
};

export default function BannerDestaqueAdmin({ localId, nome, temBanner, ondeAparece, ehFundador = false, categoriaRotulo = '' }: Props) {
  const [carregando, setCarregando] = useState(true);
  const [chamada, setChamada] = useState('');
  const [cta, setCta] = useState('Conhecer');
  const [foto, setFoto] = useState('');
  const [estilo, setEstilo] = useState<EstiloValor>(ESTILO_VAZIO);
  const [temColunasEstilo, setTemColunasEstilo] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let r: any = await supabase.from('destaque_chamada').select('chamada, cta, imagem_url, estilo, cor1, cor2, cor_texto, destaque_texto, cor_destaque').eq('local_id', localId).maybeSingle();
      if (r.error) {
        setTemColunasEstilo(false);
        r = await supabase.from('destaque_chamada').select('chamada, cta, imagem_url').eq('local_id', localId).maybeSingle();
      }
      if (!vivo) return;
      const d = r.data as any;
      if (d) {
        setChamada(d.chamada || '');
        setCta(d.cta || 'Conhecer');
        setFoto(d.imagem_url || '');
        setEstilo({
          estilo: d.estilo || (d.imagem_url ? 'foto_metade' : 'degrade'),
          cor1: d.cor1 ?? null, cor2: d.cor2 ?? null, cor_texto: d.cor_texto ?? null,
          destaque_texto: d.destaque_texto || '', cor_destaque: d.cor_destaque ?? null,
        });
      }
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [localId]);

  const metade = foto && (estilo.estilo === 'foto_metade' || estilo.estilo === 'foto_esquerda');
  const limite = metade ? 60 : 90;

  const enviarFoto = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    const problema = erroFotoNaoSuportada(arquivo);
    if (problema) { setMsg({ tipo: 'erro', texto: problema }); return; }
    setEnviando(true); setMsg(null);
    const ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
    const caminho = `${localId}/banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('fotos-locais').upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    setEnviando(false);
    if (error) { setMsg({ tipo: 'erro', texto: `Não deu para enviar a foto: ${error.message}` }); return; }
    setFoto(supabase.storage.from('fotos-locais').getPublicUrl(caminho).data.publicUrl);
    if (estilo.estilo === 'degrade') setEstilo((e) => ({ ...e, estilo: 'foto_metade' }));
    setMsg({ tipo: 'ok', texto: 'Foto enviada. Escolha onde ela fica e clique em "Salvar banner".' });
  };

  const salvar = async () => {
    if (!chamada.trim()) { setMsg({ tipo: 'erro', texto: 'Escreva a frase do banner.' }); return; }
    if (chamada.trim().length > limite) { setMsg({ tipo: 'erro', texto: `Com foto em meio banner, a frase precisa ter até ${limite} caracteres.` }); return; }
    setSalvando(true); setMsg(null);
    const base: Record<string, unknown> = { local_id: localId, chamada: chamada.trim(), cta: cta.trim() || 'Conhecer', imagem_url: foto || null, ativo: true, escrito_por: 'equipe' };
    const completo = temColunasEstilo
      ? { ...base, estilo: estilo.estilo, cor1: estilo.cor1, cor2: estilo.cor2, cor_texto: estilo.cor_texto, destaque_texto: estilo.destaque_texto.trim() || null, cor_destaque: estilo.cor_destaque }
      : base;
    const { error } = await supabase.from('destaque_chamada').upsert(completo);
    setSalvando(false);
    setMsg(error ? { tipo: 'erro', texto: error.message } : { tipo: 'ok', texto: temColunasEstilo ? 'Banner salvo. Já aparece no app.' : 'Frase e foto salvas. Para salvar cores e estilo, rode a migration 095 no Supabase.' });
  };

  if (carregando) return <div className="text-xs text-[#626274] flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Carregando banner...</div>;

  return (
    <div id={`banner-${localId}`} className="border border-[#E1306C]/40 bg-[#E1306C]/5 rounded-xl p-3 space-y-3 scroll-mt-24">
      <div>
        <p className="text-xs font-bold text-[#D0D0E0]">Banners deste local {ehFundador ? '(Fundador)' : '(Premium)'}</p>
        <p className="text-[10px] text-[#A0A0B2]">
          São os cartões grandes que giram {ondeAparece}. Uma frase, uma foto e um visual valem para todos. Não usam a capa nem o logo.
          {!temBanner && <span className="text-amber-300"> Este local não tem plano Fundador ou Premium ativo: o banner fica guardado e só aparece quando o plano for ativado.</span>}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        <div>
          <input value={chamada} maxLength={limite} onChange={(e) => setChamada(e.target.value)}
            placeholder="Frase do banner. Ex.: Já conhece o nosso famoso drink Vezpa Queen?"
            className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2" />
          <p className="text-[10px] text-[#626274] mt-0.5">{chamada.length}/{limite}{metade ? ' (foto em meio banner: até 60)' : ''}</p>
        </div>
        <input value={cta} maxLength={24} onChange={(e) => setCta(e.target.value)} placeholder="Texto do botão. Ex.: Quero provar"
          className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2 h-fit" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-bold text-[#E1306C] cursor-pointer hover:underline">
          {enviando ? 'Enviando...' : foto ? 'Trocar foto do banner' : 'Subir foto do banner'}
          <input type="file" accept="image/*" className="hidden" disabled={enviando} onChange={(e) => { enviarFoto(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {foto && <button type="button" onClick={() => { setFoto(''); setEstilo((e) => ({ ...e, estilo: 'degrade' })); }} className="text-xs font-bold text-[#A0A0B2] hover:underline">Tirar foto</button>}
        <span className="text-[10px] text-[#626274]">Foto boa: sem letras, com o drink, prato, pessoas ou ambiente no centro.</span>
      </div>

      <EditorEstiloBanner valor={estilo} onChange={setEstilo} chamada={chamada} cta={cta} foto={foto} etiquetaHome={ehFundador ? nome : null} rotuloCategoria={categoriaRotulo} />

      <div className="flex items-center gap-3">
        <button type="button" onClick={salvar} disabled={salvando} className="bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-40">
          <Save size={12} /> {salvando ? 'Salvando...' : 'Salvar banner'}
        </button>
        {msg && <p className={`text-[11px] ${msg.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.texto}</p>}
      </div>
    </div>
  );
}
