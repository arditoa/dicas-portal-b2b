import Link from 'next/link';

// Rodada 58 — Guia, "Botão fixo no celular": barra fixa só em telas
// pequenas (sm:hidden), com destino diferente por grupo de página.
// `pb-20` nas <main> que usam este componente evita que o conteúdo final
// da página fique escondido atrás da barra fixa.
export default function MobileFixedCta({ variant }: { variant: 'cadastro' | 'lancamento' }) {
  const config =
    variant === 'cadastro'
      ? { texto: 'Cadastrar gratuitamente', href: '/#cadastro' }
      : { texto: 'Entrar na lista de lançamento', href: '/lancamento' };

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/95 to-transparent">
      <Link
        href={config.href}
        className="block text-center bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition shadow-lg shadow-black/40"
      >
        {config.texto}
      </Link>
    </div>
  );
}
