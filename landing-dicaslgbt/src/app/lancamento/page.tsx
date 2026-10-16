import { permanentRedirect } from 'next/navigation';

// A Lista de lançamento virou a Lista Antecipada (/lista-antecipada).
// Esta rota fica só para não quebrar links antigos.
export default function LancamentoPage() {
  permanentRedirect('/lista-antecipada');
}
