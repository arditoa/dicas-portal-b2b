import { Redirect, useLocalSearchParams } from 'expo-router';

// Esta aba fica oculta da tab bar (`href: null` em _layout.tsx) e não há
// nenhuma navegação real pra ela em todo o app (confirmado por grep
// completo — ver nota em
// _removido_arquitetura_antiga/mobile-codigo-morto/src/app/(tabs)/categories-nao-usado.txt).
// A tela tinha uma lista 100% mockada de estabelecimentos por categoria.
// Como `/category/[id].tsx` já cobre exatamente esse caso de uso ligado
// ao banco real, em vez de deixar o mock morto aqui (ou apagar a rota,
// arriscando quebrar algum link antigo salvo em algum lugar), essa tela
// agora só redireciona pra a versão real — nenhum dado inventado.
export default function CategoriesRedirect() {
  const { key } = useLocalSearchParams<{ key?: string }>();
  return <Redirect href={`/category/${key || 'todos'}`} />;
}
