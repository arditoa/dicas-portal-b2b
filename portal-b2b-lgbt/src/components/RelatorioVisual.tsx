'use client';
// Peças visuais simples para as páginas públicas de resultados (marca e Pulso LGBT+). Imprimível (Ctrl+P → PDF).
export const Num = (v: unknown) => (v === null || v === undefined ? '–' : String(v));

export function Pagina({ selo, titulo, sub, children }: { selo: string; titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white print:bg-white print:text-black">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <p className="text-xs font-black tracking-[0.2em] text-[#E1306C] mb-3">{selo}</p>
        <h1 className="text-3xl font-black leading-tight">{titulo}</h1>
        {sub && <p className="text-[#A0A0B2] mt-2 print:text-gray-600">{sub}</p>}
        <div className="mt-8 flex flex-col gap-6">{children}</div>
        <p className="text-[#626274] text-xs mt-12">Dicas LGBT+ · dados somados e anônimos: grupos com menos de 10 pessoas não aparecem e os números são arredondados. Para salvar em PDF, use Imprimir.</p>
      </div>
    </main>
  );
}
export function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#161520] border border-[#232230] rounded-2xl p-5 print:bg-white print:border-gray-300 break-inside-avoid">
      <h2 className="text-xs font-black tracking-widest text-[#A0A0B2] mb-4 uppercase">{titulo}</h2>
      {children}
    </section>
  );
}
export function Numeros({ itens }: { itens: [string, unknown][] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {itens.map(([r, v]) => (
        <div key={r} className="bg-[#0F0E16] rounded-xl p-4 print:bg-gray-50"><p className="text-2xl font-black">{Num(v)}</p><p className="text-xs text-[#A0A0B2]">{r}</p></div>
      ))}
    </div>
  );
}
export function Barras({ linhas, sufixo = '' }: { linhas: { rotulo: string; valor: number | string | null | undefined }[]; sufixo?: string }) {
  const nums = linhas.map((l) => (typeof l.valor === 'number' ? l.valor : 0));
  const max = Math.max(1, ...nums);
  return (
    <div className="flex flex-col gap-2">
      {linhas.map((l) => (
        <div key={l.rotulo} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 text-[#D6D3E0] print:text-black truncate">{l.rotulo}</span>
          <div className="flex-1 h-2.5 bg-[#232230] rounded-full print:bg-gray-200"><div className="h-2.5 bg-[#E1306C] rounded-full" style={{ width: `${typeof l.valor === 'number' ? Math.max(2, (l.valor / max) * 100) : 2}%` }} /></div>
          <span className="w-24 text-right text-[#A0A0B2] print:text-black">{Num(l.valor)}{typeof l.valor === 'number' ? sufixo : ''}</span>
        </div>
      ))}
    </div>
  );
}
