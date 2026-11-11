'use client';
// Rodada 137 — banner do parceiro dentro da ficha do /admin (pedido da Andrea: "se eu for colocar uma foto no
// Churras do Fiofó, que é fundador e roda na categoria Festas, aonde seria?"). Antes a foto desse banner só
// existia em Frases e desempenho (campo de URL) e não tinha relação com a Capa ou o Logo da ficha.
// Grava em destaque_chamada (chamada, botão, imagem_url), a mesma tabela que o parceiro edita no portal
// (Destaques e resultados) e que o app lê em buscarComunicacao (src/lib/vitrine.ts).
// Com foto, o app mostra metade frase (esquerda) e metade foto (direita): o texto nunca fica sobre a foto.
import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { erroFotoNaoSuportada } from '../lib/validarFoto';

type Props = {
  localId: string;
  nome: string;
  etiqueta: string; // o que aparece na pílula do banner (nome do Fundador ou subcategoria)
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
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    supabase
      .from('destaque_chamada')
      .select('chamada, cta, imagem_url')
      .eq('local_id', localId)
      .maybeSingle()
      .then(({ data }) => {
        if (!vivo) return;
        if (data) {
          setChamada((data as any).chamada || '');
          setCta((data as any).cta || 'Conhecer');
          setFoto((data as any).imagem_url || '');
        }
        setCarregando(false);
      });
    return () => { vivo = false; };
  }, [localId]);

  const limite = foto ? 60 : 90;

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
    setMsg({ tipo: 'ok', texto: 'Foto enviada. Clique em "Salvar banner" para publicar.' });
  };

  const salvar = async () => {
    if (!chamada.trim()) { setMsg({ tipo: 'erro', texto: 'Escreva a frase do banner.' }); return; }
    if (chamada.trim().length > limite) { setMsg({ tipo: 'erro', texto: `Com foto, a frase precisa ter até ${limite} caracteres.` }); return; }
    setSalvando(true); setMsg(null);
    const { error } = await supabase.from('destaque_chamada').upsert({
      local_id: localId, chamada: chamada.trim(), cta: cta.trim() || 'Conhecer', imagem_url: foto || null, ativo: true, escrito_por: 'equipe',
    });
    setSalvando(false);
    setMsg(error ? { tipo: 'erro', texto: error.message } : { tipo: 'ok', texto: 'Banner salvo. Já aparece no app.' });
  };

  if (carregando) return <div className="text-xs text-[#626274] flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Carregando banner...</div>;

  return (
    <div id={`banner-${localId}`} className="border border-[#E1306C]/40 bg-[#E1306C]/5 rounded-xl p-3 space-y-2 scroll-mt-24">
      <p className="text-xs font-bold text-[#D0D0E0]">Banners deste local {ehFundador ? '(Fundador)' : '(Premium)'}</p>
      <p className="text-[10px] text-[#A0A0B2]">
        São os cartões grandes que giram {ondeAparece}. Uma frase e uma foto valem para todos eles. Não usam a capa nem o logo.
        {!temBanner && <span className="text-amber-300"> Este local não tem plano Fundador ou Premium ativo: o banner fica guardado, mas só aparece quando o plano for ativado.</span>}
      </p>
      <div className="grid md:grid-cols-[1fr_auto] gap-3 items-start">
        <div className="space-y-2">
          <div>
            <input
              value={chamada}
              maxLength={limite}
              onChange={(e) => setChamada(e.target.value)}
              placeholder="Frase que dá vontade de ir. Ex.: O churrasco mais animado de domingo"
              className="w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2"
            />
            <p className="text-[10px] text-[#626274] mt-0.5">{chamada.length}/{limite}{foto ? ' (com foto, até 60)' : ''}</p>
          </div>
          <input
            value={cta}
            maxLength={24}
            onChange={(e) => setCta(e.target.value)}
            placeholder="Texto do botão"
            className="w-48 bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold text-[#E1306C] cursor-pointer hover:underline">
              {enviando ? 'Enviando...' : foto ? 'Trocar foto do banner' : 'Subir foto do banner'}
              <input type="file" accept="image/*" className="hidden" disabled={enviando} onChange={(e) => { enviarFoto(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {foto && <button type="button" onClick={() => setFoto('')} className="text-xs font-bold text-[#A0A0B2] hover:underline">Tirar foto</button>}
            <button type="button" onClick={salvar} disabled={salvando} className="bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-40">
              <Save size={12} /> {salvando ? 'Salvando...' : 'Salvar banner'}
            </button>
          </div>
          <p className="text-[10px] text-[#626274]">Foto boa: sem texto escrito, com o drink, prato, pessoas ou ambiente no centro. Flier com letras fica ruim aqui (o flier é da festa, não do banner).</p>
          {msg && <p className={`text-[11px] ${msg.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.texto}</p>}
        </div>
        {/* Prévias: iguais aos banners do app (Home com o nome na etiqueta; categoria sem etiqueta) */}
        <div className="space-y-2">
          {([
            ...(ehFundador ? [{ chave: 'home', rotulo: 'Home (Membros Fundadores)', cores: '#B45309, #9D174D', pilula: true }] : []),
            { chave: 'cat', rotulo: `Categoria ${categoriaRotulo}`.trim(), cores: '#0E9F6E, #0E7490', pilula: false },
          ]).map((p) => (
            <div key={p.chave}>
              <p className="text-[10px] font-bold text-[#A0A0B2] mb-1">{p.rotulo}</p>
              <div className="relative flex h-24 w-80 max-w-full rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${p.cores})` }}>
                <div className={`${foto ? 'w-[55%]' : 'w-full pr-16'} p-3 flex flex-col justify-center gap-1`}>
                  {p.pilula && <span className="self-start text-[8px] font-black uppercase tracking-wide bg-white/20 text-white px-2 py-0.5 rounded-lg truncate max-w-full">{nome}</span>}
                  <p className={`font-black text-white leading-tight ${foto ? 'text-[12px] line-clamp-3' : 'text-[14px] line-clamp-2'}`}>{chamada || 'Sua frase aparece aqui'}</p>
                  <span className="self-start text-[10px] font-black bg-white text-[#1A1020] px-2 py-0.5 rounded-lg">{cta || 'Conhecer'} →</span>
                </div>
                {foto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto} alt="" className="absolute right-0 top-0 h-full w-[45%] object-cover" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
