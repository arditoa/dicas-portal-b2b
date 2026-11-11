// Portal único (nov/2026): um login pode ter várias marcas (ex.: um bar e uma produtora de festas). A marca que o
// dono está usando agora fica guardada no navegador; o ParceiroShell valida e grava essa escolha antes de mostrar
// qualquer tela, então as telas só precisam filtrar pela marca ativa em vez de "o local do dono".
const CHAVE = 'dicas_marca_ativa';
const ID_INEXISTENTE = '00000000-0000-0000-0000-000000000000';

export function lerMarcaAtiva(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function gravarMarcaAtiva(id: string) {
  try {
    window.localStorage.setItem(CHAVE, id);
  } catch {
    /* navegador sem armazenamento: o shell cai na primeira marca */
  }
}

/** Para `.in('id', idsMarcaAtiva())` nas consultas de `locais` do dono. */
export function idsMarcaAtiva(): string[] {
  return [lerMarcaAtiva() || ID_INEXISTENTE];
}
