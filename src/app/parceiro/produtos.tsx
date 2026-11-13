// Etapa 12 — Catálogo de produtos (Meu espaço › Catálogo de produtos). Só o dono e só a categoria produtos (igual ao portal).
import CatalogoTela from '../../components/parceiro/CatalogoTela';
import { useModoParceiro } from '../../lib/modoParceiro';

export default function Produtos() {
  const { localAtivo } = useModoParceiro();
  const dono = localAtivo?.papel === 'dono';
  const liberado = !!localAtivo && dono && localAtivo.categoria === 'produtos';
  return <CatalogoTela tipo="produtos" liberado={liberado} motivo={!dono ? 'Só o dono do local mexe no catálogo.' : 'O catálogo de produtos é para a categoria Compras & Produtos.'} />;
}
