export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function formatarDocumento(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 14);
  if (digitos.length <= 11) {
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digitos
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function validarDocumento(valor: string): boolean {
  const d = apenasDigitos(valor);
  return d.length === 11 || d.length === 14;
}
