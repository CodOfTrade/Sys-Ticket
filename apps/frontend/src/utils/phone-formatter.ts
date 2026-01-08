/**
 * Formata telefone brasileiro automaticamente
 * Aceita: DDD + 8 ou 9 dígitos
 * Retorna: (99) 99999-9999 ou (99) 9999-9999
 */
export function formatPhoneNumber(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');

  // Limita a 11 dígitos (DDD + 9 dígitos)
  const limited = numbers.slice(0, 11);

  // Formata baseado no tamanho
  if (limited.length <= 2) {
    // Apenas DDD
    return limited.length > 0 ? `(${limited}` : '';
  } else if (limited.length <= 6) {
    // DDD + parte do número
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else if (limited.length <= 10) {
    // DDD + 8 dígitos (telefone fixo)
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  } else {
    // DDD + 9 dígitos (celular)
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
  }
}

/**
 * Remove formatação do telefone, mantendo apenas números
 */
export function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida se o telefone tem um formato válido
 */
export function isValidPhone(value: string): boolean {
  const numbers = unformatPhoneNumber(value);
  // Telefone brasileiro: DDD (2 dígitos) + número (8 ou 9 dígitos)
  return numbers.length === 10 || numbers.length === 11;
}
