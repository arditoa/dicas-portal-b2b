import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';

const TONS = {
  pink: 'from-[#5B1146] via-[#8E1A6B] to-[#2B1450]',
  purple: 'from-[#2B1450] via-[#4B2A8A] to-[#14102B]',
  amber: 'from-[#5A2A0E] via-[#8A3F12] to-[#2A1208]',
  blue: 'from-[#0F3A4A] via-[#1F5F7A] to-[#0E1B2E]',
} as const;

// Bloco de foto da Home: com `src` mostra a foto real (com degradê embaixo
// pra legenda ficar legível); sem `src` mostra um fundo de marca com o ícone.
export default function FotoTile({
  src,
  alt,
  legenda,
  icone: Icone,
  tom = 'pink',
  className = '',
  posicao = 'center',
}: {
  src?: string;
  alt: string;
  legenda: string;
  icone: LucideIcon;
  tom?: keyof typeof TONS;
  className?: string;
  // object-position da foto (ex.: '50% 30%' para não cortar rostos)
  posicao?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${TONS[tom]} ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" style={{ objectPosition: posicao }} />
      ) : (
        <Icone className="absolute left-1/2 top-[42%] h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/25" aria-hidden />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3.5 pb-3 pt-10">
        <p className="text-xs font-bold leading-snug text-white sm:text-sm">{legenda}</p>
      </div>
    </div>
  );
}
