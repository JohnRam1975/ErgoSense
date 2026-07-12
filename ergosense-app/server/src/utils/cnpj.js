/**
 * Validação de CNPJ brasileiro
 */
export function normalizeCnpj(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function formatCnpj(digits) {
  const d = normalizeCnpj(digits);
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function isValidCnpj(value) {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calc = (base) => {
    let sum = 0;
    let pos = base.length - 7;
    for (let i = base.length; i >= 1; i -= 1) {
      sum += Number(base[base.length - i]) * pos;
      pos -= 1;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result;
  };

  const base = cnpj.slice(0, 12);
  const d1 = calc(base);
  const d2 = calc(base + d1);
  return cnpj === base + String(d1) + String(d2);
}
