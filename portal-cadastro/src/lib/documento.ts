// lib/documento.ts
// Validação e formatação de CPF/CNPJ — sem dependência externa.

export type DocumentoTipo = 'cpf' | 'cnpj';

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function detectarTipoDocumento(valor: string): DocumentoTipo | null {
  const digitos = apenasDigitos(valor);
  if (digitos.length === 11) return 'cpf';
  if (digitos.length === 14) return 'cnpj';
  return null;
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

function todosDigitosIguais(digitos: string): boolean {
  return /^(\d)\1+$/.test(digitos);
}

export function validarCPF(valorOuDigitos: string): boolean {
  const d = apenasDigitos(valorOuDigitos);
  if (d.length !== 11 || todosDigitosIguais(d)) return false;

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcularDigito(d.slice(0, 9), 10);
  const d2 = calcularDigito(d.slice(0, 9) + d1, 11);
  return d.slice(9) === `${d1}${d2}`;
}

export function validarCNPJ(valorOuDigitos: string): boolean {
  const d = apenasDigitos(valorOuDigitos);
  if (d.length !== 14 || todosDigitosIguais(d)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calcularDigito = (base: string, pesos: number[]): number => {
    const soma = base
      .split('')
      .reduce((acc, digito, i) => acc + Number(digito) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcularDigito(d.slice(0, 12), pesos1);
  const d2 = calcularDigito(d.slice(0, 12) + d1, pesos2);
  return d.slice(12) === `${d1}${d2}`;
}

export function validarDocumento(valor: string): boolean {
  const tipo = detectarTipoDocumento(valor);
  if (tipo === 'cpf') return validarCPF(valor);
  if (tipo === 'cnpj') return validarCNPJ(valor);
  return false;
}