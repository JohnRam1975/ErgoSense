import { describe, expect, it } from 'vitest';
import { repairPortugueseText } from '../textEncoding';

describe('repairPortugueseText', () => {
  it('retorna vazio para null/undefined', () => {
    expect(repairPortugueseText(null)).toBe('');
    expect(repairPortugueseText(undefined)).toBe('');
  });

  it('preserva texto UTF-8 correto', () => {
    expect(repairPortugueseText('Produção normal')).toBe('Produção normal');
  });

  it('corrige JoÃ£o para João', () => {
    expect(repairPortugueseText('JoÃ£o Silva')).toBe('João Silva');
  });

  it('corrige ProduÃ§Ã£o para Produção', () => {
    expect(repairPortugueseText('Setor de ProduÃ§Ã£o')).toBe('Setor de Produção');
  });

  it('corrige Jo?o alternativo', () => {
    expect(repairPortugueseText('Jo?o')).toBe('João');
  });

  it('substitui replacement char por ã', () => {
    expect(repairPortugueseText('Produ\uFFFDo')).toContain('Produ');
  });
});
