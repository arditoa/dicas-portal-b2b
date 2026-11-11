'use client';
// Rodada 140 — editor do visual do banner de Fundador/Premium, igual no /admin (ficha do local) e no portal do
// parceiro (Destaques e resultados): fundo (degradê nas cores do app ou foto à direita/esquerda/de fundo),
// cor dos dizeres, palavra de impacto com cor própria (que também pinta o botão) e prévia como no app.
import { CORES_DESTAQUE_BANNER, CORES_TEXTO_BANNER, DEGRADES_BANNER, ESTILOS_BANNER, EstiloBanner, partesDaFrase } from '../lib/estiloBanner';

export type EstiloValor = {
  estilo: EstiloBanner;
  cor1: string | null;
  cor2: string | null;
  cor_texto: string | null;
  destaque_texto: string;
  cor_destaque: string | null;
};
export const ESTILO_VAZIO: EstiloValor = { estilo: 'degrade', cor1: null, cor2: null, cor_texto: null, destaque_texto: '', cor_destaque: null };

function textoSobre(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 170 ? '#1A1020' : '#FFFFFF';
}

type Props = {
  valor: EstiloValor;
  onChange: (v: EstiloValor) => void;
  chamada: string;
  cta: string;
  foto: string;
  etiquetaHome?: string | null; // nome do local, quando é Fundador (prévia da Home)
  rotuloCategoria?: string;
  soHome?: boolean; // só a prévia da Home (banner da Home separado)
  soCategoria?: boolean; // só a prévia da categoria
};

export function PreviaBanner({ valor, chamada, cta, foto, etiqueta, padrao }: { valor: EstiloValor; chamada: string; cta: string; foto: string; etiqueta?: string | null; padrao: [string, string] }) {
  const cores: [string, string] = valor.cor1 && valor.cor2 ? [valor.cor1, valor.cor2] : padrao;
  const comFoto = valor.estilo !== 'degrade' && !!foto;
  const fundo = comFoto && valor.estilo === 'foto_fundo';
  const esquerda = comFoto && valor.estilo === 'foto_esquerda';
  const corTexto = valor.cor_texto || '#FFFFFF';
  const p = partesDaFrase(chamada || 'Sua frase aparece aqui', valor.destaque_texto);
  return (
    <div className="relative flex h-28 w-80 max-w-full rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${cores[0]}, ${cores[1]})` }}>
      {fundo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(10,6,20,0.45)' }} />
        </>
      )}
      {comFoto && !fundo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className={`absolute top-0 h-full w-[45%] object-cover ${esquerda ? 'left-0' : 'right-0'}`} />
      )}
      <div className={`relative p-3 flex flex-col justify-center gap-1 ${comFoto && !fundo ? 'w-[55%]' : 'w-full pr-14'} ${esquerda ? 'ml-[45%]' : ''}`}>
        {etiqueta && (
          <span className="self-start text-[8px] font-black uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded-lg truncate max-w-full" style={{ color: corTexto }}>{etiqueta}</span>
        )}
        <p className={`font-black leading-tight ${comFoto && !fundo ? 'text-[12px] line-clamp-3' : 'text-[14px] line-clamp-2'}`} style={{ color: corTexto }}>
          {p.antes}
          {p.destaque && <span style={{ color: valor.cor_destaque || '#FB923C' }}>{p.destaque}</span>}
          {p.depois}
        </p>
        <span
          className="self-start text-[10px] font-black px-2.5 py-0.5 rounded-lg"
          style={{ background: valor.cor_destaque || '#FFFFFF', color: valor.cor_destaque ? textoSobre(valor.cor_destaque) : '#1A1020' }}
        >
          {cta || 'Conhecer'} →
        </span>
      </div>
    </div>
  );
}

