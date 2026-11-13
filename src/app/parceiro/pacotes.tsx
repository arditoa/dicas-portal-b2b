// Etapa 14 — Pacotes e roteiros (Meu espaço › Pacotes e roteiros). Só o dono e só quem foi liberado
// (locais.pode_subir_pacotes, migração 052/111); sem essa informação, vale a categoria turismo (igual ao portal).
import CatalogoTela from '../../components/parceiro/CatalogoTela';
import { useModoParceiro } from '../../lib/modoParceiro';

export const podePacotes = (l: { categoria: string; pode_subir_pacotes?: boolean | null }) => l.pode_subir_pacotes ?? l.categoria === 'turismo';

export default function Pacotes() {
  const { localAtivo } = useModoParceiro();
  const dono = localAtivo?.papel === 'dono';
  const liberado = !!localAtivo && dono && podePacotes(localAtivo);
  return <CatalogoTela tipo="pacotes" liberado={liberado} motivo={!dono ? 'Só o dono do local mexe nos pacotes.' : 'Pacotes e roteiros são liberados pela equipe Dicas para agências e operadoras. Fale com a equipe.'} />;
}
