import { Redirect } from 'expo-router';

// Esta aba fica oculta da tab bar (`href: null` em _layout.tsx) e não há
// nenhuma navegação real pra ela em todo o app (confirmado por grep
// completo — ver nota em
// _removido_arquitetura_antiga/mobile-codigo-morto/src/app/(tabs)/tourism-nao-usado.txt).
// A tela tinha 4 lugares 100% mockados e filtros de categoria/distância
// que não batiam com nenhuma coluna real. O caso de uso já está coberto
// por duas telas reais desta mesma rodada de trabalho: `/category/turismo`
// (locais reais com categoria = 'turismo') e `/experience/Membro%20Fundador`
// (locais com o badge "fundador" ativo). Em vez de duplicar essa lógica
// aqui de novo, essa tela só redireciona pra a listagem real mais próxima
// do título original ("Dicas Trip").
export default function TourismRedirect() {
  return <Redirect href="/category/turismo" />;
}
