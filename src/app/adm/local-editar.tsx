// Modo equipe · Editar as informações de uma casa (Sobre, Fotos, Horários, Contato, Endereço).
// Usa o mesmo editor da Minha página do parceiro: ?id=<casa>&secao=sobre|fotos|horarios|contato|endereco
import { useLocalSearchParams } from 'expo-router';
import { EditorPagina } from '../parceiro/pagina-editar';

export default function LocalEditarAdm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditorPagina localIdAdm={id} />;
}
