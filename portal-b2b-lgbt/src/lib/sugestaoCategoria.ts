// Rodada 130 — regra da sugestão de categoria nova no cadastro do parceiro.
// O banco só aceita as categorias do enum; quando o parceiro escolhe "Outra —
// sugerir uma categoria nova", o local entra como pendente na categoria
// "servicos" (só para caber no enum) e a sugestão vai escrita no campo
// subcategoria com este prefixo. O portal admin mostra um aviso e a equipe
// decide: encaixar numa categoria existente ou criar a categoria nova.
export const PREFIXO_SUGESTAO_CATEGORIA = 'Sugestão de categoria: ';

export function sugestaoDeCategoria(subcategoria: string | null | undefined): string | null {
  const s = (subcategoria ?? '').trim();
  return s.startsWith(PREFIXO_SUGESTAO_CATEGORIA) ? s.slice(PREFIXO_SUGESTAO_CATEGORIA.length).trim() : null;
}
