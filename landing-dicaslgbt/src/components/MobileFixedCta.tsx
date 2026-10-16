import Link from 'next/link';
import { URL_PORTAL } from '../lib/constants';

// Barra fixa só em telas pequenas (sm:hidden). Mantém os dois caminhos
// sempre à mão, como pede o documento da Home: cadastro de empresas e
// Lista Antecipada. O botão em destaque muda conforme o grupo da página.
// `pb-24` nas <main> que usam este componente evita que o conteúdo final
// da página fique escondido atrás da barra.
const CADASTRO_EMPRESA = `${URL_PORTAL}/cadastro/local`;

export default function MobileFixedCta({ variant }: { variant: 'cadastro' | 'lancamento' }) {
  const principal =
    variant === 'cadastro'
      ? { texto: 'Cadastrar minha empresa', href: CADASTRO_EMPRESA, externo: true }
      : { texto: 'Entrar na Lista Antecipada', href: '/lista-antecipada', externo: false };
  const secundario =
    variant === 'cadastro'
      ? { texto: 'Entrar na Lista Antecipada', href: '/lista-antecipada' }
      : { texto: 'Cadastrar minha empresa', href: CADASTRO_EMPRESA };

  const classePrincipal =
    'block text-center bg-[#E1306C] hover:bg-[#c2285c] text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-lg shadow-black/40';

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-1.5 p-3 bg-gradient-to-t from-[#0B0B0E] via-[#0B0B0E]/95 to-transparent">
      {principal.externo ? (
        <a href={principal.href} data-track="barra_celular" data-onde={variant} className={classePrincipal}>
          {principal.texto}
        </a>
      ) : (
        <Link href={principal.href} data-track="barra_celular" data-onde={variant} className={classePrincipal}>
          {principal.texto}
        </Link>
      )}
      <a
        href={secundario.href}
        data-track="barra_celular_secundario"
        data-onde={variant}
        className="block text-center text-xs font-semibold text-[#E6E0F0] underline underline-offset-4"
      >
        {secundario.texto}
      </a>
    </div>
  );
}
