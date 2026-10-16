import Image from 'next/image';

// Moldura de celular com um print REAL do app (public/screenshots/*.jpg).
// Por padrão mostra o mapa; `src`/`alt` trocam o print (ex.: tela inicial).
export default function PhoneMock({
  src = '/screenshots/app-mapa.jpg',
  alt = 'Mapa do app Dicas LGBT+ com espaços LGBTQIA+ por bairro e categoria',
  className = 'w-[220px] sm:w-[260px]',
  mostrarSaoPaulo = true,
}: {
  src?: string;
  alt?: string;
  className?: string;
  mostrarSaoPaulo?: boolean;
}) {
  return (
    <div className={`relative mx-auto ${className}`}>
      <div
        className="pointer-events-none absolute -inset-10 -z-10 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(240,37,140,0.45), rgba(126,87,194,0.25) 55%, transparent 75%)' }}
        aria-hidden
      />
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.2rem] border-[6px] border-[#1F1B2B] bg-black shadow-[0_30px_80px_-20px_rgba(240,37,140,0.55)]">
        <Image src={src} alt={alt} fill sizes="260px" className="object-cover object-top" priority />
        <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-black/90" aria-hidden />
      </div>
      {mostrarSaoPaulo && (
        <span
          className="absolute -right-6 top-24 hidden origin-center rotate-90 text-[11px] font-black tracking-[0.35em] text-white/80 sm:block"
          aria-hidden
        >
          SÃO PAULO
        </span>
      )}
    </div>
  );
}