export default function EditorEstiloBanner({ valor, onChange, chamada, cta, foto, etiquetaHome, rotuloCategoria = '', soHome = false, soCategoria = false }: Props) {
  const set = (p: Partial<EstiloValor>) => onChange({ ...valor, ...p });
  const chip = (ativo: boolean) => `text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition ${ativo ? 'border-[#E1306C] bg-[#E1306C]/15 text-white' : 'border-[#232230] text-[#A0A0B2] hover:border-[#3a3950]'}`;
  const destaqueForaDaFrase = !!valor.destaque_texto.trim() && !!chamada && !chamada.toLowerCase().includes(valor.destaque_texto.trim().toLowerCase());
  return (
    <div className="grid md:grid-cols-[1fr_auto] gap-4 items-start">
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-bold text-[#A0A0B2] mb-1.5">Fundo</p>
          <div className="flex flex-wrap gap-1.5">
            {ESTILOS_BANNER.map((e) => (
              <button key={e.v} type="button" title={e.dica} onClick={() => set({ estilo: e.v })} className={chip(valor.estilo === e.v)}>{e.rotulo}</button>
            ))}
          </div>
          {valor.estilo !== 'degrade' && !foto && <p className="text-[11px] text-amber-300 mt-1">Suba a foto do banner para este estilo aparecer.</p>}
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#A0A0B2] mb-1.5">Cores do fundo {valor.estilo === 'foto_fundo' ? '(aparecem se a foto não carregar)' : ''}</p>
          <div className="flex flex-wrap gap-1.5">
            {DEGRADES_BANNER.map((d) => {
              const ativo = valor.cor1 === d.cores[0] && valor.cor2 === d.cores[1];
              return (
                <button key={d.chave} type="button" title={d.rotulo} onClick={() => set({ cor1: d.cores[0], cor2: d.cores[1] })}
                  className={`w-9 h-9 rounded-lg border-2 ${ativo ? 'border-white' : 'border-transparent'}`}
                  style={{ background: `linear-gradient(135deg, ${d.cores[0]}, ${d.cores[1]})` }} aria-label={d.rotulo} />
              );
            })}
            <button type="button" onClick={() => set({ cor1: null, cor2: null })} className={chip(!valor.cor1)}>Padrão</button>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#A0A0B2] mb-1.5">Cor dos dizeres</p>
          <div className="flex flex-wrap gap-1.5">
            {CORES_TEXTO_BANNER.map((c) => (
              <button key={c.cor} type="button" onClick={() => set({ cor_texto: c.cor === '#FFFFFF' ? null : c.cor })}
                className={chip((valor.cor_texto || '#FFFFFF') === c.cor)}>
                <span className="inline-block w-3 h-3 rounded-full mr-1 align-[-1px] border border-white/30" style={{ background: c.cor }} />{c.rotulo}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#A0A0B2] mb-1.5">Palavra de impacto (opcional)</p>
          <input
            value={valor.destaque_texto}
            maxLength={30}
            onChange={(e) => set({ destaque_texto: e.target.value })}
            placeholder="Ex.: Vezpa Queen?"
            className="w-64 max-w-full bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs px-3 py-2"
          />
          <p className="text-[10px] text-[#626274] mt-1">Escreva o trecho da frase que deve ganhar outra cor. Se não estiver na frase, ele entra no fim.</p>
          {destaqueForaDaFrase && <p className="text-[10px] text-amber-300">Este trecho não está na frase: vai aparecer no fim dela.</p>}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {CORES_DESTAQUE_BANNER.map((c) => (
              <button key={c.cor} type="button" onClick={() => set({ cor_destaque: c.cor })} className={chip(valor.cor_destaque === c.cor)}>
                <span className="inline-block w-3 h-3 rounded-full mr-1 align-[-1px] border border-white/30" style={{ background: c.cor }} />{c.rotulo}
              </button>
            ))}
            <button type="button" onClick={() => set({ cor_destaque: null })} className={chip(!valor.cor_destaque)}>Botão branco</button>
          </div>
          <p className="text-[10px] text-[#626274] mt-1">A cor escolhida pinta a palavra de impacto e o botão.</p>
        </div>
      </div>
      <div className="space-y-2">
        {etiquetaHome && !soCategoria && (
          <div>
            <p className="text-[10px] font-bold text-[#A0A0B2] mb-1">Home (Membros Fundadores)</p>
            <PreviaBanner valor={valor} chamada={chamada} cta={cta} foto={foto} etiqueta={etiquetaHome} padrao={['#B45309', '#9D174D']} />
          </div>
        )}
        {!soHome && (
        <div>
          <p className="text-[10px] font-bold text-[#A0A0B2] mb-1">{`Categoria ${rotuloCategoria}`.trim()}</p>
          <PreviaBanner valor={valor} chamada={chamada} cta={cta} foto={foto} padrao={['#0E9F6E', '#0E7490']} />
        </div>
        )}
      </div>
    </div>
  );
}
